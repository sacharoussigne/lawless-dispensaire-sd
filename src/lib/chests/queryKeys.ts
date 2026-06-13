export const chestsKeys = {
  all: (slug: string) => ['chests', slug] as const,
  management: (slug: string) => [...chestsKeys.all(slug), 'management'] as const,
  stockCheckForm: (slug: string, chestId: string) =>
    [...chestsKeys.all(slug), 'stock-check-form', chestId] as const,
};
