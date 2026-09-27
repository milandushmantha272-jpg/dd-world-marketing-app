# DD WORLD MARKETING — Role App Audit & Fix Plan

Purpose: align Owner pages with the actual Agent and Team Leader workflows. This is an implementation checklist, not a claim that every item is already working.

## Existing Agent workflow to support
- Home / role dashboard
- Employee ID and profile/KYC
- Daily attendance: check-in, check-out, history
- Sales activation: Govimithuru #616# and Sayuru #828#; IVR/app channel
- Personal sales summary and status
- Targets and performance
- GPS / work-area reporting
- Company messages and team chat
- Commission/payment view
- Product knowledge/training
- Notifications and support

## Existing Team Leader workflow to support
- Team dashboard and team-member roster
- Team attendance and daily coverage
- Team sales summary and activation status
- Team target progress and performance/leaderboard
- Review of team activity, GPS/work areas, and attendance
- Company messages, chat, meetings
- Product knowledge/training
- Commission/payment and reports where permitted

## Owner pages to audit against those workflows
- Company overview / Owner dashboard
- Employee and team management (create, assign, change role/status)
- Employee ID verification and approval
- Attendance control and attendance history
- All sales / activation hub and pending sale verification
- Sales summary, team/agent reports, and target management
- Dialog official records and reconciliation
- Commission/payment controls
- GPS map, work-area and activity monitoring
- App download/login status monitor
- Company message center and communications
- Meetings and calls
- Product knowledge/training
- Career/team management and user/access control
- Data retention/history and archive
- System health/data integrity
- Marketing posts, vault/files, AI assistant, and system doctor (only if these are intended production features)

## Cross-role correctness checks
- Every page must show data from the same Supabase source of truth.
- Agent sees only their own personal records; Team Leader sees only their authorized team; Owner sees company-wide records.
- Role authorization must be enforced by Supabase RLS/database policies, not only by hiding UI.
- Sales are recorded as pending until reconciled with the official Dialog report; prevent duplicates and preserve an audit trail.
- Attendance check-in/out must be tied to the authenticated employee and a valid date; GPS must not be represented as fingerprint/biometric verification.
- Targets, teams, commissions, and reports must use consistent definitions and date ranges.
- Mutations must report actual success/failure; no empty no-op handlers or false “success” messages.
- Empty/loading/error states, mobile layout, navigation, and back/home behavior must be checked.
- Run TypeScript, production build, Android unit tests, APK verification, and inspect workflow artifacts after changes.

## Confirmed source-level risks found during initial review
- DataContext contains placeholder no-op functions for vault, marketing posts, AI messages, system doctor, leave decisions, meetings, calls, and some other operations.
- Several datasets are initialized as empty local state rather than loaded from Supabase (including targets, reports, training, work areas, and related records).
- Owner and employee permissions need database/RLS verification; client-side role checks alone are insufficient.
- A successful CI build does not prove all app workflows or live Supabase operations work.

## Suggested additions (only after the existing flows are made reliable)
1. Owner Company Control Center: company-wide KPI summary, exceptions, pending approvals, and urgent alerts.
2. Unified Target & Plan Manager: monthly/team/agent targets with effective dates and history.
3. Sales Reconciliation Queue: pending, matched, rejected, duplicate, and disputed activations with official-report reference and audit log.
4. Commission Ledger: rule version, earned amount, payment status, payment date/reference, and exportable history.
5. Team Daily Operations: leader-submitted area/staff plan, midday update, and end-of-day sales report.
6. Audit Trail: who changed employee role/status, targets, sale status, commission, or team assignment and when.
7. Data Health & Access Review: last sync, failed writes, RLS/access checks, and missing required fields.

## Definition of done
Do not mark complete until each existing page is mapped to a real data source and role permission, mutations are implemented or explicitly disabled, key workflows are tested, and the latest CI run succeeds. Live Supabase/RLS behavior must be verified in the actual project environment; CI alone cannot establish that.
