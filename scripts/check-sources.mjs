// Watches the official pages that src/data/libraries.json and src/data/places.json are based on.
// Saves each page's readable text in scripts/source-snapshots.json. When a page's text changes, or a
// page stops loading, writes a Markdown report for the weekly GitHub Action to post as an issue.
// It never changes what the data says: a person reads the change and decides. The one thing it does
// update is a data file's "checked" date, when every page behind that file loaded and was unchanged.
//
//   node scripts/check-sources.mjs [--report report.md]
import { readFile, writeFile } from 'node:fs/promises';

const SNAPSHOTS = new URL('./source-snapshots.json', import.meta.url);
const LIBRARIES = new URL('../src/data/libraries.json', import.meta.url);
const PLACES = new URL('../src/data/places.json', import.meta.url);
const libraries = JSON.parse(await readFile(LIBRARIES, 'utf8'));
const places = JSON.parse(await readFile(PLACES, 'utf8'));

// Every page, with what it backs up, so the report says why it matters.
const uses = new Map();
const use = (url, what) => uses.set(url, [...(uses.get(url) ?? []), what]);
use(libraries.source, 'library branches, addresses and hours');
for (const [key, url] of Object.entries(libraries.services)) use(url, `library service \`${key}\``);
for (const url of Object.values(places.sources)) use(url, 'list of ServiceOntario offices');
for (const p of places.places) if (p.url) use(p.url, p.name);

// Which pages each data file depends on, for moving its "checked" date.
const DATA_FILES = [
  { file: LIBRARIES, urls: [libraries.source, ...Object.values(libraries.services)] },
  { file: PLACES, urls: [...Object.values(places.sources), ...places.places.map((p) => p.url).filter(Boolean)] },
];

// The ServiceOntario list covers all of Ontario. Keep only London: the town's name on its own line,
// then its addresses, which start with a number. If the layout changes, the lines vanish and that's flagged too.
const LONDON_ONLY = (lines) => {
  const i = lines.indexOf('London');
  if (i < 0) return [];
  const end = lines.findIndex((l, j) => j > i && !/^\d/.test(l));
  return lines.slice(i, end < 0 ? undefined : end);
};
const FILTERS = Object.fromEntries(Object.values(places.sources).map((url) => [url, LONDON_ONLY]));

// Page text without markup, one line per block, so a change shows up as added and removed lines.
// Only <main> when there is one: menus and footers change for reasons that don't matter here.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—' };
function readable(html) {
  const main = html.match(/<main[\s\S]*<\/main>/i)?.[0] ?? html;
  return main
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|td|th|dt|dd|section|article|header|footer)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

async function load(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'london-neighbourhoods-guide (weekly source check)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { lines: readable(await res.text()) };
  } catch (e) {
    return { error: e.name === 'TimeoutError' ? 'timed out' : e.message };
  }
}

const old = await readFile(SNAPSHOTS, 'utf8').then(JSON.parse, () => ({}));
const next = {};
const changed = [];
const failed = [];
const unchanged = new Set(); // Loaded, compared with a saved copy, and the same.
for (const [url, what] of uses) {
  const page = await load(url);
  if (page.error) {
    failed.push({ url, what, error: page.error });
    if (old[url]) next[url] = old[url]; // Keep the last good copy to compare against next time.
    continue;
  }
  page.lines = (FILTERS[url] ?? ((l) => l))(page.lines);
  next[url] = page.lines;
  if (!old[url]) continue; // First sighting: nothing to compare yet.
  const before = new Set(old[url]), after = new Set(page.lines);
  const removed = old[url].filter((l) => !after.has(l));
  const added = page.lines.filter((l) => !before.has(l));
  if (removed.length || added.length) changed.push({ url, what, removed, added });
  else unchanged.add(url);
}

// Sorted keys and one line per entry keep the committed file's diffs readable.
await writeFile(SNAPSHOTS, JSON.stringify(Object.fromEntries(Object.entries(next).sort()), null, 1) + '\n');
console.log(`${uses.size} pages: ${changed.length} changed, ${failed.length} failed`);

// If every page behind a data file is still what it was, the data still matches as of today.
// Otherwise the date stays on the last day it was known to match, until a person updates it.
// Replace just the date text: the files are laid out by hand, and re-serializing would undo that.
const today = new Date().toISOString().slice(0, 10);
for (const { file, urls } of DATA_FILES) {
  const name = file.pathname.split('/').pop();
  if (!urls.every((u) => unchanged.has(u))) { console.log(`${name}: "checked" date left as it was`); continue; }
  const text = await readFile(file, 'utf8');
  await writeFile(file, text.replace(/("checked":\s*")\d{4}-\d{2}-\d{2}"/, `$1${today}"`));
  console.log(`${name}: "checked" date set to ${today}`);
}

const r = process.argv.indexOf('--report');
if (r > -1 && (changed.length || failed.length)) {
  const MAX = 40;
  const list = (lines, sign) => [
    ...lines.slice(0, MAX).map((l) => `${sign} ${l}`),
    ...(lines.length > MAX ? [`… and ${lines.length - MAX} more`] : []),
  ];
  const out = [`Weekly check of the pages behind \`libraries.json\` and \`places.json\`, ${new Date().toISOString().slice(0, 10)}.`, ''];
  if (failed.length) {
    out.push('## Not loading', '', 'Check whether the page moved. If it did, update its URL in the data file.', '');
    for (const f of failed) out.push(`- ${f.url} (${f.error}): ${f.what.join('; ')}`);
    out.push('');
  }
  if (changed.length) {
    out.push('## Changed', '');
    for (const c of changed) {
      out.push(`### ${c.url}`, '', `Used for: ${c.what.join('; ')}`, '', '```diff', ...list(c.removed, '-'), ...list(c.added, '+'), '```', '');
    }
  }
  out.push('---', 'Update the data files if anything we show is affected. Then merge the **Weekly data refresh** pull request, so next week compares against these versions.');
  await writeFile(process.argv[r + 1], out.join('\n'));
}
