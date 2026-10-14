// 商品データの取得。決済の仕組み（/api）が未接続ならサンプル商品で表示する「デモモード」
let cache = null;

export async function loadProducts() {
  if (cache) return cache;
  try {
    const res = await fetch('/api/products', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    cache = { products: data.products, demo: false };
  } catch {
    const res = await fetch('/data/sample-products.json');
    const data = await res.json();
    cache = { products: data.products, demo: true };
  }
  return cache;
}

export async function startCheckout(ids) {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}
