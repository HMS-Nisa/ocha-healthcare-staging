-- Alhaya Fertility Centre (Alpha IVF Group), KPJ Damansara Specialist Hospital 2.
-- Source: clinic-supplied doctor profiles, operating hours and consultation schedule.
-- Photos ship with the site under /assets/doctors/, so image_url points at ocha.health.

insert into public.doctors (
  id, name, specialty, subspecialty, hospital, location, languages,
  image_url, bio, schedule, source_url, published
) values
(
  'haris-hamzah',
  'Dr. Haris Hamzah',
  'Dokter Spesialis Fertility',
  'Fertilitas & Bayi Tabung (IVF)',
  'Alhaya Fertility Centre, KPJ Damansara Specialist Hospital 2',
  'No. 3.01, Left Wing, Level 3, KPJ Damansara Specialist Hospital 2, Jalan Bukit Lanjan, 60000 Kuala Lumpur, Malaysia',
  'Melayu dan Inggris',
  'https://ocha.health/assets/doctors/dr-haris-hamzah.jpg',
  'Dr. Haris Hamzah adalah pelopor program bayi tabung (IVF) di Malaysia. Pada 1986 beliau mendirikan pusat IVF pertama di Malaysia bersama Prof. J.L. Yovich dari PIVET Laboratories, Australia Barat, yang menghasilkan kehamilan IVF pertama dan kelahiran sehat pertama di Malaysia pada Maret 1987. Beliau lulus dari Fakultas Kedokteran Universiti Malaya pada 1977, termasuk angkatan pertama lulusan Malaysia yang meraih MRCOG di London pada 1982, dan diangkat sebagai FRCOG pada 1994. Dr. Haris pernah menjabat Presiden MSART dan menjadi anggota komite Kementerian Malaysia yang menyusun regulasi praktik teknologi reproduksi berbantu (ART). Beliau membangun program ICSI pertama di Malaysia pada 2004, termasuk kehamilan pertama Malaysia dari ICSI dengan biopsi testis (TESA) yang berujung kelahiran sehat pada 2005. Saat ini beliau berpraktik di Alhaya Fertility Centre, klinik fertilitas ramah Muslim di Kuala Lumpur yang merupakan bagian dari Alpha IVF Group.',
  '[{"day": "Senin-Jumat", "time": "08:00-17:00 (dengan janji temu)"}, {"day": "Sabtu", "time": "08:00-13:00 (dengan janji temu)"}]'::jsonb,
  null,
  true
),
(
  'wan-syahirah-yang-mohsin',
  'Dr. Wan Syahirah binti Yang Mohsin',
  'Dokter Spesialis Fertility',
  'Fertilitas & Bayi Tabung (IVF)',
  'Alhaya Fertility Centre, KPJ Damansara Specialist Hospital 2',
  'No. 3.01, Left Wing, Level 3, KPJ Damansara Specialist Hospital 2, Jalan Bukit Lanjan, 60000 Kuala Lumpur, Malaysia',
  'Melayu dan Inggris',
  'https://ocha.health/assets/doctors/dr-wan-syahirah.jpg',
  'Dr. Wan Syahirah binti Yang Mohsin adalah dokter spesialis kebidanan dan kandungan sekaligus spesialis fertilitas. Beliau meraih gelar dokter dan magister Obstetri & Ginekologi dari Universiti Kebangsaan Malaysia (UKM), lalu menempuh tiga tahun pendidikan kedokteran reproduksi di Hospital Raja Permaisuri Bainun Perak, Hospital Tunku Azizah Kuala Lumpur, serta Advanced Reproductive Centre, Hospital Canselor Tuanku Muhriz UKM. Pada 2017 beliau mengikuti observership di klinik Endokrinologi Ginekologi dan Kedokteran Reproduksi, Medical University of Innsbruck, Austria, dengan fokus penelitian pada kegagalan implantasi berulang, keguguran berulang, endometriosis, dan adenomiosis. Beliau meraih Fellowship in Reproductive Medicine pada 2021 dan Fellowship in Minimally Access Surgery (F.MAS) di Dubai, serta pengakuan Malaysia Book of Records pada 2022 untuk studi INVOcell pertama yang berhasil dilakukan dan dipublikasikan di Malaysia. Beliau berpraktik di Alhaya Fertility Centre, Kuala Lumpur.',
  '[{"day": "Senin-Jumat", "time": "08:00-17:00 (dengan janji temu)"}, {"day": "Sabtu", "time": "08:00-13:00 (dengan janji temu)"}]'::jsonb,
  null,
  true
)
on conflict (id) do update set
  name = excluded.name,
  specialty = excluded.specialty,
  subspecialty = excluded.subspecialty,
  hospital = excluded.hospital,
  location = excluded.location,
  languages = excluded.languages,
  image_url = excluded.image_url,
  bio = excluded.bio,
  schedule = excluded.schedule,
  source_url = excluded.source_url,
  published = excluded.published;
