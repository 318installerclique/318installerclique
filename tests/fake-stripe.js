// テスト用の偽 Stripe（メモリ上で商品を管理。Stripe と同じく metadata の '' はキー削除）
export function createFakeStripe(products) {
  const db = new Map(products.map(p => [p.id, structuredClone(p)]));
  const sessions = [];
  const calls = [];
  return {
    db, sessions, calls,
    async getProduct(id) {
      calls.push(['get', id]);
      const p = db.get(id);
      if (!p) { const e = new Error('No such product'); e.status = 404; throw e; }
      return structuredClone(p);
    },
    async updateProduct(id, params) {
      calls.push(['update', id, params]);
      const p = db.get(id);
      for (const [k, v] of Object.entries(params.metadata || {})) {
        if (v === '') delete p.metadata[k]; else p.metadata[k] = v;
      }
      return structuredClone(p);
    },
    async createCheckoutSession(params) {
      calls.push(['session', params]);
      if (this.failSession) throw new Error('stripe down');
      const s = { id: `cs_test_${sessions.length + 1}`, url: `https://checkout.stripe.com/c/${sessions.length + 1}`, ...params };
      sessions.push(s);
      return s;
    },
  };
}

export function product(id, amount, metadata = {}, extra = {}) {
  return {
    id, object: 'product', active: true, name: `商品 ${id}`, images: [], created: 1700000000,
    metadata: { ...metadata },
    default_price: { id: `price_${id}`, currency: 'jpy', unit_amount: amount },
    ...extra,
  };
}
