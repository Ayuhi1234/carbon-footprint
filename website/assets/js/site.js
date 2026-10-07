// 3R ZeroWaste — home page behaviour (vanilla JS, no build step).
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var reduceMotion = mq('(prefers-reduced-motion: reduce)');
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };

  var root = $('#root');
  var nav = $('#nav');

  // ---------- Mobile menu ----------
  var burger = $('#burger');
  var mmenu = $('#mmenu');
  var menuOpen = false;
  var setMenu = function (open) {
    menuOpen = open;
    mmenu.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('.ic-open', burger).hidden = !open;
    $('.ic-closed', burger).hidden = open;
    updateNavBg();
  };
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  $$('[data-close-menu]').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });

  // ---------- Scroll: nav background, progress bar, active section ----------
  var scrolled = false;
  function updateNavBg() {
    nav.classList.toggle('on', scrolled || menuOpen);
    nav.classList.toggle('menu-open', menuOpen);
  }
  var bar = $('#progbar');
  var groupOf = {
    solutions: 'solutions', how: 'solutions', technology: 'solutions',
    impact: 'impact', cases: 'impact', why: 'impact',
    karmaverse: 'karmaverse',
    vision: 'company', team: 'company', journey: 'company', partners: 'company',
    blog: 'blog', events: 'events', contact: 'contact'
  };
  var sectionIds = Object.keys(groupOf);
  var navLinks = $$('[data-nav]');
  var onScroll = function () {
    var de = document.documentElement;
    var y = window.scrollY || de.scrollTop || 0;
    scrolled = y > 40;
    updateNavBg();
    var max = Math.max(1, (de.scrollHeight || 1) - window.innerHeight);
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(4) + ')';
    var cur = '';
    for (var i = 0; i < sectionIds.length; i++) {
      var el = document.getElementById(sectionIds[i]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.top <= 140 && r.bottom > 140) { cur = groupOf[sectionIds[i]]; break; }
    }
    navLinks.forEach(function (a) { a.classList.toggle('act', a.getAttribute('data-nav') === cur); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---------- Events: live calendar + countdown ----------
  // Dates are IST (+05:30). Past entries drop off automatically.
  var IST = '+05:30';
  var CAL = [
    { name: 'International E-Waste Day', kind: 'Global observance · WEEE Forum', place: 'Worldwide', s: '2026-10-14', e: '2026-10-14', url: 'https://weee-forum.org/iewd-about/' },
    { name: 'World Cities Day', kind: 'UN observance', place: 'Worldwide', s: '2026-10-31', e: '2026-10-31', url: 'https://www.un.org/en/observances/cities-day' },
    { name: 'COP31 — UN Climate Change Conference', kind: 'Global summit · UNFCCC', place: 'Antalya, Türkiye', s: '2026-11-09', e: '2026-11-20', url: 'https://unfccc.int/cop31' },
    { name: 'World Soil Day', kind: 'UN observance · FAO', place: 'Worldwide', s: '2026-12-05', e: '2026-12-05', url: 'https://www.un.org/en/observances/world-soil-day' },
    { name: 'Global Recycling Day', kind: 'Global observance', place: 'Worldwide', s: '2027-03-18', e: '2027-03-18', url: 'https://www.globalrecyclingday.com/' },
    { name: 'International Day of Zero Waste', kind: 'UN observance', place: 'Worldwide', s: '2027-03-30', e: '2027-03-30', url: 'https://www.un.org/en/observances/zero-waste-day' },
    { name: 'Earth Day', kind: 'Global observance', place: 'Worldwide', s: '2027-04-22', e: '2027-04-22', url: 'https://www.earthday.org/' },
    { name: 'World Environment Day', kind: 'UN observance · UNEP', place: 'Worldwide', s: '2027-06-05', e: '2027-06-05', url: 'https://www.worldenvironmentday.global/' }
  ];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function eventsAt(now) {
    return CAL.map(function (x) {
      var st0 = Date.parse(x.s + 'T00:00:00' + IST), en0 = Date.parse(x.e + 'T23:59:59' + IST);
      var sd = new Date(x.s + 'T12:00:00Z'), ed = new Date(x.e + 'T12:00:00Z');
      var dates = x.s === x.e
        ? sd.getUTCDate() + ' ' + MON[sd.getUTCMonth()] + ' ' + sd.getUTCFullYear()
        : sd.getUTCDate() + '–' + ed.getUTCDate() + ' ' + MON[ed.getUTCMonth()] + ' ' + ed.getUTCFullYear();
      var live = now >= st0 && now <= en0;
      var days = Math.ceil((st0 - now) / 864e5);
      return {
        name: x.name, kind: x.kind, place: x.place, url: x.url, st0: st0, en0: en0, live: live, dates: dates,
        dd: pad(sd.getUTCDate()), mon: MON[sd.getUTCMonth()],
        rel: live ? 'Live now' : days <= 1 ? 'Tomorrow' : 'In ' + days + ' days',
        pillCls: 'rp' + (live ? ' now' : days <= 14 ? ' soon' : '')
      };
    }).filter(function (x) { return x.en0 >= now; });
  }

  var bind = function (key, text) { $$('[data-bind="' + key + '"]').forEach(function (el) { if (el.textContent !== text) el.textContent = text; }); };
  var upcomingEl = $('#upcoming');
  var tplUpcoming = $('#tpl-upcoming');
  var cdEls = $$('[data-cd]');
  var cdTarget = Date.now();
  var lastKey = '';

  function renderEvents() {
    var now = Date.now();
    var evs = eventsAt(now);
    var nx = evs[0] || { name: 'More events soon', kind: '', place: 'Worldwide', dates: '', live: false, st0: now, en0: now, url: '#events', rel: '' };
    cdTarget = nx.live ? nx.en0 : nx.st0;
    bind('nx.badge', nx.live ? 'Live now' : 'Next up');
    bind('nx.cdLabel', nx.live ? 'Ends in' : 'Starts in');
    bind('nx.kind', nx.kind);
    bind('nx.name', nx.name);
    bind('nx.place', nx.place);
    bind('nx.dates', nx.dates);
    $$('[data-bind-href="nx.url"]').forEach(function (a) { a.href = nx.url; });
    var shortName = nx.name.split(' — ')[0];
    bind('heroLive', nx.live ? shortName + ' is happening now' : shortName + ' ' + (nx.rel ? nx.rel.toLowerCase() : ''));
    var t = new Date(now);
    bind('updated', pad(t.getHours()) + ':' + pad(t.getMinutes()));

    var list = evs.slice(1, 7);
    var key = list.map(function (e) { return e.name + e.rel + e.pillCls; }).join('|');
    if (upcomingEl && tplUpcoming && key !== lastKey) {
      lastKey = key;
      var tpl = tplUpcoming.innerHTML;
      upcomingEl.innerHTML = list.map(function (e) {
        return tpl.replace(/\{\{e\.(\w+)\}\}/g, function (_, k) { return esc(e[k]); });
      }).join('');
    }
  }

  function tickCountdown() {
    var diff = Math.max(0, cdTarget - Date.now());
    var d = Math.floor(diff / 864e5); diff -= d * 864e5;
    var h = Math.floor(diff / 36e5); diff -= h * 36e5;
    var m = Math.floor(diff / 6e4); diff -= m * 6e4;
    var v = [String(d), pad(h), pad(m), pad(Math.floor(diff / 1e3))];
    cdEls.forEach(function (el) {
      var val = v[+el.getAttribute('data-cd')];
      if (el.textContent !== val) el.textContent = val;
    });
  }

  renderEvents();
  tickCountdown();
  var lastRender = Date.now();
  setInterval(function () {
    // Re-render the list every 30 s so "In N days" and Live states roll over on their own.
    if (Date.now() - lastRender > 30000) { lastRender = Date.now(); renderEvents(); }
    tickCountdown();
  }, 1000);

  // Upcoming / Past tabs
  var tabs = $$('[data-evtab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var which = tab.getAttribute('data-evtab');
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('on', on);
        t.setAttribute('aria-selected', String(on));
      });
      $$('[data-ev]').forEach(function (p) { p.hidden = p.getAttribute('data-ev') !== which; });
    });
  });

  // ---------- Impact console count-up ----------
  var dash = $('#dash');
  var counters = $$('[data-count]');
  if (!reduceMotion && dash && typeof IntersectionObserver !== 'undefined' && dash.getBoundingClientRect().top >= window.innerHeight) {
    counters.forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      var t0 = performance.now();
      var step = function (t) {
        var p = Math.min(1, (t - t0) / 1800);
        var k = 1 - Math.pow(1 - p, 3);
        counters.forEach(function (el) { el.textContent = String(Math.round(+el.getAttribute('data-count') * k)); });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });
    io.observe(dash);
  }

  // ---------- Pointer effects: hero spotlight, card tilt, magnetic buttons ----------
  var hero = $('[data-hero]');
  if (!reduceMotion && mq('(pointer: fine)') && root) {
    var tilted = null, mag = null;
    root.addEventListener('mousemove', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (hero && t && hero.contains(t)) {
        var hr = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', (e.clientX - hr.left) + 'px');
        hero.style.setProperty('--my', (e.clientY - hr.top) + 'px');
      }
      var tl = t ? t.closest('.tilt') : null;
      if (tilted && tilted !== tl) { tilted.style.transform = ''; tilted = null; }
      if (tl) {
        var r = tl.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        tl.style.transform = 'perspective(900px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg) translateY(-6px)';
        tilted = tl;
      }
      var mg = t ? t.closest('.btn') : null;
      if (mag && mag !== mg) { mag.style.transform = ''; mag = null; }
      if (mg) {
        var br = mg.getBoundingClientRect();
        var dx = e.clientX - (br.left + br.width / 2), dy = e.clientY - (br.top + br.height / 2);
        mg.style.transform = 'translate(' + (dx * 0.18).toFixed(1) + 'px,' + (dy * 0.28).toFixed(1) + 'px) scale(1.03)';
        mag = mg;
      }
    });
  }

  // ---------- KarmaVerse buddy messages ----------
  var msgs = ['Hi! Welcome to KarmaVerse', 'Every good deed earns KarmaCoins', 'Kar Bhala Toh Ho Bhala!', 'Visit me at karmaverse.earth'];
  var mi = 0;
  if (!reduceMotion) {
    setInterval(function () {
      mi = (mi + 1) % msgs.length;
      $$('[data-msg]').forEach(function (el) {
        // Swap in a fresh node so the CSS entrance animation replays.
        var n = el.cloneNode(false);
        n.textContent = msgs[mi];
        el.parentNode.replaceChild(n, el);
      });
    }, 3600);
  }
  var hideBuddy = $('[data-hide-buddy]');
  if (hideBuddy) hideBuddy.addEventListener('click', function () { $('#buddy').hidden = true; });
})();
