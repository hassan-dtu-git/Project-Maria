-- Private, self-owned preferences used to personalize event discovery and future compatibility ranking.
begin;

create table if not exists public.user_match_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  interests text[] not null default '{}'::text[],
  social_style text not null default 'small_groups'
    check (social_style in ('one_to_one', 'small_groups', 'large_groups', 'depends')),
  group_size text not null default 'small'
    check (group_size in ('one_to_one', 'small', 'medium', 'large', 'depends')),
  preferred_times text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  check (cardinality(interests) <= 10),
  check (cardinality(preferred_times) <= 4)
);

alter table public.user_match_preferences enable row level security;

drop policy if exists "match_preferences_select_self" on public.user_match_preferences;
create policy "match_preferences_select_self"
  on public.user_match_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "match_preferences_insert_self" on public.user_match_preferences;
create policy "match_preferences_insert_self"
  on public.user_match_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "match_preferences_update_self" on public.user_match_preferences;
create policy "match_preferences_update_self"
  on public.user_match_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_match_preferences to authenticated;
revoke all on public.user_match_preferences from anon;

commit;
