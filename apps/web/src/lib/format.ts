// 12000 tetri -> "120 ₾", 12050 -> "120.50 ₾"
export function formatPrice(tetri: number): string {
  const lari = tetri / 100;
  const amount = Number.isInteger(lari) ? String(lari) : lari.toFixed(2);
  return `${amount} ₾`;
}
