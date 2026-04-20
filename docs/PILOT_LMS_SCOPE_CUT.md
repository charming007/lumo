# Pilot LMS Scope Cut Recommendation

## Verdict

Yes — the current LMS/admin surface is too broad for pilot.

The codebase already exposes a large operator surface (`/`, `/canvas`, `/content`, `/english`, `/assignments`, `/attendance`, `/progress`, `/mallams`, `/pods`, `/reports`, `/rewards`, `/settings`, `/guide`) plus deep create/edit/delete workflows. For a pilot, that is more surface area than the core operating loop needs, and it creates exactly the kind of degraded-mode / false-confidence risk the app is already trying hard to defend against.

For pilot, Lumo should narrow the LMS to one job:

1. create curriculum,
2. control publish readiness,
3. assign delivery,
4. verify learner/app sync trust,
5. observe operations enough to intervene.

Everything else should be treated as secondary, hidden, or deferred.

---

## Keep for pilot

### 1) Content Library (`/content`) — **keep as the primary authoring + release surface**
Keep because it already covers the pilot-critical content loop:
- create subjects/modules/lessons/assessment gates,
- see release blockers,
- track draft vs published state,
- connect content to assignments.

Why it stays:
- It is the clearest place in the current codebase for curriculum creation and publishing control.
- It already encodes the right pilot discipline: blocked modules, missing lesson gaps, missing assessment gates, draft-state checks.
- This is the right “source of truth” admin route for pilot content ops.

Pilot constraint:
- Treat `/content` as the single curriculum control plane.
- Do **not** split authoring responsibility across `/content`, `/canvas`, and `/english` during pilot.

### 2) Assignments (`/assignments`) — **keep**
Keep because pilot delivery needs:
- who gets what,
- when it is due,
- who owns it,
- reassignment when delivery slips.

Why it stays:
- It is directly tied to operational delivery.
- It exposes due dates, overdue work, mallam load, pod assignment gaps, and reassignment.
- This is core pilot workflow, not optional admin garnish.

### 3) Dashboard (`/`) — **keep, but only as a thin operational front door**
Keep because the pilot needs one landing page for:
- live readiness,
- workboard/watchlist,
- assignment pressure,
- mallam coverage,
- sync/deployment trust signal.

Why it stays:
- It is the most useful single-glance operator surface.
- The deployment-blocking logic is aligned with pilot reality: if critical feeds are down, the page should scream, not smile.

Pilot constraint:
- Keep it as a summary + handoff page.
- Do **not** let it become a second reporting suite or a second curriculum board.

### 4) Progress (`/progress`) or learner-risk detail — **keep in a minimal form**
Keep because the pilot needs to know:
- who is ready,
- who is watchlisted,
- where intervention is needed.

Why it stays:
- Learner/app sync trust is not enough by itself; operators need a simple risk/intervention board.
- This supports progression and triage without needing the full analytics/rewards stack.

Pilot constraint:
- Keep only the intervention view and progression status needed for active operations.
- Avoid turning it into a full analytics warehouse.

### 5) Settings (`/settings`) — **keep only the trust/integrity/storage subset**
Keep because the pilot absolutely needs operational observability around:
- storage persistence,
- backups,
- integrity issues,
- runtime/storage health,
- asset runtime readiness.

Why it stays:
- This is where sync trust and backend trust are made visible.
- For offline-first pilot work, honest persistence/integrity visibility matters more than most fancy admin UI.

Pilot constraint:
- Keep only trust-center / storage / integrity / asset-runtime checks.
- Defer broad reward/admin/policy control from this page.

---

## Cut or defer for pilot

### 1) English Studio (`/english`) — **defer as a separate route**
Reason:
- It duplicates content authoring and release planning already present in `/content`.
- It adds a second curriculum planning surface with its own readiness board, release queue, blueprint model, and quick-authoring flow.
- For pilot, that is dangerous duplication: two places to decide whether content is ready.

Pilot move:
- Fold any genuinely useful English-specific templates into `/content` or lesson creation.
- Do not operate a separate English control room during pilot.

### 2) Curriculum Canvas (`/canvas`) — **defer or hide from pilot operators**
Reason:
- It appears to be a second structural content visualization layer.
- Pilot operators do not need multiple curriculum-map metaphors to ship content safely.
- More content views means more chance of disagreement between routes and more degraded-mode exposure.

Pilot move:
- Keep underlying code if useful for internal design.
- Hide from pilot navigation and training.

### 3) Rewards (`/rewards`) — **defer**
Reason:
- It is a large admin surface: leaderboard, queue triage, manual adjustments, badge catalog, level ladder, exports.
- It introduces manual write power and incentive-policy complexity that are not required to prove the core pilot loop.
- It creates more trust-sensitive feeds and more operator decision branches.

Pilot move:
- If learner motivation mechanics matter, keep them app-side with minimal/no admin control.
- Defer full reward ops, queue management, manual adjustments, and export tooling until after pilot learning outcomes are proven.

### 4) Reports (`/reports`) — **defer the broad stakeholder/export suite**
Reason:
- The route is huge: donor narratives, government/compliance readouts, exports, JSON/CSV snapshots, NGO summaries, operations hotlists, subject breakdowns, mallam contribution boards, pod matrices.
- This is useful later, but for pilot it is too much reporting theater around a system that still needs operational focus.
- A lot of this overlaps with dashboard + progress + settings trust signals.

Pilot move:
- Keep only the small set of metrics required for internal pilot review.
- Defer donor/government-ready narrative packs, share/export tooling, and broad reporting decks.

### 5) Attendance (`/attendance`) — **defer as a standalone route unless it is the only way attendance is visible**
Reason:
- Attendance is important, but a dedicated surface is not obviously essential if the pilot already gets attendance signal via dashboard/progress/reports summaries.
- Standalone attendance ops adds another place to train operators and another feed to keep trustworthy.

Pilot move:
- Keep attendance visible in summary/risk views.
- Defer a full standalone attendance workflow unless field ops specifically depend on it daily.

### 6) Pods (`/pods`) and Mallams (`/mallams`) — **defer as standalone management surfaces unless required for roster changes**
Reason:
- Pod and mallam visibility matters, but full separate management routes may be more than the pilot needs.
- For pilot, assignment and progress views already surface enough pod/mallam context for operational decisions.

Pilot move:
- Keep pod and mallam context embedded in dashboard/assignments/progress.
- Only keep standalone pages if they are required for actual roster editing or troubleshooting in live pilot ops.

### 7) Guide (`/guide`) and large tutorial/documentation surface — **deprioritize in-product**
Reason:
- Helpful, but not core pilot functionality.
- The repo already contains extensive guides, fallback catalogs, printable docs, and tutorial packs. That is fine as docs, but it should not expand the live product surface operators depend on.

Pilot move:
- Keep docs in `docs/`.
- Do not make the pilot admin depend on a heavy in-product documentation route.

---

## Recommended pilot navigation

If Lumo were cut to the bones for pilot, navigation should roughly collapse to:
- Dashboard
- Content
- Assignments
- Progress
- Settings

Optional, hidden behind internal/admin flags only:
- Mallams
- Pods
- Attendance

Deferred/internal only:
- English
- Canvas
- Rewards
- Reports
- Guide

---

## Why this cut is the right one

### 1) Too many overlapping truth surfaces
Right now the repo has multiple routes that can speak about:
- content readiness,
- learner readiness,
- operator readiness,
- release safety,
- trust state.

That is great for a mature system. For a pilot, it is a liability.

### 2) The codebase already shows degraded-mode anxiety
A lot of LMS code is explicitly defending against fake-empty or fake-healthy states. That is a clue. The surface is large enough that the team already knows trust can fracture across routes.

Best fix for pilot is not just better degraded copy. It is fewer surfaces that can degrade.

### 3) Training burden matters
A pilot succeeds when field operators can reliably do a small number of things well. Teaching operators to navigate content library vs English studio vs canvas vs reports vs rewards vs settings is too much unless those surfaces are truly indispensable.

### 4) Manual admin power is risk
Rewards adjustments, exports, multiple reporting narratives, deep settings actions, delete flows, duplicate authoring paths — all of that increases the chance of human error before the core learner loop is proven.

---

## Pilot operating model

### Source of truth by domain
- **Curriculum + publish readiness:** `/content`
- **Delivery assignment:** `/assignments`
- **Daily operational scan:** `/`
- **Learner intervention / progression risk:** `/progress`
- **Sync trust / storage / integrity:** `/settings`

Anything outside that should be considered nonessential for pilot.

---

## Concrete implementation recommendation

1. Keep building and hardening:
   - `/content`
   - `/assignments`
   - `/`
   - `/progress`
   - trust subset of `/settings`

2. Hide or feature-flag from primary nav for pilot:
   - `/english`
   - `/canvas`
   - `/rewards`
   - `/reports`
   - `/guide`

3. Potentially hide too unless live ops proves they are needed:
   - `/attendance`
   - `/mallams`
   - `/pods`

4. Make the pilot promise explicit:
   - one curriculum surface,
   - one assignment surface,
   - one daily ops summary,
   - one learner intervention view,
   - one trust/health view.

That is enough.

---

## Bottom line

For pilot, Lumo should optimize for operational trust and execution discipline, not admin completeness.

The system should feel almost boring:
- create content,
- block bad publish,
- assign delivery,
- verify sync/backend trust,
- watch who needs help.

Everything else is likely premature surface area.
