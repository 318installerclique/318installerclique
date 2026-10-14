// 商品カードなどの共通表示部品
import { escapeHtml } from '../layout.js';
import { formatYen, categoryLabel } from './catalog.js';

export function imageOf(p, i = 0) {
  return p.images?.[i] || '/img/placeholder.svg';
}

export function statusLabel(status) {
  if (status === 'sold') return 'SOLD OUT';
  if (status === 'reserved') return 'お手続き中';
  return '';
}

export function cardHtml(p) {
  const label = statusLabel(p.status);
  const meta = [p.era, categoryLabel(p.category), p.size && `SIZE ${p.size}`].filter(Boolean).join(' / ');
  return `
  <li class="card${p.status === 'sold' ? ' is-sold' : ''}">
    <a href="/item.html?id=${encodeURIComponent(p.id)}">
      <div class="card__img">
        <img src="${escapeHtml(imageOf(p))}" alt="${escapeHtml(p.name)}" loading="lazy">
        ${label ? `<span class="label">${label}</span>` : ''}
      </div>
      <p class="card__meta">${escapeHtml(meta)}</p>
      <p class="card__name">${escapeHtml(p.name)}</p>
      <p class="card__price">${formatYen(p.priceJpy)}<span class="note">（税込）</span></p>
    </a>
  </li>`;
}
