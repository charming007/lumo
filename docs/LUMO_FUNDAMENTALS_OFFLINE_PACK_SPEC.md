# Lumo Fundamentals offline pack spec

_Last updated: 2026-04-19_

## 1. Why this spec exists

Lumo already has the beginnings of the right shape for offline delivery:

- the architecture explicitly calls for offline lesson execution on shared Android tablets with delayed sync (`docs/ARCHITECTURE.md`)
- the learner tablet already trusts `GET /api/v1/learner-app/bootstrap`, `GET /api/v1/learner-app/modules/:id`, `GET /api/v1/learner-app/sessions`, and `POST /api/v1/learner-app/sync` as its runtime contract (`apps/learner-tablet/lib/api_client.dart`)
- the tablet already persists a trusted offline snapshot, queues learner sync events locally, hydrates module bundles after bootstrap, and merges back to live data when connectivity returns (`apps/learner-tablet/lib/app_state.dart`)
- lessons already have a canonical step schema and current runtime mapping (`docs/LESSON_ACTIVITY_SCHEMA.md`, `apps/learner-tablet/lib/models.dart`)
- active assignments can already surface module/lesson content to the learner app even when release status is not `published`, as long as the assignment is live (`services/api/test/learner-bootstrap.test.js`)

What is missing is a clean, implementation-ready contract for **bundled offline curriculum packs**.

This spec defines that contract for an offline-first bundled `lumo-fundamentals` curriculum pack, scoped first to **Meet Mallam**.

The goal is simple: the tablet should be able to ship with a guaranteed local fundamentals experience, use it when the network is absent or the backend is incomplete, and still stay compatible with the current assignment, progress, session, and sync model.

---

## 2. Scope

## In scope for this spec

- one bundled offline curriculum family: `lumo-fundamentals`
- first bundled lesson/module scope: `Meet Mallam`
- pack file/folder structure
- stable IDs and slugs
- asset packaging and resolution
- loader and precedence rules between bundled/local/server content
- versioning and update behavior
- sync behavior and compatibility with existing learner progress/session flows

## Out of scope

- redesigning the full learner app content model
- replacing the current bootstrap/module/session/sync APIs
- introducing a full authoring pipeline for packs in this phase
- solving all future localization/content-pack needs at once

This is a practical V1. Anything bigger right now would be architecture fan fiction.

---

## 3. Repo-grounded constraints that this spec must respect

## 3.1 Existing learner app behavior

The tablet app already:

- stores offline state locally
- persists `assignmentPacks`
- persists `pendingSyncEvents`
- tracks whether an offline snapshot is trusted from live bootstrap
- hydrates module bundles after bootstrap
- refreshes learner runtime sessions separately
- queues `lesson_completed` and learner registration events for later sync

Relevant code anchors:

- `apps/learner-tablet/lib/app_state.dart`
- `apps/learner-tablet/lib/api_client.dart`
- `apps/learner-tablet/lib/models.dart`

That means the pack system should **plug into the existing app state model**, not create a second offline state machine.

## 3.2 Existing backend behavior

The backend already exposes:

- `GET /api/v1/learner-app/bootstrap`
- `GET /api/v1/learner-app/modules/:id`
- `GET /api/v1/learner-app/sessions`
- `POST /api/v1/learner-app/sync`

And the bootstrap payload already carries:

- learners
- modules
- lessons
- assignments / assignmentPacks
- registrationContext
- sync metadata
- rewards metadata
- `meta.contractVersion`

Relevant anchors:

- `services/api/src/main.js`
- `services/api/README.md`
- `services/api/test/learner-bootstrap.test.js`

So the pack system must preserve compatibility with those payload shapes and semantics.

## 3.3 Existing content/runtime constraints

The learner runtime currently:

- keys lessons by `lesson.id` and `lesson.moduleId`
- sorts lesson activity steps by `order`
- maps backend step `type` strings into runtime enums
- mostly consumes the **first meaningful media item** on a step
- uses the first expected answer as the primary target response

Relevant anchors:

- `docs/LESSON_ACTIVITY_SCHEMA.md`
- `apps/learner-tablet/lib/models.dart`

So the pack format must carry lesson content in a shape that maps straight into `LessonCardModel.fromBackend(...)` and the existing step parser.

---

## 4. Recommended architecture

## Strong recommendation

Treat offline fundamentals as a **pack-backed content source** that feeds the same normalized learner-domain models the app already uses.

That means:

1. the pack is a **distribution format**, not a second curriculum model
2. pack lessons normalize into the same shapes as backend bootstrap/module lessons
3. local pack content can satisfy the learner app when server data is absent, stale, incomplete, or explicitly lower priority
4. learner progress and session sync remain on the **existing event/session rails**

In plain English: ship one content truth model, allow multiple sources.

## Source tiers

The learner app should support three content source tiers:

1. **Bundled pack** — ships inside the app or device image; guaranteed offline baseline
2. **Installed local pack update** — downloaded/imported pack update stored on device
3. **Live server content** — bootstrap/module payloads from API

Those are sources for the same normalized objects:

- modules
- lessons
- assets
- pack metadata

Not separate runtime modes.

---

## 5. Meet Mallam scope definition

`Meet Mallam` should be the first fundamentals experience and should be modeled as:

- curriculum family: `lumo-fundamentals`
- pack slug: `meet-mallam`
- first module in the pack: `meet-mallam`
- one lesson sequence introducing the facilitator voice, response pattern, and basic interaction ritual

Because the current repo seed content does **not** already define a canonical `Meet Mallam` lesson/module by name, this spec treats it as a **new canonical fundamentals module**, but keeps it aligned with the repo’s current English beginner stack and tablet runtime.

It should behave like a fundamentals onboarding module, not a special one-off flow bolted outside the curriculum.

---

## 6. Stable IDs and slugs

## 6.1 Rules

Stable IDs must be:

- deterministic
- human-readable where possible
- portable between bundled, updated-local, and server-delivered forms
- independent of mutable titles
- safe to store in progress/session records forever

Do **not** use auto-increment IDs for bundled packs. That would be fragile nonsense.

## 6.2 Canonical identifiers

### Curriculum family

- `curriculumFamilyId = "lumo-fundamentals"`
- `curriculumFamilySlug = "lumo-fundamentals"`

### Pack

- `packId = "lumo-fundamentals.meet-mallam"`
- `packSlug = "meet-mallam"`

### Module

Because the tablet and backend already use `moduleId` as a core join key, the module id should be globally stable:

- `moduleId = "fundamentals-meet-mallam"`
- `moduleSlug = "meet-mallam"`

### Lesson

Use pack-scoped stable lesson ids:

- `lessonId = "fundamentals-meet-mallam.lesson-01"`
- `lessonSlug = "meet-mallam-01-hello-mallam"`

If more lessons are added later:

- `fundamentals-meet-mallam.lesson-02`
- `fundamentals-meet-mallam.lesson-03`
- etc.

### Step

Use lesson-scoped stable step ids:

- `fundamentals-meet-mallam.lesson-01.step-01`
- `fundamentals-meet-mallam.lesson-01.step-02`

### Asset

Because the repo already has a lightweight asset repository with ids like `asset-1`, but the asset-library spec recommends canonical asset identities, bundled pack assets should use deterministic keys plus stable ids:

- `assetId = "lfmm-asset-hello-audio"`
- `assetKey = "lumo-fundamentals/meet-mallam/audio/hello-model-v1"`

## 6.3 Slug discipline

Slugs are for filenames, human readability, and analytics labels.
IDs are for joins.

Never use titles as join keys.

---

## 7. Pack structure

## 7.1 Packaging format

Recommended packaging format for V1:

- one pack directory during development
- one zipped artifact for distribution/import
- one unpacked installed directory on device after install

Recommended artifact name:

`lumo-fundamentals__meet-mallam__1.0.0.zip`

## 7.2 On-device install root

Recommended device-relative install root:

`packs/lumo-fundamentals/meet-mallam/`

This should be outside ephemeral cache directories and inside app-controlled durable storage.

## 7.3 Directory layout

```text
packs/
  lumo-fundamentals/
    meet-mallam/
      pack.json
      manifest.json
      modules/
        fundamentals-meet-mallam.json
      lessons/
        fundamentals-meet-mallam.lesson-01.json
      assets/
        audio/
          hello-model-v1.mp3
          my-name-is-mallam-v1.mp3
        images/
          mallam-wave-v1.webp
        prompts/
          hello-card-v1.json
      indexes/
        lesson-index.json
        asset-index.json
      checksums/
        sha256.json
```

## 7.4 Required files

### `pack.json`
Top-level pack metadata and compatibility contract.

### `manifest.json`
Pack contents manifest used for install/update validation.

### `modules/*.json`
Normalized learner module objects.

### `lessons/*.json`
Normalized learner lesson objects matching the current backend/tablet contract.

### `indexes/asset-index.json`
Lookup table from stable `assetId` / `assetKey` to packaged file path and metadata.

### `checksums/sha256.json`
Integrity data for install/update verification.

---

## 8. Pack schema

## 8.1 `pack.json`

```json
{
  "packId": "lumo-fundamentals.meet-mallam",
  "packSlug": "meet-mallam",
  "curriculumFamilyId": "lumo-fundamentals",
  "title": "Lumo Fundamentals: Meet Mallam",
  "description": "Offline-first onboarding pack for the first learner-facilitator interaction flow.",
  "version": "1.0.0",
  "schemaVersion": "lumo-offline-pack.v1",
  "minLearnerAppVersion": "1.0.0",
  "contractVersion": "learner-app-v2.3",
  "moduleIds": ["fundamentals-meet-mallam"],
  "lessonIds": ["fundamentals-meet-mallam.lesson-01"],
  "assetIndexPath": "indexes/asset-index.json",
  "lessonIndexPath": "indexes/lesson-index.json",
  "checksumPath": "checksums/sha256.json",
  "installedPrecedence": "local-pack-before-server-fallback",
  "createdAt": "2026-04-19T00:00:00.000Z"
}
```

## 8.2 `manifest.json`

```json
{
  "packId": "lumo-fundamentals.meet-mallam",
  "version": "1.0.0",
  "files": [
    { "path": "modules/fundamentals-meet-mallam.json", "sha256": "...", "sizeBytes": 1820 },
    { "path": "lessons/fundamentals-meet-mallam.lesson-01.json", "sha256": "...", "sizeBytes": 9420 },
    { "path": "assets/audio/hello-model-v1.mp3", "sha256": "...", "sizeBytes": 48123 }
  ]
}
```

## 8.3 Module file schema

Module objects should normalize into the current learner app `LearningModule.fromBackend(...)` shape.

Required fields:

```json
{
  "id": "fundamentals-meet-mallam",
  "subjectId": "english",
  "title": "Meet Mallam",
  "description": "First guided introduction to Mallam prompts, greetings, and response rhythm.",
  "voicePrompt": "Meet Mallam. Listen, repeat, and answer one step at a time.",
  "readinessGoal": "Ready to greet Mallam, respond to a simple question, and complete the first guided exchange.",
  "badge": "Fundamentals",
  "level": "beginner",
  "status": "published",
  "source": "bundled-pack",
  "packId": "lumo-fundamentals.meet-mallam",
  "packVersion": "1.0.0"
}
```

## 8.4 Lesson file schema

Lesson objects should normalize into the current learner app `LessonCardModel.fromBackend(...)` shape.

Required fields:

```json
{
  "id": "fundamentals-meet-mallam.lesson-01",
  "moduleId": "fundamentals-meet-mallam",
  "subject": "Foundational English",
  "title": "Hello, Mallam",
  "durationMinutes": 8,
  "status": "published",
  "mascotName": "Mallam",
  "readinessFocus": "Guided voice practice",
  "scenario": "The learner meets Mallam, hears a greeting, repeats it, and gives a simple answer.",
  "source": "bundled-pack",
  "packId": "lumo-fundamentals.meet-mallam",
  "packVersion": "1.0.0",
  "activitySteps": []
}
```

The `activitySteps` array must follow the current lesson-step contract from `docs/LESSON_ACTIVITY_SCHEMA.md`.

## 8.5 Asset reference schema

Use the current lesson `media.kind/value` shape, with the pack-safe extension below:

```json
{
  "kind": "audio",
  "value": "pack-asset:lfmm-asset-hello-audio",
  "asset": {
    "assetId": "lfmm-asset-hello-audio",
    "assetKey": "lumo-fundamentals/meet-mallam/audio/hello-model-v1",
    "packId": "lumo-fundamentals.meet-mallam",
    "path": "assets/audio/hello-model-v1.mp3",
    "mimeType": "audio/mpeg",
    "checksumSha256": "..."
  }
}
```

That keeps the lesson payload backward-compatible while making pack resolution deterministic.

---

## 9. Asset packaging rules

## 9.1 Packaging rules

Pack only the assets required for actual offline runtime.

For `Meet Mallam`, that means:

- step-level model audio
- step-level image/prompt-card assets actually consumed by the current runtime
- no speculative extras the runtime will ignore

Because the learner runtime currently prioritizes the first meaningful media item, V1 pack authoring should usually keep **one primary media asset per step**.

## 9.2 Asset classes

Recommended asset classes:

- `audio` — spoken model prompts
- `image` — visual cue art
- `prompt-card` or `text` — text or prompt support objects when needed

Avoid video in this pack family until tablet playback semantics are explicit.

## 9.3 Asset index schema

`indexes/asset-index.json`

```json
{
  "items": [
    {
      "assetId": "lfmm-asset-hello-audio",
      "assetKey": "lumo-fundamentals/meet-mallam/audio/hello-model-v1",
      "kind": "audio",
      "mimeType": "audio/mpeg",
      "path": "assets/audio/hello-model-v1.mp3",
      "sizeBytes": 48123,
      "checksumSha256": "..."
    }
  ]
}
```

## 9.4 No remote-only asset references for bundled lessons

If a bundled lesson depends on an asset, that asset must exist inside the pack.

Do not ship an “offline pack” that still points at the network for the critical first lesson. That would be clown shoes architecture.

---

## 10. Loader and resolution order

## 10.1 Core principle

The app should resolve content by **stable content identity** and source precedence, not by whichever payload arrived last.

## 10.2 Resolution order by source tier

For a requested module/lesson/asset id, resolve in this order:

1. **Installed local pack update**
2. **Bundled in-app pack**
3. **Live server content**
4. **Legacy seed/demo fallback**

This is the recommended order for `lumo-fundamentals` content specifically.

## Why local pack before server?

Because the whole point of a fundamentals offline pack is to guarantee a stable, known-good first-run experience.

The current app already uses live bootstrap as trusted when available, but that behavior is right for normal LMS-fed content. For the bundled fundamentals pack, the better rule is:

- prefer the explicitly installed or bundled fundamentals pack when it exists and is compatible
- allow the server to augment metadata, assignments, and reporting
- allow the server to supersede only when it declares a higher-compatible pack version for the same stable content id and the device has installed it locally

In other words: **server advertises updates; local installed pack executes lessons.**

## 10.3 Resolution order inside the app

### Bootstrap stage

At startup:

1. load installed pack registry
2. load bundled pack registry
3. materialize normalized local modules/lessons/assets into memory
4. attempt live bootstrap
5. merge server learners, assignments, sessions, rewards, and registration context
6. resolve lesson availability against precedence rules

### Module hydration stage

Current app behavior hydrates module bundles after bootstrap by calling `/learner-app/modules/:id`.

For pack-backed modules:

- if module id belongs to an installed/bundled pack, hydrate locally first
- only call server module fetch if the module is not locally pack-backed or if server metadata is needed for non-content enrichments

## 10.4 Record-level precedence

For the same stable id:

### Module/lesson body
- installed local pack wins over bundled pack
- bundled pack wins over live bootstrap/module payload unless a local update for the server-advertised pack version has been installed

### Assignment metadata
- server wins

### Learner/session/progress/reward data
- server remains system-of-record after sync
- device remains temporary source-of-truth while offline

This split is important:

- **content body** can be pack-authoritative
- **delivery state** should stay server-authoritative where existing contracts already expect that

---

## 11. Local vs server precedence details

## 11.1 What the server is allowed to override

The server may override:

- assignment windows
- eligible learner mappings
- due dates
- assessment linkage
- learner roster metadata
- registration context
- reward/leaderboard data
- sync acknowledgements
- session history visibility

## 11.2 What the server should not silently override

The server should not silently replace a local `Meet Mallam` lesson body by title-based matching or mutable payload drift.

If the lesson id is `fundamentals-meet-mallam.lesson-01`, then any content change is a **versioned pack change**, not a casual server overwrite.

## 11.3 How the server advertises pack-aware updates

Recommended bootstrap extension:

```json
{
  "offlinePacks": [
    {
      "packId": "lumo-fundamentals.meet-mallam",
      "latestVersion": "1.0.1",
      "minRequiredVersion": "1.0.0",
      "downloadUrl": "https://.../lumo-fundamentals__meet-mallam__1.0.1.zip",
      "checksumSha256": "...",
      "contentHash": "..."
    }
  ]
}
```

The server advertises.
The device installs.
The runtime executes the installed local copy.

That is cleaner and safer than hot-swapping lesson JSON from the wire.

---

## 12. Versioning

## 12.1 Version dimensions

Track three separate versions:

1. **pack schema version** — shape of the pack format
2. **pack content version** — version of `Meet Mallam` pack content
3. **learner contract version** — compatibility with learner API/runtime contract

## 12.2 Recommended version fields

### Pack schema version
- `schemaVersion = "lumo-offline-pack.v1"`

### Content version
- semantic versioning: `1.0.0`, `1.0.1`, `1.1.0`, `2.0.0`

### Learner contract version
- align to backend/tablet contract already present in bootstrap metadata
- current repo anchor: `learner-app-v2.3`

## 12.3 SemVer rules for pack content

### Patch
Use for:

- typo fixes
- metadata fixes
- non-structural asset replacements
- improved prompts that do not change stable ids or progression semantics

### Minor
Use for:

- adding optional lessons
- adding non-breaking assets
- adding compatible metadata fields

### Major
Use for:

- changing stable ids
- changing lesson ordering semantics in a way that affects progress/session interpretation
- changing pack schema incompatibly
- changing required runtime behavior

---

## 13. Sync and update behavior

## 13.1 Existing sync model to preserve

The current learner app queues sync events locally and posts them to `/api/v1/learner-app/sync`.

The current backend supports:

- idempotent client event ids
- batch receipts
- dedupe counts
- progress upsert semantics

That is good. Keep it.

## 13.2 Pack update policy

### Safe update window
Pack updates should install only when:

- no active lesson session is in progress for a lesson in that pack, or
- the app explicitly defers activation until next launch / next session start

Do not swap content under an active learner session.

### Activation rule
After download and checksum verification:

- unpack into a versioned staging directory
- validate manifest and compatibility
- atomically switch installed version pointer
- retain prior version until new version is confirmed usable

Recommended installed path pattern:

```text
packs/lumo-fundamentals/meet-mallam/versions/1.0.0/
packs/lumo-fundamentals/meet-mallam/versions/1.0.1/
packs/lumo-fundamentals/meet-mallam/current -> versions/1.0.1/
```

## 13.3 Rollback policy

If install validation fails:

- keep current installed version active
- mark update failed
- report failure when online

If activation fails after switch:

- rollback to previous installed version
- report `pack_activation_failed`

## 13.4 Recommended update events

Recommended learner sync event types to add later:

- `pack_installed`
- `pack_install_failed`
- `pack_activation_failed`
- `pack_asset_missing`

These are operationally useful, but not required to ship the first spec.

---

## 14. Compatibility with learner progress and session flows

## 14.1 Non-negotiable compatibility rule

Pack-backed lessons must produce the **same session and progress semantics** as server-delivered lessons.

That means the app should continue to use the current session state and sync payload concepts:

- `sessionId`
- `lessonId`
- `moduleId`
- `stepIndex`
- `stepsTotal`
- `completionState`
- transcript/observation fields
- support action counts
- audio capture fields

Relevant anchor:

- `LessonSessionState.syncPayloadPreview(...)` in `apps/learner-tablet/lib/models.dart`

## 14.2 Session ids

Session ids remain runtime-generated per learner attempt.

Lesson content ids stay stable.

That means progress history survives content source changes as long as the stable ids do not change.

## 14.3 Progress joins

The backend already upserts progress primarily by:

- `studentId`
- `moduleId`

So `Meet Mallam` must use one stable module id forever:

- `fundamentals-meet-mallam`

Do **not** rename that module id casually after shipping.

## 14.4 Lesson completion sync

A completed local `Meet Mallam` lesson should still sync as a normal `lesson_completed` event with:

- the stable `lessonId`
- the stable `moduleId`
- the learner/session outcome data already expected by the backend

The backend should not care whether the content body came from server JSON or local pack, only that the identifiers and payload contract are valid.

## 14.5 Recent session fetch compatibility

The existing recent-session fetch:

- `GET /api/v1/learner-app/sessions?learnerCode=...`

should continue to work unchanged.

The learner tablet may display pack-backed lessons in recent-session history because the same stable ids flow through the same backend records.

---

## 15. Bootstrapping behavior for Meet Mallam

## 15.1 First-run behavior

On first run, before any trusted live bootstrap exists:

- the app should still be able to open `Meet Mallam`
- the app should not depend on backend bootstrap to expose that pack
- the app should clearly label the lesson as local fundamentals content if needed for diagnostics

This matches the existing app’s fallback-first posture, but makes it intentional instead of accidental.

## 15.2 Assignment behavior

Recommended rule:

- `Meet Mallam` may be visible as a **foundation starter lesson** even without a server assignment
- once the server provides an active assignment for the same stable lesson/module, the assignment metadata overlays the local content

This preserves a guaranteed first experience while still fitting the assignment model.

## 15.3 Release status behavior

Bundled `Meet Mallam` content should be treated as release-ready by the pack installer, independent of backend lesson status flags.

That avoids weird cases where a safe bundled first lesson disappears because the server thinks the matching module is still `review` or missing.

---

## 16. Implementation plan by surface

## 16.1 Learner tablet

Add:

1. **Pack registry**
   - installed packs
   - bundled packs
   - active version pointer

2. **Pack loader**
   - parse `pack.json`
   - validate `manifest.json`
   - load modules/lessons/asset index

3. **Normalized content adapter**
   - convert pack module/lesson JSON into existing `LearningModule` and `LessonCardModel` model inputs

4. **Resolution layer**
   - resolve by stable id and source precedence

5. **Asset resolver**
   - map `pack-asset:<id>` to local file path / playable URI

6. **Update installer**
   - download/unpack/verify/activate/rollback

Recommended code anchors:

- `apps/learner-tablet/lib/app_state.dart`
- `apps/learner-tablet/lib/models.dart`
- new files such as:
  - `apps/learner-tablet/lib/offline_pack_registry.dart`
  - `apps/learner-tablet/lib/offline_pack_loader.dart`
  - `apps/learner-tablet/lib/offline_pack_models.dart`

## 16.2 Backend API

Add optional bootstrap advertisement support:

- `offlinePacks[]` metadata in bootstrap
- optional pack update manifest endpoint later

Keep existing sync/session endpoints unchanged.

## 16.3 Content/build tooling

Add a simple build script that takes authored source JSON/assets and emits the installable pack artifact.

Recommended script location later:

- `services/api/scripts/build-offline-pack.js` or
- `packages/content-packager/...`

---

## 17. Recommended data examples for Meet Mallam

## Module

```json
{
  "id": "fundamentals-meet-mallam",
  "subjectId": "english",
  "title": "Meet Mallam",
  "description": "First offline fundamentals lesson for greeting, listening, and simple response-taking.",
  "voicePrompt": "Meet Mallam. Listen and say it back.",
  "readinessGoal": "Learner can greet Mallam and respond to a simple prompt.",
  "badge": "Fundamentals",
  "level": "beginner",
  "status": "published"
}
```

## Lesson step example

```json
{
  "id": "fundamentals-meet-mallam.lesson-01.step-01",
  "order": 1,
  "type": "listen_repeat",
  "title": "Mallam says hello",
  "prompt": "Mallam says, hello. Say hello.",
  "durationMinutes": 1,
  "expectedAnswers": ["Hello"],
  "media": [
    {
      "kind": "audio",
      "value": "pack-asset:lfmm-asset-hello-audio",
      "asset": {
        "assetId": "lfmm-asset-hello-audio",
        "assetKey": "lumo-fundamentals/meet-mallam/audio/hello-model-v1",
        "packId": "lumo-fundamentals.meet-mallam",
        "path": "assets/audio/hello-model-v1.mp3",
        "mimeType": "audio/mpeg"
      }
    }
  ],
  "facilitatorNotes": ["Replay once if needed, then move on."]
}
```

---

## 18. Migration posture

## 18.1 Short term

Do not try to convert all existing LMS curriculum into offline packs immediately.

Ship `Meet Mallam` first as the canonical fundamentals bundled pack and prove the loader/update/progress model.

## 18.2 Medium term

Later packs can follow the same rules for:

- first greetings
- first letter sounds
- first counting
- other guaranteed baseline modules

## 18.3 Backward compatibility

The pack adapter should output the same shapes as live backend content so the rest of the learner app does not need a giant rewrite.

That is the right tradeoff.

---

## 19. Open questions / remaining work

1. **Where should pack artifacts be built from?**
   - likely authored JSON + checked-in assets + a pack build script

2. **How should the app store large media assets on Android/web builds?**
   - exact filesystem/runtime APIs still need implementation detail

3. **Should `Meet Mallam` always be visible, or only before first synced assignment?**
   - I recommend always visible as a safe fundamentals fallback, with assignment metadata layered when present

4. **Should the server eventually expose pack-aware assignment targeting?**
   - probably yes, but not required for V1 loader architecture

5. **Should pack install/update state appear in LMS settings/ops?**
   - yes eventually, because offline drift is an ops problem, not just a tablet problem

---

## 20. Bottom line

The cleanest implementation is:

- ship `Meet Mallam` as a real bundled `lumo-fundamentals` pack
- give it stable pack/module/lesson/step ids
- package all critical assets locally
- normalize pack content into the same learner models already used by the app
- keep learner progress/session/sync on the existing backend contract
- let the server advertise pack updates, but let the device execute installed local pack content

That architecture fits the repo as it actually exists today, preserves the current learner sync/session model, and gives Lumo a guaranteed offline first-run lesson without inventing a second content platform.
