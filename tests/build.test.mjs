// scripts/build.mjs のテスト（node --test tests/）
// ここのデータはすべてテスト用のダミー。公開物（content/）には置かない。架空の実績として使わない
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generate, loadInput, diff, renderBody, ROBOTS } from '../scripts/build.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const site = { name: 'TEST SITE', origin: 'https://example.test', instagram: 'https://www.instagram.com/test/' };
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const placeholderWorks = '\n<li class="work">PLACEHOLDER</li>\n';
const photo = (n) => ({ src: `/assets/img/test-${n}.jpg`, alt: `テスト用の写真${n}`, width: 800, height: 600, permission: { confirmedAt: '2026-01-01', by: 'テスト' } });
const work = (id, extra = {}) => ({ id, status: 'published', title: `ダミー施工事例 ${id}`, category: 'ダミー工種', summary: `ダミー概要 ${id}`, publishedAt: '2026-01-01', photos: [photo(1)], ...extra });
const column = (id, extra = {}) => ({ id, status: 'published', title: `ダミーコラム ${id}`, summary: 'ダミー概要', category: 'ダミー工種', reviewer: 'ダミー確認者', publishedAt: '2026-01-01', body: '## 見出し\n\n本文。', ...extra });
const news = (id, extra = {}) => ({ id, status: 'published', title: `ダミーお知らせ ${id}`, date: '2026-01-01', body: '本文。', ...extra });
const run = (input) => generate({ site, indexHtml, placeholderWorks, ...input }).files;
const sitemapUrls = (files) => [...files.get('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

test('0件：一覧は「準備中」、詳細ページは作らない、sitemap はトップだけ、NEWS 欄とメニューは出さない、WORKS は今のカードのまま', () => {
  const f = run({});
  assert.deepEqual([...f.keys()].sort(), ['404.html', 'column/index.html', 'index.html', 'news/index.html', 'sitemap.xml', 'works/index.html']);
  for (const p of ['works/index.html', 'column/index.html', 'news/index.html']) assert.match(f.get(p), /準備中/);
  assert.deepEqual(sitemapUrls(f), ['https://example.test/']);
  const top = f.get('index.html');
  assert.doesNotMatch(top, /id="news"/);
  assert.doesNotMatch(top, /href="\/news\/"/);
  assert.doesNotMatch(top, /href="\/column\/"/);
  assert.match(top, /PLACEHOLDER/);
  assert.match(top, /<a href="#partners">Partners<\/a>/);
});

test('1件：詳細ページ・一覧・sitemap・canonical・トップの NEWS 欄とメニュー・WORKS のカードから詳細へ', () => {
  const f = run({ works: [work('w1')], columns: [column('c1')], news: [news('n1')] });
  for (const [p, url] of [['works/w1/index.html', '/works/w1/'], ['column/c1/index.html', '/column/c1/'], ['news/n1/index.html', '/news/n1/']]) {
    assert.ok(f.has(p), p);
    assert.match(f.get(p), new RegExp(`<link rel="canonical" href="https://example.test${url}">`));
  }
  assert.deepEqual(sitemapUrls(f), ['https://example.test/', 'https://example.test/works/', 'https://example.test/works/w1/',
    'https://example.test/column/', 'https://example.test/column/c1/', 'https://example.test/news/', 'https://example.test/news/n1/']);
  const top = f.get('index.html');
  assert.match(top, /id="news"/);
  assert.match(top, /<a href="\/news\/">News<\/a>/);
  assert.match(top, /<a href="\/column\/">Column<\/a>/);
  assert.match(top, /href="\/works\/w1\/"/);
  assert.doesNotMatch(top, /PLACEHOLDER/);
  assert.match(top, /<link rel="canonical" href="https:\/\/example.test\/">/);
  assert.match(f.get('works/index.html'), /href="\/works\/w1\/"/);
  assert.doesNotMatch(f.get('works/index.html'), /準備中/);
});

test('複数件と下書き：下書きはページ・一覧・トップ・sitemap・関連リンクに出ない。新しい順', () => {
  const f = run({
    works: [work('w-old', { publishedAt: '2026-01-01', relatedWorks: ['w-draft', 'w-new'] }), work('w-new', { publishedAt: '2026-03-01' }), work('w-draft', { status: 'draft' })],
    columns: [column('c-old', { publishedAt: '2026-01-01' }), column('c-new', { publishedAt: '2026-02-01', relatedWorks: ['w-draft', 'w-old'] }), column('c-draft', { status: 'draft', reviewer: '' })],
    news: [news('n1', { date: '2026-01-01' }), news('n2', { date: '2026-02-01' }), news('n3', { date: '2026-03-01' }), news('n4', { date: '2026-04-01' }), news('n-draft', { status: 'draft' })],
  });
  const all = [...f.values()].join('\n');
  for (const d of ['w-draft', 'c-draft', 'n-draft']) assert.ok(!all.includes(d), `${d} がどこにも出ない`);
  assert.ok(!f.has('works/w-draft/index.html'));
  const list = f.get('works/index.html');
  assert.ok(list.indexOf('/works/w-new/') < list.indexOf('/works/w-old/'), '新しい順');
  assert.match(f.get('column/c-new/index.html'), /href="\/works\/w-old\/"/, '公開済みの関連はリンクする');
  const top = f.get('index.html');
  assert.equal((top.match(/href="\/news\/n\d\/"/g) || []).length, 3, 'トップの NEWS は新しい3件');
  assert.ok(top.indexOf('/news/n4/') < top.indexOf('/news/n2/'));
  assert.ok(!top.includes('/news/n1/'));
  assert.equal(sitemapUrls(f).length, 1 + 1 + 2 + 1 + 2 + 1 + 4);
});

test('公開の条件：技術確認者の無いコラム・許諾の記録が無い写真・大きさの無い写真・写真の無い実績・形の違う id は作らない', () => {
  assert.throws(() => run({ columns: [column('c', { reviewer: '' })] }), /技術確認者/);
  assert.throws(() => run({ works: [work('w', { photos: [{ ...photo(1), permission: {} }] })] }), /許諾/);
  assert.throws(() => run({ works: [work('w', { photos: [{ ...photo(1), width: 0 }] })] }), /width/);
  assert.throws(() => run({ works: [work('w', { photos: [] })] }), /写真/);
  assert.throws(() => run({ works: [work('Bad_ID')] }), /id/);
  assert.throws(() => run({ news: [news('n', { date: '2026/01/01' })] }), /YYYY-MM-DD/);
  assert.doesNotThrow(() => run({ columns: [column('c', { status: 'draft', reviewer: '' })] }), '下書きは確認前でもよい');
});

test('全ページ：検索除外（noindex）・固有の title と description・構造化データは決めた種類だけ', () => {
  const f = run({ works: [work('w1')], columns: [column('c1', { author: 'ダミー筆者' })], news: [news('n1')] });
  const titles = new Set();
  for (const [p, html] of f) {
    if (!p.endsWith('.html')) continue;
    assert.match(html, new RegExp(`<meta name="robots" content="${ROBOTS}">`), p);
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    assert.ok(!titles.has(title), `title が重複：${title}`); titles.add(title);
    assert.match(html, /<meta name="description" content="[^"]+">/, p);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) {
      const t = JSON.parse(m[1])['@type'];
      assert.ok(['Organization', 'Article', 'BreadcrumbList'].includes(t), `${p}: ${t}`);
    }
  }
  const art = JSON.parse(f.get('column/c1/index.html').match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"Article"[^<]+)<\/script>/)[1]);
  assert.equal(art.author.name, 'ダミー筆者');
  assert.equal(art.datePublished, '2026-01-01');
  const noAuthor = run({ columns: [column('c2')] }).get('column/c2/index.html');
  assert.doesNotMatch(noAuthor, /"author"/, '筆者が無いときは author を書かない（正しい内容だけ）');
  assert.doesNotMatch(f.get('404.html'), /rel="canonical"/, '404 には正規URLを付けない');
});

test('文字はすべてそのまま表示（HTML として動かない）', () => {
  const f = run({ news: [news('x', { title: '<script>alert(1)</script>', body: '<img src=x onerror=alert(1)>' })] });
  const html = f.get('news/x/index.html');
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
  assert.equal(renderBody('## 見出し\n\n- 一\n- 二\n\n段落\n2行目'), '<h2>見出し</h2>\n<ul><li>一</li><li>二</li></ul>\n<p>段落<br>2行目</p>');
});

test('リポジトリのページは content/ のデータから作り直した状態と同じ（作り直し忘れが無い）', async () => {
  const { files } = generate(await loadInput(ROOT));
  const { changed, stale } = await diff(ROOT, files);
  assert.deepEqual({ changed, stale }, { changed: [], stale: [] }, 'node scripts/build.mjs を実行してコミットする');
});

test('今の公開データ：実績・記事・お知らせは0件（詳細ページは作られない）', async () => {
  const input = await loadInput(ROOT);
  const pub = [...input.works, ...input.columns, ...input.news].filter(x => x.status === 'published');
  assert.equal(pub.length, 0);
});
