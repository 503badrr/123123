begin;

do $test$
declare
  public_is_definer boolean;
  private_is_definer boolean;
  public_definition text;
begin
  select p.prosecdef
    into public_is_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'is_admin'
    and pg_get_function_identity_arguments(p.oid) = '';

  if public_is_definer is distinct from false then
    raise exception 'public.is_admin() must be SECURITY INVOKER';
  end if;

  select p.prosecdef
    into private_is_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'is_admin'
    and pg_get_function_identity_arguments(p.oid) = '';

  if private_is_definer is distinct from true then
    raise exception 'private.is_admin() must be SECURITY DEFINER';
  end if;

  if has_schema_privilege('anon', 'private', 'usage') then
    raise exception 'anon must not have USAGE on private schema';
  end if;

  if not has_schema_privilege('authenticated', 'private', 'usage') then
    raise exception 'authenticated must have USAGE on private schema for RLS compatibility';
  end if;

  if has_function_privilege('anon', 'public.is_admin()', 'execute') then
    raise exception 'anon must not execute public.is_admin()';
  end if;

  if not has_function_privilege('authenticated', 'public.is_admin()', 'execute') then
    raise exception 'authenticated must execute public.is_admin()';
  end if;

  if has_function_privilege('anon', 'private.is_admin()', 'execute') then
    raise exception 'anon must not execute private.is_admin()';
  end if;

  if not has_function_privilege('authenticated', 'private.is_admin()', 'execute') then
    raise exception 'authenticated must execute private.is_admin()';
  end if;

  select pg_get_functiondef('public.is_admin()'::regprocedure)
    into public_definition;

  if public_definition not ilike '%private.is_admin()%'
  then
    raise exception 'public.is_admin() is not the expected compatibility wrapper';
  end if;
end
$test$;

rollback;
