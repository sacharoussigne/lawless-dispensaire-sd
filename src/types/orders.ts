import type { Order } from '@prisma/client';

export interface OrderItem {
  id?: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    price: number | null;
    weight?: number | null;
  };
}

export interface OrderWithRelations extends Omit<Order, 'price'> {
  price: number | null;
  company: {
    id: string;
    name: string;
  } | null;
  individualCustomer: {
    id: string;
    name: string;
  } | null;
  items: OrderItem[];
}

export interface OrderSummary extends Omit<OrderWithRelations, 'items'> {
  itemCount: number;
}

export interface OrdersPageResult {
  orders: OrderSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ActiveOrderSummary {
  id: string;
  name: string;
  status: string;
  companyGroupId?: string | null;
  company: {
    id: string;
    name: string;
  } | null;
  individualCustomer?: {
    id: string;
    name: string;
  } | null;
  items: Array<{
    itemId: string;
    quantity: number;
    item: {
      id: string;
      name: string;
    };
  }>;
}

export function getOrderClientDisplayName(
  order: Pick<OrderWithRelations, 'company' | 'individualCustomer'>
): string {
  return order.individualCustomer?.name ?? order.company?.name ?? '—';
}
