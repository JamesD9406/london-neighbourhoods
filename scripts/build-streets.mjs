// Builds public/streets.json: every named street in the map area and every place two
// differently-named streets meet, for offline street and intersection search.
// Data © OpenStreetMap contributors (ODbL).
//
//   node scripts/build-streets.mjs [--from saved.json] [--save saved.json]
import { readFile, writeFile } from 'node:fs/promises';
import { BBOX } from '../src/lib/geo.js';

const QUERY = `[out:json][timeout:300];
way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street)$"]["name"]
  (${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
out body; >; out skel qt;`;

async function load() {
  const i = process.argv.indexOf('--from');
  if (i > -1) return JSON.parse(await readFile(process.argv[i + 1], 'utf8'));
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
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
      console.warn(`${url} failed (${res?.status ?? 'network'}), retrying`);
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error('No Overpass server answered');
}

const round = (n) => Math.round(n * 1e5) / 1e5;
const km = (a, b) => Math.hypot((a[1] - b[1]) * 81.4, (a[0] - b[0]) * 110.57); // [lat, lon] at London's latitude

const data = await load();
const coords = new Map(); // node id -> [lat, lon]
for (const el of data.elements) if (el.type === 'node') coords.set(el.id, [el.lat, el.lon]);

// Street names, and which names touch each node.
const names = [];
const nameIndex = new Map();
const extent = []; // per name: [minLat, minLon, maxLat, maxLon]
const anchor = []; // per name: { len, at: [lat, lon] } — a point on the street itself, from its longest piece
const atNode = new Map(); // node id -> Set of name indexes
for (const el of data.elements) {
  if (el.type !== 'way') continue;
  const name = el.tags.name.trim();
  if (!nameIndex.has(name)) { nameIndex.set(name, names.length); names.push(name); extent.push([90, 180, -90, -180]); anchor.push({ len: 0, at: null }); }
  const n = nameIndex.get(name);
  const mid = coords.get(el.nodes[Math.floor(el.nodes.length / 2)]);
  if (mid && el.nodes.length > anchor[n].len) anchor[n] = { len: el.nodes.length, at: mid };
  for (const id of el.nodes) {
    const c = coords.get(id);
    if (!c) continue;
    const e = extent[n];
    e[0] = Math.min(e[0], c[0]); e[1] = Math.min(e[1], c[1]); e[2] = Math.max(e[2], c[0]); e[3] = Math.max(e[3], c[1]);
    (atNode.get(id) ?? atNode.set(id, new Set()).get(id)).add(n);
  }
}

// Intersections: nodes shared by two different names. A pair can meet more than once
// (crescents, divided roads); keep separate points only when they're > 300 m apart.
const pairs = new Map(); // "a|b" -> [[lat, lon], ...]
for (const [id, set] of atNode) {
  if (set.size < 2) continue;
  const list = [...set].sort((a, b) => a - b);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const key = `${list[i]}|${list[j]}`;
    const pts = pairs.get(key) ?? pairs.set(key, []).get(key);
    const c = coords.get(id);
    if (pts.every((p) => km(p, c) > 0.3)) pts.push(c);
  }
}

const intersections = [];
for (const [key, pts] of pairs) {
  const [a, b] = key.split('|').map(Number);
  for (const [lat, lon] of pts) intersections.push([a, b, round(lat), round(lon)]);
}

const out = {
  generated: new Date().toISOString().slice(0, 10),
  attribution: '© OpenStreetMap contributors (ODbL)',
  // [name, lat, lon (a point on the street), minLat, minLon, maxLat, maxLon]
  streets: names.map((n, i) => [n, ...anchor[i].at.map(round), ...extent[i].map(round)]),
  // [streetIndexA, streetIndexB, lat, lon]
  intersections,
};
const json = JSON.stringify(out);
await writeFile(new URL('../public/streets.json', import.meta.url), json);
console.log(`streets.json: ${(json.length / 1024).toFixed(0)} KB, ${names.length} streets, ${intersections.length} intersections`);
