import type { AgendaEventDTO } from '@/types/agenda';

export type AgendaEventChange =
  | { type: 'upsert'; event: AgendaEventDTO }
  | { type: 'delete'; id: string };

export function toCalendarEventSummary(event: AgendaEventDTO): AgendaEventDTO {
  return {
    ...event,
    participants: [],
    todoTasks: [],
  };
}

export function upsertCalendarEvent(
  events: AgendaEventDTO[],
  event: AgendaEventDTO,
): AgendaEventDTO[] {
  const summary = toCalendarEventSummary(event);
  const index = events.findIndex((item) => item.id === summary.id);
  if (index < 0) {
    return [...events, summary];
  }
  const next = [...events];
  next[index] = summary;
  return next;
}

export function removeCalendarEvent(
  events: AgendaEventDTO[],
  eventId: string,
): AgendaEventDTO[] {
  return events.filter((event) => event.id !== eventId);
}
