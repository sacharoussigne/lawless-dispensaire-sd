'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { getStartOfDay, getDayAfter } from '@/lib/date';
import { totalsFromItems } from '@/lib/stock/aggregateConsumptionStats';
import type { StockStatsItemRow } from '@/lib/stock/movements';

export type StockConsumptionStatsResult = {
  items: StockStatsItemRow[];
  totals: {
    consumed: number;
    added: number;
    net: number;
  };
};

type ConsumptionStatsSqlRow = {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  consumed: number;
  added: number;
  net: number;
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

    const rows = await prisma.$queryRaw<ConsumptionStatsSqlRow[]>(Prisma.sql`
      SELECT
        i.id AS "itemId",
        i.name AS "itemName",
        i."categoryId" AS "categoryId",
        c.name AS "categoryName",
        COALESCE(SUM(CASE WHEN m.quantity < 0 THEN -m.quantity ELSE 0 END), 0)::int AS consumed,
        COALESCE(SUM(CASE WHEN m.quantity > 0 THEN m.quantity ELSE 0 END), 0)::int AS added,
        COALESCE(SUM(m.quantity), 0)::int AS net
      FROM stock_item_movement m
      INNER JOIN item i ON i.id = m."itemId"
      INNER JOIN category_item c ON c.id = i."categoryId"
      WHERE m."createdAt" >= ${fromStart}
        AND m."createdAt" < ${toEndExclusive}
        AND i."isEnabled" = true
        AND i."dispensaryId" = ${dispensaryId}
      GROUP BY i.id, i.name, i."categoryId", c.name
    `);

    const items: StockStatsItemRow[] = rows.map((row) => ({
      itemId: row.itemId,
      itemName: row.itemName,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      consumed: row.consumed,
      added: row.added,
      net: row.net,
    }));

    const totals = totalsFromItems(items);

    return {
      status: 200,
      data: { items, totals } satisfies StockConsumptionStatsResult,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des statistiques de stock');
  }
}
