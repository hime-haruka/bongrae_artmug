(function () {
  'use strict';

  var CSV = {
    intro: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPdCvxtTw-U_wwtEYwen3WQYlbfoCnkKcJYgskKlgKC9PcPR9SQ5dp3nN6MmTaIviL3X9PV3GkQk7R/pub?gid=0&single=true&output=csv',
    notice: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPdCvxtTw-U_wwtEYwen3WQYlbfoCnkKcJYgskKlgKC9PcPR9SQ5dp3nN6MmTaIviL3X9PV3GkQk7R/pub?gid=1628380714&single=true&output=csv',
    calendar: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPdCvxtTw-U_wwtEYwen3WQYlbfoCnkKcJYgskKlgKC9PcPR9SQ5dp3nN6MmTaIviL3X9PV3GkQk7R/pub?gid=1261482604&single=true&output=csv',
    process: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPdCvxtTw-U_wwtEYwen3WQYlbfoCnkKcJYgskKlgKC9PcPR9SQ5dp3nN6MmTaIviL3X9PV3GkQk7R/pub?gid=463563965&single=true&output=csv',
    price: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPdCvxtTw-U_wwtEYwen3WQYlbfoCnkKcJYgskKlgKC9PcPR9SQ5dp3nN6MmTaIviL3X9PV3GkQk7R/pub?gid=1550810011&single=true&output=csv',
    portfolio: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTPdCvxtTw-U_wwtEYwen3WQYlbfoCnkKcJYgskKlgKC9PcPR9SQ5dp3nN6MmTaIviL3X9PV3GkQk7R/pub?gid=1822842033&single=true&output=csv'
  };
  var state = { calendarRows: [], calendarDate: new Date(), parentViewport: null };
  var lastSentHeight = 0;
  var heightTimer = null;
  var ids = ['intro', 'notice', 'calendar', 'process', 'price', 'portfolio', 'form'];

  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>'"]/g, function (s) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[s]; }); }
  function text(v) { return String(v == null ? '' : v).trim(); }
  function num(v) { return Number(String(v || '').replace(/[^0-9.-]/g, '')) || 0; }
  function cacheUrl(url) { return url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now(); }
  function empty(label) { return '<div class="empty">' + esc(label) + ' 데이터가 아직 없습니다.</div>'; }

  function parseCSV(str) {
    var rows = [];
    var row = [];
    var value = '';
    var quote = false;
    for (var i = 0; i < str.length; i += 1) {
      var c = str[i];
      var n = str[i + 1];
      if (quote) {
        if (c === '"' && n === '"') { value += '"'; i += 1; }
        else if (c === '"') quote = false;
        else value += c;
      } else {
        if (c === '"') quote = true;
        else if (c === ',') { row.push(value); value = ''; }
        else if (c === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
        else if (c !== '\r') value += c;
      }
    }
    row.push(value);
    rows.push(row);
    var headers = (rows.shift() || []).map(function (h) { return text(h); });
    return rows.filter(function (r) { return r.some(function (v) { return text(v); }); }).map(function (r) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = text(r[i]); });
      return obj;
    });
  }

  function fetchCSV(url) {
    return fetch(cacheUrl(url), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('CSV load failed');
      return res.text();
    }).then(parseCSV);
  }

  function groupBy(rows, key) {
    return rows.reduce(function (acc, row) {
      var k = text(row[key]) || '기타';
      if (!acc[k]) acc[k] = [];
      acc[k].push(row);
      return acc;
    }, {});
  }

  function driveImage(url) {
    var src = text(url);
    var m = src.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1200';
    m = src.match(/[?&]id=([^&]+)/);
    if (src.indexOf('drive.google.com') > -1 && m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1200';
    return src;
  }

  function youtubeId(url) {
    var src = text(url);
    var id = '';
    var m = src.match(/[?&]v=([^&]+)/);
    if (m) id = m[1];
    m = src.match(/youtu\.be\/([^?&/]+)/);
    if (m) id = m[1];
    m = src.match(/shorts\/([^?&/]+)/);
    if (m) id = m[1];
    return id;
  }

  function youtubeIsShorts(url) {
    var src = text(url);
    return /(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/|\/shorts\/)/i.test(src);
  }

  function youtubeEmbed(url) {
    var id = youtubeId(url);
    return id ? 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0' : '';
  }

  function youtubeThumb(url) {
    var id = youtubeId(url);
    return id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  function youtubeFallbackThumb(url) {
    var id = youtubeId(url);
    return id ? 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg' : '';
  }

  function youtubeAltThumb(url) {
    var id = youtubeId(url);
    return id ? 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg' : '';
  }

  function youtubeLastThumb(url) {
    var id = youtubeId(url);
    return id ? 'https://i.ytimg.com/vi/' + id + '/default.jpg' : '';
  }

  function renderIntro(rows) {
    var r = rows[0] || {};
    var badges = text(r.badge).split(/\s+/).filter(Boolean).map(function (b) { return '<span class="badge">' + esc(b) + '</span>'; }).join('');
    el('introContent').classList.remove('skeleton-card');
    el('introContent').innerHTML = rows.length ? '<img class="intro__image" src="' + esc(driveImage(r.image)) + '" alt="' + esc(r.name) + ' 프로필" onerror="this.style.display=\'none\'"><div><h3 class="intro__name">' + esc(r.name) + '</h3><p class="intro__sub">@' + esc(r.sub) + '</p><p class="intro__desc">' + esc(r.desc) + '</p><div class="badges">' + badges + '</div></div>' : empty('작가 소개');
  }

  function renderNotice(rows) {
    if (!rows.length) { el('noticeContent').innerHTML = empty('작업 전 안내'); return; }
    rows.sort(function (a, b) { return num(a.c_order) - num(b.c_order) || num(a.order) - num(b.order); });
    var groups = groupBy(rows, 'category');
    el('noticeContent').innerHTML = Object.keys(groups).map(function (name) {
      return '<article class="notice-card"><h3>' + esc(name) + '</h3><ul class="notice-list">' + groups[name].map(function (r) { return '<li><span>' + esc(r.desc).replace(/&quot;([^&]+)&quot;/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</span></li>'; }).join('') + '</ul></article>';
    }).join('');
  }

  function dateOnly(s) { var p = text(s).split('-').map(Number); return new Date(p[0] || 2000, (p[1] || 1) - 1, p[2] || 1); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function between(day, s, e) { var d = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime(); return d >= dateOnly(s).getTime() && d <= dateOnly(e || s).getTime(); }

  function renderCalendar(rows) {
    state.calendarRows = rows;
    var target = state.calendarDate;
    var y = target.getFullYear();
    var m = target.getMonth();
    var first = new Date(y, m, 1);
    var start = new Date(y, m, 1 - first.getDay());
    document.querySelector('[data-cal-title]').textContent = y + '. ' + String(m + 1).padStart(2, '0');
    var html = ['일', '월', '화', '수', '목', '금', '토'].map(function (d) { return '<div class="cal-cell cal-head-cell"><b>' + d + '</b></div>'; }).join('');
    for (var i = 0; i < 42; i += 1) {
      var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var events = rows.filter(function (r) { return between(day, r.date_s, r.date_e); });
      var colorClass = events.some(function (ev) { return String(ev.color || '').toLowerCase() === 'off'; }) ? ' is-off' : (events.length ? ' is-working' : '');
      html += '<div class="cal-cell' + (day.getMonth() !== m ? ' is-muted' : '') + colorClass + '"><span class="cal-day">' + day.getDate() + '</span>' + events.map(function (ev) { return '<span class="cal-event ' + esc((ev.color || '').toLowerCase()) + '">' + esc(ev.label) + '</span>'; }).join('') + '</div>';
    }
    el('calendarContent').innerHTML = html;
    requestHeight(80);
  }

  function renderProcess(rows) {
    rows.sort(function (a, b) { return num(a.step) - num(b.step); });
    el('processContent').innerHTML = rows.length ? rows.map(function (r) { return '<li><b>' + String(num(r.step)).padStart(2, '0') + '</b><span>' + esc(r.text) + '</span></li>'; }).join('') : empty('작업 프로세스');
  }

  function priceText(v) {
    var raw = text(v);
    if (!raw) return '협의';
    if (/nan/i.test(raw)) return '협의';
    if (raw.indexOf('~') > -1) {
      var parts = raw.split('~').map(function (part) {
        var n = Number(String(part).replace(/[^0-9]/g, ''));
        return n ? n.toLocaleString('ko-KR') : text(part);
      }).filter(Boolean);
      return parts.join('~') + '원';
    }
    if (/^[0-9,]+원?$/.test(raw)) return Number(raw.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') + '원';
    if (/^[0-9,]+~?$/.test(raw)) return Number(raw.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') + (raw.indexOf('~') > -1 ? '~' : '') + '원';
    return esc(raw);
  }

  function renderPrice(rows) {
    if (!rows.length) { el('priceContent').innerHTML = empty('가격 안내'); return; }
    rows.sort(function (a, b) { return num(a.c_order) - num(b.c_order); });
    var cats = groupBy(rows, 'category');
    el('priceContent').innerHTML = Object.keys(cats).map(function (cat) {
      var groups = groupBy(cats[cat], 'group');
      var groupKeys = Object.keys(groups);
      return '<article class="price-category"><h3>' + esc(cat) + '</h3><div class="price-grid">' + groupKeys.map(function (g) {
        var groupRows = groups[g];
        var desc = groupRows.find(function (r) { return r.desc; });
        var title = text(g);
        var showTitle = title && title !== '기타' && title !== cat;
        return '<section class="price-group' + (!showTitle ? ' is-simple' : '') + '">' + (showTitle ? '<h4>' + esc(title) + '</h4>' : '') + (desc ? '<p>' + esc(desc.desc) + '</p>' : '') + '<div class="price-items">' + groupRows.map(function (r) {
          var option = text(r.option) || '옵션';
          return '<div class="price-card"><div><span>' + esc(option) + '</span></div><strong>' + priceText(r.price) + '</strong></div>';
        }).join('') + '</div></section>';
      }).join('') + '</div></article>';
    }).join('');
  }

  function renderPortfolio(rows) {
    if (!rows.length) { el('portfolioContent').innerHTML = empty('포트폴리오'); return; }
    rows.sort(function (a, b) { return num(a.c_order) - num(b.c_order) || num(a.order) - num(b.order); });
    var cats = groupBy(rows, 'category');
    el('portfolioContent').innerHTML = Object.keys(cats).map(function (cat) {
      return '<article class="portfolio-category"><h3>' + esc(cat) + '</h3><div class="portfolio-grid">' + cats[cat].map(function (r) {
        var url = text(r.url);
        var yt = youtubeEmbed(url);
        var img = driveImage(url);
        var title = text(r.title);
        if (/^untitled$/i.test(title)) title = '';
        var desc = text(r.desc);
        var info = (title || desc) ? '<div class="work-info">' + (title ? '<h4>' + esc(title) + '</h4>' : '') + (desc ? '<p>' + esc(desc).replace(/\n/g, '<br>') + '</p>' : '') + '</div>' : '';
        var thumb = youtubeThumb(url);
        var fallback = youtubeFallbackThumb(url);
        var altThumb = youtubeAltThumb(url);
        var lastThumb = youtubeLastThumb(url);
        var isShorts = youtubeIsShorts(url);
        var videoClass = isShorts ? ' is-shorts' : ' is-wide';
        var media = yt ? '<button type="button" class="youtube-thumb" data-video="' + esc(yt) + '"><img src="' + esc(thumb) + '" alt="' + esc(title || cat) + ' 영상 썸네일" loading="lazy" data-fallback="' + esc(fallback) + '" data-alt="' + esc(altThumb) + '" data-last="' + esc(lastThumb) + '" onerror="if(!this.dataset.triedFallback){this.dataset.triedFallback=1;this.src=this.dataset.fallback;}else if(!this.dataset.triedAlt){this.dataset.triedAlt=1;this.src=this.dataset.alt;}else if(!this.dataset.triedLast){this.dataset.triedLast=1;this.src=this.dataset.last;}else{this.closest(\'.youtube-thumb\').classList.add(\'is-thumb-error\');this.remove();}"></button>' : '<button type="button" class="work-media-button" data-image="' + esc(img) + '"><img src="' + esc(img) + '" alt="' + esc(title || cat) + '" loading="lazy" onerror="this.closest(\'.work-media\').classList.add(\'is-error\');this.remove();"></button>';
        return '<article class="work-card' + (yt ? ' is-video' + videoClass : '') + '"><div class="work-media">' + media + '</div>' + info + '</article>';
      }).join('') + '</div></article>';
    }).join('');
  }

  function renderTypes(rows) {
    var seen = {};
    var opts = rows.filter(function (r) { return r.category && r.option; }).map(function (r) { return r.category + ' · ' + r.option; }).filter(function (v) { if (seen[v]) return false; seen[v] = true; return true; });
    el('typeOptions').innerHTML = opts.map(function (v) { return '<label><input type="checkbox" name="신청 타입" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>'; }).join('') || '<p class="empty">가격 데이터가 필요합니다.</p>';
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var scroll = e.target.closest('[data-scroll]');
      if (scroll) go(scroll.dataset.scroll);
      var img = e.target.closest('[data-image]');
      if (img) post({ type: 'BONGRAE_OPEN_MEDIA', mediaType: 'image', src: img.dataset.image });
      var video = e.target.closest('[data-video]');
      if (video) post({ type: 'BONGRAE_OPEN_MEDIA', mediaType: 'video', src: video.dataset.video });
    });
    document.querySelector('[data-cal-prev]').addEventListener('click', function () { state.calendarDate.setMonth(state.calendarDate.getMonth() - 1); renderCalendar(state.calendarRows); });
    document.querySelector('[data-cal-next]').addEventListener('click', function () { state.calendarDate.setMonth(state.calendarDate.getMonth() + 1); renderCalendar(state.calendarRows); });
    el('copyForm').addEventListener('click', copyForm);
    window.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.source !== 'bongrae-parent') return;
      if (data.type === 'BONGRAE_NAV_TO') go(data.sectionId);
      if (data.type === 'BONGRAE_PARENT_VIEWPORT') state.parentViewport = data;
    });
    window.addEventListener('load', function () { sendHeight(true); });
    window.addEventListener('resize', function () { requestHeight(80); });
    document.addEventListener('load', function (event) {
      var tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
      if (tag === 'img' || tag === 'iframe') requestHeight(120);
    }, true);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) post({ type: 'BONGRAE_ACTIVE', sectionId: entry.target.id }); });
    }, { threshold: 0.3 });
    ids.forEach(function (id) { var node = el(id); if (node) io.observe(node); });
  }

  function go(id) {
    var target = el(id);
    if (!target) return;
    post({ type: 'BONGRAE_SCROLL_PARENT', targetY: target.offsetTop });
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function formValue(name) {
    var checked = Array.prototype.slice.call(document.querySelectorAll('[name="' + name + '"]:checked')).map(function (v) { return v.value; });
    if (checked.length) return checked.join(', ');
    var input = document.querySelector('[name="' + name + '"]');
    return input ? input.value : '';
  }

  function copyForm() {
    var names = ['닉네임/활동명', '캐릭터 시트 및 해석', '신청 타입', '사용 목적', '이미지 사이즈', '수령희망 날짜', '원하시는 느낌 및 색감'];
    var result = names.map(function (name) { return '[' + name + ']\n' + formValue(name); }).join('\n\n');
    navigator.clipboard.writeText(result).then(showToast).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = result;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast();
    });
  }

  function showToast() {
    var t = el('toast');
    t.classList.add('is-show');
    setTimeout(function () { t.classList.remove('is-show'); }, 1500);
  }

  function post(data) {
    data.source = 'bongrae-portfolio';
    window.parent.postMessage(data, '*');
  }

  function measureHeight() {
    var app = el('app');
    var main = document.querySelector('main');
    var appHeight = app ? Math.ceil(app.scrollHeight || app.getBoundingClientRect().height || 0) : 0;
    var mainHeight = main ? Math.ceil((main.offsetTop || 0) + (main.scrollHeight || main.getBoundingClientRect().height || 0)) : 0;
    return Math.max(appHeight, mainHeight, 720);
  }

  function requestHeight(delay) {
    clearTimeout(heightTimer);
    heightTimer = setTimeout(sendHeight, delay || 0);
  }

  function sendHeight(force) {
    var height = measureHeight();
    if (!height) return;
    if (!force && lastSentHeight && Math.abs(height - lastSentHeight) < 20) return;
    lastSentHeight = height;
    post({ type: 'BONGRAE_HEIGHT', height: height });
  }

  function hideLoader() {
    var loader = document.querySelector('[data-loader]');
    if (loader) loader.classList.add('is-hidden');
    requestHeight(80);
  }

  function boot() {
    bindEvents();
    post({ type: 'BONGRAE_READY' });
    Promise.allSettled([fetchCSV(CSV.intro), fetchCSV(CSV.notice), fetchCSV(CSV.calendar), fetchCSV(CSV.process), fetchCSV(CSV.price), fetchCSV(CSV.portfolio)]).then(function (res) {
      var intro = res[0].status === 'fulfilled' ? res[0].value : [];
      var notice = res[1].status === 'fulfilled' ? res[1].value : [];
      var calendar = res[2].status === 'fulfilled' ? res[2].value : [];
      var process = res[3].status === 'fulfilled' ? res[3].value : [];
      var price = res[4].status === 'fulfilled' ? res[4].value : [];
      var portfolio = res[5].status === 'fulfilled' ? res[5].value : [];
      renderIntro(intro);
      renderNotice(notice);
      renderCalendar(calendar);
      renderProcess(process);
      renderPrice(price);
      renderTypes(price);
      renderPortfolio(portfolio);
      hideLoader();
      [120, 360, 900, 1600].forEach(function (ms) { setTimeout(function () { sendHeight(true); }, ms); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
