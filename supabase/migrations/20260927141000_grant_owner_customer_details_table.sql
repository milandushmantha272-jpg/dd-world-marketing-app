-- Ensure authenticated clients can reach the table; row-level policies enforce access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_customer_details TO authenticated;
