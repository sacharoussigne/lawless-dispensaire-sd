'use client';

import { useEffect, useRef, useState } from 'react';
import { getOrCreateAgendaClientId } from '@/lib/agenda/realtime/clientId';
import type { AgendaRealtimeEvent } from '@/lib/agenda/realtime/types';

type UseAgendaRealtimeOptions = {
  dispensarySlug: string;
  enabled?: boolean;
  onEventsChange?: (event: AgendaRealtimeEvent) => void;
  onTodosChange?: (event: AgendaRealtimeEvent) => void;
  onEventTodosChange?: (event: AgendaRealtimeEvent) => void;
  onAgendaMetaChange?: (event: AgendaRealtimeEvent) => void;
};

function dispatchRealtimeEvent(
  data: AgendaRealtimeEvent,
  clientId: string,
  handlers: Pick<
    UseAgendaRealtimeOptions,
    | 'onEventsChange'
    | 'onTodosChange'
    | 'onEventTodosChange'
    | 'onAgendaMetaChange'
  >,
) {
  if (data.originClientId && data.originClientId === clientId) {
    return;
  }

  switch (data.type) {
    case 'events':
      handlers.onEventsChange?.(data);
      break;
    case 'todos':
      handlers.onTodosChange?.(data);
      break;
    case 'eventTodos':
      handlers.onEventTodosChange?.(data);
      break;
    case 'agendaMeta':
      handlers.onAgendaMetaChange?.(data);
      break;
    default:
      break;
  }
}

export function useAgendaRealtime({
  dispensarySlug,
  enabled = true,
  onEventsChange,
  onTodosChange,
  onEventTodosChange,
  onAgendaMetaChange,
}: UseAgendaRealtimeOptions) {
  const [clientId] = useState(() => getOrCreateAgendaClientId());
  const handlersRef = useRef({
    onEventsChange,
    onTodosChange,
    onEventTodosChange,
    onAgendaMetaChange,
  });

  useEffect(() => {
    handlersRef.current = {
      onEventsChange,
      onTodosChange,
      onEventTodosChange,
      onAgendaMetaChange,
    };
  }, [onAgendaMetaChange, onEventTodosChange, onEventsChange, onTodosChange]);

  useEffect(() => {
    if (!enabled || !dispensarySlug) {
      return;
    }

    const streamUrl = `/api/d/${encodeURIComponent(dispensarySlug)}/agenda/stream`;
    const eventSource = new EventSource(streamUrl);

    const handleChange = (message: MessageEvent<string>) => {
      try {
        const data = JSON.parse(message.data) as AgendaRealtimeEvent;
        dispatchRealtimeEvent(data, clientId, handlersRef.current);
      } catch {
        // Ignore malformed payloads.
      }
    };

    eventSource.addEventListener('change', handleChange);

    return () => {
      eventSource.removeEventListener('change', handleChange);
      eventSource.close();
    };
  }, [clientId, dispensarySlug, enabled]);

  return { clientId };
}
