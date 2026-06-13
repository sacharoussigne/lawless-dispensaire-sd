import type { StockStatsItemRow } from '@/lib/stock/movements';

export type StockConsumptionMovementRow = {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
};

export type StockConsumptionStatsTotals = {
  consumed: number;
  added: number;
  net: number;
};

export type StockConsumptionStatsData = {
  items: StockStatsItemRow[];
  totals: StockConsumptionStatsTotals;
};

export function totalsFromItems(items: StockStatsItemRow[]): StockConsumptionStatsTotals {
  return items.reduce(
    (acc, row) => ({
      consumed: acc.consumed + row.consumed,
      added: acc.added + row.added,
      net: acc.net + row.net,
    }),
    { consumed: 0, added: 0, net: 0 },
  );
}

/** Reference aggregation from raw movement rows (mirrors SQL GROUP BY logic). */
export function aggregateConsumptionStatsFromMovements(
  movements: StockConsumptionMovementRow[],
): StockConsumptionStatsData {
  const byItem = new Map<string, StockStatsItemRow>();

  for (const movement of movements) {
    const consumedDelta = movement.quantity < 0 ? -movement.quantity : 0;
    const addedDelta = movement.quantity > 0 ? movement.quantity : 0;
    const netDelta = movement.quantity;

    const existing = byItem.get(movement.itemId);
    if (existing) {
      existing.consumed += consumedDelta;
      existing.added += addedDelta;
      existing.net += netDelta;
    } else {
      byItem.set(movement.itemId, {
        itemId: movement.itemId,
        itemName: movement.itemName,
        categoryId: movement.categoryId,
        categoryName: movement.categoryName,
        consumed: consumedDelta,
        added: addedDelta,
        net: netDelta,
      });
    }
  }

  const items = Array.from(byItem.values());
  return { items, totals: totalsFromItems(items) };
}
