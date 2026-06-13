import type { ChestWithStockHistory } from '@/types/chests';

export function sortChests(chests: ChestWithStockHistory[]): ChestWithStockHistory[] {
  return [...chests].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
