# DD World Marketing — USSD Sales Verification Design

**Date:** 2026-09-20  
**Status:** Design approved by user; implementation not started

## 1. Goal

Track Dialog-only USSD activations for Sayuru (`#828#`) and Govi Mithuru (`#616#`) while preventing agents from falsely confirming sales. The final sales result must be reconciled against the Dialog Q/C-approved screenshot report.

## 2. USSD Flows

### Sayuru (`#828#`)
1. Dial USSD code
2. Register customer
3. Enter customer mobile number
4. Enter customer OTP
5. Select zone
6. Confirm zone
7. Receive success/OK or failure response

### Govi Mithuru (`#616#`)
1. Dial USSD code
2. Register customer
3. Enter customer mobile number
4. Enter customer OTP
5. Select crop/product categories (vegetables, fruits, etc.)
6. Confirm selection
7. Receive success/OK or failure response

## 3. Verification Strategy

Use a hybrid strategy, subject to device and Android-version capability testing:

- Native USSD launch for Dialog SIMs.
- Best-effort monitoring of the USSD interaction using supported Android mechanisms, including Accessibility only where permitted and technically reliable.
- Capture available activation evidence such as flow state, timestamps, screen/result evidence, and entered metadata.
- Do not treat an agent's manual success button as authoritative.
- If the device cannot reliably monitor or verify the USSD result, mark the record `pending_verification` rather than counting it as final.

The app must clearly communicate that Android/phone compatibility can prevent guaranteed reading of carrier USSD dialogs. No unsupported 100% guarantee should be presented.

## 4. Sale Lifecycle

Recommended states:

- `started`
- `pending_verification`
- `evidence_captured`
- `verified_by_dialog_report`
- `rejected`
- `duplicate`

A local/app-recorded activation may be counted provisionally for operational tracking, but the **final sales count and commission count must use the Dialog Q/C-approved report as the authoritative source**.

## 5. Dialog Report Reconciliation

The Dialog report is received as screenshots. Dialog Q/C reportedly removes duplicates and checks customer usage, revenue, and quality before sending the report.

Manager workflow:

1. Manager uploads report screenshots.
2. OCR may extract visible fields, but extracted values are not trusted automatically.
3. Manager reviews and confirms extracted totals.
4. Reconcile at agent level using agent code/name, product/activation category, reporting period, and available totals.
5. Store the report image, reporting period, uploader, extraction result, and manager confirmation audit data.
6. Finalize only after manager confirmation.

**Limitation:** An agent-level screenshot total may not contain enough customer-level identifiers to prove every individual activation. Therefore, screenshot reconciliation must be treated as agent/report-period level unless Dialog supplies customer-level identifiers.

## 6. Roles and Permissions

### Manager Dushmantha — code `9000`
- Display name: `Manager Dushmantha`
- Manage all agents, Junior Team Leaders, and Team Leaders
- Manage teams and assignments
- Access all sales and commission dashboards
- Upload and verify Dialog screenshot reports
- Manage app settings

The existing Owner presentation should be changed to Manager presentation, while backend authorization must remain explicit and secure rather than relying only on a displayed label.

### Team Leader
- View and manage only agents assigned to their own team
- No final Dialog report verification
- No access to unrelated teams

### Junior Team Leader
- View and manage only agents assigned to their own team
- No final Dialog report verification
- No access to unrelated teams

### Agent
- Run supported Dialog USSD activation flow
- View own activation and provisional status
- Cannot upload or finalize Dialog reports
- Cannot independently convert a pending record into a verified sale

## 7. Data to Preserve

Where technically and legally appropriate, store:

- Agent ID/code/name and team relationship
- Activation type: Sayuru or Govi Mithuru
- USSD code
- Customer mobile number and OTP status (avoid storing raw OTP unless strictly required; prefer a masked or boolean status)
- Zone for Sayuru, crop/product selections for Govi Mithuru
- Start/end timestamps
- GPS latitude/longitude and accuracy
- Device/Android capability result
- Verification state and evidence references
- Dialog report ID, reporting period, screenshot reference, and manager verification audit fields

## 8. Security and Anti-Fraud Rules

- Final count cannot be increased by a client-only UI action.
- Server-side authorization must enforce role and team scope.
- Duplicate detection must use stable matching fields and Dialog's final report where available.
- All report uploads and verification changes must be auditable.
- Pending, rejected, duplicate, and finalized totals must be displayed separately.
- Failure, cancellation, timeout, and unsupported-device outcomes must never become verified sales automatically.

## 9. Testing Requirements

Before distributing to agents:

- Test both USSD codes on multiple Android versions and phone manufacturers.
- Test Dialog SIM detection/eligibility behavior.
- Test each Sayuru and Govi Mithuru step, including cancellation, timeout, invalid OTP, invalid zone/crop choice, and failure messages.
- Test inability to read USSD dialogs and confirm safe `pending_verification` behavior.
- Test screenshot upload, OCR errors, manual correction, duplicate handling, and report-period reconciliation.
- Test role isolation for Manager, TL, JTL, and Agent.
- Test that an agent cannot fake a finalized sale through API or UI manipulation.

## 10. Out of Scope for This Design

- Claiming universal automatic USSD screen reading across all Android devices.
- Treating screenshots as proof of customer-level matching when they only show aggregate agent totals.
- Replacing Dialog's official final report with app-entered counts.

## 11. Acceptance Criteria

The feature is acceptable only when:

1. Dialog activation flows are represented separately for Sayuru and Govi Mithuru.
2. Unsupported or unverifiable USSD sessions remain pending.
3. Agents cannot self-finalize sales.
4. Manager 9000 can manage all teams and verify reports.
5. TL/JTL access is restricted to their own teams.
6. Dialog screenshot reports can be uploaded, reviewed, audited, and reconciled by reporting period.
7. Finalized counts are based on manager-confirmed Dialog Q/C report data, with duplicate handling documented.
8. Multi-device testing demonstrates safe behavior even when automatic USSD monitoring is unavailable.
