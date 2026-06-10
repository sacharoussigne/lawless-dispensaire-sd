'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { listAgendaEvents } from '@/app/_actions/agenda/events';
import { handleAction } from '@/lib/action';
import { Button, Container, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from '@/lib/dayjs';
import { buildDefaultTimedSlotForDay } from '@/lib/agenda/dates';
import { notifyUpcomingEventsRefresh } from '@/lib/agenda/upcomingEventsRefresh';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import {
  canWriteAgenda,
  type AgendaEventDTO,
  type AgendaSummaryDTO,
  type AgendaTodoListDTO,
} from '@/types/agenda';
import { tenantRoutes } from '@/types/routes';
import { AgendaSelector } from './components/AgendaSelector';
import type { View } from 'react-big-calendar';
import { AgendaCalendar } from './components/AgendaCalendar';
import { AgendaLayoutControls } from './components/AgendaLayoutControls';
import { AgendaTodoPanel } from './components/AgendaTodoPanel';
import { EventModal } from './components/EventModal';
import { useAgendaLayoutPreference } from './hooks/useAgendaLayoutPreference';
import {
  AGENDA_CONTAINER_MAX_WIDTH_EXPANDED_PX,
  AGENDA_PANEL_HEIGHT_EXPANDED_PX,
  AGENDA_PANEL_HEIGHT_PX,
  AGENDA_TODO_COLUMN_WIDTH_EXPANDED_PX,
  AGENDA_TODO_COLUMN_WIDTH_PX,
} from './constants';
import classes from './agenda.module.scss';

interface AgendaPageClientProps {
  dispensarySlug: string;
  agendas: AgendaSummaryDTO[];
  initialEvents: AgendaEventDTO[];
  initialTodoLists: AgendaTodoListDTO[];
  isAdmin: boolean;
}

export function AgendaPageClient({
  dispensarySlug,
  agendas: initialAgendas,
  initialEvents,
  initialTodoLists,
  isAdmin,
}: AgendaPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agendaIdFromUrl = searchParams.get('agendaId');

  const [agendas] = useState(initialAgendas);
  const [manualAgendaId, setManualAgendaId] = useState<string | null>(null);
  const [lastUrlAgendaId, setLastUrlAgendaId] = useState(agendaIdFromUrl);
  const [events, setEvents] = useState(initialEvents);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEventDTO | null>(null);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [slotEnd, setSlotEnd] = useState<Date | null>(null);

  const participantOnly = agendas.length === 0 && events.length > 0;

  const urlAgendaId = useMemo(() => {
    if (participantOnly || !agendaIdFromUrl) return null;
    if (!agendas.some((agenda) => agenda.id === agendaIdFromUrl)) return null;
    return agendaIdFromUrl;
  }, [agendaIdFromUrl, agendas, participantOnly]);

  if (agendaIdFromUrl !== lastUrlAgendaId) {
    setLastUrlAgendaId(agendaIdFromUrl);
    setManualAgendaId(null);
  }

  const selectedAgendaId =
    manualAgendaId ?? urlAgendaId ?? agendas[0]?.id ?? null;

  const selectedAgenda = useMemo(
    () => agendas.find((a) => a.id === selectedAgendaId) ?? agendas[0] ?? null,
    [agendas, selectedAgendaId],
  );

  const canWrite = canWriteAgenda(selectedAgenda?.accessLevel ?? null);
  const t = tenantRoutes(dispensarySlug);
  const { layout, setWidthMode, toggleCalendar, toggleTodo } =
    useAgendaLayoutPreference(dispensarySlug);

  const isExpanded = layout.widthMode === 'expanded';
  const panelHeightPx = isExpanded ? AGENDA_PANEL_HEIGHT_EXPANDED_PX : AGENDA_PANEL_HEIGHT_PX;
  const todoColumnWidthPx = isExpanded
    ? AGENDA_TODO_COLUMN_WIDTH_EXPANDED_PX
    : AGENDA_TODO_COLUMN_WIDTH_PX;

  const layoutStyle = useMemo(
    () =>
      ({
        '--agenda-panel-height': `${panelHeightPx}px`,
        '--agenda-todo-column-width': `${todoColumnWidthPx}px`,
        '--agenda-container-max-width': `${AGENDA_CONTAINER_MAX_WIDTH_EXPANDED_PX}px`,
      }) as CSSProperties,
    [panelHeightPx, todoColumnWidthPx],
  );

  const fetchEvents = useCallback(
    async (agendaId: string | null = selectedAgendaId) => {
      const rangeStart = dayjs().startOf('month').subtract(1, 'week').toDate();
      const rangeEnd = dayjs().endOf('month').add(1, 'week').toDate();
      const result = await listAgendaEvents(dispensarySlug, {
        agendaId: agendaId ?? undefined,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      });
      const data = handleAction(result);
      if (data) setEvents(data);
    },
    [dispensarySlug, selectedAgendaId],
  );

  useEffect(() => {
    if (!urlAgendaId) return;

    let cancelled = false;

    void (async () => {
      const rangeStart = dayjs().startOf('month').subtract(1, 'week').toDate();
      const rangeEnd = dayjs().endOf('month').add(1, 'week').toDate();
      const result = await listAgendaEvents(dispensarySlug, {
        agendaId: urlAgendaId,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      });
      if (cancelled) return;
      const data = handleAction(result);
      if (data) setEvents(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [dispensarySlug, urlAgendaId]);

  const handleAgendaChange = useCallback(
    (agendaId: string) => {
      setManualAgendaId(agendaId);
      void fetchEvents(agendaId);

      const params = new URLSearchParams(searchParams.toString());
      if (params.get('agendaId') && params.get('agendaId') !== agendaId) {
        params.delete('agendaId');
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    },
    [fetchEvents, pathname, router, searchParams],
  );

  const refreshCalendar = useCallback(() => {
    void fetchEvents();
    notifyUpcomingEventsRefresh();
  }, [fetchEvents]);

  const handleSelectEvent = async (event: AgendaEventDTO) => {
    setSelectedEvent(event);
    setSlotStart(null);
    setSlotEnd(null);
    setEventModalOpen(true);
  };

  const handleSelectSlot = (start: Date, end: Date, calendarView: View) => {
    if (!selectedAgendaId) return;
    setSelectedEvent(null);

    if (calendarView === 'month') {
      const slot = buildDefaultTimedSlotForDay(start);
      setSlotStart(slot.start);
      setSlotEnd(slot.end);
    } else {
      setSlotStart(start);
      setSlotEnd(end);
    }

    setEventModalOpen(true);
  };

  const handleCreateEvent = () => {
    if (!selectedAgendaId) return;
    setSelectedEvent(null);
    const slot = buildDefaultTimedSlotForDay(new Date());
    setSlotStart(slot.start);
    setSlotEnd(slot.end);
    setEventModalOpen(true);
  };

  if (agendas.length === 0 && !participantOnly) {
    return (
      <Container size="xl" py="xl">
        <PageHeader title="Agenda" description="Planification et listes de tâches." />
        <Stack align="center" py="xl" gap="md">
          <Text c="dimmed">Vous n&apos;avez accès à aucun agenda.</Text>
          {isAdmin && (
            <Button component={Link} href={t.admin.agendas} color="sage">
              Gérer les agendas
            </Button>
          )}
        </Stack>
      </Container>
    );
  }

  const showCalendarPanel = Boolean(selectedAgendaId) || participantOnly;
  const showTodoPanel = !participantOnly;
  const renderCalendar = showCalendarPanel && (participantOnly || layout.showCalendar);
  const renderTodo = showTodoPanel && layout.showTodo;
  const eventModalAgendaId = selectedAgendaId ?? selectedEvent?.agendaId ?? '';

  const layoutClassName = [
    classes.layout,
    !renderCalendar && renderTodo ? classes.layoutTodoOnly : '',
    renderCalendar && !renderTodo ? classes.layoutCalendarOnly : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Container
      size={isExpanded ? undefined : 'xl'}
      fluid={isExpanded}
      className={isExpanded ? classes.agendaContainerExpanded : undefined}
      py="xl"
    >
      <PageHeader
        title="Agenda"
        description={
          participantOnly
            ? 'Événements auxquels vous participez.'
            : (selectedAgenda?.description ?? 'Calendrier partagé et listes de tâches.')
        }
        actions={
          <Group gap="sm">
            <AgendaLayoutControls
              layout={layout}
              canToggleCalendar={!participantOnly}
              canToggleTodo={showTodoPanel}
              onWidthModeChange={setWidthMode}
              onToggleCalendar={toggleCalendar}
              onToggleTodo={toggleTodo}
            />
            {!participantOnly && (
              <>
                <AgendaSelector
                  agendas={agendas}
                  value={selectedAgendaId}
                  onChange={handleAgendaChange}
                />
                {canWrite && selectedAgendaId && (
                  <Button
                    color="sage"
                    leftSection={<IconPlus size={16} />}
                    onClick={handleCreateEvent}
                  >
                    Événement
                  </Button>
                )}
              </>
            )}
          </Group>
        }
      />

      <div
        className={participantOnly ? undefined : layoutClassName}
        style={layoutStyle}
      >
        {renderCalendar && (
          <AgendaCalendar
            dispensarySlug={dispensarySlug}
            agendaId={selectedAgendaId}
            events={events}
            onEventsChange={setEvents}
            canWrite={canWrite && !participantOnly}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        )}

        {renderTodo && (
          <AgendaTodoPanel
            dispensarySlug={dispensarySlug}
            agendaId={selectedAgendaId}
            accessLevel={selectedAgenda?.accessLevel ?? null}
            initialLists={
              selectedAgendaId === initialAgendas[0]?.id ? initialTodoLists : []
            }
            wideLayout={!renderCalendar}
          />
        )}
      </div>

      {eventModalAgendaId && (
        <EventModal
          opened={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          dispensarySlug={dispensarySlug}
          agendaId={eventModalAgendaId}
          event={selectedEvent}
          slotStart={slotStart}
          slotEnd={slotEnd}
          canWrite={canWrite && !participantOnly}
          onSuccess={refreshCalendar}
        />
      )}
    </Container>
  );
}
