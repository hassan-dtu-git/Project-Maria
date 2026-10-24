-- Explicitly grant only the table operations covered by the existing RLS policies.
-- New Supabase projects no longer automatically expose public tables through the Data API.
-- RLS remains the row-level authorization boundary for every table granted below.

begin;

grant usage on schema public to anon, authenticated;

grant select on public.events to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.event_participants to authenticated;

-- Writes for swipes and matches must go through the guarded RPC, not direct table writes.
grant select on public.swipes to authenticated;
grant select on public.matches to authenticated;

grant select, insert, update on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;

grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert on public.terms_acceptances to authenticated;

-- This table is internal to server-side rate limiting; do not expose it to browser roles.
revoke all on public.rate_limit_events from anon, authenticated;

commit;
