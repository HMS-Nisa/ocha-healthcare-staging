// src/components/BookingWidget.jsx
// Tier 1 — calendar + hourly time slots → WhatsApp deep link

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

// ── Consultation hours ────────────────────────────────────────────────────────
// 0 = Sunday … 6 = Saturday. null = closed.
// Jason to confirm exact hours per doctor post-launch.
const DEFAULT_HOURS = {
  0: null,
  1: { start: '09:00', end: '17:00' },
  2: { start: '09:00', end: '17:00' },
  3: { start: '09:00', end: '17:00' },
  4: { start: '09:00', end: '17:00' },
  5: { start: '09:00', end: '17:00' },
  6: { start: '09:00', end: '12:00' },
};

const SLOT_MINUTES        = 60;  // hourly
const BOOKING_WINDOW_DAYS = 30;

// ⚠️ Add Malaysian public holidays — format: 'YYYY-MM-DD'
const MY_HOLIDAYS = [];

// ── Locale ────────────────────────────────────────────────────────────────────
const MONTHS_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const DAYS_ID      = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DAY_HEADS    = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']; // Mon-first

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h > 12 ? h-12 : h === 0 ? 12 : h}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

function generateSlots(date) {
  const h = DEFAULT_HOURS[date.getDay()];
  if (!h) return [];
  const [sh, sm] = h.start.split(':').map(Number);
  const [eh, em] = h.end.split(':').map(Number);
  const endMin = eh * 60 + em;
  let cur = sh * 60 + sm;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMin  = isToday ? now.getHours() * 60 + now.getMinutes() : -1;
  const slots   = [];
  while (cur < endMin) {
    if (cur > nowMin) slots.push(`${pad(Math.floor(cur/60))}:${pad(cur%60)}`);
    cur += SLOT_MINUTES;
  }
  return slots;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BookingWidget({ doctorName = '', hospital = '', waNumber = '60125525544' }) {
  const today   = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + BOOKING_WINDOW_DAYS);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selDate,   setSelDate]   = useState(null);
  const [selTime,   setSelTime]   = useState(null);

  const isAvailable = d =>
    d >= today && d <= maxDate &&
    !!DEFAULT_HOURS[d.getDay()] &&
    !MY_HOLIDAYS.includes(ymd(d));

  const prevDisabled = viewYear === today.getFullYear() && viewMonth <= today.getMonth();
  const nextDisabled = new Date(viewYear, viewMonth + 1, 1) > maxDate;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  }

  // Mon-first grid
  const first = new Date(viewYear, viewMonth, 1);
  let lead = first.getDay() - 1; if (lead < 0) lead = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i+1)),
  ];

  const slots   = selDate ? generateSlots(selDate) : [];
  const dayHours = selDate ? DEFAULT_HOURS[selDate.getDay()] : null;

  const fallbackMsg = `Halo Ocha, saya ingin konsultasi dan minta estimasi biaya dengan ${doctorName} di ${hospital}.`;
  const fallbackUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(fallbackMsg)}`;

  function handleBook() {
    const dayStr = `${DAYS_ID[selDate.getDay()]}, ${selDate.getDate()} ${MONTHS_SHORT[selDate.getMonth()]}`;
    const msg = `Halo Ocha, saya ingin booking konsultasi dengan ${doctorName} pada ${dayStr} pukul ${formatTime(selTime)}.`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div>

      {/* ── Two-column layout on wider screens ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

        {/* LEFT: Calendar */}
        <div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} disabled={prevDisabled} aria-label="Bulan sebelumnya"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-400
                         hover:border-[#276CA1] hover:text-[#276CA1] disabled:opacity-25 disabled:cursor-not-allowed
                         transition-colors text-xl leading-none">
              ‹
            </button>
            <span className="text-sm font-bold text-slate-800">{MONTHS_FULL[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} disabled={nextDisabled} aria-label="Bulan berikutnya"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-400
                         hover:border-[#276CA1] hover:text-[#276CA1] disabled:opacity-25 disabled:cursor-not-allowed
                         transition-colors text-xl leading-none">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADS.map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-bold uppercase tracking-wide py-1.5
                                       ${i === 6 ? 'text-red-300' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`e${i}`} />;
              const available = isAvailable(date);
              const isToday   = ymd(date) === ymd(today);
              const selected  = selDate && ymd(date) === ymd(selDate);
              const isSunday  = date.getDay() === 0;

              return (
                <button key={ymd(date)} disabled={!available}
                  onClick={() => { setSelDate(date); setSelTime(null); }}
                  className={[
                    'mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all',
                    selected
                      ? 'bg-[#276CA1] text-white font-bold shadow-md shadow-blue-900/20'
                      : available
                        ? 'text-slate-700 hover:bg-blue-50 hover:text-[#276CA1] cursor-pointer'
                        : isSunday
                          ? 'text-red-200 cursor-not-allowed'
                          : 'text-slate-300 cursor-not-allowed',
                    isToday && !selected
                      ? 'ring-2 ring-[#276CA1] ring-offset-1 text-[#276CA1] font-bold'
                      : '',
                  ].filter(Boolean).join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed">
            Jadwal dapat berubah sewaktu-waktu.<br />Jason akan konfirmasi ketersediaan slot Anda.
          </p>
        </div>

        {/* RIGHT: Time + CTA */}
        <div className="flex flex-col gap-4">

          {!selDate ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <div className="text-3xl mb-3">📅</div>
              <p className="text-sm font-medium text-slate-500 text-center">Pilih tanggal<br />untuk melihat slot tersedia</p>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-800">
                  {DAYS_ID[selDate.getDay()]}, {selDate.getDate()} {MONTHS_SHORT[selDate.getMonth()]}
                </span>
                {dayHours && (
                  <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    {formatTime(dayHours.start)} – {formatTime(dayHours.end)}
                  </span>
                )}
              </div>

              {slots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slots.map(t => (
                    <button key={t} onClick={() => setSelTime(t)}
                      className={[
                        'py-3 rounded-xl text-sm font-bold border transition-all',
                        selTime === t
                          ? 'bg-[#276CA1] text-white border-[#276CA1] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#276CA1] hover:bg-blue-50 hover:text-[#276CA1]',
                      ].join(' ')}>
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400 text-center">Tidak ada slot tersedia hari ini.</p>
                </div>
              )}
            </div>
          )}

          {/* CTA button */}
          {selDate && selTime ? (
            <div>
              <button onClick={handleBook}
                className="w-full py-4 flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#128C7E]
                           text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl
                           hover:-translate-y-0.5 active:translate-y-0 text-base">
                <MessageCircle className="w-5 h-5 fill-current flex-shrink-0" />
                Booking via WhatsApp
              </button>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                {DAYS_ID[selDate.getDay()]}, {selDate.getDate()} {MONTHS_SHORT[selDate.getMonth()]} · {formatTime(selTime)}
              </p>
            </div>
          ) : (
            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-4 flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#128C7E]
                         text-white font-bold rounded-xl transition-colors shadow-lg text-base">
              <MessageCircle className="w-5 h-5 fill-current flex-shrink-0" />
              Tanya Jadwal & Buat Janji
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
