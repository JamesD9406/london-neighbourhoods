// The Events tab: London Public Library programs for the next 7 days.
// Loaded only when the tab is first opened (the privacy note says so), from the feed the library's
// own calendar (programs.lpl.ca, run on Communico) uses. That feed isn't a published API, so it may
// change without notice; the full-calendar link stays as the fallback.
// The last good copy is kept in localStorage, so the tab still works offline.

const FEED = 'https://lpl.libnet.info/eeventcaldata';
const KEY = 'lpl-events';
const DAYS = 7;
const NEWCOMER = 'Newcomer & English Language Learning';

interface Row {
  id: string; title: string; description: string; event_start: string; event_end: string;
  library: string; venues: string; agesArray: string[]; tagsArray: string[];
  allow_reg: string; url: string; private_event: string;
  changed: string | null; changed_datestring: string | null; changed_time_string: string | null;
}
interface LibEvent {
  id: string; title: string; text: string;
  /** "YYYY-MM-DD HH:MM:SS", London time. */
  start: string; end: string;
  branch: string; room: string; ages: string[]; tags: string[];
  register: boolean; url: string;
  /** Set when the library has changed the event: its new date and time, or '' if not given. */
  changed: string | null;
}
interface Saved { saved: number; events: LibEvent[] }

const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
// The feed's text has HTML entities in it ("Crafts&#44; Hobbies"). A <textarea> decodes without running anything.
const decoder = document.createElement('textarea');
const decode = (s: string | null | undefined) => { decoder.innerHTML = s ?? ''; return decoder.value.trim(); };
// "2026-11-05 14:30:00" in London, Ontario, whatever time zone the visitor's device is set to.
const londonNow = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Toronto', dateStyle: 'short', timeStyle: 'medium' }).format(new Date());

async function download(): Promise<LibEvent[]> {
  const req = { date: londonNow().slice(0, 10), days: DAYS, locations: [], ages: [], types: [] };
  const res = await fetch(`${FEED}?${new URLSearchParams({ event_type: '0', req: JSON.stringify(req) })}`);
  if (!res.ok) throw new Error(String(res.status));
  const rows: Row[] = await res.json();
  return rows.filter((r) => r.private_event !== '1').map((r) => ({
    id: r.id,
    title: decode(r.title),
    text: decode(r.description),
    start: r.event_start,
    end: r.event_end,
    branch: decode(r.library),
    room: decode(r.venues),
    ages: (r.agesArray ?? []).map(decode),
    tags: (r.tagsArray ?? []).map(decode),
    register: r.allow_reg === '1',
    url: r.url,
    changed: r.changed && r.changed !== '0'
      ? [r.changed_datestring, r.changed_time_string].map(decode).filter(Boolean).join(' ')
      : null,
  }));
}

function readSaved(): Saved | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}

/** Fresh events when online; the saved copy when offline or when the feed fails. */
async function load(): Promise<Saved & { stale: boolean }> {
  const saved = readSaved();
  if (navigator.onLine) {
    try {
      const fresh = { saved: Date.now(), events: await download() };
      try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch {}
      return { ...fresh, stale: false };
    } catch (e) {
      if (!saved) throw e;
    }
  }
  if (!saved) throw new Error('offline');
  return { ...saved, stale: true };
}

/** Sets up the Events section; call show() each time the tab is opened. */
export function createEvents(section: HTMLElement, branchIds: Map<string, string>) {
  const lang = document.documentElement.lang;
  const d = section.dataset;
  const ageNames: Record<string, string> = JSON.parse(d.ages!);
  const status = $('#ev-status', section);
  const list = $('#ev-list', section);
  const newcomer = $<HTMLInputElement>('#ev-newcomer', section);
  const branch = $<HTMLSelectElement>('#ev-branch', section);
  const age = $<HTMLSelectElement>('#ev-age', section);
  let events: LibEvent[] = [];
  let loaded: Promise<void> | null = null;

  // Times are London local times; format them as given, whatever the device's own time zone.
  const asUtc = (s: string) => new Date(`${s.replace(' ', 'T')}Z`);
  const dayFmt = new Intl.DateTimeFormat(lang, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const timeFmt = new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
  const savedFmt = new Intl.DateTimeFormat(lang, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  // Branch names in the feed are "Crouch", "Central - Children's Library"; ours are "Crouch Library".
  const mapId = (name: string) => branchIds.get(name.split(' - ')[0]);

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  };
  // Event text is the library's, in English: mark it so screen readers pronounce it right.
  const english = <T extends HTMLElement>(e: T) => { e.lang = 'en'; e.dir = 'auto'; return e; };

  function card(e: LibEvent) {
    const art = el('article', 'event');
    art.append(english(el('h4', '', e.title)));
    const when = el('p', 'event__when');
    when.append(`${timeFmt.formatRange(asUtc(e.start), asUtc(e.end))} · `);
    const id = mapId(e.branch);
    if (id) {
      const b = el('button', '', e.branch);
      b.type = 'button';
      b.dataset.goto = id;
      when.append(b);
    } else when.append(english(el('span', '', e.branch)));
    if (e.room) when.append(' · ', english(el('span', '', e.room)));
    art.append(when);
    if (e.text) art.append(english(el('p', '', e.text)));
    if (e.ages.length) {
      const ul = el('ul', 'tags');
      ul.append(...e.ages.map((a) => el('li', '', ageNames[a] ?? a)));
      art.append(ul);
    }
    if (e.changed !== null) {
      const p = el('p', 'event__changed', d.changed);
      if (e.changed) p.append(` ${d.moved} `, english(el('span', '', e.changed)), '.');
      art.append(p);
    }
    if (e.register) art.append(el('p', 'note', d.register));
    const a = el('a', '', d.details);
    a.href = e.url;
    a.target = '_blank';
    a.rel = 'noopener';
    art.append(a);
    return art;
  }

  function render() {
    const now = londonNow();
    const shown = events.filter((e) => e.end > now
      && (!newcomer.checked || e.tags.includes(NEWCOMER))
      && (!branch.value || e.branch === branch.value)
      && (!age.value || e.ages.includes(age.value)));
    const days = new Map<string, LibEvent[]>();
    for (const e of shown) days.set(e.start.slice(0, 10), [...(days.get(e.start.slice(0, 10)) ?? []), e]);
    list.replaceChildren(...[...days].map(([day, items]) => {
      const group = el('section', 'events__day');
      group.append(el('h3', '', dayFmt.format(asUtc(`${day} 12:00:00`))), ...items.map(card));
      return group;
    }));
    if (!shown.length) list.append(el('p', 'empty', d.none));
  }

  async function fetchAndShow() {
    status.textContent = d.loading!;
    try {
      const result = await load();
      events = result.events.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
      // Branches that have events, in the dropdown; keep the visitor's choice if it's still there.
      const keep = branch.value;
      const names = [...new Set(events.map((e) => e.branch))].sort();
      branch.replaceChildren(branch.options[0], ...names.map((n) => new Option(n, n)));
      branch.value = names.includes(keep) ? keep : '';
      status.textContent = `${result.stale ? `${d.offline} ` : ''}${d.updated}: ${savedFmt.format(result.saved)}`;
      render();
    } catch {
      status.textContent = d.failed!;
      loaded = null; // Let the next visit to the tab try again.
    }
  }

  for (const input of [newcomer, branch, age]) input.addEventListener('change', render);
  return {
    show() {
      loaded ??= fetchAndShow();
      if (events.length) render(); // Drop events that ended while the tab was closed.
    },
  };
}
