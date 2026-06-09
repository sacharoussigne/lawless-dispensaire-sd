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
