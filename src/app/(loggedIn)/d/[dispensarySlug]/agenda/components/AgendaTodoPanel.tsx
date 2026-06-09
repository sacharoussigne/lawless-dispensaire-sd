'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { IconArchive, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  createAgendaTodoCategory,
  createAgendaTodoList,
  createAgendaTodoTask,
  deleteAgendaTodoCategory,
  deleteAgendaTodoTask,
  listAgendaTodoLists,
  reorderAgendaTodoCategories,
  reorderAgendaTodoTasks,
  updateAgendaTodoTask,
} from '@/app/_actions/agenda/todoLists';
import { handleAction } from '@/lib/action';
import { canWriteAgenda, type AgendaTodoListDTO } from '@/types/agenda';
import type { AgendaAccessLevel } from '@prisma/client';
import { SortableTodoCategory } from './SortableTodoCategory';
import { AgendaTodoArchivesDrawer } from './AgendaTodoArchivesDrawer';
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
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [archiveLists, setArchiveLists] = useState<AgendaTodoListDTO[]>([]);
  const [newListName, setNewListName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const canWrite = canWriteAgenda(accessLevel);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? lists[0] ?? null;

  const reload = useCallback(async () => {
    if (!agendaId) return;
    try {
      const result = await listAgendaTodoLists(dispensarySlug, agendaId);
      const data = handleAction(result);
      if (data) {
        setLists(data);
        if (!selectedListId && data[0]) {
          setSelectedListId(data[0].id);
        }
      }
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Chargement impossible',
        color: 'red',
      });
    }
  }, [agendaId, dispensarySlug, selectedListId]);

  useEffect(() => {
    setLists(initialLists);
    setSelectedListId(initialLists[0]?.id ?? null);
  }, [initialLists]);

  useEffect(() => {
    if (agendaId) {
      void reload();
    }
  }, [agendaId, reload]);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
        color: 'red',
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
        color: 'red',
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
        color: 'red',
      });
    }
  };

  const handleCreateList = async () => {
    if (!agendaId || !newListName.trim()) return;
    try {
      const result = await createAgendaTodoList(dispensarySlug, {
        agendaId,
        name: newListName.trim(),
      });
      handleAction(result);
      setNewListName('');
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Création impossible',
        color: 'red',
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!selectedList || !newCategoryName.trim()) return;
    try {
      await createAgendaTodoCategory(dispensarySlug, {
        listId: selectedList.id,
        name: newCategoryName.trim(),
      });
      setNewCategoryName('');
      await reload();
    } catch (error: unknown) {
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Création impossible',
        color: 'red',
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
        color: 'red',
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
        color: 'red',
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
          <Select
            label="Liste"
            data={lists.map((l) => ({ value: l.id, label: l.name }))}
            value={selectedList?.id ?? null}
            onChange={(v) => setSelectedListId(v)}
          />
        )}

        {lists.length === 0 && (
          <Text size="sm" c="dimmed">Aucune liste de tâches.</Text>
        )}

        {canWrite && (
          <Group>
            <TextInput
              placeholder="Nouvelle liste…"
              value={newListName}
              onChange={(e) => setNewListName(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              color="sage"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => void handleCreateList()}
            >
              Liste
            </Button>
          </Group>
        )}

        {selectedList && (
          <>
            {canWrite && (
              <Group>
                <TextInput
                  placeholder="Nouvelle catégorie…"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="sm"
                  color="sage"
                  variant="light"
                  onClick={() => void handleCreateCategory()}
                >
                  Catégorie
                </Button>
              </Group>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => void handleCategoryDragEnd(e)}
            >
              <SortableContext
                items={selectedList.categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack gap="sm">
                  {selectedList.categories.map((category) => (
                    <SortableTodoCategory
                      key={category.id}
                      category={category}
                      canWrite={canWrite}
                      onReorderTasks={handleReorderTasks}
                      onToggleTask={handleToggleTask}
                      onDeleteTask={handleDeleteTask}
                      onDeleteCategory={handleDeleteCategory}
                      onAddTask={handleAddTask}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
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
