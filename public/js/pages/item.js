import { setupLayout, showDemoBar, escapeHtml } from '../layout.js';
import { loadProducts } from '../lib/api.js';
import { formatYen, categoryLabel } from '../lib/catalog.js';
import { imageOf, statusLabel } from '../lib/render.js';
import { readCart, addToCart } from '../lib/cart.js';

setupLayout();
const root = document.querySelector('[data-item]');
const id = new URLSearchParams(location.search).get('id');
const { products, demo } = await loadProducts();
if (demo) showDemoBar();
const p = products.find(x => x.id === id);

if (!p) {
  root.innerHTML = '<p class="empty">商品が見つかりませんでした。<br><a href="/items.html">商品一覧へ戻る</a></p>';
} else {
  document.title = `${p.name} | ${document.title}`;
  document.querySelector('[data-crumb]').textContent = p.name;
  const images = p.images?.length ? p.images : [imageOf(p)];
  const rows = [
    ['カテゴリ', categoryLabel(p.category)], ['年代', p.era], ['サイズ', p.size],
    ['実寸（cm）', p.measurements], ['状態', p.condition],
  ].filter(([, v]) => v);

  root.innerHTML = `
    <div class="gallery">
      <div class="gallery__main"><img src="${escapeHtml(images[0])}" alt="${escapeHtml(p.name)}" data-main></div>
      ${images.length > 1 ? `<div class="gallery__thumbs">${images.map((src, i) =>
        `<button type="button" data-src="${escapeHtml(src)}" aria-current="${i === 0}" aria-label="写真${i + 1}"><img src="${escapeHtml(src)}" alt=""></button>`).join('')}</div>` : ''}
    </div>
    <div>
      <h1>${escapeHtml(p.name)}</h1>
      <p class="item__price">${formatYen(p.priceJpy)} <span class="item__tax">（税込）送料別</span></p>
      <div class="item__state" data-buy></div>
      <table class="spec"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</tbody></table>
      <p>${escapeHtml(p.description).replace(/\n/g, '<br>')}</p>
      <p class="note">一点物の古着です。写真と実物で色味が多少異なる場合があります。ご購入前に状態の記載をご確認ください。</p>
    </div>`;

  root.querySelectorAll('[data-src]').forEach(btn => btn.addEventListener('click', () => {
    root.querySelector('[data-main]').src = btn.dataset.src;
    root.querySelectorAll('[data-src]').forEach(b => b.setAttribute('aria-current', String(b === btn)));
  }));

  const buy = root.querySelector('[data-buy]');
  const renderBuy = () => {
    if (p.status !== 'available') {
      buy.innerHTML = `<button class="btn btn--block" disabled>${statusLabel(p.status)}</button>`;
    } else if (readCart().includes(p.id)) {
      buy.innerHTML = '<a class="btn btn--block btn--ghost" href="/cart.html">追加済み｜カートを見る</a>';
    } else {
      buy.innerHTML = '<button class="btn btn--block" type="button" data-add>カートに入れる</button>';
      buy.querySelector('[data-add]').addEventListener('click', () => { addToCart(p.id); renderBuy(); });
    }
  };
  renderBuy();
}
