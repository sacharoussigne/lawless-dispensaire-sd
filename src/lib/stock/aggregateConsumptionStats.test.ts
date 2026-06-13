import { describe, expect, it } from 'vitest';
import {
  aggregateConsumptionStatsFromMovements,
  totalsFromItems,
} from './aggregateConsumptionStats';

describe('aggregateConsumptionStatsFromMovements', () => {
  it('aggregates consumed, added and net per item', () => {
    const result = aggregateConsumptionStatsFromMovements([
      {
        itemId: 'a',
        itemName: 'Item A',
        categoryId: 'cat1',
        categoryName: 'Cat',
        quantity: -5,
      },
      {
        itemId: 'a',
        itemName: 'Item A',
        categoryId: 'cat1',
        categoryName: 'Cat',
        quantity: -3,
      },
      {
        itemId: 'a',
        itemName: 'Item A',
        categoryId: 'cat1',
        categoryName: 'Cat',
        quantity: 2,
      },
    ]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      itemId: 'a',
      itemName: 'Item A',
      categoryId: 'cat1',
      categoryName: 'Cat',
      consumed: 8,
      added: 2,
      net: -6,
    });
    expect(result.totals).toEqual({ consumed: 8, added: 2, net: -6 });
  });

  it('keeps separate rows per item', () => {
    const result = aggregateConsumptionStatsFromMovements([
      {
        itemId: 'a',
        itemName: 'A',
        categoryId: 'c1',
        categoryName: 'C',
        quantity: -1,
      },
      {
        itemId: 'b',
        itemName: 'B',
        categoryId: 'c1',
        categoryName: 'C',
        quantity: 4,
      },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.totals).toEqual({ consumed: 1, added: 4, net: 3 });
  });

  it('returns empty result for no movements', () => {
    const result = aggregateConsumptionStatsFromMovements([]);
    expect(result.items).toEqual([]);
    expect(result.totals).toEqual({ consumed: 0, added: 0, net: 0 });
  });

  it('ignores zero-quantity movements in totals', () => {
    const result = aggregateConsumptionStatsFromMovements([
      {
        itemId: 'a',
        itemName: 'A',
        categoryId: 'c1',
        categoryName: 'C',
        quantity: 0,
      },
    ]);

    expect(result.items[0]).toEqual({
      itemId: 'a',
      itemName: 'A',
      categoryId: 'c1',
      categoryName: 'C',
      consumed: 0,
      added: 0,
      net: 0,
    });
  });
});

describe('totalsFromItems', () => {
  it('sums item rows', () => {
    expect(
      totalsFromItems([
        { itemId: 'a', itemName: 'A', categoryId: 'c', categoryName: 'C', consumed: 10, added: 3, net: -7 },
        { itemId: 'b', itemName: 'B', categoryId: 'c', categoryName: 'C', consumed: 5, added: 1, net: -4 },
      ]),
    ).toEqual({ consumed: 15, added: 4, net: -11 });
  });
});
