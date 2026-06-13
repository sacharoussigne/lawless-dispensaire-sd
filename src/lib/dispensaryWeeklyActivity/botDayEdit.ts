import dayjs from '@/lib/dayjs';
import { getBankWeekBounds } from '@/lib/bankWeek';
import {
  parisWeekdayKey,
  WEEKDAY_KEYS,
  type WeekdayKey,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';

const TZ = 'Europe/Paris';

export class BotDayEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BotDayEditError';
  }
}

export type BotDayEditResolveInput = {
  weekday?: WeekdayKey;
  date?: string;
};

export function parisDateStringFromAnchor(anchor: Date): string {
  return dayjs(anchor).tz(TZ).format('YYYY-MM-DD');
}

export function resolveParisDayAnchor(input: BotDayEditResolveInput): Date {
  const hasWeekday = input.weekday !== undefined;
  const hasDate = input.date !== undefined && input.date.trim() !== '';

  if (hasWeekday && hasDate) {
    throw new BotDayEditError('Indiquez soit weekday soit date, pas les deux.');
  }
  if (!hasWeekday && !hasDate) {
    throw new BotDayEditError('Indiquez weekday ou date pour cibler un jour.');
  }

  if (hasDate) {
    const dateStr = input.date;
    if (!dateStr) {
      throw new BotDayEditError('Date invalide (format attendu : YYYY-MM-DD).');
    }
    const parsed = dayjs.tz(dateStr, 'YYYY-MM-DD', TZ);
    if (!parsed.isValid()) {
      throw new BotDayEditError('Date invalide (format attendu : YYYY-MM-DD).');
    }
    return parsed.startOf('day').toDate();
  }

  const { start: weekStart } = getBankWeekBounds(new Date());
  const weekStartParis = dayjs(weekStart).tz(TZ).startOf('day');
  const weekday = input.weekday;
  if (!weekday) {
    throw new BotDayEditError('Jour de semaine invalide.');
  }
  const index = WEEKDAY_KEYS.indexOf(weekday);
  if (index < 0) {
    throw new BotDayEditError('Jour de semaine invalide.');
  }
  return weekStartParis.add(index, 'day').toDate();
}

export function assertParisDayNotInFuture(anchor: Date): void {
  const target = dayjs(anchor).tz(TZ).startOf('day');
  const now = dayjs().tz(TZ).startOf('day');
  if (target.isAfter(now)) {
    throw new BotDayEditError("Ce jour n'est pas encore éditable.");
  }
}

export function assertParisDayInCurrentWeek(anchor: Date): void {
  const target = dayjs(anchor).tz(TZ).startOf('day');
  const now = dayjs().tz(TZ);
  const { start: weekStart, end: weekEnd } = getBankWeekBounds(now.toDate());
  const weekStartParis = dayjs(weekStart).tz(TZ).startOf('day');
  const weekEndParis = dayjs(weekEnd).tz(TZ).startOf('day');

  if (target.isBefore(weekStartParis) || target.isAfter(weekEndParis)) {
    throw new BotDayEditError('Ce jour est hors de la semaine en cours.');
  }
}

export function assertBotEditableParisDay(
  anchor: Date,
  options?: { requireCurrentParisWeek?: boolean },
): void {
  assertParisDayNotInFuture(anchor);
  if (options?.requireCurrentParisWeek !== false) {
    assertParisDayInCurrentWeek(anchor);
  }
}

export function assertActivityInCurrentParisWeek(
  periodStart: Date,
  periodEnd: Date,
): void {
  const { start: weekStart, end: weekEnd } = getBankWeekBounds(new Date());
  if (periodStart.getTime() > weekEnd.getTime() || periodEnd.getTime() < weekStart.getTime()) {
    throw new BotDayEditError('Cette activité est hors de la semaine en cours.');
  }
}

export function weekdayKeyForParisAnchor(anchor: Date): WeekdayKey {
  return parisWeekdayKey(anchor);
}

export type BotDayFieldHistoryPayload = {
  day: WeekdayKey;
  date: string;
  chest?: boolean;
  presence?: boolean;
};

export function buildBotDayFieldHistoryPayload(
  anchor: Date,
  field: 'chest' | 'presence',
  value: boolean,
): BotDayFieldHistoryPayload {
  const day = weekdayKeyForParisAnchor(anchor);
  const date = parisDateStringFromAnchor(anchor);
  if (field === 'chest') {
    return { day, date, chest: value };
  }
  return { day, date, presence: value };
}
