import type {
  AgendaTodoCategoryDTO,
  AgendaTodoListDTO,
  AgendaTodoTaskDTO,
} from '@/types/agenda';
import {
  compareTodoTasksByCompletedAtDesc,
  isTodoTaskArchived,
} from '@/lib/agenda/todoArchive';

function reorderTasksForMainView(tasks: AgendaTodoTaskDTO[]): AgendaTodoTaskDTO[] {
  const nowMs = Date.now();
  const active = tasks.filter((task) => !task.completed);
  const recentlyCompleted = tasks
    .filter((task) => task.completed && !isTodoTaskArchived(task, nowMs))
    .sort(compareTodoTasksByCompletedAtDesc);
  return [...active, ...recentlyCompleted];
}

export function patchTaskInLists(
  lists: AgendaTodoListDTO[],
  taskId: string,
  patch: Partial<AgendaTodoTaskDTO>,
): AgendaTodoListDTO[] {
  return lists.map((list) => ({
    ...list,
    categories: list.categories.map((category) => {
      const hasTask = category.tasks.some((task) => task.id === taskId);
      if (!hasTask) return category;

      const tasks = category.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      );

      return {
        ...category,
        tasks:
          patch.completed !== undefined || patch.completedAt !== undefined
            ? reorderTasksForMainView(tasks)
            : tasks,
      };
    }),
  }));
}

export function insertTaskInLists(
  lists: AgendaTodoListDTO[],
  categoryId: string,
  task: AgendaTodoTaskDTO,
): AgendaTodoListDTO[] {
  return lists.map((list) => ({
    ...list,
    categories: list.categories.map((category) =>
      category.id === categoryId
        ? { ...category, tasks: [...category.tasks, task] }
        : category,
    ),
  }));
}

export function removeTaskFromLists(
  lists: AgendaTodoListDTO[],
  taskId: string,
): AgendaTodoListDTO[] {
  return lists.map((list) => ({
    ...list,
    categories: list.categories.map((category) => ({
      ...category,
      tasks: category.tasks.filter((task) => task.id !== taskId),
    })),
  }));
}

export function renameListInLists(
  lists: AgendaTodoListDTO[],
  listId: string,
  name: string,
): AgendaTodoListDTO[] {
  return lists.map((list) => (list.id === listId ? { ...list, name } : list));
}

export function renameCategoryInLists(
  lists: AgendaTodoListDTO[],
  categoryId: string,
  name: string,
): AgendaTodoListDTO[] {
  return lists.map((list) => ({
    ...list,
    categories: list.categories.map((category) =>
      category.id === categoryId ? { ...category, name } : category,
    ),
  }));
}

export function addListToLists(
  lists: AgendaTodoListDTO[],
  list: AgendaTodoListDTO,
): AgendaTodoListDTO[] {
  return [...lists, list];
}

export function addCategoryToLists(
  lists: AgendaTodoListDTO[],
  listId: string,
  category: AgendaTodoCategoryDTO,
): AgendaTodoListDTO[] {
  return lists.map((list) =>
    list.id === listId
      ? { ...list, categories: [...list.categories, category] }
      : list,
  );
}

export function removeCategoryFromLists(
  lists: AgendaTodoListDTO[],
  categoryId: string,
): AgendaTodoListDTO[] {
  return lists.map((list) => ({
    ...list,
    categories: list.categories.filter((category) => category.id !== categoryId),
  }));
}

export function removeListFromLists(
  lists: AgendaTodoListDTO[],
  listId: string,
): AgendaTodoListDTO[] {
  return lists.filter((list) => list.id !== listId);
}
