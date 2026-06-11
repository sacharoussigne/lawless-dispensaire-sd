import type { Order } from '@prisma/client';

export interface OrderItem {
  id: string;
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

export function getOrderClientDisplayName(
  order: Pick<OrderWithRelations, 'company' | 'individualCustomer'>
): string {
  return order.individualCustomer?.name ?? order.company?.name ?? '—';
}
