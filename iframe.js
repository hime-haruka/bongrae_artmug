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
    el('introContent').innerHTML = rows.length ? '<img class="intro__image" src="' + esc(driveImage(r.image)) + '" alt="' + esc(r.name) + ' 프로필" onerror="this.style.display=\'none\'"><div><h3 class="intro__name">' + esc(r.name) + '</h3><p class="intro__sub">' + esc(r.sub) + '</p><p class="intro__desc">' + esc(r.desc) + '</p><div class="badges">' + badges + '</div></div>' : empty('작가 소개');
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
    var monthStart = new Date(y, m, 1);
    var monthEnd = new Date(y, m + 1, 0);

    function eventColor(row) {
      return String(row.color || '').toLowerCase();
    }

    function overlapsMonth(row) {
      var s = dateOnly(row.date_s);
      var e = dateOnly(row.date_e || row.date_s);
      return e.getTime() >= monthStart.getTime() && s.getTime() <= monthEnd.getTime();
    }

    function formatDateLabel(row) {
      var s = dateOnly(row.date_s);
      var e = dateOnly(row.date_e || row.date_s);
      var sameDate = sameDay(s, e);
      var sameMonth = s.getMonth() === e.getMonth();

      if (sameDate) return '[ ' + (s.getMonth() + 1) + '/' + s.getDate() + ' ]';
      if (sameMonth) return '[ ' + (s.getMonth() + 1) + '/' + s.getDate() + ' ~ ' + (e.getMonth() + 1) + '/' + e.getDate() + ' ]';
      return '[ ' + (s.getMonth() + 1) + '/' + s.getDate() + ' ~ ' + (e.getMonth() + 1) + '/' + e.getDate() + ' ]';
    }

    document.querySelector('[data-cal-title]').textContent = y + '. ' + String(m + 1).padStart(2, '0');

    var calendarHtml = ['일', '월', '화', '수', '목', '금', '토'].map(function (d) {
      return '<div class="cal-cell cal-head-cell"><b>' + d + '</b></div>';
    }).join('');

    for (var i = 0; i < 42; i += 1) {
      var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var events = rows.filter(function (r) { return between(day, r.date_s, r.date_e); });
      var hasOff = events.some(function (ev) { return eventColor(ev) === 'off'; });
      var colorClass = hasOff ? ' is-off' : (events.length ? ' is-working' : '');
      var dot = events.length ? '<span class="cal-event-dot' + (hasOff ? ' off' : '') + '"></span>' : '';

      calendarHtml += '<div class="cal-cell' + (day.getMonth() !== m ? ' is-muted' : '') + colorClass + '">' +
        '<span class="cal-day">' + day.getDate() + '</span>' +
        dot +
        '</div>';
    }

    var monthRows = rows.filter(overlapsMonth).sort(function (a, b) {
      return dateOnly(a.date_s).getTime() - dateOnly(b.date_s).getTime() || text(a.label).localeCompare(text(b.label));
    });

    var scheduleHtml = monthRows.length ? monthRows.map(function (row) {
      var color = eventColor(row);
      return '<article class="schedule-item' + (color === 'off' ? ' is-off' : '') + '">' +
        '<span class="schedule-date">' + esc(formatDateLabel(row)) + '</span>' +
        '<span class="schedule-label">' + esc(row.label || '일정') + '</span>' +
        '</article>';
    }).join('') : '<div class="calendar-schedule__empty">이번 달 등록된 일정이 없습니다.</div>';

    el('calendarContent').className = 'calendar-layout';
    el('calendarContent').innerHTML =
      '<div class="calendar-board">' +
        '<div class="calendar-panel"><div class="calendar">' + calendarHtml + '</div></div>' +
        '<aside class="calendar-schedule">' +
          '<h3 class="calendar-schedule__title">이달의 일정</h3>' +
          '<div class="calendar-schedule__list">' + scheduleHtml + '</div>' +
        '</aside>' +
      '</div>';

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
          var unit = text(r.unit);
          return '<div class="price-card"><div><span>' + esc(option) + (unit ? ' <em class="price-unit">(' + esc(unit) + ')</em>' : '') + '</span></div><strong>' + priceText(r.price) + '</strong></div>';
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
    var opts = rows.filter(function (r) {
      return text(r.category) && text(r.option);
    }).sort(function (a, b) {
      return num(a.c_order) - num(b.c_order);
    }).map(function (r) {
      var category = text(r.category);
      var option = text(r.option);
      var key = category + '||' + option;
      if (seen[key]) return null;
      seen[key] = true;
      return {
        value: category === option ? category : category + ' ⦁ ' + option,
        label: category === option ? category : category + ' ⦁ ' + option
      };
    }).filter(Boolean);

    el('typeOptions').innerHTML = opts.map(function (item) {
      return '<label><input type="checkbox" name="신청 타입" value="' + esc(item.value) + '"><span>' + esc(item.label) + '</span></label>';
    }).join('') || '<p class="empty">가격 데이터가 필요합니다.</p>';
  }


  function createDecorLayer() {
    var app = el('app');
    if (!app || app.querySelector('.neon-decor-layer')) return;

    var layer = document.createElement('div');
    layer.className = 'neon-decor-layer';
    layer.setAttribute('aria-hidden', 'true');

    var decorItems = [
      /* left edge dot grids */
      { type: 'dotgrid', x: 1.5, y: 8, w: 104, h: 188, o: 0.46, r: -2 },
      { type: 'dotgrid', x: 2.5, y: 38, w: 92, h: 170, o: 0.30, r: 1 },
      { type: 'dotgrid', x: 8, y: 82, w: 116, h: 168, o: 0.26, r: 3 },

      /* right edge dot grids */
      { type: 'dotgrid', x: 88, y: 10, w: 132, h: 212, o: 0.40, r: 1 },
      { type: 'dotgrid', x: 91, y: 46, w: 104, h: 176, o: 0.30, r: -2 },
      { type: 'dotgrid', x: 76, y: 76, w: 138, h: 206, o: 0.28, r: 0 },

      /* subtle center/background dot grids */
      { type: 'dotgrid', x: 50, y: 30, w: 86, h: 132, o: 0.16, r: -4 },
      { type: 'dotgrid', x: 37, y: 90, w: 92, h: 142, o: 0.16, r: 2 },

      /* large background orbs, mostly outside viewport edges */
      { type: 'orb', x: 76, y: -8, size: 380, o: 0.48, r: 0 },
      { type: 'orb', x: -14, y: 54, size: 330, o: 0.36, r: 0 },
      { type: 'orb', x: 88, y: 88, size: 250, o: 0.24, r: 0 },
      { type: 'orb', x: -8, y: 6, size: 180, o: 0.18, r: 0 },
      { type: 'orb', x: 94, y: 34, size: 190, o: 0.20, r: 0 },

      /* rings on margins / empty zones */
      { type: 'ring', x: 82, y: 7, size: 62, o: 0.44, r: 0 },
      { type: 'ring', x: 4, y: 29, size: 42, o: 0.34, r: 0 },
      { type: 'ring', x: 61, y: 12, size: 34, o: 0.26, r: 0 },
      { type: 'ring', x: 93, y: 63, size: 30, o: 0.24, r: 0 },
      { type: 'ring', x: 13, y: 88, size: 28, o: 0.22, r: 0 },

      /* sparkles: moved away from section titles */
      { type: 'sparkle', x: 30, y: 6, size: 30, o: 0.50, r: 8 },
      { type: 'sparkle', x: 93, y: 21, size: 28, o: 0.42, r: -8 },
      { type: 'sparkle', x: 86, y: 84, size: 24, o: 0.34, r: 12 },
      { type: 'sparkle', x: 6, y: 50, size: 22, o: 0.30, r: -14 },
      { type: 'sparkle', x: 66, y: 72, size: 22, o: 0.28, r: 4 },
      { type: 'sparkle', x: 96, y: 6, size: 20, o: 0.28, r: 10 },
      { type: 'sparkle', x: 18, y: 70, size: 18, o: 0.22, r: -6 },

      /* small glowing dots */
      { type: 'small-dot', x: 92, y: 9, size: 10, o: 0.58, r: 0 },
      { type: 'small-dot pink', x: 6, y: 66, size: 9, o: 0.50, r: 0 },
      { type: 'small-dot', x: 95, y: 58, size: 7, o: 0.46, r: 0 },
      { type: 'small-dot pink', x: 74, y: 18, size: 8, o: 0.36, r: 0 },
      { type: 'small-dot', x: 20, y: 78, size: 6, o: 0.34, r: 0 },
      { type: 'small-dot pink', x: 48, y: 10, size: 6, o: 0.30, r: 0 },
      { type: 'small-dot', x: 12, y: 23, size: 5, o: 0.32, r: 0 },
      { type: 'small-dot pink', x: 89, y: 72, size: 6, o: 0.30, r: 0 },
      { type: 'small-dot', x: 55, y: 86, size: 5, o: 0.24, r: 0 }
    ];

    decorItems.forEach(function (item, index) {
      var node = document.createElement('span');
      var classes = item.type.split(' ');
      node.className = 'neon-decor neon-decor--' + classes[0] + (classes[1] ? ' is-' + classes[1] : '');
      node.style.left = item.x + '%';
      node.style.top = item.y + '%';
      node.style.setProperty('--decor-opacity', item.o);
      node.style.setProperty('--decor-rotate', (item.r || 0) + 'deg');
      node.style.setProperty('--decor-duration', (8 + (index % 5) * 1.4) + 's');
      node.style.setProperty('--decor-delay', (-index * 0.45) + 's');
      node.style.setProperty('--decor-move-x', ((index % 2 ? -1 : 1) * (6 + index % 4)) + 'px');
      node.style.setProperty('--decor-move-y', (-8 - (index % 5) * 2) + 'px');

      if (item.size) node.style.setProperty('--decor-size', item.size + 'px');
      if (item.w) node.style.setProperty('--decor-w', item.w + 'px');
      if (item.h) node.style.setProperty('--decor-h', item.h + 'px');

      layer.appendChild(node);
    });

    app.insertBefore(layer, app.firstChild);
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
    createDecorLayer();
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
