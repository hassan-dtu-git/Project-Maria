-- Hide existing matches and groups when a block makes the connection unsafe.
begin;

drop policy if exists "matches_read_participants" on public.matches;
create policy "matches_read_unblocked_participants" on public.matches
for select to authenticated
using (
  auth.uid() in (user_a, user_b)
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = matches.user_a and b.blocked_id = matches.user_b)
       or (b.blocker_id = matches.user_b and b.blocked_id = matches.user_a)
  )
);

drop policy if exists "groups_read_event_participants" on public.groups;
drop policy if exists "groups_read_event_participants" on public.groups;
drop policy if exists "groups_read_unblocked_event_participants" on public.groups;
create policy "groups_read_unblocked_event_participants" on public.groups
for select to authenticated using (
  public.is_event_participant(event_id, auth.uid())
  and not exists (
    select 1 from public.group_members gm
    join public.blocks b on
      (b.blocker_id = auth.uid() and b.blocked_id = gm.user_id)
      or (b.blocker_id = gm.user_id and b.blocked_id = auth.uid())
    where gm.group_id = groups.id
  )
);

commit;
