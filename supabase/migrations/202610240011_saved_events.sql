-- Persist each signed-in user's saved event list separately from attendance.
begin;

create table public.saved_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index saved_events_event_id_idx on public.saved_events(event_id);

alter table public.saved_events enable row level security;

create policy "saved_events_read_own"
on public.saved_events
for select to authenticated
using (user_id = (select auth.uid()));

create policy "saved_events_create_own"
on public.saved_events
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "saved_events_delete_own"
on public.saved_events
for delete to authenticated
using (user_id = (select auth.uid()));

revoke all privileges on public.saved_events from anon, authenticated;
grant select, insert, delete on public.saved_events to authenticated;

commit;
