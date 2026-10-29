/* 318 INSTALLER CLIQUE — main.js（ライブラリなし）
   JS が動かない・動きを減らす設定のときは、すべて縦に並んだ普通のページとして読める */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceQuery.matches;

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* ---------- メニュー（スマホ） ---------- */
  var topbar = document.querySelector('[data-topbar]');
  var menuBtn = document.querySelector('[data-menu-button]');
  var menu = document.querySelector('[data-menu]');

  function setMenu(open) {
    topbar.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    root.style.overflow = open ? 'hidden' : '';
  }
  if (topbar && menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topbar.classList.contains('is-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- HERO：動画（data-src があるときだけ読み込む） ---------- */
  var heroVideo = document.querySelector('[data-hero-video]');
  if (heroVideo && heroVideo.dataset.src && !reduced &&
      !(navigator.connection && navigator.connection.saveData)) {
    heroVideo.poster = heroVideo.dataset.poster || '';
    heroVideo.src = heroVideo.dataset.src;
    heroVideo.addEventListener('playing', function () { heroVideo.classList.add('is-playing'); });
    var p = heroVideo.play();
    if (p && p.catch) p.catch(function () { /* 自動再生できないときは写真のまま */ });
  }

  /* ---------- 表示されたら浮かび上がる ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 横スクロール（Works / Crew） ---------- */
  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var list = rail.querySelector('[data-rail-list]');
    var prev = rail.querySelector('[data-rail-prev]');
    var next = rail.querySelector('[data-rail-next]');
    var count = rail.querySelector('[data-rail-count]');
    var items = list.children;
    var total = items.length;

    function step() {
      if (total < 2) return list.clientWidth;
      return items[1].offsetLeft - items[0].offsetLeft;
    }
    function update() {
      var max = list.scrollWidth - list.clientWidth;
      var atEnd = list.scrollLeft >= max - 2;
      var index = atEnd ? total - 1 : Math.round(list.scrollLeft / step());
      if (count) count.textContent = (index + 1) + ' / ' + total;
      if (prev) prev.disabled = list.scrollLeft <= 2;
      if (next) next.disabled = atEnd;
    }
    function go(dir) {
      list.scrollBy({ left: dir * step(), behavior: reduced ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    var ticking = false;
    list.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- PROCESS：縦スクロールで横に進む ---------- */
  var process = document.querySelector('[data-process]');
  var track = process && process.querySelector('[data-process-track]');
  var bar = process && process.querySelector('[data-process-bar]');
  var stepButtons = process ? process.querySelectorAll('[data-step]') : [];
  var panels = track ? track.children : [];
  var pinned = false;
  var range = 0; // 横に動く距離（px）

  function canPin() {
    // 動きを減らす設定・背の低い画面（スマホ横向きなど）では縦に並べる
    return !reduced && window.innerHeight >= 520;
  }

  function layoutProcess() {
    if (!process) return;
    pinned = canPin();
    process.classList.toggle('is-pinned', pinned);
    if (!pinned) {
      process.style.height = '';
      process.style.removeProperty('--pin-w');
      track.style.transform = '';
      range = 0;
      return;
    }
    // パネル1枚の幅＝画面の幅（スクロールバーの幅を除く）
    var w = process.clientWidth;
    process.style.setProperty('--pin-w', w + 'px');
    range = Math.max(0, track.scrollWidth - w);
    process.style.height = (window.innerHeight + range) + 'px';
    updateProcess();
  }

  var currentStep = -1;
  function setStep(i) {
    if (i === currentStep) return;
    currentStep = i;
    stepButtons.forEach(function (b, n) {
      if (n === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
  }

  function processProgress() {
    var top = process.getBoundingClientRect().top;
    return range > 0 ? clamp(-top / range, 0, 1) : 0;
  }

  function updateProcess() {
    if (!process) return;
    if (pinned) {
      var progress = processProgress();
      track.style.transform = 'translate3d(' + (-progress * range) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + progress + ')';
      setStep(Math.round(progress * (panels.length - 1)));
    } else {
      // 縦並びのときは、画面の中央にある工程を現在地にする
      var mid = window.innerHeight / 2;
      var active = 0;
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].getBoundingClientRect().top < mid) active = i;
      }
      var r = track.getBoundingClientRect();
      var prog = r.height > 0 ? clamp((mid - r.top) / r.height, 0, 1) : 0;
      if (bar) bar.style.transform = 'scaleX(' + prog + ')';
      setStep(active);
    }
  }

  stepButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = Number(btn.dataset.step);
      var behavior = reduced ? 'auto' : 'smooth';
      if (pinned) {
        var sectionTop = process.getBoundingClientRect().top + window.scrollY;
        var target = sectionTop + (panels.length > 1 ? range * i / (panels.length - 1) : 0);
        window.scrollTo({ top: Math.ceil(target), behavior: behavior });
      } else if (panels[i]) {
        panels[i].scrollIntoView({ behavior: behavior, block: 'center' });
      }
    });
  });

  /* ---------- HERO：スクロールで写真がゆっくり動き、文字が薄れる ---------- */
  var heroMedia = document.querySelector('[data-hero-media]');
  var heroCopy = document.querySelector('[data-hero-copy]');

  function updateHero() {
    if (reduced || !heroMedia) return;
    var y = window.scrollY;
    var h = window.innerHeight;
    if (y > h * 1.2) return;
    heroMedia.style.transform = 'translate3d(0,' + (y * 0.28) + 'px,0)';
    if (heroCopy) heroCopy.style.opacity = String(clamp(1 - y / (h * 0.75), 0, 1));
  }
  function resetHero() {
    if (heroMedia) heroMedia.style.transform = '';
    if (heroCopy) heroCopy.style.opacity = '';
  }

  /* ---------- スクロール・画面サイズの変化 ---------- */
  var frame = 0;
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      updateHero();
      updateProcess();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  var lastW = window.innerWidth;
  var lastH = window.innerHeight;
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // スマホでアドレスバーが出入りするだけの高さ変化（小さい差）は無視して、ガタつきを防ぐ
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
      lastW = window.innerWidth;
      lastH = window.innerHeight;
      layoutProcess();
    }, 150);
  });

  function onReduceChange(e) {
    reduced = e.matches;
    if (reduced) {
      resetHero();
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }
    layoutProcess();
    onScroll();
  }
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduceChange);
  else if (reduceQuery.addListener) reduceQuery.addListener(onReduceChange);

  // 写真の読み込みで横幅が変わることがあるので、読み込み後にもう一度測る
  layoutProcess();
  window.addEventListener('load', layoutProcess);
  onScroll();

  /* ---------- CONTACT：相談の区分（法人／個人）の切り替え。送信はしない ---------- */
  var contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    var radios = contactForm.querySelectorAll('[data-contact-radio]');
    var setType = function (type) {
      var corporate = type !== 'personal';
      radios.forEach(function (r) { r.checked = (r.value === 'corporate') === corporate; });
      contactForm.querySelectorAll('[data-only="corporate"]').forEach(function (el) {
        el.hidden = !corporate;
        el.querySelectorAll('input').forEach(function (i) { i.required = corporate; }); // 会社名は法人だけ必須
      });
      contactForm.querySelectorAll('[data-label-corporate]').forEach(function (el) { el.hidden = !corporate; });
      contactForm.querySelectorAll('[data-label-personal]').forEach(function (el) { el.hidden = corporate; });
    };
    radios.forEach(function (r) { r.addEventListener('change', function () { setType(r.value); }); });
    // 受付を始めるまでは、どこにも送らない（通信しない・保存しない）
    contactForm.addEventListener('submit', function (e) { e.preventDefault(); });
    // 「施工協力について相談する」などから来たら、その区分を選んだ状態にする
    document.querySelectorAll('a[data-contact-type]').forEach(function (a) {
      a.addEventListener('click', function () { setType(a.getAttribute('data-contact-type')); });
    });
    setType('corporate');
  }

  /* ---------- 年 ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
