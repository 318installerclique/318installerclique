// Stripe Webhook の署名検証（なりすましの通知を受け付けないため）
// ヘッダー例: Stripe-Signature: t=1700000000,v1=abcdef...

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

export async function verifyStripeSignature(rawBody, header, secret, nowSec, toleranceSec = 300) {
  if (!header || !secret) return false;
  let t = null;
  const v1 = [];
  for (const item of header.split(',')) {
    const [k, v] = item.split('=');
    if (k === 't') t = Number(v);
    if (k === 'v1' && v) v1.push(v);
  }
  if (!Number.isFinite(t) || v1.length === 0) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return v1.some(sig => timingSafeEqual(sig, expected));
}
