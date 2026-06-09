'use client';

import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  MultiSelect,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCalendarEvent, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import {
  createAgendaEvent,
  deleteAgendaEvent,
  updateAgendaEvent,
} from '@/app/_actions/agenda/events';
import {
  createAgendaEventTodoTask,
  deleteAgendaEventTodoTask,
  updateAgendaEventTodoTask,
} from '@/app/_actions/agenda/eventTodos';
import { searchDispensaryUsersForAgenda } from '@/app/_actions/agenda/members';
import { handleAction } from '@/lib/action';
import {
  formatAgendaDateInput,
  formatAgendaTimeInput,
} from '@/lib/agenda/dates';
import type { AgendaEventDTO } from '@/types/agenda';
import dayjs from '@/lib/dayjs';

interface EventModalProps {
  opened: boolean;
  onClose: () => void;
  dispensarySlug: string;
  agendaId: string;
  event: AgendaEventDTO | null;
  slotStart?: Date | null;
  slotEnd?: Date | null;
  canWrite: boolean;
  onSuccess: () => void;
}

export function EventModal({
  opened,
  onClose,
  dispensarySlug,
  agendaId,
  event,
  slotStart,
  slotEnd,
  canWrite,
  onSuccess,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [todoTasks, setTodoTasks] = useState(event?.todoTasks ?? []);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!opened) return;

    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setAllDay(event.allDay);
      setStartDate(new Date(event.startAt));
      setEndDate(new Date(event.endAt));
      setStartTime(formatAgendaTimeInput(new Date(event.startAt)));
      setEndTime(formatAgendaTimeInput(new Date(event.endAt)));
      setParticipantIds(event.participants.map((p) => p.userId));
      setTodoTasks(event.todoTasks);
      setUserOptions(
        event.participants.map((p) => ({
          value: p.userId,
          label: p.user.name,
        })),
      );
    } else {
      const start = slotStart ?? new Date();
      const end = slotEnd ?? dayjs(start).add(1, 'hour').toDate();
      setTitle('');
      setDescription('');
      setAllDay(false);
      setStartDate(start);
      setEndDate(end);
      setStartTime(formatAgendaTimeInput(start));
      setEndTime(formatAgendaTimeInput(end));
      setParticipantIds([]);
      setUserOptions([]);
      setTodoTasks([]);
    }
    setNewTodoTitle('');
  }, [opened, event, slotStart, slotEnd]);

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) return;
    try {
      const result = await searchDispensaryUsersForAgenda(dispensarySlug, query);
      const data = handleAction(result);
      if (data) {
        setUserOptions((prev) => {
          const map = new Map(prev.map((o) => [o.value, o]));
          for (const u of data) {
            map.set(u.id, { value: u.id, label: u.name });
          }
          return Array.from(map.values());
        });
      }
    } catch {
      // ignore search errors
    }
  };

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      const payload = {
        agendaId,
        title: title.trim(),
        description: description.trim() || null,
        startDate: formatAgendaDateInput(startDate),
        startTime: allDay ? undefined : startTime,
        endDate: formatAgendaDateInput(endDate),
        endTime: allDay ? undefined : endTime,
        allDay,
        participantUserIds: participantIds,
      };

      const result = event
        ? await updateAgendaEvent(dispensarySlug, { id: event.id, ...payload })
        : await createAgendaEvent(dispensarySlug, payload);

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: event ? 'Événement mis à jour' : 'Événement créé',
        color: 'green',
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Enregistrement impossible',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setSubmitting(true);
    try {
      const result = await deleteAgendaEvent(dispensarySlug, event.id);
      handleAction(result);
      onSuccess();
      onClose();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEventTodo = async () => {
    if (!event || !newTodoTitle.trim()) return;
    try {
      const result = await createAgendaEventTodoTask(dispensarySlug, {
        eventId: event.id,
        title: newTodoTitle.trim(),
      });
      const data = handleAction(result);
      if (data) {
        setTodoTasks((prev) => [...prev, data]);
        setNewTodoTitle('');
      }
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Ajout impossible',
        color: 'red',
      });
    }
  };

  const toggleEventTodo = async (taskId: string, completed: boolean) => {
    try {
      const result = await updateAgendaEventTodoTask(dispensarySlug, {
        id: taskId,
        completed,
      });
      const data = handleAction(result);
      if (data) {
        setTodoTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
        );
      }
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Mise à jour impossible',
        color: 'red',
      });
    }
  };

  const removeEventTodo = async (taskId: string) => {
    try {
      const result = await deleteAgendaEventTodoTask(dispensarySlug, taskId);
      handleAction(result);
      setTodoTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
        color: 'red',
      });
    }
  };

  const readOnly = !canWrite;

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={event ? 'Événement' : 'Nouvel événement'}
      icon={IconCalendarEvent}
      size="lg"
      footer={
        canWrite ? (
          <AppModalFooter align="space-between">
            <div>
              {event && (
                <Button
                  variant="subtle"
                  color="danger"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleDelete}
                  loading={submitting}
                >
                  Supprimer
                </Button>
              )}
            </div>
            <Group gap="sm">
              <Button variant="subtle" color="slate" onClick={onClose}>
                Annuler
              </Button>
              <Button color="sage" loading={submitting} onClick={handleSave}>
                Enregistrer
              </Button>
            </Group>
          </AppModalFooter>
        ) : (
          <AppModalFooter>
            <Button variant="subtle" color="slate" onClick={onClose}>
              Fermer
            </Button>
          </AppModalFooter>
        )
      }
    >
      <Stack gap="md">
        <TextInput
          label="Titre"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          readOnly={readOnly}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          readOnly={readOnly}
          minRows={2}
        />
        <Checkbox
          label="Journée entière"
          checked={allDay}
          onChange={(e) => setAllDay(e.currentTarget.checked)}
          disabled={readOnly}
        />
        <Group grow align="flex-start">
          <DateInput
            label="Début"
            value={startDate}
            onChange={(value) => setStartDate(value ? new Date(value) : null)}
            readOnly={readOnly}
          />
          {!allDay && (
            <TextInput
              label="Heure début"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.currentTarget.value)}
              readOnly={readOnly}
            />
          )}
        </Group>
        <Group grow align="flex-start">
          <DateInput
            label="Fin"
            value={endDate}
            onChange={(value) => setEndDate(value ? new Date(value) : null)}
            readOnly={readOnly}
          />
          {!allDay && (
            <TextInput
              label="Heure fin"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.currentTarget.value)}
              readOnly={readOnly}
            />
          )}
        </Group>
        <MultiSelect
          label="Participants"
          data={userOptions}
          value={participantIds}
          onChange={setParticipantIds}
          searchable
          onSearchChange={searchUsers}
          readOnly={readOnly}
          nothingFoundMessage="Tapez pour rechercher…"
        />

        {event && (
          <Stack gap="xs">
            <Text fw={500} size="sm">Tâches de préparation</Text>
            {todoTasks.map((task) => (
              <Group key={task.id} wrap="nowrap" align="flex-start">
                <Checkbox
                  checked={task.completed}
                  onChange={(e) =>
                    void toggleEventTodo(task.id, e.currentTarget.checked)
                  }
                  disabled={readOnly}
                  mt={2}
                />
                <Text
                  size="sm"
                  style={{
                    flex: 1,
                    textDecoration: task.completed ? 'line-through' : undefined,
                  }}
                >
                  {task.title}
                </Text>
                {canWrite && (
                  <ActionIcon
                    variant="subtle"
                    color="danger"
                    size="sm"
                    onClick={() => void removeEventTodo(task.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                )}
              </Group>
            ))}
            {canWrite && (
              <Group>
                <TextInput
                  placeholder="Nouvelle tâche…"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="xs"
                  color="sage"
                  variant="light"
                  onClick={() => void handleAddEventTodo()}
                >
                  Ajouter
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Stack>
    </AppModal>
  );
}
