(function () {
  'use strict';

  var FRAME_KEY = 'bongrae-portfolio';
  var STYLE_ID = 'bongrae-portfolio-parent-style';
  var NAV_ID = 'bongrae-portfolio-parent-nav';
  var MODAL_ID = 'bongrae-portfolio-image-modal';
  var lastHeight = 0;
  var timer = null;
  var menu = [
    { id: 'intro', label: '작가 소개' },
    { id: 'notice', label: '작업 전 안내' },
    { id: 'calendar', label: '작업 캘린더' },
    { id: 'process', label: '작업 프로세스' },
    { id: 'price', label: '가격 안내' },
    { id: 'portfolio', label: '포트폴리오' },
    { id: 'form', label: '신청 양식' }
  ];

  function frame() {
    return document.querySelector('iframe[src*="' + FRAME_KEY + '"], section[name="am-root"] iframe, [name="am-root"] iframe');
  }

  function origin() {
    var iframe = frame();
    if (!iframe || !iframe.src) return '*';
    try { return new URL(iframe.src, location.href).origin; } catch (e) { return '*'; }
  }

  function scrollY() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function css() {
    var old = document.getElementById(STYLE_ID);
    if (old) old.remove();
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '.bongrae-parent-nav{position:fixed;right:22px;top:24px;z-index:999999;width:206px;font-family:Escoredream,Pretendard,Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#2d2638}.bongrae-parent-nav__box{overflow:hidden;border:1px solid rgba(169,128,255,.34);border-radius:22px;background:rgba(255,255,255,.9);box-shadow:0 22px 60px rgba(78,42,132,.18);backdrop-filter:blur(14px)}.bongrae-parent-nav__head{padding:17px 16px 13px;text-align:center;font-size:13px;font-weight:800;letter-spacing:.13em;color:#7a4fed;background:linear-gradient(135deg,rgba(244,237,255,.95),rgba(255,241,249,.9));border-bottom:1px solid rgba(169,128,255,.16)}.bongrae-parent-nav__list{display:flex;flex-direction:column;padding:9px}.bongrae-parent-nav__btn{appearance:none;border:0;background:transparent;border-radius:15px;padding:11px 14px;text-align:left;font:inherit;font-size:14px;font-weight:700;color:#383142;cursor:pointer;transition:background .18s ease,color .18s ease,transform .18s ease}.bongrae-parent-nav__btn:hover,.bongrae-parent-nav__btn.is-active{background:linear-gradient(90deg,rgba(130,83,255,.13),rgba(255,118,190,.12));color:#6f3fe0;transform:translateX(2px)}.bongrae-parent-modal{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:34px;background:rgba(27,21,36,.64);backdrop-filter:blur(8px)}.bongrae-parent-modal.is-open{display:flex}.bongrae-parent-modal__panel{position:relative;width:auto;max-width:min(94vw,1280px);max-height:90vh;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.34);overflow:hidden}.bongrae-parent-modal__img{display:block;max-width:100%;max-height:90vh;object-fit:contain}.bongrae-parent-modal__video{display:block;width:min(92vw,1080px);aspect-ratio:16/9;border:0;background:#000}.bongrae-parent-modal__close{position:absolute;top:12px;right:12px;width:42px;height:42px;border:1px solid rgba(135,92,234,.35);border-radius:50%;background:rgba(255,255,255,.92);color:#6f3fe0;font-size:26px;font-weight:800;cursor:pointer}@media(max-width:920px){.bongrae-parent-nav{display:none!important}}';
    document.head.appendChild(style);
  }

  function removeArtmugButton() {
    document.querySelectorAll('.btn_open_btn,.btn_open,.btn_close').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.detailinfo,.detailinfo .showcontent').forEach(function (el) {
      el.classList.remove('showstep1');
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });
  }

  function sendViewport() {
    var iframe = frame();
    if (!iframe || !iframe.contentWindow) return;
    var rect = iframe.getBoundingClientRect();
    iframe.contentWindow.postMessage({
      source: 'bongrae-parent',
      type: 'BONGRAE_PARENT_VIEWPORT',
      iframeTop: rect.top,
      iframeHeight: rect.height,
      viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
      scrollY: scrollY()
    }, origin());
  }

  function setHeight(value) {
    var iframe = frame();
    var next = Math.max(720, Math.ceil(Number(value) || 0) + 24);
    if (!iframe || !next || Math.abs(next - lastHeight) < 50) return;
    iframe.style.width = '100%';
    iframe.style.maxWidth = '1180px';
    iframe.style.margin = '0 auto';
    iframe.style.height = next + 'px';
    iframe.style.minHeight = '720px';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.height = String(next);
    iframe.setAttribute('height', String(next));
    iframe.setAttribute('scrolling', 'no');
    lastHeight = next;
    sendViewport();
  }

  function parentScrollTo(y) {
    var iframe = frame();
    if (!iframe) return;
    var top = scrollY() + iframe.getBoundingClientRect().top + Number(y || 0) - 14;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function buildNav() {
    var old = document.getElementById(NAV_ID);
    if (old) old.remove();
    var wrap = document.createElement('nav');
    wrap.id = NAV_ID;
    wrap.className = 'bongrae-parent-nav';
    var box = document.createElement('div');
    box.className = 'bongrae-parent-nav__box';
    var head = document.createElement('div');
    head.className = 'bongrae-parent-nav__head';
    head.textContent = 'BONG RAE';
    var list = document.createElement('div');
    list.className = 'bongrae-parent-nav__list';
    menu.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bongrae-parent-nav__btn';
      btn.dataset.target = item.id;
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        var iframe = frame();
        if (!iframe || !iframe.contentWindow) return;
        iframe.contentWindow.postMessage({ source: 'bongrae-parent', type: 'BONGRAE_NAV_TO', sectionId: item.id }, origin());
      });
      list.appendChild(btn);
    });
    box.appendChild(head);
    box.appendChild(list);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
  }

  function active(id) {
    document.querySelectorAll('.bongrae-parent-nav__btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.target === id);
    });
  }

  function modal() {
    var m = document.getElementById(MODAL_ID);
    if (m) return m;
    m = document.createElement('div');
    m.id = MODAL_ID;
    m.className = 'bongrae-parent-modal';
    m.innerHTML = '<div class="bongrae-parent-modal__panel"><button type="button" class="bongrae-parent-modal__close" aria-label="닫기">×</button><img class="bongrae-parent-modal__img" alt="작업물 크게 보기"><iframe class="bongrae-parent-modal__video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
    m.querySelector('button').addEventListener('click', closeModal);
    document.body.appendChild(m);
    return m;
  }

  function openModal(src, kind) {
    if (!src) return;
    var m = modal();
    var img = m.querySelector('img');
    var video = m.querySelector('iframe');
    if (kind === 'video') {
      img.style.display = 'none';
      img.removeAttribute('src');
      video.style.display = 'block';
      video.src = src;
    } else {
      video.style.display = 'none';
      video.removeAttribute('src');
      img.style.display = 'block';
      img.src = src;
    }
    m.classList.add('is-open');
  }

  function closeModal() {
    var m = document.getElementById(MODAL_ID);
    if (!m) return;
    m.classList.remove('is-open');
    var img = m.querySelector('img');
    var video = m.querySelector('iframe');
    if (img) img.removeAttribute('src');
    if (video) video.removeAttribute('src');
  }

  function bind() {
    if (window.__bongraeParentBound) return;
    window.__bongraeParentBound = true;
    window.addEventListener('message', function (event) {
      var iframe = frame();
      if (!iframe) return;
      var expected = origin();
      if (expected !== '*' && event.origin !== expected) return;
      var data = event.data || {};
      if (data.source !== 'bongrae-portfolio') return;
      if (data.type === 'BONGRAE_HEIGHT') setHeight(data.height);
      if (data.type === 'BONGRAE_SCROLL_PARENT') parentScrollTo(data.targetY);
      if (data.type === 'BONGRAE_ACTIVE') active(data.sectionId);
      if (data.type === 'BONGRAE_OPEN_IMAGE') openModal(data.src, 'image');
      if (data.type === 'BONGRAE_OPEN_MEDIA') openModal(data.src, data.mediaType);
      if (data.type === 'BONGRAE_READY') sendViewport();
    });
    window.addEventListener('scroll', sendViewport, { passive: true });
    window.addEventListener('resize', sendViewport);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  function prepare() {
    var iframe = frame();
    if (!iframe) return;
    iframe.style.width = '100%';
    iframe.style.maxWidth = '1180px';
    iframe.style.margin = '0 auto';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('scrolling', 'no');
    if (!iframe.dataset.bongraeBound) {
      iframe.dataset.bongraeBound = '1';
      iframe.addEventListener('load', function () { [80, 220, 700, 1400].forEach(function (ms) { setTimeout(sendViewport, ms); }); });
    }
  }

  function run() {
    css();
    removeArtmugButton();
    bind();
    buildNav();
    prepare();
    sendViewport();
  }

  function watch() {
    if (window.__bongraeParentWatching) return;
    window.__bongraeParentWatching = true;
    var mo = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () { removeArtmugButton(); prepare(); sendViewport(); }, 120);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    [300, 900, 1800, 3200, 5200].forEach(function (ms) { setTimeout(run, ms); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { run(); watch(); });
  else { run(); watch(); }
})();
