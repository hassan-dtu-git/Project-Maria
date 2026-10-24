-- Finalize RPC privileges and serialize group-capacity checks.
begin;
revoke all on function public.is_event_participant(uuid, uuid) from public, anon;
revoke all on function public.is_group_member(uuid, uuid) from public, anon;
revoke all on function public.is_match_participant(uuid, uuid) from public, anon;
grant execute on function public.is_event_participant(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;
revoke all on function public.record_event_swipe(uuid, uuid, public.swipe_action) from public, anon;
grant execute on function public.record_event_swipe(uuid, uuid, public.swipe_action) to authenticated;
revoke all on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;

create or replace function public.join_group(p_group_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event_id uuid;
  v_max_members integer;
  v_member_count integer;
  v_suspended boolean;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select p.is_suspended into v_suspended from public.profiles p where p.id = v_user;
  if coalesce(v_suspended, true) then raise exception 'account unavailable'; end if;
  select g.event_id, g.max_members into v_event_id, v_max_members
  from public.groups g where g.id = p_group_id for update;
  if v_event_id is null then raise exception 'group unavailable'; end if;
  if not public.is_event_participant(v_event_id, v_user) then
    raise exception 'join the event before joining its group';
  end if;
  if exists (
    select 1 from public.group_members gm
    join public.blocks b on
      (b.blocker_id = v_user and b.blocked_id = gm.user_id)
      or (b.blocker_id = gm.user_id and b.blocked_id = v_user)
    where gm.group_id = p_group_id
  ) then raise exception 'group unavailable'; end if;
  if public.is_group_member(p_group_id, v_user) then return true; end if;
  select count(*) into v_member_count from public.group_members gm where gm.group_id = p_group_id;
  if v_member_count >= v_max_members then raise exception 'group is full'; end if;
  insert into public.group_members(group_id, user_id, role)
  values (p_group_id, v_user, 'member')
  on conflict (group_id, user_id) do nothing;
  return true;
end;
$$;
commit;
