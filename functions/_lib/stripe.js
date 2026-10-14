// Stripe API の最小クライアント（外部ライブラリなし。Cloudflare でも Node でも動く）

// { a: 1, b: { c: 'x' }, d: ['p', 'q'] } → a=1&b[c]=x&d[0]=p&d[1]=q
export function encodeForm(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') {
      encodeForm(value, name, out);
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out.join('&');
}

export function createStripe(secretKey, fetchImpl = fetch) {
  async function call(method, path, params) {
    let url = `https://api.stripe.com/v1${path}`;
    const init = { method, headers: { Authorization: `Bearer ${secretKey}` } };
    if (params && method === 'GET') {
      url += '?' + encodeForm(params);
    } else if (params) {
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = encodeForm(params);
    }
    const res = await fetchImpl(url, init);
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data?.error?.message || `Stripe ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    listProducts: (params) => call('GET', '/products', params),
    getProduct: (id) => call('GET', `/products/${encodeURIComponent(id)}`, { expand: ['default_price'] }),
    updateProduct: (id, params) => call('POST', `/products/${encodeURIComponent(id)}`, params),
    createCheckoutSession: (params) => call('POST', '/checkout/sessions', params),
  };
}

// 全商品（有効なもの）を取得。100件を超える場合はページ送りで全件取得
export async function listAllActiveProducts(stripe) {
  const all = [];
  let startingAfter;
  for (let i = 0; i < 20; i++) {
    const page = await stripe.listProducts({
      active: true, limit: 100, expand: ['data.default_price'], starting_after: startingAfter,
    });
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return all;
}
