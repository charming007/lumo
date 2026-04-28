# Lumo rewards system guide (current state + interim operating model)

This is the practical truth, not the pretty version.

Today, **rewards exist in two places**:

1. **Backend/LMS reward system** — this is the intended source of truth for reporting, leaderboard, badges, requests, and admin adjustments.
2. **Learner tablet local reward logic** — this gives immediate celebration/progress feedback on-device, especially when offline, but it is **not perfectly aligned** with backend rules yet.

Until those two models are unified, treat the **backend/LMS as canonical** and the **tablet as provisional, learner-facing encouragement**.

---

## 1. Current backend reward model (canonical for LMS)

Backend reward logic lives in `services/api/src/rewards.js`.

### Point earning

A completed lesson creates a reward transaction with XP:

- **12 XP** — lesson completed
- **+3 XP** — review is `onTrack`
- **+2 XP** — no support actions used
- **+2 XP** — at least one observation captured

**Typical backend range per lesson:** `12–19 XP`

### Levels / stages

Current backend levels:

- **Level 1 — Starter:** 0 XP
- **Level 2 — Explorer:** 40 XP
- **Level 3 — Builder:** 90 XP
- **Level 4 — Navigator:** 150 XP
- **Level 5 — Shining Star:** 230 XP

### Badges

Current backend badges:

- **First Light** — first completed lesson
- **Practice Streak** — 5 completed lessons
- **Reading Spark** — first English lesson
- **Math Mover** — first Math lesson completed with `onTrack` review

### Reward store / redemption flow

Backend reward catalog currently includes low-cost classroom rewards such as:

- Story Time Pick
- Sticker Reward
- Helper Star
- Line Leader Turn
- Math Champion Sticker
- Celebration Song Pick
- Mallam Helper

Redemption flow is:

1. learner has enough XP
2. learner requests reward
3. admin/mallam approves or rejects
4. approved reward is fulfilled
5. fulfillment creates a **negative XP redemption transaction**

Important: **XP is spendable in the backend model** because fulfillment subtracts XP.

---

## 2. Current learner-tablet reward behavior (local-first, provisional)

Tablet reward logic currently lives in `apps/learner-tablet/lib/app_state.dart`.

The tablet does three useful things well:

- gives immediate celebration after lesson completion
- keeps reward/progress state usable while offline
- queues sync events until connectivity returns

### Local point earning

Tablet-side lesson completion currently estimates XP as:

- **12 XP** — base completion
- **+ up to 4 XP** — based on number of responses
- **+3 XP** — no support actions used
- **+2 XP** — audio captured
- **+2 XP** — offline / pending-sync resilience bonus

**Typical tablet range:** can differ from backend, and can exceed backend totals.

### Local levels / stages

Tablet uses a different 5-step ladder:

- Starter
- Rising Voice
- Bright Reader
- Story Scout
- Confidence Captain

With level floors at roughly **0 / 80 / 160 / 240 / 320 XP**.

### Local badges

Tablet currently awards a different badge set, including:

- Voice Starter
- Story Scout
- Streak Spark
- XP Climber
- Independent Echo
- Hands-Free Hero
- Signal Keeper

These are good for local encouragement, but they do **not** match backend/LMS badges yet.

### Local-first behavior

The tablet persists:

- learner state
- reward snapshot
- reward redemption history
- pending sync events

So a shared tablet can keep going when the backend is down or stale. That is intentional and good.

But: the tablet can only offer an **optimistic local projection** until backend sync succeeds.

---

## 3. Sync to LMS: what actually happens

### What syncs cleanly today

When live sync is available, learner events are posted back to the backend. The backend can then return:

- updated runtime session data
- updated learner progress
- updated reward snapshot

The LMS reads reward state from backend endpoints such as:

- `/api/v1/rewards/catalog`
- `/api/v1/rewards/leaderboard`
- `/api/v1/rewards/requests`
- `/api/v1/reports/rewards`

### Practical rule

For any operator, report, leaderboard, or admin decision:

- **Use LMS/backend rewards as truth**
- **Use tablet rewards as immediate learner-facing feedback**

If the tablet and LMS disagree, the LMS wins.

---

## 4. Manual admin adjustments

The LMS already supports manual reward operations.

### Available actions

Admins can:

- add manual XP
- add a manual badge award
- correct a reward transaction to a new XP value
- revoke a reward transaction

This exists to handle:

- missed syncs
- wrong XP totals
- missed badge awards
- bad or duplicate reward transactions

### Operating rule

Use manual adjustment to fix reward accounting problems.

Do **not** use it to fake mastery, progression, or curriculum readiness. If the learner did not actually complete the learning work, rewards should not be used as makeup paint.

---

## 5. Interim reward structure to use now

Until backend and tablet logic are unified, use this simple operating model.

### Source of truth

- **Canonical points / levels / badges:** backend
- **Immediate celebration on tablet:** local tablet projection
- **Canonical spendable balance:** backend/LMS

### Point earning policy

Use the backend formula as the official rule:

- 12 XP lesson completion
- +3 XP on-track review
- +2 XP independent completion
- +2 XP observation captured

Do not introduce more earning rules right now.

### Level policy

Use the backend ladder as the official stage model:

- Starter
- Explorer
- Builder
- Navigator
- Shining Star

### Badge policy

Use the backend badges as canonical for LMS reporting.

Tablet-only badges are fine as local celebration UI, but they should not be treated as formal program milestones.

### Redemption policy

Use backend-verified XP balance for anything spendable.

Do not let a purely local tablet estimate authorize real reward fulfillment.

---

## 6. What should happen operationally this week

If you are running the system now, the sane workflow is:

1. let the learner tablet celebrate immediately
2. sync lesson results as soon as connectivity returns
3. check LMS/backend totals for official reward state
4. use manual admin adjustments only when sync/accounting needs correction
5. fulfill redemptions based on LMS/backend balance, not the tablet's optimistic number

---

## 7. What to unify next (recommended cleanup path)

This is the real fix list.

### A. Unify point calculation

Move both tablet and LMS/backend to the same lesson reward formula.

Best move: make backend reward calculation canonical, then let the tablet display either:

- last confirmed backend reward result, or
- an explicitly labeled **estimated pending reward** until sync completes

### B. Unify levels/stages

Choose one progression ladder.

Recommendation: keep the backend ladder as canonical unless there is a strong pedagogy reason to keep the tablet names. If tablet-friendly names matter, map them explicitly instead of letting both systems drift.

### C. Unify badges

Decide which badges are:

- official/reportable
- local celebratory-only

Then label them clearly in product and data.

### D. Separate "earned" from "spendable"

Right now XP is doing two jobs:

- progression signal
- currency for rewards

That can work, but it can also confuse reporting.

Longer-term, consider:

- **lifetime earned XP** for progression/recognition
- **current spendable balance** for redemption

That prevents a learner from appearing to "lose progress" after spending XP.

### E. Make sync status obvious in the tablet UI

The learner device should clearly signal when reward totals are:

- confirmed from backend
- local pending sync
- potentially stale

That removes false certainty.

---

## 8. Bottom line

Right now:

- **LMS/backend rewards are the source of truth**
- **tablet rewards are useful but provisional**
- **manual adjustment is the safety valve**
- **reward logic still needs unification**

That is the honest operating model until the system is consolidated.
