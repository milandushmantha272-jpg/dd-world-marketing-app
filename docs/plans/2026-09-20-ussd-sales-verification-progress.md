# USSD Sales Verification Progress

Plan: `docs/plans/2026-09-20-ussd-sales-verification-implementation-plan.md`

- Task 1: complete — evidence state rules hardened; device-reported SUCCESS remains UNVERIFIED.
- Task 2: in progress — native accessibility monitoring service registered; explicit Android Settings enablement is required.
- Task 3: pending — provisional Supabase sales/evidence persistence and keypad integration.
- Task 4: pending — manager-only Q/C screenshot verification.

Latest implementation:
- Added `UssdAccessibilityService` for best-effort event metadata monitoring.
- Registered the service and configuration in `AndroidManifest.xml`.
- Device-reported USSD success cannot become a verified sale.
- `hasTerminalSuccess()` and `isCountableEvidence()` deliberately remain false until separate Dialog Q/C verification is completed.

Safety rule: USSD success alone never makes a sale countable. Dialog Q/C verification remains required.
