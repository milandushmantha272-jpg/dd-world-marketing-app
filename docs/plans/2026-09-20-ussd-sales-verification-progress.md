# USSD Sales Verification Progress

Plan: `docs/plans/2026-09-20-ussd-sales-verification-implementation-plan.md`

- Task 1: in progress — evidence state rules prepared; keypad integration pending.
- Task 2: in progress — native accessibility monitoring service registered; explicit Android Settings enablement is required.
- Task 3: pending — provisional Supabase sales/evidence persistence.
- Task 4: pending — manager-only Q/C screenshot verification.

Latest implementation:
- Added `UssdAccessibilityService` for best-effort event metadata monitoring.
- Registered the service and configuration in `AndroidManifest.xml`.
- The service does not claim USSD success or Dialog Q/C verification.

Safety rule: USSD success alone never makes a sale countable. Dialog Q/C verification remains required.
