import fs from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../dist/', import.meta.url);
const requiredRoutes = ['index.html', 'tentang-ocha/index.html', 'cara-kerja/index.html', 'kebijakan-editorial/index.html', 'disclaimer-medis/index.html'];

for (const route of requiredRoutes) {
  const html = await fs.readFile(new URL(route, root), 'utf8');
  if (!html.includes('<html lang="id"')) throw new Error(`${route}: missing lang=id`);
  if (/AI-Powered|airport transfer|airport pickup|akomodasi|Guarantee Letter/i.test(html)) {
    throw new Error(`${route}: contains out-of-scope positioning`);
  }
  if (!/<link rel="canonical" href="https:\/\/ocha\.health\//.test(html)) {
    throw new Error(`${route}: missing canonical`);
  }
}
