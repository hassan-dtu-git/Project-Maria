-- Fail closed for all real-world social discovery until an adult-verification process
-- operated by a trusted server-side path has marked a profile eligible.
-- This migration intentionally does not implement identity verification itself.

begin;

alter table public.profiles
  add column is_adult_verified boolean not null default false,
  add column adult_verified_at timestamptz,
  add constraint profiles_adult_verification_consistency
    check (
      (is_adult_verified = true and adult_verified_at is not null)
      or (is_adult_verified = false and adult_verified_at is null)
    );

create or replace function public.protect_adult_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Browser-authenticated users cannot set or remove their own verification.
  -- Trusted service-role calls and administrative SQL operations may do so.
  if auth.uid() is not null
     and coalesce(auth.jwt() ->> 'role', 'authenticated') <> 'service_role'
     and (
       new.is_adult_verified is distinct from old.is_adult_verified
       or new.adult_verified_at is distinct from old.adult_verified_at
     ) then
    raise exception 'adult eligibility can only be changed by a trusted verification process';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_adult_verification
before update on public.profiles
for each row execute function public.protect_adult_verification();

revoke all on function public.protect_adult_verification() from public, anon, authenticated;

create or replace function public.is_adult_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_adult_verified = true
      and p.is_suspended = false
  );
$$;

revoke all on function public.is_adult_verified() from public, anon;
grant execute on function public.is_adult_verified() to authenticated;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_profile_id = auth.uid()
    or (
      public.is_adult_verified()
      and exists (
        select 1 from public.profiles p
        where p.id = p_profile_id
          and p.is_adult_verified = true
          and p.is_suspended = false
      )
      and exists (
        select 1
        from public.event_participants mine
        join public.event_participants theirs
          on theirs.event_id = mine.event_id
        where mine.user_id = auth.uid()
          and theirs.user_id = p_profile_id
          and mine.status <> 'cancelled'
          and theirs.status <> 'cancelled'
      )
    );
$$;

revoke all on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

create or replace function public.is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = auth.uid()
    and public.is_adult_verified()
    and exists (
      select 1 from public.event_participants ep
      where ep.event_id = p_event_id
        and ep.user_id = p_user_id
        and ep.status <> 'cancelled'
    );
$$;

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = auth.uid()
    and public.is_adult_verified()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = p_group_id
        and gm.user_id = p_user_id
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

create or replace function public.is_match_participant(p_match_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = auth.uid()
    and public.is_adult_verified()
    and exists (
      select 1 from public.matches m
      where m.id = p_match_id
        and p_user_id in (m.user_a, m.user_b)
        and public.can_view_profile(
          case when m.user_a = p_user_id then m.user_b else m.user_a end
        )
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = m.user_a and b.blocked_id = m.user_b)
             or (b.blocker_id = m.user_b and b.blocked_id = m.user_a)
        )
    );
$$;

revoke all on function public.is_event_participant(uuid, uuid) from public, anon;
revoke all on function public.is_group_member(uuid, uuid) from public, anon;
revoke all on function public.is_match_participant(uuid, uuid) from public, anon;
grant execute on function public.is_event_participant(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;

drop policy if exists "participants_read_same_event" on public.event_participants;
create policy "participants_read_same_event"
on public.event_participants
for select to authenticated
using (
  public.is_adult_verified()
  and public.is_event_participant(event_id, auth.uid())
  and public.can_view_profile(user_id)
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = event_participants.user_id)
       or (b.blocker_id = event_participants.user_id and b.blocked_id = auth.uid())
  )
);

drop policy if exists "participants_insert_self_published_event" on public.event_participants;
create policy "participants_insert_self_published_event"
on public.event_participants
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_adult_verified()
  and exists (
    select 1 from public.events e
    where e.id = event_participants.event_id
      and e.published = true
      and e.starts_at > now()
  )
);

drop policy if exists "participants_update_self_published_event" on public.event_participants;
create policy "participants_update_self_published_event"
on public.event_participants
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    status = 'cancelled'
    or (
      public.is_adult_verified()
      and exists (
        select 1 from public.events e
        where e.id = event_participants.event_id
          and e.published = true
          and e.starts_at > now()
      )
    )
  )
);

drop policy if exists "matches_read_unblocked_participants" on public.matches;
create policy "matches_read_unblocked_participants"
on public.matches
for select to authenticated
using (
  public.is_adult_verified()
  and auth.uid() in (user_a, user_b)
  and public.can_view_profile(
    case when user_a = auth.uid() then user_b else user_a end
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = matches.user_a and b.blocked_id = matches.user_b)
       or (b.blocker_id = matches.user_b and b.blocked_id = matches.user_a)
  )
);

drop policy if exists "groups_read_unblocked_event_participants" on public.groups;
create policy "groups_read_unblocked_event_participants"
on public.groups
for select to authenticated
using (
  public.is_adult_verified()
  and public.is_event_participant(event_id, auth.uid())
  and not exists (
    select 1 from public.group_members gm
    where gm.group_id = groups.id
      and not public.can_view_profile(gm.user_id)
  )
  and not exists (
    select 1 from public.group_members gm
    join public.blocks b on
      (b.blocker_id = auth.uid() and b.blocked_id = gm.user_id)
      or (b.blocker_id = gm.user_id and b.blocked_id = auth.uid())
    where gm.group_id = groups.id
  )
);

drop policy if exists "groups_create_by_event_participant" on public.groups;
create policy "groups_create_by_event_participant"
on public.groups
for insert to authenticated
with check (
  creator_id = auth.uid()
  and public.is_adult_verified()
  and public.is_event_participant(event_id, auth.uid())
);

drop policy if exists "groups_update_creator" on public.groups;
create policy "groups_update_creator"
on public.groups
for update to authenticated
using (
  creator_id = auth.uid()
  and public.is_adult_verified()
  and public.is_event_participant(event_id, auth.uid())
)
with check (
  creator_id = auth.uid()
  and public.is_adult_verified()
  and public.is_event_participant(event_id, auth.uid())
);

drop policy if exists "group_members_read_peers" on public.group_members;
create policy "group_members_read_peers"
on public.group_members
for select to authenticated
using (
  public.is_adult_verified()
  and public.is_group_member(group_id, auth.uid())
  and public.can_view_profile(user_id)
);

drop policy if exists "swipes_read_own" on public.swipes;
create policy "swipes_read_own"
on public.swipes
for select to authenticated
using (
  swiper_id = auth.uid()
  and public.is_adult_verified()
  and public.can_view_profile(target_user_id)
);

drop policy if exists "messages_read_conversation_members" on public.messages;
create policy "messages_read_conversation_members"
on public.messages
for select to authenticated
using (
  public.is_adult_verified()
  and (
    sender_id = auth.uid()
    or (
      conversation_kind = 'match'
      and public.is_match_participant(match_id, auth.uid())
    )
    or (
      conversation_kind = 'group'
      and public.is_group_member(group_id, auth.uid())
    )
  )
);

drop policy if exists "messages_send_as_self" on public.messages;
create policy "messages_send_as_self"
on public.messages
for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_adult_verified()
  and (
    (
      conversation_kind = 'match'
      and public.is_match_participant(match_id, auth.uid())
    )
    or (
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

create or replace function public.join_group(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event_id uuid;
  v_max_members integer;
  v_member_count integer;
  v_suspended boolean;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_adult_verified() then
    raise exception 'adult eligibility verification required';
  end if;

  select p.is_suspended into v_suspended
  from public.profiles p where p.id = v_user;
  if coalesce(v_suspended, true) then
    raise exception 'account unavailable';
  end if;

  select g.event_id, g.max_members into v_event_id, v_max_members
  from public.groups g where g.id = p_group_id for update;
  if v_event_id is null then
    raise exception 'group unavailable';
  end if;
  if not public.is_event_participant(v_event_id, v_user) then
    raise exception 'join the event before joining its group';
  end if;
  if exists (
    select 1 from public.group_members gm
    join public.blocks b on
      (b.blocker_id = v_user and b.blocked_id = gm.user_id)
      or (b.blocker_id = gm.user_id and b.blocked_id = v_user)
    where gm.group_id = p_group_id
  ) then
    raise exception 'group unavailable';
  end if;

  if public.is_group_member(p_group_id, v_user) then
    return true;
  end if;

  select count(*) into v_member_count
  from public.group_members gm where gm.group_id = p_group_id;
  if v_member_count >= v_max_members then
    raise exception 'group is full';
  end if;

  insert into public.group_members(group_id, user_id, role)
  values (p_group_id, v_user, 'member')
  on conflict (group_id, user_id) do nothing;
  return true;
end;
$$;

create or replace function public.record_event_swipe(
  p_event_id uuid,
  p_target_user_id uuid,
  p_action public.swipe_action
)
returns table (matched boolean, match_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_match_id uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_adult_verified() then
    raise exception 'adult eligibility verification required';
  end if;
  if p_target_user_id = v_user then
    raise exception 'cannot swipe on yourself';
  end if;
  if p_action is null then
    raise exception 'action required';
  end if;
  if not public.can_view_profile(p_target_user_id) then
    raise exception 'target is not an eligible visible participant';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.id in (v_user, p_target_user_id) and p.is_suspended
  ) then
    raise exception 'account unavailable';
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.published = true
  ) then
    raise exception 'event unavailable';
  end if;
  if not exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_event_id
      and ep.user_id = v_user
      and ep.status <> 'cancelled'
  ) then
    raise exception 'join the event before swiping';
  end if;
  if not exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_event_id
      and ep.user_id = p_target_user_id
      and ep.status <> 'cancelled'
  ) then
    raise exception 'target is not participating in this event';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_user and b.blocked_id = p_target_user_id)
       or (b.blocker_id = p_target_user_id and b.blocked_id = v_user)
  ) then
    raise exception 'interaction unavailable';
  end if;

  insert into public.swipes(event_id, swiper_id, target_user_id, action)
  values (p_event_id, v_user, p_target_user_id, p_action)
  on conflict (event_id, swiper_id, target_user_id)
  do update set action = excluded.action, created_at = now();

  if p_action = 'like' and exists (
    select 1 from public.swipes s
    where s.event_id = p_event_id
      and s.swiper_id = p_target_user_id
      and s.target_user_id = v_user
      and s.action = 'like'
  ) then
    v_a := least(v_user, p_target_user_id);
    v_b := greatest(v_user, p_target_user_id);
    insert into public.matches(event_id, user_a, user_b)
    values (p_event_id, v_a, v_b)
    on conflict (event_id, user_a, user_b) do nothing;
    select m.id into v_match_id from public.matches m
    where m.event_id = p_event_id
      and m.user_a = v_a
      and m.user_b = v_b;
    return query select true, v_match_id;
  else
    return query select false, null::uuid;
  end if;
end;
$$;

revoke all on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;
revoke all on function public.record_event_swipe(uuid, uuid, public.swipe_action) from public, anon;
grant execute on function public.record_event_swipe(uuid, uuid, public.swipe_action) to authenticated;

commit;
