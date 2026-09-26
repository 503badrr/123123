begin;

do $$
begin
  if to_regclass('public.payment_refunds') is null then
    raise exception 'payment_refunds table is missing';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.payment_refunds'::regclass) then
    raise exception 'payment_refunds must have RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.payment_refunds', 'select')
     or has_table_privilege('anon', 'public.payment_refunds', 'insert')
     or has_table_privilege('authenticated', 'public.payment_refunds', 'select')
     or has_table_privilege('authenticated', 'public.payment_refunds', 'insert') then
    raise exception 'browser roles must not have direct payment_refunds privileges';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.switch_reserve_payment_refund(uuid,numeric,text,uuid,uuid)',
    'execute'
  ) then
    raise exception 'authenticated role must not execute refund reservation RPC';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.switch_reserve_payment_refund(uuid,numeric,text,uuid,uuid)',
    'execute'
  ) then
    raise exception 'service_role must execute refund reservation RPC';
  end if;
end
$$;

rollback;
