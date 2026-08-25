/**
 * Image viewer - in-page lightbox for gallery images.
 * Replaces opening images in a new tab. Works on both the
 * gallery (index.php) and favorites page (favorites.php).
 *
 * Any <a> that looks like an uploaded image link will open in
 * the viewer: either `.image-card__media[href]` or `.viewer-link`.
 */
(function () {
  var IS_IMAGE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;

  var viewer = null;
  var items = [];
  var current = -1;

  function buildViewer() {
    viewer = document.createElement('div');
    viewer.className = 'viewer';
    viewer.hidden = true;
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Image viewer');

    var el = document.createElement('div');
    el.className = 'viewer__backdrop';
    viewer.appendChild(el);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'viewer__close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '<i data-lucide="x"></i>';
    viewer.appendChild(close);

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'viewer__nav viewer__nav--prev';
    prev.setAttribute('aria-label', 'Previous image');
    prev.innerHTML = '<i data-lucide="chevron-left"></i>';
    viewer.appendChild(prev);

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'viewer__nav viewer__nav--next';
    next.setAttribute('aria-label', 'Next image');
    next.innerHTML = '<i data-lucide="chevron-right"></i>';
    viewer.appendChild(next);

    var stage = document.createElement('figure');
    stage.className = 'viewer__stage';

    var img = document.createElement('img');
    img.className = 'viewer__image';
    img.alt = '';
    stage.appendChild(img);

    var caption = document.createElement('figcaption');
    caption.className = 'viewer__caption';

    var title = document.createElement('span');
    title.className = 'viewer__title';
    caption.appendChild(title);

    var counter = document.createElement('span');
    counter.className = 'viewer__counter';
    caption.appendChild(counter);

    stage.appendChild(caption);
    viewer.appendChild(stage);

    document.body.appendChild(viewer);

    if (window.lucide) lucide.createIcons();

    viewer.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.viewer__close') || t.classList.contains('viewer__backdrop')) {
        close();
      } else if (t.closest('.viewer__nav--prev')) {
        prev();
      } else if (t.closest('.viewer__nav--next')) {
        next();
      }
    });
  }

  function collectItems() {
    var links = document.querySelectorAll('a.image-card__media[href], a.viewer-link[href]');
    var seen = {};
    items = [];
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute('href') || '';
      if (!IS_IMAGE.test(href)) return;
      if (seen[href]) return;
      seen[href] = true;
      items.push(a);
    });
  }

  function show(index) {
    if (!viewer) buildViewer();
    if (items.length === 0) return;
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    current = index;

    var a = items[current];
    var src = a.getAttribute('href');
    var img = viewer.querySelector('.viewer__image');
    img.src = src;
    img.alt = a.getAttribute('data-title') || src.split('/').pop();

    viewer.querySelector('.viewer__title').textContent =
      a.getAttribute('data-title') || src.split('/').pop();
    viewer.querySelector('.viewer__counter').textContent =
      (current + 1) + ' / ' + items.length;

    viewer.hidden = false;
    document.body.classList.add('has-viewer');
  }

  function close() {
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true;
    document.body.classList.remove('has-viewer');
    viewer.querySelector('.viewer__image').removeAttribute('src');
    current = -1;
  }

  function prev() { show(current - 1); }
  function next() { show(current + 1); }

  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest('a.image-card__media[href], a.viewer-link[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!IS_IMAGE.test(href)) return;
    e.preventDefault();
    collectItems();
    show(items.indexOf(a) === -1 ? 0 : items.indexOf(a));
  });

  document.addEventListener('keydown', function (e) {
    if (!viewer || viewer.hidden) return;
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowLeft') {
      prev();
    } else if (e.key === 'ArrowRight') {
      next();
    }
  });
})();