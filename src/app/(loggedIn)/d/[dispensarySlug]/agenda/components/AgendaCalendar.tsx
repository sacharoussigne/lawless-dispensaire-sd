'use client';

import { useCallback, useMemo, useState } from 'react';
import { Calendar, dayjsLocalizer, type View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dayjs from '@/lib/dayjs';
import type { AgendaEventDTO } from '@/types/agenda';
import { listAgendaEvents } from '@/app/_actions/agenda/events';
import { handleAction } from '@/lib/action';
import { AGENDA_PANEL_HEIGHT_PX } from '../constants';
import classes from '../agenda.module.scss';

const localizer = dayjsLocalizer(dayjs);

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: AgendaEventDTO;
};

interface AgendaCalendarProps {
  dispensarySlug: string;
  agendaId: string | null;
  events: AgendaEventDTO[];
  onEventsChange: (events: AgendaEventDTO[]) => void;
  canWrite: boolean;
  onSelectEvent: (event: AgendaEventDTO) => void;
  onSelectSlot: (start: Date, end: Date) => void;
}

export function AgendaCalendar({
  dispensarySlug,
  agendaId,
  events,
  onEventsChange,
  canWrite,
  onSelectEvent,
  onSelectSlot,
}: AgendaCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.startAt),
        end: new Date(e.endAt),
        allDay: e.allDay,
        resource: e,
      })),
    [events],
  );

  const loadRange = useCallback(
    async (rangeStart: Date, rangeEnd: Date) => {
      const result = await listAgendaEvents(dispensarySlug, {
        agendaId: agendaId ?? undefined,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      });
      const data = handleAction(result);
      if (data) onEventsChange(data);
    },
    [dispensarySlug, agendaId, onEventsChange],
  );

  const handleRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        if (range.length === 0) return;
        const start = range[0];
        const end = range[range.length - 1];
        void loadRange(
          dayjs(start).startOf('day').toDate(),
          dayjs(end).endOf('day').toDate(),
        );
        return;
      }
      void loadRange(range.start, range.end);
    },
    [loadRange],
  );

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const className = event.resource.isParticipant
      ? 'agenda-event-participant'
      : 'agenda-event-default';
    return { className };
  }, []);

  return (
    <div className={`${classes.calendarWrapper} ${classes.calendarPanel}`}>
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onRangeChange={handleRangeChange}
        startAccessor="start"
        endAccessor="end"
        allDayAccessor="allDay"
        style={{ height: AGENDA_PANEL_HEIGHT_PX }}
        culture="fr"
        messages={{
          today: "Aujourd'hui",
          previous: 'Préc.',
          next: 'Suiv.',
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Heure',
          event: 'Événement',
          noEventsInRange: 'Aucun événement sur cette période.',
        }}
        eventPropGetter={eventPropGetter}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        selectable={canWrite}
        onSelectSlot={
          canWrite
            ? ({ start, end }) => onSelectSlot(start, end)
            : undefined
        }
      />
    </div>
  );
}
