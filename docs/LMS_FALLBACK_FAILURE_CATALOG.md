# Lumo LMS Fallback & Failure Modes Catalog

_Last updated: 2026-04-14_

A comprehensive operator-facing catalog of the **plausible fallback, degraded-mode, and failure states** users may experience across both the **learner app** and the **LMS**.

**Audience:** LMS admins, QA/UAT reviewers, implementation managers, mallam ops leads, curriculum/content teams, and anyone trying to answer the very practical question: *what breaks, what degrades gracefully, what is already handled, and where do humans still need to intervene?*

**How to use this:** treat this as the companion to the main LMS guide. The main guide explains the intended workflow. This catalog explains what happens when reality gets messy — which, frankly, is the more useful document in production.

---

## What counts as a fallback/failure mode here

This catalog includes states where:

- the system degrades gracefully instead of hard-failing,
- the UI stays alive but the data is partial,
- work is saved locally because upstream systems are unavailable,
- a user-visible mismatch appears between LMS truth and learner-tablet truth,
- manual intervention is required to continue safely, or
- a workflow is technically possible but only partially guarded.

It does **not** assume every state is a bug. Some are deliberate resilience patterns. Others are genuine failure modes that still need tightening.

---
## A. Learner app bootstrap, connectivity, and device state

### 1. Backend bootstrap unavailable at app start

- **What it is:** The learner tablet cannot fetch live learners, modules, assignments, or registration targets during startup.
- **Likely causes:** API downtime, DNS/network failure, expired backend endpoint config, captive portal, or device offline state.
- **User-visible behavior:** Tablet still opens, but status shows offline/fallback language and the experience may rely on cached or local fallback data instead of fresh backend content.
- **Expected outcome in the app/LMS:** Learners can still use previously persisted/local data when available; truly new live backend changes will not appear until connectivity returns.
- **Backend/system impact:** No fresh bootstrap snapshot; sync queue may continue to grow; admin-side changes are not reflected on device yet.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Grounded in `backendStatusLabel`, `backendStatusDetail`, `usingFallbackData`, and persisted-state restore paths in `apps/learner-tablet/lib/app_state.dart`. Recommendation: expose last successful sync age more prominently on the learner home screen.

### 2. Persisted runtime state skipped because schema changed

- **What it is:** A saved learner-tablet snapshot exists locally but no longer matches the expected persistence schema.
- **Likely causes:** App update changed the runtime persistence schema version or old stored state is malformed.
- **User-visible behavior:** The app starts, but previously saved local tablet state may not be restored; operators may see a cleaner-than-expected device state after update.
- **Expected outcome in the app/LMS:** The app safely ignores incompatible local state rather than crashing or loading corrupt data.
- **Backend/system impact:** Local continuity is lost for that stale snapshot; backend remains source of truth once reachable.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Explicitly guarded by `_kPersistenceSchemaVersion` and the “older schema was skipped safely” branch. Recommendation: surface a small admin-facing recovery note so this does not look like random disappearance.

### 3. Foreground/background interruption during active lesson

- **What it is:** The tablet app leaves the foreground while Mallam speech, recording, or hands-free capture is active.
- **Likely causes:** App switch, browser tab change, phone call, OS interruption, screen lock, or facilitator leaving the app mid-step.
- **User-visible behavior:** Live mic playback/capture stops and the app asks the facilitator to explicitly tap Resume hands-free loop when ready.
- **Expected outcome in the app/LMS:** The current learner session is protected; the app avoids silently reopening the mic on resume.
- **Backend/system impact:** No data corruption expected; the session remains paused with manual confirmation required to continue the automation loop.
- **Current handling status:** **Handled**
- **Notes / recommendations:** This was recently hardened. Recommendation: keep this strict; automatic hot-mic resume would be the dumb failure mode here.

### 4. Live module metadata missing for a lesson launch

- **What it is:** A lesson exists but its full module metadata is not yet available locally when the user launches it.
- **Likely causes:** Partial sync, stale cache, module deleted/renamed upstream, or timing gap between lesson payload and module payload.
- **User-visible behavior:** The app still launches using a fallback module shell with generic title/description language instead of blocking outright.
- **Expected outcome in the app/LMS:** Lesson launch is preserved so delivery can continue while metadata catches up later.
- **Backend/system impact:** Telemetry still ties back to the lesson, but contextual module information may be reduced until next sync.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Grounded in `resolveLessonModule` fallback behavior in `apps/learner-tablet/lib/main.dart`. Recommendation: log these occurrences so LMS/content ops can spot drift between lesson and module payloads.

## B. Content, assignments, and curriculum integrity

### 5. Assigned content is stale, deprecated, or ghost content appears on tablet

- **What it is:** Learners see subject/module/lesson items that no longer exist in the live LMS/backend contract.
- **Likely causes:** Persisted device state, old seed/demo content, stale assignment caches, or backend/bootstrap mismatch.
- **User-visible behavior:** Unexpected subjects or lessons appear in the learner app even though admins cannot find them in the LMS.
- **Expected outcome in the app/LMS:** Current implementation sanitizes deprecated demo modules/lessons during restore/bootstrap, reducing this class of ghost content.
- **Backend/system impact:** Without cleanup, learners may enter wrong content and operators lose trust in LMS-to-device integrity.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Recent repo history shows this was specifically fixed. Recommendation: keep cataloging any future ghost-content incidents because they are credibility killers.

### 6. Module exists but is not actually release-safe

- **What it is:** Curriculum structure exists in LMS, but the module is missing approved lessons, missing counts, or missing an assessment gate.
- **Likely causes:** Admins create structure before content is complete, editorial review incomplete, or assessment setup skipped.
- **User-visible behavior:** In LMS, content looks partly present but blockers/readiness indicators show gaps; on learner side, content may be withheld or routed through fallback delivery expectations.
- **Expected outcome in the app/LMS:** Admins are expected to hold release/assignment until blockers clear.
- **Backend/system impact:** Bad release hygiene creates broken assignments, false readiness, and unreliable downstream reporting.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Current guides and LMS surfaces already encode release blockers and assessment-gate expectations. Recommendation: keep assignment creation opinionated; do not let draft trash masquerade as live curriculum.

### 7. No assessment gate wired to a module

- **What it is:** A module can be taught, but progression logic lacks a real assessment checkpoint.
- **Likely causes:** Assessment not created, not linked, retired without replacement, or content ops oversight.
- **User-visible behavior:** Learner app can show “No assessment gate” / fallback routing style messaging; LMS shows module incompleteness.
- **Expected outcome in the app/LMS:** Learning can continue, but progression certainty and release confidence are weakened.
- **Backend/system impact:** Progression, rewards, and reporting can drift away from mastery evidence.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** The system surfaces the gap, which is good, but it still depends on human ops discipline to fix it. Recommendation: add a stronger LMS warning before assignment/publish for modules without gates.

### 8. Assignment exists in LMS but has not reached the tablet yet

- **What it is:** Admins publish or assign valid content, but the learner app has not synced it yet.
- **Likely causes:** Device offline, sync backlog, recent assignment creation, or backend lag.
- **User-visible behavior:** Learner-facing UI may show waiting-for-sync cues or continue showing older assigned lesson state.
- **Expected outcome in the app/LMS:** Operators can continue with already-cached work, but newly assigned content is delayed until the next successful sync.
- **Backend/system impact:** Temporary delivery skew between LMS truth and tablet truth.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Current app language explicitly references waiting for sync. Recommendation: show assignment freshness timestamps in both LMS and tablet to reduce “is this broken or just delayed?” confusion.

## C. Voice capture, speech recognition, and hands-free lesson flow

### 9. Microphone permission denied

- **What it is:** The device/browser blocks mic access for recording or speech recognition.
- **Likely causes:** User denied permission, browser privacy settings, OS-level restriction, MDM policy, or missing permission prompt acceptance.
- **User-visible behavior:** Transcript help is unavailable; learner audio capture or speech recognition messaging explains that mic permission is required or fallback/manual confirmation is in effect.
- **Expected outcome in the app/LMS:** Lesson can continue in degraded/manual mode where possible, especially with saved audio and facilitator confirmation.
- **Backend/system impact:** No live transcript assistance; lower automation quality; facilitator workload increases.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Speech service normalizes permission errors into clear operator language. Recommendation: also expose a one-tap “how to re-enable mic” hint per platform.

### 10. Preferred recorder/encoder unavailable

- **What it is:** The primary audio recorder or preferred encoder cannot start on the current device.
- **Likely causes:** Platform codec support gaps, plugin/device incompatibility, file-system path issues, or recorder initialization failure.
- **User-visible behavior:** Capture falls back to alternate recorder/WAV path with explicit fallback status messaging.
- **Expected outcome in the app/LMS:** Audio recording still proceeds using a less-ideal but functional mode.
- **Backend/system impact:** Potentially larger files or reduced capture ergonomics, but lesson evidence is preserved.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Grounded in `AudioCaptureService.startSafely()` fallback behavior. Recommendation: log which recorder path is used so deployment can spot weak hardware profiles.

### 11. Speech recognition service unavailable on device/browser

- **What it is:** Speech-to-text cannot initialize even though the lesson itself can continue.
- **Likely causes:** Unsupported browser/device, missing engine, blocked web speech APIs, or unstable speech plugin startup.
- **User-visible behavior:** The app tells operators that Lumo will save learner audio and allow manual answer confirmation instead of live transcript capture.
- **Expected outcome in the app/LMS:** The lesson remains usable in audio-first/manual-review mode.
- **Backend/system impact:** Reduced automation, more manual checks, and weaker real-time transcript signals.
- **Current handling status:** **Handled**
- **Notes / recommendations:** This is one of the core intentional fallbacks in the learner app. Recommendation: in the LMS, document expected facilitator SOP for transcript-unavailable sessions.

### 12. Repeated speech-recognition start failures trigger cooldown

- **What it is:** Speech recognition keeps failing to start, so the app blocks immediate repeated retries for a short cooldown window.
- **Likely causes:** Engine instability, browser API churn, permission race conditions, or transient device/audio stack faults.
- **User-visible behavior:** Operators see cooldown language telling them to keep saving audio locally and try again after a moment.
- **Expected outcome in the app/LMS:** The app avoids thrashing the speech engine and falls back to stable audio-first/manual review behavior.
- **Backend/system impact:** Temporary loss of hands-free transcript help; prevents retry storms.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Recently hardened. Recommendation: keep the cooldown visible and time-bound so facilitators do not keep tapping into a wall.

### 13. No speech detected / speech timeout / missed transcript

- **What it is:** The learner response window ends without usable transcript capture.
- **Likely causes:** Quiet learner, noisy room, mic distance, speech engine timeout, overlapping Mallam audio, or concurrency guardrails.
- **User-visible behavior:** The app reports that no clear speech was detected, preserves saved audio, and may guide the facilitator into manual acceptance or another try.
- **Expected outcome in the app/LMS:** Response review continues using saved audio fallback; the lesson does not need to hard-fail.
- **Backend/system impact:** Extra facilitator step and possible slower progression through the lesson.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Grounded in normalized speech errors plus degraded audio recovery in `main.dart`. Recommendation: track repeated misses per device/pod to separate pedagogy issues from hardware issues.

### 14. Shared-device concurrent speech capture conflict

- **What it is:** The app intentionally avoids reopening live transcript capture when the capture conditions are unsafe or overlapping.
- **Likely causes:** Shared mic reuse, Mallam playback overlap, concurrent capture protections, or unresolved prior recording state.
- **User-visible behavior:** Status shifts to audio-only fallback with saved-audio review guidance instead of forcing unreliable speech recognition.
- **Expected outcome in the app/LMS:** The system chooses a safer degraded mode instead of producing junk transcripts.
- **Backend/system impact:** Lower automation, but better correctness and less operator confusion than flaky mixed capture.
- **Current handling status:** **Handled**
- **Notes / recommendations:** This is a good trade-off. Recommendation: reflect this in facilitator training so “fallback” is understood as safety, not random failure.

### 15. Saved learner audio cannot be played back on device yet

- **What it is:** The app captured fallback audio but playback fails when the facilitator tries to review it.
- **Likely causes:** Device playback codec issue, file access problem, deleted temp file, audio output failure, or plugin/runtime bug.
- **User-visible behavior:** The UI reports that saved audio could not be played on the device yet.
- **Expected outcome in the app/LMS:** The lesson can still continue, but facilitator confidence in confirming the answer is reduced.
- **Backend/system impact:** Evidence exists but is harder to verify in-session; possible need for manual override/coach judgment.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** Playback failure is surfaced, but operator recovery options are limited beyond trying again or moving forward. Recommendation: add a clearer branch for “accept manually / replay prompt / retry playback.”

## D. Learner progress, persistence, and sync

### 16. Progress saved locally but not yet synced

- **What it is:** The learner completes work, but the device has not yet posted queued events upstream.
- **Likely causes:** Offline state, transient API failure, retry window, or backend sync outage.
- **User-visible behavior:** Tablet indicates pending sync / queue status rather than pretending the backend already accepted the activity.
- **Expected outcome in the app/LMS:** Learner momentum is preserved locally; backend truth catches up later when sync resumes.
- **Backend/system impact:** Temporary reporting lag in LMS dashboards, rewards, and progression boards.
- **Current handling status:** **Handled**
- **Notes / recommendations:** This is the intended offline-first behavior. Recommendation: in LMS reporting, call out data freshness so lag is visible but not alarming.

### 17. Sync attempt fails after local work was recorded

- **What it is:** Queued progress events exist, but the latest sync push to backend fails.
- **Likely causes:** API outage, validation failure, auth/config drift, or backend write error.
- **User-visible behavior:** Tablet backend detail/status mentions failed sync attempt and pending queue remains.
- **Expected outcome in the app/LMS:** Events stay queued for later retry instead of being silently dropped.
- **Backend/system impact:** No immediate LMS reflection of the work; queue growth can increase operator anxiety if prolonged.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Current status model is solid. Recommendation: add warning thresholds for “queue too old / too large.”

### 18. Resume-from-backend session points to lesson no longer available locally

- **What it is:** Backend says a learner has resumable session progress, but the referenced lesson cannot be resolved on the tablet.
- **Likely causes:** Lesson deleted, assignment changed, stale backend session, or device content lag.
- **User-visible behavior:** Resume path may be absent or less useful even though backend history implies there is something resumable.
- **Expected outcome in the app/LMS:** Facilitator may need to relaunch the closest available lesson manually instead of true resume.
- **Backend/system impact:** Session continuity becomes approximate rather than exact.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** The app does sensible lookup work, but end-to-end resilience still depends on lesson availability. Recommendation: add explicit orphaned-session messaging when resume records cannot be matched.

### 19. Local profile save succeeds while backend registration is unavailable

- **What it is:** A new learner profile or edit is captured on tablet even though the backend cannot accept it immediately.
- **Likely causes:** Backend outage or offline registration path.
- **User-visible behavior:** The app reports that the profile was saved locally because backend sync was unavailable.
- **Expected outcome in the app/LMS:** Operator can continue using the tablet without losing registration intent.
- **Backend/system impact:** Backend/LMS learner roster remains behind until sync/registration succeeds upstream.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Good fallback. Recommendation: show unsynced learner roster entries distinctly in both tablet and future LMS reconciliation views.

## E. Learner registration, roster, and launch safety

### 20. No learners registered on the tablet when a lesson is launched

- **What it is:** A facilitator tries to start a lesson before at least one learner profile exists locally.
- **Likely causes:** Fresh install, unsynced device, or operator skipped registration.
- **User-visible behavior:** The app blocks the launch with guidance to register the first learner instead of leaving a blank chooser.
- **Expected outcome in the app/LMS:** Operators are redirected into a safe setup step rather than a confusing dead end.
- **Backend/system impact:** No lesson session is created until roster preconditions exist.
- **Current handling status:** **Handled**
- **Notes / recommendations:** This is the right kind of hard stop. Recommendation: keep it explicit and never allow a “ghost learner” launch.

### 21. Learner roster/data is present locally but stale versus LMS

- **What it is:** Tablet learner cards exist, but mallam assignment, cohort, or linked lessons have changed upstream.
- **Likely causes:** Delayed sync, cached roster, offline edits, or backend update after last device fetch.
- **User-visible behavior:** Profile and assignment views may lag behind current LMS state until sync succeeds.
- **Expected outcome in the app/LMS:** Operators can still work with the local roster, but should expect eventual reconciliation.
- **Backend/system impact:** Short-term mismatch between device action and LMS oversight views.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** The system is resilient but not magically real-time while offline. Recommendation: include “last roster refresh” metadata near learner cards.

## F. LMS page-level degraded states and admin visibility gaps

### 22. LMS pages load in degraded mode because one or more data feeds are unavailable

- **What it is:** An LMS route renders, but one or more upstream feeds fail and the page falls back to partial data.
- **Likely causes:** API/feed timeout, service partial outage, or backend query failure for that route.
- **User-visible behavior:** Pages such as Assignments, Attendance, Assessments, Progress, and Settings explicitly show degraded-mode banners naming failed sources.
- **Expected outcome in the app/LMS:** Admins still get a usable page instead of a total blank/fatal error, but must treat the view as incomplete.
- **Backend/system impact:** Decision quality drops if users miss the banner; some actions may be based on partial evidence.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Grounded in current route copy. Recommendation: standardize severity and freshness badges across all LMS pages so degraded mode is impossible to miss.

### 23. LMS operator mistakes partial data for complete truth

- **What it is:** The page technically loads, but admins act on incomplete/degraded data as if nothing is wrong.
- **Likely causes:** Banner blindness, hurried ops work, or inconsistent degraded-state styling across pages.
- **User-visible behavior:** No software crash; the failure is human interpretation of a partial UI.
- **Expected outcome in the app/LMS:** Potentially wrong intervention, reporting, or assignment decisions.
- **Backend/system impact:** Operational mistakes, especially in attendance/progress/rewards correction contexts.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** The system surfaces degradation, but humans still miss banners. Recommendation: add stronger page-level status chips and export warnings when data is partial.

### 24. Guide/documentation drift versus live LMS behavior

- **What it is:** Admins read a guide that no longer matches the current routes, labels, or release workflow.
- **Likely causes:** Fast product changes without doc refresh.
- **User-visible behavior:** Operators cannot find controls where the guide says they live or assume a feature exists in a stronger state than reality.
- **Expected outcome in the app/LMS:** Training friction, longer onboarding, and fake bug reports caused by stale docs.
- **Backend/system impact:** Indirect but real: slower operations and lower trust in documentation.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** This catalog itself is part of the mitigation. Recommendation: keep the live guide route and printable guide family updated in the same change sets as product shifts.

## G. Rewards, progression, and correction workflows

### 25. Reward did not fire automatically after legitimate learner activity

- **What it is:** A learner should have received XP/badge credit, but the automatic path missed it.
- **Likely causes:** Offline gap, sync lag, rule mismatch, or backend reward-processing miss.
- **User-visible behavior:** Learner app/LMS rewards view looks lower than facilitator expectation until corrected.
- **Expected outcome in the app/LMS:** Admins can apply manual XP or badge corrections with reasons.
- **Backend/system impact:** Short-term learner motivation/reporting distortion until corrected; audit trail matters.
- **Current handling status:** **Handled**
- **Notes / recommendations:** Manual correction controls now exist. Recommendation: keep reasons mandatory and visible in audit history.

### 26. Manual reward correction is used as a substitute for mastery/progression logic

- **What it is:** Operators use rewards admin controls to paper over curriculum/progression problems.
- **Likely causes:** Pressure to show progress, misunderstanding of rewards role, or weak release/assessment hygiene.
- **User-visible behavior:** Learner gets points/badges, but real readiness or assessment evidence still does not exist.
- **Expected outcome in the app/LMS:** The UI allows the action, but documentation explicitly says not to use rewards as fake readiness.
- **Backend/system impact:** Corrupts trust in progression, donor reporting, and learner status interpretation.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** This is mostly a governance problem. Recommendation: add sharper LMS copy or policy checks when manual corrections are unusually large or frequent.

### 27. Progression override or correction decisions are not legible later

- **What it is:** A learner status changes, but future admins cannot easily tell whether it came from assessed mastery, manual correction, or degraded/offline recovery.
- **Likely causes:** Weak audit narratives, partial metadata, or inconsistent reason capture.
- **User-visible behavior:** Current state looks real, but its provenance is fuzzy.
- **Expected outcome in the app/LMS:** Operators may have to investigate across multiple surfaces to reconstruct what happened.
- **Backend/system impact:** Poor auditability and harder QA/UAT review.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** Manual rewards reasons exist, which helps. Recommendation: extend the same discipline to progression overrides and recovery actions where possible.

## H. Reporting, analytics, and export confidence

### 28. Reports reflect lagged learner reality because sync backlog exists

- **What it is:** The LMS reporting layer is technically healthy, but the underlying learner activity has not all reached the backend yet.
- **Likely causes:** Offline-first delivery, queued sync events, rural connectivity gaps, or delayed tablet reconnection.
- **User-visible behavior:** Admins see lower attendance/progress/reward numbers than facilitators expect from recent on-ground activity.
- **Expected outcome in the app/LMS:** The system eventually catches up after sync, but near-real-time confidence is limited.
- **Backend/system impact:** Program dashboards and external reporting can temporarily understate activity.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** This is an inherent trade-off in offline-first systems. Recommendation: make data-freshness timestamps unavoidable in analytics and export surfaces.

### 29. External/donor-ready reporting is generated from incomplete operational evidence

- **What it is:** A report is shareable in format, but the underlying evidence is partial due to degraded feeds or sync lag.
- **Likely causes:** Same-day export during outage/lag, ignored degraded banners, or incomplete upstream sync.
- **User-visible behavior:** The report looks polished, which is exactly why this failure mode is dangerous.
- **Expected outcome in the app/LMS:** There is no automatic guarantee that every export is fully current unless users pay attention to source health and freshness.
- **Backend/system impact:** Reputational risk and bad downstream decisions by NGO/ministry stakeholders.
- **Current handling status:** **Partially handled**
- **Notes / recommendations:** Strong recommendation: watermark/export-note any report generated while source freshness or feed completeness is compromised.

---

## Coverage summary

Across the current implementation, Lumo is already doing several smart things right:

- it preserves learner continuity with local persistence and sync queues,
- it uses explicit degraded/offline messaging instead of pretending everything is fine,
- it falls back from live transcript help to saved-audio/manual confirmation rather than killing the lesson,
- it protects learner sessions during lifecycle interruptions, and
- it exposes release blockers and assessment-gate gaps in LMS content operations.

The biggest remaining weak spots are not the obvious crash paths. They are the **credibility gaps**:

- when stale data looks current,
- when partial LMS views are mistaken for complete truth,
- when manual corrections can mask upstream quality problems, and
- when reports are polished before their freshness is questioned.

That is where operators get burned.

---

## Suggested maintenance pattern

When learner runtime, sync behavior, LMS degraded states, release policy, rewards correction flows, or reporting/export logic changes, update this catalog together with:

- `docs/LMS_DASHBOARD_GUIDE.md`
- `docs/LMS_DASHBOARD_GUIDE.html`
- `apps/lms-web/app/guide/page.tsx`

Keep the Markdown file as the maintainable source and the HTML file as the printable/shareable artifact.
