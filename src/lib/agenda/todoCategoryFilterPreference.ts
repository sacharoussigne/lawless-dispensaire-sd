export type TodoCategoryFilterStore = Record<string, string[]>;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getTodoCategoryFilterStorageKey(dispensarySlug: string, agendaId: string) {
  return `agenda-todo-category-filter:${dispensarySlug}:${agendaId}`;
}

function readTodoCategoryFilterStore(
  dispensarySlug: string,
  agendaId: string,
): TodoCategoryFilterStore {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(
      getTodoCategoryFilterStorageKey(dispensarySlug, agendaId),
    );
    if (!raw) return {};

    const parsed = JSON.parse(raw) as TodoCategoryFilterStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeTodoCategoryFilterStore(
  dispensarySlug: string,
  agendaId: string,
  store: TodoCategoryFilterStore,
) {
  if (!canUseStorage()) return;

  const key = getTodoCategoryFilterStorageKey(dispensarySlug, agendaId);
  if (Object.keys(store).length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(store));
}

export function resolveCategoryFilterIds(
  storedIds: string[] | undefined,
  validCategoryIds: string[],
): Set<string> {
  if (!storedIds || storedIds.length === 0 || validCategoryIds.length === 0) {
    return new Set();
  }

  const valid = new Set(validCategoryIds);
  const filtered = storedIds.filter((id) => valid.has(id));

  if (filtered.length === 0 || filtered.length === validCategoryIds.length) {
    return new Set();
  }

  return new Set(filtered);
}

export function readTodoCategoryFilterForList(
  dispensarySlug: string,
  agendaId: string,
  listId: string,
  validCategoryIds: string[],
): Set<string> {
  const store = readTodoCategoryFilterStore(dispensarySlug, agendaId);
  return resolveCategoryFilterIds(store[listId], validCategoryIds);
}

export function writeTodoCategoryFilterForList(
  dispensarySlug: string,
  agendaId: string,
  listId: string,
  categoryFilterIds: Set<string>,
) {
  const store = readTodoCategoryFilterStore(dispensarySlug, agendaId);

  if (categoryFilterIds.size === 0) {
    delete store[listId];
  } else {
    store[listId] = [...categoryFilterIds];
  }

  writeTodoCategoryFilterStore(dispensarySlug, agendaId, store);
}
