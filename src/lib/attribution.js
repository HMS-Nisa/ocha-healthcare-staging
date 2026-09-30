// First-party attribution: where a visitor came from, passed into GHL forms and
// WhatsApp messages. Stores no personal or medical data.

import { GHL_FORM_BASE, getOffer } from './offers.js';
import { WA_NUMBER } from '../config.js';

const STORAGE_KEY = 'ocha_attr_v1';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const MAX_FIELD_LENGTH = 120;

function readStore() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeStore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: attribution degrades to nothing stored.
  }
}

function referrerDomain() {
  try {
    const host = new URL(document.referrer).hostname;
    return host && host !== window.location.hostname ? host : '';
  } catch {
    return '';
  }
}

export function captureAttribution() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utms = Object.fromEntries(UTM_KEYS.map((key) => [key, params.get(key) || '']).filter(([, value]) => value));
  const store = readStore();
  const touch = { landing_page: window.location.pathname, referrer: referrerDomain(), ...utms };
  const isNewSource = Object.keys(utms).length > 0 || Boolean(touch.referrer);
  const next = {
    first: store.first || touch,
    last: isNewSource ? touch : store.last || touch,
  };
  writeStore(next);
  return next;
}

export function currentAttribution() {
  if (typeof window === 'undefined') return {};
  const store = readStore();
  const first = store.first || {};
  const last = store.last || {};
  return {
    landing_page: first.landing_page || '',
    referrer: first.referrer || '',
    ...Object.fromEntries(UTM_KEYS.map((key) => [key, last[key] || first[key] || ''])),
  };
}

const clip = (value) => String(value || '').slice(0, MAX_FIELD_LENGTH);

// Hidden-field values for a GHL form. Keys must match the GHL form query keys.
export function offerFields(offerKey, { specialty = '', city = '', sourcePage = '' } = {}) {
  const attribution = currentAttribution();
  return {
    offer: offerKey,
    specialty: clip(specialty),
    city: clip(city),
    source_page: clip(sourcePage || (typeof window !== 'undefined' ? window.location.pathname : '')),
    landing_page: clip(attribution.landing_page),
    referrer: clip(attribution.referrer),
    ...Object.fromEntries(UTM_KEYS.map((key) => [key, clip(attribution[key])])),
  };
}

export function buildOfferFormUrl(offerKey, fields = {}) {
  const offer = getOffer(offerKey);
  if (!offer?.formId) return '';
  const url = new URL(`${GHL_FORM_BASE}${offer.formId}`);
  for (const [key, value] of Object.entries(fields)) if (value) url.searchParams.set(key, value);
  return url.href;
}

// Short source tag the agent sees at the end of a WhatsApp message.
export function whatsappRef(path = '') {
  const clean = String(path).replace(/^\/+|\/+$/g, '');
  return clean ? clean.slice(0, 60) : 'beranda';
}

export function buildWhatsAppUrl(message, ref = '') {
  const text = ref ? `${message}\n\n(ref: ${ref})` : message;
  // encodeURIComponent leaves apostrophes alone; escape them so HTML attribute parsing stays safe.
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text).replace(/'/g, '%27')}`;
}
