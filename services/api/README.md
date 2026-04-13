# Lumo API

## Run locally
```bash
npm install
npm run start:dev
```

## Production recommendation
Current scaffold uses Node watch mode for speed during development.
Before live production rollout, replace with a plain Node start command or a compiled server entry.

## Planned env vars
- `PORT`
- `DATABASE_URL`
- `LUMO_DB_MODE` (`file` by default, `postgres` reserved for Prisma/Postgres wiring)
- `LUMO_DATA_FILE` (override JSON snapshot location)

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

### Persistence / storage integrity
- `GET /api/v1/admin/storage/integrity`
- `POST /api/v1/admin/storage/repair-integrity`
- `GET /api/v1/admin/storage/export`

Returns lightweight referential/integrity checks over the current persisted snapshot, including reward request references, progression override links, session repair links, and runtime session ownership gaps.

`POST /api/v1/admin/storage/repair-integrity` supports:
```json
{ "apply": false }
```
Use `apply: false` for a dry-run and `apply: true` to prune orphaned reward requests, orphaned progression overrides, orphaned session repair audits, and orphaned runtime sessions.

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
