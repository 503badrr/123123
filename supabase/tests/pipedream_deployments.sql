begin;

do $test$
declare
  deployment_table oid;
  policy_count integer;
  expected_index_count integer;
begin
  select c.oid
    into deployment_table
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'deployments'
    and c.relkind = 'r';

  if deployment_table is null then
    raise exception 'public.deployments is missing';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = deployment_table
  ) then
    raise exception 'RLS is not enabled on public.deployments';
  end if;

  if has_table_privilege('anon', 'public.deployments', 'select')
     or has_table_privilege('authenticated', 'public.deployments', 'select') then
    raise exception 'browser roles must not read public.deployments';
  end if;

  if not has_table_privilege('service_role', 'public.deployments', 'select')
     or not has_table_privilege('service_role', 'public.deployments', 'insert')
     or not has_table_privilege('service_role', 'public.deployments', 'update') then
    raise exception 'service_role requires select, insert, and update';
  end if;

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'deployments'
    and policyname = 'deployments_server_only'
    and roles = array['anon', 'authenticated']::name[]
    and qual = 'false'
    and with_check = 'false';

  if policy_count <> 1 then
    raise exception 'deployments_server_only policy is missing or malformed';
  end if;

  select count(*)
    into expected_index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'deployments'
    and indexname in (
      'deployments_repo_env_sha_unique',
      'deployments_github_delivery_id_unique',
      'deployments_status_started_at_idx'
    );

  if expected_index_count <> 3 then
    raise exception 'deployment dedupe/status indexes are incomplete';
  end if;
end
$test$;

rollback;
