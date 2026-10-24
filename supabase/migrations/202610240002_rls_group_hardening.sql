-- Harden initial schema: avoid recursive RLS policies, enforce group capacity,
-- and ensure group creators become members. Apply after 202610240001_initial_schema.sql.
begin;

drop policy if exists "profiles_insert_self" on public.profiles;

create or replace function public.is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_event_id and ep.user_id = p_user_id and ep.status <> 'cancelled'
  );
$$;

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
  );
$$;

create or replace function public.is_match_participant(p_match_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id and p_user_id in (m.user_a, m.user_b)
  );
$$;

grant execute on function public.is_event_participant(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;

drop policy if exists "participants_read_same_event" on public.event_participants;
create policy "participants_read_same_event" on public.event_participants
for select to authenticated
using (
  public.is_event_participant(event_id, auth.uid())
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = event_participants.user_id)
       or (b.blocker_id = event_participants.user_id and b.blocked_id = auth.uid())
  )
);

drop policy if exists "groups_read_event_participants" on public.groups;
create policy "groups_read_event_participants" on public.groups
for select to authenticated using (
  public.is_event_participant(event_id, auth.uid())
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = groups.creator_id)
       or (b.blocker_id = groups.creator_id and b.blocked_id = auth.uid())
  )
);

drop policy if exists "groups_create_by_event_participant" on public.groups;
create policy "groups_create_by_event_participant" on public.groups
for insert to authenticated with check (
  creator_id = auth.uid()
  and public.is_event_participant(event_id, auth.uid())
);

drop policy if exists "group_members_read_peers" on public.group_members;
create policy "group_members_read_peers" on public.group_members
for select to authenticated
using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group_members_join_self" on public.group_members;
revoke insert on public.group_members from anon, authenticated;

create or replace function public.add_group_creator_membership()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.group_members(group_id, user_id, role)
  values (new.id, new.creator_id, 'creator')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;
create trigger groups_add_creator after insert on public.groups
for each row execute function public.add_group_creator_membership();

create or replace function public.join_group(p_group_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event_id uuid;
  v_max_members integer;
  v_member_count integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles p where p.id = v_user and (p.is_suspended or p.id is null)) then
    raise exception 'account unavailable';
  end if;

  select g.event_id, g.max_members into v_event_id, v_max_members
  from public.groups g where g.id = p_group_id;
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

  select count(*) into v_member_count
  from public.group_members gm where gm.group_id = p_group_id;
  if v_member_count >= v_max_members then raise exception 'group is full'; end if;

  insert into public.group_members(group_id, user_id, role)
  values (p_group_id, v_user, 'member')
  on conflict (group_id, user_id) do nothing;
  return true;
end;
$$;
grant execute on function public.join_group(uuid) to authenticated;

drop policy if exists "messages_read_conversation_members" on public.messages;
create policy "messages_read_conversation_members" on public.messages
for select to authenticated using (
  sender_id = auth.uid()
  or (conversation_kind = 'match' and public.is_match_participant(match_id, auth.uid()))
  or (conversation_kind = 'group' and public.is_group_member(group_id, auth.uid()))
);

drop policy if exists "messages_send_as_self" on public.messages;
create policy "messages_send_as_self" on public.messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and (
    (
      conversation_kind = 'match'
      and public.is_match_participant(match_id, auth.uid())
      and not exists (
        select 1 from public.matches m
        join public.blocks b on
          (b.blocker_id = m.user_a and b.blocked_id = m.user_b)
          or (b.blocker_id = m.user_b and b.blocked_id = m.user_a)
        where m.id = messages.match_id
      )
    )
    or
    (
      conversation_kind = 'group'
      and public.is_group_member(group_id, auth.uid())
      and not exists (
        select 1 from public.group_members gm
        join public.blocks b on
          (b.blocker_id = auth.uid() and b.blocked_id = gm.user_id)
          or (b.blocker_id = gm.user_id and b.blocked_id = auth.uid())
        where gm.group_id = messages.group_id and gm.user_id <> auth.uid()
      )
    )
  )
);

commit;
