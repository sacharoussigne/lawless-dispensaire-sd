export type OrderWeightLine = {
  quantity: number;
  weight?: number | null;
};

export function calculateOrderWeightFromItems(
  lines: OrderWeightLine[]
): number | null {
  const hasAnyWeight = lines.some(
    (line) => line.weight != null && line.weight > 0
  );
  if (!hasAnyWeight) return null;

  const total = lines.reduce((sum, line) => {
    if (line.weight != null && line.weight > 0) {
      return sum + line.weight * line.quantity;
    }
    return sum;
  }, 0);

  return total > 0 ? total : null;
}
