# APP Activation Tracking Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, product-specific Sayuru and Govi Mithuru APP activation workflows that create pending sales records, capture evidence, and share non-sensitive tracking links.

**Architecture:** Implement one reusable `AppActivationPage` configured by a product definition, with a central configuration module for official Play Store URLs. Reuse the existing `AuthContext`, `DataContext`, `ProductSale`, navigation event, Supabase sales table, and role-aware reporting conventions. The public tracking URL will carry only an opaque token and product context; it will not expose Agent Code or customer phone data.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Supabase, Capacitor Android, existing GitHub Actions build workflow.

## Global Constraints

- Agent identity and Agent Code must come from the authenticated user, never from an editable client field.
- New APP activation records start as `PENDING`.
- Customer confirmation must not set `COMPLETED`; authoritative completion requires an approved Dialog report/API reconciliation.
- Customer phone numbers are sensitive: mask them for Team Leaders and exclude them from aggregate reports.
- Public tracking URLs contain only a non-sensitive opaque token and product context.
- GPS capture is attempted but must not block all use when permission is denied or unavailable; the UI must show the capture state.
- Sharing must be user-visible; no silent SMS is permitted.
- The existing IVR workflow and existing report behavior must remain functional.

---

### Task 1: Establish shared product configuration and activation data contract

**Files:**
- Create: `src/config/appActivationProducts.ts`
- Modify: `src/types.ts`
- Modify: `src/context/DataContext.tsx` if a dedicated create/update method is required by existing patterns
- Test: `src/services/__tests__/appActivationProducts.test.ts` (or the repository's established test location if present)

**Interfaces:**
- Consumes: authenticated `User`, existing `ProductSale`, Supabase `sales` mapping conventions.
- Produces: `AppActivationProduct`, `APP_ACTIVATION_PRODUCTS`, and a typed activation-input/result contract used by the UI task.

- [ ] **Step 1: Add the focused failing test**

Assert that the configuration exposes exactly two product definitions, each with a stable product key, display name, official Play Store URL, and `channel: 'APP'` / `activationMethod: 'APP_LINK_SHARE'` defaults. Assert that URLs do not contain an agent code or customer phone number.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm run lint` after adding the test/type references.
Expected: TypeScript reports the missing configuration exports or contract until the implementation is added.

- [ ] **Step 3: Implement the minimum behavior**

Create one central configuration module containing the verified Sayuru and Govi Mithuru URLs. Extend only the existing types needed for a tracking token/reference, GPS accuracy, and activation confirmation metadata; preserve compatibility with existing rows and optional fields. Add a DataContext method only if the existing context does not already expose a safe sales insert/update path. The method must map camelCase fields to the current Supabase snake_case columns and refresh core data after mutation.

- [ ] **Step 4: Verify the focused pass**

Run: `npm run lint`
Expected: TypeScript completes without errors related to the new configuration or data contract.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run build`
Expected: Vite and server bundle complete successfully with the existing project structure.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/config/appActivationProducts.ts src/types.ts src/context/DataContext.tsx src/services/__tests__/appActivationProducts.test.ts
git commit -m "feat: add app activation product contract"
```

---

### Task 2: Build the reusable activation page and tracking/share workflow

**Files:**
- Create: `src/components/common/AppActivationPage.tsx`
- Create: `src/services/appActivationTracking.ts`
- Modify: `src/context/DataContext.tsx` if required by Task 1
- Test: `src/services/__tests__/appActivationTracking.test.ts`

**Interfaces:**
- Consumes: `AppActivationProduct`, authenticated `User`, `DataContext` sales mutation, browser geolocation and Web Share APIs.
- Produces: `createActivationTrackingToken(input)`, `buildPublicTrackingUrl(token, productKey)`, and the reusable page component configured with a product definition.

- [ ] **Step 1: Add the focused failing test**

Test valid and invalid Sri Lankan mobile input behavior without inventing additional business rules; test that the generated public URL contains only an opaque token and product key; test that the sale payload has authenticated agent fields, APP channel, APP_LINK_SHARE method, timestamp, and PENDING status; test that GPS denial results in a visible non-blocking state; test that duplicate matching pending records are flagged before insertion.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm run lint`
Expected: TypeScript or test references fail because the tracking service and component contracts do not yet exist.

- [ ] **Step 3: Implement the minimum behavior**

Implement a shared page with: customer mobile input, read-only Agent Code, GPS capture state, date/time preview, Create Tracking Link, Copy Link, Share Link, pending result card, customer confirmation action, and role-scoped recent records. Generate a cryptographically random or sufficiently unpredictable opaque token using a browser-safe mechanism. Save the activation record only after validation and duplicate checking. Use `navigator.share` when available, then a visible clipboard/SMS/Android share fallback; do not send messages silently. Keep customer confirmation as a separate status such as `CUSTOMER_CONFIRMED`, never `COMPLETED`.

- [ ] **Step 4: Verify the focused pass**

Run: `npm run lint`
Expected: The page and service compile with no implicit-any, missing import, or incompatible `ProductSale` errors.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run build`
Expected: The web build and server bundle complete successfully.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/components/common/AppActivationPage.tsx src/services/appActivationTracking.ts src/services/__tests__/appActivationTracking.test.ts src/context/DataContext.tsx
 git commit -m "feat: add app activation tracking and sharing"
```

---

### Task 3: Add product routes, navigation entries, and tracking destination behavior

**Files:**
- Create: `src/components/common/AppActivationTrackingPage.tsx` if a dedicated public destination is needed by the existing routing model
- Modify: `src/App.tsx`
- Modify: `src/components/common/MainNavigation.tsx` and/or the existing navigation component that owns activation entries
- Modify: `src/components/common/HomePage.tsx` only if product cards are required there
- Test: existing lint/build checks plus focused navigation assertions where the repository supports them

**Interfaces:**
- Consumes: reusable `AppActivationPage`, `APP_ACTIVATION_PRODUCTS`, existing `ddworld:navigate` event convention.
- Produces: navigation targets `Sayuru APP Activation` and `Govi Mithuru APP Activation`, plus a public tracking destination that resolves the token/product context without exposing private data.

- [ ] **Step 1: Add the focused failing test**

Verify that both navigation labels resolve to the shared component with the correct product configuration, and that an invalid/missing tracking token displays a safe invalid-link state instead of customer data.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm run lint`
Expected: Navigation references fail until the route mappings and components are added.

- [ ] **Step 3: Implement the minimum behavior**

Add both product navigation mappings to `App.tsx` and the appropriate menu/cards. Keep the existing Sales Activation hub and IVR Active page available. Add tracking-page handling using an opaque token; if the current architecture cannot resolve tokens server-side, display the product-specific next-step page and retain the token for the authorized app workflow rather than pretending to verify installation. Ensure no public view renders Agent Code, customer phone number, or private sales rows.

- [ ] **Step 4: Verify the focused pass**

Run: `npm run lint`
Expected: Both product routes compile and all navigation imports resolve.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run build`
Expected: The production bundle includes both activation routes and the existing pages.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/App.tsx src/components/common/MainNavigation.tsx src/components/common/HomePage.tsx src/components/common/AppActivationTrackingPage.tsx
git commit -m "feat: add Sayuru and Govi Mithuru activation routes"
```

---

### Task 4: Apply privacy, duplicate, confirmation, and verification controls

**Files:**
- Modify: `src/components/owner/IvrAndAppActivationsHub.tsx`
- Modify: `src/services/reportReconciliation.ts` if APP status filtering needs explicit enforcement
- Modify: `src/types.ts` or `src/context/DataContext.tsx` for authorized confirmation/status mutation
- Test: `src/services/__tests__/appActivationControls.test.ts`

**Interfaces:**
- Consumes: activation records, authenticated role, existing report reconciliation entries.
- Produces: role-aware masking, controlled confirmation/status transitions, and exclusion of non-authoritative APP statuses from Dialog-completed totals.

- [ ] **Step 1: Add the focused failing test**

Assert that Team Leader views mask customer phone numbers; PENDING and CUSTOMER_CONFIRMED rows are not counted as completed; an unauthorized role cannot mark a record COMPLETED; duplicate candidates are shown as flagged or blocked; and owner-authorized reconciliation can transition a record to COMPLETED with verification metadata.

- [ ] **Step 2: Verify the relevant failure**

Run: `npm run lint`
Expected: The new status and privacy assertions fail until the controls are wired into the existing hub and reconciliation path.

- [ ] **Step 3: Implement the minimum behavior**

Add masking at render time for non-owner roles, keep customer numbers out of aggregate report output, enforce allowed status transitions, and preserve verification notes/audit fields. Use a configurable duplicate-check window with a documented default only if the current schema supports it; otherwise flag exact matching pending records without silently deleting or merging data. Ensure customer confirmation cannot call the authoritative completion path.

- [ ] **Step 4: Verify the focused pass**

Run: `npm run lint`
Expected: Privacy and status-control code compiles without breaking existing report types.

- [ ] **Step 5: Run the affected integration check**

Run: `npm run build`
Expected: Existing IVR/App reporting and the new APP activation controls compile together.

- [ ] **Step 6: Commit the passing deliverable**

```bash
git add src/components/owner/IvrAndAppActivationsHub.tsx src/services/reportReconciliation.ts src/types.ts src/context/DataContext.tsx src/services/__tests__/appActivationControls.test.ts
git commit -m "feat: enforce app activation privacy and status controls"
```

---

## Verification and Release Gate

After all tasks, run the repository's GitHub Actions workflow on `feature/ussd-sales-verification`. Confirm TypeScript lint, Vite/server build, Capacitor sync, Android Gradle build, APK existence, and security guards all pass before describing the feature as complete or sharing an APK artifact.

## Unresolved Product Decisions

1. **Duplicate handling:** Should a matching pending activation be blocked completely or saved as a flagged duplicate for Owner review? Recommendation: flag and block automatic counting, while preserving the attempted event for audit if the schema supports it.
2. **Duplicate window:** What time window should be used for the same customer/product match? Recommendation: start with 24 hours and make it configurable after observing operations.
3. **Tracking URL hosting:** The current web app can display a token-based destination, but server-side token lookup and expiration require a supported database/table or public endpoint. Confirm whether the existing Supabase schema may receive a dedicated tracking-token table before implementing server-side resolution.
