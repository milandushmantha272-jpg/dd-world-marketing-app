-- Defense in depth: prevent customer identifiers from being stored on the broadly readable sales row.
CREATE OR REPLACE FUNCTION public.clear_customer_identifiers_from_sales()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.customer_name := NULL;
  NEW.customer_mobile := NULL;
  NEW.msisdn := NULL;
  IF NEW.notes ILIKE '%පාරිභෝගිකයා:%' THEN
    NEW.notes := regexp_replace(NEW.notes, '\\|[[:space:]]*පාරිභෝගිකයා:.*$', '| Customer details stored privately', 'i');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_clear_customer_identifiers ON public.sales;
CREATE TRIGGER sales_clear_customer_identifiers
BEFORE INSERT OR UPDATE OF customer_name, customer_mobile, msisdn, notes
ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.clear_customer_identifiers_from_sales();
