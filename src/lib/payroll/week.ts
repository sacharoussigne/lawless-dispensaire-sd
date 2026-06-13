import { getBankWeekBounds } from '@/lib/bankWeek';
import { parsePickerDate } from '@/lib/date';
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

/** Default list filter: Monday of the most recent week that has payroll reports. */
export function getLatestPayrollListWeekMonday(
  reports: { weekStart: string }[],
): Date | null {
  if (reports.length === 0) return null;

  let latestMonday: Date | null = null;
  let latestMs = -Infinity;

  for (const report of reports) {
    const monday = parsePickerDate(getBankWeekBounds(new Date(report.weekStart)).start);
    if (!monday) continue;
    const ms = monday.getTime();
    if (ms > latestMs) {
      latestMs = ms;
      latestMonday = monday;
    }
  }

  return latestMonday;
}

export function formatPayrollWeekRangeParis(start: Date, end: Date): string {
  const s = dayjs(start).tz(PAYROLL_WEEK_TZ);
  const e = dayjs(end).tz(PAYROLL_WEEK_TZ);
  return `${s.format('D MMM')} — ${e.format('D MMM YYYY')}`;
}

export function isSamePayrollWeek(reportWeekStart: string, selectedMonday: Date): boolean {
  const reportBounds = getBankWeekBounds(new Date(reportWeekStart));
  const selectedBounds = getBankWeekBounds(selectedMonday);
  return reportBounds.start.getTime() === selectedBounds.start.getTime();
}
