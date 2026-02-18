import type { Chest } from '@prisma/client';

export interface ChestWithStockHistory extends Chest {
  stockHistory: { id: string }[];
}
