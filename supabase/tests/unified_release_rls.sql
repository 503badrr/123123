begin;

do $test$
declare
  invalid_policy_count integer;
  redundant_index_count integer;
  retained_index_count integer;
  preserved_order_item_columns integer;
begin
  if has_function_privilege('public', 'public.is_admin()', 'execute') then
    raise exception 'PUBLIC must not execute public.is_admin()';
  end if;

  if has_function_privilege('anon', 'public.is_admin()', 'execute') then
    raise exception 'anon must not execute public.is_admin()';
  end if;

  if not has_function_privilege('authenticated', 'public.is_admin()', 'execute') then
    raise exception 'authenticated must execute public.is_admin()';
  end if;

  if not has_function_privilege('service_role', 'public.is_admin()', 'execute') then
    raise exception 'service_role must execute public.is_admin()';
  end if;

  select count(*)
    into invalid_policy_count
  from pg_policies
  where schemaname = 'public'
    and (
      coalesce(qual, '') ilike '%is_admin%'
      or coalesce(with_check, '') ilike '%is_admin%'
    )
    and roles <> array['authenticated']::name[];

  if invalid_policy_count <> 0 then
    raise exception '% policies call is_admin() outside authenticated', invalid_policy_count;
  end if;

  select count(*)
    into redundant_index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'webhook_events'
    and indexname = any (
      array[
        'idx_webhook_events_provider_event_id',
        'webhook_events_id_idx',
        'webhook_events_id_idx1',
        'webhook_events_id_idx2',
        'webhook_events_id_idx3',
        'webhook_events_id_idx4'
      ]
    );

  if redundant_index_count <> 0 then
    raise exception '% redundant webhook indexes remain', redundant_index_count;
  end if;

  select count(*)
    into retained_index_count
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'webhook_events'
    and indexname = any (
      array[
        'webhook_events_pkey',
        'webhook_events_provider_event_id_key',
        'idx_webhook_events_processed'
      ]
    );

  if retained_index_count <> 3 then
    raise exception 'one or more required webhook indexes are missing';
  end if;

  select count(*)
    into preserved_order_item_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'order_items'
    and column_name = any (
      array[
        'id',
        'order_id',
        'product_id',
        'product_name',
        'quantity',
        'unit_price',
        'total',
        'created_at'
      ]
    );

  if preserved_order_item_columns <> 8 then
    raise exception 'order_items lost one or more fulfillment columns';
  end if;
end
$test$;

rollback;
