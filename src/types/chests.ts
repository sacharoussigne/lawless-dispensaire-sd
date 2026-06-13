import type { Chest } from '@prisma/client';

export type ChestListItem = Pick<Chest, 'id' | 'name' | 'order'>;

export interface ChestWithStockHistory extends Chest {
  stockHistoryCount: number;
}
