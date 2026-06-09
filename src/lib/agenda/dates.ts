import dayjs from '@/lib/dayjs';

export function parseAgendaDateInput(
  dateStr: string,
  timeStr: string | undefined,
  allDay: boolean,
): Date {
  if (allDay) {
    return dayjs.tz(dateStr, 'Europe/Paris').startOf('day').toDate();
  }
  const combined = timeStr ? `${dateStr}T${timeStr}` : dateStr;
  return dayjs.tz(combined, 'Europe/Paris').toDate();
}

export function parseAgendaEndDateInput(
  dateStr: string,
  timeStr: string | undefined,
  allDay: boolean,
): Date {
  if (allDay) {
    return dayjs.tz(dateStr, 'Europe/Paris').endOf('day').toDate();
  }
  const combined = timeStr ? `${dateStr}T${timeStr}` : dateStr;
  return dayjs.tz(combined, 'Europe/Paris').toDate();
}

export function formatAgendaDateInput(date: Date): string {
  return dayjs(date).tz('Europe/Paris').format('YYYY-MM-DD');
}

export function formatAgendaTimeInput(date: Date): string {
  return dayjs(date).tz('Europe/Paris').format('HH:mm');
}

export function getNextHalfHourParis(reference: Date = new Date()) {
  const d = dayjs(reference).tz('Europe/Paris');
  const minutes = d.minute();

  if (minutes === 0 || minutes === 30) {
    return d.second(0).millisecond(0);
  }
  if (minutes < 30) {
    return d.minute(30).second(0).millisecond(0);
  }
  return d.add(1, 'hour').minute(0).second(0).millisecond(0);
}

export function buildDefaultTimedSlotForDay(
  day: Date,
  referenceNow: Date = new Date(),
): { start: Date; end: Date } {
  const nextHalf = getNextHalfHourParis(referenceNow);
  const start = dayjs(day)
    .tz('Europe/Paris')
    .startOf('day')
    .hour(nextHalf.hour())
    .minute(nextHalf.minute())
    .second(0)
    .millisecond(0);
  const end = start.add(1, 'hour');

  return { start: start.toDate(), end: end.toDate() };
}

export function assertAgendaEventRangeValid(
  startAt: Date,
  endAt: Date,
  allDay: boolean,
): void {
  if (allDay) return;
  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error('La fin doit être après le début');
  }
}
