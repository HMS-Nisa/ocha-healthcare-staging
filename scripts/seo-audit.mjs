import fs from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../dist/', import.meta.url);
const requiredRoutes = ['index.html', 'tentang-ocha/index.html', 'cara-kerja/index.html', 'kebijakan-editorial/index.html', 'disclaimer-medis/index.html'];
const trustPages = {
  'tentang-ocha/index.html': {
    id: 'https://ocha.health/tentang-ocha/#webpage',
    statement: 'Ocha Healthcare Sdn Bhd membantu pasien Indonesia terhubung dengan dokter spesialis dan rumah sakit mitra di Malaysia. Layanan Ocha gratis bagi pasien; Ocha didukung melalui kemitraan yang diungkapkan dengan rumah sakit.',
  },
  'cara-kerja/index.html': {
    id: 'https://ocha.health/cara-kerja/#webpage',
    statement: 'Ocha mengumpulkan kebutuhan awal, meninjau pilihan dalam jaringan mitra, menghubungi pasien melalui WhatsApp, dan membantu mengatur janji. Pilihan jadwal adalah permintaan dan baru dikonfirmasi setelah tim Ocha memeriksa ketersediaan.',
  },
  'kebijakan-editorial/index.html': {
    id: 'https://ocha.health/kebijakan-editorial/#webpage',
    statement: 'Konten kesehatan Ocha bersifat informasional, menggunakan sumber yang dicantumkan, menampilkan tanggal pembaruan, dan tidak menggantikan konsultasi dokter. Nama peninjau medis hanya ditampilkan setelah peninjau menyetujui versi yang diterbitkan.',
  },
  'disclaimer-medis/index.html': {
    id: 'https://ocha.health/disclaimer-medis/#webpage',
    statement: 'Ocha bukan rumah sakit dan tidak memberikan diagnosis, rekomendasi pengobatan, atau layanan darurat. Dalam keadaan darurat, hubungi layanan darurat setempat.',
  },
};

function schemasFrom(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
}

for (const route of requiredRoutes) {
  const html = await fs.readFile(new URL(route, root), 'utf8');
  if (!html.includes('<html lang="id"')) throw new Error(`${route}: missing lang=id`);
  if (/AI-Powered|airport transfer|airport pickup|akomodasi|Guarantee Letter/i.test(html)) {
    throw new Error(`${route}: contains out-of-scope positioning`);
  }
  if (!/<link rel="canonical" href="https:\/\/ocha\.health\//.test(html)) {
    throw new Error(`${route}: missing canonical`);
  }

  if (route !== 'index.html') {
    const expected = trustPages[route];
    if (!html.includes(expected.statement)) throw new Error(`${route}: missing required trust statement`);
    if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) throw new Error(`${route}: expected exactly one H1`);
    const webPage = schemasFrom(html).find((schema) => schema['@type'] === 'WebPage');
    if (!webPage || webPage['@id'] !== expected.id) throw new Error(`${route}: missing WebPage schema ID`);
    const visibleHtml = html.slice(html.indexOf('<body'));
    if (!webPage.description || !visibleHtml.includes(webPage.description)) throw new Error(`${route}: schema description is not visible`);
  }
}

const homepage = await fs.readFile(new URL('index.html', root), 'utf8');
for (const label of ['Beranda', 'Cari Dokter', 'Panduan', 'Buat Janji']) {
  if (!homepage.includes(label)) throw new Error(`index.html: missing navigation label ${label}`);
}
const standardLayoutPage = await fs.readFile(new URL('blog/index.html', root), 'utf8');
for (const label of ['Beranda', 'Cari Dokter', 'Panduan', 'Buat Janji']) {
  if (!standardLayoutPage.includes(label)) throw new Error(`blog/index.html: missing navigation label ${label}`);
}
for (const href of ['/tentang-ocha', '/cara-kerja', '/kebijakan-editorial', '/disclaimer-medis']) {
  if (!homepage.includes(`href="${href}"`)) throw new Error(`index.html: missing footer link ${href}`);
}
const homepageSchemas = schemasFrom(homepage);
if (!homepageSchemas.some((schema) => schema['@type'] === 'Organization' && schema['@id'] === 'https://ocha.health/#organization')) {
  throw new Error('index.html: missing Organization schema');
}
if (!homepageSchemas.some((schema) => schema['@type'] === 'WebSite' && schema['@id'] === 'https://ocha.health/#website')) {
  throw new Error('index.html: missing WebSite schema');
}
for (const claim of ['rumah sakit terakreditasi JCI', 'dokter spesialis terverifikasi dengan pengalaman lebih dari 10 tahun', 'Dipercaya oleh pasien di Asia Tenggara']) {
  if (!homepage.includes(claim)) throw new Error(`index.html: missing approved trust claim: ${claim}`);
}
