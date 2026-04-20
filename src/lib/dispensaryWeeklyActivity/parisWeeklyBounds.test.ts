import { describe, expect, it } from 'vitest';
import { getBankWeekBounds } from '@/lib/bankWeek';
import dayjs from '@/lib/dayjs';

describe('dispensary weekly activity Paris week bounds', () => {
  it('anchors a Wednesday in April 2026 to Monday 00:00 Paris through Sunday end', () => {
    const wed = dayjs.tz('2026-04-15 12:00:00', 'YYYY-MM-DD HH:mm:ss', 'Europe/Paris').toDate();
    const { start, end } = getBankWeekBounds(wed);
    const startParis = dayjs(start).tz('Europe/Paris');
    const endParis = dayjs(end).tz('Europe/Paris');
    expect(startParis.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-04-13 00:00:00');
    expect(endParis.day()).toBe(0);
    expect(endParis.format('YYYY-MM-DD')).toBe('2026-04-19');
  });

  it('rolls to the next week on Monday 00:00 Paris', () => {
    const mon = dayjs.tz('2026-04-20 00:00:00', 'YYYY-MM-DD HH:mm:ss', 'Europe/Paris').toDate();
    const { start } = getBankWeekBounds(mon);
    expect(dayjs(start).tz('Europe/Paris').format('YYYY-MM-DD')).toBe('2026-04-20');
  });
});
