export type AgendaRealtimeEventType =
  | 'events'
  | 'todos'
  | 'eventTodos'
  | 'agendaMeta';

export type AgendaRealtimeEvent = {
  type: AgendaRealtimeEventType;
  agendaId?: string;
  eventId?: string;
  originClientId?: string;
};
