// 318 INSTALLER CLIQUE — WORKS・COLUMN・NEWS のページを作る（Node だけ・外部ライブラリなし）
//
// 使い方（リポジトリの一番上で）
//   node scripts/build.mjs           content/ のデータからページを作り直す（できたファイルもコミットする）
//   node scripts/build.mjs --check   作り直しが必要か確かめるだけ（必要なら終了コード 1）
//
// 決まりごと
// - 公開するのは status が "published" のものだけ。下書き（それ以外）はページ・一覧・sitemap に出さない
// - 架空の実績・職人・地域・お客様の声を作らない。データに無いことは表示しない
// - Cloudflare 側のビルド設定は変えない（ここで作った HTML をそのまま公開する）
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SECTIONS = ['works', 'column', 'news'];

// ---------- 小さな道具 ----------
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const filled = (v) => String(v ?? '').trim() !== '';
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dot = (d) => (d ? d.replace(/-/g, '.') : '');
const isPublished = (x) => x && x.status === 'published';

// 本文：空行で段落。「## 」「### 」で見出し、「- 」で箇条書き。HTML は書けない（すべて文字として出す）
export function renderBody(text) {
  return String(text || '').trim().split(/\n{2,}/).map((block) => {
    const b = block.trim();
    if (b.startsWith('### ')) return `<h3>${esc(b.slice(4))}</h3>`;
    if (b.startsWith('## ')) return `<h2>${esc(b.slice(3))}</h2>`;
    const lines = b.split('\n');
    if (lines.every(l => l.startsWith('- '))) return `<ul>${lines.map(l => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(esc).join('<br>')}</p>`;
  }).join('\n');
}

// ---------- データの確認（公開するものだけ厳しく見る） ----------
function check(cond, msg) { if (!cond) throw new Error(msg); }

export function validate({ works = [], columns = [], news = [] }) {
  const seen = new Set();
  const all = [['works', works], ['column', columns], ['news', news]];
  for (const [kind, list] of all) {
    for (const x of list) {
      check(ID.test(x.id || ''), `${kind}: id は英小文字・数字・ハイフンだけ（${x.id}）`);
      check(!seen.has(`${kind}/${x.id}`), `${kind}: id が重複（${x.id}）`);
      seen.add(`${kind}/${x.id}`);
      if (!isPublished(x)) continue;
      check(filled(x.title), `${kind}/${x.id}: 題名（title）が空`);
      for (const k of ['publishedAt', 'updatedAt', 'date']) if (x[k]) check(DATE.test(x[k]), `${kind}/${x.id}: ${k} は YYYY-MM-DD`);
      for (const img of [...(x.photos || []), ...(x.images || [])]) {
        check(filled(img.src) && filled(img.alt), `${kind}/${x.id}: 写真に src と alt が必要`);
        check(img.width > 0 && img.height > 0, `${kind}/${x.id}: 写真に width・height（実寸 px）が必要（${img.src}）`);
        check(filled(img.permission?.confirmedAt) && filled(img.permission?.by), `${kind}/${x.id}: 写真の掲載許諾の記録（permission.confirmedAt・by）が無い（${img.src}）`);
      }
    }
  }
  for (const w of works.filter(isPublished)) {
    check(filled(w.category), `works/${w.id}: 工種（category）が空`);
    check((w.photos || []).length > 0, `works/${w.id}: 写真が1枚も無い`);
  }
  for (const c of columns.filter(isPublished)) {
    check(filled(c.reviewer), `column/${c.id}: 技術確認者（reviewer）が空。本人確認の前は公開しない`);
    check(filled(c.publishedAt), `column/${c.id}: 公開日（publishedAt）が空`);
    check(filled(c.body), `column/${c.id}: 本文（body）が空`);
  }
  for (const n of news.filter(isPublished)) {
    check(filled(n.date), `news/${n.id}: 掲載日（date）が空`);
    check(filled(n.body), `news/${n.id}: 本文（body）が空`);
  }
}

// 新しい順（日付が無いものは後ろ）
const byDate = (key) => (a, b) => String(b[key] || '').localeCompare(String(a[key] || '')) || a.id.localeCompare(b.id);

// ---------- 共通の部品 ----------
const IG_ICON = '<svg class="ig-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor"/></svg>';

// メニュー。Column・News は記事が0件でも常に出す（代表決定 2026-10-29 15:17）。トップでは同じページ内の移動（#works）、ほかのページではトップへ（/#works）
export function navLinks({ onTop, site }) {
  const h = (anchor) => (onTop ? `#${anchor}` : `/#${anchor}`);
  const items = [
    ['Works', h('works')], ['Process', h('process')], ['Crew', h('crew')], ['Partners', h('partners')],
    ['Column', '/column/'], ['News', '/news/'],
    ['About', h('about')], ['Contact', h('contact')],
  ].filter(Boolean);
  return `${items.map(([label, href]) => `<a href="${href}">${label}</a>`).join('\n    ')}
    <!-- 公式 Instagram（PC はアイコンだけ、スマホのメニューは文字も出す） -->
    <a class="topbar__ig" href="${esc(site.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram（新しいタブで開きます）" data-track="instagram_click">${IG_ICON}<span class="topbar__ig-label">Instagram</span></a>`;
}

function pictureHtml(img, { lazy = true, cls = '' } = {}) {
  const webp = img.webp ? `<source srcset="${esc(img.webp)}" type="image/webp">` : '';
  return `<picture>${webp}<img${cls ? ` class="${cls}"` : ''} src="${esc(img.src)}" alt="${esc(img.alt)}" width="${Number(img.width)}" height="${Number(img.height)}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></picture>`;
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function breadcrumbs(site, trail) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: site.origin + path })),
  };
}

function crumbHtml(trail) {
  return `<nav class="crumbs" aria-label="現在の場所"><ol>${trail.map(([name, path], i) => i === trail.length - 1
    ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${path}">${esc(name)}</a></li>`).join('')}</ol></nav>`;
}

// ページ全体。index は noindex（正式公開の承認まで、サイト全体を検索に出さない）
function pageHtml({ site, path, title, description, main, ld = [], ctx, ogType = 'website', image, canonical = true }) {
  const url = site.origin + path;
  const og = image ? site.origin + image : `${site.origin}/assets/img/site-wall.jpg`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <!-- 試作のあいだは検索に載せない。本番公開のときに消す（scripts/build.mjs の ROBOTS） -->
  <meta name="robots" content="${ROBOTS}">
  ${canonical ? `<link rel="canonical" href="${esc(url)}">` : ''}
  <meta name="theme-color" content="#111111">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  ${canonical ? `<meta property="og:url" content="${esc(url)}">` : ''}
  <meta property="og:image" content="${esc(og)}">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/css/site.css">
  <script>document.documentElement.classList.add('js')</script>
  ${ld.map(jsonLd).join('\n  ')}
</head>
<body class="subpage">
<a class="skip" href="#main">本文へ移動</a>

<header class="topbar" data-topbar>
  <a class="topbar__logo" href="/" aria-label="318 INSTALLER CLIQUE トップへ">318</a>
  <button class="topbar__menu" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-button>Menu</button>
  <nav class="topbar__nav" id="site-nav" aria-label="メインメニュー" data-menu>
    ${navLinks({ ...ctx, onTop: false, site })}
  </nav>
</header>

<main id="main" class="page">
${main}
</main>

${footerHtml(site)}

<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/analytics.js" defer></script>
</body>
</html>
`;
}

function footerHtml(site) {
  return `<footer class="footer">
  <img class="footer__mark" src="/assets/img/logo-script.png" alt="318 INSTALLER CLIQUE" width="417" height="440" loading="lazy" decoding="async">
  <p class="footer__logo">318 INSTALLER CLIQUE</p>
  <p class="footer__sns"><a href="${esc(site.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram（新しいタブで開きます）" data-track="instagram_click">Instagram <span aria-hidden="true">↗</span></a></p>
  <p>© <span data-year>2026</span> 318 INSTALLER CLIQUE</p>
</footer>`;
}

export const ROBOTS = 'noindex, nofollow';

// 準備中（0件）の一覧
function soonHtml(label) {
  return `<div class="soon"><p class="soon__title">準備中</p><p>${esc(label)}は、内容が確認でき次第ここに掲載します。</p><p><a class="textlink" href="/">トップへ戻る</a></p></div>`;
}

function contactCta() {
  return `<aside class="page-cta" aria-label="ご相談">
    <p class="kicker">Contact</p>
    <p class="page-cta__text">施工協力のご相談、住宅・店舗工事について。</p>
    <a class="btn btn--dark" href="/#contact" data-contact-type="corporate" data-track="contact_cta_click">施工協力について相談する</a>
  </aside>`;
}

// ---------- WORKS ----------
const WORK_FIELDS = [
  ['category', '工種'], ['scope', '施工内容'], ['location', '施工箇所'], ['area', '地域'],
  ['period', '施工時期'], ['duration', '工期'], ['relation', '元請・協力の関係'],
];

function workCardHtml(w) {
  const cover = w.photos[0];
  const meta = [w.category, w.area].filter(filled).join(' / ');
  return `<li class="work">
          <a class="work__link" href="/works/${w.id}/">
          <figure class="work__media">
            ${pictureHtml(cover)}
          </figure>
          <div class="work__body">
            <p class="meta">${esc(meta)}</p>
            <h3>${esc(w.title)}</h3>
            ${filled(w.summary) ? `<p>${esc(w.summary)}</p>` : ''}
          </div>
          </a>
        </li>`;
}

function workPage(w, ctx) {
  const { site, works, columns } = ctx;
  const trail = [['TOP', '/'], ['Works', '/works/'], [w.title, `/works/${w.id}/`]];
  const crafts = (w.craftsmen || []).filter(c => filled(c.name));
  const rows = [
    ...WORK_FIELDS.filter(([k]) => filled(w[k])).map(([k, label]) => [label, esc(w[k])]),
    crafts.length && ['担当', crafts.map(c => esc([c.name, c.craft].filter(filled).join('（') + (filled(c.craft) ? '）' : ''))).join('<br>')],
  ].filter(Boolean);
  const points = w.points || {};
  const steps = [['課題', points.issue], ['方法', points.method], ['理由', points.reason], ['仕上がり', points.result]].filter(([, v]) => filled(v));
  const relWorks = (w.relatedWorks || []).map(id => works.find(x => x.id === id && x.id !== w.id)).filter(Boolean);
  const relCols = (w.relatedColumns || []).map(id => columns.find(x => x.id === id)).filter(Boolean);
  const main = `  <article class="page__article">
    ${crumbHtml(trail)}
    <header class="page__head">
      <p class="kicker">Works${filled(w.category) ? ` / ${esc(w.category)}` : ''}</p>
      <h1 class="page__title">${esc(w.title)}</h1>
      ${filled(w.summary) ? `<p class="page__lead">${esc(w.summary)}</p>` : ''}
    </header>
    ${rows.length ? `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    <div class="gallery">
      ${w.photos.map((p, i) => `<figure class="gallery__item">${pictureHtml(p, { lazy: i > 0 })}${filled(p.caption) ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`).join('\n      ')}
    </div>
    ${steps.length ? `<section class="prose" aria-labelledby="w-points"><h2 id="w-points">施工の工夫</h2><dl class="steps">${steps.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>` : ''}
    ${filled(w.body) ? `<div class="prose">${renderBody(w.body)}</div>` : ''}
    ${relWorks.length || relCols.length ? `<section class="related" aria-labelledby="w-related"><h2 id="w-related">関連</h2><ul>${relWorks.map(x => `<li><a href="/works/${x.id}/">${esc(x.title)}</a><span>Works</span></li>`).join('')}${relCols.map(x => `<li><a href="/column/${x.id}/">${esc(x.title)}</a><span>Column</span></li>`).join('')}</ul></section>` : ''}
    <p class="page__back"><a class="textlink" href="/works/">施工事例の一覧へ</a></p>
  </article>
  ${contactCta()}`;
  return pageHtml({
    site, ctx, path: `/works/${w.id}/`, main, image: w.photos[0]?.src,
    title: `${w.title}｜施工事例｜${site.name}`,
    description: w.summary || `${w.category}の施工事例。${site.name}`,
    ld: [breadcrumbs(site, trail)],
  });
}

function listItem(href, title, meta, text) {
  return `<li class="entry"><a href="${href}"><p class="meta">${meta}</p><h2 class="entry__title">${esc(title)}</h2>${filled(text) ? `<p class="entry__text">${esc(text)}</p>` : ''}</a></li>`;
}

function listPage({ ctx, path, kicker, title, lead, items, label }) {
  const { site } = ctx;
  const trail = [['TOP', '/'], [kicker, path]];
  const main = `  <section class="page__article">
    ${crumbHtml(trail)}
    <header class="page__head">
      <p class="kicker">${esc(kicker)}</p>
      <h1 class="page__title">${esc(title)}</h1>
      <p class="page__lead">${esc(lead)}</p>
    </header>
    ${items.length ? `<ul class="entries">${items.join('\n')}</ul>` : soonHtml(label)}
  </section>
  ${contactCta()}`;
  return pageHtml({
    site, ctx, path, main,
    title: `${title}｜${site.name}`, description: lead,
    ld: [breadcrumbs(site, trail)],
  });
}

// ---------- COLUMN ----------
function columnPage(c, ctx) {
  const { site, works } = ctx;
  const trail = [['TOP', '/'], ['Column', '/column/'], [c.title, `/column/${c.id}/`]];
  const rel = (c.relatedWorks || []).map(id => works.find(x => x.id === id)).filter(Boolean);
  const dates = `公開 <time datetime="${c.publishedAt}">${dot(c.publishedAt)}</time>${c.updatedAt && c.updatedAt !== c.publishedAt ? ` ／ 更新 <time datetime="${c.updatedAt}">${dot(c.updatedAt)}</time>` : ''}`;
  const article = {
    '@context': 'https://schema.org', '@type': 'Article', headline: c.title,
    datePublished: c.publishedAt, dateModified: c.updatedAt || c.publishedAt,
    mainEntityOfPage: `${site.origin}/column/${c.id}/`,
    publisher: { '@type': 'Organization', name: site.name, url: `${site.origin}/` },
    ...(filled(c.summary) ? { description: c.summary } : {}),
    ...(filled(c.author) ? { author: { '@type': 'Person', name: c.author } } : {}),
    ...((c.images || [])[0] ? { image: site.origin + c.images[0].src } : {}),
  };
  const main = `  <article class="page__article">
    ${crumbHtml(trail)}
    <header class="page__head">
      <p class="kicker">Column${filled(c.category) ? ` / ${esc(c.category)}` : ''}</p>
      <h1 class="page__title page__title--article">${esc(c.title)}</h1>
      ${filled(c.summary) ? `<p class="page__lead">${esc(c.summary)}</p>` : ''}
      <p class="page__meta">${dates}${filled(c.author) ? ` ／ 文 ${esc(c.author)}` : ''} ／ 技術確認 ${esc(c.reviewer)}</p>
    </header>
    ${(c.images || []).length ? `<figure class="page__figure">${pictureHtml(c.images[0], { lazy: false })}${filled(c.images[0].caption) ? `<figcaption>${esc(c.images[0].caption)}</figcaption>` : ''}</figure>` : ''}
    <div class="prose">${renderBody(c.body)}</div>
    ${(c.images || []).slice(1).map(p => `<figure class="page__figure">${pictureHtml(p)}${filled(p.caption) ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`).join('\n    ')}
    ${rel.length ? `<section class="related" aria-labelledby="c-related"><h2 id="c-related">関連する施工事例</h2><ul>${rel.map(x => `<li><a href="/works/${x.id}/">${esc(x.title)}</a><span>Works</span></li>`).join('')}</ul></section>` : ''}
    <p class="page__back"><a class="textlink" href="/column/">コラムの一覧へ</a></p>
  </article>
  ${contactCta()}`;
  return pageHtml({
    site, ctx, path: `/column/${c.id}/`, main, ogType: 'article', image: (c.images || [])[0]?.src,
    title: `${c.title}｜${site.name}`, description: c.summary || c.title,
    ld: [article, breadcrumbs(site, trail)],
  });
}

// ---------- NEWS ----------
function newsPage(n, ctx) {
  const { site } = ctx;
  const trail = [['TOP', '/'], ['News', '/news/'], [n.title, `/news/${n.id}/`]];
  const article = {
    '@context': 'https://schema.org', '@type': 'Article', headline: n.title,
    datePublished: n.date, dateModified: n.updatedAt || n.date,
    mainEntityOfPage: `${site.origin}/news/${n.id}/`,
    publisher: { '@type': 'Organization', name: site.name, url: `${site.origin}/` },
  };
  const links = (n.links || []).filter(l => filled(l.href) && filled(l.label));
  const main = `  <article class="page__article">
    ${crumbHtml(trail)}
    <header class="page__head">
      <p class="kicker">News</p>
      <h1 class="page__title page__title--article">${esc(n.title)}</h1>
      <p class="page__meta"><time datetime="${n.date}">${dot(n.date)}</time></p>
    </header>
    <div class="prose">${renderBody(n.body)}</div>
    ${links.length ? `<ul class="links">${links.map(l => `<li><a class="textlink" href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>` : ''}
    <p class="page__back"><a class="textlink" href="/news/">お知らせの一覧へ</a></p>
  </article>`;
  return pageHtml({
    site, ctx, path: `/news/${n.id}/`, main, ogType: 'article',
    title: `${n.title}｜${site.name}`, description: n.summary || n.title,
    ld: [article, breadcrumbs(site, trail)],
  });
}

// ---------- トップページ（index.html の印の間だけを書き換える） ----------
export function replaceRegion(html, name, content) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`index.html に <!-- build:${name} --> の印が無い`);
  return html.replace(re, (_, a, b) => `${a}${content}${b}`);
}

function topHead(site) {
  return `
  <link rel="canonical" href="${esc(site.origin)}/">
  <meta property="og:url" content="${esc(site.origin)}/">
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: `${site.origin}/`, sameAs: [site.instagram] })}
  `;
}

// トップの COLUMN・NEWS 欄。新しい3件。0件の間は「準備中」（架空の記事は入れない。代表決定 2026-10-29 15:17）
function topEntries({ id, title, lead, listLabel, href, label, items }) {
  const body = items.length
    ? `<ul class="newslist">
      ${items.slice(0, 3).map(x => `<li><a href="${href}${x.id}/"><time datetime="${x.date}">${dot(x.date)}</time><span>${esc(x.title)}</span></a></li>`).join('\n      ')}
    </ul>`
    : `<p class="newslist newslist--soon"><span class="newslist__soon">準備中</span>${esc(label)}は、内容が確認でき次第ここに掲載します。</p>`;
  return `
  <section class="section news" id="${id}" aria-labelledby="${id}-title">
    <div class="section__head reveal">
      <div>
        <p class="kicker">${title}</p>
        <h2 class="section__title" id="${id}-title">${title}</h2>
      </div>
      <p class="section__lead">${esc(lead)}<br><a class="textlink" href="${href}">${esc(listLabel)}</a></p>
    </div>
    ${body}
  </section>
  `;
}

function topColumnNews(columns, news) {
  return topEntries({
    id: 'column', title: 'Column', href: '/column/', listLabel: 'コラムの一覧へ', label: 'コラム',
    lead: '工務店・設計事務所・施工管理の方に向けた、施工の実務についての記事です。',
    items: columns.map(c => ({ id: c.id, title: c.title, date: c.publishedAt })),
  }) + topEntries({
    id: 'news', title: 'News', href: '/news/', listLabel: 'お知らせの一覧へ', label: 'お知らせ',
    lead: '新しい施工事例や活動など、318 からのお知らせです。',
    items: news.map(n => ({ id: n.id, title: n.title, date: n.date })),
  });
}

// ---------- 全体 ----------
// 入力：site（content/site.json）、works・columns・news（content/ の各データ）、indexHtml（今の index.html）、placeholderWorks（実績が0件の間の WORKS カード）
// 出力：{ files: Map<相対パス, 中身> }。works/・column/・news/ の下はここで作るものだけになる
export function generate({ site, works = [], columns = [], news = [], indexHtml, placeholderWorks = '' }) {
  validate({ works, columns, news });
  const pw = works.filter(isPublished).sort(byDate('period')).sort(byDate('publishedAt'));
  const pc = columns.filter(isPublished).sort(byDate('publishedAt'));
  const pn = news.filter(isPublished).sort(byDate('date'));
  const ctx = { site, works: pw, columns: pc, news: pn };
  const files = new Map();

  files.set('works/index.html', listPage({
    ctx, path: '/works/', kicker: 'Works', title: '施工事例',
    lead: '318 に参加する職人の施工事例です。完成した空間だけでなく、工程や細部の判断も紹介します。',
    items: pw.map(w => listItem(`/works/${w.id}/`, w.title, esc([w.category, w.area, w.period].filter(filled).join(' / ')), w.summary)),
    label: '施工事例',
  }));
  for (const w of pw) files.set(`works/${w.id}/index.html`, workPage(w, ctx));

  files.set('column/index.html', listPage({
    ctx, path: '/column/', kicker: 'Column', title: 'コラム',
    lead: '工務店・設計事務所・施工管理の方に向けた、施工の実務についての記事です。内容は担当する職人が確認しています。',
    items: pc.map(c => listItem(`/column/${c.id}/`, c.title, `${dot(c.publishedAt)}${filled(c.category) ? ` / ${esc(c.category)}` : ''}`, c.summary)),
    label: 'コラム',
  }));
  for (const c of pc) files.set(`column/${c.id}/index.html`, columnPage(c, ctx));

  files.set('news/index.html', listPage({
    ctx, path: '/news/', kicker: 'News', title: 'お知らせ',
    lead: '新しい施工事例や活動など、318 からのお知らせです。',
    items: pn.map(n => listItem(`/news/${n.id}/`, n.title, dot(n.date), '')),
    label: 'お知らせ',
  }));
  for (const n of pn) files.set(`news/${n.id}/index.html`, newsPage(n, ctx));

  // 見つからないページ（Cloudflare Pages は 404.html があると、無いアドレスに 404 で返す。無いとトップを返してしまう）
  files.set('404.html', pageHtml({
    site, ctx, path: '/404.html', canonical: false,
    title: `ページが見つかりません｜${site.name}`, description: 'お探しのページは見つかりませんでした。',
    main: `  <section class="page__article notfound">
    <header class="page__head">
      <p class="kicker">404</p>
      <h1 class="page__title">Not Found.</h1>
      <p class="page__lead">お探しのページは見つかりませんでした。移動したか、まだ公開されていない可能性があります。</p>
    </header>
    <p><a class="btn btn--dark" href="/">トップへ戻る</a></p>
  </section>`,
  }));

  // 0件の一覧は sitemap に入れない（準備中のページを検索に出さない）
  const urls = [
    ['/', ''],
    ...(pw.length ? [['/works/', '']] : []), ...pw.map(w => [`/works/${w.id}/`, w.updatedAt || w.publishedAt]),
    ...(pc.length ? [['/column/', '']] : []), ...pc.map(c => [`/column/${c.id}/`, c.updatedAt || c.publishedAt]),
    ...(pn.length ? [['/news/', '']] : []), ...pn.map(n => [`/news/${n.id}/`, n.updatedAt || n.date]),
  ];
  files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, d]) => `  <url><loc>${esc(site.origin + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);

  let html = indexHtml;
  html = replaceRegion(html, 'head', topHead(site));
  html = replaceRegion(html, 'nav', `
    ${navLinks({ ...ctx, onTop: true, site })}
    `);
  html = replaceRegion(html, 'works', pw.length ? `
        ${pw.map(workCardHtml).join('\n        ')}
        ` : placeholderWorks);
  html = replaceRegion(html, 'news', topColumnNews(pc, pn));
  files.set('index.html', html);
  return { files };
}

// ---------- ファイルの読み書き ----------
async function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter(n => n.endsWith('.json') && !n.startsWith('_')).sort();
  return Promise.all(names.map(async n => JSON.parse(await readFile(join(dir, n), 'utf8'))));
}

async function listGenerated(root) {
  const out = [];
  for (const s of SECTIONS) {
    const dir = join(root, s);
    if (!existsSync(dir)) continue;
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.isDirectory()) out.push(`${s}/${e.name}/index.html`);
      else out.push(`${s}/${e.name}`);
    }
  }
  return out;
}

export async function loadInput(root = ROOT) {
  return {
    site: JSON.parse(await readFile(join(root, 'content/site.json'), 'utf8')),
    works: await readJsonDir(join(root, 'content/works')),
    columns: await readJsonDir(join(root, 'content/column')),
    news: await readJsonDir(join(root, 'content/news')),
    indexHtml: await readFile(join(root, 'index.html'), 'utf8'),
    placeholderWorks: await readFile(join(root, 'content/partials/works-placeholder.html'), 'utf8'),
  };
}

// 作ったものと今のファイルの違い（変わる・増える・消えるファイル）
export async function diff(root, files) {
  const changed = [];
  for (const [p, body] of files) {
    const f = join(root, p);
    if (!existsSync(f) || (await readFile(f, 'utf8')) !== body) changed.push(p);
  }
  const stale = (await listGenerated(root)).filter(p => !files.has(p));
  return { changed, stale };
}

async function main() {
  const { files } = generate(await loadInput(ROOT));
  const { changed, stale } = await diff(ROOT, files);
  if (process.argv.includes('--check')) {
    if (changed.length || stale.length) {
      console.error(`作り直しが必要です（node scripts/build.mjs）：${[...changed, ...stale.map(s => `${s}（削除）`)].join(', ')}`);
      process.exit(1);
    }
    console.log('作り直しは不要です');
    return;
  }
  for (const p of stale) await rm(join(ROOT, dirname(p).split('/').length > 1 ? dirname(p) : p), { recursive: true, force: true });
  for (const p of changed) {
    await mkdir(dirname(join(ROOT, p)), { recursive: true });
    await writeFile(join(ROOT, p), files.get(p));
  }
  console.log(`作り直しました：変更 ${changed.length} 件・削除 ${stale.length} 件`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
