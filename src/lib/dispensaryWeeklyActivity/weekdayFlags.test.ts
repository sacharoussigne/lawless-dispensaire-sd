import { describe, expect, it } from 'vitest';
import {
  emptyWeekdayFlags,
  formatWeekdayFlagsSummary,
  parseWeekdayFlagsJson,
  parisCalendarDayRangeUtc,
  parisWeekdayKey,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';
import dayjs from '@/lib/dayjs';

describe('weekdayFlags', () => {
  it('parses partial JSON and fills defaults', () => {
    expect(parseWeekdayFlagsJson({ lundi: true })).toEqual({
      ...emptyWeekdayFlags(),
      lundi: true,
    });
  });

  it('ignores unknown keys leniently', () => {
    expect(parseWeekdayFlagsJson({ lundi: true, extra: 1 } as Record<string, unknown>).lundi).toBe(true);
  });

  it('formats summary with seven chars', () => {
    const f = { ...emptyWeekdayFlags(), lundi: true, dimanche: true };
    expect(formatWeekdayFlagsSummary(f)).toBe('✓·····✓');
  });

  it('maps Paris Wednesday to mercredi', () => {
    const wed = dayjs.tz('2026-04-15 14:00:00', 'YYYY-MM-DD HH:mm:ss', 'Europe/Paris').toDate();
    expect(parisWeekdayKey(wed)).toBe('mercredi');
  });

  it('maps Paris Monday 00:10 to lundi', () => {
    const mon = dayjs.tz('2026-04-20 00:10:00', 'YYYY-MM-DD HH:mm:ss', 'Europe/Paris').toDate();
    expect(parisWeekdayKey(mon)).toBe('lundi');
  });

  it('parisCalendarDayRangeUtc covers the full local day', () => {
    const anchor = dayjs.tz('2026-04-20 12:00:00', 'YYYY-MM-DD HH:mm:ss', 'Europe/Paris').toDate();
    const { start, end } = parisCalendarDayRangeUtc(anchor);
    expect(dayjs(start).tz('Europe/Paris').format('YYYY-MM-DD HH:mm:ss')).toBe('2026-04-20 00:00:00');
    expect(dayjs(end).tz('Europe/Paris').format('YYYY-MM-DD')).toBe('2026-04-20');
    expect(dayjs(end).tz('Europe/Paris').hour()).toBe(23);
  });
});
