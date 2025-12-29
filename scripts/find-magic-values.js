import fs from 'fs/promises';
import path from 'path';

const NUMBER_REGEX = /(^|[^A-Za-z0-9_\.])(-?\d+(?:\.\d+)?)/g;

async function collectFiles(dir, exts = ['.ts', '.tsx']) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const res = path.join(dir, e.name);
    if (e.isDirectory()) {
      const nested = await collectFiles(res, exts);
      files.push(...nested);
    } else if (exts.includes(path.extname(e.name))) {
      files.push(res);
    }
  }
  return files;
}

export async function findMagicValues({ root = 'src' } = {}) {
  const files = await collectFiles(root);
  const results = [];
  await Promise.all(
    files.map(async (file) => {
      const txt = await fs.readFile(file, 'utf8');
      const lines = txt.split(/\r?\n/);
      lines.forEach((line, idx) => {
        let m;
        while ((m = NUMBER_REGEX.exec(line)) !== null) {
          const raw = m[2];
          const value = Number(raw);
          // Filter out obvious allowed numbers (0, 1, -1) to reduce noise — this is configurable later
          if (value === 0 || value === 1 || value === -1) continue;
          results.push({ file, line: idx + 1, value, context: line.trim() });
        }
      });
    }),
  );
  return results;
}

export async function runCli() {
  const results = await findMagicValues({ root: 'src' });
  if (results.length === 0) {
    console.log('No magic values found');
    return 0;
  }
  console.log(`Found ${results.length} possible magic values:`);
  results.slice(0, 200).forEach((r) => {
    console.log(`${r.file}:${r.line} -> ${r.value} — ${r.context}`);
  });
  return results.length;
}

if (process.argv[1] && process.argv[1].endsWith('find-magic-values.js')) {
  runCli()
    .then((count) => process.exit(count > 0 ? 1 : 0))
    .catch((err) => {
      console.error(err);
      process.exit(2);
    });
}
