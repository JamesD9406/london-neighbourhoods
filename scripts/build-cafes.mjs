// Builds src/data/cafes.json from OpenStreetMap (every amenity=cafe in the map area).
// Cafés open and close often, so re-run this before regenerating the PDFs.
//
//   node scripts/build-cafes.mjs [--from saved-overpass.json]
import { readFile, writeFile } from 'node:fs/promises';
import { BBOX } from '../src/lib/geo.js';

const QUERY = `[out:json][timeout:90];nwr["amenity"="cafe"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});out center tags;`;

async function load() {
  const i = process.argv.indexOf('--from');
  if (i > -1) return JSON.parse(await readFile(process.argv[i + 1], 'utf8'));
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': 'london-neighbourhoods-guide (build script)' },
        body: new URLSearchParams({ data: QUERY }),
      }).catch(() => null);
      const text = res?.ok ? await res.text() : '';
      if (text.startsWith('{')) return JSON.parse(text);
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error('No Overpass server answered');
}

const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const data = await load();
// Same-named cafés are numbered in the order they arrive (starbucks-2, -3…), and Overpass's order
// isn't fixed. Sort by OpenStreetMap id so each keeps its id from run to run.
data.elements.sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);
const seen = new Map();
const cafes = data.elements
  .map((e) => {
    // Nodes have lat/lon; buildings have a center (or only bounds, depending on the query).
    const b = e.bounds;
    const mid = b && { lat: (b.minlat + b.maxlat) / 2, lon: (b.minlon + b.maxlon) / 2 };
    const c = e.center ?? mid ?? e;
    return { t: e.tags ?? {}, lat: c.lat, lon: c.lon };
  })
  .filter(({ t, lat }) => t.amenity === 'cafe' && t.name && lat)
  .map(({ t, lat, lon }) => {
    const base = `cafe-${slug(t.name)}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const street = t['addr:street'] ? `${t['addr:housenumber'] ?? ''} ${t['addr:street']}`.trim() : undefined;
    return {
      id: n > 1 ? `${base}-${n}` : base,
      name: t.name,
      brand: t.brand,
      address: street,
      url: t.website ?? t['contact:website'],
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

await writeFile(new URL('../src/data/cafes.json', import.meta.url), JSON.stringify({
  checked: new Date().toISOString().slice(0, 10),
  source: 'OpenStreetMap contributors (ODbL)',
  cafes,
}, null, 1));
console.log(`cafes.json: ${cafes.length} cafés (${cafes.filter((c) => c.address).length} with an address)`);
