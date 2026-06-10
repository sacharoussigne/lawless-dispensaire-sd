import { describe, expect, it } from 'vitest';
import {
  broadcastAgendaRealtime,
  formatSseMessage,
  getAgendaRealtimeSubscriberCount,
  subscribeAgendaRealtime,
} from '@/lib/agenda/realtime/hub';

describe('agenda realtime hub', () => {
  it('formats SSE messages', () => {
    expect(formatSseMessage('change', '{"type":"todos"}')).toBe(
      'event: change\ndata: {"type":"todos"}\n\n',
    );
  });

  it('broadcasts to subscribers and cleans up on unsubscribe', () => {
    const dispensaryId = 'disp-1';
    const received: string[] = [];

    const unsubscribe = subscribeAgendaRealtime(dispensaryId, (chunk) => {
      received.push(chunk);
    });

    expect(getAgendaRealtimeSubscriberCount(dispensaryId)).toBe(1);

    broadcastAgendaRealtime(dispensaryId, {
      type: 'todos',
      agendaId: 'agenda-1',
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toContain('"type":"todos"');

    unsubscribe();
    expect(getAgendaRealtimeSubscriberCount(dispensaryId)).toBe(0);

    broadcastAgendaRealtime(dispensaryId, { type: 'events', agendaId: 'agenda-1' });
    expect(received).toHaveLength(1);
  });
});
