export const companiesKeys = {
  all: (slug: string) => ['companies', slug] as const,
  management: (slug: string) => [...companiesKeys.all(slug), 'management'] as const,
  select: (slug: string) => [...companiesKeys.all(slug), 'select'] as const,
};
