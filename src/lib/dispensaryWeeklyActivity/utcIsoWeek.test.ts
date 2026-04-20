import { describe, expect, it } from 'vitest';
import {
  getUtcIsoWeekRange,
  toUtcYmd,
  utcMidnightFromYmd,
} from './utcIsoWeek';

describe('getUtcIsoWeekRange', () => {
  it('returns Mon 00:00Z through Sun 23:59:59.999Z for a Wednesday anchor', () => {
    const { periodStart, periodEnd } = getUtcIsoWeekRange(new Date('2026-04-15T12:00:00.000Z'));
    expect(periodStart.toISOString()).toBe('2026-04-13T00:00:00.000Z');
    expect(periodEnd.toISOString()).toBe('2026-04-19T23:59:59.999Z');
  });

  it('treats Sunday UTC as the end of that ISO week', () => {
    const { periodStart, periodEnd } = getUtcIsoWeekRange(new Date('2026-04-19T22:30:00.000Z'));
    expect(periodStart.toISOString()).toBe('2026-04-13T00:00:00.000Z');
    expect(periodEnd.toISOString()).toBe('2026-04-19T23:59:59.999Z');
  });

  it('rolls to the next week on Monday 00:00Z', () => {
    const { periodStart, periodEnd } = getUtcIsoWeekRange(new Date('2026-04-20T00:00:00.000Z'));
    expect(periodStart.toISOString()).toBe('2026-04-20T00:00:00.000Z');
    expect(periodEnd.toISOString()).toBe('2026-04-26T23:59:59.999Z');
  });
});

describe('toUtcYmd / utcMidnightFromYmd', () => {
  it('round-trips UTC calendar day', () => {
    const d = utcMidnightFromYmd('2026-04-13');
    expect(d.toISOString()).toBe('2026-04-13T00:00:00.000Z');
    expect(toUtcYmd(d)).toBe('2026-04-13');
  });
});
