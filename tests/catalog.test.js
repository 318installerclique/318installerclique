import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listProducts, paginate, cartSummary, formatYen, categoryLabel } from '../public/js/lib/catalog.js';
import { readCart, writeCart, addToCart, removeFromCart } from '../public/js/lib/cart.js';
import { CATEGORIES } from '../public/js/config.js';

const p = (id, over) => ({ id, name: id, priceJpy: 1000, category: 'tops', status: 'available', createdAt: 0, ...over });

test('並び順: 購入可能が先、SOLD は最後', () => {
  const list = listProducts([
    p('a', { status: 'sold', createdAt: 9 }), p('b', { createdAt: 1 }), p('c', { createdAt: 5 }), p('d', { status: 'reserved', createdAt: 8 }),
  ]);
  assert.deepEqual(list.map(x => x.id), ['c', 'b', 'd', 'a']);
});

test('価格順・カテゴリ・売り切れを隠す', () => {
  const items = [p('a', { priceJpy: 3000 }), p('b', { priceJpy: 1000, category: 'outer' }), p('c', { priceJpy: 2000, status: 'sold' })];
  assert.deepEqual(listProducts(items, { sort: 'price_asc' }).map(x => x.id), ['b', 'a', 'c']);
  assert.deepEqual(listProducts(items, { category: 'outer' }).map(x => x.id), ['b']);
  assert.deepEqual(listProducts(items, { hideSold: true }).map(x => x.id).sort(), ['a', 'b']);
});

test('ページ分割', () => {
  const items = Array.from({ length: 5 }, (_, i) => i);
  assert.deepEqual(paginate(items, 2, 2), { items: [2, 3], page: 2, totalPages: 3 });
  assert.equal(paginate(items, 99, 2).page, 3);
  assert.equal(paginate([], 1, 2).totalPages, 1);
});

test('カート合計: 購入できない商品は合計に入れない', () => {
  const products = [p('a', { priceJpy: 19000 }), p('b', { priceJpy: 5000, status: 'sold' })];
  const s = cartSummary(['a', 'b', 'gone'], products, { feeJpy: 1000, freeOverJpy: null });
  assert.equal(s.subtotal, 19000);
  assert.equal(s.shippingFee, 1000);
  assert.equal(s.total, 20000);
  assert.deepEqual(s.unavailable.map(x => x.id), ['b']);
  assert.deepEqual(s.missing, ['gone']);
});

test('カート合計: 送料無料・空のとき送料0', () => {
  const products = [p('a', { priceJpy: 30000 })];
  assert.equal(cartSummary(['a'], products, { feeJpy: 1000, freeOverJpy: 30000 }).shippingFee, 0);
  assert.equal(cartSummary([], products, { feeJpy: 1000, freeOverJpy: null }).total, 0);
});

test('カートの保存（重複しない・壊れたデータに強い）', () => {
  const mem = new Map();
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  addToCart('a', storage); addToCart('a', storage); addToCart('b', storage);
  assert.deepEqual(readCart(storage), ['a', 'b']);
  removeFromCart('a', storage);
  assert.deepEqual(readCart(storage), ['b']);
  mem.set('vintage-ec:cart', '{broken');
  assert.deepEqual(readCart(storage), []);
  writeCart(['x'], { setItem() { throw new Error('quota'); } }); // 例外を出さない
});

test('表示', () => {
  assert.equal(formatYen(19000), '¥19,000');
  assert.equal(categoryLabel('outer'), 'アウター');
  assert.equal(categoryLabel('unknown'), '');
});

test('サンプル商品データの整合性', () => {
  const { products } = JSON.parse(readFileSync(new URL('../public/data/sample-products.json', import.meta.url)));
  const ids = new Set();
  for (const x of products) {
    assert.match(x.id, /^prod_[A-Za-z0-9]+$/);
    assert.ok(!ids.has(x.id)); ids.add(x.id);
    assert.ok(CATEGORIES.some(c => c.id === x.category), x.category);
    assert.ok(Number.isInteger(x.priceJpy) && x.priceJpy > 0);
    assert.ok(['available', 'reserved', 'sold'].includes(x.status));
  }
});
