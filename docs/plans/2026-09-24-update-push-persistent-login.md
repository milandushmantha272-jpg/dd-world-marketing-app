# Update, Push Notification & Persistent Login Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permanent-release update detection, real Android FCM push notifications, and durable Supabase-authenticated login.

**Architecture:** Keep Supabase Auth as authority and the existing `notifications` table/Realtime channel for foreground notifications. Add native FCM token registration plus a trusted server send path for background/closed-app delivery. Add remote release/version metadata for update notices.

**Tech Stack:** React 19, TypeScript, Vite/PWA, Capacitor Android 8, Kotlin/Gradle, Supabase Auth/Realtime/Edge Functions, Firebase Cloud Messaging.

## Global Constraints
- Preserve existing Govimithuru/Sayuru telephony and IVR/USSD behavior.
- Keep Supabase Auth `persistSession: true` and `autoRefreshToken: true`.
- Never store passwords locally.
- Never ship FCM server credentials or Supabase service-role keys in the APK.
- Preserve existing notification read/unread behavior.
- Closed/background Android push must use FCM.
- Owner/Admin authorization is required for sending.
- Update checks never block startup/login.
- No physical Android device is available here; distinguish build verification from device/FCM verification.

---

### Task 1: Permanent update metadata and notification

**Files**
- Modify: `package.json`, `android/app/build.gradle`, existing global app-shell/update UI.
- Create: `src/services/appUpdate.ts`, `src/components/common/AppUpdateNotice.tsx`, stable version metadata.
- Test: `src/services/appUpdate.test.ts`.

**Interfaces**
- `getInstalledAppVersion(): { name: string; code: number }`
- `checkForAppUpdate(): Promise<{ available: boolean; latestVersion: string; latestCode: number; downloadUrl: string; releaseNotes?: string; mandatory?: boolean } | null>`

- [ ] Add failing tests for older/equal versions, mandatory minimum version, malformed metadata, and offline failure.
- [ ] Run the focused test; it must fail before implementation.
- [ ] Implement numeric version-code comparison, short timeout, silent offline failure, release notes, mandatory minimum, and one stable latest-release URL. Do not block auth.
- [ ] Run `npm run lint` and focused tests; expect pass.
- [ ] Run `npm run build`; expect production build pass.
- [ ] Commit: `feat: add permanent app update checks`.

### Task 2: Android FCM device registration

**Files**
- Modify: `package.json`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, actual Capacitor MainActivity path.
- Create/modify: `src/services/pushNotifications.ts`.
- Modify: `src/context/AuthContext.tsx`, `src/utils/audioNotification.ts`.
- Test: `src/services/pushNotifications.test.ts`.

**Interfaces**
- `registerPushDevice(userId: string): Promise<void>`
- `unregisterPushDevice(userId: string): Promise<void>`
- `handlePushTokenRefresh(token: string, userId: string): Promise<void>`
- `handlePushNotificationOpen(data: Record<string,string>): void`

- [ ] Add failing tests for token upsert, token refresh, logout cleanup, deep-link dispatch, and permission denial.
- [ ] Run focused tests; expect missing push service behavior.
- [ ] Add Capacitor-compatible FCM path, Android notification permission/channel, token registration/refresh, and notification-tap handling. Registration must not delay successful login.
- [ ] Run `npm run lint`; expect pass.
- [ ] Run `npm run build && cd android && ./gradlew test`; expect pass.
- [ ] Commit: `feat: register Android push notifications`.

### Task 3: Secure Owner/Admin push sending and Supabase device-token storage

**Files**
- Create: Supabase migration for `push_device_tokens` if no equivalent exists.
- Create/modify: Supabase Edge Function for trusted FCM send.
- Modify: `src/components/common/NotificationCenter.tsx` and the existing owner messaging surface (observed: `src/components/common/OwnerDialogOfficerMessenger.tsx`).
- Test: server/service authorization and fan-out tests.

**Interfaces**
- Send input: `{ recipientUserIds: string[]; title: string; body: string; type: string; page?: string }`
- Send output: `{ created: number; pushed: number; failed: number }`
- Device token fields: `id, user_id, fcm_token, platform, app_version, enabled, last_seen_at, created_at, updated_at`.

- [ ] Add failing tests for owner authorization, direct/broadcast recipients, per-token failure isolation, invalid-token disabling, and payload preservation.
- [ ] Run focused tests; expect missing secure send path.
- [ ] Reuse existing `notifications`; add device-token table only if absent. Enforce RLS. Server function validates authenticated Owner/Admin role, creates notification rows, sends FCM with server-only credentials, and returns aggregate counts.
- [ ] Keep Supabase Realtime for foreground; prevent duplicate foreground system notifications.
- [ ] Add owner recipient/title/body/page controls.
- [ ] Run `npm run lint` and `npm run build`; expect pass.
- [ ] Commit: `feat: add owner agent push notification delivery`.

### Task 4: Harden persistent login and integration verification

**Files**
- Modify: `src/context/AuthContext.tsx`, `src/services/supabase.ts` only if required, push lifecycle files if required.
- Test: `src/context/AuthContext.test.tsx` and existing Android/native tests.

**Interfaces**
- Preserve existing `AuthContext`: `currentUser, authError, retryAuth, login, loginAsUser, loginWithoutCredentials, logout`.
- Restore through Supabase `auth.getSession()` and `getAuthenticatedEmployeeProfile(authUser.id)`.

- [ ] Add failing tests for valid persisted session restoration, no-session login screen, explicit logout, revoked session, blocked/inactive profile, and app-switch return.
- [ ] Run focused tests; expect failures where persistence lifecycle is incomplete.
- [ ] Keep Supabase session authoritative; local `ddworld_current_user_v2` is cache only. Explicit logout clears cache, signs out, and disables device association. Keep test-mode login isolated from production authentication.
- [ ] Run `npm run lint` and focused auth tests; expect pass.
- [ ] Run `npm run build && cd android && ./gradlew test`; expect pass.
- [ ] Commit: `fix: harden persistent login and push lifecycle`.

## End-to-end verification

Run `npm run lint`, `npm run build`, and `cd android && ./gradlew test`. Build a release APK and verify its versionCode/versionName increases. Verify the stable latest-release URL. On a real Android device, verify login persistence across app switching/restart, direct and broadcast push while closed, notification tap routing, and update detection. This environment cannot verify real FCM delivery without a physical device.

## Unresolved externally observable decisions

1. Whether Team Leader/Junior Team Leader counts as Admin for push sending; do not silently grant that permission.
2. Whether the permanent public URL should be the GitHub latest-release route or a custom domain.
3. Native Firebase/FCM credentials: repository has Firebase web configuration, but a native `google-services.json`/server credential was not found in the inspected paths and must be provisioned/confirmed before closed-app push can be verified.
