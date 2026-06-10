import type { AgendaRealtimeEvent } from '@/lib/agenda/realtime/types';

export type AgendaRealtimeScope = {
  selectedAgendaId?: string | null;
  accessibleAgendaIds?: readonly string[];
};

export function isRelevantAgendaRealtimeEvent(
  event: AgendaRealtimeEvent,
  scope: AgendaRealtimeScope,
): boolean {
  const { selectedAgendaId, accessibleAgendaIds } = scope;

  if (event.type === 'eventTodos') {
    return true;
  }

  if (!event.agendaId) {
    return true;
  }

  if (selectedAgendaId) {
    return event.agendaId === selectedAgendaId;
  }

  if (accessibleAgendaIds && accessibleAgendaIds.length > 0) {
    return accessibleAgendaIds.includes(event.agendaId);
  }

  return true;
}
