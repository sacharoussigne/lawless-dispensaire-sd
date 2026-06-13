import type { AgendaRealtimeEvent } from '@/lib/agenda/realtime/types';

type AgendaRealtimeSubscriber = {
  send: (chunk: string) => void;
};

type AgendaRealtimeHubGlobal = typeof globalThis & {
  __agendaRealtimeChannels?: Map<string, Set<AgendaRealtimeSubscriber>>;
};

function getChannels(): Map<string, Set<AgendaRealtimeSubscriber>> {
  const globalStore = globalThis as AgendaRealtimeHubGlobal;
  if (!globalStore.__agendaRealtimeChannels) {
    globalStore.__agendaRealtimeChannels = new Map();
  }
  return globalStore.__agendaRealtimeChannels;
}

export function formatSseMessage(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}

export function subscribeAgendaRealtime(
  dispensaryId: string,
  send: (chunk: string) => void,
): () => void {
  const channels = getChannels();
  const subscriber: AgendaRealtimeSubscriber = { send };
  let subscribers = channels.get(dispensaryId);
  if (!subscribers) {
    subscribers = new Set();
    channels.set(dispensaryId, subscribers);
  }
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      channels.delete(dispensaryId);
    }
  };
}

export function broadcastAgendaRealtime(
  dispensaryId: string,
  event: AgendaRealtimeEvent,
): void {
  const subscribers = getChannels().get(dispensaryId);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const chunk = formatSseMessage('change', JSON.stringify(event));
  for (const subscriber of subscribers) {
    try {
      subscriber.send(chunk);
    } catch {
      // Connection may already be closed.
    }
  }
}

export function getAgendaRealtimeSubscriberCount(dispensaryId: string): number {
  return getChannels().get(dispensaryId)?.size ?? 0;
}
