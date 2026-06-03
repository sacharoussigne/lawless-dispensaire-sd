export function normalizeItemPrice(price: unknown): number | null {
  if (price == null) return null;
  if (typeof price === 'number') return Number.isFinite(price) ? price : null;
  const numPrice = Number(price);
  return Number.isFinite(numPrice) ? numPrice : null;
}

export type OrderPriceLine = {
  quantity: number;
  price: unknown;
};

export function calculateOrderPriceFromItems(
  lines: OrderPriceLine[]
): number | null {
  const total = lines.reduce((sum, line) => {
    const itemPrice = normalizeItemPrice(line.price);
    if (itemPrice != null && itemPrice > 0) {
      return sum + itemPrice * line.quantity;
    }
    return sum;
  }, 0);

  return total > 0 ? total : null;
}
