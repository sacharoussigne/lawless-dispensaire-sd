export type AgendaRealtimeEventType = 'events' | 'todos' | 'eventTodos';

export type AgendaRealtimeEvent = {
  type: AgendaRealtimeEventType;
  agendaId?: string;
  eventId?: string;
  originClientId?: string;
};
