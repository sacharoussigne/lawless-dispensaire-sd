'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IconArchive, IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  createAgendaTodoCategory,
  createAgendaTodoList,
  createAgendaTodoTask,
  deleteAgendaTodoCategory,
  deleteAgendaTodoList,
  deleteAgendaTodoTask,
  listAgendaTodoLists,
  moveAgendaTodoTask,
  reorderAgendaTodoCategories,
  updateAgendaTodoCategory,
  updateAgendaTodoList,
  updateAgendaTodoTask,
} from '@/app/_actions/agenda/todoLists';
import { handleAction } from '@/lib/action';
import {
  readTodoCategoryFilterForList,
  writeTodoCategoryFilterForList,
} from '@/lib/agenda/todoCategoryFilterPreference';
import { canWriteAgenda, type AgendaTodoListDTO, type AgendaTodoTaskDTO } from '@/types/agenda';
import type { AgendaAccessLevel } from '@prisma/client';
import { SortableTodoCategory } from './SortableTodoCategory';
import { AgendaTodoArchivesDrawer } from './AgendaTodoArchivesDrawer';
import { InlineNoteInput } from './InlineNoteInput';
import { InlineEditableText } from './InlineEditableText';
import { EditableTodoListTab } from './EditableTodoListTab';
import { DeleteTodoListButton } from './DeleteTodoListButton';
import { usePressHoldPointerSensor } from './agendaDnd';

type TodoCategories = AgendaTodoListDTO['categories'];

function findTaskLocation(categories: TodoCategories, taskId: string) {
  for (const category of categories) {
    const index = category.tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) {
      return { categoryId: category.id, index, task: category.tasks[index] };
    }
  }
  return null;
}

function insertTaskAtVisibleIndex(
  categories: TodoCategories,
  draggingTaskId: string,
  targetCategoryId: string,
  visibleInsertIndex: number,
): TodoCategories {
  let task: AgendaTodoTaskDTO | undefined;

  const withoutTask = categories.map((category) => ({
    ...category,
    tasks: category.tasks.filter((item) => {
      if (item.id === draggingTaskId) {
        task = item;
        return false;
      }
      return true;
    }),
  }));

  if (!task) return categories;

  return withoutTask.map((category) => {
    if (category.id !== targetCategoryId) return category;
    const tasks = [...category.tasks];
    tasks.splice(visibleInsertIndex, 0, { ...task!, categoryId: targetCategoryId });
    return { ...category, tasks };
  });
}

function categoriesTaskKey(categories: TodoCategories) {
  return categories.map((c) => `${c.id}:${c.tasks.map((t) => t.id).join(',')}`).join('|');
}

function applyTaskOverPlacement(
  categories: TodoCategories,
  draggingTaskId: string,
  startCategoryId: string,
  overType: string | undefined,
  overCategoryId: string,
  overTaskId: string | number | undefined,
): TodoCategories | null {
  if (overType !== 'task' && overType !== 'category-drop') return null;

  const current = findTaskLocation(categories, draggingTaskId);
  if (!current) return null;

  if (current.categoryId === startCategoryId && overCategoryId === startCategoryId) {
    return null;
  }

  const targetCategory = categories.find((category) => category.id === overCategoryId);
  if (!targetCategory) return null;

  const visibleTasks = targetCategory.tasks.filter((task) => task.id !== draggingTaskId);
  const visibleInsertIndex =
    overType === 'category-drop'
      ? visibleTasks.length
      : visibleTasks.findIndex((task) => task.id === overTaskId);

  if (overType === 'task' && visibleInsertIndex < 0) return null;

  const nextCategories = insertTaskAtVisibleIndex(
    categories,
    draggingTaskId,
    overCategoryId,
    visibleInsertIndex,
  );

  if (categoriesTaskKey(categories) === categoriesTaskKey(nextCategories)) {
    return null;
  }

  return nextCategories;
}

function reorderTaskInCategory(
  categories: TodoCategories,
  categoryId: string,
  fromIndex: number,
  toIndex: number,
): TodoCategories {
  return categories.map((category) => {
    if (category.id !== categoryId) return category;
    return { ...category, tasks: arrayMove(category.tasks, fromIndex, toIndex) };
  });
}
import classes from '../agenda.module.scss';

interface AgendaTodoPanelProps {
  dispensarySlug: string;
  agendaId: string | null;
  accessLevel: AgendaAccessLevel | null;
  initialLists: AgendaTodoListDTO[];
  wideLayout?: boolean;
}

function getCategoriesGridClass(wideLayout: boolean, categoryCount: number) {
  if (!wideLayout) return undefined;

  return [
    classes.todoCategoriesGrid,
    categoryCount <= 1 ? classes.todoCategoriesGridSingle : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function AgendaTodoPanel({
  dispensarySlug,
  agendaId,
  accessLevel,
  initialLists,
  wideLayout = false,
}: AgendaTodoPanelProps) {
  const [lists, setLists] = useState<AgendaTodoListDTO[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists[0]?.id ?? null,
  );
  const [syncedAgendaId, setSyncedAgendaId] = useState(agendaId);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [archiveLists, setArchiveLists] = useState<AgendaTodoListDTO[]>([]);
  const [categoryFilterIds, setCategoryFilterIds] = useState<Set<string>>(new Set());
  const [taskSearch, setTaskSearch] = useState('');
  const [lastFilterListId, setLastFilterListId] = useState(selectedListId);
  const canWrite = canWriteAgenda(accessLevel);

  if (agendaId !== syncedAgendaId) {
    setSyncedAgendaId(agendaId);
    if (!agendaId) {
      setLists([]);
      setSelectedListId(null);
    }
  }

  const selectedList = lists.find((l) => l.id === selectedListId) ?? lists[0] ?? null;

  if (selectedListId !== lastFilterListId) {
    setLastFilterListId(selectedListId);
    setTaskSearch('');
  }

  const allCategoryIds = useMemo(
    () => selectedList?.categories.map((category) => category.id) ?? [],
    [selectedList],
  );
  const allCategoryIdsKey = allCategoryIds.join(',');

  const persistCategoryFilter = useCallback(
    (next: Set<string>) => {
      if (!agendaId || !selectedListId) return;
      writeTodoCategoryFilterForList(dispensarySlug, agendaId, selectedListId, next);
    },
    [agendaId, dispensarySlug, selectedListId],
  );

  useEffect(() => {
    if (!agendaId || !selectedListId || !selectedList) {
      setCategoryFilterIds(new Set());
      return;
    }

    setCategoryFilterIds(
      readTodoCategoryFilterForList(
        dispensarySlug,
        agendaId,
        selectedListId,
        allCategoryIds,
      ),
    );
  }, [agendaId, allCategoryIds, allCategoryIdsKey, dispensarySlug, selectedListId]);

  const isCategoryFilterActive =
    categoryFilterIds.size > 0 && categoryFilterIds.size < allCategoryIds.length;

  const isTaskSearchActive = taskSearch.trim().length > 0;
  const isFiltering = isCategoryFilterActive || isTaskSearchActive;
  const categoryDragEnabled = canWrite && !wideLayout;

  const visibleCategories = useMemo(() => {
    if (!selectedList) return [];

    let categories = selectedList.categories;
    if (isCategoryFilterActive) {
      categories = categories.filter((category) => categoryFilterIds.has(category.id));
    }

    const query = taskSearch.trim().toLowerCase();
    if (!query) return categories;

    return categories
      .map((category) => ({
        ...category,
        tasks: category.tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(query) ||
            (task.description?.toLowerCase().includes(query) ?? false),
        ),
      }))
      .filter((category) => category.tasks.length > 0);
  }, [selectedList, categoryFilterIds, taskSearch, isCategoryFilterActive]);

  const toggleCategoryFilter = (categoryId: string) => {
    if (!selectedList) return;

    setCategoryFilterIds((prev) => {
      const base =
        prev.size === 0 ? new Set(allCategoryIds) : new Set(prev);
      if (base.has(categoryId)) {
        base.delete(categoryId);
      } else {
        base.add(categoryId);
      }
      const next =
        base.size === 0 || base.size === allCategoryIds.length ? new Set<string>() : base;
      persistCategoryFilter(next);
      return next;
    });
  };

  const showAllCategories = () => {
    const next = new Set<string>();
    setCategoryFilterIds(next);
    persistCategoryFilter(next);
  };

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

  const [activeDrag, setActiveDrag] = useState<
    | { type: 'task'; task: AgendaTodoTaskDTO }
    | { type: 'category'; name: string }
    | null
  >(null);

  const taskDragCrossedRef = useRef(false);
  const taskDragStartRef = useRef<{ categoryId: string; index: number } | null>(null);
  const taskDragSnapshotRef = useRef<TodoCategories | null>(null);
  const dragCategoriesRef = useRef<TodoCategories | null>(null);
  const lastDragOverKeyRef = useRef<string | null>(null);
  const todoPanelRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef(activeDrag);
  activeDragRef.current = activeDrag;

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const panel = todoPanelRef.current;
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      const { clientX, clientY } = event;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return;
      }

      const maxScroll = panel.scrollHeight - panel.clientHeight;

      if (maxScroll <= 0) {
        window.scrollBy({ top: event.deltaY, left: event.deltaX });
        event.preventDefault();
        return;
      }

      if (!activeDragRef.current) return;

      const nextScroll = Math.min(
        maxScroll,
        Math.max(0, panel.scrollTop + event.deltaY),
      );
      if (nextScroll === panel.scrollTop) return;

      panel.scrollTop = nextScroll;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    if (!selectedList) return;

    const dragType = event.active.data.current?.type as string | undefined;
    if (dragType === 'task') {
      for (const category of selectedList.categories) {
        const taskIndex = category.tasks.findIndex((item) => item.id === event.active.id);
        if (taskIndex >= 0) {
          taskDragCrossedRef.current = false;
          lastDragOverKeyRef.current = null;
          taskDragStartRef.current = { categoryId: category.id, index: taskIndex };
          taskDragSnapshotRef.current = selectedList.categories.map((item) => ({
            ...item,
            tasks: [...item.tasks],
          }));
          dragCategoriesRef.current = taskDragSnapshotRef.current;
          setActiveDrag({ type: 'task', task: category.tasks[taskIndex] });
          return;
        }
      }
      return;
    }

    if (dragType === 'category') {
      const category = selectedList.categories.find((item) => item.id === event.active.id);
      if (category) {
        setActiveDrag({ type: 'category', name: category.name });
      }
    }
  };

  const clearActiveDrag = () => {
    setActiveDrag(null);
  };

  const applyCategoryUpdates = (
    listId: string,
    categories: AgendaTodoListDTO['categories'],
  ) => {
    setLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, categories } : list)),
    );
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!selectedListId || !canWrite) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.data.current?.type !== 'task') return;

    const taskId = String(active.id);
    const startCategoryId = taskDragStartRef.current?.categoryId;
    if (!startCategoryId) return;

    const overType = over.data.current?.type as string | undefined;
    const overCategoryId = over.data.current?.categoryId as string | undefined;
    if (!overCategoryId) return;
    if (overType !== 'task' && overType !== 'category-drop') return;

    const previewCategories = dragCategoriesRef.current ?? taskDragSnapshotRef.current;
    if (!previewCategories) return;

    const nextCategories = applyTaskOverPlacement(
      previewCategories,
      taskId,
      startCategoryId,
      overType,
      overCategoryId,
      overType === 'task' ? over.id : undefined,
    );

    if (!nextCategories) return;

    const nextKey = categoriesTaskKey(nextCategories);
    if (lastDragOverKeyRef.current === nextKey) return;

    lastDragOverKeyRef.current = nextKey;

    const clonedCategories = nextCategories.map((category) => ({
      ...category,
      tasks: [...category.tasks],
    }));

    taskDragCrossedRef.current = true;
    dragCategoriesRef.current = clonedCategories;

    setLists((prev) =>
      prev.map((item) =>
        item.id === selectedListId ? { ...item, categories: clonedCategories } : item,
      ),
    );
  };

  const resetTaskDragState = () => {
    taskDragCrossedRef.current = false;
    taskDragStartRef.current = null;
    taskDragSnapshotRef.current = null;
    dragCategoriesRef.current = null;
    lastDragOverKeyRef.current = null;
  };

  const persistTaskDragChanges = async (
    nextCategories: TodoCategories,
    taskId: string,
    startCategoryId: string,
  ) => {
    const currentLocation = findTaskLocation(nextCategories, taskId);
    if (!currentLocation) {
      throw new Error('Tâche introuvable');
    }

    const sourceFinal = nextCategories.find((category) => category.id === startCategoryId);
    const targetFinal = nextCategories.find(
      (category) => category.id === currentLocation.categoryId,
    );
    if (!sourceFinal || !targetFinal) {
      throw new Error('Catégorie introuvable');
    }

    handleAction(
      await moveAgendaTodoTask(dispensarySlug, {
        taskId,
        sourceCategoryId: startCategoryId,
        targetCategoryId: currentLocation.categoryId,
        sourceOrders: sourceFinal.tasks.map((task, order) => ({ id: task.id, order })),
        targetOrders: targetFinal.tasks.map((task, order) => ({ id: task.id, order })),
      }),
    );
  };

  const resolveTaskDropCategories = (
    event: DragEndEvent,
    dragStart: { categoryId: string; index: number },
    crossedDuringDrag: boolean,
    previewCategories: TodoCategories | null,
    baseCategories: TodoCategories,
  ): TodoCategories | null => {
    const { active, over } = event;
    const taskId = String(active.id);
    const startCategoryId = dragStart.categoryId;

    if (crossedDuringDrag && previewCategories) {
      return previewCategories;
    }

    if (!over || active.id === over.id) {
      return null;
    }

    const overType = over.data.current?.type as string | undefined;
    const overCategoryId = over.data.current?.categoryId as string | undefined;
    if (!overCategoryId) return null;

    if (startCategoryId === overCategoryId) {
      const targetIndex = baseCategories
        .find((category) => category.id === overCategoryId)
        ?.tasks.findIndex((task) => task.id === over.id);
      if (targetIndex === undefined || targetIndex < 0) return null;
      if (dragStart.index === targetIndex) return null;

      return reorderTaskInCategory(
        baseCategories,
        startCategoryId,
        dragStart.index,
        targetIndex,
      );
    }

    return applyTaskOverPlacement(
      baseCategories,
      taskId,
      startCategoryId,
      overType,
      overCategoryId,
      overType === 'task' ? over.id : undefined,
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const crossedDuringDrag = taskDragCrossedRef.current;
    const dragStart = taskDragStartRef.current;
    const dragSnapshot = taskDragSnapshotRef.current;
    const previewCategories = dragCategoriesRef.current;
    clearActiveDrag();

    if (!selectedList || !canWrite) {
      resetTaskDragState();
      return;
    }

    const { active, over } = event;
    const activeType = active.data.current?.type as string | undefined;

    const restoreTaskDragSnapshot = () => {
      if (crossedDuringDrag && dragSnapshot) {
        applyCategoryUpdates(selectedList.id, dragSnapshot);
      }
    };

    try {
      if (activeType === 'category') {
        if (!over || active.id === over.id) return;
        const overType = over.data.current?.type as string | undefined;
        if (overType !== 'category') return;

        const oldIndex = selectedList.categories.findIndex((c) => c.id === active.id);
        const newIndex = selectedList.categories.findIndex((c) => c.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        const reordered = arrayMove(selectedList.categories, oldIndex, newIndex);
        applyCategoryUpdates(selectedList.id, reordered);

        handleAction(
          await reorderAgendaTodoCategories(dispensarySlug, {
            items: reordered.map((category, index) => ({ id: category.id, order: index })),
          }),
        );
        return;
      }

      if (activeType !== 'task' || !dragStart) {
        restoreTaskDragSnapshot();
        return;
      }

      const taskId = String(active.id);
      const nextCategories = resolveTaskDropCategories(
        event,
        dragStart,
        crossedDuringDrag,
        previewCategories,
        selectedList.categories,
      );

      if (!nextCategories) {
        restoreTaskDragSnapshot();
        return;
      }

      if (dragSnapshot && categoriesTaskKey(dragSnapshot) === categoriesTaskKey(nextCategories)) {
        return;
      }

      applyCategoryUpdates(selectedList.id, nextCategories);

      await persistTaskDragChanges(nextCategories, taskId, dragStart.categoryId);
    } catch (error: unknown) {
      restoreTaskDragSnapshot();
      void reload();
      notifications.show({
        title: 'Erreur',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible d’enregistrer le déplacement',
        color: 'danger',
      });
    } finally {
      resetTaskDragState();
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
    <div ref={todoPanelRef} className={classes.todoPanel}>
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

        {selectedList && selectedList.categories.length > 0 && (
          <Stack gap="xs">
            <TextInput
              placeholder="Rechercher une tâche…"
              value={taskSearch}
              onChange={(event) => setTaskSearch(event.currentTarget.value)}
              leftSection={<IconSearch size={16} stroke={1.5} />}
              rightSection={
                taskSearch ? (
                  <UnstyledButton
                    aria-label="Effacer la recherche"
                    onClick={() => setTaskSearch('')}
                    className={classes.todoSearchClear}
                  >
                    <IconX size={14} stroke={1.5} />
                  </UnstyledButton>
                ) : null
              }
              size="sm"
            />

            {selectedList.categories.length > 1 && (
              <div className={classes.todoCategoryFilters} role="group" aria-label="Filtrer par catégorie">
                <UnstyledButton
                  type="button"
                  className={`${classes.todoCategoryFilterChip} ${
                    !isCategoryFilterActive ? classes.todoCategoryFilterChipActive : ''
                  }`}
                  onClick={showAllCategories}
                >
                  Toutes
                </UnstyledButton>
                {selectedList.categories.map((category) => {
                  const isActive =
                    !isCategoryFilterActive || categoryFilterIds.has(category.id);
                  return (
                    <UnstyledButton
                      key={category.id}
                      type="button"
                      className={`${classes.todoCategoryFilterChip} ${
                        isActive ? classes.todoCategoryFilterChipActive : ''
                      }`}
                      onClick={() => toggleCategoryFilter(category.id)}
                    >
                      {category.name}
                    </UnstyledButton>
                  );
                })}
              </div>
            )}
          </Stack>
        )}

        {selectedList && (
          <>
            {isFiltering ? (
              <SortableContext
                items={visibleCategories.map((category) => category.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack gap={0} className={getCategoriesGridClass(wideLayout, visibleCategories.length)}>
                  {visibleCategories.map((category) => (
                    <SortableTodoCategory
                      key={category.id}
                      category={category}
                      canWrite={canWrite}
                      dragEnabled={false}
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
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragCancel={() => {
                  if (taskDragCrossedRef.current && taskDragSnapshotRef.current && selectedList) {
                    applyCategoryUpdates(selectedList.id, taskDragSnapshotRef.current);
                  }
                  resetTaskDragState();
                  clearActiveDrag();
                }}
                onDragEnd={(e) => void handleDragEnd(e)}
              >
                <SortableContext
                  items={selectedList.categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack
                    gap={0}
                    className={getCategoriesGridClass(wideLayout, selectedList.categories.length)}
                  >
                    {selectedList.categories.map((category) => (
                      <SortableTodoCategory
                        key={category.id}
                        category={category}
                        canWrite={canWrite}
                        dragEnabled
                        categoryDragEnabled={categoryDragEnabled}
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
                <DragOverlay dropAnimation={null}>
                  {activeDrag?.type === 'task' ? (
                    <div className={classes.todoTaskDragOverlay}>
                      <Checkbox checked={activeDrag.task.completed} readOnly size="sm" />
                      <Text
                        size="sm"
                        lineClamp={1}
                        className={
                          activeDrag.task.completed ? classes.todoTaskCompleted : undefined
                        }
                      >
                        {activeDrag.task.title}
                      </Text>
                    </div>
                  ) : activeDrag?.type === 'category' ? (
                    <div className={classes.todoCategoryDragOverlay}>
                      <Text size="sm" fw={500} className="disp-display-title">
                        {activeDrag.name}
                      </Text>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {isFiltering && visibleCategories.length === 0 && (
              <Text size="sm" c="dimmed" py="sm">
                Aucune tâche ne correspond à votre recherche.
              </Text>
            )}

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
