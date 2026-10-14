import { setupLayout, showDemoBar, escapeHtml } from '../layout.js';
import { loadProducts } from '../lib/api.js';
import { listProducts, paginate, categoryLabel } from '../lib/catalog.js';
import { cardHtml } from '../lib/render.js';
import { CATEGORIES } from '../config.js';

setupLayout();
const params = new URLSearchParams(location.search);
const state = {
  category: params.get('category') || '',
  sort: params.get('sort') || 'new',
  hideSold: params.get('hide_sold') === '1',
  page: params.get('page') || 1,
};

const catSel = document.getElementById('category');
catSel.innerHTML = '<option value="">すべてのカテゴリ</option>' + CATEGORIES
  .map(c => `<option value="${c.id}"${c.id === state.category ? ' selected' : ''}>${escapeHtml(c.label)}</option>`).join('');
document.getElementById('sort').value = state.sort;
document.getElementById('hide-sold').checked = state.hideSold;

function go(changes) {
  const q = new URLSearchParams();
  const next = { ...state, page: 1, ...changes };
  if (next.category) q.set('category', next.category);
  if (next.sort !== 'new') q.set('sort', next.sort);
  if (next.hideSold) q.set('hide_sold', '1');
  if (Number(next.page) > 1) q.set('page', next.page);
  location.search = q.toString();
}
catSel.addEventListener('change', () => go({ category: catSel.value }));
document.getElementById('sort').addEventListener('change', e => go({ sort: e.target.value }));
document.getElementById('hide-sold').addEventListener('change', e => go({ hideSold: e.target.checked }));

if (state.category) {
  document.querySelector('[data-title]').textContent = categoryLabel(state.category) || 'Items';
}

const { products, demo } = await loadProducts();
if (demo) showDemoBar();
const list = listProducts(products, state);
const { items, page, totalPages } = paginate(list, state.page);
document.querySelector('[data-count]').textContent = `${list.length}点`;
document.querySelector('[data-grid]').innerHTML = items.map(cardHtml).join('');
document.querySelector('[data-empty]').hidden = items.length > 0;
const pager = document.querySelector('[data-pager]');
pager.innerHTML = totalPages <= 1 ? '' : Array.from({ length: totalPages }, (_, i) => {
  const n = i + 1;
  if (n === page) return `<span aria-current="page">${n}</span>`;
  const q = new URLSearchParams(location.search); q.set('page', n);
  return `<a href="?${q}">${n}</a>`;
}).join('');
