# Shared tablet learner flow spec

_Last updated: 2026-04-23_

## Goal

Lock the shared-tablet learner UX to this exact sequence:

1. **Subject**
2. **Available Lesson**
3. **Select Available Learner**
4. **Start Lesson**

This is the implementation contract for the learner tablet, backend bootstrap, and operator expectations during pilot delivery.

## Product stance

- The tablet is a **shared device**, not a personal dashboard.
- The child should only see **learner-safe published subjects and published lessons** in the main path.
- The tablet should not expose curriculum modules as the primary learner-facing navigation layer.
- Mallam/operator actions must stay possible without letting draft or broken content leak into the child flow.

---

## 1. Required screen sequence

### Screen 1 — Subject

**Purpose:** let the tablet operator or learner choose the subject area first.

**Show:**
- one card per learner-safe published subject with at least one available lesson
- large tap targets and subject title/icon treatment
- backend/source status notice for live vs fallback/offline state
- clear empty-state guidance when no subject is ready

**Do not show:**
- raw module cards
- unpublished subjects
- subjects with zero learner-available lessons
- scheduled-only or draft-only lesson placeholders in the main subject grid

**Behavior:**
- tapping a subject opens the lesson list filtered to that subject
- back from downstream screens returns here
- if live bootstrap is unavailable, render from the last trusted local snapshot or bundled fallback content

### Screen 2 — Available Lesson

**Purpose:** show only the lessons a learner can actually start now for the chosen subject.

**Show per lesson:**
- lesson title
- lightweight duration / mode metadata if available
- availability state label when useful
- optional source/sync hint only when the tablet is degraded or stale

**Availability rule:**
A lesson is **available** only when it is safe to start on the tablet now. In the normal path that means:
- lesson is learner-facing and published
- its parent subject is learner-facing and published enough to surface
- local content required to launch is present, or the tablet has enough cached/live data to fetch it immediately

**Do not show in the main list:**
- draft lessons
- review lessons
- scheduled lessons that are not yet active
- internal routing placeholders
- module-first grouping

**Behavior:**
- tapping a lesson advances to learner selection
- if the chosen lesson becomes invalid before start, block launch and explain why instead of silently falling into some random other lesson
- empty state should say whether the issue is:
  - no published lessons in this subject
  - lessons waiting for sync
  - roster/registration blocker
  - stale fallback-only tablet state

### Screen 3 — Select Available Learner

**Purpose:** pick which child is about to take the selected lesson on the shared tablet.

**Show:**
- only learners who are currently eligible to take the selected lesson on this tablet
- learner cards with clear status badges
- search/filter only if roster size makes it necessary; default should stay simple

**Availability rule:**
A learner is **available** when the tablet can safely attribute the session to that learner now.

At minimum the learner card should have enough local/live identity to:
- open a session with a stable learner id
- attribute lesson progress locally while offline
- queue sync events against the correct learner when connectivity returns

### Screen 4 — Start Lesson

**Purpose:** explicit confirmation gate before launching the runtime.

**Show:**
- selected subject
- selected lesson
- selected learner
- status chips or copy if the tablet is offline, using cached content, or has pending unsynced events
- primary CTA: **Start Lesson**
- secondary CTA(s): back to learner list / lesson list as needed

**Behavior:**
- start creates or resumes the local session record first, then enters lesson runtime
- if required assets or lesson payload are missing, stop here and explain the blocker
- if offline but launchable from trusted local data, allow start and mark the session for later sync

---

## 2. Learner status model for selection

The learner picker must make availability obvious. Keep the status set small and operational.

### `available`
The learner can start the selected lesson now.

**UI treatment:** enabled card + primary action affordance.

### `needs_sync`
The learner exists locally, but live roster/assignment freshness is stale enough that the tablet cannot confirm current eligibility.

**UI treatment:** visible but disabled by default, with copy like _Needs refresh to confirm_.

**Operator expectation:** tap refresh sync before handoff.

### `sync_pending_local_work`
The learner can still be selected, but the device already holds unsynced activity for them.

**UI treatment:** enabled card with warning badge such as _Pending sync_.

**Operator expectation:** okay to continue in offline conditions, but do not mistake tablet-local state for fully synced LMS truth.

### `unavailable_not_registered`
The learner cannot be selected because registration/identity data needed for safe attribution is missing.

**UI treatment:** disabled card or omitted from default list.

### `unavailable_assignment_blocked`
The learner is known, but this lesson is not currently available to them on this tablet due to assignment, publication, or release-state rules.

**UI treatment:** disabled card or omitted from default list depending on roster size and operator needs.

### `unavailable_device_trust_blocked`
The device is in an untrusted fallback state and the app should not pretend it knows who can safely start what.

**UI treatment:** do not allow start; show recovery guidance.

### Status simplification rule
Do **not** invent twenty subtle statuses. Operators need to know one thing fast: can this child start this lesson now or not, and if not, what fixes it.

---

## 3. Offline and local persistence requirements

The shared-tablet flow must remain safe under intermittent connectivity.

### Persist locally
The tablet must persist enough state to restore and continue this flow without network:
- trusted learner bootstrap snapshot
- learner roster needed for selection
- learner-facing subject projection
- learner-facing available lessons projection
- lesson payloads/assets needed for launch
- pending sync events
- in-progress and completed local lesson sessions
- last successful sync timestamp and backend/source status metadata

### Persistence rules
- subject and lesson availability shown offline must come from the **last trusted snapshot** or bundled offline pack, not invented demo data
- local persistence must preserve the chosen learner, lesson, and subject when the app backgrounds or the device restarts mid-flow
- once **Start Lesson** is tapped, session identity and attribution must be stored before runtime begins
- pending events must be append-only where practical and replayable after reconnect

### Trust rule
If the tablet does not have a trusted snapshot and cannot fetch live bootstrap, the app must block live delivery instead of showing polished nonsense.

---

## 4. Sync expectations

### Bootstrap / refresh
Live sync should refresh:
- learner roster and registration context
- learner-facing subjects
- learner-facing lessons
- assignment and publication status relevant to learner availability
- lesson/session state needed to avoid duplicate or conflicting launches

### Offline behavior
When offline:
- previously trusted subject/lesson/learner state may still be used
- new work must queue locally
- the UI must clearly distinguish **offline but usable** from **offline and not trustworthy enough to start**

### Reconnect behavior
When connectivity returns:
- pending learner events should sync before the tablet claims full freshness
- refreshed bootstrap should reconcile subject/lesson availability without deleting legitimate local session history
- stale scheduled/draft content must stay hidden from the learner-facing main path after reconciliation

### Operator-visible sync cues
At minimum the tablet should expose:
- live vs fallback/offline state
- last successful sync age
- whether there are pending unsynced events
- whether refresh is currently running
- a plain-English reason when a learner or lesson is blocked by stale sync/device trust

---

## 5. Mallam / operator actions

Mallam/operator actions are part of the flow, even if the child-facing UI stays simple.

### Before session
The operator should be able to:
- refresh live sync
- choose a subject
- choose a currently available lesson
- choose an available learner
- see when a learner is blocked and why

### During degraded conditions
The operator should be able to:
- continue with trusted offline data when allowed
- understand whether the issue is content readiness, roster state, sync delay, or device trust
- avoid starting the wrong learner or wrong lesson just because the network is flaky

### After session
The operator should be able to:
- see that progress saved locally
- see whether sync is pending
- retry/refresh sync when connectivity returns

### Operator non-goals
The learner tablet should **not** become a mini LMS. Do not leak admin editing, release management, or raw curriculum structure into this flow.

---

## 6. Backend / contract expectations

The runtime contract must support this flow without forcing the tablet to reconstruct business truth from scraps.

### Bootstrap must support
- learner-safe subject-first projection
- lesson records that retain subject linkage
- enough learner identity/registration state to determine learner availability
- assignment metadata needed for internal routing without forcing module-first UX
- sync/source/trust metadata used by the tablet status surfaces

### Key contract expectation
The backend may keep module metadata for routing, auditing, or internal linkage, but the learner-facing entry path remains:

**Subject -> Available Lesson -> Select Available Learner -> Start Lesson**

Anything else is the wrong contract for shared-tablet delivery.

---

## 7. Acceptance criteria

This spec is satisfied when all of the following are true:

1. The learner tablet home path always enters through **Subject**.
2. The second screen shows only **currently available lessons** for the selected subject.
3. The third screen shows only **available learners** for the selected lesson, with clear status treatment for blocked cases.
4. The fourth screen requires explicit **Start Lesson** confirmation.
5. Draft/review/scheduled-only content does not leak into the main learner path.
6. Offline-capable tablets can continue from trusted local data and queue work locally.
7. Untrusted/offline-without-safe-data tablets block launch with clear operator guidance.
8. Sync state and pending local work are visible enough that operators do not confuse tablet-local truth with LMS truth.
9. Mallam/operator actions stay focused on delivery, not admin authoring.

---

## 8. Recommended implementation notes

- Treat learner availability as a first-class computed projection, not a bunch of ad hoc UI checks sprayed across screens.
- Keep module ids/labels available for routing internals where needed, but do not let them drive the learner-facing navigation.
- Prefer one clear status reason over stacked warning soup.
- If the app cannot safely start a lesson, fail loudly and honestly. Silent magic here is how operator trust dies.
