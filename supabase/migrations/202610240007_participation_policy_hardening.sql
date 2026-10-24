-- Harden event participation writes so users can only join published upcoming events.
begin;

drop policy if exists "participants_insert_self" on public.event_participants;
create policy "participants_insert_self_published_event" on public.event_participants
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_participants.event_id
      and e.published = true
      and e.starts_at > now()
  )
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
  )
);

drop policy if exists "participants_update_self" on public.event_participants;
create policy "participants_update_self_published_event" on public.event_participants
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    status = 'cancelled'
    or exists (
      select 1 from public.events e
      where e.id = event_participants.event_id
        and e.published = true
        and e.starts_at > now()
    )
  )
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
  )
);

commit;
