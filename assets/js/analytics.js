/* 318 INSTALLER CLIQUE — アクセス計測（GA4。SIDE B とは別のプロパティ）
   - GA4_ID が空の間は何もしない（何も読み込まず、どこにも送らない）
   - 送るのは、表示中のホスト名が PRODUCTION_HOSTS と完全一致するときだけ。
     確認用アドレス（〇〇.318-installer-clique.pages.dev）・手元（localhost）では送らない
   - 測るもの：ページの閲覧（GA4 の標準）、Instagram のリンク（instagram_click）、相談の入口（contact_cta_click）。
     ボタンを押したことと、問い合わせが届いたことは別（フォームの送信は受付開始まで無い）
   - 設定の手順：docs/search-console-ga4.md */
(function () {
  'use strict';
  var GA4_ID = '';                                   // 318 専用の測定ID（G-…）。正式公開の承認後に入れる
  var PRODUCTION_HOSTS = ['318-installer-clique.pages.dev']; // 本番のホスト名（完全一致）。独自ドメインにしたら差し替える

  function shouldSend(id, host, hosts) {
    return Boolean(id) && hosts.indexOf(String(host || '').toLowerCase()) !== -1;
  }
  // テスト用（tests/analytics.test.mjs）
  if (typeof module !== 'undefined') { module.exports = { shouldSend: shouldSend }; return; }

  if (!shouldSend(GA4_ID, location.hostname, PRODUCTION_HOSTS)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
  document.head.appendChild(s);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-track]');
    if (a) window.gtag('event', a.getAttribute('data-track'), { link_url: a.href || '' });
  });
})();
