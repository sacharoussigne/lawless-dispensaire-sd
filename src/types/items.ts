import type { Item, CategoryItem, CompanyGroup, CraftRecipe, CraftRecipeItem } from '@prisma/client';

export interface ItemWithRelations extends Omit<Item, 'price'> {
  price: number | null;
  category: { id: string; name: string; color: string; order?: number } | null;
  companyGroup: { id: string; name: string } | null;
}

export interface CraftRecipeItemWithItem extends CraftRecipeItem {
  usedItem: { id: string; name: string };
}

export interface CraftRecipeWithIngredients extends CraftRecipe {
  ingredients: CraftRecipeItemWithItem[];
}

export type { CategoryItem };
export type CompanyGroupSelect = Pick<CompanyGroup, 'id' | 'name'>;

