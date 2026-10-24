-- Move RLS-only SECURITY DEFINER helpers out of the exposed public API schema.
-- The frontend should call only the two intentional RPCs: join_group and record_event_swipe.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

create or replace function private.is_adult_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_adult_verified = true
      and p.is_suspended = false
  );
$$;

create or replace function private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_profile_id = (select auth.uid())
    or (
      private.is_adult_verified()
      and exists (
        select 1
        from public.profiles p
        where p.id = p_profile_id
          and p.is_adult_verified = true
          and p.is_suspended = false
      )
      and not exists (
        select 1
        from public.blocks b
        where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_profile_id)
           or (b.blocker_id = p_profile_id and b.blocked_id = (select auth.uid()))
      )
      and exists (
        select 1
        from public.event_participants mine
        join public.event_participants theirs
          on theirs.event_id = mine.event_id
        join public.events e
          on e.id = mine.event_id
        where mine.user_id = (select auth.uid())
          and theirs.user_id = p_profile_id
          and mine.status <> 'cancelled'
          and theirs.status <> 'cancelled'
          and e.published = true
          and e.starts_at > now()
      )
    );
$$;

create or replace function private.is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    and private.is_adult_verified()
    and exists (
      select 1
      from public.event_participants ep
      join public.events e on e.id = ep.event_id
      where ep.event_id = p_event_id
        and ep.user_id = p_user_id
        and ep.status <> 'cancelled'
        and e.published = true
        and e.starts_at > now()
    );
$$;

create or replace function private.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    and private.is_adult_verified()
    and exists (
      select 1
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      join public.events e on e.id = g.event_id
      where gm.group_id = p_group_id
        and gm.user_id = p_user_id
        and e.published = true
        and e.starts_at > now()
    )
    and not exists (
      select 1
      from public.group_members gm
      left join public.profiles p on p.id = gm.user_id
      where gm.group_id = p_group_id
        and (
          p.id is null
          or p.is_adult_verified = false
          or p.is_suspended = true
        )
    );
$$;

create or replace function private.is_match_participant(p_match_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    and private.is_adult_verified()
    and exists (
      select 1
      from public.matches m
      where m.id = p_match_id
        and p_user_id in (m.user_a, m.user_b)
        and private.can_view_profile(
          case when m.user_a = p_user_id then m.user_b else m.user_a end
        )
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = m.user_a and b.blocked_id = m.user_b)
             or (b.blocker_id = m.user_b and b.blocked_id = m.user_a)
        )
    );
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_adult_verified() to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.is_event_participant(uuid, uuid) to authenticated;
grant execute on function private.is_group_member(uuid, uuid) to authenticated;
grant execute on function private.is_match_participant(uuid, uuid) to authenticated;

-- The old public helpers remain for internal use by owner-privileged RPC implementations only.
revoke execute on function public.can_view_profile(uuid) from public, anon, authenticated;
revoke execute on function public.is_adult_verified() from public, anon, authenticated;
revoke execute on function public.is_event_participant(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_group_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_match_participant(uuid, uuid) from public, anon, authenticated;

drop policy if exists "profiles_select_shared_event_unblocked" on public.profiles;
create policy "profiles_select_shared_event_unblocked" on public.profiles
for select to authenticated
using (
  is_suspended = false
  and private.can_view_profile(id)
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = id)
       or (b.blocker_id = id and b.blocked_id = (select auth.uid()))
  )
);

drop policy if exists "participants_read_same_event" on public.event_participants;
create policy "participants_read_same_event" on public.event_participants
for select to authenticated
using (
  private.is_adult_verified()
  and private.is_event_participant(event_id, (select auth.uid()))
  and private.can_view_profile(user_id)
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = event_participants.user_id)
       or (b.blocker_id = event_participants.user_id and b.blocked_id = (select auth.uid()))
  )
);

drop policy if exists "participants_insert_self_published_event" on public.event_participants;
create policy "participants_insert_self_published_event" on public.event_participants
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_adult_verified()
  and exists (
    select 1 from public.events e
    where e.id = event_participants.event_id
      and e.published = true
      and e.starts_at > now()
  )
);

drop policy if exists "participants_update_self_published_event" on public.event_participants;
create policy "participants_update_self_published_event" on public.event_participants
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and (
    status = 'cancelled'
    or (
      private.is_adult_verified()
      and exists (
        select 1 from public.events e
        where e.id = event_participants.event_id
          and e.published = true
          and e.starts_at > now()
      )
    )
  )
);

drop policy if exists "groups_read_unblocked_event_participants" on public.groups;
create policy "groups_read_unblocked_event_participants" on public.groups
for select to authenticated
using (
  private.is_adult_verified()
  and private.is_event_participant(event_id, (select auth.uid()))
  and not exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id
      and not private.can_view_profile(gm.user_id)
  )
  and not exists (
    select 1 from public.group_members gm
    join public.blocks b on
      (b.blocker_id = (select auth.uid()) and b.blocked_id = gm.user_id)
      or (b.blocker_id = gm.user_id and b.blocked_id = (select auth.uid()))
    where gm.group_id = groups.id
  )
);

drop policy if exists "groups_create_by_event_participant" on public.groups;
create policy "groups_create_by_event_participant" on public.groups
for insert to authenticated
with check (
  creator_id = (select auth.uid())
  and private.is_adult_verified()
  and private.is_event_participant(event_id, (select auth.uid()))
);

drop policy if exists "groups_update_creator" on public.groups;
create policy "groups_update_creator" on public.groups
for update to authenticated
using (
  creator_id = (select auth.uid())
  and private.is_adult_verified()
  and private.is_event_participant(event_id, (select auth.uid()))
)
with check (
  creator_id = (select auth.uid())
  and private.is_adult_verified()
  and private.is_event_participant(event_id, (select auth.uid()))
);

drop policy if exists "group_members_read_peers" on public.group_members;
create policy "group_members_read_peers" on public.group_members
for select to authenticated
using (
  private.is_adult_verified()
  and private.is_group_member(group_id, (select auth.uid()))
  and private.can_view_profile(user_id)
);

drop policy if exists "matches_read_unblocked_participants" on public.matches;
create policy "matches_read_unblocked_participants" on public.matches
for select to authenticated
using (
  private.is_adult_verified()
  and (select auth.uid()) in (user_a, user_b)
  and private.can_view_profile(
    case when user_a = (select auth.uid()) then user_b else user_a end
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = matches.user_a and b.blocked_id = matches.user_b)
       or (b.blocker_id = matches.user_b and b.blocked_id = matches.user_a)
  )
);

drop policy if exists "swipes_read_own" on public.swipes;
create policy "swipes_read_own" on public.swipes
for select to authenticated
using (
  swiper_id = (select auth.uid())
  and private.is_adult_verified()
  and private.can_view_profile(target_user_id)
);

drop policy if exists "messages_read_conversation_members" on public.messages;
create policy "messages_read_conversation_members" on public.messages
for select to authenticated
using (
  private.is_adult_verified()
  and (
    sender_id = (select auth.uid())
    or (
      conversation_kind = 'match'
      and private.is_match_participant(match_id, (select auth.uid()))
    )
    or (
      conversation_kind = 'group'
      and private.is_group_member(group_id, (select auth.uid()))
    )
  )
);

drop policy if exists "messages_send_as_self" on public.messages;
create policy "messages_send_as_self" on public.messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and private.is_adult_verified()
  and (
    (
      conversation_kind = 'match'
      and private.is_match_participant(match_id, (select auth.uid()))
    )
    or (
      conversation_kind = 'group'
      and private.is_group_member(group_id, (select auth.uid()))
      and not exists (
        select 1 from public.group_members gm
        join public.blocks b on
          (b.blocker_id = (select auth.uid()) and b.blocked_id = gm.user_id)
          or (b.blocker_id = gm.user_id and b.blocked_id = (select auth.uid()))
        where gm.group_id = messages.group_id and gm.user_id <> (select auth.uid())
      )
    )
  )
);

commit;
