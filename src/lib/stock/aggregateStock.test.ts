import { describe, expect, it } from 'vitest';
import { aggregateTodayYesterday } from './aggregateStock';

describe('aggregateTodayYesterday', () => {
  const today = new Date('2026-06-12T12:00:00.000Z');
  const yesterday = new Date('2026-06-11T12:00:00.000Z');

  it('aggregates per chest when chestId is provided', () => {
    const rows = [
      {
        itemId: 'item-1',
        chestId: 'chest-a',
        quantity: 5,
        timestamp: new Date('2026-06-12T08:00:00.000Z'),
      },
      {
        itemId: 'item-1',
        chestId: 'chest-a',
        quantity: 3,
        timestamp: new Date('2026-06-11T08:00:00.000Z'),
      },
    ];

    const result = aggregateTodayYesterday(rows, today, yesterday, 'chest-a');
    expect(result.get('item-1')).toEqual({ stockToday: 5, stockYesterday: 3 });
  });

  it('sums across chests when chestId is omitted', () => {
    const rows = [
      {
        itemId: 'item-1',
        chestId: 'chest-a',
        quantity: 2,
        timestamp: new Date('2026-06-12T08:00:00.000Z'),
      },
      {
        itemId: 'item-1',
        chestId: 'chest-b',
        quantity: 3,
        timestamp: new Date('2026-06-12T09:00:00.000Z'),
      },
    ];

    const result = aggregateTodayYesterday(rows, today, yesterday);
    expect(result.get('item-1')).toEqual({ stockToday: 5, stockYesterday: null });
  });
});
