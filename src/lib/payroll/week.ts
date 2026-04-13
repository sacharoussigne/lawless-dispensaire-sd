import dayjs from '../dayjs';

const PAYROLL_WEEK_TZ = 'Europe/Paris';

/**
 * Monday 00:00 → Sunday end-of-day in Europe/Paris (stored as absolute instants).
 * Using Paris avoids UTC end-of-week drifting to Monday in local display (CEST/CET).
 */
export function weekRangeFromIsoDate(weekReferenceIso: string): { weekStart: Date; weekEnd: Date } {
  const d = dayjs.tz(weekReferenceIso, PAYROLL_WEEK_TZ).startOf('day');
  const weekStart = d.subtract((d.day() + 6) % 7, 'day').startOf('day');
  const weekEnd = weekStart.add(6, 'day').endOf('day');
  return { weekStart: weekStart.toDate(), weekEnd: weekEnd.toDate() };
}
