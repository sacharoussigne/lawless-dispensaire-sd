export const itemsKeys = {
  all: (slug: string) => ['items', slug] as const,
  management: (slug: string) => [...itemsKeys.all(slug), 'management'] as const,
  craftRecipes: (slug: string, itemId: string) =>
    [...itemsKeys.all(slug), 'craftRecipes', itemId] as const,
};
