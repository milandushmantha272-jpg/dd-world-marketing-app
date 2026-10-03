create schema if not exists private;

create table if not exists public.activation_commission_rules (
  product text primary key check (product in ('govimithuru','sayuru')),
  agent_rate numeric(8,6) not null check (agent_rate >= 0 and agent_rate <= 1),
  team_leader_rate numeric(8,6) not null check (team_leader_rate >= 0 and team_leader_rate <= 1),
  updated_at timestamptz not null default now(),
  check (agent_rate + team_leader_rate = 1)
);

create table if not exists public.agent_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  agent_id uuid not null references public.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique(sale_id)
);

create table if not exists public.team_leader_pool_ledger (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_leader_id uuid not null references public.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique(sale_id)
);

alter table public.sales add column if not exists activation_path text;
alter table public.sales add column if not exists pipeline_status text;
alter table public.sales add column if not exists activation_started_at timestamptz;
alter table public.sales add column if not exists gps_captured_at timestamptz;
alter table public.sales add column if not exists gps_accuracy numeric(10,3);
alter table public.sales add column if not exists idempotency_key text;
alter table public.sales add column if not exists audit_reference text;
alter table public.sales add column if not exists activated_at timestamptz;
alter table public.sales add column if not exists commission_base_amount numeric(14,2) not null default 0;

alter table public.sales drop constraint if exists sales_activation_path_check;
alter table public.sales add constraint sales_activation_path_check check (activation_path is null or activation_path in ('USSD_IVR','APP_DIGITAL'));
alter table public.sales drop constraint if exists sales_pipeline_status_check;
alter table public.sales add constraint sales_pipeline_status_check check (pipeline_status is null or pipeline_status in ('pending_junior_tl_review','pending_kyc_verification','activated','rejected'));
alter table public.sales drop constraint if exists sales_idempotency_key_unique;
alter table public.sales add constraint sales_idempotency_key_unique unique (idempotency_key);

create table if not exists public.activation_audit_events (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  from_status text,
  to_status text not null,
  actor_user_id uuid references public.users(id),
  actor_role text,
  audit_reference text,
  created_at timestamptz not null default now()
);

create table if not exists private.activation_roster_codes (
  agent_code text primary key
);

insert into private.activation_roster_codes(agent_code) values
('9000'),('9074'),('9066'),('9067'),('9127'),('9295'),('9126'),
('9087'),('9247'),('9278'),('9235'),('9250'),('9229'),('9293'),('9183'),
('9263'),('9268'),('9271'),('9279'),('9267'),('9266')
on conflict do nothing;

create or replace function private.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public, private
as $$
  select lower(role::text) from public.users where auth_user_id = auth.uid() limit 1;
$$;

create or replace function private.is_active_employee(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.users
    where id = p_user_id
      and status = 'active'
      and employment_status = 'ACTIVE'
      and id_approval_status = 'APPROVED'
      and agent_code in (select agent_code from private.activation_roster_codes)
  );
$$;

create or replace function public.start_activation(
  p_product text,
  p_path text,
  p_agent_id uuid,
  p_agent_code text,
  p_team_id uuid,
  p_amount numeric,
  p_notes text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision,
  p_gps_captured_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user public.users%rowtype;
  v_id uuid;
  v_started timestamptz := clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_path not in ('USSD_IVR','APP_DIGITAL') then raise exception 'Invalid activation path'; end if;
  if p_product not in ('govimithuru','sayuru') then raise exception 'Invalid activation product'; end if;
  if p_latitude is null or p_longitude is null or p_accuracy is null then raise exception 'Live GPS snapshot is required'; end if;
  if p_accuracy < 0 or p_accuracy > 10000 then raise exception 'Invalid GPS accuracy'; end if;

  select * into v_user from public.users where id = p_agent_id for update;
  if not found then raise exception 'Agent profile not found'; end if;
  if v_user.auth_user_id <> auth.uid() and lower(v_user.role::text) <> 'owner' then raise exception 'Activation must be created by the authenticated employee'; end if;
  if lower(v_user.role::text) not in ('agent','owner') then raise exception 'Only Agent or Owner can initialize an activation'; end if;
  if not private.is_active_employee(v_user.id) then raise exception 'Employee is not an active approved member of the activation roster'; end if;
  if p_agent_code is not null and p_agent_code <> v_user.agent_code then raise exception 'Agent code mismatch'; end if;

  select id into v_id from public.sales where idempotency_key = p_idempotency_key;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'status', (select pipeline_status from public.sales where id=v_id), 'startedAt', (select activation_started_at from public.sales where id=v_id));
  end if;

  insert into public.sales (
    id, agent_id, agent_code, agent_name, team_id, product_type, channel,
    quantity, latitude, longitude, gps_accuracy, gps_captured_at,
    sale_date, sale_time, status, verification_status, amount, notes,
    activation_method, activation_path, pipeline_status, activation_started_at,
    idempotency_key, commission_base_amount, msisdn, customer_name, customer_mobile
  ) values (
    gen_random_uuid(), v_user.id, v_user.agent_code, v_user.name, coalesce(p_team_id, v_user.team_id),
    p_product, case when p_path='USSD_IVR' then 'IVR' else 'APP' end,
    1, p_latitude, p_longitude, p_accuracy, p_gps_captured_at,
    (v_started at time zone 'UTC')::date, v_started::time, 'pending_junior_tl_review', 'PENDING', coalesce(p_amount,0), p_notes,
    case when p_path='USSD_IVR' then 'KEYPAD_DIAL' else 'APP_LINK_SHARE' end,
    p_path, 'pending_junior_tl_review', v_started, p_idempotency_key, coalesce(p_amount,0), null, null, null
  ) returning id into v_id;

  insert into public.activation_audit_events(sale_id, from_status, to_status, actor_user_id, actor_role)
  values(v_id, null, 'pending_junior_tl_review', v_user.id, lower(v_user.role::text));

  return jsonb_build_object('id',v_id,'status','pending_junior_tl_review','startedAt',v_started);
end;
$$;

create or replace function public.advance_activation(
  p_sale_id uuid,
  p_next_status text,
  p_audit_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_sale public.sales%rowtype;
  v_actor public.users%rowtype;
  v_next text;
  v_tl uuid;
  v_rule public.activation_commission_rules%rowtype;
  v_agent_amount numeric(14,2);
  v_team_amount numeric(14,2);
  v_base numeric(14,2);
begin
  select * into v_actor from public.users where auth_user_id = auth.uid();
  if not found or v_actor.status <> 'active' or v_actor.employment_status <> 'ACTIVE' or v_actor.id_approval_status <> 'APPROVED' then raise exception 'Active approved account required'; end if;
  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Activation not found'; end if;

  v_next := lower(trim(p_next_status));
  if v_sale.pipeline_status = 'pending_junior_tl_review' and v_next = 'pending_kyc_verification' then
    if lower(v_actor.role::text) not in ('junior_team_leader','team_leader','owner') then raise exception 'Jr TL/TL validation required'; end if;
    if lower(v_actor.role::text) <> 'owner' and v_actor.team_id is distinct from v_sale.team_id then raise exception 'Team scope violation'; end if;
  elsif v_sale.pipeline_status = 'pending_kyc_verification' and v_next = 'activated' then
    if lower(v_actor.role::text) <> 'dialog_officer' then raise exception 'Dialog Officer verification required'; end if;
    if lower(coalesce((select email from auth.users where id=auth.uid()),'')) <> 'audit@ddworld.local' then raise exception 'Authorized Dialog audit identity required'; end if;
    if coalesce(trim(p_audit_reference),'') = '' then raise exception 'Audit reference required'; end if;
  elsif v_next = 'rejected' then
    if lower(v_actor.role::text) not in ('junior_team_leader','team_leader','owner','dialog_officer') then raise exception 'Not authorized to reject activation'; end if;
  else
    raise exception 'Invalid activation state transition';
  end if;

  update public.sales
  set pipeline_status=v_next,
      status=v_next,
      audit_reference=case when p_audit_reference is not null then p_audit_reference else audit_reference end,
      verification_status=case when v_next='activated' then 'VERIFIED' when v_next='rejected' then 'REJECTED' else verification_status end,
      verified_at=case when v_next='activated' then clock_timestamp() else verified_at end,
      verified_by=case when v_next='activated' then v_actor.name else verified_by end,
      activated_at=case when v_next='activated' then clock_timestamp() else activated_at end
  where id=v_sale.id;

  if v_next='activated' then
    select * into v_rule from public.activation_commission_rules where product=v_sale.product_type;
    if not found then raise exception 'Commission rule is not configured for this product'; end if;
    v_base := greatest(coalesce(v_sale.commission_base_amount,0),0);
    v_agent_amount := round(v_base * v_rule.agent_rate,2);
    v_team_amount := round(v_base * v_rule.team_leader_rate,2);
    v_tl := (select leader_id from public.teams where id=v_sale.team_id limit 1);
    if v_tl is null then raise exception 'Team Leader is not configured for activation team'; end if;
    insert into public.agent_wallet_ledger(sale_id,agent_id,amount) values(v_sale.id,v_sale.agent_id,v_agent_amount) on conflict(sale_id) do nothing;
    insert into public.team_leader_pool_ledger(sale_id,team_id,team_leader_id,amount) values(v_sale.id,v_sale.team_id,v_tl,v_team_amount) on conflict(sale_id) do nothing;
  end if;

  insert into public.activation_audit_events(sale_id,from_status,to_status,actor_user_id,actor_role,audit_reference)
  values(v_sale.id,v_sale.pipeline_status,v_next,v_actor.id,lower(v_actor.role::text),p_audit_reference);

  return jsonb_build_object('id',v_sale.id,'status',v_next,'startedAt',v_sale.activation_started_at);
end;
$$;

revoke all on function public.start_activation(text,text,uuid,text,uuid,numeric,text,double precision,double precision,double precision,timestamptz,text) from public, anon;
revoke all on function public.advance_activation(uuid,text,text) from public, anon;
grant execute on function public.start_activation(text,text,uuid,text,uuid,numeric,text,double precision,double precision,double precision,timestamptz,text) to authenticated;
grant execute on function public.advance_activation(uuid,text,text) to authenticated;

alter table public.activation_commission_rules enable row level security;
alter table public.agent_wallet_ledger enable row level security;
alter table public.team_leader_pool_ledger enable row level security;
alter table public.activation_audit_events enable row level security;

create policy activation_rules_owner_read on public.activation_commission_rules for select to authenticated using ((select private.current_role())='owner');
create policy agent_wallet_self_read on public.agent_wallet_ledger for select to authenticated using (agent_id=(select private.current_user_id()) or (select private.current_role())='owner');
create policy tl_pool_team_read on public.team_leader_pool_ledger for select to authenticated using (team_leader_id=(select private.current_user_id()) or (select private.current_role()) in ('owner','dialog_officer'));
create policy activation_audit_scope_read on public.activation_audit_events for select to authenticated using (
  (select private.current_role()) in ('owner','dialog_officer')
  or actor_user_id=(select private.current_user_id())
  or exists (select 1 from public.sales s join public.users u on u.id=s.agent_id where s.id=activation_audit_events.sale_id and u.team_id=(select team_id from public.users where id=(select private.current_user_id())))
);

alter table public.sales enable row level security;
create policy activation_sales_scope_read on public.sales for select to authenticated using (
  agent_id=(select private.current_user_id())
  or (select private.current_role()) in ('owner','dialog_officer')
  or exists (
    select 1 from public.users actor
    where actor.id=(select private.current_user_id())
      and actor.role::text in ('team_leader','junior_team_leader')
      and actor.team_id=sales.team_id
  )
);
