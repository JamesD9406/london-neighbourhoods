// Builds src/data/basemap.json: a small, offline vector basemap (river, parks, roads and
// street labels) projected into SVG coordinates. Data © OpenStreetMap contributors (ODbL).
//
//   node scripts/build-basemap.mjs                 fetch fresh data from Overpass
//   node scripts/build-basemap.mjs --from x.json   reuse a saved Overpass response
//   node scripts/build-basemap.mjs --save x.json   also keep the raw response
import { readFile, writeFile } from 'node:fs/promises';
import { BBOX, WIDTH, HEIGHT, project } from '../src/lib/geo.js';

const B = `(${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east})`;
const QUERY = `[out:json][timeout:180];(
  way["waterway"="river"]["name"~"Thames"]${B};
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]${B};
  nwr["leisure"~"^(park|nature_reserve)$"]${B};
  nwr["landuse"="forest"]["name"]${B};
  nwr["natural"="wood"]["name"]${B};
);out geom;`;

// Label importance: 0 is always shown, higher ranks appear as you zoom in (see src/lib/labels.ts).
const RANK = { motorway: 0, trunk: 0, primary: 1, secondary: 2, tertiary: 3 };
const LABEL_SPACING = 170; // SVG units between repeated labels on one street (~5 km)

async function load() {
  const i = process.argv.indexOf('--from');
  if (i > -1) return JSON.parse(await readFile(process.argv[i + 1], 'utf8'));
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of servers) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': 'london-neighbourhoods-guide (build script)' },
        body: new URLSearchParams({ data: QUERY }),
      }).catch(() => null);
      const text = res?.ok ? await res.text() : '';
      if (text.startsWith('{')) {
        const s = process.argv.indexOf('--save');
        if (s > -1) await writeFile(process.argv[s + 1], text);
        return JSON.parse(text);
      }
      console.warn(`${url} failed (${res?.status ?? 'network'}), trying again`);
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error('No Overpass server answered');
}

// Douglas–Peucker simplification in projected (SVG) units.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], a, b);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}
function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const r = (n) => Math.round(n * 10) / 10;
const toPath = (pts, close = false) => 'M' + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L') + (close ? 'Z' : '');
const proj = (geom) => geom.map((g) => project(g.lat, g.lon));
const same = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
const length = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
function area(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s / 2);
}

// Join line pieces that share endpoints into longer chains (roads and multipolygon rings
// both arrive from OpenStreetMap as many short ways).
function chain(pieces) {
  const left = pieces.map((p) => [...p]);
  const out = [];
  while (left.length) {
    let line = left.pop();
    for (let grew = true; grew;) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i];
        const [s, e] = [line[0], line[line.length - 1]];
        if (same(e, p[0])) line = [...line, ...p.slice(1)];
        else if (same(e, p[p.length - 1])) line = [...line, ...[...p].reverse().slice(1)];
        else if (same(s, p[p.length - 1])) line = [...p, ...line.slice(1)];
        else if (same(s, p[0])) line = [...[...p].reverse(), ...line.slice(1)];
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    out.push(line);
  }
  return out;
}

// Point and angle `d` units along a polyline, with the angle smoothed over a short window.
function along(pts, d) {
  const at = (target) => {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + seg >= target) {
        const t = seg ? (target - acc) / seg : 0;
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      }
      acc += seg;
    }
    return pts[pts.length - 1];
  };
  const [p, a, b] = [at(d), at(d - 12), at(d + 12)];
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { x: r(p[0]), y: r(p[1]), a: Math.round(angle) };
}

// Street signs in London use these abbreviations, and short labels collide less.
const ABBR = [[/\bStreet\b/g, 'St'], [/\bRoad\b/g, 'Rd'], [/\bAvenue\b/g, 'Ave'], [/\bDrive\b/g, 'Dr'],
  [/\bBoulevard\b/g, 'Blvd'], [/\bParkway\b/g, 'Pkwy'], [/\bCrescent\b/g, 'Cres'], [/\bNorth$/, 'N'],
  [/\bSouth$/, 'S'], [/\bEast$/, 'E'], [/\bWest$/, 'W']];
const short = (name) => ABBR.reduce((s, [re, to]) => s.replace(re, to), name);

const data = await load();
const roads = { motorway: [], trunk: [], primary: [], secondary: [], tertiary: [] };
const river = [];
const parks = [];
const named = new Map(); // label text -> { rank, pieces }

for (const el of data.elements) {
  const t = el.tags ?? {};
  const isPark = t.leisure === 'park' || t.leisure === 'nature_reserve' || t.landuse === 'forest' || t.natural === 'wood';
  if (el.type === 'way' && el.geometry) {
    const pts = proj(el.geometry);
    if (t.waterway) river.push(simplify(pts, 0.6));
    else if (t.highway in roads) {
      roads[t.highway].push(simplify(pts, 0.6));
      if (t.name) {
        const key = short(t.name);
        const entry = named.get(key) ?? named.set(key, { rank: RANK[t.highway], pieces: [] }).get(key);
        entry.rank = Math.min(entry.rank, RANK[t.highway]);
        entry.pieces.push(pts);
      }
    } else if (isPark && same(pts[0], pts[pts.length - 1])) parks.push(pts);
  } else if (el.type === 'relation' && isPark && el.members) {
    const outers = el.members.filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry).map((m) => proj(m.geometry));
    for (const ring of chain(outers)) if (same(ring[0], ring[ring.length - 1])) parks.push(ring);
  }
}

const parkPaths = parks
  .filter((p) => area(p) > 3) // drop pockets under ~0.3 ha
  .map((p) => toPath(simplify(p, 0.5), true));

const labels = [];
for (const [text, { rank, pieces }] of named) {
  for (const line of chain(pieces)) {
    const len = length(line);
    if (len < 25) continue;
    // One label on short streets; evenly repeated labels on long ones.
    const n = Math.max(1, Math.floor(len / LABEL_SPACING));
    for (let i = 0; i < n; i++) labels.push({ t: text, r: rank, ...along(line, (len * (i + 0.5)) / n) });
  }
}
for (const line of chain(river)) {
  const len = length(line);
  for (let i = 0; i < Math.floor(len / 220); i++) labels.push({ t: 'Thames River', r: 1, river: 1, ...along(line, (len * (i + 0.5)) / Math.floor(len / 220)) });
}

const out = {
  width: WIDTH,
  height: HEIGHT,
  generated: new Date().toISOString().slice(0, 10),
  attribution: '© OpenStreetMap contributors',
  parks: parkPaths.join(''),
  river: river.map((p) => toPath(p)).join(''),
  ...Object.fromEntries(Object.entries(roads).map(([k, v]) => [k, v.map((p) => toPath(p)).join('')])),
  labels: labels.sort((a, b) => a.r - b.r),
};
await writeFile(new URL('../src/data/basemap.json', import.meta.url), JSON.stringify(out));
console.log(`basemap.json: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB, ${parkPaths.length} park areas, ${labels.length} labels`);
