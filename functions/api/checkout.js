// POST /api/checkout : カートの商品で Stripe の決済画面を作り、その URL を返す
import { createStripe } from '../_lib/stripe.js';
import { startCheckout, CheckoutError } from '../_lib/checkout.js';
import { json, nowSec, requireEnv } from '../_lib/http.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  try {
    const stripe = createStripe(requireEnv(env, 'STRIPE_SECRET_KEY'));
    const origin = env.SITE_ORIGIN || new URL(request.url).origin;
    const result = await startCheckout({
      stripe, ids: body?.ids, origin, nowSec: nowSec(), token: crypto.randomUUID(),
    });
    return json({ url: result.url });
  } catch (e) {
    if (e instanceof CheckoutError) {
      return json({ error: e.code, ...e.detail }, e.code === 'unavailable' ? 409 : 400);
    }
    return json({ error: 'checkout_failed' }, 502);
  }
}
