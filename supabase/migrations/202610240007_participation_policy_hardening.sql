-- Require trusted adult eligibility and a published upcoming event before participation.
-- This intentionally fails closed: no browser-controlled field can mark an account verified.
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

drop policy if exists "participants_insert_self" on public.event_participants;
drop policy if exists "participants_insert_self_published_event" on public.event_participants;
create policy "participants_insert_self_published_event" on public.event_participants
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
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
  )
);

drop policy if exists "participants_update_self" on public.event_participants;
drop policy if exists "participants_update_self_published_event" on public.event_participants;
create policy "participants_update_self_published_event" on public.event_participants
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
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
  )
);

commit;
