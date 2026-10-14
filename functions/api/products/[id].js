// GET /api/products/:id : 商品1点の詳細
import { createStripe } from '../../_lib/stripe.js';
import { toPublicProduct } from '../../_lib/inventory.js';
import { json, nowSec, requireEnv } from '../../_lib/http.js';

export async function onRequestGet({ env, params }) {
  if (!/^prod_[A-Za-z0-9]+$/.test(params.id || '')) return json({ error: 'not_found' }, 404);
  try {
    const stripe = createStripe(requireEnv(env, 'STRIPE_SECRET_KEY'));
    const p = await stripe.getProduct(params.id);
    if (!p.active) return json({ error: 'not_found' }, 404);
    return json({ product: toPublicProduct(p, nowSec()) }, 200, { 'Cache-Control': 'public, max-age=15' });
  } catch (e) {
    return json({ error: e.status === 404 ? 'not_found' : 'product_unavailable' }, e.status === 404 ? 404 : 503);
  }
}
