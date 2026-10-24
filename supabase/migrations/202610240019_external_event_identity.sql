-- Track external event identity so provider syncs are idempotent.
begin;

alter table public.events
  add column if not exists source_provider text,
  add column if not exists source_event_id text;

alter table public.events
  add constraint events_source_provider_allowed
  check (source_provider is null or source_provider in ('ticketmaster'))
  not valid;

alter table public.events
  validate constraint events_source_provider_allowed;

alter table public.events
  add constraint events_source_identity_pair
  check ((source_provider is null) = (source_event_id is null))
  not valid;

alter table public.events
  validate constraint events_source_identity_pair;

create unique index if not exists events_source_identity_unique
  on public.events(source_provider, source_event_id);

commit;
