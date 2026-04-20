/**
 * ISO-style week boundaries in the UTC calendar: Monday 00:00:00.000Z through Sunday 23:59:59.999Z.
 */

export function getUtcIsoWeekRange(anchor: Date): { periodStart: Date; periodEnd: Date } {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();
  const dow = anchor.getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  const periodStart = new Date(Date.UTC(y, m, d - daysFromMonday, 0, 0, 0, 0));
  const periodEnd = new Date(periodStart.getTime() + 7 * 86_400_000 - 1);
  return { periodStart, periodEnd };
}

export function toUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

const periodDayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

const periodDayMonthYearFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** e.g. "13 avr." for table start column (UTC calendar day) */
export function formatUtcPeriodStartLabel(d: Date): string {
  return periodDayMonthFormatter.format(d);
}

/** e.g. "19 avr. 2026" for table end column (UTC calendar day) */
export function formatUtcPeriodEndLabel(d: Date): string {
  return periodDayMonthYearFormatter.format(d);
}

/** Parse yyyy-MM-dd as UTC calendar midnight (for anchoring week normalization). */
export function utcMidnightFromYmd(ymd: string): Date {
  const [ys, ms, ds] = ymd.split('-');
  const y = Number(ys);
  const m = Number(ms) - 1;
  const d = Number(ds);
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
}
