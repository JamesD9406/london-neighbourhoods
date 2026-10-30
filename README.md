# London, Ontario: newcomer neighbourhood guide

An offline-first, multilingual map of London, Ontario for people who are new to the city. It covers 20 neighbourhoods, all 16 London Public Library branches and the 4 ServiceOntario offices. It's available in English, Spanish and Arabic.

It started with a conversation while volunteering with Canada Connects and the South London Neighbourhood Resource Centre. Newcomers said that one of the hardest parts of arriving was learning the city: what the neighbourhoods are called, where things are, and why you'd go there.

**Live:** https://london.jamesdunford.com

## What it does

- **Works with no connection.** After one visit, the service worker stores the whole site, including the map and the PDFs. It still works on a bus with no data plan.
- **Mobile first.** It has large tap targets, pinch-to-zoom, a bottom sheet for details, and Map/List tabs on small screens.
- **Three languages, including right-to-left Arabic.** The layout uses CSS logical properties, so it mirrors without separate styles. Place and street names stay in English because that's what's on the signs.
- **Search in any language from any page.** "biblioteca", "مكتبة" and "library" all find libraries. Search ignores accents, and "ohip" finds ServiceOntario.
- **Printable PDF for each language.** It's generated from the same data and print page as the website, so the paper version can't drift from the site.
- **No tracking, no cookies, and no location requests.**

## How it's built

| Part | Approach |
|---|---|
| Site | [Astro](https://astro.build), static output, TypeScript, no UI framework. About 5 KB of JavaScript. |
| Map | A custom SVG basemap built from OpenStreetMap data (`scripts/build-basemap.mjs`). It's about 78 KB, has no tiles or API keys, and is sharp at any zoom and in print. |
| Data | `src/data/neighbourhoods.json` and `src/data/places.json` are the only sources of truth. "Nearby" links are worked out from the coordinates. |
| Offline | `astro.config.mjs` writes `sw.js` after each build, with every output file precached. A content hash in the cache name means a new deploy replaces the old cache. |
| PDF | `scripts/make-assets.mjs` prints `/{lang}/print/` with headless Chromium and also renders the app icons. |

## Working on it

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # static site in dist/
npm run assets       # regenerate PDFs and icons (first time: npx playwright install chromium)
npm run basemap      # refresh the OpenStreetMap basemap
```

### Updating places

1. Edit `src/data/places.json` and update `"checked"` to today's date.
2. Run `npm run assets` so the PDFs pick up the change, then commit the PDFs.

Sources: [London Public Library locations](https://www.lpl.ca/locations), [ServiceOntario locations](https://www.ontario.ca/locations/serviceontario/all-locations).

### Adding a language

Add the language code to `LANGS` in `src/i18n/strings.ts` and add a strings object for it. Then add the same key to every `name`, `text` and `note` in the data files, and to `supported` in `src/pages/index.astro`.

## Deploying (Vercel)

Import the repo into Vercel. The framework preset is Astro, the build command is `npm run build` and the output folder is `dist`. Then add `london.jamesdunford.com` as a domain and create the CNAME record your DNS provider asks for. The PDFs are committed in `public/pdf/`, so the Vercel build doesn't need Chromium.

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the ODbL. Neighbourhood descriptions are editorial introductions, not safety ratings.
