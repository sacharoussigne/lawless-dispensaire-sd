import { z } from 'zod';
import dayjs from '@/lib/dayjs';

const TZ = 'Europe/Paris';

export const WEEKDAY_KEYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const flagShape = WEEKDAY_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: z.boolean() }),
  {} as Record<WeekdayKey, z.ZodBoolean>,
);

export const weekdayFlagsSchema = z.object(flagShape);

export type WeekdayFlags = z.infer<typeof weekdayFlagsSchema>;

export function emptyWeekdayFlags(): WeekdayFlags {
  return {
    lundi: false,
    mardi: false,
    mercredi: false,
    jeudi: false,
    vendredi: false,
    samedi: false,
    dimanche: false,
  };
}

/** Lenient parse for DB / legacy rows: fill missing keys, ignore unknown keys. */
export function parseWeekdayFlagsJson(raw: unknown): WeekdayFlags {
  const defaults = emptyWeekdayFlags();
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const parsed = weekdayFlagsSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return defaults;
  }
  return { ...defaults, ...parsed.data };
}

export function countWeekdayTrues(flags: WeekdayFlags): number {
  return WEEKDAY_KEYS.filter((k) => flags[k]).length;
}

const SUMMARY_MARK = '✓';
const SUMMARY_EMPTY = '·';

export function formatWeekdayFlagsSummary(flags: WeekdayFlags): string {
  return WEEKDAY_KEYS.map((k) => (flags[k] ? SUMMARY_MARK : SUMMARY_EMPTY)).join('');
}

/** Monday-first index in Paris calendar (dayjs `day()`: Sun=0 … Sat=6). */
export function parisWeekdayKey(anchor: Date): WeekdayKey {
  const dow = dayjs(anchor).tz(TZ).day();
  const mondayFirstIndex = (dow + 6) % 7;
  return WEEKDAY_KEYS[mondayFirstIndex];
}

/** Start/end of the Paris calendar day containing `anchor`, as UTC instants. */
export function parisCalendarDayRangeUtc(anchor: Date): { start: Date; end: Date } {
  const d = dayjs(anchor).tz(TZ);
  const start = d.startOf('day');
  const end = d.endOf('day');
  return { start: start.toDate(), end: end.toDate() };
}

export function parisTodayStartUtc(): Date {
  return dayjs().tz(TZ).startOf('day').toDate();
}

export function parisYesterdayStartUtc(): Date {
  return dayjs().tz(TZ).subtract(1, 'day').startOf('day').toDate();
}
