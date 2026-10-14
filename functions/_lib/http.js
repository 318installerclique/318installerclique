// Cloudflare Pages Functions 共通の小さな道具

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export function requireEnv(env, name) {
  const v = env[name];
  if (!v) throw new Error(`環境変数 ${name} が未設定です`);
  return v;
}
