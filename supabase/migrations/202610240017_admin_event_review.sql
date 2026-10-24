-- Only trusted profile admins may inspect and moderate community event submissions.
begin;
drop policy if exists "event_submissions_select_admin" on public.event_submissions;
create policy "event_submissions_select_admin"
on public.event_submissions for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true));

drop policy if exists "event_submissions_update_admin" on public.event_submissions;
create policy "event_submissions_update_admin"
on public.event_submissions for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true))
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true)
  and status in ('approved','rejected','pending')
  and reviewed_by = (select auth.uid())
  and reviewed_at is not null
);

grant select on public.event_submissions to authenticated;
grant update (status, moderator_notes, reviewed_by, reviewed_at) on public.event_submissions to authenticated;
commit;