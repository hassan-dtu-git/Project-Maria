-- Event submissions are private until reviewed and published by an authorized moderator.
begin;
create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 5 and 160),
  description text not null check (char_length(trim(description)) between 10 and 3000),
  category text not null check (category in ('Music','Art','Social','Outdoors','Culture','Food','Comedy','Workshops','Other')),
  venue_name text not null check (char_length(trim(venue_name)) between 2 and 160),
  city text not null check (char_length(trim(city)) between 2 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz,
  booking_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderator_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (booking_url is null or booking_url like 'https://%'),
  check (starts_at > created_at - interval '1 day')
);
create index if not exists event_submissions_status_created_idx on public.event_submissions(status, created_at desc);
create index if not exists event_submissions_submitter_created_idx on public.event_submissions(submitted_by, created_at desc);
alter table public.event_submissions enable row level security;
drop policy if exists "event_submissions_select_self" on public.event_submissions;
create policy "event_submissions_select_self" on public.event_submissions for select to authenticated using ((select auth.uid()) = submitted_by);
drop policy if exists "event_submissions_insert_self" on public.event_submissions;
create policy "event_submissions_insert_self" on public.event_submissions for insert to authenticated with check ((select auth.uid()) = submitted_by and status = 'pending' and reviewed_by is null and reviewed_at is null and moderator_notes is null);
grant select on public.event_submissions to authenticated;
grant insert (submitted_by,title,description,category,venue_name,city,starts_at,ends_at,booking_url) on public.event_submissions to authenticated;
revoke update, delete, truncate, references, trigger on public.event_submissions from anon, authenticated;
revoke all on public.event_submissions from anon;
commit;
