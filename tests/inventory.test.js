import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusOf, toPublicProduct, purchaseProblem, shippingFee, sanitizeIds } from '../functions/_lib/inventory.js';
import { product } from './fake-stripe.js';

const NOW = 1_800_000_000;

test('在庫状態: 通常・取り置き中・期限切れ・売約済み', () => {
  assert.equal(statusOf({}, NOW), 'available');
  assert.equal(statusOf({ reserved_until: String(NOW + 60) }, NOW), 'reserved');
  assert.equal(statusOf({ reserved_until: String(NOW - 1) }, NOW), 'available');
  assert.equal(statusOf({ status: 'sold', reserved_until: String(NOW + 60) }, NOW), 'sold');
});

test('Stripe商品 → サイト用データ', () => {
  const p = product('prod_A', 19000, { category: 'outer', size: 'M', era: '1970s' });
  const pub = toPublicProduct(p, NOW);
  assert.equal(pub.priceJpy, 19000);
  assert.equal(pub.category, 'outer');
  assert.equal(pub.status, 'available');
  assert.equal('reserved_token' in pub, false, '内部情報を外に出さない');
});

test('円以外・価格なしは価格を出さない', () => {
  assert.equal(toPublicProduct(product('prod_A', 100, {}, { default_price: { currency: 'usd', unit_amount: 100 } }), NOW).priceJpy, null);
  assert.equal(toPublicProduct(product('prod_A', 100, {}, { default_price: null }), NOW).priceJpy, null);
});

test('購入できない理由の判定', () => {
  assert.equal(purchaseProblem(null, NOW), 'not_found');
  assert.equal(purchaseProblem(product('prod_A', 1, {}, { active: false }), NOW), 'inactive');
  assert.equal(purchaseProblem(product('prod_A', 1, {}, { default_price: 'price_x' }), NOW), 'no_price');
  assert.equal(purchaseProblem(product('prod_A', 1, { status: 'sold' }), NOW), 'sold');
  assert.equal(purchaseProblem(product('prod_A', 1, { reserved_until: String(NOW + 5) }), NOW), 'reserved');
  assert.equal(purchaseProblem(product('prod_A', 1), NOW), null);
});

test('送料', () => {
  assert.equal(shippingFee(5000, { feeJpy: 1000, freeOverJpy: null }), 1000);
  assert.equal(shippingFee(30000, { feeJpy: 1000, freeOverJpy: 30000 }), 0);
  assert.equal(shippingFee(29999, { feeJpy: 1000, freeOverJpy: 30000 }), 1000);
});

test('カートの商品ID検証', () => {
  assert.deepEqual(sanitizeIds(['prod_A', 'prod_A', 'prod_B'], 10), { ids: ['prod_A', 'prod_B'] });
  assert.deepEqual(sanitizeIds(['../x', 1, 'prod_A'], 10), { ids: ['prod_A'] });
  assert.equal(sanitizeIds([], 10).error, 'empty');
  assert.equal(sanitizeIds('prod_A', 10).error, 'invalid_ids');
  assert.equal(sanitizeIds(['prod_A', 'prod_B', 'prod_C'], 2).error, 'too_many');
});
