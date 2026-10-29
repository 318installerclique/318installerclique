// 公開しないフォルダ・ファイルを 404 で返す（Cloudflare Pages Functions。ビルド設定は変えない）
// サイトの一番上をそのまま公開しているため、データ・テスト・作業用の文書も URL で読めてしまう。
// %エンコード（/%63ontent）・大文字小文字・二重スラッシュ・../ などの言い換えも、元に戻してから判定する（2026-10-29 検収の指摘）
const HIDDEN = new Set(['content', 'tests', 'scripts', 'docs', 'functions']);

// パスを、配信側が解釈するのと同じ形に直す：%を戻す（二重も）→ \ を / に → 小文字 → 空・. ・.. を解決
export function normalizePath(pathname) {
  let p = String(pathname || '/');
  for (let i = 0; i < 5; i++) {
    const d = decodeURIComponent(p); // 壊れた % は例外（呼び出し側で 404）
    if (d === p) break;
    p = d;
  }
  const parts = [];
  for (const seg of p.replace(/\\/g, '/').toLowerCase().split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts;
}

export function isHiddenPath(pathname) {
  let parts;
  try { parts = normalizePath(pathname); } catch { return true; }
  const first = (parts[0] || '').trim();
  return HIDDEN.has(first) || /^readme(\.|$)/.test(first);
}

export async function onRequest({ request, next, env }) {
  if (!isHiddenPath(new URL(request.url).pathname)) return next();
  let body = 'Not Found';
  try {
    const page = await env.ASSETS.fetch(new URL('/404', request.url));
    if (page.ok) body = await page.text();
  } catch { /* 404 ページが読めなくても 404 は返す */ }
  return new Response(body, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' },
  });
}
