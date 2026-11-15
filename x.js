/* Лекало VS-37: надстройка. Меню, живая квитанция, 3D-карусель, волна на кнопках. */

/* меню: бургер на телефоне, подсветка текущего раздела */
(function () {
  var bar = document.querySelector('.bar'), burger = document.querySelector('.x-burger');
  if (bar && burger) {
    burger.addEventListener('click', function () { var o = bar.classList.toggle('is-open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    [].forEach.call(bar.querySelectorAll('.x-nav a'), function (a) { a.addEventListener('click', function () { bar.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { bar.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); } });
  }
  var links = [].slice.call(document.querySelectorAll('.x-nav a'));
  var map = links.map(function (a) { return { a: a, el: document.querySelector(a.getAttribute('href')) }; }).filter(function (m) { return m.el; });
  var tick = false;
  function frame() {
    tick = false;
    var y = window.scrollY, probe = y + innerHeight * 0.4, cur = null;
    map.forEach(function (m) { if (m.el.getBoundingClientRect().top + y <= probe) cur = m; });
    map.forEach(function (m) { m.a.classList.toggle('is-on', m === cur); });
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame); frame();

  /* волна на кнопках */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.v-btn'); if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), x = document.createElement('span');
    x.className = 'x-ripple'; x.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(x); setTimeout(function () { x.remove(); }, 700);
  });
})();

/* живая квитанция: запрос печатается, работа дописывается, срок и цена встают штампами; три вещи по кругу.
   Идея с видео Ирины (запрос печатается, ниже проявляется карточка результата), переложена на квитанцию ателье. */
(function () {
  var root = document.querySelector('[data-x-live]'); if (!root) return;
  var paper = root.querySelector('.tag__paper');
  var el = {
    item: root.querySelector('[data-live="item"]'), work: root.querySelector('[data-live="work"]'),
    term: root.querySelector('[data-live="term"]'), price: root.querySelector('[data-live="price"]')
  };
  var NB = ' ';
  var S = [
    { item: 'Брюки серые, шерсть', work: 'Подшить на 4 см по фабричному шву', term: '1 день', price: '450' + NB + '₽' },
    { item: 'Платье чёрное, сломана молния', work: 'Заменить молнию в боковом шве', term: '1 день', price: '600' + NB + '₽' },
    { item: 'Пальто шерстяное, тёмно-синее', work: 'Укоротить рукава на 3 см', term: '2 дня', price: '900' + NB + '₽' }
  ];
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) return; /* без анимации остаётся статичный пример из разметки */
  var alive = true, vis = true, idx = 0, timers = [];
  function wait(ms) { return new Promise(function (r) { var t = setTimeout(r, ms); timers.push(t); }); }
  function gate() { return new Promise(function (r) { (function chk() { if (vis && !document.hidden) r(); else setTimeout(chk, 400); })(); }); }
  async function type(node, text, ms) {
    node.textContent = ''; node.classList.add('is-typing');
    for (var i = 1; i <= text.length; i++) { await gate(); node.textContent = text.slice(0, i); await wait(ms + Math.random() * 18); }
    node.classList.remove('is-typing');
  }
  function stamp(node, text) { node.textContent = text; node.classList.remove('is-off', 'is-slam'); void node.offsetWidth; node.classList.add('is-slam'); }
  function clear() {
    el.item.textContent = ''; el.work.textContent = '';
    [el.term, el.price].forEach(function (n) { n.classList.remove('is-slam'); n.classList.add('is-off'); });
  }
  async function run() {
    clear();
    await wait(500);
    while (alive) {
      var s = S[idx % S.length]; idx++;
      await gate();
      paper.classList.remove('is-swap'); void paper.offsetWidth; paper.classList.add('is-swap');
      await wait(450);
      await type(el.item, s.item, 42);
      await wait(380);
      await type(el.work, s.work, 24);
      await wait(520); await gate(); stamp(el.term, s.term);
      await wait(650); await gate(); stamp(el.price, s.price);
      await wait(3400);
      clear(); await wait(350);
    }
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: .1 }).observe(root);
  run();
})();

/* 3D-карусель работ: автопрокрутка, стрелки, точки, перетаскивание, клавиатура */
(function () {
  var cube = document.querySelector('[data-x-cube]'); if (!cube) return;
  var ring = cube.querySelector('.x-cube__ring'), faces = [].slice.call(cube.querySelectorAll('.x-cube__face'));
  var dots = [].slice.call(document.querySelectorAll('.x-cube__dot')), n = faces.length, step = 360 / n;
  var tEl = document.querySelector('[data-cube-title]'), sEl = document.querySelector('[data-cube-sub]');
  var subs = ['Посадили по фигуре', 'Новая подкладка', 'Подшили по длине', 'Молния по старому следу', 'Ровный низ', 'В цвет и в размер', 'Ткань подбираем вместе', 'Мел, ножницы, нитки'];
  var rot = 0, cur = 0, timer = null, drag = false, sx = 0, sr = 0, visible = false, hover = false;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  cube.setAttribute('tabindex', '0'); cube.setAttribute('role', 'region'); cube.setAttribute('aria-label', 'Карусель работ, стрелки влево и вправо листают');
  function paint() {
    cur = ((Math.round(-rot / step) % n) + n) % n;
    ring.style.setProperty('--rot', rot + 'deg');
    faces.forEach(function (f, i) { f.classList.toggle('is-front', i === cur); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === cur); });
    var cap = faces[cur].querySelector('figcaption'); if (tEl && cap) tEl.textContent = cap.textContent; if (sEl) sEl.textContent = subs[cur] || '';
  }
  function go(delta) { rot -= delta * step; paint(); }
  function to(i) { var d = i - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n; go(d); }
  cube.querySelector('.x-cube__nav--next').addEventListener('click', function () { go(1); restart(); });
  cube.querySelector('.x-cube__nav--prev').addEventListener('click', function () { go(-1); restart(); });
  dots.forEach(function (d, i) { d.addEventListener('click', function () { to(i); restart(); }); });
  cube.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(1); restart(); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(-1); restart(); e.preventDefault(); } });
  cube.addEventListener('pointerdown', function (e) { if (e.target.closest('.x-cube__nav')) return; drag = true; sx = e.clientX; sr = rot; ring.classList.add('is-drag'); stop(); try { cube.setPointerCapture(e.pointerId); } catch (x) {} });
  cube.addEventListener('pointermove', function (e) { if (!drag) return; rot = sr + (e.clientX - sx) * 0.32; ring.style.setProperty('--rot', rot + 'deg'); });
  function end() { if (!drag) return; drag = false; ring.classList.remove('is-drag'); rot = -Math.round(-rot / step) * step; paint(); restart(); }
  cube.addEventListener('pointerup', end); cube.addEventListener('pointercancel', end);
  cube.addEventListener('mouseenter', function () { hover = true; stop(); }); cube.addEventListener('mouseleave', function () { hover = false; restart(); });
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function restart() { stop(); if (still || hover || !visible) return; timer = setInterval(function () { go(1); }, 3600); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; restart(); }, { threshold: .3 }).observe(cube); else visible = true;
  paint();
})();
