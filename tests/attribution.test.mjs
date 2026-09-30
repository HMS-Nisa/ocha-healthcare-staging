import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureAttribution,
  currentAttribution,
  offerFields,
  buildOfferFormUrl,
  whatsappRef,
  buildWhatsAppUrl,
} from '../src/lib/attribution.js';

function fakeBrowser({ search = '', pathname = '/', referrer = '', storage = new Map(), blocked = false } = {}) {
  const localStorage = blocked
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (key) => (storage.has(key) ? storage.get(key) : null), setItem: (key, value) => storage.set(key, String(value)) };
  globalThis.window = { location: { search, pathname, hostname: 'ocha.health' }, localStorage };
  globalThis.document = { referrer };
  return storage;
}

function resetBrowser() {
  delete globalThis.window;
  delete globalThis.document;
}

test('first touch is kept and last touch updates only on new campaign or external referrer', () => {
  try {
    const storage = fakeBrowser({ search: '?utm_source=instagram&utm_campaign=reel-a', pathname: '/' });
    captureAttribution();

    fakeBrowser({ pathname: '/blog/x/', referrer: 'https://ocha.health/', storage });
    captureAttribution();
    let stored = JSON.parse(storage.get('ocha_attr_v1'));
    assert.equal(stored.first.utm_campaign, 'reel-a');
    assert.equal(stored.last.utm_campaign, 'reel-a');
    assert.equal(stored.last.referrer, '');

    fakeBrowser({ search: '?utm_source=facebook&utm_campaign=post-b', pathname: '/doctors/', storage });
    captureAttribution();
    stored = JSON.parse(storage.get('ocha_attr_v1'));
    assert.equal(stored.first.utm_source, 'instagram');
    assert.equal(stored.last.utm_source, 'facebook');

    fakeBrowser({ pathname: '/dokter/x/', referrer: 'https://www.google.com/search?q=x', storage });
    captureAttribution();
    stored = JSON.parse(storage.get('ocha_attr_v1'));
    assert.equal(stored.last.referrer, 'www.google.com');

    assert.deepEqual(currentAttribution(), {
      landing_page: '/',
      referrer: '',
      utm_source: 'instagram',
      utm_medium: '',
      utm_campaign: 'reel-a',
      utm_content: '',
      utm_term: '',
    });
  } finally {
    resetBrowser();
  }
});

test('blocked storage never throws and falls back to the current page', () => {
  try {
    fakeBrowser({ search: '?utm_source=instagram', pathname: '/', blocked: true });
    assert.doesNotThrow(() => captureAttribution());
    assert.equal(currentAttribution().utm_source, 'instagram');
    assert.equal(currentAttribution().landing_page, '/');
  } finally {
    resetBrowser();
  }
});

test('attribution is empty on the server', () => {
  assert.deepEqual(captureAttribution(), {});
  assert.deepEqual(currentAttribution(), {});
});

test('offer fields include intent, source page and clipped attribution', () => {
  try {
    fakeBrowser({ search: `?utm_campaign=${'x'.repeat(200)}`, pathname: '/blog/biaya-a/' });
    captureAttribution();
    const fields = offerFields('estimate', { specialty: 'Jantung', city: '' });
    assert.deepEqual(Object.keys(fields), [
      'offer', 'specialty', 'city', 'source_page', 'landing_page', 'referrer',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    ]);
    assert.equal(fields.offer, 'estimate');
    assert.equal(fields.specialty, 'Jantung');
    assert.equal(fields.source_page, '/blog/biaya-a/');
    assert.equal(fields.utm_campaign.length, 120);
  } finally {
    resetBrowser();
  }
});

test('form URL carries only non-empty fields and requires a form ID', () => {
  const url = new URL(buildOfferFormUrl('guide-budget', { offer: 'guide-budget', specialty: '', utm_source: 'instagram' }));
  assert.equal(url.origin + url.pathname, 'https://link.healthmetrics.com/widget/form/8mc2c64K6YCTnOH75aTZ');
  assert.equal(url.searchParams.get('offer'), 'guide-budget');
  assert.equal(url.searchParams.get('utm_source'), 'instagram');
  assert.equal(url.searchParams.has('specialty'), false);
  assert.equal(buildOfferFormUrl('shortlist', { offer: 'shortlist' }), '');
  assert.equal(buildOfferFormUrl('missing', {}), '');
});

test('WhatsApp links use one format with a trailing reference line', () => {
  assert.equal(whatsappRef('/blog/biaya-a/'), 'blog/biaya-a');
  assert.equal(whatsappRef('/'), 'beranda');
  assert.equal(whatsappRef(`/${'a'.repeat(100)}/`).length, 60);

  const url = buildWhatsAppUrl("Hi Ocha, I'd like help.", 'mm2h-pvip/general');
  assert.match(url, /^https:\/\/wa\.me\/60125525544\?text=/);
  assert.doesNotMatch(url, /'/);
  const text = decodeURIComponent(url.split('?text=')[1]);
  assert.equal(text, "Hi Ocha, I'd like help.\n\n(ref: mm2h-pvip/general)");
  assert.equal(decodeURIComponent(buildWhatsAppUrl('Halo').split('?text=')[1]), 'Halo');
});
