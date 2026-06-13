export function sortCategoryItems<T extends { order: number; name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });
}
