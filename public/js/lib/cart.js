// カート（ブラウザ内に商品IDだけ保存。一点物なので数量は常に1）
const KEY = 'vintage-ec:cart';

export function readCart(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  } catch { return []; }
}

export function writeCart(ids, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify([...new Set(ids)])); } catch { /* 保存できない環境では無視 */ }
  globalThis.dispatchEvent?.(new Event('cart:change'));
}

export function addToCart(id, storage) { writeCart([...readCart(storage), id], storage); }
export function removeFromCart(id, storage) { writeCart(readCart(storage).filter(x => x !== id), storage); }
export function clearCart(storage) { writeCart([], storage); }
