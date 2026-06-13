'use client';

import { useCallback } from 'react';
import {
  createAgendaTodoCategory,
  createAgendaTodoList,
  createAgendaTodoTask,
  deleteAgendaTodoCategory,
  deleteAgendaTodoList,
  deleteAgendaTodoTask,
  listAgendaTodoLists,
  updateAgendaTodoCategory,
  updateAgendaTodoList,
  updateAgendaTodoTask,
} from '@/app/_actions/agenda/todoLists';
import { handleAction } from '@/lib/action';
import type { AgendaMutationMeta } from '@/lib/agenda/realtime/mutationMeta';
import {
  addCategoryToLists,
  addListToLists,
  insertTaskInLists,
  patchTaskInLists,
  removeCategoryFromLists,
  removeListFromLists,
  removeTaskFromLists,
  renameCategoryInLists,
  renameListInLists,
} from '@/lib/agenda/todoListState';
import type { AgendaTodoListDTO } from '@/types/agenda';
import { notifications } from '@mantine/notifications';
import type { Dispatch, SetStateAction } from 'react';

type UseAgendaTodoMutationsOptions = {
  dispensarySlug: string;
  agendaId: string | null;
  lists: AgendaTodoListDTO[];
  setLists: Dispatch<SetStateAction<AgendaTodoListDTO[]>>;
  setSelectedListId: Dispatch<SetStateAction<string | null>>;
  selectedListId: string | null;
  selectedList: AgendaTodoListDTO | null;
  mutationMeta: AgendaMutationMeta | undefined;
  archivesOpen: boolean;
  setArchiveLists: Dispatch<SetStateAction<AgendaTodoListDTO[]>>;
  setArchivesOpen: Dispatch<SetStateAction<boolean>>;
  isCategoryFilterActive: boolean;
  categoryFilterIds: Set<string>;
  setCategoryFilterIds: Dispatch<SetStateAction<Set<string>>>;
  persistCategoryFilter: (next: Set<string>) => void;
};

function showMutationError(error: unknown, fallback: string) {
  notifications.show({
    title: 'Erreur',
    message: error instanceof Error ? error.message : fallback,
    color: 'danger',
  });
}

export function useAgendaTodoMutations({
  dispensarySlug,
  agendaId,
  lists,
  setLists,
  setSelectedListId,
  selectedListId,
  selectedList,
  mutationMeta,
  archivesOpen,
  setArchiveLists,
  setArchivesOpen,
  isCategoryFilterActive,
  categoryFilterIds,
  setCategoryFilterIds,
  persistCategoryFilter,
}: UseAgendaTodoMutationsOptions) {
  const openArchives = useCallback(async () => {
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
      showMutationError(error, 'Chargement impossible');
    }
  }, [agendaId, dispensarySlug, setArchiveLists, setArchivesOpen]);

  const handleToggleTask = useCallback(
    async (id: string, completed: boolean) => {
      const snapshot = lists;
      const optimisticPatch = {
        completed,
        completedAt: completed ? new Date() : null,
      };
      setLists((prev) => patchTaskInLists(prev, id, optimisticPatch));

      try {
        const result = await updateAgendaTodoTask(
          dispensarySlug,
          { id, completed },
          mutationMeta,
        );
        const data = handleAction(result);
        if (data) {
          setLists((prev) => patchTaskInLists(prev, id, data));
        }
      } catch (error: unknown) {
        setLists(snapshot);
        showMutationError(error, 'Mise à jour impossible');
      }
    },
    [dispensarySlug, lists, mutationMeta, setLists],
  );

  const handleRenameTask = useCallback(
    async (id: string, title: string) => {
      const snapshot = lists;
      setLists((prev) => patchTaskInLists(prev, id, { title }));

      try {
        const result = await updateAgendaTodoTask(dispensarySlug, { id, title }, mutationMeta);
        const data = handleAction(result);
        if (data) {
          setLists((prev) => patchTaskInLists(prev, id, data));
        }
      } catch (error: unknown) {
        setLists(snapshot);
        showMutationError(error, 'Renommage impossible');
      }
    },
    [dispensarySlug, lists, mutationMeta, setLists],
  );

  const handleRenameList = useCallback(
    async (id: string, name: string) => {
      const snapshot = lists;
      setLists((prev) => renameListInLists(prev, id, name));

      try {
        const result = await updateAgendaTodoList(dispensarySlug, { id, name }, mutationMeta);
        handleAction(result);
      } catch (error: unknown) {
        setLists(snapshot);
        showMutationError(error, 'Renommage impossible');
      }
    },
    [dispensarySlug, lists, mutationMeta, setLists],
  );

  const handleRenameCategory = useCallback(
    async (id: string, name: string) => {
      const snapshot = lists;
      setLists((prev) => renameCategoryInLists(prev, id, name));

      try {
        const result = await updateAgendaTodoCategory(dispensarySlug, { id, name }, mutationMeta);
        handleAction(result);
      } catch (error: unknown) {
        setLists(snapshot);
        showMutationError(error, 'Renommage impossible');
      }
    },
    [dispensarySlug, lists, mutationMeta, setLists],
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      const snapshot = lists;
      setLists((prev) => removeTaskFromLists(prev, id));

      try {
        const result = await deleteAgendaTodoTask(dispensarySlug, id, mutationMeta);
        handleAction(result);
        if (archivesOpen) {
          await openArchives();
        }
      } catch (error: unknown) {
        setLists(snapshot);
        showMutationError(error, 'Suppression impossible');
      }
    },
    [archivesOpen, dispensarySlug, lists, mutationMeta, openArchives, setLists],
  );

  const handleCreateList = useCallback(
    async (name: string) => {
      if (!agendaId) return;
      try {
        const result = await createAgendaTodoList(
          dispensarySlug,
          { agendaId, name },
          mutationMeta,
        );
        const data = handleAction(result);
        if (data) {
          setLists((prev) => addListToLists(prev, data));
          setSelectedListId(data.id);
        }
      } catch (error: unknown) {
        showMutationError(error, 'Création impossible');
      }
    },
    [agendaId, dispensarySlug, mutationMeta, setLists, setSelectedListId],
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      if (!selectedList) return;
      try {
        const result = await createAgendaTodoCategory(
          dispensarySlug,
          { listId: selectedList.id, name },
          mutationMeta,
        );
        const category = handleAction(result);
        if (category) {
          const categoryDto: AgendaTodoListDTO['categories'][number] = {
            id: category.id,
            listId: category.listId,
            name: category.name,
            order: category.order,
            tasks: category.tasks,
          };
          setLists((prev) => addCategoryToLists(prev, selectedList.id, categoryDto));
          if (isCategoryFilterActive) {
            const next = new Set(categoryFilterIds);
            next.add(category.id);
            setCategoryFilterIds(next);
            persistCategoryFilter(next);
          }
        }
      } catch (error: unknown) {
        showMutationError(error, 'Création impossible');
      }
    },
    [
      categoryFilterIds,
      dispensarySlug,
      isCategoryFilterActive,
      mutationMeta,
      persistCategoryFilter,
      selectedList,
      setCategoryFilterIds,
      setLists,
    ],
  );

  const handleAddTask = useCallback(
    async (categoryId: string, title: string) => {
      try {
        const result = await createAgendaTodoTask(
          dispensarySlug,
          { categoryId, title },
          mutationMeta,
        );
        const data = handleAction(result);
        if (data) {
          setLists((prev) => insertTaskInLists(prev, categoryId, data));
        }
      } catch (error: unknown) {
        showMutationError(error, 'Ajout impossible');
      }
    },
    [dispensarySlug, mutationMeta, setLists],
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      const snapshot = lists;
      setLists((prev) => removeCategoryFromLists(prev, id));

      try {
        const result = await deleteAgendaTodoCategory(dispensarySlug, id, mutationMeta);
        handleAction(result);
      } catch (error: unknown) {
        setLists(snapshot);
        showMutationError(error, 'Suppression impossible');
      }
    },
    [dispensarySlug, lists, mutationMeta, setLists],
  );

  const handleDeleteList = useCallback(
    async (id: string) => {
      const snapshot = lists;
      const snapshotSelectedListId = selectedListId;
      setLists((prev) => {
        const next = removeListFromLists(prev, id);
        setSelectedListId((current) =>
          current === id ? (next[0]?.id ?? null) : current,
        );
        return next;
      });

      try {
        const result = await deleteAgendaTodoList(dispensarySlug, id, mutationMeta);
        handleAction(result);
      } catch (error: unknown) {
        setLists(snapshot);
        setSelectedListId(snapshotSelectedListId);
        showMutationError(error, 'Suppression impossible');
      }
    },
    [dispensarySlug, lists, mutationMeta, selectedListId, setLists, setSelectedListId],
  );

  return {
    openArchives,
    handleToggleTask,
    handleRenameTask,
    handleRenameList,
    handleRenameCategory,
    handleDeleteTask,
    handleCreateList,
    handleCreateCategory,
    handleAddTask,
    handleDeleteCategory,
    handleDeleteList,
  };
}
