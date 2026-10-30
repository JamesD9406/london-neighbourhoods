// Renders the app icons and the printable PDFs (one per language) with headless Chromium.
// The PDFs come from the same /{lang}/print/ page as the site, so they can't drift from it.
//   npm run assets   (first time: npx playwright install chromium)
import { execSync, spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 4329;
const LANGS = ['en', 'es', 'ar'];
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npx astro build');
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { shell: true, stdio: 'ignore' });

try {
  await waitFor(`http://localhost:${PORT}/en/`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
  for (const [size, pad, name] of [[192, 0, 'icon-192'], [512, 0, 'icon-512'], [512, 0.12, 'icon-512-maskable']]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0;background:#125f67;display:grid;place-items:center;height:100vh">
      <div style="width:${100 - pad * 200}%;height:${100 - pad * 200}%">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div>`);
    await writeFile(new URL(`../public/icons/${name}.png`, import.meta.url), await page.screenshot());
  }

  for (const lang of LANGS) {
    await page.goto(`http://localhost:${PORT}/${lang}/print/`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const out = fileURLToPath(new URL(`../public/pdf/london-guide-${lang}.pdf`, import.meta.url));
    await page.pdf({ path: out, width: '11in', height: '8.5in', printBackground: true, preferCSSPageSize: true });
    console.log(`pdf: london-guide-${lang}.pdf`);
  }
  await browser.close();
} finally {
  // With shell: true the server is a grandchild process; on Windows kill the whole tree.
  if (process.platform === 'win32') try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); } catch {}
  else server.kill();
}

// Rebuild so the new icons and PDFs are copied into dist/ and precached by the service worker.
run('npx astro build');

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview server did not start at ${url}`);
}
