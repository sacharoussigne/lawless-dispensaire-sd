import { formatDate } from '@/lib/date';

export type StockHistoryRow = {
  itemId: string;
  chestId: string;
  quantity: number;
  timestamp: Date;
};

export type StockSnapshot = {
  stockToday: number | null;
  stockYesterday: number | null;
};

function latestByDay(
  rows: StockHistoryRow[],
  day: Date,
): Map<string, StockHistoryRow> {
  const dayStr = formatDate(day);
  const byKey = new Map<string, StockHistoryRow>();

  for (const row of rows) {
    if (formatDate(new Date(row.timestamp)) !== dayStr) continue;

    const key = row.chestId;
    const existing = byKey.get(key);
    if (!existing || new Date(row.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      byKey.set(key, row);
    }
  }

  return byKey;
}

export function aggregateTodayYesterday(
  stockRows: StockHistoryRow[],
  today: Date,
  yesterday: Date,
  chestId?: string | null,
): Map<string, StockSnapshot> {
  const byItem = new Map<string, StockHistoryRow[]>();

  for (const row of stockRows) {
    const list = byItem.get(row.itemId) ?? [];
    list.push(row);
    byItem.set(row.itemId, list);
  }

  const result = new Map<string, StockSnapshot>();

  for (const [itemId, rows] of byItem) {
    if (chestId) {
      const chestRows = rows.filter((r) => r.chestId === chestId);
      const todayRow = latestByDay(chestRows, today).get(chestId);
      const yesterdayRow = latestByDay(chestRows, yesterday).get(chestId);
      result.set(itemId, {
        stockToday: todayRow?.quantity ?? null,
        stockYesterday: yesterdayRow?.quantity ?? null,
      });
      continue;
    }

    const todayByChest = latestByDay(rows, today);
    const yesterdayByChest = latestByDay(rows, yesterday);

    result.set(itemId, {
      stockToday: todayByChest.size > 0
        ? Array.from(todayByChest.values()).reduce((sum, r) => sum + r.quantity, 0)
        : null,
      stockYesterday: yesterdayByChest.size > 0
        ? Array.from(yesterdayByChest.values()).reduce((sum, r) => sum + r.quantity, 0)
        : null,
    });
  }

  return result;
}
