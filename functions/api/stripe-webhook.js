// POST /api/stripe-webhook : Stripe からの通知（支払い完了・期限切れ）を受ける
import { createStripe } from '../_lib/stripe.js';
import { verifyStripeSignature } from '../_lib/signature.js';
import { handleStripeEvent } from '../_lib/webhook.js';
import { json, nowSec, requireEnv } from '../_lib/http.js';

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const ok = await verifyStripeSignature(
    raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET, nowSec(),
  );
  if (!ok) return json({ error: 'invalid_signature' }, 400);
  try {
    const stripe = createStripe(requireEnv(env, 'STRIPE_SECRET_KEY'));
    const result = await handleStripeEvent({ stripe, event: JSON.parse(raw), nowSec: nowSec() });
    return json({ received: true, ...result });
  } catch (e) {
    // 500 を返すと Stripe が自動で再送してくれる
    return json({ error: 'webhook_failed' }, 500);
  }
}
