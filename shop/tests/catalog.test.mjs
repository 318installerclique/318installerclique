// 実行: node --test shop/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterByCategory, paginate, formatPrice, imageOf } from '../js/catalog.js';
import { PRODUCTS, CATEGORIES } from '../js/products.js';

test('カテゴリ未指定なら全件', () => {
  assert.equal(filterByCategory(PRODUCTS, '').length, PRODUCTS.length);
});

test('カテゴリで絞り込める', () => {
  const r = filterByCategory(PRODUCTS, 'シャツ');
  assert.ok(r.length > 0);
  assert.ok(r.every(p => p.category === 'シャツ'));
});

test('ページ分割と範囲外ページの補正', () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(paginate(items, 1, 4), { items: [0, 1, 2, 3], page: 1, totalPages: 3 });
  assert.deepEqual(paginate(items, 3, 4).items, [8, 9]);
  assert.equal(paginate(items, 99, 4).page, 3);
  assert.equal(paginate(items, 'abc', 4).page, 1);
  assert.equal(paginate([], 1, 4).totalPages, 1);
});

test('価格表示', () => {
  assert.equal(formatPrice(14300), '¥14,300（税込）');
});

test('画像未設定はプレースホルダー', () => {
  assert.equal(imageOf({ image: '' }), 'img/placeholder.svg');
  assert.equal(imageOf({ image: 'img/a.jpg' }), 'img/a.jpg');
});

test('商品データの整合性', () => {
  const ids = new Set();
  for (const p of PRODUCTS) {
    assert.ok(!ids.has(p.id), `ID重複: ${p.id}`);
    ids.add(p.id);
    assert.ok(CATEGORIES.includes(p.category), `未定義カテゴリ: ${p.category}`);
    assert.ok(Number.isInteger(p.price) && p.price > 0, `価格不正: ${p.id}`);
  }
});
