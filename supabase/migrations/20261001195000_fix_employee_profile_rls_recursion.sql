-- DD WORLD: fix login/profile RLS recursion
-- The employee-profile RPC and active-employee guard must bypass users-table RLS,
-- otherwise users policies can recursively evaluate users -> is_active_employee() -> users.

create or replace function public.get_my_employee_profile()
returns public.users
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u
  from public.users u
  where u.auth_user_id = (select auth.uid())
  limit 1
$$;

revoke all on function public.get_my_employee_profile() from public;
grant execute on function public.get_my_employee_profile() to authenticated;

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_owner()
    or exists (
      select 1
      from public.users u
      where u.auth_user_id = (select auth.uid())
        and u.status = 'active'
        and u.employment_status = 'ACTIVE'
        and u.id_approval_status = 'APPROVED'
    )
$$;

revoke all on function public.is_active_employee() from public;
grant execute on function public.is_active_employee() to authenticated;
