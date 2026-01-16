export interface ItemWithRelations {
  id: string;
  name: string;
  description: string | null;
  idealQuantity: number;
  isCraftable: boolean;
  categoryId: string;
  companyGroupId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; color: string; order?: number } | null;
  companyGroup: { id: string; name: string } | null;
  stockToday: number | null;
  stockYesterday: number | null;
}

export interface CategoryWithItems {
  category: { id: string; name: string; color: string; order?: number };
  items: ItemWithRelations[];
}

