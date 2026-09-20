# USSD Sales Verification Progress

Plan: `docs/plans/2026-09-20-ussd-sales-verification-implementation-plan.md`

## Approved aggregate-report direction

- Govimithuru and Sayuru arrive as separate Dialog reports.
- Reports expose agent names and aggregate counts only.
- Customer mobile numbers, customer names, OTPs, and other personal details must not be shown to agents.
- App-originated sales are counted immediately as App Original Sales.
- Dialog report totals are displayed separately and reconciled without adding the same sales twice.
- Aggregate-only data cannot prove customer-level duplicates; the UI must show count differences rather than claim exact duplicate identification.

## Implementation progress

- Task 1: complete — evidence state rules hardened; device-reported SUCCESS remains UNVERIFIED for IVR verification.
- Task 2: in progress — native accessibility monitoring service registered; explicit Android Settings enablement is required.
- Task 3: in progress — privacy-safe aggregate reconciliation service and report adapters added.
- Task 4: pending — connect the reconciliation panel to the manager sales screen and replace legacy report parsing behavior.

## Latest implementation

- Added `UssdAccessibilityService` for best-effort event metadata monitoring.
- Registered the service and configuration in `AndroidManifest.xml`.
- Added `reportReconciliation.ts` for agent/product/channel aggregate comparisons.
- Added `dialogReportSummaryParser.ts` for safe manual transcription of report rows.
- Added `companyReportAdapter.ts` for converting legacy report entries into aggregate summary entries.
- Added `DialogReportReconciliationPanel.tsx` with owner/dialog-officer visibility only.
- Enabled the Android APK workflow for `main` and `feature/ussd-sales-verification`.

## Safety rules

- Customer-level details are not required by the aggregate reconciliation service and are not returned by it.
- App Original and Dialog Report totals remain separate; the system must not sum them as independent sales.
- Aggregate counts are reported as `MATCHED`, `APP_MORE`, `DIALOG_MORE`, or `NO_DIALOG_DATA`.
