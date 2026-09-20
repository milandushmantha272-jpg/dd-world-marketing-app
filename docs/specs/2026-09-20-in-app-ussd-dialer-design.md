# DD World Marketing — In-App USSD Dialer Design

## Goal
Enable the app's custom keypad to send supported USSD requests directly through Android telephony without opening the normal Phone/Dialer application.

## Approach
Use a Capacitor native bridge backed by Android `TelephonyManager.sendUssdRequest()` on Android API 26+. Keep the existing web fallback only for browser testing. The native bridge will validate supported strings, request `CALL_PHONE` permission when required, select the active/default subscription where supported, and return structured success/failure statuses to the React UI.

## Scope
- Replace `ACTION_CALL`/`ACTION_DIAL` flow for USSD with `sendUssdRequest()`.
- Preserve the custom in-app keypad and its current UI entry points.
- Provide clear states for sending, response received, unsupported device/API, permission denied, network/carrier failure, and timeout.
- Keep Login Test Mode unchanged for now.
- Avoid unrelated refactoring.

## Native interface
`dialUssd({ code: string }) -> { status: string; message: string; response?: string }`

The bridge will normalize only transport-specific encoding and will not silently alter user-entered keypad digits. Supported USSD strings are checked before dispatch. The Android implementation will use `TelephonyManager.sendUssdRequest()` when available and return a clear unsupported status on older Android versions or devices without telephony capability.

## UI behavior
- Disable the submit/dial action while a request is pending.
- Show a progress state while Android is processing the request.
- Show the returned USSD response in the app when available.
- Show actionable Sinhala/English error text for permission, unsupported API/device, carrier rejection, and timeout failures.
- Never intentionally launch the external dialer for native USSD requests.

## Testing and verification
- TypeScript compile/lint/build checks.
- Android compilation check.
- Static review of permission declarations and Capacitor plugin registration.
- Test cases for valid codes, invalid codes, web fallback, Android API below 26, permission denial, successful callback, and failure callback.
- APK installation and manual keypad verification are required before claiming completion.

## Known limitation
Android and mobile carriers may restrict USSD requests. The app can report these failures but cannot guarantee carrier support on every SIM/device.
