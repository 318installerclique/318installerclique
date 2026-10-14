import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleStripeEvent } from '../functions/_lib/webhook.js';
import { verifyStripeSignature, hmacSha256Hex } from '../functions/_lib/signature.js';
import { encodeForm } from '../functions/_lib/stripe.js';
import { createFakeStripe, product } from './fake-stripe.js';

const NOW = 1_800_000_000;
const session = (over = {}) => ({
  id: 'cs_1', payment_status: 'paid',
  metadata: { product_ids: 'prod_A,prod_B', reserve_token: 'tok1' }, ...over,
});

test('支払い完了で商品を SOLD にし、取り置きを消す', async () => {
  const stripe = createFakeStripe([
    product('prod_A', 1, { reserved_until: String(NOW + 60), reserved_token: 'tok1' }),
    product('prod_B', 1, { reserved_until: String(NOW + 60), reserved_token: 'tok1' }),
  ]);
  const r = await handleStripeEvent({ stripe, nowSec: NOW, event: { type: 'checkout.session.completed', data: { object: session() } } });
  assert.deepEqual(r.updated, ['prod_A', 'prod_B']);
  for (const id of ['prod_A', 'prod_B']) {
    const m = stripe.db.get(id).metadata;
    assert.equal(m.status, 'sold');
    assert.equal(m.sold_session, 'cs_1');
    assert.equal(m.reserved_token, undefined);
  }
});

test('同じ通知が2回来ても問題ない（Stripe は再送することがある）', async () => {
  const stripe = createFakeStripe([product('prod_A', 1), product('prod_B', 1)]);
  const ev = { type: 'checkout.session.completed', data: { object: session() } };
  await handleStripeEvent({ stripe, nowSec: NOW, event: ev });
  const r = await handleStripeEvent({ stripe, nowSec: NOW, event: ev });
  assert.deepEqual(r.conflicts, []);
  assert.equal(stripe.db.get('prod_A').metadata.status, 'sold');
});

test('万一の二重販売は記録して上書きしない', async () => {
  const stripe = createFakeStripe([product('prod_A', 1, { status: 'sold', sold_session: 'cs_other' }), product('prod_B', 1)]);
  const r = await handleStripeEvent({ stripe, nowSec: NOW, event: { type: 'checkout.session.completed', data: { object: session() } } });
  assert.deepEqual(r.conflicts, ['prod_A']);
  assert.equal(stripe.db.get('prod_A').metadata.sold_session, 'cs_other');
  assert.equal(stripe.db.get('prod_A').metadata.conflict_session, 'cs_1');
});

test('未払いの完了通知では SOLD にしない', async () => {
  const stripe = createFakeStripe([product('prod_A', 1), product('prod_B', 1)]);
  await handleStripeEvent({ stripe, nowSec: NOW, event: { type: 'checkout.session.completed', data: { object: session({ payment_status: 'unpaid' }) } } });
  assert.equal(stripe.db.get('prod_A').metadata.status, undefined);
});

test('期限切れで自分の取り置きだけ解除', async () => {
  const stripe = createFakeStripe([
    product('prod_A', 1, { reserved_until: String(NOW + 60), reserved_token: 'tok1' }),
    product('prod_B', 1, { reserved_until: String(NOW + 60), reserved_token: 'other' }),
  ]);
  await handleStripeEvent({ stripe, nowSec: NOW, event: { type: 'checkout.session.expired', data: { object: session() } } });
  assert.equal(stripe.db.get('prod_A').metadata.reserved_token, undefined);
  assert.equal(stripe.db.get('prod_B').metadata.reserved_token, 'other');
});

test('Webhook 署名: 正しい署名だけ通す', async () => {
  const secret = 'whsec_test';
  const body = '{"id":"evt_1"}';
  const sig = await hmacSha256Hex(secret, `${NOW}.${body}`);
  assert.equal(await verifyStripeSignature(body, `t=${NOW},v1=${sig}`, secret, NOW), true);
  assert.equal(await verifyStripeSignature(body + ' ', `t=${NOW},v1=${sig}`, secret, NOW), false, '改ざん');
  assert.equal(await verifyStripeSignature(body, `t=${NOW},v1=${sig}`, 'whsec_wrong', NOW), false, '別の鍵');
  assert.equal(await verifyStripeSignature(body, `t=${NOW},v1=${sig}`, secret, NOW + 301), false, '古すぎる');
  assert.equal(await verifyStripeSignature(body, null, secret, NOW), false);
  assert.equal(await verifyStripeSignature(body, `t=${NOW},v1=${sig}`, '', NOW), false, '鍵未設定');
});

test('Stripe 送信形式への変換', () => {
  assert.equal(
    encodeForm({ mode: 'payment', line_items: [{ price: 'p_1', quantity: 1 }], metadata: { a: 'x y' }, skip: undefined }),
    'mode=payment&line_items%5B0%5D%5Bprice%5D=p_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Ba%5D=x%20y',
  );
  assert.equal(encodeForm({ expand: ['default_price'] }), 'expand%5B0%5D=default_price');
});
