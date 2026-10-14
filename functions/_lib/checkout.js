// 購入手続きの中心処理（Stripe クライアントと現在時刻を受け取るのでテストしやすい形）
//
// 一点物を二重に売らないための流れ:
//   1. 商品がすべて「購入可能」か確認
//   2. 商品に取り置き（reserved_until / reserved_token）を書き込む
//   3. 書き込み直後に読み直し、自分の取り置きになっているか確認（同時購入の検出）
//   4. Stripe の決済画面を作成（30分で期限切れ）
//   失敗したら取り置きを解除する
import { purchaseProblem, sanitizeIds, shippingFee } from './inventory.js';
import { SHIPPING, CHECKOUT } from '../../public/js/config.js';

export class CheckoutError extends Error {
  constructor(code, detail = {}) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

async function releaseHolds(stripe, ids, token) {
  for (const id of ids) {
    try {
      const p = await stripe.getProduct(id);
      if (p.metadata?.reserved_token === token) {
        await stripe.updateProduct(id, { metadata: { reserved_until: '', reserved_token: '' } });
      }
    } catch { /* 解除失敗は期限切れで自然に解除される */ }
  }
}

export async function startCheckout({ stripe, ids: rawIds, origin, nowSec, token }) {
  const { ids, error } = sanitizeIds(rawIds, CHECKOUT.maxItems);
  if (error) throw new CheckoutError(error);

  // 1. 購入可能か確認
  const products = [];
  const unavailable = [];
  for (const id of ids) {
    let p;
    try { p = await stripe.getProduct(id); } catch { p = null; }
    const problem = purchaseProblem(p, nowSec);
    if (problem) unavailable.push({ id, reason: problem });
    else products.push(p);
  }
  if (unavailable.length) throw new CheckoutError('unavailable', { unavailable });

  // 2. 取り置き
  const sessionExpires = nowSec + CHECKOUT.sessionMinutes * 60;
  const holdUntil = sessionExpires + CHECKOUT.holdExtraMinutes * 60;
  const held = [];
  try {
    for (const p of products) {
      await stripe.updateProduct(p.id, { metadata: { reserved_until: String(holdUntil), reserved_token: token } });
      held.push(p.id);
    }
    // 3. 読み直して自分の取り置きか確認
    for (const p of products) {
      const again = await stripe.getProduct(p.id);
      if (again.metadata?.reserved_token !== token || again.metadata?.status === 'sold') {
        throw new CheckoutError('unavailable', { unavailable: [{ id: p.id, reason: 'reserved' }] });
      }
    }

    // 4. 決済画面
    const subtotal = products.reduce((s, p) => s + p.default_price.unit_amount, 0);
    const fee = shippingFee(subtotal, SHIPPING);
    const session = await stripe.createCheckoutSession({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: products.map(p => ({ price: p.default_price.id, quantity: 1 })),
      shipping_address_collection: { allowed_countries: ['JP'] },
      phone_number_collection: { enabled: true },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: fee === 0 ? '送料無料' : SHIPPING.label,
          fixed_amount: { amount: fee, currency: 'jpy' },
        },
      }],
      locale: 'ja',
      expires_at: sessionExpires,
      success_url: `${origin}/thanks.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart.html?canceled=1`,
      metadata: { product_ids: products.map(p => p.id).join(','), reserve_token: token },
    });
    return { url: session.url, sessionId: session.id };
  } catch (e) {
    await releaseHolds(stripe, held, token);
    throw e;
  }
}
