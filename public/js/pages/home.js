import { setupLayout, showDemoBar } from '../layout.js';
import { loadProducts } from '../lib/api.js';
import { listProducts } from '../lib/catalog.js';
import { cardHtml } from '../lib/render.js';

setupLayout();
const { products, demo } = await loadProducts();
if (demo) showDemoBar();
const latest = listProducts(products, { sort: 'new', hideSold: true }).slice(0, 8);
document.querySelector('[data-new-items]').innerHTML = latest.map(cardHtml).join('')
  || '<li class="empty">新着の準備中です。</li>';
