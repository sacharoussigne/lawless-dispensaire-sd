import type { CategoryItem } from '@prisma/client';

export interface CategoryItemWithCount extends CategoryItem {
  _count: { items: number };
}
