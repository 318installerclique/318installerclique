import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startCheckout, CheckoutError } from '../functions/_lib/checkout.js';
import { createFakeStripe, product } from './fake-stripe.js';
import { SHIPPING, CHECKOUT } from '../public/js/config.js';

const NOW = 1_800_000_000;
const base = { origin: 'https://shop.example', nowSec: NOW };

test('購入可能な商品で決済画面を作り、取り置きする', async () => {
  const stripe = createFakeStripe([product('prod_A', 19000), product('prod_B', 12000)]);
  const r = await startCheckout({ ...base, stripe, ids: ['prod_A', 'prod_B'], token: 'tok1' });
  assert.match(r.url, /^https:\/\/checkout\.stripe\.com\//);

  const s = stripe.sessions[0];
  assert.deepEqual(s.line_items, [{ price: 'price_prod_A', quantity: 1 }, { price: 'price_prod_B', quantity: 1 }]);
  assert.equal(s.metadata.product_ids, 'prod_A,prod_B');
  assert.equal(s.expires_at, NOW + CHECKOUT.sessionMinutes * 60);
  assert.equal(s.shipping_options[0].shipping_rate_data.fixed_amount.amount, SHIPPING.feeJpy);
  assert.equal(s.success_url, 'https://shop.example/thanks.html?session_id={CHECKOUT_SESSION_ID}');

  for (const id of ['prod_A', 'prod_B']) {
    assert.equal(stripe.db.get(id).metadata.reserved_token, 'tok1');
    assert.ok(Number(stripe.db.get(id).metadata.reserved_until) > s.expires_at, '取り置きは決済期限より長い');
  }
});

test('売約済み・取り置き中が含まれると全体を断り、何も取り置かない', async () => {
  const stripe = createFakeStripe([
    product('prod_A', 19000),
    product('prod_B', 12000, { status: 'sold' }),
    product('prod_C', 9000, { reserved_until: String(NOW + 100), reserved_token: 'other' }),
  ]);
  await assert.rejects(
    startCheckout({ ...base, stripe, ids: ['prod_A', 'prod_B', 'prod_C'], token: 'tok1' }),
    (e) => e instanceof CheckoutError && e.code === 'unavailable'
      && e.detail.unavailable.map(u => u.reason).join() === 'sold,reserved',
  );
  assert.equal(stripe.db.get('prod_A').metadata.reserved_token, undefined);
  assert.equal(stripe.sessions.length, 0);
});

test('期限切れの取り置きは購入可能', async () => {
  const stripe = createFakeStripe([product('prod_A', 19000, { reserved_until: String(NOW - 1), reserved_token: 'old' })]);
  await startCheckout({ ...base, stripe, ids: ['prod_A'], token: 'tok1' });
  assert.equal(stripe.db.get('prod_A').metadata.reserved_token, 'tok1');
});

test('同時購入: 取り置き直後に他人に上書きされたら断り、自分の取り置きは解除', async () => {
  const stripe = createFakeStripe([product('prod_A', 19000), product('prod_B', 12000)]);
  const origUpdate = stripe.updateProduct.bind(stripe);
  stripe.updateProduct = async (id, params) => {
    const r = await origUpdate(id, params);
    // prod_B に自分が書いた直後、別の人の取り置きで上書きされる状況を再現
    if (id === 'prod_B' && params.metadata.reserved_token === 'tok1') {
      stripe.db.get('prod_B').metadata.reserved_token = 'someone_else';
    }
    return r;
  };
  await assert.rejects(startCheckout({ ...base, stripe, ids: ['prod_A', 'prod_B'], token: 'tok1' }),
    (e) => e.code === 'unavailable');
  assert.equal(stripe.db.get('prod_A').metadata.reserved_token, undefined, '自分の取り置きは解除');
  assert.equal(stripe.db.get('prod_B').metadata.reserved_token, 'someone_else', '他人の取り置きは消さない');
  assert.equal(stripe.sessions.length, 0);
});

test('Stripe の決済画面作成に失敗したら取り置きを解除', async () => {
  const stripe = createFakeStripe([product('prod_A', 19000)]);
  stripe.failSession = true;
  await assert.rejects(startCheckout({ ...base, stripe, ids: ['prod_A'], token: 'tok1' }));
  assert.equal(stripe.db.get('prod_A').metadata.reserved_until, undefined);
});

test('存在しない商品・不正なIDは断る', async () => {
  const stripe = createFakeStripe([]);
  await assert.rejects(startCheckout({ ...base, stripe, ids: ['prod_X'], token: 't' }), (e) => e.code === 'unavailable');
  await assert.rejects(startCheckout({ ...base, stripe, ids: [], token: 't' }), (e) => e.code === 'empty');
});

test('送料無料ラインを超えたら送料0円', async (t) => {
  const stripe = createFakeStripe([product('prod_A', 50000)]);
  const original = SHIPPING.freeOverJpy;
  SHIPPING.freeOverJpy = 30000;
  t.after(() => { SHIPPING.freeOverJpy = original; });
  await startCheckout({ ...base, stripe, ids: ['prod_A'], token: 't' });
  const rate = stripe.sessions[0].shipping_options[0].shipping_rate_data;
  assert.equal(rate.fixed_amount.amount, 0);
  assert.equal(rate.display_name, '送料無料');
});
