-- Publish an approved submission server-side, only on its first transition to approved.
begin;
alter table public.event_submissions
  add column if not exists published_event_id uuid unique references public.events(id) on delete set null;
create or replace function public.publish_approved_event_submission()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare new_event_id uuid;
begin
  if old.status is distinct from new.status and new.status = 'approved' and new.published_event_id is null then
    insert into public.events (title, description, category, venue_name, city, starts_at, ends_at, booking_url, published)
    values (new.title, new.description, new.category, new.venue_name, new.city, new.starts_at, new.ends_at, new.booking_url, true)
    returning id into new_event_id;
    update public.event_submissions set published_event_id = new_event_id where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.publish_approved_event_submission() from public, anon, authenticated;
drop trigger if exists publish_approved_event_submission_trigger on public.event_submissions;
create trigger publish_approved_event_submission_trigger after update of status on public.event_submissions
for each row execute function public.publish_approved_event_submission();
commit;