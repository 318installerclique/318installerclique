
// 318 Installer Clique – base JS (no frameworks)
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Simple in-page nav highlight (on scroll)
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav a');
  const onScroll = () => {
    let current = '';
    sections.forEach(sec => {
      const top = window.scrollY;
      const offset = sec.offsetTop - 120;
      const height = sec.offsetHeight;
      if (top >= offset && top < offset + height) current = sec.getAttribute('id');
    });
    navLinks.forEach(a => {
      a.removeAttribute('aria-current');
      if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'page');
    });
  };
  window.addEventListener('scroll', onScroll);
  onScroll();

  // Inquiry form (dummy handler)
  const form = document.querySelector('#inquiry-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      // TODO: integrate with a real backend (e.g., Web3Forms, Supabase, Cloudflare Workers, or Next.js API route)
      alert('送信ありがとうございます！\n担当者より24時間以内にご連絡します。\n\nお名前: ' + (data.name || '') + '\n連絡先: ' + (data.contact || '') + '\n内容: ' + (data.message || ''));
      form.reset();
    });
  }
});
