// 一覧表示のロジック（DOMに依存しない純粋関数。tests/catalog.test.mjs でテスト）

export const PER_PAGE = 8;

export function filterByCategory(products, category) {
  if (!category) return products;
  return products.filter(p => p.category === category);
}

export function paginate(items, page, perPage = PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), totalPages);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: current, totalPages };
}

export function formatPrice(yen) {
  return '¥' + Number(yen).toLocaleString('ja-JP') + '（税込）';
}

export function imageOf(product) {
  return product.image || 'img/placeholder.svg';
}
