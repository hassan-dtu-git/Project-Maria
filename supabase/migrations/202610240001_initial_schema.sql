-- Maria initial production-oriented schema for Supabase/Postgres.
-- Apply with Supabase CLI after reviewing against the actual product and legal requirements.
begin;

create extension if not exists pgcrypto;

create type public.event_participation_status as enum ('interested', 'going', 'attended', 'cancelled');
create type public.swipe_action as enum ('like', 'pass');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.conversation_kind as enum ('match', 'group');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_suspended boolean not null default false,
  is_admin boolean not null default false
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  category text not null,
  venue_name text not null,
  city text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  image_url text,
  booking_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (booking_url is null or booking_url like 'https://%')
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.event_participation_status not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_participants_user_idx on public.event_participants(user_id, created_at desc);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  swiper_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  action public.swipe_action not null,
  created_at timestamptz not null default now(),
  unique (event_id, swiper_id, target_user_id),
  check (swiper_id <> target_user_id)
);
create index swipes_target_idx on public.swipes(event_id, target_user_id, swiper_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_a, user_b),
  check (user_a < user_b)
);
create index matches_users_idx on public.matches(user_a, user_b);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  max_members smallint not null default 4 check (max_members between 2 and 8),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_kind public.conversation_kind not null,
  match_id uuid references public.matches(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (
    (conversation_kind = 'match' and match_id is not null and group_id is null)
    or (conversation_kind = 'group' and group_id is not null and match_id is null)
  )
);
create index messages_match_created_idx on public.messages(match_id, created_at);
create index messages_group_created_idx on public.messages(group_id, created_at);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (reason in ('harassment', 'spam', 'fake_profile', 'unsafe_behavior', 'inappropriate_content', 'other')),
  details text not null default '' check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (reported_user_id is not null or event_id is not null or message_id is not null),
  check (reported_user_id is null or reported_user_id <> reporter_id)
);
create index reports_status_created_idx on public.reports(status, created_at);

create table public.terms_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_key text not null check (document_key in ('terms', 'privacy')),
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, document_key, version)
);

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_lookup_idx on public.rate_limit_events(user_id, action, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger event_participants_set_updated_at before update on public.event_participants
for each row execute function public.set_updated_at();

-- A browser client cannot grant itself administrator or suspension state.
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if auth.role() <> 'service_role'
     and (new.is_admin is distinct from old.is_admin
          or new.is_suspended is distinct from old.is_suspended) then
    raise exception 'privileged profile fields cannot be changed by users';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_privileges before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- Keep a profile row in sync with a newly created Auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'New member');
  insert into public.profiles (id, display_name)
  values (new.id, left(candidate_name, 60))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Event-scoped swipe operation. Clients cannot forge a match by inserting directly.
create or replace function public.record_event_swipe(
  p_event_id uuid,
  p_target_user_id uuid,
  p_action public.swipe_action
)
returns table (matched boolean, match_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_match_id uuid;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_target_user_id = v_user then raise exception 'cannot swipe on yourself'; end if;
  if p_action is null then raise exception 'action required'; end if;

  if exists (
    select 1 from public.profiles p
    where p.id in (v_user, p_target_user_id) and p.is_suspended
  ) then raise exception 'account unavailable'; end if;

  if not exists (select 1 from public.events e where e.id = p_event_id and e.published = true) then
    raise exception 'event unavailable';
  end if;
  if not exists (select 1 from public.event_participants ep where ep.event_id = p_event_id and ep.user_id = v_user and ep.status <> 'cancelled') then
    raise exception 'join the event before swiping';
  end if;
  if not exists (select 1 from public.event_participants ep where ep.event_id = p_event_id and ep.user_id = p_target_user_id and ep.status <> 'cancelled') then
    raise exception 'target is not participating in this event';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_user and b.blocked_id = p_target_user_id)
       or (b.blocker_id = p_target_user_id and b.blocked_id = v_user)
  ) then raise exception 'interaction unavailable'; end if;

  insert into public.swipes(event_id, swiper_id, target_user_id, action)
  values (p_event_id, v_user, p_target_user_id, p_action)
  on conflict (event_id, swiper_id, target_user_id)
  do update set action = excluded.action, created_at = now();

  if p_action = 'like' and exists (
    select 1 from public.swipes s
    where s.event_id = p_event_id and s.swiper_id = p_target_user_id
      and s.target_user_id = v_user and s.action = 'like'
  ) then
    v_a := least(v_user, p_target_user_id);
    v_b := greatest(v_user, p_target_user_id);
    insert into public.matches(event_id, user_a, user_b)
    values (p_event_id, v_a, v_b)
    on conflict (event_id, user_a, user_b) do nothing;
    select m.id into v_match_id from public.matches m
    where m.event_id = p_event_id and m.user_a = v_a and m.user_b = v_b;
    return query select true, v_match_id;
  else
    return query select false, null::uuid;
  end if;
end;
$$;

-- Apply a simple database-level rolling-window limit to swipe RPC calls.
-- For high-volume deployments, also add an edge/WAF limit and monitor abuse.
create or replace function public.enforce_swipe_rate_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.rate_limit_events r
  where r.user_id = auth.uid()
    and r.action = 'swipe'
    and r.created_at > now() - interval '1 minute';
  if v_count >= 30 then raise exception 'rate limit exceeded' using errcode = 'P0001'; end if;
  insert into public.rate_limit_events(user_id, action) values (auth.uid(), 'swipe');
  return new;
end;
$$;
create trigger swipe_rate_limit before insert or update on public.swipes
for each row execute function public.enforce_swipe_rate_limit();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.rate_limit_events enable row level security;

create policy "profiles_select_authenticated_unblocked" on public.profiles
for select to authenticated
using (
  is_suspended = false
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = id)
       or (b.blocker_id = id and b.blocked_id = auth.uid())
  )
);
create policy "profiles_insert_self" on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "published_events_read" on public.events
for select to anon, authenticated using (published = true);

create policy "participants_read_same_event" on public.event_participants
for select to authenticated
using (
  exists (
    select 1 from public.event_participants mine
    where mine.event_id = event_participants.event_id
      and mine.user_id = auth.uid()
      and mine.status <> 'cancelled'
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = event_participants.user_id)
       or (b.blocker_id = event_participants.user_id and b.blocked_id = auth.uid())
  )
);
create policy "participants_insert_self" on public.event_participants
for insert to authenticated with check (user_id = auth.uid());
create policy "participants_update_self" on public.event_participants
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "swipes_read_own" on public.swipes
for select to authenticated using (swiper_id = auth.uid());
create policy "matches_read_participants" on public.matches
for select to authenticated using (auth.uid() in (user_a, user_b));

create policy "groups_read_event_participants" on public.groups
for select to authenticated using (
  exists (select 1 from public.event_participants ep where ep.event_id = groups.event_id and ep.user_id = auth.uid() and ep.status <> 'cancelled')
  and not exists (select 1 from public.blocks b where (b.blocker_id = auth.uid() and b.blocked_id = groups.creator_id) or (b.blocker_id = groups.creator_id and b.blocked_id = auth.uid()))
);
create policy "groups_create_by_event_participant" on public.groups
for insert to authenticated with check (
  creator_id = auth.uid()
  and exists (select 1 from public.event_participants ep where ep.event_id = groups.event_id and ep.user_id = auth.uid() and ep.status <> 'cancelled')
);
create policy "groups_update_creator" on public.groups
for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy "group_members_read_peers" on public.group_members
for select to authenticated using (
  exists (select 1 from public.group_members mine where mine.group_id = group_members.group_id and mine.user_id = auth.uid())
);
create policy "group_members_join_self" on public.group_members
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.groups g
    join public.event_participants ep on ep.event_id = g.event_id
    where g.id = group_id and ep.user_id = auth.uid() and ep.status <> 'cancelled'
  )
);
create policy "group_members_leave_self" on public.group_members
for delete to authenticated using (user_id = auth.uid());

create policy "messages_read_conversation_members" on public.messages
for select to authenticated using (
  sender_id = auth.uid()
  or (
    conversation_kind = 'match'
    and exists (select 1 from public.matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b))
  )
  or (
    conversation_kind = 'group'
    and exists (select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid())
  )
);
create policy "messages_send_as_self" on public.messages
for insert to authenticated with check (
  sender_id = auth.uid()
  and not exists (
    select 1 from public.blocks b
    where b.blocker_id = auth.uid()
      and b.blocked_id in (
        select m.user_a from public.matches m where m.id = messages.match_id
        union
        select m.user_b from public.matches m where m.id = messages.match_id
      )
  )
  and (
    (conversation_kind = 'match' and exists (
      select 1 from public.matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)
    ))
    or
    (conversation_kind = 'group' and exists (
      select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    ))
  )
);

create policy "blocks_read_own" on public.blocks
for select to authenticated using (blocker_id = auth.uid());
create policy "blocks_create_own" on public.blocks
for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks_delete_own" on public.blocks
for delete to authenticated using (blocker_id = auth.uid());

create policy "reports_create_own" on public.reports
for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_read_own_or_admin" on public.reports
for select to authenticated using (
  reporter_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);
create policy "reports_update_admin_only" on public.reports
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

create policy "terms_read_own" on public.terms_acceptances
for select to authenticated using (user_id = auth.uid());
create policy "terms_accept_own" on public.terms_acceptances
for insert to authenticated with check (user_id = auth.uid());

-- No direct browser reads/writes: the rate-limit table is managed by trusted functions.
revoke all on public.rate_limit_events from anon, authenticated;
revoke insert, update, delete on public.matches from anon, authenticated;
revoke insert, update, delete on public.swipes from anon, authenticated;
grant execute on function public.record_event_swipe(uuid, uuid, public.swipe_action) to authenticated;

commit;
