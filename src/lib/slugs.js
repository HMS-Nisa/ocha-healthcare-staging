import { uniqueIndexableDoctorCount } from './indexability.js';

export function slugifySegment(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function specialtyLocationSlug(specialty, city) {
  return slugifySegment(`${specialty}-${city}`);
}

export function isSpecialtyLocationIndexable(doctors = []) {
  return uniqueIndexableDoctorCount(doctors) >= 2;
}
