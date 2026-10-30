// Address search. Streets and intersections come from /streets.json (offline, precached).
// House numbers go to OpenStreetMap's Nominatim, only when the user asks and is online.
import { BBOX } from './geo.js';

export interface Hit {
  kind: 'street' | 'intersection' | 'address';
  label: string;
  lat: number;
  lon: number;
  /** Street extent to fit on screen: [minLat, minLon, maxLat, maxLon]. */
  bounds?: [number, number, number, number];
}

type StreetRow = [string, number, number, number, number, number, number];
interface Index { streets: StreetRow[]; intersections: [number, number, number, number][]; tokens: string[][] }

// Both the index and what people type are reduced to the same short forms,
// so "Wonderland Road North", "wonderland rd n" and "Wonderland N" all match.
const SHORT: Record<string, string> = {
  street: 'st', road: 'rd', avenue: 'ave', av: 'ave', drive: 'dr', boulevard: 'blvd', crescent: 'cres',
  court: 'ct', place: 'pl', parkway: 'pkwy', lane: 'ln', terrace: 'terr', circle: 'cir', gate: 'gt',
  north: 'n', south: 's', east: 'e', west: 'w', highway: 'hwy',
};
const tokens = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .filter(Boolean).map((w) => SHORT[w] ?? w);

// "Dundas & Richmond", "dundas and richmond", "Dundas at Richmond", "Dundas / Richmond", "Dundas y Richmond"
// (\b doesn't work for Arabic letters in JS, so "و" (and) needs a leading space instead.)
const SPLIT = /\s*(?:&|\/|@|\+|\band\b|\bat\b|\by\b)\s*|\s+و\s*/i;

/** True when the query starts with a house number, which needs the online lookup. */
export const isHouseNumber = (q: string) => /^\s*\d+[a-z]?\s+\S/i.test(q);

let index: Promise<Index> | null = null;
export function loadStreets() {
  index ??= fetch('/streets.json')
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((d) => ({ ...d, tokens: d.streets.map((s: StreetRow) => tokens(s[0])) }))
    .catch((e) => { index = null; throw e; });
  return index;
}

/** Every query word must be the start of some word in the street name. */
function matches(streetTokens: string[], words: string[]) {
  return words.length > 0 && words.every((w) => streetTokens.some((t) => t.startsWith(w)));
}

export async function searchStreets(q: string, limit = 25): Promise<Hit[]> {
  const idx = await loadStreets();
  const parts = q.split(SPLIT).map(tokens).filter((p) => p.length);
  if (!parts.length) return [];
  const score = (i: number, words: string[]) => idx.tokens[i].length - words.length; // tighter match first

  if (parts.length === 1) {
    return idx.streets
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => matches(idx.tokens[i], parts[0]))
      .sort((a, b) => score(a.i, parts[0]) - score(b.i, parts[0]) || a.s[0].localeCompare(b.s[0]))
      .slice(0, limit)
      .map(({ s }) => ({ kind: 'street' as const, label: s[0], lat: s[1], lon: s[2], bounds: [s[3], s[4], s[5], s[6]] as Hit['bounds'] }));
  }

  const [a, b] = parts;
  const hits: Hit[] = [];
  for (const [x, y, lat, lon] of idx.intersections) {
    const forward = matches(idx.tokens[x], a) && matches(idx.tokens[y], b);
    const back = matches(idx.tokens[y], a) && matches(idx.tokens[x], b);
    if (!forward && !back) continue;
    const [first, second] = forward ? [x, y] : [y, x];
    hits.push({ kind: 'intersection', label: `${idx.streets[first][0]} & ${idx.streets[second][0]}`, lat, lon });
    if (hits.length >= limit) break;
  }
  return hits.sort((p, q2) => p.label.length - q2.label.length);
}

/** House-number lookup via OpenStreetMap Nominatim (needs internet; called only on request). */
export async function lookupOnline(q: string, lang: string): Promise<Hit[]> {
  const params = new URLSearchParams({
    q: /london/i.test(q) ? q : `${q}, London, Ontario`,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'ca',
    viewbox: `${BBOX.west},${BBOX.north},${BBOX.east},${BBOX.south}`,
    bounded: '1',
    'accept-language': lang,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  const rows: { display_name: string; lat: string; lon: string }[] = await res.json();
  return rows.map((r) => ({
    kind: 'address',
    // "251, Dundas Street, Downtown, London, …" → keep the first few parts.
    label: r.display_name.split(', ').slice(0, 4).join(', '),
    lat: Number(r.lat),
    lon: Number(r.lon),
  }));
}
