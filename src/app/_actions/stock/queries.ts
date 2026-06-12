'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import {
  getTodayStart,
  getYesterdayStart,
  getTomorrowStart,
  getStartOfDay,
} from '@/lib/date';
import {
  fetchEnabledItems,
  fetchStockHistoryRows,
  buildStockSnapshots,
  mapItemWithStockSnapshot,
  ITEM_STOCK_SELECT,
} from '@/app/_actions/stock/queryHelpers';

export async function getItemsWithStock(
  dispensarySlug: string,
  chestId?: string | null,
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const today = getTodayStart();
    const yesterday = getYesterdayStart();
    const tomorrow = getTomorrowStart();

    const items = await fetchEnabledItems(dispensaryId);
    const itemIds = items.map((item) => item.id);
    const stockRows = await fetchStockHistoryRows(
      dispensaryId,
      itemIds,
      { gte: yesterday, lt: tomorrow },
      chestId,
    );
    const snapshots = buildStockSnapshots(stockRows, today, yesterday, chestId);

    const itemsWithStock = items.map((item) =>
      mapItemWithStockSnapshot(item, snapshots.get(item.id)),
    );

    return {
      status: 200,
      data: itemsWithStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets avec stock');
  }
}

export async function getItemsWithStockForDate(
  dispensarySlug: string,
  date: Date,
  chestId?: string | null,
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const dayStart = getStartOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const items = await fetchEnabledItems(dispensaryId);
    const itemIds = items.map((item) => item.id);

    const stockRows = itemIds.length > 0
      ? await prisma.stockHistory.findMany({
          where: {
            itemId: { in: itemIds },
            timestamp: { gte: dayStart, lt: dayEnd },
            ...(chestId ? { chestId } : {}),
            chest: {
              isEnabled: true,
              ...tenantWhere(dispensaryId),
            },
          },
          select: {
            id: true,
            itemId: true,
            quantity: true,
            timestamp: true,
          },
          orderBy: { timestamp: 'desc' },
        })
      : [];

    const latestByItem = new Map<string, { id: string; quantity: number }>();
    for (const row of stockRows) {
      if (!latestByItem.has(row.itemId)) {
        latestByItem.set(row.itemId, { id: row.id, quantity: row.quantity });
      }
    }

    const itemsWithStock = items.map((item) => {
      const stockForDate = latestByItem.get(item.id);
      return {
        ...item,
        price: item.price ? Number(item.price) : null,
        stockForDate: stockForDate?.quantity ?? null,
        stockHistoryId: stockForDate?.id ?? null,
      };
    });

    return {
      status: 200,
      data: itemsWithStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des objets avec stock');
  }
}

export async function getItemsWithDetailedStock(
  dispensarySlug: string,
  itemIds?: string[],
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'search',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const today = getTodayStart();
    const yesterday = getYesterdayStart();
    const tomorrow = getTomorrowStart();

    const items = await prisma.item.findMany({
      where: {
        isEnabled: true,
        ...tenantWhere(dispensaryId),
        ...(itemIds && itemIds.length > 0 ? { id: { in: itemIds } } : {}),
      },
      orderBy: { name: 'asc' },
      select: ITEM_STOCK_SELECT,
    });

    const ids = items.map((item) => item.id);
    const stockRows = await fetchStockHistoryRows(
      dispensaryId,
      ids,
      { gte: yesterday, lt: tomorrow },
    );

    const allChests = await prisma.chest.findMany({
      where: {
        isEnabled: true,
        ...tenantWhere(dispensaryId),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    const itemsWithDetailedStock = items.map((item) => {
      const itemRows = stockRows.filter((r) => r.itemId === item.id);
      const snapshots = buildStockSnapshots(itemRows, today, yesterday);

      const stockByChest = allChests.map((chest) => {
        const chestRows = itemRows.filter((r) => r.chestId === chest.id);
        const chestSnapshot = buildStockSnapshots(chestRows, today, yesterday, chest.id).get(item.id);
        return {
          chestId: chest.id,
          chestName: chest.name,
          stockToday: chestSnapshot?.stockToday ?? null,
          stockYesterday: chestSnapshot?.stockYesterday ?? null,
        };
      });

      const snapshot = snapshots.get(item.id);

      return {
        ...item,
        price: item.price ? Number(item.price) : null,
        totalStockToday: snapshot?.stockToday ?? null,
        totalStockYesterday: snapshot?.stockYesterday ?? null,
        stockByChest,
      };
    });

    return {
      status: 200,
      data: itemsWithDetailedStock,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des items avec stocks détaillés');
  }
}
