-- Keep the admin predicate usable by existing RLS policies and server RPC calls,
-- while moving the SECURITY DEFINER implementation out of the exposed public
-- API schema. The public function becomes a SECURITY INVOKER compatibility
-- wrapper and therefore cannot independently elevate privileges.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin', 'staff')
      and is_active = true
  );
$function$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_admin() to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_admin();
$function$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

comment on function private.is_admin() is
  'Internal SECURITY DEFINER implementation for Switch staff authorization.';
comment on function public.is_admin() is
  'SECURITY INVOKER compatibility wrapper around private.is_admin(); safe for existing RLS and server RPC callers.';
