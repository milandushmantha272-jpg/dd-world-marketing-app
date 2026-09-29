-- DD WORLD: security hardening, Dialog view-only RLS and presentation deck notifications
-- Applied to live project as migration: security_dialog_presentation

create schema if not exists private;

create or replace function public.is_owner()
returns boolean language sql stable security invoker set search_path=''
as $$ select lower(coalesce(auth.jwt()->>'email',''))='milandushmantha272@gmail.com' $$;

create or replace function public.get_my_employee_profile()
returns public.users language sql stable security invoker set search_path=''
as $$ select u from public.users u where u.auth_user_id=(select auth.uid()) limit 1 $$;

create or replace function public.create_notification(target_user_id uuid, notification_title text, notification_body text, notification_type text default 'general', target_page text default null, notification_data jsonb default '{}'::jsonb)
returns public.notifications language plpgsql volatile security invoker set search_path=''
as $$ declare result public.notifications; begin
  if target_user_id is null or length(trim(notification_title))=0 then raise exception 'Invalid notification target/title'; end if;
  insert into public.notifications(user_id,title,body,type,page,data)
  values(target_user_id,left(notification_title,200),left(coalesce(notification_body,''),2000),left(coalesce(notification_type,'general'),80),target_page,coalesce(notification_data,'{}'::jsonb))
  returning * into result;
  return result;
end $$;

create or replace function public.is_active_employee()
returns boolean language sql stable security invoker set search_path=''
as $$ select public.is_owner() or exists(select 1 from public.users where auth_user_id=(select auth.uid()) and status='active' and employment_status='ACTIVE' and id_approval_status='APPROVED') $$;

create or replace function private.has_product_access(target_user_id uuid,target_product text)
returns boolean language sql stable security definer set search_path=''
as $$ select case
when lower(coalesce(auth.jwt()->>'email',''))='milandushmantha272@gmail.com' then true
when exists(select 1 from public.product_access_controls c where c.user_id=target_user_id and lower(c.product_type)=lower(target_product))
then not exists(select 1 from public.product_access_controls c where c.user_id=target_user_id and lower(c.product_type)=lower(target_product) and c.is_allowed=false and (c.blocked_from is null or c.blocked_from<=now()) and (c.blocked_until is null or c.blocked_until>now()))
when exists(select 1 from public.product_access_controls c join public.users u on u.team_id=c.team_id where u.id=target_user_id and lower(c.product_type)=lower(target_product))
then not exists(select 1 from public.product_access_controls c join public.users u on u.team_id=c.team_id where u.id=target_user_id and lower(c.product_type)=lower(target_product) and c.is_allowed=false and (c.blocked_from is null or c.blocked_from<=now()) and (c.blocked_until is null or c.blocked_until>now()))
else true end $$;

revoke execute on function private.has_product_access(uuid,text) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.has_product_access(uuid,text) to authenticated;

drop policy if exists sales_insert on public.sales;
create policy sales_insert on public.sales for insert to authenticated
with check(public.is_owner() or(public.is_active_employee() and agent_id=(select u.id from public.users u where u.auth_user_id=(select auth.uid()) limit 1) and private.has_product_access(agent_id,product_type)));
drop function if exists public.has_product_access(uuid,text);

drop policy if exists dialog_attendance_select on public.attendance;
create policy dialog_attendance_select on public.attendance for select to authenticated using(
public.is_owner() or exists(select 1 from public.users me where me.auth_user_id=(select auth.uid()) and me.role='dialog_officer' and me.status='active' and me.employment_status='ACTIVE' and me.id_approval_status='APPROVED'));

drop policy if exists dialog_sales_select on public.sales;
create policy dialog_sales_select on public.sales for select to authenticated using(
public.is_owner() or(exists(select 1 from public.users me where me.auth_user_id=(select auth.uid()) and me.role='dialog_officer' and me.status='active' and me.employment_status='ACTIVE' and me.id_approval_status='APPROVED') and lower(coalesce(product_type,'')) in('sayuru','govimithuru')));

drop policy if exists dialog_weekly_reports_dialog_select on public.dialog_weekly_reports;
create policy dialog_weekly_reports_dialog_select on public.dialog_weekly_reports for select to authenticated using(
public.is_owner() or exists(select 1 from public.users me where me.auth_user_id=(select auth.uid()) and me.role='dialog_officer' and me.status='active' and me.employment_status='ACTIVE' and me.id_approval_status='APPROVED'));

drop policy if exists dialog_distributions_dialog_select on public.dialog_report_distributions;
create policy dialog_distributions_dialog_select on public.dialog_report_distributions for select to authenticated using(
public.is_owner() or exists(select 1 from public.users me where me.auth_user_id=(select auth.uid()) and me.role='dialog_officer' and me.status='active' and me.employment_status='ACTIVE' and me.id_approval_status='APPROVED'));

create table if not exists public.presentation_decks(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 200),
 slides jsonb not null default '[]'::jsonb check(jsonb_typeof(slides)='array'),
 created_by uuid not null references public.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.presentation_decks enable row level security;
grant select,insert,update,delete on public.presentation_decks to authenticated;
drop policy if exists presentation_decks_select on public.presentation_decks;
create policy presentation_decks_select on public.presentation_decks for select to authenticated using(public.is_owner() or public.is_active_employee());
drop policy if exists presentation_decks_owner_write on public.presentation_decks;
create policy presentation_decks_owner_write on public.presentation_decks for all to authenticated using(public.is_owner()) with check(public.is_owner());

create or replace function public.notify_presentation_deck()
returns trigger language plpgsql security definer set search_path=''
as $$ begin
insert into public.notifications(user_id,title,body,type,page,data)
select u.id,'New DD WORLD Presentation Shared',left(new.title,180),'presentation','Page 10 — Month-End Presentation',jsonb_build_object('deck_id',new.id)
from public.users u where u.role in('agent','team_leader') and u.status='active' and u.employment_status='ACTIVE' and u.id_approval_status='APPROVED';
return new;
end $$;

drop trigger if exists trg_notify_presentation_deck on public.presentation_decks;
create trigger trg_notify_presentation_deck after insert on public.presentation_decks for each row execute function public.notify_presentation_deck();

do $$ begin
if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='presentation_decks')
then alter publication supabase_realtime add table public.presentation_decks;
end if;
exception when undefined_object then null;
end $$;