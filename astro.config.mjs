import { defineConfig } from 'astro/config';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// After each build, write dist/sw.js with every output file precached.
// The version is a hash of the file contents, so a new deploy replaces the old cache.
function offline() {
  return {
    name: 'offline-service-worker',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        const files = [];
        for (const f of await readdir(root, { recursive: true, withFileTypes: true })) {
          if (!f.isFile() || f.name === 'sw.js') continue;
          files.push(relative(root, join(f.parentPath, f.name)).split(sep).join('/'));
        }
        const hash = createHash('sha256');
        for (const f of files.sort()) hash.update(f).update(await readFile(join(root, f)));
        // Pages are cached by their folder URL (/en/), not /en/index.html.
        const urls = files.map((f) => '/' + f.replace(/(^|\/)index\.html$/, '$1'));
        const template = await readFile(new URL('./src/sw-template.js', import.meta.url), 'utf8');
        const sw = template
          .replace('__VERSION__', hash.digest('hex').slice(0, 12))
          .replace('__FILES__', JSON.stringify(urls));
        await writeFile(join(root, 'sw.js'), sw);
        console.log(`sw.js: ${urls.length} files precached`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://london.jamesdunford.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [offline()],
});
