'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, type View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import dayjs from '@/lib/dayjs';
import type { AgendaEventDTO } from '@/types/agenda';
import { listAgendaEvents } from '@/app/_actions/agenda/events';
import { handleAction } from '@/lib/action';
import { AGENDA_PANEL_HEIGHT_PX } from '../constants';
import {
  isAgendaCalendarView,
  parseAgendaCalendarDateParam,
} from '@/lib/agenda/calendarNavigation';
import { formatAgendaDateInput } from '@/lib/agenda/dates';
import { agendaCalendarLocalizer, agendaCalendarTimeBounds } from '../calendarLocalizer';
import classes from '../agenda.module.scss';

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
  onSelectSlot: (start: Date, end: Date, view: View) => void;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const viewParam = searchParams.get('view');
  const urlView = isAgendaCalendarView(viewParam) ? viewParam : null;
  const urlDate = parseAgendaCalendarDateParam(searchParams.get('date'));

  const [view, setView] = useState<View>(urlView ?? 'month');
  const [date, setDate] = useState(urlDate ?? new Date());

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const nextView = params.get('view');
    const nextDate = params.get('date');

    if (isAgendaCalendarView(nextView)) {
      setView(nextView);
    }
    const parsedDate = parseAgendaCalendarDateParam(nextDate);
    if (parsedDate) {
      setDate(parsedDate);
    }
  }, [searchParamsKey]);

  const replaceSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleViewChange = useCallback(
    (nextView: View) => {
      setView(nextView);
      replaceSearchParams((params) => {
        if (nextView === 'month') {
          params.delete('view');
          params.delete('date');
          return;
        }
        params.set('view', nextView);
        if (nextView === 'day' || nextView === 'week' || nextView === 'work_week') {
          params.set('date', formatAgendaDateInput(date));
        }
      });
    },
    [date, replaceSearchParams],
  );

  const handleNavigate = useCallback(
    (nextDate: Date) => {
      setDate(nextDate);
      replaceSearchParams((params) => {
        const currentView = params.get('view');
        if (isAgendaCalendarView(currentView) && currentView !== 'month') {
          params.set('date', formatAgendaDateInput(nextDate));
        }
      });
    },
    [replaceSearchParams],
  );

  const isTimeView = view === 'week' || view === 'day' || view === 'work_week';

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      events.map((e) => {
        const start = new Date(e.startAt);
        const end = new Date(e.endAt);

        if (isTimeView && e.allDay) {
          return {
            id: e.id,
            title: e.title,
            start: dayjs(start).startOf('day').toDate(),
            end: dayjs(end).endOf('day').toDate(),
            allDay: false,
            resource: e,
          };
        }

        return {
          id: e.id,
          title: e.title,
          start,
          end,
          allDay: e.allDay,
          resource: e,
        };
      }),
    [events, isTimeView],
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
        localizer={agendaCalendarLocalizer}
        min={agendaCalendarTimeBounds.min}
        max={agendaCalendarTimeBounds.max}
        scrollToTime={agendaCalendarTimeBounds.scrollToTime}
        dayLayoutAlgorithm="no-overlap"
        showMultiDayTimes
        allDayMaxRows={0}
        events={calendarEvents}
        view={view}
        onView={handleViewChange}
        date={date}
        onNavigate={handleNavigate}
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
          showMore: (total) => `+${total} de plus`,
        }}
        eventPropGetter={eventPropGetter}
        onSelectEvent={(event) => onSelectEvent(event.resource)}
        selectable={canWrite}
        onSelectSlot={
          canWrite
            ? ({ start, end }) => onSelectSlot(start, end, view)
            : undefined
        }
      />
    </div>
  );
}
