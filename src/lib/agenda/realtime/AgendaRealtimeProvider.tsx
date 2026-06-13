'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getOrCreateAgendaClientId } from '@/lib/agenda/realtime/clientId';
import type { AgendaRealtimeEvent } from '@/lib/agenda/realtime/types';

type RealtimeHandler = (event: AgendaRealtimeEvent) => void;

type RealtimeSubscription = {
  enabled: boolean;
  onEventsChange?: RealtimeHandler;
  onTodosChange?: RealtimeHandler;
  onEventTodosChange?: RealtimeHandler;
};

type AgendaRealtimeContextValue = {
  clientId: string;
  subscribe: (subscription: RealtimeSubscription) => () => void;
};

const AgendaRealtimeContext = createContext<AgendaRealtimeContextValue | null>(null);

export function AgendaRealtimeProvider({
  dispensarySlug,
  children,
}: {
  dispensarySlug: string;
  children: ReactNode;
}) {
  const [clientId] = useState(() => getOrCreateAgendaClientId());
  const subscriptionsRef = useRef(new Map<number, RealtimeSubscription>());
  const nextSubscriptionIdRef = useRef(0);

  const subscribe = useCallback((subscription: RealtimeSubscription) => {
    const id = nextSubscriptionIdRef.current++;
    subscriptionsRef.current.set(id, subscription);

    return () => {
      subscriptionsRef.current.delete(id);
    };
  }, []);

  useEffect(() => {
    if (!dispensarySlug) return;

    const streamUrl = `/api/d/${encodeURIComponent(dispensarySlug)}/agenda/stream`;
    const eventSource = new EventSource(streamUrl);

    const handleChange = (message: MessageEvent<string>) => {
      try {
        const data = JSON.parse(message.data) as AgendaRealtimeEvent;
        if (data.originClientId && data.originClientId === clientId) {
          return;
        }

        for (const subscription of subscriptionsRef.current.values()) {
          if (!subscription.enabled) continue;

          switch (data.type) {
            case 'events':
              subscription.onEventsChange?.(data);
              break;
            case 'todos':
              subscription.onTodosChange?.(data);
              break;
            case 'eventTodos':
              subscription.onEventTodosChange?.(data);
              break;
            default:
              break;
          }
        }
      } catch {
        // Ignore malformed payloads.
      }
    };

    eventSource.addEventListener('change', handleChange);

    return () => {
      eventSource.removeEventListener('change', handleChange);
      eventSource.close();
    };
  }, [clientId, dispensarySlug]);

  return (
    <AgendaRealtimeContext.Provider value={{ clientId, subscribe }}>
      {children}
    </AgendaRealtimeContext.Provider>
  );
}

export function useAgendaRealtimeContext(): AgendaRealtimeContextValue {
  const context = useContext(AgendaRealtimeContext);
  if (!context) {
    throw new Error('useAgendaRealtimeContext must be used within AgendaRealtimeProvider');
  }
  return context;
}
