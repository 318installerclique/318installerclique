// 一点物の在庫状態の判定と、Stripe の商品データ → サイト用データへの変換
// Stripe の商品メタデータ（管理画面で入力する key/value）を在庫管理に使う:
//   status         : 'sold' で売約済み（Webhook が自動で設定）
//   reserved_until : 決済中の取り置き期限（UNIX秒）
//   reserved_token : 取り置きした決済の識別子
//   category / size / era / condition / measurements : 商品情報（代表が入力）

export const STATUS = { AVAILABLE: 'available', RESERVED: 'reserved', SOLD: 'sold' };

export function statusOf(meta = {}, nowSec) {
  if (meta.status === 'sold') return STATUS.SOLD;
  const until = Number(meta.reserved_until || 0);
  if (until > nowSec) return STATUS.RESERVED;
  return STATUS.AVAILABLE;
}

// Stripe Product（default_price を展開済み）→ サイトで使う形
export function toPublicProduct(p, nowSec) {
  const meta = p.metadata || {};
  const price = p.default_price && typeof p.default_price === 'object' ? p.default_price : null;
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    images: Array.isArray(p.images) ? p.images : [],
    priceJpy: price && price.currency === 'jpy' ? price.unit_amount : null,
    category: meta.category || '',
    size: meta.size || '',
    era: meta.era || '',
    condition: meta.condition || '',
    measurements: meta.measurements || '',
    createdAt: p.created || 0,
    // 決済中の商品はお客さんには「SOLD」ではなく購入不可として見せる
    status: statusOf(meta, nowSec),
  };
}

// 購入可能かのチェック。問題があれば理由を返す
export function purchaseProblem(p, nowSec) {
  if (!p || p.deleted) return 'not_found';
  if (!p.active) return 'inactive';
  const price = p.default_price;
  if (!price || typeof price !== 'object' || price.currency !== 'jpy' || !Number.isInteger(price.unit_amount)) {
    return 'no_price';
  }
  const s = statusOf(p.metadata, nowSec);
  if (s !== STATUS.AVAILABLE) return s;
  return null;
}

export function shippingFee(subtotal, shipping) {
  if (shipping.freeOverJpy != null && subtotal >= shipping.freeOverJpy) return 0;
  return shipping.feeJpy;
}

// カートから送られてきた商品IDの検証（重複除去・形式・点数）
export function sanitizeIds(ids, max) {
  if (!Array.isArray(ids)) return { error: 'invalid_ids' };
  const uniq = [...new Set(ids.filter(id => typeof id === 'string' && /^prod_[A-Za-z0-9]+$/.test(id)))];
  if (uniq.length === 0) return { error: 'empty' };
  if (uniq.length > max) return { error: 'too_many' };
  return { ids: uniq };
}
