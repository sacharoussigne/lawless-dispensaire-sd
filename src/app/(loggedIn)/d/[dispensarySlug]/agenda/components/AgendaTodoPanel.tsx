'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IconArchive } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  createAgendaTodoCategory,
  createAgendaTodoList,
  createAgendaTodoTask,
  deleteAgendaTodoCategory,
  deleteAgendaTodoList,
  deleteAgendaTodoTask,
  listAgendaTodoLists,
  reorderAgendaTodoCategories,
  reorderAgendaTodoTasks,
  updateAgendaTodoCategory,
  updateAgendaTodoList,
  updateAgendaTodoTask,
} from '@/app/_actions/agenda/todoLists';
import { handleAction } from '@/lib/action';
import { canWriteAgenda, type AgendaTodoListDTO } from '@/types/agenda';
import type { AgendaAccessLevel } from '@prisma/client';
import { SortableTodoCategory } from './SortableTodoCategory';
import { AgendaTodoArchivesDrawer } from './AgendaTodoArchivesDrawer';
import { InlineNoteInput } from './InlineNoteInput';
import { InlineEditableText } from './InlineEditableText';
import { EditableTodoListTab } from './EditableTodoListTab';
import { DeleteTodoListButton } from './DeleteTodoListButton';
import { usePressHoldPointerSensor } from './agendaDnd';
import classes from '../agenda.module.scss';

interface AgendaTodoPanelProps {
  dispensarySlug: string;
  agendaId: string | null;
  accessLevel: AgendaAccessLevel | null;
  initialLists: AgendaTodoListDTO[];
}

export function AgendaTodoPanel({
  dispensarySlug,
  agendaId,
  accessLevel,
  initialLists,
}: AgendaTodoPanelProps) {
  const [lists, setLists] = useState<AgendaTodoListDTO[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists[0]?.id ?? null,
  );
  const [syncedAgendaId, setSyncedAgendaId] = useState(agendaId);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [archiveLists, setArchiveLists] = useState<AgendaTodoListDTO[]>([]);
  const canWrite = canWriteAgenda(accessLevel);

  if (agendaId !== syncedAgendaId) {
    setSyncedAgendaId(agendaId);
    if (!agendaId) {
      setLists([]);
      setSelectedListId(null);
    }
  }

  const selectedList = lists.find((l) => l.id === selectedListId) ?? lists[0] ?? null;

  const applyLists = useCallback((data: AgendaTodoListDTO[]) => {
    setLists(data);
    setSelectedListId((current) =>
      current && data.some((list) => list.id === current)
        ? current
        : (data[0]?.id ?? null),
    );
  }, []);

  const fetchTodoLists = useCallback(async () => {
    if (!agendaId) return null;
    const result = await listAgendaTodoLists(dispensarySlug, agendaId);
    return handleAction(result) ?? null;
  }, [agendaId, dispensarySlug]);

  const reload = useCallback(async () => {
    if (!agendaId) return;
    try {
      const data = await fetchTodoLists();
      if (data) applyLists(data);
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Chargement impossible',
        color: 'danger',
      });
    }
  }, [agendaId, applyLists, fetchTodoLists]);

  useEffect(() => {
    if (!agendaId) return;

    let cancelled = false;

    void fetchTodoLists()
      .then((data) => {
        if (cancelled || !data) return;
        applyLists(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        notifications.show({
          title: 'Erreur',
          message: error instanceof Error ? error.message : 'Chargement impossible',
          color: 'danger',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [agendaId, applyLists, fetchTodoLists]);

  const sensors = useSensors(
    usePressHoldPointerSensor(),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    if (!selectedList || !canWrite) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedList.categories.findIndex((c) => c.id === active.id);
    const newIndex = selectedList.categories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(selectedList.categories, oldIndex, newIndex);
    setLists((prev) =>
      prev.map((l) =>
        l.id === selectedList.id ? { ...l, categories: reordered } : l,
      ),
    );

    try {
      await reorderAgendaTodoCategories(dispensarySlug, {
        items: reordered.map((c, index) => ({ id: c.id, order: index })),
      });
    } catch {
      void reload();
    }
  };

  const handleReorderTasks = async (categoryId: string, taskIds: string[]) => {
    if (!selectedList || !canWrite) return;
    const category = selectedList.categories.find((c) => c.id === categoryId);
    if (!category) return;

    const taskMap = new Map(category.tasks.map((t) => [t.id, t]));
    const reordered = taskIds
      .map((id) => taskMap.get(id))
      .filter((t): t is NonNullable<typeof t> => !!t);

    setLists((prev) =>
      prev.map((l) =>
        l.id === selectedList.id
          ? {
              ...l,
              categories: l.categories.map((c) =>
                c.id === categoryId ? { ...c, tasks: reordered } : c,
              ),
            }
          : l,
      ),
    );

    try {
      await reorderAgendaTodoTasks(dispensarySlug, {
        items: reordered.map((t, index) => ({ id: t.id, order: index })),
      });
    } catch {
      void reload();
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      await updateAgendaTodoTask(dispensarySlug, { id, completed });
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Mise à jour impossible',
        color: 'danger',
      });
    }
  };

  const handleRenameTask = async (id: string, title: string) => {
    try {
      await updateAgendaTodoTask(dispensarySlug, { id, title });
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Renommage impossible',
        color: 'danger',
      });
    }
  };

  const handleRenameList = async (id: string, name: string) => {
    try {
      await updateAgendaTodoList(dispensarySlug, { id, name });
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Renommage impossible',
        color: 'danger',
      });
    }
  };

  const handleRenameCategory = async (id: string, name: string) => {
    try {
      await updateAgendaTodoCategory(dispensarySlug, { id, name });
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Renommage impossible',
        color: 'danger',
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteAgendaTodoTask(dispensarySlug, id);
      await reload();
      if (archivesOpen) {
        await openArchives();
      }
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
        color: 'danger',
      });
    }
  };

  const openArchives = async () => {
    if (!agendaId) return;
    try {
      const result = await listAgendaTodoLists(dispensarySlug, agendaId, {
        archives: true,
      });
      const data = handleAction(result);
      if (data) {
        setArchiveLists(data);
        setArchivesOpen(true);
      }
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Chargement impossible',
        color: 'danger',
      });
    }
  };

  const handleCreateList = async (name: string) => {
    if (!agendaId) return;
    try {
      const result = await createAgendaTodoList(dispensarySlug, {
        agendaId,
        name,
      });
      const data = handleAction(result);
      if (data) {
        setSelectedListId(data.id);
      }
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Création impossible',
        color: 'danger',
      });
    }
  };

  const handleCreateCategory = async (name: string) => {
    if (!selectedList) return;
    try {
      await createAgendaTodoCategory(dispensarySlug, {
        listId: selectedList.id,
        name,
      });
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Création impossible',
        color: 'danger',
      });
    }
  };

  const handleAddTask = async (categoryId: string, title: string) => {
    try {
      await createAgendaTodoTask(dispensarySlug, { categoryId, title });
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Ajout impossible',
        color: 'danger',
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteAgendaTodoCategory(dispensarySlug, id);
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
        color: 'danger',
      });
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteAgendaTodoList(dispensarySlug, id);
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Suppression impossible',
        color: 'danger',
      });
    }
  };

  if (!agendaId) {
    return (
      <div className={classes.todoPanel}>
        <Text c="dimmed" size="sm">Sélectionnez un agenda pour voir les tâches.</Text>
      </div>
    );
  }

  return (
    <div className={classes.todoPanel}>
      <Group justify="space-between" mb="md" align="flex-start">
        <Title order={4} className="disp-display-title">To-Do</Title>
        <Button
          variant="subtle"
          color="slate"
          size="xs"
          leftSection={<IconArchive size={14} />}
          onClick={() => void openArchives()}
        >
          Archives
        </Button>
      </Group>

      <Stack gap="md">
        {lists.length > 1 && (
          <Group gap="xs" align="center" wrap="nowrap" className={classes.todoListTabsRow}>
            <div className={classes.todoListTabs} role="tablist">
              {lists.map((list) => (
                <EditableTodoListTab
                  key={list.id}
                  listId={list.id}
                  name={list.name}
                  active={selectedList?.id === list.id}
                  canWrite={canWrite}
                  onSelect={setSelectedListId}
                  onRename={handleRenameList}
                />
              ))}
            </div>
            {canWrite && selectedList && (
              <DeleteTodoListButton
                listName={selectedList.name}
                onConfirm={() => void handleDeleteList(selectedList.id)}
              />
            )}
          </Group>
        )}

        {lists.length === 1 && selectedList && (
          <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
            <InlineEditableText
              value={selectedList.name}
              canEdit={canWrite}
              onSave={(name) => handleRenameList(selectedList.id, name)}
              textClassName={`disp-display-title ${classes.todoListTitle}`}
              inputClassName={classes.todoListEditInput}
            />
            {canWrite && (
              <DeleteTodoListButton
                listName={selectedList.name}
                onConfirm={() => void handleDeleteList(selectedList.id)}
              />
            )}
          </Group>
        )}

        {lists.length === 0 && canWrite && (
          <InlineNoteInput
            placeholder="Nommer une nouvelle liste…"
            onSubmit={handleCreateList}
          />
        )}

        {lists.length === 0 && !canWrite && (
          <Text size="sm" c="dimmed">Aucune liste de tâches.</Text>
        )}

        {selectedList && (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => void handleCategoryDragEnd(e)}
            >
              <SortableContext
                items={selectedList.categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack gap={0}>
                  {selectedList.categories.map((category) => (
                    <SortableTodoCategory
                      key={category.id}
                      category={category}
                      canWrite={canWrite}
                      onReorderTasks={handleReorderTasks}
                      onToggleTask={handleToggleTask}
                      onRenameTask={handleRenameTask}
                      onDeleteTask={handleDeleteTask}
                      onDeleteCategory={handleDeleteCategory}
                      onRenameCategory={handleRenameCategory}
                      onAddTask={handleAddTask}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            {canWrite && (
              <InlineNoteInput
                placeholder="Nouvelle catégorie…"
                onSubmit={handleCreateCategory}
              />
            )}

            {canWrite && lists.length > 0 && (
              <InlineNoteInput
                placeholder="Ajouter une autre liste…"
                onSubmit={handleCreateList}
              />
            )}
          </>
        )}
      </Stack>

      <AgendaTodoArchivesDrawer
        opened={archivesOpen}
        onClose={() => setArchivesOpen(false)}
        lists={archiveLists}
        canWrite={canWrite}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}
