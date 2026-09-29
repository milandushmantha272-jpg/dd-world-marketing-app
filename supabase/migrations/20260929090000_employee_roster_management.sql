-- DD WORLD employee roster and team-leader isolation hardening
create unique index if not exists users_agent_code_unique_idx
  on public.users ((lower(trim(agent_code))))
  where nullif(trim(agent_code), '') is not null;

drop policy if exists users_select on public.users;
create policy users_select on public.users
for select
to authenticated
using (
  is_owner()
  or auth_user_id = auth.uid()
  or (
    role = 'agent'
    and team_id is not null
    and team_id = private.current_user_team_id()
    and exists (
      select 1 from public.users me
      where me.auth_user_id = auth.uid()
        and me.role = 'team_leader'
        and me.status = 'active'
        and me.employment_status = 'ACTIVE'
        and me.id_approval_status = 'APPROVED'
    )
  )
);

drop policy if exists attendance_scoped_read on public.attendance;
create policy attendance_scoped_read on public.attendance
for select
to authenticated
using (
  is_owner()
  or user_id = (
    select u.id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
  or exists (
    select 1
    from public.users agent
    where agent.id = attendance.user_id
      and agent.role = 'agent'
      and agent.team_id is not null
      and agent.team_id = private.current_user_team_id()
      and exists (
        select 1 from public.users me
        where me.auth_user_id = auth.uid()
          and me.role = 'team_leader'
          and me.status = 'active'
          and me.employment_status = 'ACTIVE'
          and me.id_approval_status = 'APPROVED'
      )
  )
);
