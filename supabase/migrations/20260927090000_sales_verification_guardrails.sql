-- Sales integrity guardrails.
-- Employee submissions must remain provisional; only public.is_owner() may finalize.
-- These RESTRICTIVE policies constrain writes even if older permissive policies exist.

DROP POLICY IF EXISTS sales_insert_must_be_pending ON public.sales;
CREATE POLICY sales_insert_must_be_pending
ON public.sales
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  public.is_owner()
  OR (
    agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
    AND upper(coalesce(status, 'PENDING')) = 'PENDING'
    AND upper(coalesce(verification_status, 'PENDING')) = 'PENDING'
    AND verified_at IS NULL
    AND verified_by IS NULL
  )
);

DROP POLICY IF EXISTS sales_update_requires_owner_finalization ON public.sales;
CREATE POLICY sales_update_requires_owner_finalization
ON public.sales
AS RESTRICTIVE
FOR UPDATE
USING (
  public.is_owner()
  OR agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  public.is_owner()
  OR (
    agent_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
    AND upper(coalesce(status, 'PENDING')) IN ('PENDING', 'REVIEW_REQUIRED')
    AND upper(coalesce(verification_status, 'PENDING')) IN ('PENDING', 'REVIEW_REQUIRED')
    AND verified_at IS NULL
    AND verified_by IS NULL
  )
);
