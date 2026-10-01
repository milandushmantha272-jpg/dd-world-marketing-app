-- DD WORLD: enforce Junior Team Leader micro-team isolation.
-- A Junior Team Leader may access only their own profile and Agent records
-- directly assigned to them via reports_to_user_id. Team Leaders retain team-wide scope.

create or replace function private.current_user_can_view_target(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users me
    join public.users target on target.id = target_user_id
    where me.auth_user_id = (select auth.uid())
      and me.status = 'active'
      and me.employment_status = 'ACTIVE'
      and me.id_approval_status = 'APPROVED'
      and (
        me.role = 'owner'
        or target.id = me.id
        or (
          me.role = 'team_leader'
          and target.role in ('agent','junior_team_leader')
          and target.team_id is not null
          and target.team_id = me.team_id
        )
        or (
          me.role = 'junior_team_leader'
          and target.role = 'agent'
          and target.team_id is not null
          and target.team_id = me.team_id
          and target.reports_to_user_id = me.id
        )
      )
  );
$$;

revoke all on function private.current_user_can_view_target(uuid) from public;
grant execute on function private.current_user_can_view_target(uuid) to authenticated;

drop policy if exists users_select on public.users;
create policy users_select
on public.users
for select to authenticated
using (
  public.is_owner()
  or auth_user_id = (select auth.uid())
  or private.current_user_can_view_target(id)
);

drop policy if exists attendance_scoped_read on public.attendance;
create policy attendance_scoped_read
on public.attendance
for select to authenticated
using (
  public.is_owner()
  or private.current_user_can_view_target(user_id)
);

drop policy if exists sales_select on public.sales;
create policy sales_select
on public.sales
for select to authenticated
using (
  public.is_owner()
  or (
    public.is_active_employee()
    and private.current_user_can_view_target(agent_id)
  )
);

drop policy if exists leaves_scoped_read on public.leaves;
create policy leaves_scoped_read
on public.leaves
for select to authenticated
using (
  public.is_owner()
  or private.current_user_can_view_target(user_id)
);

drop policy if exists messages_select on public.messages;
create policy messages_select
on public.messages
for select to authenticated
using (
  public.is_owner()
  or private.current_user_can_view_target(sender_id)
  or private.current_user_can_view_target(receiver_id)
);

notify pgrst, 'reload schema';
