// Offer registry: one place for every lead offer shown on the site.
// formId is the GHL form ID. null means the GHL form has not been built yet.

export const GHL_FORM_BASE = 'https://link.healthmetrics.com/widget/form/';

export const OFFERS = {
  shortlist: {
    key: 'shortlist',
    label: 'Daftar Dokter Pilihan',
    headline: 'Dapatkan daftar 2–3 dokter spesialis yang sesuai',
    pitch: 'Pilih spesialisasi dan kota. Tim Ocha mengirim daftar dokter mitra beserta langkah selanjutnya ke email Anda.',
    bullets: [
      'Dipilih dari jaringan rumah sakit mitra terverifikasi',
      'Termasuk rumah sakit, bahasa, dan cara membuat janji',
      'Gratis dan tanpa kewajiban',
    ],
    cta: 'Kirim Daftar ke Email Saya',
    needsIntent: true,
    formId: null,
  },
  estimate: {
    key: 'estimate',
    label: 'Estimasi Biaya Resmi',
    headline: 'Minta estimasi biaya langsung dari rumah sakit mitra',
    pitch: 'Sampaikan kebutuhan Anda. Tim Ocha meminta estimasi tertulis dari rumah sakit mitra dan mengirimkannya melalui email.',
    bullets: [
      'Estimasi dari rumah sakit, bukan angka perkiraan umum',
      'Bantu Anda merencanakan anggaran sebelum berangkat',
      'Gratis untuk pasien',
    ],
    note: 'Estimasi tidak mengikat. Biaya akhir ditentukan rumah sakit setelah pemeriksaan dokter.',
    cta: 'Minta Estimasi Gratis',
    needsIntent: true,
    formId: null,
  },
  'guide-budget': {
    key: 'guide-budget',
    label: 'Checklist Anggaran Berobat',
    headline: 'Checklist perencanaan anggaran berobat ke Malaysia',
    pitch: 'Catat komponen biaya medis dan perjalanan sebelum meminta estimasi dari rumah sakit.',
    bullets: [
      'Pisahkan biaya medis dari kebutuhan perjalanan',
      'Daftar pertanyaan biaya untuk rumah sakit',
      'PDF dan template Excel kosong',
    ],
    cta: 'Unduh Checklist Gratis',
    needsIntent: false,
    formId: '8mc2c64K6YCTnOH75aTZ',
    guideSlug: 'checklist-perencanaan-anggaran-berobat-ke-malaysia',
  },
  'guide-second-opinion': {
    key: 'guide-second-opinion',
    label: 'Panduan Second Opinion',
    headline: 'Panduan dan checklist second opinion',
    pitch: 'Siapkan dokumen dan pertanyaan yang tepat sebelum meminta opini kedua dari dokter di Malaysia.',
    bullets: [
      'Daftar dokumen medis yang perlu dibawa',
      'Pertanyaan kunci untuk dokter baru',
      'Template kronologis medis',
    ],
    cta: 'Unduh Panduan Gratis',
    needsIntent: false,
    formId: 'ExtHZ1c0bo6WxhQmBrSS',
    guideSlug: 'panduan-second-opinion',
  },
};

export const OFFER_KEYS = Object.keys(OFFERS);

export function getOffer(key) {
  return OFFERS[key] || null;
}

// Blog articles pick an offer via frontmatter `offer`; otherwise fall back by topic.
export function offerForArticle({ offer, slug = '', category = '' } = {}) {
  if (offer && OFFERS[offer]) return offer;
  if (/second-opinion/i.test(slug)) return 'guide-second-opinion';
  if (/^biaya-/i.test(slug)) return 'estimate';
  if (/biaya|anggaran/i.test(category)) return 'guide-budget';
  return 'shortlist';
}

export function offerKeyForGuide(slug = '') {
  return Object.values(OFFERS).find((offer) => offer.guideSlug === slug)?.key || '';
}

// Production hides offers whose GHL form does not exist yet.
export function isOfferAvailable(offer, { dev = false } = {}) {
  return Boolean(offer) && (dev || Boolean(offer.formId));
}

const CITY_PATTERNS = [
  ['Kuala Lumpur', /kuala lumpur|\bkl\b|selangor|petaling jaya/i],
  ['Penang', /penang|pulau pinang|george town|perai/i],
  ['Kuching', /kuching|sarawak/i],
  ['Johor', /johor/i],
  ['Melaka', /melaka|malacca/i],
];

export function cityFromLocation(location = '') {
  return CITY_PATTERNS.find(([, pattern]) => pattern.test(location))?.[0] || '';
}

// Specialty and city options for the intent step, built from published doctors.
export function intentOptions(doctors = []) {
  const specialties = new Map();
  const cities = new Set();
  for (const doctor of doctors) {
    const label = String(doctor.specialty || '').replace(/^dokter(?:\s+spesialis)?\s+/i, '').trim();
    if (label) specialties.set(label, (specialties.get(label) || 0) + 1);
    const city = cityFromLocation(doctor.location);
    if (city) cities.add(city);
  }
  return {
    specialties: [...specialties.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label),
    cities: CITY_PATTERNS.map(([city]) => city).filter((city) => cities.has(city)),
  };
}
