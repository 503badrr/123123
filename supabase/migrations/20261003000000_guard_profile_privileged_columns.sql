-- Security fix: prevent privilege escalation through public.profiles.
--
-- The "profiles_update_own" RLS policy lets any signed-in user update their own
-- row, and `authenticated` holds UPDATE on every column. A customer could
-- therefore run `update profiles set role = 'owner'` with the public key and
-- gain staff access (digital codes, refunds, admin data).
--
-- Only server-side callers (service_role, or direct SQL without a JWT) may
-- change role / is_active. Client callers keep editing name, phone, etc.

create or replace function private.guard_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  is_client boolean := auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role';
begin
  if not is_client then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'customer';
    new.is_active := true;
  elsif new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    raise exception 'Changing role or account status is not allowed.' using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_profile_privileged_columns on public.profiles;
create trigger guard_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function private.guard_profile_privileged_columns();
