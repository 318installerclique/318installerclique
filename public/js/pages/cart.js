import { setupLayout, showDemoBar, escapeHtml } from '../layout.js';
import { loadProducts, startCheckout } from '../lib/api.js';
import { cartSummary, formatYen } from '../lib/catalog.js';
import { imageOf, statusLabel } from '../lib/render.js';
import { readCart, removeFromCart, writeCart } from '../lib/cart.js';
import { SHIPPING } from '../config.js';

setupLayout();
const root = document.querySelector('[data-cart]');
const msg = document.querySelector('[data-message]');
if (new URLSearchParams(location.search).get('canceled')) {
  msg.innerHTML = '<p class="notice">お支払いは完了していません。カートの商品はそのまま残っています。</p>';
}

const { products, demo } = await loadProducts();
if (demo) showDemoBar();

function render() {
  const ids = readCart();
  const s = cartSummary(ids, products, SHIPPING);
  if (s.missing.length) writeCart(ids.filter(id => !s.missing.includes(id))); // 削除された商品を除く
  if (ids.length === 0) {
    root.innerHTML = '<p class="empty">カートに商品はありません。<br><a href="/items.html">商品一覧へ</a></p>';
    return;
  }
  const line = (p, ok) => `
    <li class="cart-line${ok ? '' : ' is-unavailable'}">
      <img src="${escapeHtml(imageOf(p))}" alt="">
      <div>
        <p class="cart-line__name"><a href="/item.html?id=${encodeURIComponent(p.id)}">${escapeHtml(p.name)}</a></p>
        <p class="cart-line__price">${ok ? formatYen(p.priceJpy) : statusLabel(p.status) + '（購入できません）'}</p>
      </div>
      <button class="link-btn" type="button" data-remove="${escapeHtml(p.id)}">削除</button>
    </li>`;
  root.innerHTML = `
    ${s.unavailable.length ? '<p class="notice notice--alert">売り切れ・お手続き中の商品があります。削除してからお進みください。</p>' : ''}
    <ul class="cart-list">${s.buyable.map(p => line(p, true)).join('')}${s.unavailable.map(p => line(p, false)).join('')}</ul>
    <div class="totals">
      <div><span>小計</span><span>${formatYen(s.subtotal)}</span></div>
      <div><span>${s.shippingFee === 0 && s.buyable.length ? '送料無料' : SHIPPING.label}</span><span>${formatYen(s.shippingFee)}</span></div>
      <div class="grand"><span>合計（税込）</span><span>${formatYen(s.total)}</span></div>
    </div>
    <div class="cart-actions">
      <button class="btn btn--block" type="button" data-checkout ${s.buyable.length === 0 || s.unavailable.length || demo ? 'disabled' : ''}>購入手続きへ</button>
      ${demo ? '<p class="note">デモ表示中のため購入はできません。</p>' : '<p class="note">次の画面（Stripe）でカード情報とお届け先を入力します。</p>'}
      <a class="btn btn--block btn--ghost" href="/items.html">買い物を続ける</a>
    </div>`;

  root.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { removeFromCart(b.dataset.remove); render(); }));
  root.querySelector('[data-checkout]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = '処理中…';
    const r = await startCheckout(s.buyable.map(p => p.id));
    if (r.ok && r.url) { location.href = r.url; return; }
    msg.innerHTML = r.status === 409
      ? '<p class="notice notice--alert">申し訳ありません。他のお客様が先にお手続き中の商品がありました。カートを更新しました。</p>'
      : '<p class="notice notice--alert">エラーが発生しました。時間をおいて再度お試しください。</p>';
    if (r.unavailable) r.unavailable.forEach(u => { const p = products.find(x => x.id === u.id); if (p) p.status = u.reason === 'sold' ? 'sold' : 'reserved'; });
    render();
  });
}
render();
