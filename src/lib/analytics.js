export const EVENTS = new Set([
  'view_doctor_directory',
  'view_doctor_profile',
  'select_booking_date',
  'select_booking_time',
  'click_whatsapp_booking',
  'click_whatsapp_concierge',
  'view_lead_guide',
]);

export const PARAMETERS = new Set([
  'page_type',
  'specialty',
  'location',
  'cta_placement',
]);

export function normalizeDimension(value) {
  if (typeof value !== 'string') return '';

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function sanitizeEvent(eventName, parameters = {}) {
  if (!EVENTS.has(eventName)) return null;

  return Object.fromEntries([
    ['event', eventName],
    ...Object.entries(parameters).filter(([key, value]) => (
      PARAMETERS.has(key)
      && typeof value === 'string'
      && value.length > 0
      && value.length <= 80
    )),
  ]);
}

export function track(eventName, parameters = {}) {
  const payload = sanitizeEvent(eventName, parameters);
  if (!payload || typeof window === 'undefined') return false;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  return true;
}
