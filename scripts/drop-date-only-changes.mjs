// The OpenStreetMap scripts stamp today's date into their output, so every run looks like a change.
// For each file given, if nothing but the date changed since the last commit, put the committed copy back.
//
//   node scripts/drop-date-only-changes.mjs src/data/cafes.json src/data/basemap.json public/streets.json
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const DATE_KEYS = ['checked', 'generated'];
const withoutDate = (text) => {
  const data = JSON.parse(text);
  for (const k of DATE_KEYS) delete data[k];
  return JSON.stringify(data);
};

for (const file of process.argv.slice(2)) {
  const committed = execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const current = await readFile(file, 'utf8');
  if (current === committed) continue;
  if (withoutDate(current) === withoutDate(committed)) {
    await writeFile(file, committed);
    console.log(`${file}: only the date changed, kept the committed copy`);
  } else {
    console.log(`${file}: changed`);
  }
}
