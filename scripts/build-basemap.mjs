// Builds src/data/basemap.json: a tiny, offline vector basemap (river, major roads,
// a few street labels) projected into SVG coordinates. Data © OpenStreetMap contributors (ODbL).
//
//   node scripts/build-basemap.mjs              fetch fresh data from Overpass
//   node scripts/build-basemap.mjs --from x.json  reuse a saved Overpass response
import { readFile, writeFile } from 'node:fs/promises';
import { BBOX, WIDTH, HEIGHT, project } from '../src/lib/geo.js';

const QUERY = `[out:json][timeout:120];(
  way["waterway"="river"]["name"~"Thames"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);out geom;`;

// Streets people use as landmarks when giving directions. Labels stay in English: that's what's on the signs.
const LABELS = [
  'Dundas Street', 'Oxford Street West', 'Oxford Street East', 'Wellington Road', 'Richmond Street',
  'Wonderland Road North', 'Wonderland Road South', 'Highbury Avenue North', 'Commissioners Road West',
  'Commissioners Road East', 'Fanshawe Park Road West', 'Fanshawe Park Road East', 'Hyde Park Road',
  'Adelaide Street North', 'Southdale Road East', 'Clarke Road', 'Highway 401', 'Highway 402',
  'Veterans Memorial Parkway', 'Sunningdale Road West', 'Hamilton Road', 'Wharncliffe Road South',
];

async function load() {
  const i = process.argv.indexOf('--from');
  if (i > -1) return JSON.parse(await readFile(process.argv[i + 1], 'utf8'));
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const url of servers) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'User-Agent': 'london-neighbourhoods-guide (build script)' },
      body: new URLSearchParams({ data: QUERY }),
    });
    if (res.ok) return res.json();
    console.warn(`${url} answered ${res.status}, trying the next server`);
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
const toPath = (pts) => 'M' + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L');

const data = await load();
const layers = { river: [], motorway: [], trunk: [], primary: [], secondary: [] };
const byName = new Map();

for (const el of data.elements) {
  if (el.type !== 'way' || !el.geometry) continue;
  const pts = simplify(el.geometry.map((g) => project(g.lat, g.lon)), 0.6);
  const kind = el.tags.waterway ? 'river' : el.tags.highway;
  layers[kind]?.push(toPath(pts));
  const name = el.tags.name;
  if (name && LABELS.includes(name)) (byName.get(name) ?? byName.set(name, []).get(name)).push(pts);
}

// One label per street, at the middle of its longest piece, rotated along the road.
const labels = [];
for (const [name, ways] of byName) {
  const length = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
  const pts = ways.sort((a, b) => length(b) - length(a))[0];
  if (pts.length < 2 || length(pts) < 40) continue;
  const mid = Math.floor((pts.length - 1) / 2);
  const [a, b] = [pts[mid], pts[mid + 1]];
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  labels.push({ text: name.replace(/ (North|South|East|West)$/, ''), x: r((a[0] + b[0]) / 2), y: r((a[1] + b[1]) / 2), angle: Math.round(angle) });
}

const out = {
  width: WIDTH,
  height: HEIGHT,
  generated: new Date().toISOString().slice(0, 10),
  attribution: '© OpenStreetMap contributors',
  river: layers.river.join(''),
  motorway: layers.motorway.join(''),
  trunk: layers.trunk.join(''),
  primary: layers.primary.join(''),
  secondary: layers.secondary.join(''),
  labels,
};
await writeFile(new URL('../src/data/basemap.json', import.meta.url), JSON.stringify(out));
console.log(`basemap.json: ${(JSON.stringify(out).length / 1024).toFixed(0)} KB, ${labels.length} labels`);
