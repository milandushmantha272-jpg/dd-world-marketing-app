-- Keep customer-identifying fields in a separate Owner-only table.
-- Existing customer fields are copied before being cleared from public.sales.

CREATE TABLE IF NOT EXISTS public.sale_customer_details (
  sale_id text PRIMARY KEY,
  agent_id text NOT NULL,
  customer_name text,
  customer_mobile text,
  msisdn text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.sale_customer_details (sale_id, agent_id, customer_name, customer_mobile, msisdn)
SELECT id::text, agent_id::text, customer_name, customer_mobile, msisdn
FROM public.sales
WHERE NULLIF(trim(coalesce(customer_name, '')), '') IS NOT NULL
   OR NULLIF(trim(coalesce(customer_mobile, '')), '') IS NOT NULL
   OR NULLIF(trim(coalesce(msisdn, '')), '') IS NOT NULL
ON CONFLICT (sale_id) DO UPDATE SET
  agent_id = EXCLUDED.agent_id,
  customer_name = COALESCE(EXCLUDED.customer_name, sale_customer_details.customer_name),
  customer_mobile = COALESCE(EXCLUDED.customer_mobile, sale_customer_details.customer_mobile),
  msisdn = COALESCE(EXCLUDED.msisdn, sale_customer_details.msisdn),
  updated_at = now();

UPDATE public.sales
SET customer_name = NULL,
    customer_mobile = NULL,
    msisdn = NULL,
    notes = CASE
      WHEN notes ILIKE '%පාරිභෝගිකයා:%' THEN regexp_replace(notes, '\\|[[:space:]]*පාරිභෝගිකයා:.*$', '| Customer details stored privately', 'i')
      ELSE notes
    END
WHERE customer_name IS NOT NULL OR customer_mobile IS NOT NULL OR msisdn IS NOT NULL
   OR notes ILIKE '%පාරිභෝගිකයා:%';

ALTER TABLE public.sale_customer_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_customer_details_owner_read ON public.sale_customer_details;
CREATE POLICY sale_customer_details_owner_read
ON public.sale_customer_details
FOR SELECT TO authenticated
USING (public.is_owner());

DROP POLICY IF EXISTS sale_customer_details_owner_insert_or_own_sale ON public.sale_customer_details;
CREATE POLICY sale_customer_details_owner_insert_or_own_sale
ON public.sale_customer_details
FOR INSERT TO authenticated
WITH CHECK (
  public.is_owner()
  OR agent_id = (
    SELECT s.agent_id::text
    FROM public.sales s
    WHERE s.id::text = sale_customer_details.sale_id
      AND s.agent_id::text = (
        SELECT u.id::text FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1
      )
    LIMIT 1
  )
);

DROP POLICY IF EXISTS sale_customer_details_owner_update ON public.sale_customer_details;
CREATE POLICY sale_customer_details_owner_update
ON public.sale_customer_details
FOR UPDATE TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS sale_customer_details_owner_delete ON public.sale_customer_details;
CREATE POLICY sale_customer_details_owner_delete
ON public.sale_customer_details
FOR DELETE TO authenticated
USING (public.is_owner());

COMMENT ON TABLE public.sale_customer_details IS
  'Customer-identifying sale data. Only Owner can read; employees may insert details for their own sale.';
