export const TODO_TASK_ARCHIVE_AFTER_MS = 60 * 60 * 1000;

export type TodoTaskArchiveFields = {
  completed: boolean;
  completedAt: Date | string | null;
};

export function getTaskCompletedAtMs(task: TodoTaskArchiveFields): number | null {
  if (!task.completed || !task.completedAt) return null;
  return new Date(task.completedAt).getTime();
}

export function isTodoTaskArchived(
  task: TodoTaskArchiveFields,
  nowMs: number = Date.now(),
): boolean {
  if (!task.completed) return false;

  const completedAtMs = getTaskCompletedAtMs(task);
  if (completedAtMs === null) return true;

  return nowMs - completedAtMs >= TODO_TASK_ARCHIVE_AFTER_MS;
}

export function compareTodoTasksByCompletedAtDesc(
  a: TodoTaskArchiveFields,
  b: TodoTaskArchiveFields,
): number {
  const aTime = getTaskCompletedAtMs(a) ?? 0;
  const bTime = getTaskCompletedAtMs(b) ?? 0;
  return bTime - aTime;
}
