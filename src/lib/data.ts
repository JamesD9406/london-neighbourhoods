import neighbourhoods from '../data/neighbourhoods.json';
import placesFile from '../data/places.json';
import parksFile from '../data/parks.json';
import cafesFile from '../data/cafes.json';
import { project } from './geo.js';
import { LANGS, STRINGS, type Lang } from '../i18n/strings';

/** Every kind of thing on the map, in drawing order (later kinds are drawn on top). */
export const KINDS = ['cafe', 'park', 'library', 'serviceontario', 'neighbourhood'] as const;
export type Kind = (typeof KINDS)[number];
type Localized = Record<Lang, string>;

export interface Item {
  id: string;
  kind: Kind;
  /** Map number for neighbourhoods (1–20). */
  n?: number;
  /** Print-map code: libraries L1–L16, ServiceOntario S1–S4, parks P1–P15. */
  code?: string;
  name: Localized;
  text?: Localized;
  note?: Localized;
  tags: string[];
  address?: string;
  url?: string;
  approximate?: boolean;
  lat: number;
  lon: number;
  x: number;
  y: number;
  /** Ids of the closest place of each kind (neighbourhoods only). */
  nearby: string[];
}

const same = (s: string): Localized => ({ en: s, es: s, ar: s });
const fromStrings = (pick: (s: (typeof STRINGS)['en']) => string): Localized =>
  Object.fromEntries(LANGS.map((l) => [l, pick(STRINGS[l])])) as Localized;
const at = (lat: number, lon: number) => { const [x, y] = project(lat, lon); return { lat, lon, x, y }; };

const services: Item[] = placesFile.places.map((p) => ({
  id: p.id,
  kind: p.type as Kind,
  name: same(p.name),
  note: 'note' in p ? (p.note as Localized) : undefined,
  tags: [],
  address: p.address,
  url: 'url' in p ? (p.url as string) : placesFile.sources.library,
  approximate: 'approximate' in p ? Boolean(p.approximate) : undefined,
  ...at(p.lat, p.lon),
  nearby: [],
}));

const parks: Item[] = parksFile.parks.map((p) => ({
  id: p.id, kind: 'park', name: same(p.name), text: p.text, tags: ['parks', 'walks'], ...at(p.lat, p.lon), nearby: [],
}));

const cafes: Item[] = cafesFile.cafes.map((c) => ({
  id: c.id,
  kind: 'cafe',
  name: same(c.name),
  // Newcomers will hear about Tim Hortons constantly, so it gets a short explainer.
  note: c.brand === 'Tim Hortons' || c.name === 'Tim Hortons' ? fromStrings((s) => s.timsNote) : undefined,
  tags: ['coffee'],
  address: c.address,
  url: c.url,
  ...at(c.lat, c.lon),
  nearby: [],
}));

const places = [...services, ...parks, ...cafes];

// Straight-line km; plenty for "what's close to this neighbourhood".
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dx = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 110.57;
  return Math.hypot(dx, dy);
}
const RADIUS: Partial<Record<Kind, number>> = { library: 2.5, serviceontario: 2.5, park: 2.5, cafe: 1.5 };

const hoods: Item[] = neighbourhoods.map((h, i) => {
  // The closest place of each kind, so cafés (there are many) can't crowd out the library.
  const nearby = (Object.keys(RADIUS) as Kind[]).flatMap((kind) => {
    const best = places
      .filter((p) => p.kind === kind)
      .map((p) => ({ p, d: km(h, p) }))
      .filter(({ d }) => d < RADIUS[kind]!)
      .sort((a, b) => a.d - b.d)[0];
    return best ? [best.p.id] : [];
  });
  return { id: h.id, kind: 'neighbourhood', n: i + 1, name: h.name, text: h.text, tags: h.tags, ...at(h.lat, h.lon), nearby };
});

// Neighbourhood points are approximate; library, ServiceOntario and park points are exact.
// Nudge neighbourhood pins (never places) apart so nothing hides under a number on the map.
// Cafés are small, drawn underneath, and too numerous to push against.
const GAP = 20; // SVG units, about 600 m
const solid = places.filter((p) => p.kind !== 'cafe');
for (let pass = 0; pass < 30; pass++) {
  for (const h of hoods) {
    for (const o of [...solid, ...hoods]) {
      if (o === h) continue;
      const dx = h.x - o.x, dy = h.y - o.y, d = Math.hypot(dx, dy) || 0.01;
      if (d >= GAP) continue;
      // Places don't move, so the neighbourhood takes the whole push; two neighbourhoods share it.
      const push = (GAP - d) * (o.kind === 'neighbourhood' ? 0.25 : 0.5);
      h.x += (dx / d) * push;
      h.y += (dy / d) * push;
    }
  }
}

// Short codes for the printed map, where pins can't be tapped.
const PREFIX: Partial<Record<Kind, string>> = { library: 'L', serviceontario: 'S', park: 'P' };
const counts: Record<string, number> = {};
for (const p of solid) p.code = `${PREFIX[p.kind]}${(counts[p.kind] = (counts[p.kind] ?? 0) + 1)}`;

export const ITEMS: Item[] = [...hoods, ...services, ...parks, ...cafes];
export const CHECKED = placesFile.checked;
export const CAFES_CHECKED = cafesFile.checked;
export const SOURCES = placesFile.sources;
