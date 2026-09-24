# DD WORLD Marketing — Update, Push Notification & Persistent Login Design

Date: 2026-09-24

## Goal

Add three connected capabilities to the existing Capacitor Android app without replacing its existing Supabase architecture:

1. A permanent app-update entry point with in-app update notifications.
2. Owner/Admin-to-agent Android push notifications that work while the app is backgrounded or closed.
3. Persistent login so a successful login remains active across app navigation, relaunches, and device restarts until the user explicitly logs out or the authenticated session becomes invalid.

## Current project context

- Supabase is already integrated through `src/services/supabase.ts`.
- Supabase Auth is configured with `persistSession: true` and `autoRefreshToken: true`.
- `AuthContext` restores the Supabase session with `getSession()` and rebuilds the employee profile.
- The app already has a Supabase-backed `notifications` table UI and Realtime INSERT subscription in `NotificationCenter.tsx`.
- Firebase is already present in `package.json` and `src/services/firebase.ts`, but the current Firebase service is focused on Auth/Firestore; FCM registration/delivery is not yet established in the inspected code.
- The app already requests browser notification permission and can show in-app/web notifications, but this is not sufficient for a closed Android app.
- The existing local `ddworld_current_user_v2` value is a UI convenience/cache, not the authentication authority.
- The existing local app-version banner is only a local version-change notice; it does not check a remote release.

## Architecture

### A. App update notification

Use a single permanent download/update URL that resolves to the latest approved Android release. GitHub Releases will be the release source.

The app will periodically/at startup fetch a small version manifest or release metadata containing:
- latest version code/name
- release notes summary
- download URL
- minimum supported version

If the installed version is older, show an update banner/dialog. The user can open the permanent release URL and install the newer APK.

The update checker must fail silently when offline and must not block login or normal app use.

Every production APK release will increment the Android version code/version name and publish the APK through the same permanent release route.

### B. Owner/Admin -> agent push notifications

Keep Supabase as the notification data source and authorization layer.

Flow:
1. Owner selects one agent or all eligible agents and creates a notification.
2. A Supabase notification row is written for each recipient (or via a controlled server-side fan-out).
3. Supabase Realtime updates the open app immediately.
4. The Android client registers an FCM device token for the authenticated employee and associates it with that employee profile.
5. A trusted server/Edge Function sends the FCM push to active device tokens.
6. Android displays the notification when the app is backgrounded/closed.
7. Opening the notification routes into the relevant app page when a page target exists.
8. Invalid/unregistered FCM tokens are removed or disabled.

Security:
- Agents cannot send arbitrary push notifications to other agents.
- Only the Owner/Admin-authorized flow can create broadcast/direct notification records.
- FCM server credentials and Supabase service-role secrets never ship in the APK.

### C. Persistent one-time login

Supabase Auth remains the source of truth.

On successful login:
- Supabase persists the authenticated session.
- App stores only the non-sensitive profile cache needed for fast UI restoration.
- On app launch, `getSession()` restores the session and `AuthContext` reloads the authorized employee profile.
- Returning from another app, minimizing, or restarting the phone does not force a new login while the Supabase session remains valid.
- Logout explicitly clears the app session and local profile cache.
- If the session expires/revokes or the employee is no longer ACTIVE/APPROVED, the app clears the local session and returns to login.
- Passwords are never stored locally.

## Android push implementation details

Add the native Capacitor Firebase Messaging path required for Android FCM, including notification channels and token refresh handling.

On authenticated startup:
- request notification permission where Android requires it;
- obtain/register the FCM token;
- upsert the token against the authenticated employee;
- listen for token refresh and replace the old token.

On logout:
- stop associating the current device token with the previous employee;
- clear/disable the device-token association.

On notification tap:
- launch/open the app;
- restore the session;
- navigate to the notification's optional page/deep-link target.

The implementation must distinguish foreground Realtime/in-app notifications from background/closed-app FCM notifications so users do not receive duplicate alerts unnecessarily.

## Update flow details

The permanent link must not depend on a changing APK filename.

Recommended release convention:
- GitHub Release tag such as `v1.0.1`, `v1.0.2`, etc.
- permanent `latest` release/download route;
- APK attached to the latest release using a stable asset filename;
- app update checker reads the release/version manifest.

The app should show:
- current version;
- latest version;
- concise release note;
- Update button;
- Later button when the update is not mandatory.

A minimum-version field can force an update for security/compatibility releases.

## Data model

Use a dedicated device-token table/structure associated with the employee profile, for example:

`push_device_tokens`
- `id`
- `user_id`
- `fcm_token`
- `platform` (`android`)
- `app_version`
- `enabled`
- `last_seen_at`
- `created_at`
- `updated_at`

Existing `notifications` remains the user-facing notification record source. Existing read/unread behavior is preserved.

If the repository's current Supabase schema already has an equivalent device-token structure, reuse it rather than creating a duplicate.

## Error handling

- No network: continue to the normal logged-in app if a valid session is available.
- FCM permission denied: keep in-app/Supabase Realtime notifications working and show a clear notification-permission status.
- FCM registration failure: retry on next authenticated startup/token refresh without blocking the app.
- Update metadata unavailable: do not show a false update notice.
- Expired session: clear local session and require login.
- Notification send failure for one device: do not fail the whole broadcast; mark that token as failed/disabled when appropriate.

## Testing and acceptance criteria

### Login
- Login once.
- Navigate to another app and return.
- Close and reopen DD WORLD Marketing.
- Restart the phone and reopen the app.
- The user remains logged in while the Supabase session is valid.
- Explicit Logout always returns to the login screen.

### Push notifications
- Owner sends to one agent: only that agent receives it.
- Owner sends to all eligible agents: all eligible registered devices receive it.
- App foreground: notification appears in-app without duplicate system alerts.
- App background/closed: Android system notification appears.
- Tapping notification opens the app and routes to its target page when supplied.

### Updates
- Permanent link remains unchanged between releases.
- Older app detects a newer release.
- Update notification is displayed.
- Update action opens the latest release APK.
- Offline mode does not block normal app use.

### Safety
- No service-role key or FCM server credential is bundled into the Android APK.
- RBAC prevents agents from using owner notification controls.
- No password is persisted locally.

## Scope boundaries

This design does not replace the existing authentication system, sales/USSD flow, call routing, or existing notification center. It extends the current Supabase Auth/Realtime architecture and adds the missing Android FCM delivery and remote release/version checks.

