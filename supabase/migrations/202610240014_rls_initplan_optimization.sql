-- Let PostgreSQL evaluate auth.uid() once per statement rather than per candidate row.
-- These replacements preserve the existing ownership and admin-only rules.

begin;

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "group_members_leave_self" on public.group_members;
create policy "group_members_leave_self" on public.group_members
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "blocks_read_own" on public.blocks;
create policy "blocks_read_own" on public.blocks
for select to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists "blocks_create_own" on public.blocks;
create policy "blocks_create_own" on public.blocks
for insert to authenticated
with check (blocker_id = (select auth.uid()));

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks
for delete to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists "reports_create_own" on public.reports;
create policy "reports_create_own" on public.reports
for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists "reports_read_own_or_admin" on public.reports;
create policy "reports_read_own_or_admin" on public.reports
for select to authenticated
using (
  reporter_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_admin = true
  )
);

drop policy if exists "reports_update_admin_only" on public.reports;
create policy "reports_update_admin_only" on public.reports
for update to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_admin = true
  )
);

drop policy if exists "terms_read_own" on public.terms_acceptances;
create policy "terms_read_own" on public.terms_acceptances
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "terms_accept_own" on public.terms_acceptances;
create policy "terms_accept_own" on public.terms_acceptances
for insert to authenticated
with check (user_id = (select auth.uid()));

commit;
