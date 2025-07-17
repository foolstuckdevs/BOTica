export function getStockBadgeVariant(quantity: number) {
  if (quantity === 0) return 'destructive';
  if (quantity < 10) return 'secondary';
  return 'default';
}
