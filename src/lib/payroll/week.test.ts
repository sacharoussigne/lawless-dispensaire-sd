import { describe, expect, it } from 'vitest';
import { getBankWeekBounds } from '@/lib/bankWeek';
import {
  formatPayrollWeekRangeParis,
  getLatestPayrollListWeekMonday,
  isSamePayrollWeek,
  weekRangeFromIsoDate,
} from './week';

function calendarDateParis(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

describe('weekRangeFromIsoDate', () => {
  it('returns Monday–Sunday in Europe/Paris for a mid-week reference', () => {
    const { weekStart, weekEnd } = weekRangeFromIsoDate('2026-04-15');
    expect(calendarDateParis(weekStart)).toBe('2026-04-13');
    expect(calendarDateParis(weekEnd)).toBe('2026-04-19');
  });

});

describe('getLatestPayrollListWeekMonday', () => {
  it('returns null when there are no reports', () => {
    expect(getLatestPayrollListWeekMonday([])).toBeNull();
  });

  it('returns the Monday of the most recent report week', () => {
    const older = weekRangeFromIsoDate('2026-04-01');
    const newer = weekRangeFromIsoDate('2026-04-15');
    const monday = getLatestPayrollListWeekMonday([
      { weekStart: older.weekStart.toISOString() },
      { weekStart: newer.weekStart.toISOString() },
    ]);
    expect(monday?.getTime()).toBe(getBankWeekBounds(newer.weekStart).start.getTime());
  });
});

describe('formatPayrollWeekRangeParis', () => {
  it('formats using Europe/Paris calendar days', () => {
    const { weekStart, weekEnd } = weekRangeFromIsoDate('2026-06-03');
    expect(formatPayrollWeekRangeParis(weekStart, weekEnd)).toBe('1 juin — 7 juin 2026');
  });
});

describe('isSamePayrollWeek', () => {
  it('matches report weekStart with selected Monday', () => {
    const { weekStart } = weekRangeFromIsoDate('2026-04-15');
    expect(isSamePayrollWeek(weekStart.toISOString(), weekStart)).toBe(true);
    expect(isSamePayrollWeek(weekStart.toISOString(), new Date('2026-04-20'))).toBe(false);
  });
});
