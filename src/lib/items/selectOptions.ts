import { sortCategoryItems } from '@/lib/categoryItems/sortCategoryItems';

export function toCategorySelectOptions<T extends { id: string; name: string; order: number }>(
  items: T[],
) {
  return sortCategoryItems(items).map((category) => ({
    value: category.id,
    label: category.name,
  }));
}

export function toCompanyGroupSelectOptions<T extends { id: string; name: string }>(
  groups: T[],
) {
  return [...groups]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((group) => ({
      value: group.id,
      label: group.name,
    }));
}
