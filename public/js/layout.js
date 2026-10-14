// 全ページ共通: ヘッダー・メニュー・フッター・カート件数・デモ表示
import { STORE } from './config.js';
import { readCart } from './lib/cart.js';

const ICONS = {
  items: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18l-2 11H5L3 9zM8 9l4-5 4 5"/></svg>',
  insta: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14"/><path d="M3 5l9 8 9-8"/></svg>',
};

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function headerHtml() {
  const insta = STORE.instagramUrl
    ? `<a href="${escapeHtml(STORE.instagramUrl)}" target="_blank" rel="noopener">${ICONS.insta}<span>INSTAGRAM</span></a>`
    : `<a href="#" aria-disabled="true" title="準備中">${ICONS.insta}<span>INSTAGRAM</span></a>`;
  return `
  <header class="site-header">
    <div class="site-header__inner">
      <a class="brand" href="/">
        <span class="brand__name">${escapeHtml(STORE.name)}</span>
        <span class="brand__sub">${escapeHtml(STORE.tagline)}</span>
      </a>
      <button class="menu-btn" type="button" aria-label="メニューを開く" aria-controls="drawer" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </header>
  <nav class="iconbar" aria-label="ショートカット">
    <ul>
      <li><a href="/items.html">${ICONS.items}<span>ITEMS</span></a></li>
      <li><a href="/cart.html">${ICONS.cart}<span>CART</span><span class="badge" data-cart-count hidden>0</span></a></li>
      <li>${insta}</li>
      <li><a href="/contact.html">${ICONS.mail}<span>CONTACT</span></a></li>
    </ul>
  </nav>
  <nav class="drawer" id="drawer" aria-label="メニュー">
    <button class="drawer__close" type="button" aria-label="閉じる">×</button>
    <a href="/">トップ</a>
    <a href="/items.html">商品一覧</a>
    <a href="/cart.html">カート</a>
    <a href="/guide.html">ご利用ガイド（送料・返品）</a>
    <a href="/contact.html">お問い合わせ</a>
    <a href="/legal/tokushoho.html">特定商取引法に基づく表記</a>
    <a href="/legal/privacy.html">プライバシーポリシー</a>
  </nav>`;
}

function footerHtml() {
  return `
  <footer class="site-footer">
    <nav aria-label="フッター">
      <a href="/guide.html">ご利用ガイド</a>
      <a href="/contact.html">お問い合わせ</a>
      <a href="/legal/tokushoho.html">特定商取引法に基づく表記</a>
      <a href="/legal/privacy.html">プライバシーポリシー</a>
    </nav>
    <p>古物商許可番号：<span data-kobutsu>【取得後に記載】</span></p>
    <p>© ${new Date().getFullYear()} ${escapeHtml(STORE.name)}</p>
  </footer>`;
}

function updateCartBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const n = readCart().length;
  badge.textContent = n;
  badge.hidden = n === 0;
}

export function showDemoBar() {
  if (document.querySelector('.demo-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.textContent = 'デモ表示中：サンプル商品です。購入はできません。';
  document.body.prepend(bar);
}

export function setupLayout() {
  document.getElementById('site-header').outerHTML = headerHtml();
  document.getElementById('site-footer').outerHTML = footerHtml();

  const drawer = document.getElementById('drawer');
  const btn = document.querySelector('.menu-btn');
  const close = () => { drawer.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => { drawer.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); });
  drawer.querySelector('.drawer__close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  if (document.title.includes('{STORE}')) document.title = document.title.replace('{STORE}', STORE.name);
  updateCartBadge();
  window.addEventListener('cart:change', updateCartBadge);
  window.addEventListener('storage', updateCartBadge);
}
