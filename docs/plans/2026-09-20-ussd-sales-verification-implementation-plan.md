# USSD Sales Verification Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing DD WORLD MARKETING app with a reliable Key Page, location capture, USSD-flow evidence, provisional sales, and manager-only final verification.

**Architecture:** Keep the existing React/Capacitor app and Supabase DataContext. Use the existing native USSD bridge to launch `#616#` and `#828#`; add a session state machine and best-effort Android Accessibility evidence collection without treating accessibility text as final proof. Sales remain `PENDING` until Dialog Q/C screenshot evidence is uploaded and verified by Manager Dushmantha.

**Tech Stack:** React + TypeScript, Capacitor Android bridge/Kotlin, Supabase, GitHub Actions Android build.

## Global Constraints

- Modify the existing app; do not create a separate app.
- Request location permission when the app opens and capture GPS for activation attempts.
- `#828#` flow: customer mobile, OTP, zone, zone confirmation, success/OK.
- `#616#` flow: customer mobile, OTP, crop selection, confirmation, success/OK; no zone.
- Never count a sale merely because dialing started or because an agent manually claims success.
- Agent-visible status is provisional; only Manager Dushmantha can final-verify Dialog Q/C evidence.
- TL/JTL access is limited to their own teams; agents cannot finalize or self-verify.
- Do not store raw OTP values unless the existing security policy explicitly requires it; store OTP step/status evidence instead.

---

### Task 1: Key Page and activation-session state

**Files:**
- Modify: `src/components/sales/IvrKeypadAndAppShareModal.tsx`
- Modify: relevant existing sales/types files discovered during implementation
- Create: focused tests beside the existing test convention

**Interfaces:**
- Consumes: existing `dialNativeUssd`, `addProductSale`, `updateProductSaleVerification`, `updateUserGps`.
- Produces: a typed activation session containing product, dial code, started time, GPS, customer phone, current step, evidence status, and provisional sale ID.

- [ ] Add tests for initial Key Page state, `#616#` versus `#828#` flow selection, and reset/cancel behavior.
- [ ] Verify the focused test fails before implementation.
- [ ] Replace immediate “successful” sale logging with session creation and `PENDING` status.
- [ ] Add visible steps: Dial started, customer number, OTP, zone/crops, confirmation, success/OK, and evidence pending.
- [ ] Keep customer phone and optional name associated with the session; do not expose or persist raw OTP.
- [ ] Add explicit outcomes for cancelled call, permission failure, timeout, unsupported device, and incomplete flow.
- [ ] Verify focused tests pass and run the existing typecheck/lint command.
- [ ] Commit as `feat: add activation key page session state`.

### Task 2: Native Android monitoring and location permission

**Files:**
- Modify: `android/app/src/main/java/com/ddworld/marketing/bridge/NativeUssdBridge.kt`
- Modify: existing Capacitor bridge registration and Android manifest files
- Create: `src/services/ussdSessionEvidence.ts` and focused tests if compatible with project conventions

**Interfaces:**
- Consumes: activation-session ID and expected flow (`SAYURU` or `GOVIMITHURU`).
- Produces: timestamped best-effort evidence events, permission/availability state, and an explicit `UNVERIFIED` result when monitoring cannot confirm the flow.

- [ ] Add tests for ordered event reduction, duplicate events, missing steps, and terminal success versus failure text.
- [ ] Verify focused tests fail before implementation.
- [ ] Implement the least-privilege monitoring boundary available on the device; do not bypass Android security restrictions or claim universal USSD interception.
- [ ] Preserve existing direct-call and dialer fallback behavior.
- [ ] Request/check phone and location permissions with clear user-facing errors.
- [ ] Ensure monitoring failure never changes a sale to completed.
- [ ] Verify Android compile and focused tests.
- [ ] Commit as `feat: add best effort ussd evidence bridge`.

### Task 3: Supabase provisional sales and evidence records

**Files:**
- Modify: `src/context/DataContext.tsx`
- Modify: existing `src/types.ts` or the actual type/schema files found in the repository
- Create: Supabase migration/policy file only if the repository already uses migrations

**Interfaces:**
- Consumes: activation session, GPS snapshot, evidence events, agent identity, and product flow.
- Produces: a provisional sale and append-only evidence/status updates.

- [ ] Add tests for idempotent session finalization, GPS present/missing, and `PENDING`/`UNVERIFIED`/`COMPLETED` transitions.
- [ ] Verify focused tests fail before implementation.
- [ ] Reuse existing sales columns where possible; add only schema fields proven necessary by the repository.
- [ ] Store evidence metadata and status, not raw OTP.
- [ ] Enforce manager-only final verification in Supabase policies or the existing authorization layer; do not rely only on hidden UI buttons.
- [ ] Ensure repeated callbacks cannot create duplicate counted sales.
- [ ] Verify typecheck, migration validation if available, and affected integration tests.
- [ ] Commit as `feat: persist provisional ussd sales evidence`.

### Task 4: Manager Q/C screenshot verification and reporting

**Files:**
- Modify: existing manager/report pages identified during implementation
- Create: focused verification component/service and tests following repository conventions

**Interfaces:**
- Consumes: uploaded Dialog Q/C screenshot, report period, agent/team scope, and provisional sales.
- Produces: manager verification decision, audit metadata, and counted-sale/report totals.

- [ ] Add tests for manager approval, non-manager denial, duplicate upload, and evidence mismatch.
- [ ] Verify focused tests fail before implementation.
- [ ] Add manager-only upload and review flow; TL/JTL can view team status but cannot finalize.
- [ ] Treat OCR as assistive only; require explicit manager confirmation and retain original screenshot reference.
- [ ] Count a sale only after the final verification transition succeeds.
- [ ] Verify build, tests, and Android packaging workflow.
- [ ] Commit as `feat: add manager q c verification workflow`.

## Unresolved externally observable decisions

- Exact Dialog Q/C screenshot format and whether one screenshot represents individual customers or an aggregate report must be confirmed before automatic matching rules are enabled.
- Android Accessibility permission must remain opt-in and device-dependent; unsupported devices show `UNVERIFIED` rather than a false success.
- Existing Supabase schema/RLS conventions determine the final migration filenames and exact column names after repository inspection.
