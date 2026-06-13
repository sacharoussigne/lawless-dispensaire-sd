'use client';

import { listAgendaEvents } from '@/app/_actions/agenda/events';
import {
  buildAgendaDayViewHref,
} from '@/lib/agenda/calendarNavigation';
import { useAgendaRealtime } from '@/lib/agenda/realtime/useAgendaRealtime';
import { isRelevantAgendaRealtimeEvent } from '@/lib/agenda/realtime/isRelevantAgendaEvent';
import { subscribeUpcomingEventsLocalRefresh } from '@/lib/agenda/upcomingEventsLocalRefresh';
import { formatAgendaTimeInput } from '@/lib/agenda/dates';
import type { Dayjs } from 'dayjs';
import dayjs from '@/lib/dayjs';
import type { AgendaEventDTO } from '@/types/agenda';
import {
  ActionIcon,
  Anchor,
  Box,
  Indicator,
  Popover,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classes from './Header.module.scss';
import { usePermissions } from '@/app/_contexts/PermissionsContext';

function getTodayTomorrowBounds() {
  const todayStart = dayjs().tz('Europe/Paris').startOf('day');
  return {
    rangeStart: todayStart.toISOString(),
    rangeEnd: todayStart.add(2, 'day').toISOString(),
    todayStart,
    tomorrowStart: todayStart.add(1, 'day'),
    dayAfterTomorrow: todayStart.add(2, 'day'),
  };
}

function partitionTodayTomorrow(
  events: AgendaEventDTO[],
  todayStart: dayjs.Dayjs,
  tomorrowStart: dayjs.Dayjs,
  dayAfterTomorrow: dayjs.Dayjs,
) {
  const today: AgendaEventDTO[] = [];
  const tomorrow: AgendaEventDTO[] = [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  for (const event of sorted) {
    const start = dayjs(event.startAt).tz('Europe/Paris');
    const end = dayjs(event.endAt).tz('Europe/Paris');

    if (end.isAfter(todayStart) && start.isBefore(tomorrowStart)) {
      today.push(event);
    } else if (end.isAfter(tomorrowStart) && start.isBefore(dayAfterTomorrow)) {
      tomorrow.push(event);
    }
  }

  return { today, tomorrow };
}

function formatEventSchedule(event: AgendaEventDTO): string {
  if (event.allDay) {
    return 'Journée entière';
  }
  return `${formatAgendaTimeInput(event.startAt)} – ${formatAgendaTimeInput(event.endAt)}`;
}

function EventGroup({
  label,
  events,
  agendaHref,
  dayDate,
  onNavigate,
}: {
  label: string;
  events: AgendaEventDTO[];
  agendaHref: string;
  dayDate: Dayjs;
  onNavigate: () => void;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <Box>
      <Text size="xs" tt="uppercase" c="dimmed" fw={600} mb={6}>
        {label}
      </Text>
      <Stack gap={4}>
        {events.map((event) => (
          <UnstyledButton
            key={event.id}
            component={Link}
            href={buildAgendaDayViewHref(agendaHref, dayDate.toDate(), {
              agendaId: event.agendaId,
            })}
            className={classes.upcomingEventRow}
            onClick={onNavigate}
          >
            <Text size="sm" fw={500} lineClamp={1}>
              {event.title}
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {formatEventSchedule(event)}
              {event.agendaName ? ` · ${event.agendaName}` : ''}
            </Text>
          </UnstyledButton>
        ))}
      </Stack>
    </Box>
  );
}

export function HeaderUpcomingEvents({
  dispensarySlug,
  agendaHref,
}: {
  dispensarySlug: string;
  agendaHref: string;
}) {
  const router = useRouter();
  const { accessibleAgendaIds } = usePermissions();
  const accessibleAgendaIdsRef = useRef(accessibleAgendaIds);
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AgendaEventDTO[]>([]);

  const bounds = useMemo(() => getTodayTomorrowBounds(), []);

  const queryRange = useMemo(
    () => ({
      rangeStart: bounds.rangeStart,
      rangeEnd: bounds.rangeEnd,
    }),
    [bounds.rangeEnd, bounds.rangeStart],
  );

  const fetchUpcomingEvents = useCallback(async () => {
    const result = await listAgendaEvents(dispensarySlug, queryRange);
    if (result.status === 200 && 'data' in result) {
      return result.data;
    }
    return null;
  }, [dispensarySlug, queryRange]);

  const fetchUpcomingEventsRef = useRef(fetchUpcomingEvents);

  useEffect(() => {
    fetchUpcomingEventsRef.current = fetchUpcomingEvents;
  }, [fetchUpcomingEvents]);

  useEffect(() => {
    accessibleAgendaIdsRef.current = accessibleAgendaIds;
  }, [accessibleAgendaIds]);

  useAgendaRealtime({
    dispensarySlug,
    onEventsChange: (event) => {
      if (
        !isRelevantAgendaRealtimeEvent(event, {
          accessibleAgendaIds: accessibleAgendaIdsRef.current,
        })
      ) {
        return;
      }
      void fetchUpcomingEventsRef.current().then((data) => {
        if (data) setEvents(data);
        setLoading(false);
      });
    },
  });

  useEffect(() => {
    return subscribeUpcomingEventsLocalRefresh(() => {
      void fetchUpcomingEventsRef.current().then((data) => {
        if (data) setEvents(data);
        setLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await fetchUpcomingEvents();
      if (cancelled) return;
      if (data) setEvents(data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchUpcomingEvents]);

  const handlePopoverChange = useCallback(
    (value: boolean) => {
      setOpened(value);
      if (!value) return;

      void fetchUpcomingEvents().then((data) => {
        if (data) setEvents(data);
      });
    },
    [fetchUpcomingEvents],
  );

  const { today, tomorrow } = useMemo(
    () =>
      partitionTodayTomorrow(
        events,
        bounds.todayStart,
        bounds.tomorrowStart,
        bounds.dayAfterTomorrow,
      ),
    [bounds.dayAfterTomorrow, bounds.todayStart, bounds.tomorrowStart, events],
  );

  const eventCount = today.length + tomorrow.length;
  const hasEvents = eventCount > 0;

  const handleIndicatorClick = () => {
    if (loading) return;
    if (!hasEvents) {
      router.push(agendaHref);
      return;
    }
    handlePopoverChange(!opened);
  };

  const calendarButton = (
    <ActionIcon
      variant="light"
      color="sage"
      size="lg"
      aria-label={hasEvents ? "Événements aujourd'hui et demain" : 'Agenda'}
      onClick={handleIndicatorClick}
    >
      <IconCalendarEvent size={20} stroke={1.5} />
    </ActionIcon>
  );

  if (!hasEvents) {
    return (
      <Tooltip label="Agenda" position="bottom">
        <Indicator inline processing={loading} disabled color="sage" size={18}>
          {calendarButton}
        </Indicator>
      </Tooltip>
    );
  }

  return (
    <Popover
      opened={opened}
      onChange={handlePopoverChange}
      position="bottom-end"
      width={320}
      withinPortal
    >
      <Popover.Target>
        <Indicator
          inline
          processing={loading}
          disabled={loading}
          color="sage"
          label={eventCount > 9 ? '9+' : eventCount}
          size={18}
        >
          {calendarButton}
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text fw={600} size="sm" className="disp-display-title">
            Événements à venir
          </Text>
          <EventGroup
            label="Aujourd'hui"
            events={today}
            agendaHref={agendaHref}
            dayDate={bounds.todayStart}
            onNavigate={() => setOpened(false)}
          />
          <EventGroup
            label="Demain"
            events={tomorrow}
            agendaHref={agendaHref}
            dayDate={bounds.tomorrowStart}
            onNavigate={() => setOpened(false)}
          />
          <Anchor
            component={Link}
            href={agendaHref}
            size="sm"
            onClick={() => setOpened(false)}
          >
            Voir l&apos;agenda
          </Anchor>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
