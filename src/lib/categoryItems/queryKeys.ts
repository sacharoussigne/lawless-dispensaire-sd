export const categoryItemsKeys = {
  all: (slug: string) => ['categoryItems', slug] as const,
  management: (slug: string) => [...categoryItemsKeys.all(slug), 'management'] as const,
};
