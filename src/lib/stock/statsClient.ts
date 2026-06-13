import type { DataTableSortStatus } from 'mantine-datatable';
import {
  getDisplayValue,
  type StockStatsDisplayMode,
  type StockStatsItemRow,
  type StockStatsItemRowWithDisplay,
} from '@/lib/stock/movements';

export type StockStatsChartRow = {
  itemId: string;
  itemName: string;
  value: number;
};

export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function buildCategoryOptions(
  items: StockStatsItemRow[],
): Array<{ value: string; label: string }> {
  const categories = new Map<string, string>();
  for (const row of items) {
    categories.set(row.categoryId, row.categoryName);
  }
  return Array.from(categories.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

export type StockStatsFilterOptions = {
  showZeroItems: boolean;
  categoryFilter: string | null;
  searchQuery: string;
};

export function filterStockStatsRows(
  rows: StockStatsItemRowWithDisplay[],
  { showZeroItems, categoryFilter, searchQuery }: StockStatsFilterOptions,
): StockStatsItemRowWithDisplay[] {
  let result = rows;

  if (!showZeroItems) {
    result = result.filter((row) => row.displayValue !== 0);
  }

  if (categoryFilter) {
    result = result.filter((row) => row.categoryId === categoryFilter);
  }

  const q = searchQuery.trim();
  if (q) {
    const nq = normalizeSearchString(q);
    result = result.filter(
      (row) =>
        normalizeSearchString(row.itemName).includes(nq) ||
        normalizeSearchString(row.categoryName).includes(nq),
    );
  }

  return result;
}

export function sortStockStatsRows(
  rows: StockStatsItemRowWithDisplay[],
  sortStatus: DataTableSortStatus<StockStatsItemRowWithDisplay>,
): StockStatsItemRowWithDisplay[] {
  const { columnAccessor, direction } = sortStatus;
  const m = direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (columnAccessor === 'itemName') {
      return a.itemName.localeCompare(b.itemName, 'fr', { sensitivity: 'base' }) * m;
    }
    if (columnAccessor === 'categoryName') {
      return a.categoryName.localeCompare(b.categoryName, 'fr', { sensitivity: 'base' }) * m;
    }
    if (columnAccessor === 'consumed') return (a.consumed - b.consumed) * m;
    if (columnAccessor === 'added') return (a.added - b.added) * m;
    if (columnAccessor === 'net') return (a.net - b.net) * m;
    return (a.displayValue - b.displayValue) * m;
  });
}

export function attachDisplayValues(
  items: StockStatsItemRow[],
  displayMode: StockStatsDisplayMode,
): StockStatsItemRowWithDisplay[] {
  return items.map((row) => ({
    ...row,
    displayValue: getDisplayValue(row, displayMode),
  }));
}

export function pickTopChartRows(
  rows: StockStatsItemRowWithDisplay[],
  topN: number,
  displayMode: StockStatsDisplayMode,
): StockStatsChartRow[] {
  const sorted =
    displayMode === 'net'
      ? [...rows].sort((a, b) => Math.abs(b.displayValue) - Math.abs(a.displayValue))
      : [...rows].sort((a, b) => b.displayValue - a.displayValue);

  return sorted.slice(0, topN).map((row) => ({
    itemId: row.itemId,
    itemName: row.itemName,
    value: row.displayValue,
  }));
}

export function sumDisplayValues(rows: StockStatsItemRowWithDisplay[]): number {
  return rows.reduce((sum, row) => sum + row.displayValue, 0);
}

export function pickTopItem(
  rows: StockStatsItemRowWithDisplay[],
  displayMode: StockStatsDisplayMode,
): StockStatsItemRowWithDisplay | null {
  if (rows.length === 0) return null;
  if (displayMode === 'net') {
    return rows.reduce((best, row) =>
      Math.abs(row.displayValue) > Math.abs(best.displayValue) ? row : best,
    );
  }
  return rows.reduce((best, row) => (row.displayValue > best.displayValue ? row : best));
}
