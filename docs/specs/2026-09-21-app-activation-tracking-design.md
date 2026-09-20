# DD WORLD APP Activation Tracking & Share Design

**Date:** 2026-09-21  
**Status:** Approved by product owner for planning

## Goal

Add separate activation workflows for:

- Sayuru APP Activation
- Govi Mithuru APP Activation

The workflow must record the responsible agent, customer mobile number, location, date/time, shared official Play Store URL, and activation progress while protecting customer information.

## User Flow

1. Agent opens the relevant product activation page.
2. Agent enters the customer mobile number.
3. The app loads the signed-in agent identity and Agent Code automatically.
4. The app requests GPS permission and captures latitude, longitude, accuracy, date, and time when available.
5. The app creates a sale record with `channel: APP`, `activationMethod: APP_LINK_SHARE`, and initial status `PENDING`.
6. The app creates a product-specific tracking URL containing a non-sensitive tracking token. Agent Code and customer phone number must not be exposed in a public URL.
7. Agent shares the tracking URL through the Android share sheet, SMS composer, WhatsApp, or another available share target. No silent SMS should be sent.
8. The tracking page explains the next steps and provides the official Play Store destination.
9. Customer installs/opens the official app and completes the activation outside DD WORLD.
10. Agent may record a customer confirmation, but this must not automatically mark the sale as Dialog-verified.
11. The sale remains `PENDING` or changes to `CUSTOMER_CONFIRMED` until an authorized Dialog report/API reconciliation confirms it.

## Status Model

- `PENDING`: link shared or activation started; no authoritative confirmation.
- `CUSTOMER_CONFIRMED`: agent recorded that the customer reports completion; still not authoritative.
- `COMPLETED`: confirmed through an approved Dialog report/API reconciliation process.
- `REJECTED`: invalid, cancelled, or rejected after review.
- `DUPLICATE`: blocked or merged because an existing matching activation was found.

## Data and Privacy

Store, subject to the existing schema and access controls:

- agent ID, Agent Code, and agent name
- product and channel
- customer mobile number with restricted visibility
- tracking token/reference
- latitude, longitude, accuracy, and human-readable location when available
- created date/time and confirmation date/time
- status, verification status, and audit notes
- share channel and official Play Store URL identifier

Team Leaders must not receive unrestricted customer phone numbers. Public tracking URLs must contain only an opaque, expiring token and product context. Customer data should be masked in non-owner views and excluded from aggregate reports.

## Fraud and Duplicate Controls

- Use the authenticated agent identity; do not trust a client-supplied Agent Code.
- Reject or flag repeated pending activations for the same customer/product within a configurable time window.
- Preserve immutable creation time and agent identity in the record.
- Record GPS accuracy and show a warning when permission is denied or accuracy is poor; GPS is evidence, not proof of activation.
- Keep agent/customer confirmation separate from Dialog verification.
- Restrict status changes to authorized roles and preserve verification notes.
- Do not count `PENDING` or `CUSTOMER_CONFIRMED` as officially completed in Dialog reconciliation totals.

## UI Structure

Create a reusable activation page component configured by product:

- product title and icon
- customer mobile input with validation
- Agent Code display (read-only)
- GPS capture state
- date/time preview
- Create Tracking Link action
- Copy Link action
- Share Link action
- pending activation result card
- customer confirmation action
- recent activation records for the permitted scope

Expose two routes/navigation entries that use the shared component:

- `Sayuru APP Activation`
- `Govi Mithuru APP Activation`

## Official URLs

- Sayuru: `https://play.google.com/store/apps/details?hl=en-GB&id=lk.dialog.sayuruapp`
- Govi Mithuru: `https://play.google.com/store/apps/details?hl=en_GB&id=com.arimaclanka.android.govimithuru`

The implementation should keep these URLs in one configuration module so they can be updated without duplicating constants.

## Technical Notes

- Reuse existing `DataContext`, `ProductSale`, authentication, navigation, and reporting patterns.
- Prefer a reusable `AppActivationPage` over duplicated product-specific implementations.
- Use browser Web Share where available and a visible Android share/SMS fallback where supported.
- Avoid assuming that Play Store installation or activation can be verified by the DD WORLD app alone.
- Add validation and duplicate checks before creating a record.
- Add role-aware rendering and mask sensitive values in list views.

## Acceptance Criteria

- Both product pages are reachable from the app navigation.
- Agent Code is derived from the authenticated user and saved with every created record.
- Customer number validation prevents malformed entries.
- GPS/date/time capture is attempted and failure is visible without blocking all use.
- A non-sensitive tracking link can be copied/shared.
- New records start as `PENDING` and appear in the permitted activation list.
- Customer confirmation cannot directly set `COMPLETED`.
- Duplicate activations are flagged or blocked according to the configured rule.
- Team Leader views mask customer phone numbers.
- The existing build and security checks pass in GitHub Actions.
