// Client behaviour for the main page: pan/zoom, selection, search, layers, offline status.
// Everything is already rendered in the HTML; this only shows, hides and moves things.

type Box = [number, number, number, number];
const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll(s)] as T[];
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const desktop = matchMedia('(min-width: 860px)');

export function initApp() {
  const svg = $<SVGSVGElement>('#map');
  const app = $('#app');
  const detail = $('#detail');
  const full = svg.dataset.full!.split(' ').map(Number) as Box;
  const [, , FW, FH] = full;
  // Start on the built-up area rather than the whole bounding box.
  const home: Box = [150, 90, 700, 730];
  let box: Box = [...home];
  let selected: string | null = null;

  // ---- viewBox handling -------------------------------------------------
  function fit(b: Box): Box {
    // Keep the box's aspect matched to the element so units-per-pixel is uniform.
    const r = svg.clientWidth / Math.max(1, svg.clientHeight);
    let [x, y, w, h] = b;
    const cx = x + w / 2, cy = y + h / 2;
    if (w / h > r) h = w / r; else w = h * r;
    w = Math.min(Math.max(w, 60), FW * 1.6);
    h = w / r;
    x = Math.min(Math.max(cx - w / 2, -w / 2), FW - w / 2);
    y = Math.min(Math.max(cy - h / 2, -h / 2), FH - h / 2);
    return [x, y, w, h];
  }
  function draw() {
    if (!svg.clientWidth || !svg.clientHeight) return; // hidden on the List tab
    box = fit(box);
    svg.setAttribute('viewBox', box.join(' '));
    const u = box[2] / Math.max(1, svg.clientWidth);
    svg.style.setProperty('--u', u.toFixed(4));
    svg.classList.toggle('far', u > 1.4);
  }
  function zoomAt(factor: number, px = svg.clientWidth / 2, py = svg.clientHeight / 2) {
    const [x, y, w, h] = box;
    const fx = x + (px / svg.clientWidth) * w, fy = y + (py / svg.clientHeight) * h;
    const nw = w / factor, nh = h / factor;
    box = [fx - (px / svg.clientWidth) * nw, fy - (py / svg.clientHeight) * nh, nw, nh];
    draw();
  }
  let anim = 0;
  function flyTo(target: Box) {
    cancelAnimationFrame(anim);
    const from = [...box], to = fit(target), start = performance.now();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = (now: number) => {
      const k = reduce ? 1 : Math.min(1, (now - start) / 350);
      const e = 1 - (1 - k) ** 3;
      box = from.map((v, i) => v + (to[i] - v) * e) as Box;
      draw();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  // ---- pointer pan / pinch ---------------------------------------------
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  // Pointer capture retargets the click to the <svg>, so remember the pressed pin ourselves.
  let pressed: string | null = null;
  svg.addEventListener('pointerdown', (e) => {
    pressed = pointers.size ? null : (e.target as Element).closest<SVGGElement>('.pin')?.dataset.id ?? null;
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) moved = 0;
    svg.classList.add('dragging');
  });
  svg.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const pts = [...pointers.values()];
    const u = box[2] / svg.clientWidth;
    if (pointers.size === 1) {
      box[0] -= (e.clientX - prev.x) * u;
      box[1] -= (e.clientY - prev.y) * u;
      moved += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      draw();
    } else if (pointers.size === 2) {
      const other = pts.find((p) => p !== prev)!;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const rect = svg.getBoundingClientRect();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved += 10;
      if (before > 0) zoomAt(after / before, (e.clientX + other.x) / 2 - rect.left, (e.clientY + other.y) / 2 - rect.top);
    }
  });
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (!pointers.size) svg.classList.remove('dragging');
  };
  svg.addEventListener('pointerup', (e) => {
    if (pressed && moved < 8 && pointers.size === 1) {
      select(pressed, { fly: false });
      // The bottom sheet opens under the finger; swallow the click that follows the tap,
      // or it lands on a "Nearby" link in the sheet.
      const swallow = (c: Event) => { c.stopPropagation(); c.preventDefault(); };
      document.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 500);
    }
    pressed = null;
    release(e);
  });
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  $('#zoom-in').addEventListener('click', () => zoomAt(1.5));
  $('#zoom-out').addEventListener('click', () => zoomAt(1 / 1.5));
  $('#zoom-reset').addEventListener('click', () => flyTo(home));
  new ResizeObserver(draw).observe(svg);

  // ---- selection --------------------------------------------------------
  function select(id: string | null, { fly = true } = {}) {
    selected = id;
    $$('.pin', svg).forEach((p) => p.classList.toggle('selected', p.dataset.id === id));
    $$('article', detail).forEach((a) => (a.hidden = a.dataset.id !== id));
    detail.hidden = !id;
    history.replaceState(null, '', id ? `#${id}` : location.pathname);
    if (!id) return;
    const pin = $(`.pin[data-id="${id}"]`, svg);
    pin.parentNode!.appendChild(pin); // draw on top
    if (fly) {
      const cs = getComputedStyle(pin);
      const x = parseFloat(cs.getPropertyValue('--x')), y = parseFloat(cs.getPropertyValue('--y'));
      const w = Math.min(box[2], 260);
      flyTo([x - w / 2, y - w / 2, w, w]);
    }
  }
  svg.addEventListener('keydown', (e) => {
    const pin = (e.target as Element).closest<SVGGElement>('.pin');
    if (pin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(pin.dataset.id!); }
  });
  document.addEventListener('click', (e) => {
    const go = (e.target as Element).closest<HTMLElement>('[data-goto]');
    if (!go) return;
    showTab('map');
    select(go.dataset.goto!);
  });
  $('#detail-close').addEventListener('click', () => select(null));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) select(null); });

  // ---- tabs (phones only) ----------------------------------------------
  function showTab(tab: 'map' | 'list') {
    if (desktop.matches) return;
    app.dataset.tab = tab;
    $$('[data-tab]', document).forEach((b) => b.getAttribute('role') === 'tab' && b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (tab === 'map') requestAnimationFrame(draw);
  }
  $$('button[role="tab"]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab as 'map' | 'list')));

  // ---- search + layers --------------------------------------------------
  const layers = new Set(['neighbourhood', 'library', 'serviceontario']);
  const q = $<HTMLInputElement>('#q');
  function filter() {
    const words = fold(q.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    $$('#results li').forEach((li) => {
      const hit = layers.has(li.dataset.kind!) && words.every((w) => li.dataset.search!.includes(w));
      li.hidden = !hit;
      $(`.pin[data-id="${li.dataset.id}"]`, svg).classList.toggle('hidden', !hit);
      if (hit) shown++;
    });
    $('#empty').hidden = shown > 0;
  }
  q.addEventListener('input', filter);
  q.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const first = $$('#results li').find((li) => !li.hidden);
    if (first) { showTab('map'); select(first.dataset.id!); }
  });
  q.addEventListener('focus', () => showTab('list'));
  $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
    const k = chip.dataset.layer!;
    layers.has(k) ? layers.delete(k) : layers.add(k);
    chip.setAttribute('aria-pressed', String(layers.has(k)));
    filter();
  }));

  // ---- keep the selection when switching language ----------------------
  $$<HTMLAnchorElement>('[data-lang-link]').forEach((a) => a.addEventListener('click', () => {
    if (selected) a.hash = selected;
  }));

  // ---- offline status ---------------------------------------------------
  const status = $('#status');
  function online() {
    status.classList.toggle('offline', !navigator.onLine);
    status.textContent = navigator.onLine ? (status.dataset.saved ? status.dataset.ready! : '') : status.dataset.offline!;
  }
  addEventListener('online', online);
  addEventListener('offline', online);
  navigator.serviceWorker?.ready.then(() => { status.dataset.saved = '1'; online(); });
  online();

  draw();
  const start = location.hash.slice(1);
  if (start && $(`article[data-id="${CSS.escape(start)}"]`, detail)) select(start);
}
