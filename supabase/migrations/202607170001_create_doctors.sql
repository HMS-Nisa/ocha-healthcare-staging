create table public.doctors (
  id text primary key check (btrim(id) <> ''),
  name text not null check (btrim(name) <> ''),
  specialty text not null check (btrim(specialty) <> ''),
  subspecialty text,
  hospital text not null check (btrim(hospital) <> ''),
  location text not null check (btrim(location) <> ''),
  languages text,
  image_url text,
  bio text,
  schedule jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  source_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index doctors_published_specialty_location_idx
  on public.doctors (specialty, location)
  where published = true;

create or replace function public.set_doctors_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger doctors_set_updated_at
before update on public.doctors
for each row execute function public.set_doctors_updated_at();

alter table public.doctors enable row level security;
grant select on public.doctors to anon, authenticated;

create policy "Published doctors are publicly readable"
on public.doctors
for select
to anon, authenticated
using (published = true);
