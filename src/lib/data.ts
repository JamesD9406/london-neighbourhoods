import neighbourhoods from '../data/neighbourhoods.json';
import placesFile from '../data/places.json';
import { project } from './geo.js';
import type { Lang } from '../i18n/strings';

export type Kind = 'neighbourhood' | 'library' | 'serviceontario';
type Localized = Record<Lang, string>;

export interface Item {
  id: string;
  kind: Kind;
  /** Map number for neighbourhoods (1–20); undefined for places. */
  n?: number;
  /** Print-map code for places (A–P, S1–S4). */
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
  /** Ids of the closest libraries and ServiceOntario offices (neighbourhoods only). */
  nearby: string[];
}

const same = (s: string): Localized => ({ en: s, es: s, ar: s });

const places: Item[] = placesFile.places.map((p) => {
  const [x, y] = project(p.lat, p.lon);
  return {
    id: p.id,
    kind: p.type as Kind,
    name: same(p.name),
    note: 'note' in p ? (p.note as Localized) : undefined,
    tags: [],
    address: p.address,
    url: 'url' in p ? (p.url as string) : placesFile.sources.library,
    approximate: 'approximate' in p ? Boolean(p.approximate) : undefined,
    lat: p.lat, lon: p.lon, x, y, nearby: [],
  };
});

// Straight-line km; plenty for "what's close to this neighbourhood".
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dx = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 110.57;
  return Math.hypot(dx, dy);
}

const hoods: Item[] = neighbourhoods.map((h, i) => {
  const [x, y] = project(h.lat, h.lon);
  const nearby = places
    .map((p) => ({ p, d: km(h, p) }))
    .filter(({ d }) => d < 2.5)
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map(({ p }) => p.id);
  return { id: h.id, kind: 'neighbourhood', n: i + 1, name: h.name, text: h.text, tags: h.tags, lat: h.lat, lon: h.lon, x, y, nearby };
});

// Neighbourhood points are approximate; library and ServiceOntario points are exact.
// Nudge neighbourhood pins (never places) apart so nothing hides under a number on the map.
const GAP = 20; // SVG units, about 600 m
for (let pass = 0; pass < 30; pass++) {
  for (const h of hoods) {
    for (const o of [...places, ...hoods]) {
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

// Short codes for the printed map, where pins can't be tapped: libraries A–P, ServiceOntario S1–S4.
let lib = 0, so = 0;
for (const p of places) p.code = p.kind === 'library' ? String.fromCharCode(65 + lib++) : `S${++so}`;

export const ITEMS: Item[] = [...hoods, ...places];
export const CHECKED = placesFile.checked;
export const SOURCES = placesFile.sources;
