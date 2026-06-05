import { StockMovementKind } from '@prisma/client';
import { dispTokens } from '@/lib/design-tokens';

export type ManualStockMovementInput = {
  itemId: string;
  newQty: number;
  stockToday: number | null;
  stockYesterday: number | null;
};

export type ManualStockMovementRecord = {
  itemId: string;
  quantity: number;
  kind: StockMovementKind;
};

export function computeManualStockDelta({
  newQty,
  stockToday,
  stockYesterday,
}: {
  newQty: number;
  stockToday: number | null;
  stockYesterday: number | null;
}): { delta: number; kind: StockMovementKind } | null {
  if (stockToday === null) {
    const delta = newQty - (stockYesterday ?? 0);
    if (delta === 0) return null;
    return { delta, kind: StockMovementKind.MANUAL_FIRST_COUNT };
  }

  const delta = newQty - stockToday;
  if (delta === 0) return null;
  return { delta, kind: StockMovementKind.MANUAL_ADJUST };
}

export function buildManualMovements(
  items: ManualStockMovementInput[],
  skipHistory: boolean,
): ManualStockMovementRecord[] {
  if (skipHistory) return [];

  const movements: ManualStockMovementRecord[] = [];

  for (const item of items) {
    const result = computeManualStockDelta({
      newQty: item.newQty,
      stockToday: item.stockToday,
      stockYesterday: item.stockYesterday,
    });
    if (!result) continue;
    movements.push({
      itemId: item.itemId,
      quantity: result.delta,
      kind: result.kind,
    });
  }

  return movements;
}

export type StockStatsDisplayMode = 'consumed' | 'added' | 'net';

export type StockStatsItemRow = {
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  consumed: number;
  added: number;
  net: number;
};

export type StockStatsItemRowWithDisplay = StockStatsItemRow & {
  displayValue: number;
};

export function getDisplayValue(row: Pick<StockStatsItemRow, 'consumed' | 'added' | 'net'>, mode: StockStatsDisplayMode): number {
  switch (mode) {
    case 'consumed':
      return row.consumed;
    case 'added':
      return row.added;
    case 'net':
      return row.net;
  }
}

export function getDisplayModeLabel(mode: StockStatsDisplayMode): string {
  switch (mode) {
    case 'consumed':
      return 'Consommation';
    case 'added':
      return 'Ajouts';
    case 'net':
      return 'Stat réelle';
  }
}

/** Mantine theme keys — muted apothecary palettes instead of default red/green/blue */
export function getStockStatsBarColor(mode: StockStatsDisplayMode): string {
  switch (mode) {
    case 'consumed':
      return 'danger';
    case 'added':
      return 'moss';
    case 'net':
      return 'denim';
  }
}

/** Brand danger/sage hex — readable and distinct from ink on cream backgrounds */
export function getStockStatsValueColor(
  mode: StockStatsDisplayMode,
  value: number,
): string | undefined {
  if (mode !== 'net') return undefined;
  if (value < 0) return dispTokens.colors.danger;
  if (value > 0) return dispTokens.colors.sage;
  return dispTokens.colors.inkMuted;
}
