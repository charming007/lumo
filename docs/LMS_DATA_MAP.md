# Lumo LMS Data Map

_Last updated: 2026-04-14_

A clean map of **what data the LMS currently shows**, organized by surface, with an explicit note on **where each datum comes from today** or **where it is clearly intended to come from**.

**Audience:** product, engineering, curriculum ops, implementation leads, QA, and anyone trying to separate live system truth from seeded/demo scaffolding.

**Companion docs:**
- `docs/LMS_DASHBOARD_GUIDE.md` / `.html` — operator-facing walkthrough
- `docs/LMS_FALLBACK_FAILURE_CATALOG.md` / `.html` — degraded/offline/failure behaviors
- `docs/LUMO_MVP_QA_UAT_GUIDE.md` / `.html` — structured test flows

---

## 1) Reading this map

Each item below is tagged with one or more source labels.

### Source labels used in this document

- **Live backend API** — fetched directly by the LMS from API endpoints under `/api/v1/...`
- **Learner-app runtime / sync** — data ultimately produced by the learner tablet app bootstrap, session, registration, or sync-event flows, then surfaced back through LMS/reporting APIs
- **Derived rollup in LMS UI** — calculated in the web app from already-fetched records
- **Derived rollup in backend/report API** — calculated by backend reporting/dashboard endpoints before the LMS receives it
- **Seeded / demo / environment metadata** — seeded records or environment/meta summaries intended for pilot/demo/bootstrap visibility
- **Static guidance text** — explanatory copy, labels, operator hints, and UX help text hardcoded in the LMS
- **Placeholder / graceful fallback** — explicit empty-state, degraded-mode, or backup values shown when feeds fail or are absent

### Core live LMS feeds referenced across surfaces

The LMS web app fetches the following primary feeds from `apps/lms-web/lib/api.ts`:

- `/api/v1/meta`
- `/api/v1/dashboard/summary`
- `/api/v1/dashboard/insights`
- `/api/v1/dashboard/workboard`
- `/api/v1/students`
- `/api/v1/students/:id`
- `/api/v1/mallams`
- `/api/v1/mallams/:id`
- `/api/v1/attendance`
- `/api/v1/assignments`
- `/api/v1/curriculum/modules`
- `/api/v1/lessons`
- `/api/v1/lessons/:id`
- `/api/v1/subjects`
- `/api/v1/strands`
- `/api/v1/assessments`
- `/api/v1/pods`
- `/api/v1/progress`
- `/api/v1/cohorts`
- `/api/v1/centers`
- `/api/v1/rewards/catalog`
- `/api/v1/rewards/leaderboard`
- `/api/v1/rewards/requests`
- `/api/v1/reports/overview`
- `/api/v1/reports/rewards`
- `/api/v1/reports/operations`
- `/api/v1/reports/ngo-summary`
- `/api/v1/admin/storage/status`
- `/api/v1/admin/storage/integrity`
- `/api/v1/admin/storage/backups`

### Learner app signals that matter upstream

The learner tablet app currently talks to these backend contracts from `apps/learner-tablet/lib/api_client.dart`:

- `/api/v1/learner-app/bootstrap`
- `/api/v1/learner-app/learners`
- `/api/v1/learner-app/modules/:id`
- `/api/v1/learner-app/sessions`
- `/api/v1/learner-app/sync`

That means some LMS reporting/runtime surfaces are not authored inside the LMS itself; they are **downstream views of learner-app behavior**, especially around sessions, sync, completion, and operational reporting.

---

## 2) System-wide data lineage at a glance

### Curriculum + release spine

**Subjects → Strands → Modules → Lessons → Assessment gates**
- **Current source:** Live backend APIs
- **LMS feeds:** `/subjects`, `/strands`, `/curriculum/modules`, `/lessons`, `/assessments`
- **Used in:** Content Library, English Studio, Dashboard blocker views, Assignments, Progress capture, Reports

### Delivery + roster spine

**Learners / cohorts / pods / mallams / centers / assignments**
- **Current source:** Live backend APIs
- **LMS feeds:** `/students`, `/cohorts`, `/pods`, `/mallams`, `/centers`, `/assignments`
- **Used in:** Dashboard, Learners, Mallams, Assignments, Rewards filters, Reports, Progress filters

### Runtime + progression spine

**Progress / workboard / runtime reporting / sync health / reward operations**
- **Current source:** Mixed
  - live backend APIs
  - backend rollups
  - learner-app runtime/sync inputs upstream of those rollups
- **LMS feeds:** `/progress`, `/dashboard/workboard`, `/reports/operations`, `/reports/rewards`, `/reports/ngo-summary`, `/dashboard/summary`
- **Used in:** Dashboard, Learners, Progress, Rewards, Reports, Settings

### Environment + admin ops spine

**Meta / storage mode / backups / integrity / seed summary**
- **Current source:** Live admin APIs plus seeded/environment metadata
- **LMS feeds:** `/meta`, `/admin/storage/status`, `/admin/storage/integrity`, `/admin/storage/backups`
- **Used in:** Settings

---

## 3) Surface-by-surface data map

## 3.1 Dashboard (`/`)

### KPI strip

- **Active learners**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Mallams**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Active pods**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Ready to progress**
  - **Source:** Live backend API, likely backed by learner progression/runtime state
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Assignments live**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Assessments live**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Lessons completed**
  - **Source:** Live backend API, likely downstream of learner progress/runtime
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API
- **Sync success**
  - **Source:** Live backend API, likely downstream of learner-app sync events
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API

### Operations pulse card

- **Centers live**
- **Assignments running**
- **Assessment gates active**
- **Learners ready for progression**
  - **Source:** same summary feed as above
  - **Feed:** `/api/v1/dashboard/summary`
  - **Type:** Derived rollup in backend/report API

### Leadership cues

- **Priority**
- **Headline**
- **Detail**
- **Metric**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/dashboard/insights`
  - **Type:** Derived narrative/priority objects produced in backend
- **Fallback insight card**
  - **Source:** Placeholder / graceful fallback
  - **When shown:** insights feed unavailable or empty

### Live assignments table

- **Lesson**
- **Cohort**
- **Pod**
- **Assessment**
- **Due**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/assignments`
  - **Type:** Mostly direct records, rendered as-is
- **Empty/degraded table messages**
  - **Source:** Placeholder / graceful fallback

### Escalations to clear

- **At-risk learners** based on attendance under 85%
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/students`
  - **Logic in LMS:** filters learners where `attendanceRate < 0.85`
- **Training / non-active mallams**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/mallams`
  - **Logic in LMS:** filters mallams where `status !== active`

### Learner workboard

- **Learner**
- **Mallam**
- **Cohort**
- **Attendance**
- **Mastery**
- **Focus area**
- **Progression status**
- **Recommended next module**
  - **Source:** Live backend API, with likely learner-runtime influence upstream
  - **Feed:** `/api/v1/dashboard/workboard`
  - **Type:** Derived rollup in backend/report API

### Content release blockers on dashboard

- **Modules publish-ready**
- **Modules blocked**
- **Missing lesson gaps**
- **Missing assessment gates**
- **Top blocker rows per module**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/curriculum/modules`, `/api/v1/lessons`, `/api/v1/assessments`, `/api/v1/subjects`
  - **Logic in LMS:** compares module lesson target counts to approved/published lessons and checks whether an assessment gate exists

### Static/dashboard-only text

- Section subtitles, guidance copy, degradation warnings, release-risk labels, and call-to-action wording
  - **Source:** Static guidance text

---

## 3.2 Learners (`/students`)

### Top summary cards

- **Learners live**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/students`
- **Below attendance comfort zone**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/students`
  - **Logic:** attendance under 85%
- **Ready to progress**
- **Watchlist**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/dashboard/workboard`

### Learner roster table

- **Learner name**
- **Cohort**
- **Mallam**
- **Pod**
- **Attendance**
- **Level / stage**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/students`
- **Edit/create form options**
  - **Source:** Live backend APIs
  - **Feeds:** `/api/v1/cohorts`, `/api/v1/pods`, `/api/v1/mallams`
- **Add learner unavailable warning**
  - **Source:** Placeholder / graceful fallback

### Learner support queue

- **Learner**
- **Focus area**
- **Attendance**
- **Mastery**
- **Progression**
- **Next module**
  - **Source:** Live backend API, likely downstream of runtime/progression logic
  - **Feed:** `/api/v1/dashboard/workboard`
  - **Type:** Derived rollup in backend/report API

---

## 3.3 Learner detail (`/students/:id`)

### Learner snapshot

- **Cohort**
- **Mallam**
- **Pod**
- **Guardian**
- **Device**
- **Stage**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/students/:id`

### Intervention summary

- **Attendance**
- **Latest mastery**
- **Active assignments**
- **Recommended actions**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/students/:id`
  - **Type:** Mixed direct detail + backend-derived recommendations

### Progress timeline

- **Subject**
- **Module**
- **Mastery**
- **Lessons completed**
- **Progression**
- **Next module**
  - **Source:** Live backend API, likely partially informed by learner-app completion/session sync upstream
  - **Feed:** `/api/v1/students/:id`

### Mallam assignment controls

- **Available mallam choices**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/mallams`
- **If hidden/failing**
  - **Source:** Placeholder / graceful fallback

### Observation form / support notes

- **Intended source/destination:** Live backend write path for learner observations
- **Currently shown data:** observation history from `/api/v1/students/:id`
- **Type:** Live backend API

### Attendance history

- **Date**
- **Status**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/students/:id`
  - **Likely lineage:** could be facilitator/LMS capture and/or learner-runtime attendance capture depending on backend implementation

### Active delivery

- **Assignments for learner**
- **Observation history**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/students/:id`

---

## 3.4 Mallams (`/mallams`)

### Filters

- **Center options**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/centers`
- **Pod options**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/pods`
- **Status / certification values**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/mallams`
  - **Logic:** certification list is built from values present in mallam records

### Deployment coverage card

- **Mallams in scope**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/mallams`
- **Rostered learners**
- **Avg learner attendance**
- **Watchlist learners**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/mallams`, `/api/v1/students`

### Readiness posture card

- **Active now**
- **Still in training**
- **On leave**
- **Pods covered**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/mallams`

### Intervention queue

- **Pressure score**
- **Rostered learners**
- **At-risk learners**
- **Average attendance**
- **Deployment status**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/mallams`, `/api/v1/students`
  - **Logic:** pressure ranking combines at-risk learners, training status, and roster size

### Deployment roster / tabular roster / coverage watchlist

- **Name**
- **Center / region**
- **Pod labels**
- **Roster size**
- **Average attendance**
- **At-risk learners**
- **Certification**
- **Role**
- **Languages**
- **Status**
  - **Source:** Mixed live direct + LMS UI rollups
  - **Feeds:** `/api/v1/mallams`, `/api/v1/students`, `/api/v1/centers`, `/api/v1/pods`

### Static guidance

- Pressure-ranking explanation and “what to look for first” cards
  - **Source:** Static guidance text

---

## 3.5 Mallam detail (`/mallams/:id`)

### Important note

The page is fed by **mallam detail plus student roster context**.

- **Mallam detail** comes from `/api/v1/mallams/:id`
- **Cross-check roster context** comes from `/api/v1/students` and `/api/v1/mallams`

### Surface contents

From the route structure, this page includes:
- **Roster count**
- **Active assignments**
- **Average attendance**
- **Watchlist**
- **Deployment profile / readiness**
- **Roster detail**
- **Attendance spread**
- **Learners needing follow-up**
- **Assignment timeline**
- **Field narrative**
- **History summary**

### Source pattern

- **Roster / assignment / attendance / watch counts**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/mallams/:id`
  - **Type:** Mostly backend-composed detail object
- **Roster operations context / related mallam directory**
  - **Source:** Live backend APIs
  - **Feeds:** `/api/v1/students`, `/api/v1/mallams`
- **Narrative cards and coaching copy**
  - **Source:** Static guidance text layered over live mallam detail

---

## 3.6 Content Library (`/content`)

### Filters

- **Search query**
- **Subject select**
- **Status select**
- **Focus view select**
  - **Source:** Mixed
  - **Filter options from:** `/api/v1/subjects`
  - **Filtered records from:** `/api/v1/curriculum/modules`, `/api/v1/lessons`, `/api/v1/assessments`, `/api/v1/strands`
  - **Logic:** Derived rollup/filtering in LMS UI

### Summary cards

- **Subjects**
- **Modules**
- **Lessons ready**
- **Assessment gates**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/subjects`, `/api/v1/curriculum/modules`, `/api/v1/lessons`, `/api/v1/assessments`

### Subject lanes / strand grouping / curriculum inventory

- **Subject name and lane**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/subjects`
- **Strands under subject**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/strands`
- **Modules under strand**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/curriculum/modules`
- **Lessons inventory**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/lessons`
- **Assessment control board**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/assessments`

### Release blockers board

- **Module title**
- **Subject**
- **Ready lesson count vs target lesson count**
- **Missing lessons**
- **Assessment gate missing/present**
- **Release risk label**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/curriculum/modules`, `/api/v1/lessons`, `/api/v1/assessments`
  - **Logic:** module blocked if approved/published lesson count is short or assessment gate absent

### Content create/edit/delete forms

- **Subject / strand / module / lesson / assessment records**
  - **Current record source:** Live backend API
  - **Form reference data:** live lists from modules/subjects/strands feeds
  - **Intended destination:** live backend write endpoints via form actions

### Guidance / warnings / fallback copy

- **Source:** Static guidance text and placeholder/degraded messages

---

## 3.7 English Studio (`/english`)

This surface is important because it is **not purely a direct backend projection**. It combines real curriculum data with LMS-side synthesis.

### Base feeds

- **Modules**
- **Lessons**
- **Assessments**
- **Assignments**
- **Subjects**
  - **Source:** Live backend APIs
  - **Feeds:** `/api/v1/curriculum/modules`, `/api/v1/lessons`, `/api/v1/assessments`, `/api/v1/assignments`, `/api/v1/subjects`

### English summary cards

- **English modules**
- **Structured lessons**
- **Ready for release**
- **Modules missing gates**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Logic:** calculated by `buildEnglishOpsSummary(...)`

### Lesson blueprint data

For each English lesson blueprint, the page shows:
- **Lesson title**
- **Module title**
- **Level**
- **Status**
- **Mode**
- **Duration**
- **Assessment title / trigger**
  - **Source:** Live backend APIs
- **Objective**
- **Vocabulary focus**
- **Activity spine**
- **Release label / release risk**
- **Readiness checks**
- **Readiness score**
  - **Source:** Derived rollup in LMS UI
  - **Logic:** built in `apps/lms-web/lib/english-curriculum.ts`

### Important caveat on English blueprint fields

These fields are **currently synthesized in the LMS UI**, not fetched as authored lesson payloads from a dedicated English blueprint API:

- objective text
- inferred vocabulary focus
- activity templates such as warm welcome / model and echo / guided pair talk / interactive task / exit check
- readiness checks
- release labels like `pod-ready`, `queued`, `review`, `draft`

That means they are **useful operator-facing scaffolding**, but they are not yet canonical authored content records unless backed elsewhere.

### Quick English authoring blocker state

- **English subject missing** or **no English modules available**
  - **Source:** Derived UI gating from live subject/module feeds
- **Blocked copy shown to operator**
  - **Source:** Static guidance text / graceful fallback

---

## 3.8 Assessments (`/assessments`)

### Progression picture

- **Ready / watch / on-track counts**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/dashboard/workboard`

### Assessment table

- **Assessment**
- **Subject**
- **Module**
- **Trigger**
- **Gate**
- **Status**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/assessments`

### Interpretation

This is mostly a **direct live assessment inventory**, with only the readiness summary derived from workboard state.

---

## 3.9 Assignments (`/assignments`)

### Filters

- **Status**
- **Cohort**
- **Mallam**
- **Pod**
- **Search**
  - **Source:** Mixed
  - **Assignment rows:** `/api/v1/assignments`
  - **Filter reference data:** `/api/v1/cohorts`, `/api/v1/mallams`, `/api/v1/pods`, `/api/v1/lessons`, `/api/v1/assessments`
  - **Logic:** derived filtering in LMS UI

### Delivery pulse metrics

- **Assignments visible**
- **Active windows**
- **Scheduled next**
- **Due in 7 days**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/assignments`

### Risk readout metrics

- **Overdue and not done**
- **Missing pod labels**
- **No assessment gate**
- **Busiest owner**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/assignments`, supporting cohort/mallam/pod feeds

### Assignment board

- **Lesson**
- **Cohort**
- **Pod**
- **Assessment**
- **Mallam**
- **Due date**
- **Status**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/assignments`

### Create assignment / reassign controls

- **Reference options from cohorts, lessons, mallams, assessments**
  - **Source:** Live backend APIs
  - **Feeds:** `/api/v1/cohorts`, `/api/v1/lessons`, `/api/v1/mallams`, `/api/v1/assessments`
- **Unavailable state when refs missing**
  - **Source:** Placeholder / graceful fallback

### Operator guidance

- **Source:** Static guidance text

---

## 3.10 Pods (`/pods`)

### Pod cards and matrix

- **Pod**
- **Center**
- **Region**
- **Type**
- **Connectivity**
- **Learners**
- **Mallams**
- **Status**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/pods`

### Interpretation

This page appears to be a mostly **direct pod inventory/deployment view** rather than a heavy derived analytics page.

---

## 3.11 Attendance (`/attendance`)

### Attendance board

- **Today + recent capture** rows
  - **Source:** Live backend API
  - **Feed:** `/api/v1/attendance`
- **Learner reference context**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/students`
- **Capture attendance form unavailable state**
  - **Source:** Placeholder / graceful fallback

### Caveat

The page clearly expects live attendance records, but whether those records come from LMS-side manual capture, facilitator input, or learner-runtime linked events depends on backend implementation. The LMS itself treats them as **live backend attendance records**.

---

## 3.12 Progress (`/progress`)

### Filters

- **Learner / cohort / pod / mallam / subject / status / search**
  - **Source:** Mixed live data + LMS-side filtering
  - **Feeds:** `/api/v1/progress`, `/api/v1/students`, `/api/v1/subjects`, `/api/v1/curriculum/modules`, `/api/v1/cohorts`, `/api/v1/pods`, `/api/v1/mallams`

### Mastery board

- **Student**
- **Subject**
- **Module**
- **Mastery**
- **Lessons completed**
- **Progression**
- **Next module**
  - **Source:** Live backend API, likely downstream of learner progress/runtime
  - **Feed:** `/api/v1/progress`

### Capture/update forms

- **Students / subjects / modules used as reference data**
  - **Source:** Live backend APIs
- **Progress records being updated**
  - **Intended source/destination:** live backend write path for progress capture and override actions

### Interpretation

This page is the clearest **admin-facing progression control surface** over records that likely reflect both instructional/admin judgment and learner-runtime completion evidence upstream.

---

## 3.13 Rewards & Progression (`/rewards`)

### Filters

- **Search / cohort / pod / mallam / status**
  - **Source:** Mixed live data + LMS-side filtering
  - **Feeds:** `/api/v1/rewards/leaderboard`, `/api/v1/rewards/requests`, `/api/v1/reports/rewards`, `/api/v1/students`, `/api/v1/dashboard/workboard`, `/api/v1/cohorts`, `/api/v1/pods`, `/api/v1/mallams`

### Reward footprint card

- **Leaderboard learners**
- **Total XP tracked**
- **Badges unlocked**
- **Highest level reached**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/rewards/leaderboard`

### Queue pressure card

- **Pending requests**
- **Urgent backlog**
- **Needs attention**
- **Expired requests**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/rewards/requests`
  - **Type:** direct queue summary from backend

### Progression posture card

- **Ready learners**
- **Watchlist learners**
- **On-track learners**
- **Configured badges**
  - **Source:** Mixed
  - **Workboard counts:** live backend API `/api/v1/dashboard/workboard`
  - **Configured badges:** live backend API `/api/v1/rewards/catalog`
  - **UI counts:** derived rollup in LMS UI

### Reward analytics card

- **Fulfillment rate**
- **Transactions logged**
- **Corrections made**
- **Revocations made**
  - **Source:** Live backend/report API
  - **Feed:** `/api/v1/reports/rewards`

### Reward demand / recent adjustments

- **Reward demand by item**
- **Recent reward adjustments**
  - **Source:** Live backend/report API
  - **Feed:** `/api/v1/reports/rewards`

### Level ladder / badge catalogue

- **XP rules**
- **Levels**
- **Badges**
- **Badge targets / descriptions / categories**
  - **Source:** Live backend API
  - **Feed:** `/api/v1/rewards/catalog`
- **Badge unlocked counts / nearest learner progress**
  - **Source:** Live backend leaderboard data + Derived rollup in LMS UI
  - **Feed:** `/api/v1/rewards/leaderboard`

### Leaderboard

- **Learner**
- **Level**
- **XP status**
- **Badges**
- **Next move**
- **Progression pill**
  - **Source:** Mixed
  - **Leaderboard core:** `/api/v1/rewards/leaderboard`
  - **Next move / progression state enrichment:** `/api/v1/dashboard/workboard`, `/api/v1/students`
  - **Type:** LMS-side join across feeds

### Queue watchlist / admin reward controls

- **Reward queue items**
  - **Source:** Live backend API `/api/v1/rewards/requests`
- **Reward adjustment write controls**
  - **Intended destination:** live backend write actions
  - **Guarding roster context:** `/api/v1/students`, `/api/v1/rewards/catalog`, `/api/v1/rewards/leaderboard`

### Upstream lineage note

Rewards are one of the places where **learner-app/runtime evidence is very likely upstream of the visible numbers**, even though the LMS itself reads them back through reward/report APIs rather than directly from the learner app.

---

## 3.14 Reports (`/reports`)

This is the densest mixed-source surface in the LMS.

### Primary feeds

- `/api/v1/reports/overview`
- `/api/v1/dashboard/insights`
- `/api/v1/students`
- `/api/v1/mallams`
- `/api/v1/pods`
- `/api/v1/assignments`
- `/api/v1/progress`
- `/api/v1/cohorts`
- `/api/v1/reports/operations`
- `/api/v1/reports/ngo-summary`

### Scope filters and scope summary

- **Cohort / pod / mallam / search scope**
  - **Source:** live backend reference data + LMS-side filtering
- **Scope label / filter chips / scope narratives**
  - **Source:** Derived rollup in LMS UI + Static guidance text

### Program overview / delivery metrics / learning metrics / operations pulse

- **Total learners / teachers / centers / pods**
- **Assignments tracked / due this week / present today / pods needing attention**
- **Average attendance / average mastery / ready / watch**
- **Completion rate / abandoned sessions / pending reward requests / urgent reward backlog**
  - **Source:** Mostly live backend/report APIs
  - **Feeds:** `/api/v1/reports/overview`, `/api/v1/reports/operations`, `/api/v1/reports/ngo-summary`
  - **Type:** Derived rollup in backend/report API

### Executive narrative

- **Priority / headline / detail / metric**
  - **Source:** Live backend API `/api/v1/dashboard/insights`
- **Fallback insight**
  - **Source:** Placeholder / graceful fallback

### Pod health matrix / mallam contribution board

- **Pod roster count, assignment count, watch count, ready count, attendance average, mastery average**
- **Mallam roster count, attendance average, mastery average, readiness count, watch count**
  - **Source:** Live backend APIs + Derived rollup in LMS UI
  - **Feeds:** `/api/v1/pods`, `/api/v1/mallams`, `/api/v1/students`, `/api/v1/progress`, `/api/v1/assignments`

### NGO / donor summary and subject mastery board

- **Coverage totals**
- **Attendance retention signal**
- **Progression readiness signal**
- **Reward queue summary**
- **Subject learner counts / average mastery / lessons completed**
  - **Preferred source:** Live backend/report API `/api/v1/reports/ngo-summary`
  - **Fallback when feed absent:** derived fallback object built in LMS UI from students/progress/assignments/pods/mallams
  - **This matters:** some report sections will still show a plausible derived picture even when the dedicated NGO endpoint fails

### Operations hotlist / recent reward requests / integrity watchlist / high-support learners

- **Preferred source:** Live backend/report API `/api/v1/reports/operations`
- **Fallback behavior:** some hotlist/reward queue constructs are synthesized in the LMS UI from students/progress/assignments if operations feed is unavailable

### Narrative pack / copyable text cards / reporting handoff guidance

- **Source:** Derived rollup in LMS UI + Static guidance text
- These are explicitly presentation-layer narrative artifacts, not canonical backend records

### Important reporting caveat

Reports is a **hybrid truth surface**:
- some metrics are truly live backend report outputs,
- some cards are LMS-side derivations from lower-level feeds,
- some narrative blocks are intentionally editorial/static,
- some fallback constructs are synthetic so the route stays useful under partial outage.

That is good UX, but it means anyone using Reports as a source of record should know **which part is authoritative backend output vs. graceful UI reconstruction**.

---

## 3.15 Settings / Ops (`/settings`)

### Runtime card

- **Actor**
- **Role**
- **Mode**
- **Seed packs**
  - **Source:** Live backend API plus seeded/environment metadata
  - **Feed:** `/api/v1/meta`
  - **Type:** Seeded / demo / environment metadata

### Reward system card

- **Learners on leaderboard**
- **Average XP**
- **Badges unlocked**
- **Highest level seen**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/rewards/leaderboard`

### Progression policy card

- **Ready right now**
- **Watchlist learners**
  - **Source:** Live backend API + Derived rollup in LMS UI
  - **Feed:** `/api/v1/dashboard/workboard`
- **Assessment-gated movement: Enabled**
- **Manual mallam review: Required on edge cases**
  - **Source:** Static guidance / policy copy
  - **Important:** these are not fetched configuration flags today; they are declared guidance text in the UI

### Storage posture / storage control center / integrity findings

- **Storage mode**
- **Persistence**
- **Driver**
- **Updated timestamps**
- **Database URL configured**
  - **Source:** Live backend admin APIs
  - **Feed:** `/api/v1/admin/storage/status`
- **Integrity issues, checked counts, issue details**
  - **Source:** Live backend admin APIs
  - **Feed:** `/api/v1/admin/storage/integrity`
- **Backups visible / backup metadata**
  - **Source:** Live backend admin APIs
  - **Feed:** `/api/v1/admin/storage/backups`

### Seed summary

- **What the environment loaded**
  - **Source:** Seeded / demo / environment metadata
  - **Feed:** `/api/v1/meta`
  - **Logic:** reads `seedSummary`

### Rewards reporting pulse / reward demand + requests

- **Learners in scope**
- **XP awarded / redeemed**
- **Fulfillment rate**
- **Learner breakdown**
- **Request status counts**
- **Top reward demand items**
  - **Source:** Live backend/report API
  - **Feed:** `/api/v1/reports/rewards`

### Operations report card

- **Learners in scope**
- **Runtime completion**
- **Ready to progress**
- **Pending reward queue**
- **Recent runtime sessions**
  - **Source:** Live backend/report API
  - **Feed:** `/api/v1/reports/operations`

### Release-safe operational cues / route handoff / playbook sections

- **Source:** Static guidance text, with some interpolated live metrics in the release-safe cue text

### Key Settings caveat

Settings mixes **true admin/runtime state** with **advisory product-policy text**. Those should not be confused. Some items are genuinely fetched operational facts; others are intentionally hardcoded guardrails.

---

## 3.16 Guide / printable docs (`/guide`, static HTML docs)

### What is data vs what is documentation

The guide route and printable docs largely contain:
- route descriptions
- workflow guidance
- product framing
- tutorial steps
- embedded iframes of static HTML docs

These are mostly:
- **Static guidance text**
- **Static published HTML artifacts**

They are not operational dashboards and should not be treated as live data surfaces.

---

## 4) What is clearly live today vs synthetic vs placeholder

## Clearly live backend-driven

These surfaces are primarily driven by live backend feeds:
- Learners roster/detail
- Mallams roster/detail
- Content Library inventory
- Assessments inventory
- Assignments board
- Pods
- Attendance
- Progress board
- Rewards queue/catalog/leaderboard/reporting
- Settings storage/integrity/meta

## Clearly learner-app/runtime-influenced upstream

These signals likely depend on learner-tablet runtime and sync even though the LMS reads them through backend APIs:
- sync success
- runtime completion rate
- abandoned sessions
- lessons completed
- portions of mastery/progression state
- operations report runtime hotlists
- some reward and readiness signals

## Clearly synthesized in LMS UI

These are derived in the web app itself:
- dashboard release blockers
- attendance-risk filters and watchlists built from student rows
- mallam pressure scores
- reports fallback NGO summary and fallback operations constructs
- English Studio lesson blueprints, objectives, vocabulary, activity templates, readiness checks, release labels
- many filter chips, scoped narratives, and copyable summaries

## Clearly seeded / environment metadata

- meta actor / role / mode
- seedSummary counts
- any “Across the current seeded cohorts” framing on learner pages

## Clearly static guidance

- route subtitles
- operator playbook cards
- warning/help copy
- policy statements like “Assessment-gated movement: Enabled” where no dynamic config is fetched
- guide and printable handbook content

## Clearly graceful fallback / placeholder

- degraded-mode banners
- empty tables with explanatory copy
- fallback insight cards
- empty summary objects used when APIs fail
- derived fallback reports on the Reports page when dedicated report endpoints fail

---

## 5) Gaps, ambiguities, and places to tighten next

### 1. English Studio is useful, but partially synthetic
The English Studio currently reads real lesson/module/assessment data, but the most attractive parts of the experience — objective text, vocabulary focus, activity spine, readiness checks, release labels — are generated in the LMS layer. If those should become canonical curriculum assets, they need a proper backend contract.

### 2. Some Settings statements look like config, but are hardcoded guidance
Examples:
- “Assessment-gated movement: Enabled”
- “Manual mallam review: Required on edge cases”

These read like live policy settings, but the current route treats them as static product guidance. If they matter operationally, they should come from a config endpoint.

### 3. Reports is a hybrid truth surface
Some report sections are direct backend reports. Others are LMS-side fallbacks built from lower-level feeds. That is operationally smart, but the UI would benefit from a stronger “authoritative vs reconstructed” indicator.

### 4. Attendance lineage is not fully explicit from LMS code alone
The LMS consumes attendance as a live feed, but it is not fully obvious from the UI code whether every attendance record originates in LMS capture, facilitator action, learner-app workflows, or a mix.

### 5. Reward/progression lineage is partly hidden behind report APIs
The LMS shows strong reward/progression views, but exactly which portions are generated from learner runtime vs manual admin intervention is not always obvious at the presentation layer.

---

## 6) Recommended next documentation hardening

If this needs to get even sharper, the next useful additions would be:

1. **Field-level contract appendix**
   - list exact fields per endpoint and where each one is rendered in the LMS
2. **Write-path map**
   - document which forms write to which backend actions/endpoints
3. **Authoritative-source badges in UI**
   - label sections as Live API / Derived / Fallback / Static
4. **Runtime lineage diagram**
   - show how learner-app bootstrap, session, and sync events become LMS reporting and progression state

---

## 7) Bottom line

The Lumo LMS is already showing a lot of real data, but not all visible content has the same truth status.

The cleanest way to think about it is:

- **Content, roster, assignments, rewards, storage, and most reporting feeds are live backend-driven.**
- **Progression/runtime/reward health often reflects learner-app behavior upstream, even when surfaced through backend rollups.**
- **English Studio and parts of Reports add genuinely useful LMS-side synthesis on top of live data.**
- **Guide pages and many policy/help cards are intentionally static.**
- **Fallback states are explicit and mostly honest, which is good — but they should still be recognized as fallback, not truth.**
