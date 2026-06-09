'use client';

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { listAgendaEvents } from '@/app/_actions/agenda/events';
import { handleAction } from '@/lib/action';
import { Button, Container, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from '@/lib/dayjs';
import { buildDefaultTimedSlotForDay } from '@/lib/agenda/dates';
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
import { AgendaTodoPanel } from './components/AgendaTodoPanel';
import { EventModal } from './components/EventModal';
import { AGENDA_PANEL_HEIGHT_PX } from './constants';
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
  const [agendas] = useState(initialAgendas);
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(
    initialAgendas[0]?.id ?? null,
  );
  const [events, setEvents] = useState(initialEvents);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEventDTO | null>(null);
  const [slotStart, setSlotStart] = useState<Date | null>(null);
  const [slotEnd, setSlotEnd] = useState<Date | null>(null);

  const selectedAgenda = useMemo(
    () => agendas.find((a) => a.id === selectedAgendaId) ?? agendas[0] ?? null,
    [agendas, selectedAgendaId],
  );

  const canWrite = canWriteAgenda(selectedAgenda?.accessLevel ?? null);
  const t = tenantRoutes(dispensarySlug);

  const participantOnly = agendas.length === 0 && events.length > 0;

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

  const handleAgendaChange = useCallback(
    (agendaId: string) => {
      setSelectedAgendaId(agendaId);
      void fetchEvents(agendaId);
    },
    [fetchEvents],
  );

  const refreshCalendar = useCallback(() => {
    void fetchEvents();
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

  const showCalendar = Boolean(selectedAgendaId) || participantOnly;
  const eventModalAgendaId = selectedAgendaId ?? selectedEvent?.agendaId ?? '';

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Agenda"
        description={
          participantOnly
            ? 'Événements auxquels vous participez.'
            : (selectedAgenda?.description ?? 'Calendrier partagé et listes de tâches.')
        }
        actions={
          !participantOnly ? (
            <Group>
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
            </Group>
          ) : undefined
        }
      />

      <div
        className={participantOnly ? undefined : classes.layout}
        style={
          participantOnly
            ? undefined
            : ({ '--agenda-panel-height': `${AGENDA_PANEL_HEIGHT_PX}px` } as CSSProperties)
        }
      >
        {showCalendar && (
          <AgendaCalendar
            key={participantOnly ? 'participant' : selectedAgendaId ?? 'agenda'}
            dispensarySlug={dispensarySlug}
            agendaId={selectedAgendaId}
            events={events}
            onEventsChange={setEvents}
            canWrite={canWrite && !participantOnly}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        )}

        {!participantOnly && (
          <AgendaTodoPanel
            dispensarySlug={dispensarySlug}
            agendaId={selectedAgendaId}
            accessLevel={selectedAgenda?.accessLevel ?? null}
            initialLists={initialTodoLists}
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
