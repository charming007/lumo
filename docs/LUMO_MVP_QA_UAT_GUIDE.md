# Lumo MVP QA / UAT Guide

_Last updated: 2026-04-14_

A practical test guide for validating the **Lumo MVP** across the **LMS** and the **learner tablet app**.

**Audience:** QA, product, delivery leads, pilot staff, curriculum ops, implementation partners, and anyone doing structured acceptance testing before demo, pilot, or release.

**Format:** this Markdown file is the maintainable source. Export and sync the matching HTML file (`docs/LUMO_MVP_QA_UAT_GUIDE.html` and `apps/lms-web/public/LUMO_MVP_QA_UAT_GUIDE.html`) for browser-based review and PDF export.

**Related appendix:** see `docs/LUMO_POSITIONING_BRIEF.md` and `docs/LUMO_POSITIONING_BRIEF.html` for the concise investor / implementation-partner positioning brief that sits alongside this QA/UAT guide family.

---

## 1) Purpose and testing posture

This guide is for **real MVP validation**, not decorative box-ticking.

Use it to confirm that:

- the LMS can create and manage the curriculum structure,
- lesson authoring surfaces work without dead ends,
- assignments and delivery flows make sense,
- learner profiles and sessions work in the tablet app,
- progress / rewards / reporting reflect believable system outcomes,
- LMS actions and learner runtime connect end-to-end.

### Recommended testing posture

- Test with **at least one admin account** in the LMS.
- Test with **at least one learner profile** in the learner tablet app.
- Prefer **one clean scenario** from content creation to learner completion before exploring edge cases.
- Capture evidence with screenshots, short notes, and exact route / screen names.
- Mark failures clearly as **blocker**, **major**, or **minor**.

---

## 2) MVP areas in scope

### LMS surfaces in scope

- Dashboard
- Learners / Students
- Mallams
- Content Library
- English Studio
- Lesson Studio / lesson editor
- Assignments
- Progress
- Reports
- Rewards
- Settings / policy checks where relevant

### Learner app areas in scope

- Learner selection / registration flow
- Subject and module visibility
- Lesson opening and progression
- Audio / prompt / choice interaction
- Completion summaries
- Progress persistence
- Sync / delayed sync behavior where available

---

## 3) Test environment checklist

Before running UAT, confirm:

- LMS is reachable in browser.
- Learner app build is installed and launches.
- Backend / seed data is available.
- At least one active subject, strand, module, and lesson exist.
- At least one mallam / pod / learner record exists.
- If testing rewards, a learner path exists that can trigger visible progression or XP changes.
- If testing sync recovery, you know whether you are using live backend data, fallback content, or cached local state.

### Minimum evidence to collect per bug

- Date / tester name
- Surface: LMS or Learner App
- Route / screen
- Exact steps to reproduce
- Expected result
- Actual result
- Screenshot or screen recording
- Severity
- Device / browser / build details

---

## 4) Fast smoke test

Use this before a demo or before doing the deeper checklist.

1. Open LMS dashboard.
2. Open Content Library and confirm subject → strand → module → lesson structure renders.
3. Create or edit a lesson without the screen going blank.
4. Confirm the lesson appears in the right module.
5. Open English Studio and confirm authoring / readiness context loads.
6. Open learner app and select a learner.
7. Confirm expected subjects appear and no ghost / stale content is shown.
8. Open an assigned lesson.
9. Complete one interactive or guided activity.
10. Confirm completion / progress updates appear somewhere believable in LMS or local learner state.

If this smoke test fails, stop pretending the release is healthy and fix the blocker first.

---

## 5) LMS test scenarios

## 5.1 Dashboard and operational visibility

### Goal
Confirm the LMS landing view loads and gives believable operational signals.

### Test tasks

1. Open the Dashboard.
2. Review KPI cards and confirm they render without layout breakage.
3. Review operations / escalations / learner workboard sections.
4. Open at least one downstream route from the dashboard, such as learners, content, reports, or mallam detail.

### Expected outcome

- Dashboard loads without errors or blank sections.
- KPI cards show values or honest empty states.
- Linked routes open correctly.
- No broken navigation, missing styles, or overlapping panels.

### Pass / fail

- **Pass:** dashboard is readable, linked, and credible.
- **Fail:** blank page, hard error, nonsense metrics, or broken route links.

---

## 5.2 Content Library structure management

### Goal
Confirm curriculum structure can be reviewed and managed cleanly.

### Test tasks

1. Open Content Library.
2. Confirm subjects render as separate lanes or boards.
3. Expand a subject and inspect strands, modules, lessons, and assessment gate details.
4. Use available filters / search to find a module or lesson.
5. Create or edit one content item if permissions allow.
6. Confirm the edited item lands in the correct hierarchy.

### Expected outcome

- Subject, strand, module, and lesson hierarchy is clear.
- Search / filters reduce the board correctly.
- Create / edit actions complete successfully.
- No duplicate, orphaned, or misplaced content appears after save.

### Pass / fail

- **Pass:** hierarchy is correct and CRUD actions return to a stable view.
- **Fail:** content disappears, duplicates, lands in wrong parent, or causes blank screens.

---

## 5.3 English Studio authoring and readiness

### Goal
Confirm English lesson authoring context is usable and grounded in live curriculum structure.

### Test tasks

1. Open English Studio.
2. Select or inspect an English lesson / blueprint.
3. Review activity spine, readiness checks, objectives, vocabulary, and blocker messaging.
4. Edit a lesson blueprint field if supported.
5. Save and confirm the lesson still appears correctly in the broader content flow.

### Expected outcome

- English Studio loads with real lesson context.
- Readiness checks and blockers are visible.
- Save flow completes without route breakage.
- The lesson remains linked to the correct module / structure.

### Pass / fail

- **Pass:** English authoring is useful, stable, and structurally connected.
- **Fail:** blank editor, missing content context, save failure, or detached lesson state.

---

## 5.4 Lesson Studio / interactive authoring

### Goal
Confirm full lesson authoring works for structured and option-based lessons.

### Test tasks

1. Open Lesson Studio from create-new or edit-existing route.
2. Confirm lesson metadata loads: title, duration, mode, objectives, assessment fields.
3. Add or edit activity steps.
4. For an option-based step, confirm choices and correct answer configuration can be entered.
5. Save changes.
6. Re-open the lesson and verify the authored data persists.

### Expected outcome

- Full lesson editor loads with no blank-page failure.
- Activity steps are editable.
- Option-based content can be represented clearly.
- Saved lesson remains accessible afterward.

### Pass / fail

- **Pass:** lesson editing works and persists cleanly.
- **Fail:** save breaks route, authored structure is lost, or editor becomes unusable.

---

## 5.5 Assignments and delivery setup

### Goal
Confirm content can be assigned to the right delivery targets.

### Test tasks

1. Open Assignments.
2. Create or inspect an assignment tied to a real lesson or module.
3. Confirm learner group / pod / mallam targeting fields are meaningful.
4. Save the assignment.
5. Verify the assignment appears in relevant LMS views.

### Expected outcome

- Assignment form loads.
- Assignment is linked to real content.
- Assignment appears after save with believable status and due context.

### Pass / fail

- **Pass:** assignment is visible, structurally valid, and targetable.
- **Fail:** assignment cannot be saved, loses content link, or never appears in delivery views.

---

## 5.6 Reports, progress, and rewards

### Goal
Confirm learner evidence and admin reporting surfaces behave like one system.

### Test tasks

1. Open Reports and confirm cards / tables render.
2. Open Progress and inspect learner or module progression states.
3. Open Rewards and inspect XP, badges, levels, or reward transactions.
4. If a learner session was completed during testing, confirm some downstream signal reflects that work.

### Expected outcome

- Reporting surfaces load.
- Progress and rewards views show stable data or honest empty states.
- If learner activity was completed, at least one downstream indicator changes or is clearly queued for sync.

### Pass / fail

- **Pass:** progress evidence is believable and views are navigable.
- **Fail:** system surfaces contradict each other or show stale / impossible state.

---

## 6) Learner app test scenarios

## 6.1 App launch and learner selection

### Goal
Confirm the tablet app opens cleanly and supports selecting the correct learner.

### Test tasks

1. Launch learner tablet app.
2. Confirm the home / roster / learner selection flow renders.
3. Select an existing learner or complete registration flow if required.
4. Confirm the learner lands on a usable home / subject view.

### Expected outcome

- App launches without crash.
- Learner list or registration flow is readable.
- Mallam / pod / learner selection does not dead-end.

### Pass / fail

- **Pass:** learner can be selected and continue into content.
- **Fail:** crash, blocked selection, missing registration options, or layout overflow that blocks progress.

---

## 6.2 Subject and module visibility

### Goal
Confirm the learner sees the right curriculum inventory.

### Test tasks

1. Inspect visible subjects on the learner home or curriculum screen.
2. Compare against expected live LMS / backend content.
3. Open one subject and inspect modules / lessons.

### Expected outcome

- Only expected subjects appear.
- No stale demo content or ghost subjects appear.
- Visible lessons map back to actual LMS / backend structure.

### Pass / fail

- **Pass:** learner inventory matches live curriculum reality.
- **Fail:** ghost content, stale cache residue, duplicate subjects, or missing assigned material.

---

## 6.3 Lesson playback and interaction

### Goal
Confirm a learner can open and work through a lesson.

### Test tasks

1. Open an assigned or available lesson.
2. Confirm prompts, instructions, and controls are visible.
3. Complete at least one response using the intended interaction mode: listening, speaking, tapping, or choice selection.
4. Continue through the next step.

### Expected outcome

- Lesson opens without crash.
- Prompt / media / options render.
- Responses can be submitted.
- App advances or gives feedback appropriately.

### Pass / fail

- **Pass:** learner completes meaningful interaction without being trapped.
- **Fail:** lesson cannot open, controls break, or progression is blocked mid-flow.

---

## 6.4 Completion, persistence, and recovery

### Goal
Confirm learner work survives normal app interruptions.

### Test tasks

1. Start a lesson.
2. Partway through, background the app or navigate away if safe.
3. Re-open the app.
4. Confirm the session resumes sensibly or returns with a clear recovery state.
5. Complete the lesson.

### Expected outcome

- App recovery is stable.
- Session does not corrupt into duplicate, frozen, or misleading state.
- Completion still records correctly after recovery.

### Pass / fail

- **Pass:** resumption is controlled and understandable.
- **Fail:** duplicate sessions, auto-resume loops, lost progress, or broken state after return.

---

## 7) End-to-end test flows

## 7.1 Flow A — create content in LMS and validate it in learner app

### Steps

1. In LMS, create or edit a lesson in the correct module.
2. Confirm lesson status is valid for delivery.
3. Create or confirm an assignment tied to that lesson.
4. Open learner app with the targeted learner.
5. Confirm the lesson appears in the appropriate curriculum path.
6. Open and complete the lesson.

### Expected outcome

- LMS-authored content becomes visible in the learner path.
- Learner can complete the activity.
- No ghost or stale content overrides the intended lesson.

### Pass / fail

- **Pass:** authored content flows into learner runtime.
- **Fail:** content stays trapped in LMS, disappears, or learner sees something else.

---

## 7.2 Flow B — learner completes work and LMS reflects believable evidence

### Steps

1. Complete a lesson in the learner app.
2. Return to LMS.
3. Check learner progress, relevant reports, and rewards / progression surfaces.
4. Confirm at least one downstream state reflects the learner activity.

### Expected outcome

- LMS shows updated learner evidence immediately or after expected sync delay.
- Reports / progress / rewards do not contradict one another.

### Pass / fail

- **Pass:** learner activity produces believable evidence in admin surfaces.
- **Fail:** learner completion vanishes or LMS surfaces remain inconsistent.

---

## 7.3 Flow C — issue recovery and operator trust

### Steps

1. Create a situation with temporary interruption: refresh, route away, background app, or re-open a route.
2. Return to the prior LMS or learner context.
3. Confirm the system recovers with clear state and without hidden corruption.

### Expected outcome

- User can continue or recover without guessing.
- No blank pages, duplicate records, or fake-success states appear.

### Pass / fail

- **Pass:** recovery feels controlled.
- **Fail:** state becomes misleading or unrecoverable.

---

## 8) Pass / fail rating model

### Release blocker

Use **blocker** when any of the following is true:

- blank page or route crash,
- learner cannot launch or open lessons,
- authored content cannot be saved or reopened,
- LMS and learner app are disconnected for core flow,
- data corruption or impossible state is visible.

### Major issue

Use **major** when:

- core flow technically works but is unreliable,
- layout or workflow confusion causes serious operator risk,
- progress / reward / report evidence is inconsistent,
- a workaround exists but is not acceptable for pilot confidence.

### Minor issue

Use **minor** when:

- copy is unclear,
- styling is rough,
- non-critical route polish is missing,
- issue does not block successful completion of core MVP flows.

---

## 9) Troubleshooting notes

### If the learner app shows ghost or stale content

Check:

- local cached learner state,
- fallback / seed data,
- whether deprecated demo subjects or modules are still persisted,
- whether assignment or bootstrap data was refreshed.

### If a lesson exists in LMS but not in the learner app

Check:

- lesson status / publish readiness,
- assignment existence,
- learner targeting,
- backend sync availability,
- stale app cache or offline persistence.

### If LMS editor pages go blank

Check:

- whether create / edit route returns the saved lesson id correctly,
- whether the lesson record contains required structure,
- whether a modal or layout overlay is masking the page,
- browser console for front-end route or data shape errors.

### If reports or rewards look wrong

Check:

- whether learner completion actually persisted,
- whether sync is delayed,
- whether correction / revocation logic changed the visible totals,
- whether you are comparing live data with stale screenshots or expectations.

---

## 10) Issue capture template

Use this format when logging defects during QA / UAT.

### Bug title

Short and specific. Example: `Learner app shows stale Story Time subject after live bootstrap refresh`

### Template

- **ID:** UAT-___
- **Area:** LMS / Learner App / End-to-end
- **Severity:** Blocker / Major / Minor
- **Environment:** browser / device / build
- **Preconditions:**
- **Steps to reproduce:**
  1. 
  2. 
  3. 
- **Expected result:**
- **Actual result:**
- **Evidence:** screenshot / recording / log
- **Owner:**
- **Status:** Open / In progress / Fixed / Retest / Closed

---

## 11) Recommended sign-off checklist

Do not sign off the MVP unless the answer is honestly **yes** to all of these:

- Can an admin navigate the LMS without route failures?
- Can curriculum structure be reviewed and edited safely?
- Can an English or interactive lesson be authored and re-opened?
- Can a learner open and complete a real lesson?
- Does the learner app show the right content, not stale nonsense?
- Does at least one end-to-end content-to-delivery-to-evidence flow work?
- Are blocker and major defects either fixed or explicitly accepted?

If not, it is not sign-off. It is wishful thinking with better typography.

---

## 12) Appendix — positioning brief for investors and implementation partners

For a concise one-page summary of what Lumo is, why the product is voice-first and facilitator-aware, where the strongest target market sits, what is differentiated, the main risks, and what still needs hardening, see:

- `docs/LUMO_POSITIONING_BRIEF.md`
- `docs/LUMO_POSITIONING_BRIEF.html`
- `apps/lms-web/public/LUMO_POSITIONING_BRIEF.html`
