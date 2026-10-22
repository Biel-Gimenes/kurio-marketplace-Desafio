import Decimal from "decimal.js";
import type { CartItem, NFT, Order } from "./contracts";
export const itemKey = (i: CartItem) => `${i.nftId}:${i.edition}`;
export function mergeCart(a: CartItem[], b: CartItem[], nfts: NFT[]) {
  const map = new Map<string, CartItem>();
  const adjustments: string[] = [];
  for (const item of [...a, ...b]) {
    const key = itemKey(item);
    const next = (map.get(key)?.quantity ?? 0) + item.quantity;
    const nft = nfts.find((n) => n.id === item.nftId);
    const limit = nft?.stock[item.edition] ?? 0;
    const quantity = Math.min(next, limit);
    if (quantity < next)
      adjustments.push(
        `${nft?.name ?? item.nftId}: quantidade ajustada para ${quantity}.`,
      );
    if (quantity) map.set(key, { ...item, quantity });
  }
  return { items: [...map.values()], adjustments };
}
export function totals(
  items: { price: string; quantity: number }[],
  coupon: string,
) {
  const subtotal = items.reduce(
    (sum, i) => sum.plus(new Decimal(i.price).times(i.quantity)),
    new Decimal(0),
  );
  const discount =
    coupon === "KURIO10" ? subtotal.times("0.1") : new Decimal(0);
  const fee = subtotal.isZero() ? new Decimal(0) : new Decimal("0.016");
  return {
    subtotal: subtotal.toFixed(),
    discount: discount.toFixed(),
    fee: fee.toFixed(),
    total: subtotal.minus(discount).plus(fee).toFixed(),
  };
}
export function acceptVersion(last: number, e: { version: number }) {
  return e.version > last;
}
export function transition(order: Order, status: Order["status"]): Order {
  return order.status === "pending"
    ? { ...order, status, version: order.version + 1 }
    : order;
}
/** Canonical JSON makes idempotency independent of object property order. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}
