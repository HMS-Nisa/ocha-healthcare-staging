const DIFFERENTIATORS = [
  'subspecialty',
  'languages',
  'qualifications',
  'procedures',
  'schedule',
];

export function countWords(value = '') {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

export function hasRequiredDoctorFields(doctor = {}) {
  return ['id', 'name', 'specialty', 'hospital', 'location']
    .every((key) => String(doctor[key] || '').trim().length > 0)
    && /malaysia|penang|kuala lumpur|selangor|melaka|johor|sarawak|sabah|kuantan|ipoh/i.test(doctor.location);
}

export function isDoctorIndexable(doctor = {}) {
  if (!hasRequiredDoctorFields(doctor)) return false;

  const bio = doctor.bio || doctor.biography || doctor.profile || doctor.profil || '';
  const differentiatorCount = DIFFERENTIATORS.filter((key) => {
    const value = doctor[key];
    return Array.isArray(value)
      ? value.length > 0
      : String(value || '').trim().length > 0;
  }).length;

  return countWords(bio) >= 80 || differentiatorCount >= 3;
}
