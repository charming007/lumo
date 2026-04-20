# Lumo Pilot Readiness Assessment

_Date: 2026-04-21_

## Executive verdict

**Lumo is close to a credible pilot for a tightly-scoped operator workflow, but not yet ready for a broad “real pilot” sign-off if the expectation is that all LMS numbers and all learner sync outputs are fully trustworthy under field stress.**

My blunt take:

- **Curriculum creation / release control:** usable enough for pilot **if you force one source of truth** and keep operators inside `/content`.
- **Backend ↔ learner sync:** functionally present and thoughtfully hardened in several places, but **still too heuristic to be treated as audit-grade truth**.
- **Degraded mode:** the product is unusually honest about degraded states in the UI, which is good. But some degraded conditions are still only *well-messaged*, not *fully controlled*.
- **LMS scope:** still too broad for pilot. The repo already contains a good recommendation to cut scope (`docs/PILOT_LMS_SCOPE_CUT.md`), and I agree with it.

## What I reviewed

Grounded this assessment in the current repo, especially:

- `apps/lms-web` operator routes and degraded-mode patterns
- `apps/learner-tablet` bootstrap/offline/sync behavior
- `services/api/src/main.js`, `store.js`, `storage-engine.js`, `db-mode.js`
- current tests in `services/api/test`
- docs including `PRD.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `LMS_FALLBACK_FAILURE_CATALOG.md`, `LUMO_MVP_QA_UAT_GUIDE.md`, and `PILOT_LMS_SCOPE_CUT.md`
- recent commits through `11035b1`

Also verified current API test status:

- `services/api`: **70/70 tests passing**

That matters, but it does **not** by itself prove pilot readiness. Most of the current coverage is around API behavior and regression fixes, not end-to-end field trust.

---

## 1) Curriculum creation flow

## Current state

This is the strongest part of the pilot story.

Evidence from the repo:

- The LMS has a substantial content workflow in `/content`, lesson create/edit forms, assessment links, asset handling, and curriculum canvas APIs.
- The backend exposes create/update/reorder/move endpoints for curriculum nodes (`/api/v1/curriculum/canvas/...`).
- Recent tests cover curriculum tree structure and lifecycle persistence (`curriculum-canvas.test.js`, `subject-lifecycle.test.js`).
- Recent commits show focused work on lifecycle correctness, release blockers, and source-truth clarity.

## What is good enough

### A. Authoring depth is already there
The lesson editor is not a toy. It supports:

- lesson metadata
- activity steps
- structured activities
- localization/support language fields
- lesson assessment metadata
- asset attachment pathways

That is enough to run a pilot content pipeline.

### B. Release/readiness thinking is embedded
The LMS is actively trying to prevent fake-green release behavior:

- dashboard blocks when critical feeds degrade
- content/canvas surfaces expose blockers
- learner feeds filter to published/approved content unless content is explicitly assigned

This is exactly the right instinct for pilot.

### C. Assigned-but-not-published handling is intentional
`buildLearnerLessons()` and `buildLearnerModules()` include assigned items even when not fully published. The learner bootstrap tests explicitly cover this.

That is a practical pilot feature because pilot delivery often needs “assigned for a controlled group before global publish.”

## What is still risky

### 1. Too many curriculum truth surfaces
You currently have overlapping curriculum control/view surfaces:

- `/content`
- `/canvas`
- `/english`
- dashboard release-readiness lane

That is too much for pilot. It increases:

- operator confusion
- inconsistent decision-making
- route-to-route disagreement during degraded API conditions

### 2. Architecture/docs drift reduces trust
`docs/ARCHITECTURE.md` still describes a **NestJS + PostgreSQL + object storage + Redis** platform, but the actual backend is currently an **Express service** with a JSON snapshot/file engine and a postgres JSONB snapshot mode.

That mismatch is not cosmetic. For pilot prep, it creates false assumptions about:

- persistence guarantees
- concurrency behavior
- recovery posture
- what “production-ready backend” really means

### 3. Publishing discipline is product-enforced only partially
The system surfaces readiness blockers well, but operational discipline still depends heavily on humans not bypassing the intended path.

## PM/engineering verdict on curriculum flow

**Pilot-ready if constrained.**

Ship with this rule:

- **`/content` is the only curriculum control plane for pilot.**
- `/canvas` and `/english` should be hidden from normal pilot operators.

Without that constraint, content operations will get messy fast.

---

## 2) Backend ↔ learner sync correctness, performance, and live-data trust

## Current state

There is real sync machinery here, and some of it is good:

- learner bootstrap endpoint exists and is covered
- learner sync endpoint exists with rate limiting
- sync is idempotent **only when client event IDs are stable**
- learner tablet persists local state, queued events, and offline trust metadata
- the app exposes backend status, stale snapshot trust, degraded-mode summaries, and deployment blockers

That is much better than a fake offline-first story.

## What is solid

### A. Offline trust thinking in the learner app is strong
`apps/learner-tablet/lib/app_state.dart` is one of the most pilot-minded files in the repo.

Good signs:

- cached snapshot trust window (24h)
- backend base URL provenance checks
- contract version checks
- explicit production deployment blocking when live bootstrap is unsafe
- visible queue/sync/degraded summaries

This is serious work. It reduces the odds of shipping a tablet that confidently runs on nonsense.

### B. Sync dedupe exists
`syncLearnerAppEvents()` checks `clientId` / `event.id` against stored sync events and marks duplicates instead of replaying them.

That is essential for real field retry behavior.

### C. Learner bootstrap module scoping has recent regression coverage
The bootstrap tests explicitly verify that learner modules are kept distinct and not collapsed into broad subject buckets. That was exactly the kind of quiet correctness bug that would destroy operator trust if it resurfaced.

## What is not yet trustworthy enough

### 1. Progress merging is too heuristic
In `store.upsertProgress()`:

- `mastery` is merged with `Math.max(...)`
- `lessonsCompleted` is merged with `Math.max(...)`
- it keeps only the latest record for `(studentId, moduleId)`

That is simple and resilient, but not robust enough for pilot truth if multiple devices, retries, replayed sessions, or content changes occur.

Worse: in `lesson_completed` handling, `lessonsCompleted` is set from:

- `payload.stepsTotal`
- or `payload.stepIndex`
- or `1`

That smells wrong. **Lesson steps are not lesson count.** If a learner completes one 5-step lesson, the system may record `lessonsCompleted = 5` for the module. That can inflate progress badly.

This is my biggest sync/data-trust red flag in the code.

### 2. Sync semantics are event-accepted, not truth-reconciled
The backend accepts sync events and returns receipts, but this is not a full reconciliation model.

What is missing for pilot-grade trust:

- no clear end-to-end conflict resolution policy beyond client-id dedupe
- no durable per-device sync cursor contract with reconciliation audit
- no explicit replay/rebuild coverage for learner progress truth under messy duplicate/out-of-order batches
- no visible “authoritative learner state vs pending local state” compare flow for operators

### 3. Sync test coverage is thinner than it should be for this risk area
There is good bootstrap and recovery coverage, but I did **not** find a dedicated learner sync regression suite covering combinations like:

- duplicate `lesson_completed`
- out-of-order events
- mixed accepted/duplicate/ignored batch semantics
- queue replay after partial backend failure
- multi-device or reinstalled-device scenarios
- progress correctness after repeated sync attempts

For pilot, that is a gap.

### 4. Storage model is still snapshot-oriented
The current persistence layer is effectively:

- JSON file mode, or
- postgres JSONB snapshot mode

That is workable for a small pilot, but it is not the same thing as a strongly modeled relational system with well-defined transactional guarantees.

For a pilot with low concurrency and a disciplined operator workflow, maybe okay.
For “this data is unquestionably correct,” not yet.

## Performance assessment

### Likely okay for a small pilot
For a small number of tablets, pods, and operators, the current stack is probably fine:

- simple synchronous Express API
- no obviously expensive orchestration in the hot path
- bootstrap and sync payloads are fairly straightforward
- rate limiting is present

### Not something I’d trust to scale casually
The current design will start hurting as soon as you increase:

- concurrent sync bursts
- richer reporting
- asset usage
- multi-operator admin mutation volume

That is a post-pilot problem, but the architectural limit is real.

## PM/engineering verdict on sync trust

**Functionally pilot-capable, but not yet pilot-trustworthy without guardrails and one data correction.**

I would not promise stakeholders that LMS progress is “the truth” until the `lessonsCompleted` semantics and sync regression coverage are fixed.

---

## 3) What can cause degraded mode

The repo is actually very self-aware here.

## Already-visible degraded-mode triggers

### Backend/API availability
The LMS uses `Promise.allSettled(...)` heavily and intentionally degrades or blocks when critical feeds fail.

Examples:

- dashboard blocks on critical operational/release-readiness feed failure
- reports show degraded mode banners
- canvas has rescue flows when data sources fail
- learner tablet falls back to local snapshot/bundled content when bootstrap fails

### Production wiring / env misconfiguration
Both LMS and learner app explicitly guard against unsafe or missing production API base URLs.

Good. This prevents fake sign-off on localhost-ish configs.

### Asset/storage integrity issues
Health/config/integrity surfaces point to several real degraded conditions:

- asset upload root using fragile repo-local paths
- public asset base URL validity issues
- persistence risk on redeploy/ephemeral hosts
- config audit warnings

The API test run itself emitted warnings about this.

### Cached snapshot trust decay
On the tablet side, degraded mode can be triggered by:

- stale cached snapshot age
- backend target mismatch
- contract version mismatch
- bootstrap failure
- queued sync events growing old

### Speech/audio runtime degradation
The learner app is built to degrade to:

- saved audio without transcript help
- manual review / facilitator confirmation
- reduced hands-free automation

That is acceptable for pilot if the SOP is explicit.

## The most dangerous degraded mode

The scariest degraded mode is **not** a blank page.
It is **a plausible page with partially true data**.

To the team’s credit, the LMS often chooses to fail closed instead of faking health.
But the risk still exists whenever:

- noncritical routes stay up with partial data,
- sync-derived progress is heuristic,
- multiple curriculum surfaces can disagree,
- cached learner state is “usable” but not fresh enough for operational confidence.

## PM/engineering verdict on degraded mode

**The messaging layer is ahead of the data-control layer.**

That is better than the reverse, but before pilot the team should close the biggest “honest UI over shaky semantics” gaps.

---

## 4) Is LMS scope too complex? What should be cut before pilot?

## Yes, scope is too broad

I agree with `docs/PILOT_LMS_SCOPE_CUT.md`.

The current LMS surface is too wide for pilot:

- Dashboard
- Content
- Canvas
- English
- Assignments
- Attendance
- Progress
- Mallams
- Pods
- Reports
- Rewards
- Settings
- Guide

That is a lot of surface area to harden, train, and trust.

## Safe cuts before pilot

These can be hidden/deferred **without hurting Lumo’s core mission**.

### Cut/defer from pilot navigation

#### 1. `/english`
Reason: duplicates content-authoring/release decisions already handled elsewhere.

#### 2. `/canvas`
Reason: useful internally, but not necessary for pilot operators if `/content` is the curriculum source of truth.

#### 3. `/rewards`
Reason: adds operational complexity and manual power without proving the core learning loop.

#### 4. `/reports`
Reason: too broad and too stakeholder-facing for current trust maturity. Keep only minimal metrics elsewhere.

#### 5. `/guide`
Reason: docs belong in docs for pilot; not core product surface.

### Potentially hide unless field ops prove they need them daily

- `/attendance`
- `/mallams`
- `/pods`

## Keep for pilot

### Must keep

- `/` dashboard as thin daily ops front door
- `/content` as sole curriculum/release source of truth
- `/assignments`
- `/progress` in minimal intervention form
- `/settings` trust/integrity/storage subset only

## Pilot navigation recommendation

For pilot, nav should effectively collapse to:

- Dashboard
- Content
- Assignments
- Progress
- Settings

That is enough.

---

## Priority-ranked risks

## P0 — must fix before calling the pilot ready

### P0.1 Progress correctness bug/ambiguity in learner sync
`lesson_completed` currently maps `stepsTotal` / `stepIndex` into `lessonsCompleted`. That can distort module progress and undermine every downstream dashboard/report/reward trust claim.

### P0.2 No single curriculum source of truth for operators
If pilot staff are trained across `/content`, `/canvas`, and `/english`, you will create avoidable operational mistakes.

### P0.3 Architecture/reliability story is misaligned with reality
Docs still imply a more mature backend/storage architecture than what is currently implemented. Fixing this is part of honest pilot prep.

## P1 — should fix during pilot hardening

### P1.1 Add dedicated learner sync regression coverage
Focus on duplicate, replay, out-of-order, and partial failure scenarios.

### P1.2 Publish an explicit data-trust contract
Define, in plain language:

- what is source of truth for curriculum,
- what is source of truth for learner progress,
- when cached tablet data is acceptable,
- when operators must stop trusting the dashboard.

### P1.3 Harden storage/env posture for production-like pilot deployment
The current warnings around asset storage and demo/header auth are fine for local demos, not for a real pilot.

## P2 — can wait until after pilot if scope is cut

- richer reporting/export surfaces
- rewards admin operations
- multiple curriculum planning views
- broader roster/admin management UX polish

---

## Immediate action plan

## Next 48 hours

1. **Fix progress semantics in sync ingestion**
   - stop deriving `lessonsCompleted` from step count
   - define the correct increment model per completed lesson/module
   - add regression tests immediately

2. **Freeze pilot LMS scope**
   - make `/content` the only content control plane
   - hide `/english` and `/canvas` from pilot nav
   - hide `/reports`, `/rewards`, `/guide`

3. **Write the pilot source-of-truth SOP**
   - curriculum truth
   - learner progress truth
   - degraded-mode stop/continue rules
   - what operators do when sync is stale

4. **Update architecture/runtime docs to match reality**
   - Express API
   - actual storage modes
   - actual pilot deployment assumptions

## This week

5. **Build a learner sync test matrix**
   - duplicate event replay
   - duplicate batch replay
   - out-of-order completion/session events
   - offline queue retry after failure
   - device reinstall / restored snapshot case

6. **Run one full pilot rehearsal**
   From:
   - create content
   - publish/assign
   - bootstrap learner tablet
   - run lesson offline
   - queue sync
   - reconnect
   - verify LMS progress and assignment state

   Do this with evidence capture, not vibes.

7. **Make settings the pilot trust center**
   Keep only health/storage/integrity/runtime checks that let an operator answer: “Can I trust this system right now?”

---

## Final recommendation

If you want the honest answer:

**Do not launch the pilot as “full LMS + learner platform.” Launch it as a disciplined pilot operating system with a narrow control plane.**

That means:

- one curriculum surface,
- one assignment surface,
- one intervention view,
- one trust center,
- one learner sync path you have actually tested under retry and duplicate conditions.

If you make those cuts and fix the sync-progress semantics, I’d call this **pilotable**.

If you keep the current breadth and treat the current sync outputs as fully trustworthy without that fix, you are setting yourself up for the worst kind of failure: **a polished system that occasionally lies.**
