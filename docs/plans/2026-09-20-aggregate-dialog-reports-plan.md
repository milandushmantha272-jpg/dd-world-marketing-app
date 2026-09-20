# Aggregate Dialog Report Reconciliation Plan

## Approved requirements

- Dialog sends two separate summary reports: one for **ගොවිමිතුරු** and one for **සයුරු**.
- Reports contain agent names and aggregate subscriber counts only.
- Customer mobile numbers, customer names, OTPs, and other personal details must not be exposed to agents.
- App-originated sales are counted immediately as **App Original Sales**.
- Dialog report totals are shown separately as **Dialog Report Sales**.
- Reconciliation compares aggregate counts by agent, product, report period, and optional channel when the report provides it.
- The system must not add App and Dialog totals together as if they were two independent sales sets.
- When only aggregate data is available, the system reports `MATCHED`, `APP_MORE`, `DIALOG_MORE`, or `NO_DIALOG_DATA`; it does not claim customer-level duplicate identification.

## Implementation boundary

The first reconciliation service is intentionally privacy-safe and works without customer-level data. A later UI task will connect it to the manager report screen and add permission-aware visibility for owner/manager versus agents.
