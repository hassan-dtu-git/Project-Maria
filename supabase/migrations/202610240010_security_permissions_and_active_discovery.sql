-- Revoke default browser privileges, then grant only required Data API operations.
-- Also restrict helper functions and social discovery to verified adults using upcoming published events.

begin;

-- New public objects must remain private unless a future migration explicitly grants access.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- Remove legacy project defaults that may have granted much wider privileges than intended.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Event catalog: public read-only access is constrained by published_events_read RLS.
grant select on public.events to anon, authenticated;

-- Profiles are created only by the Auth trigger; row access remains constrained by RLS.
grant select, update on public.profiles to authenticated;

-- Event participation writes are constrained by RLS; cancellation is allowed for the owner.
grant select, insert, update on public.event_participants to authenticated;

-- Swipe and match writes must use the guarded SECURITY DEFINER RPC.
grant select on public.swipes, public.matches to authenticated;

grant select, insert, update on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert on public.terms_acceptances to authenticated;

-- Rate-limit events remain internal to trusted trigger code.
revoke all privileges on public.rate_limit_events from anon, authenticated;

-- Only functions needed by RLS and the explicit frontend RPC surface are callable by signed-in clients.
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.is_adult_verified() to authenticated;
grant execute on function public.is_event_participant(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;
grant execute on function public.join_group(uuid) to authenticated;
grant execute on function public.record_event_swipe(uuid, uuid, public.swipe_action) to authenticated;

-- A profile is discoverable only with another verified adult through a shared, upcoming,
-- published event with active (non-cancelled) participation. Block relationships override discovery.
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
        select 1
        from public.profiles p
        where p.id = p_profile_id
          and p.is_adult_verified = true
          and p.is_suspended = false
      )
      and not exists (
        select 1
        from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p_profile_id)
           or (b.blocker_id = p_profile_id and b.blocked_id = auth.uid())
      )
      and exists (
        select 1
        from public.event_participants mine
        join public.event_participants theirs
          on theirs.event_id = mine.event_id
        join public.events e
          on e.id = mine.event_id
        where mine.user_id = auth.uid()
          and theirs.user_id = p_profile_id
          and mine.status <> 'cancelled'
          and theirs.status <> 'cancelled'
          and e.published = true
          and e.starts_at > now()
      )
    );
$$;
revoke all on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

-- An event counts as current for attendee access only while it is published and upcoming.
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
revoke all on function public.is_event_participant(uuid, uuid) from public, anon;
grant execute on function public.is_event_participant(uuid, uuid) to authenticated;

-- Group membership visibility and access end when the group's event is no longer upcoming.
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
revoke all on function public.is_group_member(uuid, uuid) from public, anon;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

-- The swipe RPC itself must reject a past/unpublished event, not merely trust the UI picker.
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
    where p.id in (v_user, p_target_user_id)
      and (p.is_suspended or not p.is_adult_verified)
  ) then
    raise exception 'account unavailable';
  end if;
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.published = true
      and e.starts_at > now()
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
    select m.id into v_match_id
    from public.matches m
    where m.event_id = p_event_id and m.user_a = v_a and m.user_b = v_b;
    return query select true, v_match_id;
  else
    return query select false, null::uuid;
  end if;
end;
$$;
revoke all on function public.record_event_swipe(uuid, uuid, public.swipe_action) from public, anon;
grant execute on function public.record_event_swipe(uuid, uuid, public.swipe_action) to authenticated;

-- Keep the public API helpers away from anonymous calls; trigger functions are not client RPCs.
revoke execute on function public.add_group_creator_membership() from public, anon, authenticated;
revoke execute on function public.enforce_swipe_rate_limit() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_privileges() from public, anon, authenticated;
revoke execute on function public.protect_adult_verification() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

commit;
