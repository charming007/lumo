# Lumo operator runbook

This is the practical backend/admin runbook for keeping the MVP sane in production.

If the LMS looks healthy but learner evidence, sync state, or storage trust feels off, start here instead of guessing.

## 1. Production baseline

### API runtime
- Service root: `services/api`
- Start command: `npm run start`
- Health: `GET /health`
- Readiness/config audit: `GET /readyz`
- Admin config audit: `GET /api/v1/admin/config/audit`

### Required environment posture
- `PORT=4000` or platform-provided port
- `LUMO_DB_MODE=postgres` for real production durability
- `DATABASE_URL=postgresql://...` when using Postgres
- `LUMO_CORS_ORIGINS=https://your-lms-domain.example`
- `LUMO_CORS_ALLOW_ANY_ORIGIN=false`
- optional: `API_BASE_URL=https://your-api-domain.example`
- optional warm-cache override: `LUMO_DATA_FILE=/data/lumo/store.json`

### Red flags
Do **not** treat the deployment as healthy if any of these are true:
- `/readyz` returns `503`
- config audit reports `errorCount > 0`
- `LUMO_DB_MODE=file` in a production-like environment
- `LUMO_CORS_ALLOW_ANY_ORIGIN=true` outside local development
- storage integrity report shows unresolved critical issues
- admins are importing snapshots blindly without previewing trust signals first

## 2. First 5-minute triage

### A. Check service/config health
1. `GET /health`
2. `GET /readyz`
3. `GET /api/v1/admin/config/audit` as admin

What you want:
- `status: ok`
- `summary.ready: true`
- no config errors
- only intentional warnings

### B. Check storage trust
1. `GET /api/v1/admin/storage/status`
2. `GET /api/v1/admin/storage/integrity`
3. `GET /api/v1/admin/storage/freshness`
4. `GET /api/v1/admin/storage/drift`
5. `GET /api/v1/admin/storage/recovery`

What you want:
- low or zero integrity issues
- no drift between primary/journal/cache
- at least one clear recovery candidate
- recent mutation/checkpoint activity if the system is actively used

### C. Check learner/runtime fallout
1. `GET /api/v1/reports/operations`
2. `GET /api/v1/reports/admin-controls`
3. `GET /api/v1/session-repairs`
4. `GET /api/v1/progression-overrides`

What you are looking for:
- repeated manual session repairs
- repeated progression overrides masking bad upstream data
- reward/admin corrections being used as duct tape for deeper issues

## 3. Safe recovery workflow

### Snapshot import from backup/export
Never import blind.

1. Preview first:
```http
POST /api/v1/admin/storage/import/preview
```
Body:
```json
{
  "merge": false,
  "snapshot": { }
}
```

2. Read the trust signals:
- `summary.safeToImport`
- `summary.trust`
- `criticalCount`
- `warningCount`
- concrete `issues`

3. Only import if trust is acceptable.
4. Use `force: true` **only** after human review.

Live import:
```http
POST /api/v1/admin/storage/import
```
```json
{
  "merge": false,
  "createCheckpoint": true,
  "force": false,
  "snapshot": { }
}
```

## 4. Recovery decision tree

### Best case: restore from ranked recovery plan
1. `GET /api/v1/admin/storage/recovery-plan`
2. Review `recommendedSource`
3. Use smart restore:
```http
POST /api/v1/admin/storage/restore-smart
```

Example:
```json
{
  "prefer": "backup"
}
```

### Restore latest known checkpoint
```http
POST /api/v1/admin/storage/restore-latest
```
Optional body:
```json
{
  "label": "pre-import"
}
```

### Restore specific backup
```http
POST /api/v1/admin/storage/restore
```
```json
{
  "backupPath": "..."
}
```

### Restore exact journal mutation
Use when you know the exact point you want.

1. `GET /api/v1/admin/storage/mutations`
2. `GET /api/v1/admin/storage/mutations/:id`
3. Restore it:
```http
POST /api/v1/admin/storage/restore-mutation
```
```json
{
  "mutationId": 42
}
```

### Recover Postgres primary from warm cache
Use when Postgres primary drifted but local warm cache is still trustworthy.

```http
POST /api/v1/admin/storage/recover-primary-from-cache
```

### Repair cache/journal drift
```http
POST /api/v1/admin/storage/repair-drift
```

This is useful when the system is mostly intact but trust signals show drift.

## 5. Integrity repair workflow

Dry-run first:
```http
POST /api/v1/admin/storage/repair-integrity
```
```json
{
  "apply": false
}
```

If the proposed fixes match what you expect, apply:
```json
{
  "apply": true
}
```

What it can clean up:
- orphaned reward requests
- orphaned progression overrides
- orphaned session repair audits
- orphaned runtime sessions
- broken sync/session-event records
- broken assignments/attendance/progress/observation references

What it does **not** do:
- magically decide business truth for you
- fix pedagogy mistakes
- validate whether a human override was wise

## 6. Runtime session recovery

### Rebuild a session from event log
Preview first:
```http
POST /api/v1/admin/sessions/:sessionId/rebuild-from-events
```
```json
{
  "apply": false,
  "reason": "event_log_rebuild"
}
```

Apply after review:
```json
{
  "apply": true,
  "reason": "event_log_rebuild"
}
```

### Manual intervention controls
- repair session: `POST /api/v1/learner-app/sessions/:sessionId/repair`
- abandon session: `POST /api/v1/learner-app/sessions/:sessionId/abandon`
- reopen session: `POST /api/v1/learner-app/sessions/:sessionId/reopen`
- revert a bad repair: `POST /api/v1/session-repairs/:id/revert`

Rule: if the event log is credible, prefer **rebuild** over freestyle patching.

## 7. Progression override discipline

Useful endpoints:
- create override: `POST /api/v1/progress/:id/override`
- audit list: `GET /api/v1/progression-overrides`
- detail: `GET /api/v1/progression-overrides/:id`
- revoke: `POST /api/v1/progression-overrides/:id/revoke`
- reapply: `POST /api/v1/progression-overrides/:id/reapply`

Operator rule:
- override with a written reason
- revoke when the upstream issue is fixed
- do not use overrides to make broken reporting look healthy

## 8. Backup discipline

Before risky actions, checkpoint first:
```http
POST /api/v1/admin/storage/checkpoint
```
```json
{
  "label": "before-manual-repair"
}
```

List backups:
```http
GET /api/v1/admin/storage/backups
```

Delete only when you mean it:
```http
DELETE /api/v1/admin/storage/backups?backupPath=...
```

## 9. Recommended incident notes template

Capture this in your ops log:
- incident time window
- visible symptom
- storage mode (`file` or `postgres`)
- `/readyz` result
- integrity issue count before/after
- recovery action used
- checkpoint or mutation id restored from
- learners/admin surfaces impacted
- follow-up hardening needed

## 10. Hard truths

- If production is still on file mode, that is a temporary demo posture, not a serious backend posture.
- If operators keep using manual repairs, the system is telling you something upstream is still brittle.
- If import preview says `trust: blocked`, believe it. That endpoint is trying to save you from your future self.
