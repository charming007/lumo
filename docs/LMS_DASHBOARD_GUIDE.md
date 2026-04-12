# Lumo LMS Dashboard Guide

_Last updated: 2026-04-13_

A practical, visual guide to the **Lumo LMS dashboard**, with extra focus on **Content Library** and **English Curriculum Studio**.

**Audience:** admins, content ops, curriculum leads, implementation managers, and anyone onboarding into LMS operations.

**Format:** this Markdown file is the update-friendly source. Export the matching HTML file (`docs/LMS_DASHBOARD_GUIDE.html`) to PDF for sharing or download.

---

## 1) What this LMS is for

Lumo’s LMS is not just a reporting dashboard. It is the admin control surface for:

- seeing learner and pod health,
- supervising mallams and cohorts,
- organizing curriculum structure,
- authoring lessons,
- linking assessments to progression,
- deciding what is actually ready to publish.

In the current implementation, the LMS navigation includes:

- Dashboard
- Learners
- Mallams
- Content Library
- English Studio
- Assessments
- Pods
- Analytics
- Settings

---

## 2) The big picture: how the LMS fits together

```text
Dashboard
   ↓ surfaces urgency and operational health
Learners / Mallams / Pods
   ↓ show who is learning, teaching, and delivering
Content Library
   ↓ defines the official curriculum structure
   Subject → Strand → Module → Lesson → Assessment gate
English Studio
   ↓ helps admins author better English lessons using an activity spine
Assignments / Pod delivery
   ↓ push approved content to cohorts and pods
Reports / Analytics
   ↓ show what is working and what needs attention
```

### Core content hierarchy

```text
Subject
└── Strand
    └── Module
        ├── Lesson 1
        ├── Lesson 2
        ├── Lesson 3
        └── Assessment gate
```

This structure matters because the LMS is opinionated:

- **Subjects** are curriculum lanes.
- **Strands** group planning themes inside a subject.
- **Modules** package a sequence of lessons.
- **Lessons** are the actual learning units delivered to learners.
- **Assessment gates** control progression and release safety.

---

## 3) Dashboard overview

The **Dashboard** is the top-level admin cockpit.

### What it shows

The current dashboard includes KPI cards for:

- Active learners
- Mallams
- Active pods
- Ready to progress
- Assignments live
- Assessments live
- Lessons completed
- Sync success

It also includes these working sections:

1. **Operations pulse**
   - centers live
   - assignments running
   - assessment gates active
   - learners ready for progression

2. **Leadership cues**
   - priority insights with headline + metric + explanatory detail

3. **Live assignments**
   - lesson
   - cohort
   - pod
   - assessment
   - due date

4. **Escalations to clear**
   - learners with weak attendance
   - mallams still in training or not yet fully active

5. **Learner workboard**
   - learner
   - mallam
   - cohort
   - attendance
   - mastery in a focus area
   - progression status
   - recommended next module

### Why the dashboard matters

The dashboard answers five admin questions fast:

- Are learners active?
- Are teachers/pods operational?
- What is blocked right now?
- Who is ready to move forward?
- What content or delivery issue needs intervention first?

---

## 4) Content Library: what it is

**Content Library** is the formal curriculum operations board.

If the Dashboard tells you what needs attention, **Content Library** tells you **what exists**, **how it is structured**, and **what is ready for release**.

### Main purpose

Use Content Library to:

- create and maintain the curriculum hierarchy,
- keep subjects and strands organized,
- add and edit modules,
- create lessons in the right module,
- attach assessment gates,
- spot release blockers before publishing.

### Top-level actions available

Admins can launch modal forms to:

- Create Subject
- Create Strand
- Create Module
- Create Lesson
- Create Assessment

This is important: admins can manage content from one board instead of bouncing across disconnected pages.

---

## 5) Content Library layout

The page is organized into several practical views.

### A. Summary cards

The top cards show:

- total subjects,
- total modules,
- lessons ready,
- assessment gates.

These give content ops a quick sense of scale and readiness.

### B. Subject lanes

Each subject appears as its own lane/card.

Each lane summarizes:

- number of strands,
- number of modules,
- number of lessons,
- number of assessments,
- published modules,
- ready lessons.

Each subject lane also supports:

- edit subject,
- delete subject,
- viewing strands nested under that subject.

### C. Strand grouping inside each subject

Inside a subject, strands are displayed as planning lanes.

Each strand can be:

- edited,
- reordered,
- deleted.

This helps curriculum teams keep structure clean instead of letting modules pile into one flat mess.

### D. Module cards inside strand groups

Each module card displays:

- module title,
- level,
- planned lesson count,
- ready lesson count,
- module status.

Each module also exposes:

- edit module,
- delete module,
- linked lessons,
- linked assessment gate,
- release note.

### E. Lesson entries inside each module

Each lesson entry shows:

- lesson title,
- delivery mode,
- duration,
- lesson status.

Each lesson can be:

- edited,
- deleted.

### F. Assessment gate panel

Each module can show a dedicated **Assessment gate** area with:

- assessment title,
- trigger label,
- kind,
- status,
- edit/delete actions.

This is the progression checkpoint. Without it, the module looks structurally incomplete.

---

## 6) Content statuses and what they mean

Across modules, lessons, and assessments, status is a key operational signal.

### Module status

- **draft** — the module exists but is not yet release-safe.
- **review** — structure exists and is nearing sign-off.
- **published** — the module is considered live-ready.

### Lesson status

- **draft** — initial work only.
- **review** — under editorial checking.
- **approved** — signed off and ready to queue.
- **published** — ready to go live.

### Assessment status

- **draft** — not yet operational.
- **active** — functioning as a real progression gate.
- **retired** — intentionally removed from active use.

### Practical rule

A module is not truly release-ready just because someone created it.

It needs:

- enough approved/published lessons to match the planned count,
- an assessment gate,
- a sensible release state.

That’s exactly why Content Library includes **Release blockers**.

---

## 7) Release blockers: how admins use them

The **Release blockers** section highlights modules that still have gaps.

It shows:

- module,
- subject,
- lesson gap,
- release risk.

Typical blockers:

- missing lessons,
- missing assessment gate,
- incomplete readiness versus planned lesson count.

### Admin use case

Before publishing or assigning content, an admin should check:

1. Does the module have all expected lessons?
2. Are those lessons approved or published?
3. Is an assessment gate linked?
4. Is the module still stuck in draft?

If any answer is bad, the content should not be treated as pod-ready.

---

## 8) Assessment control board

Content Library also includes a broader **Assessment control board**.

This table lets admins review assessment gates across the curriculum by:

- assessment name,
- linked module,
- trigger,
- pass mark,
- status.

### Why this matters

Assessments are not just metadata.
They decide when learners can progress.
So this board helps ops teams answer:

- Which modules are missing gates?
- Which pass marks are set?
- Which assessments are active versus stale?
- Which gate needs correction before deployment?

## 8A) Rewards & progression admin controls

The rewards board is now more than a read-only leaderboard.

### Admin write actions available

Operators can now:

- award manual XP adjustments to a learner,
- attach a badge during a manual reward correction,
- label the reason for the manual reward so the adjustment is legible later.

The Rewards board also now supports the same scoping controls admins expect on the rest of the LMS surfaces:

- free-text search,
- cohort scope,
- pod scope,
- mallam scope,
- progression-status scope.

### What this control is for

Use it for:

- backfilling a missed reward after an offline sync gap,
- granting a verified badge that should have fired but did not,
- making small corrective XP adjustments with an explicit reason.

Do **not** use it as a lazy substitute for readiness or curriculum decisions.
If the issue is progression, use the progression override controls instead of bribing the learner with points.

---

## 9) Curriculum release tracker and lesson inventory

Two final Content Library views help with operational control.

### Curriculum release tracker

This table gives a cross-curriculum module view:

- subject,
- strand,
- module,
- level,
- lesson count,
- status,
- action controls.

### Lesson inventory

This table gives a lesson-level view:

- lesson,
- subject,
- module,
- mode,
- duration,
- status,
- actions.

### Why these tables exist

Because sometimes you want the nested board view, and sometimes you just need a clean operational list.

The board view helps planning.
The tables help scanning, auditing, and bulk review.

---

## 10) English Studio: what it is

**English Curriculum Studio** is a focused authoring workspace for English lessons.

It is connected to Content Library, but it is not just a duplicate screen.

### Core purpose

English Studio exists to help admins and editors create **better English lessons** using:

- a structured activity spine,
- generated learning objectives,
- vocabulary focus,
- readiness checks,
- visible assessment linkage,
- clearer publish decisions.

In plain English: it stops lesson authoring from becoming “type a title and hope for the best.”

---

## 11) How English Studio connects to Content Library

This relationship is the heart of the workflow.

```text
Content Library
  = the source of curriculum structure
  = owns subjects, strands, modules, lessons, assessments

English Studio
  = a smarter English-specific authoring layer
  = reads English modules and linked assessments
  = generates lesson blueprints and readiness views
  = creates lessons back into the live content lane
```

### The connection in practice

English Studio uses:

- **English subject/modules** from the curriculum structure,
- **lesson records** already in the system,
- **assessment gates** linked to modules,
- **assignment visibility** for release context.

And when an admin authors a new English lesson, the form submits back into the LMS content system so the lesson appears in the real content lane.

So:

- **Content Library** is the canonical structure.
- **English Studio** is the specialized authoring and readiness workspace for English.

That split is good design.

---

## 11A) End-to-end flow: how Content Library, English Studio, assignments, learner runtime, and Rewards fit together

This is the operational chain admins actually need to understand.

```text
Content Library
  ↓ defines the official curriculum spine
  Subject → Strand → Module → Lesson → Assessment gate
English Studio
  ↓ strengthens English lessons with objectives, vocabulary, activity sequence, readiness checks, and assessment awareness
Assignments
  ↓ map approved lessons/modules to real cohorts, pods, and mallams
Learner runtime
  ↓ learners complete lessons, generate progress, and hit progression checks
Rewards
  ↓ XP, badges, and levels reflect verified participation and milestones
LMS admin surfaces
  ↓ dashboard, progress, rewards, learner pages, and workboards show the feedback loop
```

### 1. Content authoring starts in the curriculum spine

Everything begins in **Content Library**. This is where admins decide the official structure:

- which **subject** the content belongs to,
- which **strand** organizes the theme,
- which **module** packages the sequence,
- which **lessons** belong in that module,
- which **assessment gate** controls progression out of it.

This matters because assignments, learner progress, and rewards only make sense when the curriculum structure is real.
If a lesson is floating around without a properly wired module and assessment gate, the rest of the system is basically being asked to trust a lie.

### 2. English Studio turns English modules into teachable lesson blueprints

For English content, **English Studio** sits on top of that structure.
It does not replace Content Library; it uses the module and assessment context already defined there.

English Studio helps authors tighten the lesson before it ships by adding or validating:

- the learning objective,
- vocabulary focus,
- activity spine and pacing,
- readiness checks,
- linked assessment awareness,
- release risk and publish intent.

So the relationship is simple:

- **Content Library** decides where the lesson lives in the curriculum.
- **English Studio** improves how the English lesson is authored and whether it is actually ready.

When the lesson is created from English Studio, it writes back into the live LMS content lane so it shows up in the same module inventory as every other real lesson.

### 3. Modules, lessons, and assessments become assignment-ready delivery units

Once a module has enough approved or published lessons and a real assessment gate, ops can treat it as delivery-ready.
That is when the system moves from authoring to **assignment delivery**.

In practice, admins use the content and assignment surfaces to decide:

- which lesson or module is ready to go live,
- which cohort should receive it,
- which pod and mallam are responsible,
- what due date or delivery window applies,
- which assessment should be visible as the progression checkpoint.

The important connection is this: **assignments are not separate from curriculum.**
They are the delivery wrapper around curriculum objects that were created and approved upstream.

### 4. Learner runtime produces the signals that drive progress and intervention

When learners actually work through assigned lessons, the LMS starts collecting the signals admins care about:

- lesson completion,
- attendance and participation,
- mastery snapshots,
- lessons completed inside a module,
- progression status,
- recommended next module,
- assessment readiness or gate completion.

Those signals show up back in the LMS through:

- the **Dashboard** workboard and escalation views,
- the **Progress** page and progression override controls,
- learner detail pages,
- mallam views and delivery follow-up.

This is the point of the whole system: curriculum structure becomes real learner activity, and learner activity becomes operational evidence.

### 5. Rewards are downstream feedback, not a substitute for mastery

The **Rewards & Progression** surfaces sit downstream from learner runtime.
XP, badges, and levels should reflect meaningful activity and verified progress, not random admin vibes.

In the current LMS flow, rewards can respond to things like:

- lesson completion,
- consistency or streaks,
- milestone behaviors,
- verified admin corrections when something was missed.

That means rewards provide a second feedback loop:

- learners see momentum through **XP, badges, and levels**,
- admins and facilitators see that reward state in **leaderboards, workboards, and learner records**.

But the system should stay disciplined:

- **assessment and mastery** decide progression safety,
- **rewards** reinforce effort and milestones,
- **manual reward adjustments** are for recovery or correction, not for faking readiness.

### 6. How the feedback returns to LMS/admin views

Once learners complete work and reward signals update, that information loops back into admin decision-making.

Admins can then see, in one ecosystem:

- which modules are structurally ready in **Content Library**,
- which English lessons are high quality and release-safe in **English Studio**,
- which assignments are live in delivery views,
- which learners are progressing or stalling in **Progress** and learner pages,
- which reward patterns are emerging in **Rewards & Progression**,
- which problems need intervention on the **Dashboard**.

That is the real end-to-end picture: the LMS is not a set of disconnected pages.
It is a loop where **curriculum design → lesson authoring → assignment delivery → learner activity → progress/reward signals → admin intervention** all feed one another.

### 7. The simplest mental model for new admins

If someone is onboarding fast, give them this version:

1. **Content Library** decides the curriculum structure.
2. **English Studio** improves English lesson quality inside that structure.
3. **Assignments** send approved content to real learners and pods.
4. **Learner runtime** creates progress evidence.
5. **Rewards** turn meaningful milestones into visible motivation signals.
6. **Dashboard / Progress / Rewards / learner pages** show admins what to fix next.

If one part is weak, the next part gets noisy.
Bad structure creates bad assignments.
Bad assignments create muddy learner data.
Muddy learner data makes both progression and rewards less trustworthy.

## 12) What English Studio shows

### A. Summary cards

At the top, English Studio shows:

- English modules
- Structured lessons
- Ready for release
- Modules missing gates

This gives English content leads an instant editorial snapshot.

### B. Featured lesson blueprint

A highlighted lesson blueprint displays:

- lesson title,
- module,
- duration,
- mode,
- release label,
- readiness score,
- learning objective,
- vocabulary focus,
- activity sequence.

### C. Publish control panel

This panel shows readiness checks such as whether:

- the lesson title is specific enough,
- the duration is sufficient,
- the module is not stuck in draft,
- an assessment gate exists,
- the lesson status matches publish intent.

### D. Assessment wiring

This area shows whether a lesson/module has:

- an assessment linked,
- the gate trigger,
- a release-safe setup.

### E. Release queue and readiness board

These tables help editors separate:

- what is still blocked,
- what is nearly ready,
- what can actually ship.

### F. Progression override board

The Progress page now includes a per-learner **Progression override** form that lets admins:

- change progression status,
- change the recommended next module,
- record the override reason,
- preserve the latest override actor and timestamp in the progress record.

The board also now supports the same practical admin filters ops needs elsewhere:

- free-text search,
- cohort scope,
- pod scope,
- mallam scope,
- subject scope,
- progression-status scope.

This matters because readiness decisions need an audit trail.
Without a written reason, the next operator is left guessing whether a learner was promoted for mastery, support need, or someone just winging it.

### G. Modules missing assessment control

This section calls out English modules with no linked assessment gate.

### G. Pod-ready lesson set

This is the shortlist of lessons that can move into delivery now.

### H. Structured activity map

This breaks lessons down into activity cards so the lesson has a real teaching spine.

---

## 13) English lesson blueprint structure

Each English blueprint turns a lesson into a concrete teaching sequence.

### Blueprint fields

- lesson title
- module title
- level
- status
- mode
- duration
- objective
- vocabulary focus
- activities
- linked assessment title
- assessment trigger
- release risk
- release label
- readiness checks
- readiness score

### Activity spine used in the current implementation

```text
1. Warm welcome + retrieval
2. Model and echo
3. Guided pair talk
4. Interactive task
5. Exit check
```

This matters because it gives authors a repeatable pattern for oral-language lesson design.

---

## 14) How an admin creates a lesson today

There are two main paths.

### Path A — generic lesson creation from Content Library

Use this when creating any curriculum lesson.

**Steps:**

1. Open **Content Library**.
2. Click **Create Lesson**.
3. Choose the correct subject.
4. Choose the correct module.
5. Enter the lesson title.
6. Set duration.
7. Choose delivery mode.
8. Submit.
9. Review the lesson inside the module lane.
10. Update status as it moves from draft → review → approved → published.

### Path B — English-specific lesson creation from English Studio

Use this when creating an English lesson and you want better structure.

**Steps:**

1. Open **English Studio**.
2. Click **Author English lesson**.
3. Select the English module.
4. Enter the lesson title.
5. Set duration.
6. Choose delivery mode.
7. Review the generated objective.
8. Review vocabulary focus.
9. Review the generated activity spine.
10. Review readiness checks.
11. Set the publish state.
12. Submit **Create English lesson**.
13. The lesson is written back into the live content lane and can then be managed in Content Library.

### Why English Studio is the better path for English

Because it adds:

- pedagogical structure,
- release visibility,
- module readiness context,
- linked assessment awareness,
- a stronger quality bar.

---

## 15) Recommended admin workflow

Here’s the sane way to run this LMS.

### For curriculum ops

1. Create or confirm **Subject**.
2. Create **Strands**.
3. Create **Modules** with intended lesson counts.
4. Add or confirm **Assessment gates**.
5. Create **Lessons**.
6. Move lessons through review/approval.
7. Check **Release blockers**.
8. Only then publish/assign.

### For English content teams

1. Confirm the English module exists.
2. Confirm the module has an assessment gate.
3. Use **English Studio** to author the lesson.
4. Check readiness score and blockers.
5. Approve/publish only when the checks make sense.
6. Verify the lesson appears correctly in **Content Library**.

---

## 16) What admins should watch closely

### In Dashboard

Watch for:

- weak attendance,
- learners at risk,
- mallams not fully active,
- pod delivery strain,
- assignments without healthy completion.

### In Mallams

Watch for:

- training or leave-status mallams who still carry live rosters,
- learner loads that are too high for the current pod coverage,
- average attendance dropping under safe operating range,
- too many at-risk learners clustered under one operator,
- pod assignments piling onto the same person because the roster was never redistributed properly.

### In Analytics

Watch for:

- pods with weak attendance plus rising watchlist counts,
- mallams whose rosters have low mastery and low readiness at the same time,
- delivery boards where a few operators own nearly all live assignments,
- pods with zero live assignments because content release or deployment broke upstream.

### In Content Library

Watch for:

- modules with fewer ready lessons than planned,
- modules with no assessment gate,
- too many draft items,
- messy subject/strand structure.

### In English Studio

Watch for:

- low readiness scores,
- vague lesson titles,
- durations too short to be real lessons,
- modules missing assessment control,
- content being marked publish-ready too early.

---

## 17) Fast onboarding cheat sheet

### If you are a new admin

Start here:

1. **Dashboard** — understand live operations.
2. **Content Library** — understand how curriculum is structured.
3. **English Studio** — understand how English lessons are authored and checked.
4. **Assessments / Pods / Analytics** — understand release and delivery impact.
5. **Mallams** — use the deployment filters, watchlist signals, and learner-load view to see who needs coaching support versus simple roster redistribution.

### If you need to find a content problem fast

Ask in this order:

1. Is the module in the right subject and strand?
2. Does it have enough lessons?
3. Are those lessons approved/published?
4. Is there an assessment gate?
5. Is the lesson actually release-ready, or is someone bluffing with statuses?

---

## 18) Update guide: how to keep this document current

This guide is designed to be maintainable, not frozen.

### Source files to review when the LMS changes

Primary source files:

- `apps/lms-web/app/page.tsx`
- `apps/lms-web/app/content/page.tsx`
- `apps/lms-web/app/english/page.tsx`
- `apps/lms-web/components/english-studio-authoring-form.tsx`
- `apps/lms-web/components/content-admin-reactive-forms.tsx`
- `apps/lms-web/lib/navigation.ts`
- `apps/lms-web/lib/english-curriculum.ts`
- `apps/lms-web/lib/types.ts`

### Update checklist

When a new LMS feature lands, update this guide in this order:

1. **Navigation**
   - Did the sidebar/menu change?
   - Add/remove the page in section 1 or 17.

2. **Dashboard**
   - Did KPI cards change?
   - Did a new operational panel appear?
   - Update section 3.

3. **Content model**
   - Did subject/strand/module/lesson/assessment relationships change?
   - Update sections 2, 4, 5, 6, 7, 8, and 9.

4. **Authoring workflow**
   - Did lesson creation forms change?
   - Update section 14.

5. **English Studio**
   - Did readiness logic, activity spine, or blueprint fields change?
   - Update sections 10–13.

6. **Operational best practice**
   - If release policy changes, update sections 15 and 16.

### Best maintenance pattern

- Treat this Markdown file as the **source of truth**.
- Treat the HTML file as the **export/download artifact**.
- After updating the Markdown, update the matching HTML so non-technical users can print or download it.

---

## 19) Suggested next improvement

The next smart improvement would be adding screenshots or product mock captures into the HTML version.

That would make the guide even stronger for onboarding, especially for non-technical admins.

Right now, the structure is already there: the document is printable, readable, and easy to extend.

---

## 20) Implementation reference

This guide was derived from the current LMS implementation in the Lumo repo, especially:

- dashboard page
- content library page
- English Studio page
- English authoring form
- content editing forms
- navigation config
- English blueprint logic
- shared LMS types
