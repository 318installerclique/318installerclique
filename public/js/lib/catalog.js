// 一覧・カート計算などの画面ロジック（DOMに依存しない。tests/catalog.test.js でテスト）
import { CATEGORIES } from '../config.js';

export const PER_PAGE = 24;

export function formatYen(n) {
  return '¥' + Number(n).toLocaleString('ja-JP');
}

export function categoryLabel(id) {
  return CATEGORIES.find(c => c.id === id)?.label || '';
}

// 並び順: 購入可能 → 決済中 → SOLD。同じ状態の中では指定順
const STATUS_ORDER = { available: 0, reserved: 1, sold: 2 };
const SORTS = {
  new: (a, b) => b.createdAt - a.createdAt,
  price_asc: (a, b) => a.priceJpy - b.priceJpy,
  price_desc: (a, b) => b.priceJpy - a.priceJpy,
};

export function listProducts(products, { category = '', sort = 'new', hideSold = false } = {}) {
  const cmp = SORTS[sort] || SORTS.new;
  return products
    .filter(p => !category || p.category === category)
    .filter(p => !hideSold || p.status !== 'sold')
    .slice()
    .sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || cmp(a, b));
}

export function paginate(items, page, perPage = PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), totalPages);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: current, totalPages };
}

export function cartSummary(cartIds, products, shipping) {
  const byId = new Map(products.map(p => [p.id, p]));
  const lines = cartIds.map(id => byId.get(id)).filter(Boolean);
  const buyable = lines.filter(p => p.status === 'available');
  const unavailable = lines.filter(p => p.status !== 'available');
  const missing = cartIds.filter(id => !byId.has(id));
  const subtotal = buyable.reduce((s, p) => s + p.priceJpy, 0);
  const fee = buyable.length === 0 ? 0
    : (shipping.freeOverJpy != null && subtotal >= shipping.freeOverJpy ? 0 : shipping.feeJpy);
  return { buyable, unavailable, missing, subtotal, shippingFee: fee, total: subtotal + fee };
}
