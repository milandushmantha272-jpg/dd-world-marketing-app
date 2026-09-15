-- DD WORLD sales authorization: Agents and Team Leaders may activate sales only for themselves.
-- Owner retains full sales management through the existing owner policy.

DROP POLICY IF EXISTS sales_active_insert ON public.sales;
DROP POLICY IF EXISTS sales_employee_insert ON public.sales;
DROP POLICY IF EXISTS sales_team_leader_update ON public.sales;
DROP POLICY IF EXISTS sales_employee_update ON public.sales;

CREATE POLICY sales_self_insert
ON public.sales
FOR INSERT
WITH CHECK (
  public.is_active_employee()
  AND agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
);

CREATE POLICY sales_self_update
ON public.sales
FOR UPDATE
USING (
  public.is_owner()
  OR agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  public.is_owner()
  OR agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
);
