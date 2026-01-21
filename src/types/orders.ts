import type { Order } from '@prisma/client';

export interface OrderItem {
  id: string;
  itemId: string;
  quantity: number;
  item: {
    id: string;
    name: string;
  };
}

export interface OrderWithRelations extends Order {
  company: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

