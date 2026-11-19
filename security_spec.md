# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **User Profile Ownership & PII Isolation (`/users/{uid}`)**: A user can only read, create, or update their own profile document (`uid == request.auth.uid`), with `email_verified == true`. No blanket `list` is allowed.
2. **Worker Ownership (`/workers/{workerId}`)**: Every worker record has an immutable `ownerId` matching `request.auth.uid`. Queries (`list`) and single reads (`get`) are restricted to `existing().ownerId == request.auth.uid`.
3. **WorkLog Relational Integrity (`/workLogs/{logId}`)**: A daily work log cannot exist without a valid `workerId` belonging to a `/workers/{workerId}` document owned by `request.auth.uid` (verified via `get()` on create). `ownerId` and `workerId` and `createdAt` are immutable on update.
4. **Monthly Adjustment Integrity (`/monthlyAdjustments/{adjustmentId}`)**: Belongs strictly to `ownerId == request.auth.uid` and references an existing `/workers/{workerId}` owned by the same user.
5. **Read-Only QR Shared Report (`/sharedReports/{shareToken}`)**: Only the owning contractor (`ownerId == request.auth.uid`) can `create`, `update`, `delete`, or `list` shared reports. Public `get` is permitted ONLY by exact unguessable `shareToken` (`shareToken.size() >= 20`) and NEVER includes personal email/phone PII of workers. `attendanceLogs` list is strictly bounded (`size() <= 45`) and type-checked.
6. **Temporal Integrity**: `createdAt == request.time` on create and remains immutable on update; `updatedAt == request.time` on create and update.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return `PERMISSION_DENIED`)
1. **Identity Spoofing on Worker Create**: Authenticated user `uidA` sends `{ ownerId: "uidB", employeeId: "JK-001", ... }` to `/workers/w1`.
2. **Shadow / Ghost Field Injection**: User `uidA` sends `{ ...validWorker, isAdmin: true, verified: true }` to `/workers/w1`.
3. **Unverified Email Write**: User with `request.auth.token.email_verified == false` attempts to create a `/workers/w1` or `/workLogs/l1`.
4. **Orphaned WorkLog Injection**: User `uidA` sends a `WorkLog` referencing `workerId: "non_existent_worker"` or a `workerId` owned by `uidB`.
5. **Cross-Tenant List Scraping**: User `uidA` executes `collection('workLogs')` query without `where('ownerId', '==', uidA)` or with `where('ownerId', '==', uidB)`.
6. **PII Blanket Read**: User `uidB` attempts `getDoc('/users/uidA')`.
7. **ID Poisoning**: User `uidA` attempts to write to `/workers/` with a 300-character ID or invalid characters `../admin`.
8. **Immutable Field Tampering**: User `uidA` attempts `updateDoc('/workLogs/l1', { ownerId: 'uidB', createdAt: ... })`.
9. **Client Timestamp Forgery**: User `uidA` sends `createdAt: new Date('2020-01-01')` instead of `serverTimestamp()`.
10. **Negative Financial / Wage Poisoning**: User `uidA` sends `dailyRate: -5000` or `pCash: -100` or `dayUnits: 99`.
11. **Unbounded Array / DoW Attack on SharedReport**: User `uidA` sends `attendanceLogs` with 500 elements or `notes` with a 50KB string.
12. **Unauthorized Public Edit or List on SharedReport**: Unauthenticated worker or `uidB` attempts `updateDoc('/sharedReports/<validToken>', { netSalaryPayable: 999999 })` or `getDocs(collection(db, 'sharedReports'))`.
