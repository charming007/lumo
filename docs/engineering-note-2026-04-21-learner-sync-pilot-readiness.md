# Learner sync / runtime pilot readiness note

Date: 2026-04-21
Owner: learner sync deep-dive

## Bottom line

The current learner runtime path is **close for supervised pilot use when tablets start from a successful live bootstrap**, but it is **not safe for pilot if local fallback learner registration is expected to reconcile later**.

The biggest blocker is a contract mismatch:

- learner app queues `learner_registered_local_fallback`
- backend sync only accepts `learner_registered`

That means an offline-registered learner is never created on the backend via sync, and later runtime events for that learner can poison the whole sync batch with `Unknown learner for sync event`.

## What already mitigates pilot risk

### 1) Trust gating for offline roster
`apps/learner-tablet/lib/app_state.dart`
- cached roster is only considered trustworthy when it came from a successful live bootstrap
- cache is tied to backend base URL
- cache has a 24h trust window
- release builds can block operation when only unsafe fallback data exists

This is good. It prevents “tablet looks alive but roster is fantasy” failure modes.

### 2) Durable local queue + local persistence
`apps/learner-tablet/lib/app_state.dart`
- pending sync events are persisted in shared preferences
- active session, roster, assignments, runtime projections, and sync metadata persist locally
- retry timer re-attempts sync after failures

This gives decent resilience to intermittent connectivity.

### 3) Server-side idempotency / dedupe for runtime events
`services/api/src/main.js`
- sync events are deduped by client event id via `findSyncEventByClientId`
- sync receipts are stored
- runtime sessions are upserted by `sessionId`
- progress is upserted by learner + subject

That materially reduces double-apply risk when retries happen.

### 4) Runtime repair / audit tooling exists
`services/api/src/main.js`, `services/api/src/store.js`
- session repair, reopen, abandon, revert, and rebuild-from-events endpoints exist
- progression override audit exists
- session event log is stored

This is useful pilot hardening for ops when field data gets weird.

## Top risks

### P0 — offline learner registration cannot reconcile
Files:
- `apps/learner-tablet/lib/app_state.dart`
- `services/api/src/main.js`

Observed:
- offline/local registration enqueues `learner_registered_local_fallback`
- backend sync handler only handles `learner_registered`
- unsupported event types are marked ignored, not transformed
- later runtime events resolve learner by backend `studentId` or derived `learnerCode`
- if learner was never created server-side, runtime sync throws 400: `Unknown learner for sync event`
- sync API processes the batch in one try/catch, so one unknown learner event fails the whole request

Pilot effect:
- one offline-created learner can wedge the tablet’s pending runtime queue
- live runtime trust degrades because later events never land
- operator sees queued events, but the root cause is contract drift, not connectivity

### P1 — batch failure is all-or-nothing for validation errors
Files:
- `services/api/src/main.js`
- `apps/learner-tablet/lib/app_state.dart`

Observed:
- client sends the full pending queue in one request
- server throws on invalid/unknown learner runtime events instead of returning per-event reject receipts
- client keeps retrying the same poisoned queue

Pilot effect:
- one bad event can indefinitely block many good events behind it
- queue can become “stuck but busy retrying”

### P1 — client emits sync event types the backend does not consume
Files:
- `apps/learner-tablet/lib/app_state.dart`
- `services/api/src/main.js`

Observed examples:
- `learner_reward_redeemed` is queued by the app, but no backend sync handler exists for it
- ignored events are surfaced only as warnings; no dedicated dead-letter or operator action path exists

Pilot effect:
- silent product drift between “what tablet thinks synced” and “what backend actually stores”
- reward history can diverge between local tablet state and backend truth

### P2 — learner identity depends on derived learnerCode, not a durable client-generated registration id
Files:
- `services/api/src/presenters.js`
- `apps/learner-tablet/lib/models.dart`

Observed:
- learnerCode is derived from name/cohort/age on both sides
- sync resolution for runtime events often uses learnerCode
- learnerCode is human-readable, not a stable opaque identifier

Pilot effect:
- collisions are possible for similar learners
- edits to registration details can make identity reconciliation brittle

## Highest-value fixes before / during pilot

### 1) Fix the registration sync contract first
Best move:
- make client queue `learner_registered`
- or make backend accept both `learner_registered` and `learner_registered_local_fallback` as aliases

Also return the created backend learner identity in the receipt and let the tablet reconcile local learner -> backend learner deterministically.

### 2) Make sync batches per-event fault tolerant
Best move:
- do not fail the whole batch on one bad event
- return a receipt per event: `accepted | duplicate | ignored | rejected`
- reserve 4xx for malformed request envelope, not one bad item inside a valid batch

This prevents one poisoned event from blocking the rest of the queue.

### 3) Add a dead-letter / quarantine path on the tablet
Best move:
- if the same event or batch fails repeatedly with deterministic 4xx, quarantine the bad event(s)
- keep syncing the rest
- surface a clear operator/admin alert

### 4) Stop relying on learnerCode for authoritative identity
Best move:
- generate a stable `clientLearnerId` / registration UUID on tablet creation
- sync that first
- persist server `studentId` mapping after registration succeeds
- use server `studentId` for later runtime events whenever available

### 5) Either implement reward-redemption sync or stop queueing it
Best move:
- add backend handler for `learner_reward_redeemed`, or
- remove that queued event until backend semantics exist

Right now it creates trust debt for no payoff.

## Practical pilot readout

### Safe-ish now
- live bootstrap
- assigned lesson consumption
- runtime session capture for already-known learners
- duplicate-safe retries for supported runtime events
- local persistence / temporary offline continuation

### Not safe enough yet
- offline learner registration expecting later reconciliation
- long-lived queues containing mixed-validity events
- treating local reward history as backend truth

## Recommended pilot gate

Do **not** treat offline learner registration as supported pilot workflow until the registration sync contract is fixed.

If pilot must start immediately, operational workaround:
- require tablets to complete live bootstrap before first learner registration
- register new learners only while backend is reachable
- if tablet falls back local-only for registration, flag that learner for manual admin reconciliation before lesson sync is trusted
