// 文章だけのページ（ガイド・法定表示など）用
import { setupLayout } from '../layout.js';
import { STORE } from '../config.js';

setupLayout();
document.querySelectorAll('[data-store-name]').forEach(el => { el.textContent = STORE.name; });
document.querySelectorAll('[data-contact-email]').forEach(el => {
  if (STORE.contactEmail) { el.innerHTML = `<a href="mailto:${STORE.contactEmail}">${STORE.contactEmail}</a>`; }
});
