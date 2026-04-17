import dayjs from '@/lib/dayjs';

const TZ = 'Europe/Paris';

/**
 * Monday 00:00 → Sunday end-of-day in Europe/Paris (same rule as payroll weeks).
 */
export function getBankWeekBounds(date: Date) {
  const d = dayjs(date).tz(TZ).startOf('day');
  const weekStart = d.subtract((d.day() + 6) % 7, 'day').startOf('day');
  const weekEnd = weekStart.add(6, 'day').endOf('day');
  return { start: weekStart.toDate(), end: weekEnd.toDate() };
}

/**
 * Moves by whole ISO weeks in Paris, independent of the browser timezone.
 */
export function addParisWeeks(date: Date | string | number, deltaWeeks: number): Date {
  const { start: monday } = getBankWeekBounds(new Date(date));
  return dayjs(monday).tz(TZ).add(deltaWeeks, 'week').toDate();
}
