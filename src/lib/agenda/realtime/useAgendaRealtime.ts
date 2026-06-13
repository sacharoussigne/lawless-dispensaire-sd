'use client';

import { useEffect, useRef } from 'react';
import { useAgendaRealtimeContext } from '@/lib/agenda/realtime/AgendaRealtimeProvider';
import type { AgendaRealtimeEvent } from '@/lib/agenda/realtime/types';

type UseAgendaRealtimeOptions = {
  dispensarySlug?: string;
  enabled?: boolean;
  onEventsChange?: (event: AgendaRealtimeEvent) => void;
  onTodosChange?: (event: AgendaRealtimeEvent) => void;
  onEventTodosChange?: (event: AgendaRealtimeEvent) => void;
};

export function useAgendaRealtime({
  enabled = true,
  onEventsChange,
  onTodosChange,
  onEventTodosChange,
}: UseAgendaRealtimeOptions) {
  const { clientId, subscribe } = useAgendaRealtimeContext();
  const handlersRef = useRef({
    onEventsChange,
    onTodosChange,
    onEventTodosChange,
  });

  useEffect(() => {
    handlersRef.current = {
      onEventsChange,
      onTodosChange,
      onEventTodosChange,
    };
  }, [onEventTodosChange, onEventsChange, onTodosChange]);

  useEffect(() => {
    return subscribe({
      enabled,
      onEventsChange: (event) => handlersRef.current.onEventsChange?.(event),
      onTodosChange: (event) => handlersRef.current.onTodosChange?.(event),
      onEventTodosChange: (event) => handlersRef.current.onEventTodosChange?.(event),
    });
  }, [enabled, subscribe]);

  return { clientId };
}
