-- Limit profile discovery to people sharing an active event with the viewer.
begin;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select
    p_profile_id = auth.uid()
    or exists (
      select 1
      from public.event_participants mine
      join public.event_participants theirs
        on theirs.event_id = mine.event_id
      where mine.user_id = auth.uid()
        and theirs.user_id = p_profile_id
        and mine.status <> 'cancelled'
        and theirs.status <> 'cancelled'
    );
$$;

revoke all on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

drop policy if exists "profiles_select_authenticated_unblocked" on public.profiles;
create policy "profiles_select_shared_event_unblocked" on public.profiles
for select to authenticated
using (
  is_suspended = false
  and public.can_view_profile(id)
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = id)
       or (b.blocker_id = id and b.blocked_id = auth.uid())
  )
);

commit;
