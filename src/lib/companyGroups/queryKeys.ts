export const companyGroupsKeys = {
  all: (slug: string) => ['companyGroups', slug] as const,
  management: (slug: string) => [...companyGroupsKeys.all(slug), 'management'] as const,
  select: (slug: string) => [...companyGroupsKeys.all(slug), 'select'] as const,
  forOrders: (slug: string) => [...companyGroupsKeys.all(slug), 'forOrders'] as const,
};
