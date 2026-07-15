const DIFFERENTIATORS = [
  'subspecialty',
  'languages',
  'qualifications',
  'procedures',
  'schedule',
];

export function normalizeDoctorId(value = '') {
  return String(value).trim().toLowerCase();
}

export function assertUniqueDoctorIds(doctors = []) {
  const counts = new Map();
  for (const doctor of doctors) {
    const id = normalizeDoctorId(doctor?.id);
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
  if (duplicates.length) throw new Error(`Duplicate doctor IDs after normalization: ${duplicates.join(', ')}`);
  return true;
}

export function validatedDoctorRecords(doctors = [], requiredFields = ['id', 'name']) {
  if (!Array.isArray(doctors)) throw new Error('Doctor data must be an array');
  assertUniqueDoctorIds(doctors);
  return doctors.filter((doctor) => requiredFields.every(
    (field) => String(doctor?.[field] || '').trim().length > 0,
  ));
}

export function uniqueIndexableDoctorCount(doctors = []) {
  return new Set(doctors
    .filter((doctor) => doctor?.indexable === true)
    .map((doctor) => normalizeDoctorId(doctor.id))
    .filter(Boolean)).size;
}

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
