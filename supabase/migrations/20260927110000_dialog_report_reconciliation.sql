-- Aggregate Dialog report imports used by the Sales Performance page.
-- The report pivot screenshots contain aggregate counts, not row-level activation IDs.
-- Therefore these records support count reconciliation only and must never auto-confirm individual sales.

CREATE TABLE IF NOT EXISTS public.dialog_report_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_period text NOT NULL CHECK (report_period ~ '^\\d{4}-\\d{2}$'),
  product text NOT NULL CHECK (product IN ('govimithuru', 'sayuru')),
  method text NOT NULL CHECK (method IN ('ivr', 'app')),
  dimension text NOT NULL CHECK (dimension IN ('agent', 'mobile_prefix')),
  label text NOT NULL,
  subscriber_count integer NOT NULL CHECK (subscriber_count >= 0),
  source_filename text,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dialog_report_import_rows_lookup_idx
  ON public.dialog_report_import_rows (report_period, product, method, dimension);

ALTER TABLE public.dialog_report_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dialog_report_rows_authenticated_read ON public.dialog_report_import_rows;
CREATE POLICY dialog_report_rows_authenticated_read
  ON public.dialog_report_import_rows
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS dialog_report_rows_owner_insert ON public.dialog_report_import_rows;
CREATE POLICY dialog_report_rows_owner_insert
  ON public.dialog_report_import_rows
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() AND imported_by = auth.uid());

DROP POLICY IF EXISTS dialog_report_rows_owner_delete ON public.dialog_report_import_rows;
CREATE POLICY dialog_report_rows_owner_delete
  ON public.dialog_report_import_rows
  FOR DELETE TO authenticated
  USING (public.is_owner());

COMMENT ON TABLE public.dialog_report_import_rows IS
  'Aggregate Dialog report rows. These are for report-level count reconciliation only; they do not individually verify sales.';
