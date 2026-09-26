-- Switch storefront content, support tables, and atomic hosted checkout.
-- Applied to the switch-production project on 2026-07-20.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  body text not null check (char_length(body) between 2 and 1000),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on table public.notifications from anon;
grant select, update on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notifications to service_role;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 120),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_contact_messages_status on public.contact_messages(status);
create index if not exists idx_contact_messages_created_at on public.contact_messages(created_at desc);
create index if not exists idx_contact_messages_ip_created on public.contact_messages(ip_hash, created_at desc);
alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from anon, authenticated;
grant select, insert, update, delete on table public.contact_messages to service_role;

create table if not exists public.site_banners (
  id text primary key,
  placement text not null check (placement in ('announcement','hero','games','cards','subscriptions','checkout_trust','success')),
  title_ar text not null,
  subtitle_ar text,
  badge_ar text,
  cta_label_ar text,
  cta_href text,
  gradient text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_site_banners_placement_active on public.site_banners(placement, is_active, sort_order);
alter table public.site_banners enable row level security;
grant select on table public.site_banners to anon, authenticated;
grant select, insert, update, delete on table public.site_banners to service_role;
drop policy if exists site_banners_public_read on public.site_banners;
create policy site_banners_public_read on public.site_banners for select to anon, authenticated using (is_active = true);

alter table public.orders add column if not exists customer_name text;
alter table public.orders drop constraint if exists orders_customer_name_length;
alter table public.orders add constraint orders_customer_name_length check (customer_name is null or char_length(customer_name) between 2 and 80);

create or replace function public.has_current_role(required_role text)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text = required_role and is_active = true
  );
$$;
revoke all on function public.has_current_role(text) from public, anon;
grant execute on function public.has_current_role(text) to authenticated, service_role;

create or replace function public.reserve_code(_product_id uuid, _ttl_minutes integer default 15)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare selected_id uuid;
begin
  if current_user not in ('service_role','postgres') then raise exception 'not authorized'; end if;
  select id into selected_id from public.digital_codes
  where product_id = _product_id and status = 'available' and (expires_at is null or expires_at > now())
  order by created_at for update skip locked limit 1;
  if selected_id is null then return null; end if;
  update public.digital_codes set status='reserved', expires_at=now()+make_interval(mins=>greatest(1,least(_ttl_minutes,120))), updated_at=now()
  where id=selected_id;
  return selected_id;
end;
$$;
revoke all on function public.reserve_code(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_code(uuid, integer) to service_role;

create or replace function public.deliver_code(_code_id uuid, _order_item_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if current_user not in ('service_role','postgres') then raise exception 'not authorized'; end if;
  update public.digital_codes set status='delivered', order_item_id=_order_item_id, delivered_at=now(), expires_at=null, updated_at=now()
  where id=_code_id and status in ('available','reserved');
  return found;
end;
$$;
revoke all on function public.deliver_code(uuid, uuid) from public, anon, authenticated;
grant execute on function public.deliver_code(uuid, uuid) to service_role;

create or replace function public.create_checkout_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text default null,
  p_payment_provider text default 'moyasar'
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
begin
  if current_user not in ('service_role','postgres') then raise exception 'not authorized'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then raise exception 'invalid cart'; end if;
  if char_length(trim(p_customer_name)) not between 2 and 80 then raise exception 'invalid customer name'; end if;
  if char_length(trim(p_customer_email)) not between 3 and 160 then raise exception 'invalid email'; end if;
  if char_length(trim(p_customer_phone)) not between 8 and 20 then raise exception 'invalid phone'; end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    if v_qty < 1 or v_qty > 20 then raise exception 'invalid quantity'; end if;
    select * into v_product from public.products where slug=v_item->>'slug' and is_active=true;
    if not found then raise exception 'product unavailable: %', v_item->>'slug'; end if;
    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  v_order_number := 'SW-' || to_char(clock_timestamp(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.orders (order_number,customer_name,customer_email,customer_phone,status,subtotal,discount_total,total,currency,payment_provider,notes)
  values (v_order_number,trim(p_customer_name),lower(trim(p_customer_email)),trim(p_customer_phone),'pending',v_subtotal,0,v_subtotal,'SAR',p_payment_provider,nullif(trim(p_notes),''))
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::integer;
    select * into v_product from public.products where slug=v_item->>'slug' and is_active=true;
    insert into public.order_items (order_id,product_id,product_name,quantity,unit_price,total)
    values (v_order_id,v_product.id,v_product.name_ar,v_qty,v_product.price,v_product.price*v_qty);
  end loop;

  insert into public.audit_logs (action,entity_type,entity_id,metadata)
  values ('checkout.created','order',v_order_id,jsonb_build_object('order_number',v_order_number,'total',v_subtotal,'provider',p_payment_provider));
  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'total',v_subtotal,'currency','SAR');
end;
$$;
revoke all on function public.create_checkout_order(jsonb,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb,text,text,text,text,text) to service_role;

insert into public.site_banners (id,placement,title_ar,subtitle_ar,badge_ar,cta_label_ar,cta_href,gradient,sort_order)
values
 ('top-offer','announcement','خصم حتى 25% على باقات مختارة','تسليم رقمي سريع ودفع آمن','عرض محدود','استكشف العروض','/offers','from-cyan-500 to-violet-600',10),
 ('hero-main','hero','كل عالمك الرقمي في Switch','بطاقات وألعاب واشتراكات أصلية بتجربة سعودية احترافية','Switch Digital Store','تسوق الآن','/catalog','from-cyan-400 via-blue-500 to-violet-600',10),
 ('games-main','games','اشحن لعبتك وارجع للمنافسة','أشهر الألعاب والمنصات بقيم متعددة','ألعاب','عرض الألعاب','/games','from-cyan-500 to-blue-800',10),
 ('cards-main','cards','بطاقات رقمية تصل فورًا','بطاقات متاجر ومنصات عالمية مناسبة للحساب السعودي','بطاقات','عرض البطاقات','/cards','from-amber-400 to-orange-700',10),
 ('subscriptions-main','subscriptions','ترفيهك مستمر بلا انقطاع','اشتراكات مختارة للمشاهدة والموسيقى والألعاب','اشتراكات','عرض الاشتراكات','/subscriptions','from-fuchsia-500 to-violet-800',10),
 ('checkout-trust','checkout_trust','دفع محمي وتسليم موثوق','لا نخزن بيانات البطاقة، ويتم تأكيد الدفع عبر بوابة معتمدة','الثقة والأمان',null,null,'from-emerald-500 to-cyan-700',10),
 ('success-main','success','تم استلام طلبك','ستصلك تفاصيل الطلب والمنتج الرقمي بعد تأكيد بوابة الدفع','طلب ناجح','متابعة الطلب','/account','from-emerald-400 to-cyan-600',10)
on conflict (id) do update set placement=excluded.placement,title_ar=excluded.title_ar,subtitle_ar=excluded.subtitle_ar,badge_ar=excluded.badge_ar,cta_label_ar=excluded.cta_label_ar,cta_href=excluded.cta_href,gradient=excluded.gradient,is_active=true,sort_order=excluded.sort_order,updated_at=now();
