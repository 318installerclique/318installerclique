// GET /api/products : 商品一覧（売約済みも含む。SOLD 表示に使う）
import { createStripe, listAllActiveProducts } from '../../_lib/stripe.js';
import { toPublicProduct } from '../../_lib/inventory.js';
import { json, nowSec, requireEnv } from '../../_lib/http.js';

export async function onRequestGet({ env }) {
  try {
    const stripe = createStripe(requireEnv(env, 'STRIPE_SECRET_KEY'));
    const now = nowSec();
    const products = (await listAllActiveProducts(stripe))
      .map(p => toPublicProduct(p, now))
      .filter(p => p.priceJpy != null);
    return json({ products }, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (e) {
    return json({ error: 'products_unavailable' }, 503);
  }
}
