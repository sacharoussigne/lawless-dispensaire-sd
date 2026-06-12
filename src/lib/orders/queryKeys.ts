export type OrdersPageFilters = {
  page: number;
  pageSize: number;
  status: string | null;
  search: string;
};

export const ordersKeys = {
  all: (slug: string) => ['orders', slug] as const,
  page: (slug: string, filters: OrdersPageFilters) =>
    [...ordersKeys.all(slug), 'page', filters] as const,
  detail: (slug: string, orderId: string) =>
    [...ordersKeys.all(slug), 'detail', orderId] as const,
  activeByGroup: (slug: string, companyGroupId: string) =>
    [...ordersKeys.all(slug), 'activeByGroup', companyGroupId] as const,
  letterAssignments: (slug: string) =>
    [...ordersKeys.all(slug), 'letterAssignments'] as const,
  formItems: (slug: string, companyGroupId: string | null) =>
    [...ordersKeys.all(slug), 'formItems', companyGroupId] as const,
};
