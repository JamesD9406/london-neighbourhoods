// Street-label visibility: show more streets as you zoom in, and never let labels overlap
// each other or sit under a pin. Used by the interactive map and by the print page.

/** A label of rank r is eligible while SVG-units-per-pixel is below this. 0 = highways, 3 = minor streets. */
const MAX_UNITS_PER_PX = [Infinity, 2.2, 1.3, 0.6];
const PAD = 6; // px of breathing room between labels

type Box = { left: number; right: number; top: number; bottom: number };
const overlaps = (a: Box, b: Box, pad: number) =>
  a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;

export function cullLabels(svg: SVGSVGElement, unitsPerPx: number) {
  const labels = [...svg.querySelectorAll<SVGTextElement>('.labels text')];
  for (const el of labels) {
    el.style.display = unitsPerPx <= MAX_UNITS_PER_PX[Number(el.dataset.r)] ? '' : 'none';
  }
  const view = svg.getBoundingClientRect();
  const inside = (b: Box) => b.left >= view.left && b.right <= view.right && b.top >= view.top && b.bottom <= view.bottom;
  // Visible pins claim their space first: a label under a pin is unreadable.
  const placed: Box[] = [...svg.querySelectorAll('.pin:not(.hidden)')]
    .map((p) => p.getBoundingClientRect())
    .filter((b) => b.width && overlaps(b, view, 0));
  const pinCount = placed.length;
  // Labels arrive sorted by rank, so more important streets claim space next.
  for (const el of labels) {
    if (el.style.display === 'none') continue;
    const b = el.getBoundingClientRect();
    // Hide labels cut off by the map edge; half a street name is just noise.
    const clash = !inside(b) || placed.some((p, i) => overlaps(b, p, i < pinCount ? 1 : PAD));
    if (clash) el.style.display = 'none';
    else placed.push(b);
  }
}
