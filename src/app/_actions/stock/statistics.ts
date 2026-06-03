'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { getStartOfDay, getDayAfter } from '@/lib/date';
import type { StockStatsItemRow } from '@/lib/stock/movements';

export type StockConsumptionStatsResult = {
  items: StockStatsItemRow[];
  totals: {
    consumed: number;
    added: number;
    net: number;
  };
};

export async function getStockConsumptionStats(
  dispensarySlug: string,
  data: { from: Date; to: Date },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'stock',
      permission: {
        resource: 'stock_statistics',
        action: 'view',
        message: 'Permission refusée : vous n\'avez pas accès aux statistiques de stock',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const fromStart = getStartOfDay(data.from);
    const toEndExclusive = getDayAfter(getStartOfDay(data.to));

    if (fromStart >= toEndExclusive) {
      return { status: 400, error: 'La date de début doit être antérieure à la date de fin' };
    }

    const movements = await prisma.stockItemMovement.findMany({
      where: {
        createdAt: {
          gte: fromStart,
          lt: toEndExclusive,
        },
        item: {
          isEnabled: true,
          ...tenantWhere(dispensaryId),
        },
      },
      select: {
        itemId: true,
        quantity: true,
        item: {
          select: {
            name: true,
            categoryId: true,
            category: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const byItem = new Map<string, StockStatsItemRow>();

    for (const movement of movements) {
      const existing = byItem.get(movement.itemId);
      const consumedDelta = movement.quantity < 0 ? -movement.quantity : 0;
      const addedDelta = movement.quantity > 0 ? movement.quantity : 0;
      const netDelta = movement.quantity;

      if (existing) {
        existing.consumed += consumedDelta;
        existing.added += addedDelta;
        existing.net += netDelta;
      } else {
        byItem.set(movement.itemId, {
          itemId: movement.itemId,
          itemName: movement.item.name,
          categoryId: movement.item.categoryId,
          categoryName: movement.item.category.name,
          categoryColor: movement.item.category.color,
          consumed: consumedDelta,
          added: addedDelta,
          net: netDelta,
        });
      }
    }

    const items = Array.from(byItem.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName, 'fr', { sensitivity: 'base' }),
    );

    const totals = items.reduce(
      (acc, row) => ({
        consumed: acc.consumed + row.consumed,
        added: acc.added + row.added,
        net: acc.net + row.net,
      }),
      { consumed: 0, added: 0, net: 0 },
    );

    return {
      status: 200,
      data: { items, totals } satisfies StockConsumptionStatsResult,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des statistiques de stock');
  }
}
