// functions/_middleware.js：公開しないパスの判定（言い換えも含む）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHiddenPath, onRequest } from '../functions/_middleware.js';

const hidden = [
  '/content/site.json', '/tests/build.test.mjs', '/scripts/build.mjs', '/docs/search-console-ga4.md', '/functions/_middleware.js', '/README.md', '/README',
  // 検収で読めた言い換え
  '/%63ontent/site.json', '/%74ests/build.test.mjs', '/README%2Emd',
  // 大文字小文字・%エンコード・二重エンコード・二重スラッシュ・../・\・末尾
  '/Content/site.json', '/CONTENT/SITE.JSON', '/readme.md', '/ReadMe.MD', '/%43ONTENT/site.json', '/%2563ontent/site.json',
  '//content/site.json', '/./content/site.json', '/works/../content/site.json', '/works/%2e%2e/content/site.json', '/x/..%2fcontent/site.json',
  '/works/..%5ccontent/site.json', '/content', '/content/', '/%64ocs/', '/%73cripts/build.mjs', '/%66unctions/_middleware.js',
  '/%E0%A4%A', // 壊れた % は 404
];
const shown = ['/', '/index.html', '/works/', '/works/x/', '/column/', '/news/', '/404.html', '/sitemap.xml', '/robots.txt', '/assets/css/site.css',
  '/assets/js/main.js', '/contents/', '/works/content/', '/readmore/', '/docsx'];

test('公開しないパス（言い換えを含む）は隠す', () => {
  for (const p of hidden) assert.equal(isHiddenPath(p), true, p);
});
test('サイトのページ・素材は隠さない', () => {
  for (const p of shown) assert.equal(isHiddenPath(p), false, p);
});
test('隠すときは 404・noindex。中身は 404 ページ。それ以外はそのまま次へ', async () => {
  const env = { ASSETS: { fetch: async () => new Response('<h1>Not Found.</h1>', { status: 200 }) } };
  const res = await onRequest({ request: new Request('https://example.test/%63ontent/site.json'), next: () => new Response('secret'), env });
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex');
  assert.match(await res.text(), /Not Found\./);
  const ok = await onRequest({ request: new Request('https://example.test/works/'), next: () => new Response('page'), env });
  assert.equal(await ok.text(), 'page');
});
