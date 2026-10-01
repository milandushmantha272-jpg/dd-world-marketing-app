-- DD WORLD: role-target isolation and team-supervisor data boundary.
-- Owner is corporate-wide. Team Leader / Junior Team Leader are limited to
-- their own team and only Agent / Junior Team Leader peers.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY[
    'owner'::text,
    'team_leader'::text,
    'junior_team_leader'::text,
    'agent'::text,
    'dialog_officer'::text
  ]));

CREATE OR REPLACE FUNCTION private.current_user_is_active_team_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.role IN ('team_leader', 'junior_team_leader')
      AND u.status = 'active'
      AND u.employment_status = 'ACTIVE'
      AND u.id_approval_status = 'APPROVED'
  );
$$;

REVOKE ALL ON FUNCTION private.current_user_is_active_team_supervisor() FROM public;
GRANT EXECUTE ON FUNCTION private.current_user_is_active_team_supervisor() TO authenticated;

-- Backward-compatible helper name used by older RLS expressions.
CREATE OR REPLACE FUNCTION private.current_user_is_active_team_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT private.current_user_is_active_team_supervisor();
$$;

REVOKE ALL ON FUNCTION private.current_user_is_active_team_leader() FROM public;
GRANT EXECUTE ON FUNCTION private.current_user_is_active_team_leader() TO authenticated;

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select
ON public.users
FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR auth_user_id = (SELECT auth.uid())
  OR (
    role IN ('agent', 'junior_team_leader')
    AND team_id IS NOT NULL
    AND team_id = private.current_user_team_id()
    AND private.current_user_is_active_team_supervisor()
  )
);

DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select
ON public.teams
FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR id = private.current_user_team_id()
);

DROP POLICY IF EXISTS attendance_scoped_read ON public.attendance;
CREATE POLICY attendance_scoped_read
ON public.attendance
FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR user_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1
    FROM public.users target
    WHERE target.id = public.attendance.user_id
      AND target.role IN ('agent', 'junior_team_leader')
      AND target.team_id IS NOT NULL
      AND target.team_id = private.current_user_team_id()
      AND private.current_user_is_active_team_supervisor()
  )
);

DROP POLICY IF EXISTS sales_select ON public.sales;
CREATE POLICY sales_select
ON public.sales
FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR (
    public.is_active_employee()
    AND (
      agent_id = (
        SELECT u.id FROM public.users u
        WHERE u.auth_user_id = (SELECT auth.uid())
        LIMIT 1
      )
      OR EXISTS (
        SELECT 1
        FROM public.users target
        WHERE target.id = public.sales.agent_id
          AND target.role IN ('agent', 'junior_team_leader')
          AND target.team_id IS NOT NULL
          AND target.team_id = private.current_user_team_id()
          AND private.current_user_is_active_team_supervisor()
      )
    )
  )
);

DROP POLICY IF EXISTS sales_update ON public.sales;
CREATE POLICY sales_update
ON public.sales
FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR (
    public.is_active_employee()
    AND agent_id = (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
      LIMIT 1
    )
  )
)
WITH CHECK (
  public.is_owner()
  OR (
    public.is_active_employee()
    AND agent_id = (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
      LIMIT 1
    )
  )
);

DROP POLICY IF EXISTS leaves_scoped_read ON public.leaves;
CREATE POLICY leaves_scoped_read
ON public.leaves
FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR user_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  OR EXISTS (
    SELECT 1
    FROM public.users target
    WHERE target.id = public.leaves.user_id
      AND target.role IN ('agent', 'junior_team_leader')
      AND target.team_id IS NOT NULL
      AND target.team_id = private.current_user_team_id()
      AND private.current_user_is_active_team_supervisor()
  )
);

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select
ON public.messages
FOR SELECT TO authenticated
USING (
  public.is_owner()
  OR sender_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  OR receiver_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  OR (
    public.is_active_employee()
    AND private.current_user_is_active_team_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.users s
      WHERE s.id = public.messages.sender_id
        AND s.role IN ('agent', 'junior_team_leader')
        AND s.team_id = private.current_user_team_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.users r
      WHERE r.id = public.messages.receiver_id
        AND r.role IN ('agent', 'junior_team_leader')
        AND r.team_id = private.current_user_team_id()
    )
  )
);

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert
ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR (
    public.is_active_employee()
    AND sender_id = (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = (SELECT auth.uid())
      LIMIT 1
    )
    AND (
      receiver_id = sender_id
      OR (
        private.current_user_is_active_team_supervisor()
        AND EXISTS (
          SELECT 1 FROM public.users r
          WHERE r.id = public.messages.receiver_id
            AND r.role IN ('agent', 'junior_team_leader')
            AND r.team_id = private.current_user_team_id()
        )
      )
      OR (
        NOT private.current_user_is_active_team_supervisor()
        AND EXISTS (
          SELECT 1
          FROM public.teams t
          WHERE t.id = private.current_user_team_id()
            AND t.leader_id = public.messages.receiver_id
        )
      )
    )
  )
);

DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update
ON public.messages
FOR UPDATE TO authenticated
USING (
  public.is_owner()
  OR sender_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  OR receiver_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
)
WITH CHECK (
  public.is_owner()
  OR sender_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
  OR receiver_id = (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
    LIMIT 1
  )
);

-- Narrow RPC: supervisors may change only app/login tracking for their own
-- team members; no general users-table UPDATE permission is granted.
CREATE OR REPLACE FUNCTION public.update_app_status(
  target_user_id uuid,
  p_is_logged_in boolean DEFAULT NULL,
  p_is_app_downloaded boolean DEFAULT NULL,
  p_last_login_at timestamptz DEFAULT NULL,
  p_app_version text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  me public.users%ROWTYPE;
  target public.users%ROWTYPE;
BEGIN
  SELECT * INTO me
  FROM public.users
  WHERE auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF public.is_owner() THEN
    NULL;
  ELSIF me.id = target_user_id
        AND me.status = 'active'
        AND me.employment_status = 'ACTIVE'
  THEN
    NULL;
  ELSIF me.role IN ('team_leader', 'junior_team_leader')
        AND me.status = 'active'
        AND me.employment_status = 'ACTIVE'
        AND me.id_approval_status = 'APPROVED'
  THEN
    SELECT * INTO target
    FROM public.users
    WHERE id = target_user_id
    LIMIT 1;

    IF NOT FOUND
       OR target.role NOT IN ('agent', 'junior_team_leader')
       OR target.team_id IS NULL
       OR target.team_id <> me.team_id
    THEN
      RAISE EXCEPTION 'Team-scoped app status update denied';
    END IF;
  ELSE
    RAISE EXCEPTION 'App status update denied';
  END IF;

  UPDATE public.users
  SET
    is_logged_in = COALESCE(p_is_logged_in, is_logged_in),
    is_app_downloaded = COALESCE(p_is_app_downloaded, is_app_downloaded),
    last_login_at = COALESCE(p_last_login_at, last_login_at),
    app_version = COALESCE(p_app_version, app_version)
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_app_status(uuid, boolean, boolean, timestamptz, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_app_status(uuid, boolean, boolean, timestamptz, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
