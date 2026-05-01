# EV Saarthi Database Changes (Tasks 1-6)

This document tracks the specific changes made to the Firebase Cloud Firestore database structure and logic as a result of implementing the recent platform enhancements (Tasks 1-6).

## 1. `tenants` Collection
The `tenants` collection stores information about the companies or organizations that own and operate charging stations on the platform.

### New Fields Added
*   **`contactPhone`** (`String`): Added to store the direct contact phone number for the tenant.
    *   *Why:* To allow superadmins and support teams to easily contact the station owners/tenants via phone, replacing the sole reliance on email.
*   **`greenPointsEnabled`** (`Boolean`): A toggle flag (defaults to `true`). 
    *   *Why:* To give the superadmin control over whether a specific tenant is allowed to participate in the Green Points ecosystem. If set to `false`, users charging at this tenant's stations will not earn points.

### Fields Removed / Logic Changed
*   **`adminPassword`** (Logic removal): 
    *   *Why:* Previously, when creating a tenant, a password was required to automatically generate a Firebase Auth user for the tenant admin. This has been removed to decouple tenant creation from user account creation, improving security and workflow. Admin accounts can be managed separately in the Team management section.

## 2. Interaction with `points-service`
While the database schema for the points ledger hasn't changed, the **logic** interacting with the database has been updated:
*   The `points-service` now performs a lookup on the `tenants` collection whenever a request to award points is received. 
*   It checks the `greenPointsEnabled` flag for the tenant associated with the charging session. If `greenPointsEnabled === false`, the service safely skips awarding points and logs the skipped action, preventing unauthorized point distribution.

## Summary of Collections Remaining Unchanged
No schema modifications were required for the following collections during these tasks:
*   `users`
*   `stations`
*   `bookings`
*   `adminUsers`
*   `pointsLedger`
*   `pointsConfig`
*   `accessories`

## Next Steps
No further database schema changes are strictly required for the remaining tasks (like "Load More" pagination, which is purely a frontend and API query update).
