// 3R ZeroWaste — blog page behaviour (vanilla JS, no build step).
(function () {
  'use strict';

  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var LABELS = ['All', 'ESG', 'Circular Economy', 'EPR', 'Carbon & Net Zero', 'KarmaVerse', 'Community & Events'];
  // Placeholder posts until real articles are written; cv1–cv4 are the cover styles.
  var POSTS = [
    { cat: 'ESG', cv: 'cv2' }, { cat: 'Circular Economy', cv: 'cv3' }, { cat: 'KarmaVerse', cv: 'cv4' },
    { cat: 'Carbon & Net Zero', cv: 'cv1' }, { cat: 'EPR', cv: 'cv2' }, { cat: 'Community & Events', cv: 'cv4' },
    { cat: 'ESG', cv: 'cv3' }, { cat: 'Circular Economy', cv: 'cv1' }, { cat: 'KarmaVerse', cv: 'cv2' }
  ];

  var catsEl = document.getElementById('cats');
  var postsEl = document.getElementById('posts');
  var tpl = document.getElementById('tpl-post').innerHTML;
  var pick = 'All';

  function render() {
    catsEl.innerHTML = LABELS.map(function (l) {
      var on = l === pick;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-cat="' + esc(l) + '">' + esc(l) + '</button>';
    }).join('');

    var list = POSTS.filter(function (p) { return pick === 'All' || p.cat === pick; });
    postsEl.innerHTML = list.map(function (p, i) {
      var v = { cat: p.cat, cover: 'cover ' + p.cv, delay: (i * 0.06).toFixed(2) + 's' };
      return tpl.replace(/\{\{p\.(\w+)\}\}/g, function (_, k) { return esc(v[k]); });
    }).join('');

    var count = document.querySelector('[data-bind="countLabel"]');
    count.textContent = list.length + (list.length === 1 ? ' article' : ' articles');
  }

  catsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]');
    if (!b) return;
    pick = b.getAttribute('data-cat');
    render();
    var again = catsEl.querySelector('[data-cat="' + pick.replace(/"/g, '\\"') + '"]');
    if (again) again.focus();
  });

  // TODO: connect the newsletter form to the mailing-list provider.
  document.getElementById('newsletter').addEventListener('submit', function (e) { e.preventDefault(); });

  render();
})();
