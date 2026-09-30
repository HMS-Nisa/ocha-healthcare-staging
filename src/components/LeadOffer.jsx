// src/components/LeadOffer.jsx
// Lead offer card: optional no-PII intent step, then a pop-up that loads the GHL form on demand.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X, Mail, FileText, ArrowRight, MessageCircle } from 'lucide-react';
import { getOffer } from '../lib/offers.js';
import { buildOfferFormUrl, buildWhatsAppUrl, offerFields, whatsappRef } from '../lib/attribution.js';
import { normalizeDimension, track } from '../lib/analytics.js';

const IS_DEV = import.meta.env.DEV;
const FORM_TIMEOUT_MS = 8000;
// GHL's post-submit redirect and auto-height rely on this script, so it is added lazily with the iframe.
const FORM_EMBED_SRC = 'https://link.healthmetrics.com/js/form_embed.js';

export default function LeadOffer({
  offer: offerKey,
  variant = 'inline',
  specialties = [],
  cities = [],
  defaultSpecialty = '',
  defaultCity = '',
  pageType = '',
  placement = '',
}) {
  const offer = getOffer(offerKey);
  const [specialty, setSpecialty] = useState(defaultSpecialty);
  const [city, setCity] = useState(defaultCity);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(null);

  const analytics = { page_type: pageType, offer: offerKey, cta_placement: placement || variant };

  useEffect(() => {
    track('view_offer', analytics);
  }, []);

  if (!offer) return null;

  function openForm() {
    setFields(offerFields(offerKey, { specialty, city }));
    setOpen(true);
    track('open_offer_form', {
      ...analytics,
      specialty: normalizeDimension(specialty),
      location: normalizeDimension(city),
    });
  }

  const Icon = offer.needsIntent ? Mail : FileText;
  const compact = variant === 'sidebar';
  const banner = variant === 'banner';

  const button = (
    <button type="button" onClick={openForm}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#276CA1] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#1f5682] hover:-translate-y-0.5 active:translate-y-0">
      <Icon className="w-4 h-4" />
      {offer.cta}
      <ArrowRight className="w-4 h-4 opacity-60" />
    </button>
  );

  const modal = open && createPortal(
    <OfferModal offer={offer} fields={fields} onClose={() => setOpen(false)} />,
    document.body,
  );

  if (variant === 'button') return <>{button}{modal}</>;

  const intentStep = offer.needsIntent && (
    <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
      <IntentSelect label="Spesialisasi" value={specialty} onChange={setSpecialty}
        emptyLabel="Belum tahu / bantu pilihkan" options={specialties} />
      <IntentSelect label="Kota di Malaysia" value={city} onChange={setCity}
        emptyLabel="Belum tahu" options={cities} />
    </div>
  );

  return (
    <>
      <div className={[
        'relative overflow-hidden rounded-2xl border p-6 md:p-8',
        banner ? 'border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50' : 'border-slate-100 bg-white shadow-xl shadow-blue-900/5',
      ].join(' ')}>
        <div className={banner || (!compact && offer.needsIntent) ? 'grid gap-6 md:grid-cols-2 md:items-center' : ''}>
          <div className={compact ? 'mb-5' : ''}>
            <span className="inline-block mb-3 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Gratis · {offer.label}
            </span>
            <h3 className={`font-serif font-bold text-slate-900 mb-2 ${compact ? 'text-xl' : 'text-2xl'}`}>{offer.headline}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{offer.pitch}</p>
            {!banner && (
              <ul className="space-y-2">
                {offer.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`space-y-4 ${!offer.needsIntent && !banner && !compact ? 'mt-6' : ''}`}>
            {intentStep}
            {button}
            {offer.note && <p className="text-[11px] leading-relaxed text-slate-400">{offer.note}</p>}
          </div>
        </div>
      </div>
      {modal}
    </>
  );
}

function IntentSelect({ label, value, onChange, emptyLabel, options }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 focus:border-[#276CA1] focus:outline-none focus:ring-2 focus:ring-[#276CA1]/20">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function OfferModal({ offer, fields, onClose }) {
  const [loadRealForm, setLoadRealForm] = useState(!IS_DEV);
  const [status, setStatus] = useState('loading');
  const closeRef = useRef(null);
  const formUrl = buildOfferFormUrl(offer.key, fields);
  const showIframe = Boolean(formUrl) && loadRealForm;
  const fallbackUrl = buildWhatsAppUrl(`Halo Ocha, saya ingin ${offer.label}.`, whatsappRef(window.location.pathname));

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden');
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden');
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (!showIframe) return undefined;
    const timer = setTimeout(() => setStatus((current) => (current === 'ready' ? current : 'slow')), FORM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [showIframe]);

  useEffect(() => {
    if (!showIframe) return;
    const alreadyLoaded = [...document.scripts].some((script) => script.src === FORM_EMBED_SRC);
    if (alreadyLoaded) return;
    const script = document.createElement('script');
    script.src = FORM_EMBED_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, [showIframe]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog" aria-modal="true" aria-label={offer.headline} onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Langkah terakhir</p>
            <p className="font-bold text-slate-900 text-sm">{offer.label}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Tutup"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#276CA1]/30">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {showIframe ? (
            <div className="relative">
              {status === 'slow' && (
                <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
                  className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white hover:bg-[#128C7E]">
                  <MessageCircle className="w-4 h-4" /> Formulir belum termuat — lanjut via WhatsApp
                </a>
              )}
              {status !== 'ready' && (
                <div className="absolute inset-x-0 top-24 flex justify-center" aria-hidden="true">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#276CA1]" />
                </div>
              )}
              <iframe src={formUrl} title={offer.label} onLoad={() => setStatus('ready')}
                id={`inline-${offer.formId}`}
                data-layout="{'id':'INLINE'}"
                data-trigger-type="alwaysShow"
                data-trigger-value=""
                data-activation-type="alwaysActivated"
                data-activation-value=""
                data-deactivation-type="neverDeactivate"
                data-deactivation-value=""
                data-form-name={offer.label}
                data-height="530"
                data-layout-iframe-id={`inline-${offer.formId}`}
                data-form-id={offer.formId}
                className="w-full h-[560px] border-0 rounded-lg" />
            </div>
          ) : (
            <FormPlaceholder offer={offer} hasRealForm={Boolean(formUrl)} onLoadReal={() => setLoadRealForm(true)} />
          )}

          {IS_DEV && <HiddenFieldsPanel fields={fields} formUrl={formUrl} />}
        </div>
      </div>
    </div>
  );
}

// Development stand-in: shows roughly what the GHL form will ask for. Never submits.
function FormPlaceholder({ offer, hasRealForm, onLoadReal }) {
  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        {hasRealForm
          ? <>Pratinjau lokal: formulir GHL asli tidak dimuat otomatis agar tidak membuat kontak sungguhan. <button type="button" onClick={onLoadReal} className="font-bold underline">Muat formulir asli</button></>
          : 'Pratinjau lokal: formulir GHL untuk penawaran ini belum dibuat. Kolom di bawah hanya contoh.'}
      </div>
      <div className="space-y-3 opacity-80" aria-hidden="true">
        {['Nama lengkap', 'Email', 'Nomor WhatsApp'].map((label) => (
          <div key={label}>
            <span className="block text-xs font-bold text-slate-500 mb-1.5">{label}</span>
            <div className="h-11 rounded-xl border border-slate-200 bg-slate-50" />
          </div>
        ))}
        {offer.key === 'estimate' && (
          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1.5">Tindakan / kebutuhan (opsional)</span>
            <div className="h-20 rounded-xl border border-slate-200 bg-slate-50" />
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300" />
          Saya setuju menerima email dari Ocha Healthcare dan dapat berhenti kapan saja.
        </div>
        <div className="rounded-xl bg-[#276CA1] py-3.5 text-center text-sm font-bold text-white">{offer.cta}</div>
      </div>
    </div>
  );
}

function HiddenFieldsPanel({ fields, formUrl }) {
  return (
    <details className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs" open>
      <summary className="cursor-pointer font-bold text-slate-600">Data tersembunyi yang dikirim ke GHL (hanya pratinjau)</summary>
      <table className="mt-3 w-full">
        <tbody>
          {Object.entries(fields || {}).map(([key, value]) => (
            <tr key={key} className="border-t border-slate-200">
              <td className="py-1.5 pr-3 font-mono text-slate-500">{key}</td>
              <td className="py-1.5 font-mono text-slate-800 break-all">{value || <span className="text-slate-300">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {formUrl && <p className="mt-3 break-all font-mono text-[10px] text-slate-400">{formUrl}</p>}
    </details>
  );
}
