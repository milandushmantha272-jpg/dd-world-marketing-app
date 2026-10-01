-- DD WORLD: harden Owner authorization against JWT-email-only bypasses.
-- Owner identity must come from the live public.users record, not merely the JWT email.

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.role = 'owner'
      and lower(coalesce(u.status, '')) = 'active'
      and upper(coalesce(u.employment_status, '')) = 'ACTIVE'
      and upper(coalesce(u.id_approval_status, '')) = 'APPROVED'
  )
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

-- This helper changes only login/app presence fields and must never be callable anonymously.
revoke execute on function public.update_app_status(uuid, boolean, boolean, timestamptz, text) from anon;
grant execute on function public.update_app_status(uuid, boolean, boolean, timestamptz, text) to authenticated;

notify pgrst, 'reload schema';
