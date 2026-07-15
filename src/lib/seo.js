import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, DEFAULT_SOCIAL_IMAGE } from '../config.js';

export function normalizePath(value = '/') {
  const raw = `/${String(value).split('?')[0].split('#')[0]}`
    .replace(/\/{2,}/g, '/')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
  if (raw === '/') return '/';
  return `${raw.replace(/^\/+|\/+$/g, '')}/`.replace(/^/, '/');
}

export function absoluteUrl(path = '/') {
  return new URL(normalizePath(path), SITE_URL).href;
}

export function normalizeDoctorSpecialtyLabel(specialty = '') {
  return String(specialty)
    .trim()
    .replace(/^dokter(?:\s+spesialis)?\s+/i, '')
    .trim();
}

export function buildDoctorPageTitle({ name, specialty, hospital }) {
  const specialtyLabel = normalizeDoctorSpecialtyLabel(specialty);
  return `${name} - Dokter Spesialis ${specialtyLabel} di ${hospital}`;
}

export function buildSeoTitle(title = '') {
  const normalizedTitle = String(title).trim();
  return normalizedTitle.endsWith(SITE_TITLE)
    ? normalizedTitle
    : `${normalizedTitle} | ${SITE_TITLE}`;
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_TITLE,
    url: SITE_URL,
    logo: absoluteUrl('/assets/logo.png'),
    description: SITE_DESCRIPTION,
    areaServed: [
      { '@type': 'Country', name: 'Indonesia' },
      { '@type': 'Country', name: 'Malaysia' },
    ],
  };
}

export function seoDefaults() {
  return { image: absoluteUrl(DEFAULT_SOCIAL_IMAGE), robots: 'index,follow' };
}
