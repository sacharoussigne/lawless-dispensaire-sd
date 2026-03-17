export const normalizeQuantity = (quantity: number | null | undefined): number => {
  if (quantity == null) return 0;
  return quantity;
};

