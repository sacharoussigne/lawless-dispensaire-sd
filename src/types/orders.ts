import type { Order } from '@prisma/client';

export interface OrderItem {
  id: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
    price: number | null;
  };
}

export interface OrderWithRelations extends Omit<Order, 'price'> {
  price: number | null;
  company: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

