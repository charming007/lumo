# Lumo API

## Run locally
```bash
npm install
npm run start:dev
```

## Production start guardrails
Use the normal start command for staging/production:

```bash
npm run start
```

It now runs a runtime config audit before booting the server and fails fast on unsafe release misconfigurations such as:
- `NODE_ENV=production|staging` without `LUMO_ADMIN_API_KEY`
- `LUMO_DB_MODE=postgres` without `DATABASE_URL`
- `LUMO_CORS_ALLOW_ANY_ORIGIN=true` in production-like environments

Non-blocking warnings still print for softer risks like loopback-only CORS, missing canonical API URL, or file-mode storage in production-like environments.

## Planned env vars
- `PORT`
- `DATABASE_URL`
- `LUMO_DB_MODE` (`file` by default, `postgres` for JSONB snapshot durability on Postgres via the bundled `pg` client)
- `LUMO_DATA_FILE` (override JSON snapshot location)
- `LUMO_ADMIN_API_KEY` (required in production/staging for protected admin/teacher/facilitator endpoints)
- `LUMO_TEACHER_API_KEY` (optional dedicated teacher key)
- `LUMO_FACILITATOR_API_KEY` (optional dedicated facilitator key)

## Protected route auth

Local demo mode still supports header-based role simulation when no API keys are configured.
That is intentionally **not production-safe**.

For production/staging:
- set `LUMO_ADMIN_API_KEY`
- send it as either `x-lumo-api-key: ...` or `Authorization: Bearer ...`
- optionally set dedicated teacher/facilitator keys if you want non-admin operators to call protected routes directly

Behavior:
- if any `LUMO_*_API_KEY` is configured, protected routes require a valid API key
- if `NODE_ENV=production` or `staging` and `LUMO_ADMIN_API_KEY` is missing, protected routes fail closed and `/readyz` reports the deployment as not ready
- admin keys can access teacher/facilitator protected routes; lower-privilege keys cannot access admin routes

## Learner app integration slice

These endpoints are now shaped for the Flutter learner tablet app instead of the LMS/admin UI.

### `GET /api/v1/learner-app/bootstrap`
Returns one payload with:
- `learners`: learner profiles already normalized for the tablet app
- `modules`: published learner modules
- `lessons`: approved/published lesson cards, each with a `lessonPack` summary
- `assignments`: active learner-facing assignment packs with lesson, facilitator, cohort, assessment, and eligible learner metadata
- `assignmentPacks`: alias of `assignments` for the learner app contract
- `registrationContext`: cohorts, mallams, and default targeting for tablet registration flows
- `sync`: last sync cursor + supported semantics
- `meta`: simple counts + generation timestamp

### `GET /api/v1/learner-app/learners`
Returns learner profiles with app-friendly fields such as:
- `cohort`
- `readinessLabel`
- `attendanceBand`
- `supportPlan`
- `learnerCode`
- `lastLessonSummary`

### `POST /api/v1/learner-app/learners`
Accepts either a simple learner payload or the learner-tablet registration shape, for example:

```json
{
  "fullName": "Safiya",
  "age": 9,
  "sex": "Girl",
  "guardian": {
    "name": "Hauwa"
  },
  "placement": {
    "readinessLabel": "Ready for guided practice",
    "baselineLevel": "foundation-a"
  }
}
```

The API currently fills missing pilot defaults from seeded data:
- first cohort
- first pod
- first mallam
- shared-tablet device access

It also preserves richer registration fields when provided by the tablet payload:
- `guardian.phone`
- `guardian.relationship`
- `placement.preferredLanguage`
- `placement.supportPlan`
- `consentCaptured`
- `village`

### `GET /api/v1/learner-app/registration-context`
Returns cohort + mallam targeting metadata for learner registration.

### `POST /api/v1/learner-app/sync`
Accepts single events or `{ "events": [...] }` batches.
Currently supports:
- `learner_registered`
- `lesson_completed`

Sync semantics now include:
- client-event dedupe via `clientId` / `id`
- batch receipts with `receiptId`
- `duplicates` count in the response
- `cursor` in the response for high-watermark tracking
- progress upsert semantics for repeated lesson syncs on the same learner/module

`lesson_completed` events create or update progress snapshots and create observation records when observation notes are included.

## Added backend reporting + reward ops endpoints

### `GET /api/v1/mallams/:id/summary`
Returns a mallam-facing operational summary with:
- roster and assignment summary
- runtime session rollup
- progression rollup
- reward operations summary
- top learners
- recommended next actions

### `GET /api/v1/reports/ngo-summary`
Returns NGO/stakeholder-facing impact rollups across the current scope with:
- learner / center / pod / mallam totals
- attendance and mastery averages
- lessons completed and completed session counts
- reward operations summary
- subject breakdowns
- per-mallam snapshots
- top learners leaderboard

Optional filters:
- `cohortId`
- `podId`
- `mallamId`
- `since`
- `until`

### Reward correction + revocation
- `GET /api/v1/rewards/summary`
- `GET /api/v1/rewards/adjustments`
- `POST /api/v1/rewards/transactions/:id/correct`
- `POST /api/v1/rewards/transactions/:id/revoke`

Corrections create compensating reward transactions instead of mutating history in place.
Revocations create a full negative reversal and record a reward-adjustment audit entry.

### `GET /api/v1/learner-app/modules`
Returns published learner modules mapped to the tablet contract.

### `GET /api/v1/learner-app/assignment-packs`
Returns `{ items, generatedAt }` for learner-facing assignment packs without pulling the full bootstrap payload.

### `GET /api/v1/learner-app/modules/:id`
Returns a learner module plus its approved/published lessons and `assignmentPacks` for that module.
Supports either the curriculum module id (example `module-1`) or the learner-facing subject id (example `english`).

## Newly added reward request + admin control endpoints

### Reward request / redemption workflow
- `GET /api/v1/learner-app/rewards/requests`
- `POST /api/v1/learner-app/rewards/requests`
- `POST /api/v1/learner-app/rewards/requests/:id/cancel`
- `GET /api/v1/rewards/requests`
- `POST /api/v1/rewards/requests/:id/approve`
- `POST /api/v1/rewards/requests/:id/reject`
- `POST /api/v1/rewards/requests/:id/fulfill`

Behavior:
- learner requests are persisted in the same file-backed durability layer as the rest of the API state
- item existence + XP affordability are checked when the request is created
- duplicate pending/approved requests for the same learner/item are rejected
- `clientRequestId` can be used for safe/idempotent learner-side retries
- fulfillment creates a negative `redemption` reward transaction instead of mutating balances directly

### Session control operations
- `POST /api/v1/learner-app/sessions/:sessionId/abandon`
- `POST /api/v1/learner-app/sessions/:sessionId/reopen`

Both operations create event-log + repair/audit entries so admins can intervene without silent history loss.

### Admin repair / control visibility
- `GET /api/v1/admin/progression-overrides/summary`
- `GET /api/v1/admin/session-repairs/summary`

Returns scoped admin-control analytics across progression overrides and learner session repair actions, including active vs revoked override counts, repair action mix (`reopen`, `abandon`, manual patch), top reasons, top actors, and recent audit items.

### Persistence / storage integrity
- `GET /api/v1/admin/storage/integrity`
- `POST /api/v1/admin/storage/repair-integrity`
- `GET /api/v1/admin/storage/export`

Returns lightweight referential/integrity checks over the current persisted snapshot, including reward request references, progression override links, session repair links, runtime session ownership gaps, and non-reward relational gaps across assignments, attendance, progress, observations, sync receipts, and session event logs.

`POST /api/v1/admin/storage/repair-integrity` supports:
```json
{ "apply": false }
```
Use `apply: false` for a dry-run and `apply: true` to prune orphaned reward requests, orphaned progression overrides, orphaned session repair audits, orphaned runtime sessions, orphaned sync/session-event records, and broken non-reward learner ops records (assignments, attendance, progress, observations).

`GET /api/v1/admin/storage/export` returns the full JSON snapshot with export metadata for manual backup/migration workflows.

## Added rewards reporting depth

### `GET /api/v1/reports/rewards`
Returns reward-operations analytics for the selected scope, including:
- XP awarded vs redeemed trend by day
- reward request funnel/status counts
- most-requested reward items
- recent transactions / requests / adjustments
- learner reward breakdown
- scoped leaderboard

### `GET /api/v1/reports/operations`
Now also includes an `adminControls` block covering progression override / session repair activity and a `storage` block covering persistence mode, collection counts, integrity totals, and recent backups, so NGO/admin dashboards can spot where humans are repeatedly intervening in learner state and whether the durability layer looks healthy.

### `GET /api/v1/reports/storage`
Admin-only persistence report for the current storage engine, including:
- active durability mode/driver
- collection + total record counts
- integrity issue totals and recent issue samples
- recent storage checkpoints/backups
- mutation journal totals, restorable mutation counts, action mix, and recent mutation entries
- raw storage status metadata (`updatedAt`, cache file path, backup metadata)

### Mutation journal control endpoints
- `GET /api/v1/admin/storage/mutations`
- `GET /api/v1/admin/storage/mutations/:id`
- `POST /api/v1/admin/storage/restore-mutation`
- `GET /api/v1/admin/storage/recovery`
- `GET /api/v1/admin/storage/recovery-plan`
- `POST /api/v1/admin/storage/restore-smart`
- `POST /api/v1/admin/storage/restore-latest`
- `POST /api/v1/admin/storage/import/preview`
- `POST /api/v1/admin/storage/import`

Import preview now returns an `analysis` block with trust signals before any data is mutated:
- `summary.safeToImport`
- `summary.trust` (`clean` | `review` | `blocked`)
- `criticalCount` / `warningCount`
- concrete collision / dangling-reference issues
- collection-aware identity checks (`lessonSessions.sessionId`, everything else by `id`) so exported runtime-session snapshots round-trip cleanly during recovery/import preview

`POST /api/v1/admin/storage/import` now blocks on critical integrity issues by default.
Use `force: true` only after reviewing the preview output and deciding to accept the risk.

Behavior:
- Postgres-backed durability now stores a restorable snapshot copy on each journaled storage mutation (`write`, `checkpoint`, `restore`, `restore-mutation`)
- destructive recovery controls now create an automatic preflight checkpoint before mutating primary state (`restore`, `restore-smart`, `restore-latest`, `restore-mutation`, `recover-primary-from-cache`) and return it as `preflightCheckpoint` in the response
- admins can inspect individual journal entries, including whether they contain a recoverable snapshot
- `GET /api/v1/admin/storage/recovery` now returns the recovery plan alongside integrity, backup, mutation, and operations state
- `GET /api/v1/admin/storage/recovery-plan` ranks backup, restorable mutation, and warm-cache candidates so operators can see the safest restore path before pulling the trigger
- `POST /api/v1/admin/storage/restore-smart` applies the best available recovery candidate automatically, or can be constrained with `prefer: backup|mutation|warm-cache`
- storage integrity now flags Postgres journal drift and the absence of any viable recovery path, not just cache drift
- `POST /api/v1/admin/storage/restore-mutation` restores the primary snapshot to the exact state captured by a prior mutation id, then records a fresh `restore-mutation` audit/journal entry
- file mode still exposes an empty mutation journal rather than pretending this capability exists
