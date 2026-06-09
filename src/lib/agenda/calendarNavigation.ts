import dayjs from '@/lib/dayjs';
import { formatAgendaDateInput } from '@/lib/agenda/dates';

export const AGENDA_CALENDAR_VIEWS = ['month', 'week', 'day', 'work_week'] as const;
export type AgendaCalendarView = (typeof AGENDA_CALENDAR_VIEWS)[number];

export function isAgendaCalendarView(value: string | null): value is AgendaCalendarView {
  return (
    value === 'month' ||
    value === 'week' ||
    value === 'day' ||
    value === 'work_week'
  );
}

export function parseAgendaCalendarDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return dayjs.tz(value, 'Europe/Paris').startOf('day').toDate();
}

export function buildAgendaDayViewHref(
  agendaHref: string,
  day: Date,
  options?: { agendaId?: string },
): string {
  const params = new URLSearchParams({
    view: 'day',
    date: formatAgendaDateInput(day),
  });
  if (options?.agendaId) {
    params.set('agendaId', options.agendaId);
  }
  return `${agendaHref}?${params.toString()}`;
}
