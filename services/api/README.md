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

### `GET /api/v1/learner-app/modules`
Returns published learner modules mapped to the tablet contract.

### `GET /api/v1/learner-app/assignment-packs`
Returns `{ items, generatedAt }` for learner-facing assignment packs without pulling the full bootstrap payload.

### `GET /api/v1/learner-app/modules/:id`
Returns a learner module plus its approved/published lessons and `assignmentPacks` for that module.
Supports either the curriculum module id (example `module-1`) or the learner-facing subject id (example `english`).
