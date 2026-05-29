import { describe, expect, it } from 'vitest';
import { StockMovementKind } from '@prisma/client';
import {
  buildManualMovements,
  computeManualStockDelta,
  getDisplayValue,
} from './movements';

describe('computeManualStockDelta', () => {
  it('returns null when first count matches yesterday', () => {
    expect(
      computeManualStockDelta({ newQty: 10, stockToday: null, stockYesterday: 10 }),
    ).toBeNull();
  });

  it('computes first count delta vs yesterday', () => {
    expect(
      computeManualStockDelta({ newQty: 8, stockToday: null, stockYesterday: 10 }),
    ).toEqual({ delta: -2, kind: StockMovementKind.MANUAL_FIRST_COUNT });
  });

  it('treats null yesterday as zero on first count', () => {
    expect(
      computeManualStockDelta({ newQty: 5, stockToday: null, stockYesterday: null }),
    ).toEqual({ delta: 5, kind: StockMovementKind.MANUAL_FIRST_COUNT });
  });

  it('returns null when re-edit has no change', () => {
    expect(
      computeManualStockDelta({ newQty: 12, stockToday: 12, stockYesterday: 8 }),
    ).toBeNull();
  });

  it('computes re-edit delta vs today', () => {
    expect(
      computeManualStockDelta({ newQty: 15, stockToday: 12, stockYesterday: 8 }),
    ).toEqual({ delta: 3, kind: StockMovementKind.MANUAL_ADJUST });
  });
});

describe('buildManualMovements', () => {
  it('returns empty when skipHistory is true', () => {
    expect(
      buildManualMovements(
        [{ itemId: 'a', newQty: 1, stockToday: null, stockYesterday: 0 }],
        true,
      ),
    ).toEqual([]);
  });

  it('skips items with zero delta', () => {
    expect(
      buildManualMovements(
        [
          { itemId: 'a', newQty: 5, stockToday: null, stockYesterday: 5 },
          { itemId: 'b', newQty: 10, stockToday: null, stockYesterday: 0 },
        ],
        false,
      ),
    ).toEqual([
      { itemId: 'b', quantity: 10, kind: StockMovementKind.MANUAL_FIRST_COUNT },
    ]);
  });
});

describe('getDisplayValue', () => {
  const row = { consumed: 20, added: 5, net: -15 };

  it('returns consumed in consumed mode', () => {
    expect(getDisplayValue(row, 'consumed')).toBe(20);
  });

  it('returns added in added mode', () => {
    expect(getDisplayValue(row, 'added')).toBe(5);
  });

  it('returns net in net mode', () => {
    expect(getDisplayValue(row, 'net')).toBe(-15);
  });
});
