import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : [full];
  }).filter((file) => /\.(astro|jsx?|mjs|md)$/.test(file));
}

test('only the attribution library builds WhatsApp URLs', () => {
  const allowed = new Set([path.join(root, 'src/lib/attribution.js')]);
  const offenders = sourceFiles(path.join(root, 'src'))
    .filter((file) => !allowed.has(file))
    .filter((file) => /wa\.me\/|api\.whatsapp\.com/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file));
  assert.deepEqual(offenders, []);
});

test('layouts load site scripts and tag their WhatsApp buttons', () => {
  for (const file of ['src/layouts/Layout.astro', 'src/layouts/LandingLayout.astro']) {
    const source = read(file);
    assert.match(source, /<SiteScripts \/>/, file);
    assert.match(source, /data-wa-placement="navbar"/, file);
    assert.match(source, /data-wa-placement="mobile_menu"/, file);
    assert.match(source, /buildWhatsAppUrl\(/, file);
  }
  assert.match(read('src/components/Hero.astro'), /data-wa-placement="hero"/);
  assert.match(read('src/components/CTA.astro'), /data-wa-placement="home_bottom_cta"/);
  assert.equal((read('src/pages/mm2h-pvip.astro').match(/data-wa-placement="mm2h_/g) || []).length, 5);
});

test('site script captures attribution and tracks tagged links', () => {
  const source = read('src/components/SiteScripts.astro');
  assert.match(source, /captureAttribution\(\)/);
  assert.match(source, /track\('click_whatsapp_concierge'/);
  assert.match(source, /data-wa-placement/);
});

test('doctor booking references the doctor id instead of a phone prop', () => {
  const booking = read('src/components/BookingWidget.jsx');
  assert.doesNotMatch(booking, /waNumber/);
  assert.match(booking, /doctor\/\$\{doctorId\}/);
  const page = read('src/pages/doctor/[id].astro');
  assert.match(page, /doctorId=\{doctor\.id\}/);
  assert.doesNotMatch(page, /waNumber=/);
  assert.match(read('src/components/Directory.jsx'), /doctors\/\$\{doctor\.docId\}/);
});
