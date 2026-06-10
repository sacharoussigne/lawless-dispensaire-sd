import { describe, expect, it } from 'vitest';
import { isRelevantAgendaRealtimeEvent } from '@/lib/agenda/realtime/isRelevantAgendaEvent';

describe('isRelevantAgendaRealtimeEvent', () => {
  it('matches selected agenda on the agenda page', () => {
    expect(
      isRelevantAgendaRealtimeEvent(
        { type: 'todos', agendaId: 'agenda-a' },
        { selectedAgendaId: 'agenda-a' },
      ),
    ).toBe(true);

    expect(
      isRelevantAgendaRealtimeEvent(
        { type: 'events', agendaId: 'agenda-b' },
        { selectedAgendaId: 'agenda-a' },
      ),
    ).toBe(false);
  });

  it('matches accessible agendas in the header scope', () => {
    expect(
      isRelevantAgendaRealtimeEvent(
        { type: 'events', agendaId: 'agenda-a' },
        { accessibleAgendaIds: ['agenda-a', 'agenda-b'] },
      ),
    ).toBe(true);

    expect(
      isRelevantAgendaRealtimeEvent(
        { type: 'events', agendaId: 'agenda-c' },
        { accessibleAgendaIds: ['agenda-a', 'agenda-b'] },
      ),
    ).toBe(false);
  });

  it('allows participant-only users without accessible agenda ids', () => {
    expect(
      isRelevantAgendaRealtimeEvent(
        { type: 'events', agendaId: 'agenda-x' },
        { accessibleAgendaIds: [] },
      ),
    ).toBe(true);
  });
});
