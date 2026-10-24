-- Align the Auth metadata field used by the web signup form with profile creation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'New member'
  );
  insert into public.profiles (id, display_name)
  values (new.id, left(candidate_name, 60))
  on conflict (id) do nothing;
  return new;
end;
$$;
