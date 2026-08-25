/**
 * Image favorites — stored in localStorage (no DB change required).
 * Keys: favorite image file paths (e.g. uploads/123_photo.jpg)
 */
(function () {
  var STORAGE_KEY = 'php_user_app_favorites';

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function isFav(src) {
    return load().indexOf(src) !== -1;
  }

  function toggle(src) {
    var list = load();
    var i = list.indexOf(src);
    if (i === -1) {
      list.push(src);
    } else {
      list.splice(i, 1);
    }
    save(list);
    return i === -1;
  }

  function updateButtons() {
    document.querySelectorAll('[data-fav-src]').forEach(function (btn) {
      var src = btn.getAttribute('data-fav-src');
      var active = isFav(src);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('title', active ? 'Remove from favorites' : 'Add to favorites');
      var label = btn.querySelector('.fav-label');
      if (label) {
        label.textContent = active ? 'Favorited' : 'Favorite';
      }
      // Swap lucide icon name if present
      var icon = btn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', active ? 'heart' : 'heart');
      }
    });
  }

  function onClick(e) {
    var btn = e.target.closest('[data-fav-src]');
    if (!btn) return;
    e.preventDefault();
    var src = btn.getAttribute('data-fav-src');
    if (!src) return;
    toggle(src);
    updateButtons();
    // Optional: live-filter favorites page
    if (document.body.dataset.page === 'favorites') {
      renderFavoritesPage();
    }
  }

  function renderFavoritesPage() {
    var grid = document.getElementById('favorites-grid');
    var empty = document.getElementById('favorites-empty');
    if (!grid) return;

    var favs = load();
    // Only keep items that still exist in the catalog (if provided)
    var catalog = window.IMAGE_CATALOG || null;
    if (catalog && catalog.length) {
      var allowed = {};
      catalog.forEach(function (item) {
        allowed[item.src] = item;
      });
      favs = favs.filter(function (src) {
        return allowed[src];
      });
      // Persist cleaned list
      save(favs);
    }

    grid.innerHTML = '';
    if (favs.length === 0) {
      if (empty) empty.hidden = false;
      grid.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    grid.hidden = false;

    favs.forEach(function (src) {
      var meta = catalog ? catalog.find(function (c) { return c.src === src; }) : null;
      var title = meta ? meta.title : src.split('/').pop();
      var owner = meta ? meta.owner : '';

      var card = document.createElement('article');
      card.className = 'image-card';
      card.innerHTML =
        '<a class="image-card__media" href="' + esc(src) + '" data-title="' + esc(title) + '">' +
          '<img src="' + esc(src) + '" alt="' + esc(title) + '" loading="lazy">' +
        '</a>' +
        '<div class="image-card__body">' +
          '<div class="image-card__title" title="' + esc(title) + '">' + esc(title) + '</div>' +
          (owner ? '<div class="image-card__meta">' + esc(owner) + '</div>' : '') +
          '<div class="image-card__actions">' +
            '<button type="button" class="btn btn-sm btn-ghost fav-btn is-active" data-fav-src="' + esc(src) + '">' +
              '<i data-lucide="heart"></i><span class="fav-label">Favorited</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      grid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
    updateButtons();
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function filterImages(query) {
    var q = (query || '').trim().toLowerCase();
    document.querySelectorAll('[data-image-card]').forEach(function (card) {
      var hay = (card.getAttribute('data-search') || '').toLowerCase();
      var show = !q || hay.indexOf(q) !== -1;
      card.hidden = !show;
    });
    var empty = document.getElementById('images-empty-filter');
    if (empty) {
      var anyVisible = !!document.querySelector('[data-image-card]:not([hidden])');
      empty.hidden = anyVisible || !q;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', onClick);
    updateButtons();

    var search = document.getElementById('image-search');
    if (search) {
      search.addEventListener('input', function () {
        filterImages(search.value);
      });
    }

    if (document.body.dataset.page === 'favorites') {
      renderFavoritesPage();
    }
  });

  // Expose for optional use
  window.AppFavorites = { load: load, isFav: isFav, toggle: toggle, updateButtons: updateButtons };
})();