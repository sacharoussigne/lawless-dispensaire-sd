import { publishAgendaRealtime } from '@/lib/agenda/realtime/pgBus';
import type { AgendaRealtimeEvent } from '@/lib/agenda/realtime/types';
import type { AgendaMutationMeta } from '@/lib/agenda/realtime/mutationMeta';

export async function broadcastAgendaChange(
  dispensaryId: string,
  event: Omit<AgendaRealtimeEvent, 'originClientId'>,
  meta?: AgendaMutationMeta,
): Promise<void> {
  await publishAgendaRealtime(dispensaryId, {
    ...event,
    originClientId: meta?.originClientId,
  });
}

export async function emitAgendaEventsChange(
  dispensaryId: string,
  agendaId: string,
  meta?: AgendaMutationMeta,
): Promise<void> {
  await broadcastAgendaChange(dispensaryId, { type: 'events', agendaId }, meta);
}

export async function emitAgendaTodosChange(
  dispensaryId: string,
  agendaId: string,
  meta?: AgendaMutationMeta,
): Promise<void> {
  await broadcastAgendaChange(dispensaryId, { type: 'todos', agendaId }, meta);
}

export async function emitAgendaEventTodosChange(
  dispensaryId: string,
  agendaId: string,
  eventId: string,
  meta?: AgendaMutationMeta,
): Promise<void> {
  await broadcastAgendaChange(
    dispensaryId,
    { type: 'eventTodos', agendaId, eventId },
    meta,
  );
}
