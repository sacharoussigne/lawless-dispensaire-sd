import type { CategoryItem } from '@prisma/client';

export interface CategoryItemWithItems extends CategoryItem {
  items: { id: string; name: string }[];
}

