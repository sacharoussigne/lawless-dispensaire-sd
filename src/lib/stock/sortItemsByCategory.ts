import type { CategoryWithItems, ItemWithRelations } from '@/types/stock';

function compareByOrderThenName(
  orderA: number | undefined,
  orderB: number | undefined,
  nameA: string,
  nameB: string,
): number {
  if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
    return orderA - orderB;
  }
  if (orderA !== undefined && orderB === undefined) return -1;
  if (orderA === undefined && orderB !== undefined) return 1;
  return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
}

type SortableItem = {
  name: string;
  order: number;
  category: { order?: number } | null;
};

export function sortItems<T extends SortableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const categoryOrderA = a.category?.order ?? 0;
    const categoryOrderB = b.category?.order ?? 0;
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB;
    }
    return compareByOrderThenName(a.order, b.order, a.name, b.name);
  });
}

export function groupItemsByCategory(items: ItemWithRelations[]): CategoryWithItems[] {
  const byCategory = items.reduce((acc, item) => {
    if (!item.category) return acc;

    const categoryId = item.category.id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        category: item.category,
        items: [],
      };
    }
    acc[categoryId].items.push(item);
    return acc;
  }, {} as Record<string, CategoryWithItems>);

  return Object.values(byCategory)
    .sort((a, b) => {
      if (a.category.order !== undefined && b.category.order !== undefined) {
        return a.category.order - b.category.order;
      }
      if (a.category.order !== undefined) return -1;
      if (b.category.order !== undefined) return 1;
      return a.category.name.localeCompare(b.category.name, 'fr', { sensitivity: 'base' });
    })
    .map((cat) => ({
      ...cat,
      items: [...cat.items].sort((a, b) => compareByOrderThenName(a.order, b.order, a.name, b.name)),
    }));
}
