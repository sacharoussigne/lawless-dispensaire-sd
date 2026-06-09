'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button, Container, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from '@/lib/dayjs';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import {
  canWriteAgenda,
  type AgendaEventDTO,
  type AgendaSummaryDTO,
  type AgendaTodoListDTO,
} from '@/types/agenda';
import { tenantRoutes } from '@/types/routes';
import { AgendaSelector } from './components/AgendaSelector';
import { AgendaCalendar } from './components/AgendaCalendar';
import { AgendaTodoPanel } from './components/AgendaTodoPanel';
import { EventModal } from './components/EventModal';
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
  const [calendarKey, setCalendarKey] = useState(0);
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

  const refreshCalendar = useCallback(() => {
    setCalendarKey((k) => k + 1);
  }, []);

  const handleSelectEvent = async (event: AgendaEventDTO) => {
    setSelectedEvent(event);
    setSlotStart(null);
    setSlotEnd(null);
    setEventModalOpen(true);
  };

  const handleSelectSlot = (start: Date, end: Date) => {
    if (!selectedAgendaId) return;
    setSelectedEvent(null);
    setSlotStart(start);
    setSlotEnd(end);
    setEventModalOpen(true);
  };

  const handleCreateEvent = () => {
    if (!selectedAgendaId) return;
    setSelectedEvent(null);
    setSlotStart(new Date());
    setSlotEnd(dayjs().add(1, 'hour').toDate());
    setEventModalOpen(true);
  };

  const participantOnly = agendas.length === 0 && initialEvents.length > 0;

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
                onChange={setSelectedAgendaId}
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

      <div className={participantOnly ? undefined : classes.layout}>
        {showCalendar && (
          <AgendaCalendar
            key={
              participantOnly
                ? `participant-${calendarKey}`
                : `${selectedAgendaId}-${calendarKey}`
            }
            dispensarySlug={dispensarySlug}
            agendaId={selectedAgendaId}
            initialEvents={initialEvents}
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
