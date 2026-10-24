-- Server-side abuse controls that remain enforceable outside the browser UI.
begin;

alter table public.reports
  drop constraint if exists reports_details_trimmed,
  add constraint reports_details_trimmed
    check (char_length(btrim(details)) <= 2000);

alter table public.event_submissions
  drop constraint if exists event_submissions_future_check,
  add constraint event_submissions_future_check
    check (starts_at > created_at);

create or replace function public.enforce_security_rate_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_window interval;
  v_limit integer;
  v_count integer;
  v_action text;
begin
  if tg_table_name = 'reports' then
    v_action := 'report';
    v_window := interval '10 minutes';
    v_limit := 10;
  elsif tg_table_name = 'event_submissions' then
    v_action := 'event_submission';
    v_window := interval '1 hour';
    v_limit := 5;
  else
    return new;
  end if;

  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end;

  select count(*) into v_count
  from public.rate_limit_events r
  where r.user_id = v_user
    and r.action = v_action
    and r.created_at > now() - v_window;

  if v_count >= v_limit then
    raise exception 'rate limit exceeded' using errcode = 'P0001';
  end;

  insert into public.rate_limit_events(user_id, action)
  values (v_user, v_action);
  return new;
end;
$$;

revoke all on function public.enforce_security_rate_limits() from public, anon, authenticated;

drop trigger if exists reports_security_rate_limit on public.reports;
create trigger reports_security_rate_limit
before insert on public.reports
for each row execute function public.enforce_security_rate_limits();

drop trigger if exists event_submissions_security_rate_limit on public.event_submissions;
create trigger event_submissions_security_rate_limit
before insert on public.event_submissions
for each row execute function public.enforce_security_rate_limits();

revoke insert, update, delete on public.rate_limit_events from anon, authenticated;
commit;
