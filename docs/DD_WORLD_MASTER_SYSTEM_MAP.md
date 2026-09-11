# DD WORLD MARKETING — MASTER SYSTEM MAP

> Official product operating specification. Preserve existing features; implement missing items against this map.

## 1. Role hierarchy

### Owner
- Full company control and visibility.
- Dashboard, Employees, Teams, Sales, Live GPS, Fraud/Security, Payments, Reports, Company Settings.
- Owns final approval for employee identity, official sales-sheet review, payment control and Dialog communication.

### Team Leader
- Own team only.
- Dashboard, Team, Sales, Attendance, GPS, Payments, Reports.
- Reviews the official weekly sales sheet received from Owner and distributes only own-team data to agents.

### Agent
- Own data only.
- Home, Work, Sales, Performance, Inbox, My Payment, Profile.
- Must complete identity/device/GPS requirements before controlled field operations where required.

### Dialog Officer
- Restricted reporting/liaison portal; not a company-control role.
- Dialog Officer communication is Owner <-> Dialog Officer only.
- Agent/TL do not directly contact Dialog through the app.

## 2. Dialog responsibility directory

| Responsibility | Officer | Access purpose |
|---|---|---|
| Overall / Principal Dialog decisions | Mr. Mohamed Hadil | Overall liaison, decisions and escalations |
| Sayuru | Mr. Malika | Sayuru-related reporting/coordination |
| Govi Mithuru | Pradeepa Rajapaksha | Govi Mithuru-related reporting/coordination |

Owner may update officer names/responsibilities without changing historical messages.

## 3. Digital Employee ID page

The ID page is the employee's official digital identity surface, separate from the login screen.

### Agent/TL view
- Official DD WORLD employee identity.
- Employee ID / Agent Code.
- Full name and role.
- Team / Team Leader.
- Employment status.
- Verification status.
- Formal employee photo.
- KYC/document verification status.
- QR verification surface.
- Owner approval state.
- Clear `VERIFIED & ACTIVE`, `PENDING`, `REJECTED` or `NEW PHOTO REQUESTED` state.

### Owner view
- Employee ID verification and approval hub.
- Review photo and submitted verification documents.
- Approve / reject / request new photo.
- View employment and team assignment information.
- Never use placeholder/fake identity information as official employee data.

### ID security rules
- Employee identity is never created from guessed/default personal data.
- Sensitive ID/NIC information is role-restricted.
- Agent sees own identity; TL sees permitted team identity data; Owner has full verification control.
- QR verification must identify the employee record without exposing unnecessary private information.

## 4. Location Live Map

### Owner Live Map
The Owner's Live GPS Map is the central field-work monitoring surface.

Each worker marker should show:
- Employee name / code.
- Role and team.
- Work status: `ACTIVE`, `CHECKED OUT`, `OFFLINE`, or `LAST KNOWN`.
- Last GPS time.
- Latitude/longitude when permitted.
- GPS accuracy.
- Device / tracking health status.
- Fraud/mock-location warning when detected.

### Team Leader Live Map
- Shows only the TL's own team.
- Same operational status information, subject to privacy rules.

### Agent
- Sees own GPS/tracking status and evidence; does not receive other employees' live locations.

### Tracking lifecycle
`LOGIN -> Identity Verification -> Device Verification -> GPS Validation -> START WORK -> BACKGROUND TRACKING -> CHECK-OUT -> TRACKING STOP`

### GPS rules
- GPS must be valid before check-in/check-out.
- Do not use fake/default Colombo coordinates.
- Mock/fake GPS, impossible travel, invalid coordinates, GPS-less sales and suspicious patterns go to Fraud/Security review.
- Offline locations are queued locally and synced when connectivity returns.
- Background tracking continues during active work where native Android permissions/services allow it, including other apps and screen lock.
- Owner receives scheduled GPS reporting during active work; target reporting interval is every 2 hours.
- If the phone is completely powered off, the app cannot track it; the last known location must be labelled clearly.

## 5. Weekly Sales Sheet — separate from payment

The weekly sheet is an official sales-data document sent by the Dialog Officer.

Workflow:
`DIALOG OFFICER -> OWNER -> OWNER OK -> TEAM LEADER -> TL OK -> AGENT`

It contains sales information only.

It must NOT contain:
- Payment amounts.
- EZ Cash.
- Agent/TL payment calculations.
- September 400-sale payment rule.

### Issue workflow
`RECEIVED -> UNDER REVIEW -> OK / ISSUE REPORTED -> CORRECTION REQUIRED -> UPDATED -> OK`

At each stage, provide `REPORT ISSUE / INFORM` so incorrect sales information can be escalated through the controlled chain.

## 6. Monthly payment source of truth

Payments are a separate workflow from the weekly sales sheet.

The official source is the Dialog Quality Checked Monthly Final Report.

Sayuru and Govi Mithuru calculations remain completely separate.

EZ Cash is only a payment-destination number field; no EZ Cash wallet/balance/transaction module is required.

## 7. Professional operating principle

DD WORLD MARKETING is a field-sales operating system, not merely a sales-entry app.

Priority:
1. Sales Quality
2. Active Customer Usage
3. Dialog Revenue Value
4. Field Discipline
5. Verified Sales
6. Attendance + GPS Discipline
7. Anti-Fraud
8. Performance Score
9. Promotion / Career Qualification
10. Payments

Core business chain:
`Lead/Customer -> Verified Sale -> Activation -> Customer Usage -> Quality -> Revenue -> Performance -> Promotion Eligibility`

## 8. Communication boundary

`Agent -> Team Leader -> Owner -> Dialog Officer`

Direct Agent/TL -> Dialog Officer communication is intentionally blocked. Owner is the controlled company liaison.

## 9. Implementation rule

Do not remove existing working features while adding this specification. Any implementation must preserve role restrictions, payment privacy, GPS security, anti-fraud controls, and the separation of weekly sales reporting from monthly payment finalization.
