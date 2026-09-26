begin;

do $test$
declare
  policy_count integer;
  permissive_count integer;
begin
  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      (tablename = 'contact_messages' and policyname = 'contact_messages_server_only')
      or (tablename = 'rate_limits' and policyname = 'rate_limits_server_only')
    )
    and roles = array['anon', 'authenticated']::name[]
    and qual = 'false'
    and with_check = 'false';

  if policy_count <> 2 then
    raise exception 'server-only deny policies are missing or malformed';
  end if;

  select count(*)
    into permissive_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('contact_messages', 'rate_limits')
    and (coalesce(qual, '') <> 'false' or coalesce(with_check, '') <> 'false');

  if permissive_count <> 0 then
    raise exception 'server-only tables have a permissive anon/authenticated policy';
  end if;
end
$test$;

rollback;
