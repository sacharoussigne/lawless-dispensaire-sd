import { describe, expect, it } from 'vitest';
import { weekRangeFromIsoDate } from './week';

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
