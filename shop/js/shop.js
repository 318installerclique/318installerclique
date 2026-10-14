// 画面の動き（メニュー開閉・お気に入り・商品一覧の描画）
import { PRODUCTS, CATEGORIES } from './products.js';
import { filterByCategory, paginate, formatPrice, imageOf } from './catalog.js';

const FAV_KEY = 'shop318:favorites';

function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { return new Set(); }
}
function saveFavs(favs) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch { /* 保存できない環境では無視 */ }
}

const favs = loadFavs();

function updateFavBadge() {
  const badge = document.querySelector('[data-fav-count]');
  if (!badge) return;
  badge.textContent = favs.size;
  badge.hidden = favs.size === 0;
}

function setupDrawer() {
  const drawer = document.querySelector('.drawer');
  if (!drawer) return;
  document.querySelector('.menu-btn')?.addEventListener('click', () => drawer.classList.add('is-open'));
  drawer.querySelector('.drawer__close')?.addEventListener('click', () => drawer.classList.remove('is-open'));
}

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cardHtml(p) {
  const pressed = favs.has(p.id);
  return `
    <li class="card${p.soldOut ? ' is-sold' : ''}">
      <div class="card__img">
        <img src="${escapeHtml(imageOf(p))}" alt="${escapeHtml(p.name)}" loading="lazy">
        ${p.soldOut ? '<span class="sold">SOLD OUT</span>' : ''}
        <button class="fav" type="button" data-fav="${escapeHtml(p.id)}" aria-pressed="${pressed}" aria-label="お気に入り">${HEART}</button>
      </div>
      <span class="tag">${escapeHtml(p.store)}</span>
      <p class="card__name">${escapeHtml(p.name)}</p>
      <p class="card__price">${formatPrice(p.price)}</p>
    </li>`;
}

function pageUrl(params, page) {
  const q = new URLSearchParams(params);
  q.set('page', page);
  return '?' + q.toString();
}

function renderList() {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const category = params.get('category') || '';
  const onlyFav = params.get('fav') === '1';

  const select = document.querySelector('[data-category]');
  select.innerHTML = '<option value="">Category</option>' +
    CATEGORIES.map(c => `<option value="${escapeHtml(c)}"${c === category ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
  select.addEventListener('change', () => {
    const q = new URLSearchParams();
    if (select.value) q.set('category', select.value);
    location.search = q.toString();
  });

  let list = filterByCategory(PRODUCTS, category);
  if (onlyFav) list = list.filter(p => favs.has(p.id));
  const { items, page, totalPages } = paginate(list, params.get('page'));

  grid.innerHTML = items.length ? items.map(cardHtml).join('') : '';
  document.querySelector('[data-empty]').hidden = items.length > 0;

  const pager = document.querySelector('[data-pager]');
  pager.innerHTML = totalPages <= 1 ? '' : Array.from({ length: totalPages }, (_, i) => {
    const n = i + 1;
    return n === page ? `<span aria-current="page">${n}</span>` : `<a href="${pageUrl(params, n)}">${n}</a>`;
  }).join('');

  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    const id = btn.dataset.fav;
    favs.has(id) ? favs.delete(id) : favs.add(id);
    btn.setAttribute('aria-pressed', favs.has(id));
    saveFavs(favs);
    updateFavBadge();
  });
}

setupDrawer();
updateFavBadge();
renderList();
