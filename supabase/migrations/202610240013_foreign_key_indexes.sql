-- Cover foreign-key lookups identified by Supabase's performance advisor.
-- Foreign keys are not automatically indexed by PostgreSQL; these indexes help
-- participant cleanup, blocking, moderation, groups, matches, and message queries.

begin;

create index if not exists blocks_blocked_id_idx
  on public.blocks(blocked_id);

create index if not exists group_members_user_id_idx
  on public.group_members(user_id);

create index if not exists groups_creator_id_idx
  on public.groups(creator_id);

create index if not exists groups_event_id_idx
  on public.groups(event_id);

create index if not exists matches_user_b_idx
  on public.matches(user_b);

create index if not exists messages_sender_id_idx
  on public.messages(sender_id);

create index if not exists reports_event_id_idx
  on public.reports(event_id);

create index if not exists reports_message_id_idx
  on public.reports(message_id);

create index if not exists reports_reported_user_id_idx
  on public.reports(reported_user_id);

create index if not exists reports_reporter_id_idx
  on public.reports(reporter_id);

create index if not exists swipes_swiper_id_idx
  on public.swipes(swiper_id);

create index if not exists swipes_target_user_id_idx
  on public.swipes(target_user_id);

commit;
