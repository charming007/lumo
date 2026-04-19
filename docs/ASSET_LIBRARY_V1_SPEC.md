# Lumo asset library V1 spec

_Last updated: 2026-04-19_

## 1. Why this exists

The repo already tells the truth:

- LMS authoring currently stores **reference-only** asset values (`docs/LESSON_ASSET_AUTHORING_NOTE.md`).
- Lesson step payloads allow `media[]` and choice-level `media`, but the learner runtime still mostly prioritizes the **first meaningful media item** (`apps/learner-tablet/lib/models.dart`, `docs/LESSON_ACTIVITY_SCHEMA.md`).
- The API has lesson CRUD, learner bootstrap, and offline sync, but **no asset registry, upload flow, or picker endpoints** (`services/api/src/main.js`).

So V1 should not try to become a giant DAM. The right move is a practical asset system that:

1. gives authors upload + browse,
2. returns one canonical asset reference format,
3. blocks obviously broken publish flows,
4. fits the current lesson payload shape,
5. keeps the learner tablet predictable offline.

---

## 2. What ships in V1

### Product scope

V1 adds:

- backend asset registry,
- upload session flow,
- LMS asset picker/modal,
- publish-time reference validation,
- learner-facing resolved URLs inside lesson/bootstrap payloads,
- offline cache manifest for learner-consumed assets,
- migration from raw string references to canonical asset references.

V1 does **not** add:

- advanced media editing,
- full version history UI,
- arbitrary external URL mirroring,
- per-frame video tooling,
- runtime support for many simultaneous media cues per step.

That restraint matters. Anything fancier right now is bullshit scope creep.

---

## 3. V1 architecture

## 3.1 Source of truth split

### Metadata
Store asset metadata in the API durability layer:

- file mode: persisted in the existing JSON snapshot store,
- postgres mode: persisted in Postgres tables/JSONB.

### Binary storage
Store actual files in S3-compatible object storage, matching the existing architecture doc.

Recommended buckets/prefixes:

- `lumo-assets/originals/...`
- `lumo-assets/derived/...`
- `lumo-assets/public/...` (optional if CDN/public bucket posture is used)

### Delivery
API remains the canonical authority for:

- asset identity,
- validation,
- publish readiness,
- runtime-safe URL resolution.

The LMS and learner tablet should not guess storage paths.

---

## 3.2 Storage model

## Asset record

Add an `assets` collection/table with this V1 shape:

```ts
export type AssetRecord = {
  id: string; // ast_...
  key: string; // canonical stable key used in lesson payloads
  status: 'draft' | 'ready' | 'failed' | 'archived';
  kind: 'image' | 'audio' | 'video' | 'document' | 'prompt-card' | 'story-card' | 'letter-card';
  mimeType: string;
  extension: string;
  originalFileName: string;
  sizeBytes: number;
  checksumSha256: string;
  storageDriver: 's3';
  storagePath: string; // originals/... or derived/...
  publicUrl?: string | null; // if public/CDN-backed
  signedUrlTtlSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  transcriptText?: string | null;
  altText?: string | null;
  languageCode?: string | null;
  tags?: string[];
  subjectId?: string | null;
  moduleId?: string | null;
  lessonIds?: string[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  derived?: {
    thumbnailAssetId?: string | null;
    waveformAssetId?: string | null;
    webpAssetId?: string | null;
    mp3AssetId?: string | null;
  } | null;
};
```

## Upload session record

```ts
export type AssetUploadSession = {
  id: string;
  status: 'pending' | 'uploaded' | 'committed' | 'expired';
  intent: 'library' | 'lesson-inline';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string | null;
  targetKind?: string | null;
  subjectId?: string | null;
  moduleId?: string | null;
  createdBy?: string | null;
  uploadUrl: string;
  uploadHeaders?: Record<string, string>;
  expiresAt: string;
  assetId?: string | null;
};
```

## Lesson payload reference

Do **not** store raw CDN URLs as the primary lesson reference in V1.
Store a canonical structured reference instead.

```ts
export type LessonAssetRef = {
  assetId: string;
  key: string;
  kind: string;
  usage?: 'primary' | 'support' | 'choice' | 'thumbnail' | 'audio-model';
};
```

Where current lesson shape says:

```ts
media: [{ kind, value }]
```

V1 should allow:

```ts
media: [{
  kind: 'image',
  value: 'asset:ast_123',
  asset: {
    assetId: 'ast_123',
    key: 'english/unit-2/bag-card',
    kind: 'image'
  }
}]
```

And for choice media:

```ts
choices: [{
  id: 'choice-1',
  label: 'Bag',
  isCorrect: true,
  media: {
    kind: 'image',
    value: 'asset:ast_123',
    asset: {
      assetId: 'ast_123',
      key: 'english/unit-2/bag-card',
      kind: 'image'
    }
  }
}]
```

That preserves backward compatibility with the existing `kind/value` shape while introducing a canonical asset attachment.

---

## 3.3 Canonical reference format

Use these rules:

### Canonical persisted form

- `value = "asset:<assetId>"`
- `asset.assetId` is required when the reference points to a managed asset
- `asset.key` is returned for operator readability and export portability

Example:

- `asset:ast_01hrm4...`

### Legacy tolerated forms during migration

Still accept during read/patch:

- full URL (`https://cdn.../bag.webp`)
- storage path (`lesson-media/english/unit-2/bag.webp`)
- stable key (`bag-card-v2`)

But publish validation should classify them as:

- `managed` when resolvable to an asset record,
- `legacy-external` when tolerated but not registry-backed,
- `invalid` when broken/unresolvable.

### API response form for learner runtime

The learner app should receive a resolved media object in addition to the raw reference, for example:

```json
{
  "kind": "image",
  "value": "asset:ast_123",
  "asset": {
    "assetId": "ast_123",
    "key": "english/unit-2/bag-card",
    "mimeType": "image/webp",
    "url": "https://cdn.example/...",
    "cacheKey": "sha256:abc123",
    "sizeBytes": 48123,
    "width": 1024,
    "height": 1024
  }
}
```

This is how the runtime gets deterministic URLs without hard-coding storage rules.

---

## 4. API contract

All paths below fit the existing Express API style under `/api/v1`.

## 4.1 Asset library read endpoints

### `GET /api/v1/assets`
List/search library assets.

Query params:

- `q`
- `kind`
- `status`
- `subjectId`
- `moduleId`
- `lessonId`
- `tag`
- `cursor`
- `limit`

Response:

```json
{
  "items": [AssetRecord],
  "page": {
    "nextCursor": "...",
    "count": 20
  }
}
```

### `GET /api/v1/assets/:id`
Return full metadata + delivery info.

### `GET /api/v1/assets/:id/usages`
Return lesson/module references using the asset.

Response shape:

```json
{
  "assetId": "ast_123",
  "lessons": [{ "id": "lesson-3", "title": "Market words" }],
  "steps": [{ "lessonId": "lesson-3", "stepId": "step-2", "usage": "choice" }]
}
```

---

## 4.2 Upload endpoints

### `POST /api/v1/assets/upload-sessions`
Create upload intent and return signed upload target.

Request:

```json
{
  "fileName": "bag.webp",
  "mimeType": "image/webp",
  "sizeBytes": 48123,
  "checksumSha256": "...",
  "targetKind": "image",
  "intent": "lesson-inline",
  "subjectId": "english",
  "moduleId": "module-2"
}
```

Response:

```json
{
  "id": "upl_123",
  "status": "pending",
  "uploadUrl": "https://storage...",
  "uploadMethod": "PUT",
  "uploadHeaders": {
    "Content-Type": "image/webp"
  },
  "expiresAt": "2026-04-19T10:00:00.000Z"
}
```

### `POST /api/v1/assets/upload-sessions/:id/commit`
Finalize upload after object transfer, inspect metadata, create asset record.

Request:

```json
{
  "altText": "School bag",
  "tags": ["english", "unit-2", "bags"],
  "subjectId": "english",
  "moduleId": "module-2"
}
```

Response:

```json
{
  "uploadSessionId": "upl_123",
  "asset": { ...AssetRecord }
}
```

### `POST /api/v1/assets/import-by-url` (optional admin-only bridge)
Use sparingly. For migration/admin ops, not normal authoring.

---

## 4.3 Lesson validation endpoints

### `POST /api/v1/assets/resolve`
Resolve a mixed bag of references into managed asset metadata.

Request:

```json
{
  "references": [
    "asset:ast_123",
    "lesson-media/english/unit-2/bag.webp",
    "https://cdn.example.org/lumo/english/unit-2/bag.webp"
  ]
}
```

Response:

```json
{
  "items": [
    {
      "input": "asset:ast_123",
      "status": "managed",
      "assetId": "ast_123",
      "key": "english/unit-2/bag-card"
    },
    {
      "input": "lesson-media/english/unit-2/bag.webp",
      "status": "legacy-external",
      "matched": false
    }
  ]
}
```

### `POST /api/v1/lessons/:id/asset-validation`
Return publish/readiness checks for all referenced assets.

Checks:

- asset exists,
- kind matches step type,
- mime type supported,
- file size/duration within V1 limits,
- learner runtime will actually consume the asset,
- no broken legacy references,
- no duplicate unresolved near-matches.

Response:

```json
{
  "lessonId": "lesson-3",
  "summary": {
    "status": "warn",
    "errorCount": 1,
    "warningCount": 2
  },
  "issues": [
    {
      "severity": "error",
      "stepId": "step-2",
      "code": "missing-choice-image",
      "message": "image_choice step requires at least one managed image on each choice"
    }
  ]
}
```

### `POST /api/v1/lessons/:id/publish`
Should run asset validation before switching to published/approved state.

---

## 4.4 Learner delivery endpoints

### Existing learner bootstrap/module endpoints should include resolved asset delivery metadata

Relevant existing endpoints:

- `GET /api/v1/learner-app/bootstrap`
- `GET /api/v1/learner-app/modules/:id`

For every lesson step media reference, include:

- canonical ref (`asset:...`),
- resolved delivery URL,
- cache key/checksum,
- lightweight metadata needed for offline decisions.

### `GET /api/v1/learner-app/assets/manifest`
Return learner-scoped asset manifest for assigned lessons.

Query:

- `learnerId` or `learnerCode`
- `moduleId` optional

Response:

```json
{
  "generatedAt": "...",
  "items": [
    {
      "assetId": "ast_123",
      "key": "english/unit-2/bag-card",
      "kind": "image",
      "url": "https://cdn.example/...",
      "cacheKey": "sha256:abc123",
      "sizeBytes": 48123,
      "priority": "required"
    }
  ]
}
```

This manifest is the contract for the offline pack manager.

---

## 5. LMS picker and upload flow

## 5.1 Entry points

Add picker/upload affordances in the existing structured authoring surfaces:

- `apps/lms-web/components/lesson-activity-structured-builders.tsx`
- `apps/lms-web/components/lesson-editor-form.tsx`
- optionally `apps/lms-web/components/english-studio-authoring-form.tsx`

## 5.2 Picker UX

For each media row / choice media cell:

1. **Current value chip**
   - show current managed asset label or raw legacy text.
2. **Choose from library**
   - modal with search, kind filter, recent items, usage metadata.
3. **Upload new**
   - creates upload session, uploads directly to storage, commits asset, auto-selects resulting asset.
4. **Paste legacy reference**
   - still available during migration, but visibly marked as legacy.

## 5.3 Selection behavior

When author picks an asset:

- UI writes `value = asset:<assetId>`
- UI stores normalized asset summary in form state
- preview card shows thumbnail / audio badge / dimensions / duration
- if step type expects image/audio and asset mismatches, warn immediately

## 5.4 Inline warnings

Examples:

- `image_choice` + selected audio asset on choice => error
- `listen_repeat` without any audio/prompt-card => warn
- extra step-level media beyond runtime consumption => warn
- unresolved raw URL => warn or block on publish

---

## 6. Validation rules

## 6.1 File acceptance

Recommended V1 limits:

### Images

- mime: `image/webp`, `image/png`, `image/jpeg`
- max size: 3 MB
- min dimensions: 256x256
- preferred for tablet: square-ish or simple aspect ratios

### Audio

- mime: `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/webm`
- max size: 10 MB
- max duration: 90 seconds for step-level prompts
- require derived/transcoded mp3 if source format is flaky for Android/web

### Video

Allow metadata and library storage in V1, but do **not** make video a required learner runtime primitive yet unless the tablet player is ready. If unsupported in runtime, mark library-only.

## 6.2 Authoring/runtime compatibility

Use existing lesson type knowledge from `docs/LESSON_ACTIVITY_SCHEMA.md` and runtime parsing in `apps/learner-tablet/lib/models.dart`.

Rules:

- `image_choice`
  - each meaningful choice should have managed `image` media
  - step-level shared image/audio is optional
- `tap_choice`
  - optional support media, but not required
- `word_build`
  - optional choice media; support image/audio allowed
- `listen_repeat`
  - should have one primary audio or prompt-card/text cue
- `listen_answer`
  - should have one primary audio/story-card/prompt-card cue
- `letter_intro`
  - should have `letter-card`, `prompt-card`, `image`, or `audio`
- if multiple media items are attached to a step, V1 validator must warn when runtime likely only consumes the first one

## 6.3 Publish blockers

Block publish when:

- managed asset is missing/not ready,
- required image/audio is absent for the selected step type,
- file type unsupported by runtime,
- legacy reference is unresolved,
- upload session exists but was never committed,
- referenced asset is archived.

Warn but allow save when:

- alt text missing,
- tags missing,
- image/audio is larger than recommended but still under hard limit,
- step contains extra media that runtime may ignore.

---

## 7. Learner caching and offline behavior

This part has to respect the current tablet architecture instead of pretending connectivity is always there.

## 7.1 What the learner app should cache

For assigned lessons/module bundle, cache:

- resolved asset URL,
- `assetId`,
- checksum/cache key,
- mime type,
- size,
- essential dimensions/duration,
- local file path after download.

Suggested local record:

```ts
{
  assetId: string,
  key: string,
  cacheKey: string,
  url: string,
  mimeType: string,
  sizeBytes: number,
  localPath?: string,
  status: 'pending' | 'ready' | 'failed',
  lastCheckedAt: string
}
```

## 7.2 Download policy

Priority:

1. required assets for active assignments,
2. assets for next likely lessons in assigned modules,
3. thumbnails and optional support media.

## 7.3 Cache invalidation

Use `cacheKey` or checksum, not just URL string.

If asset URL changes but checksum/cache key does not, keep cached local file.
If checksum changes, re-download.

## 7.4 Runtime fallback behavior

If asset is missing offline:

- show text prompt when possible,
- mark step degraded in runtime diagnostics,
- do not crash lesson flow,
- sync a non-fatal asset-miss event later for ops visibility.

## 7.5 Bootstrap payload impact

Do not shove giant asset lists into every bootstrap forever.

V1 recommendation:

- bootstrap includes only assets reachable from assigned lessons,
- module fetch includes module-scoped asset set,
- dedicated manifest endpoint supports refresh without refetching all learners/modules.

---

## 8. Migration from current reference-only authoring

## 8.1 Read path first

Before mass rewriting lessons, teach the API to resolve both:

- legacy raw reference strings,
- managed `asset:<id>` references.

That avoids breaking existing lesson content.

## 8.2 Backfill strategy

Create a migration job/script that scans all lesson payloads in:

- step `media[]`
- choice-level `media`
- any known lesson assessment/media fields added later

For each value:

1. If already `asset:<id>` and record exists: keep it.
2. If URL/storage path/key matches an existing asset record by path/key/checksum alias: rewrite to managed ref.
3. If not matched: create migration report entry.
4. Optionally create stub asset records for trusted legacy paths with `status=draft` or `status=ready` depending on verification outcome.

## 8.3 Authoring migration posture

During transition:

- allow legacy paste input,
- show "Convert to managed asset" when resolvable,
- block net-new published lessons from using unresolved legacy references,
- leave old draft lessons editable without immediate forced rewrite.

## 8.4 Export/import compatibility

Because the API already has snapshot export/import and recovery tooling, asset records must be included in storage export metadata.

Important: exported JSON should include asset metadata, but not inline large binaries.
Binaries remain in object storage and should be referenced by path/checksum.

---

## 9. Concrete code changes by surface

## 9.1 API (`services/api`)

Add:

- asset repository functions
- asset validators
- asset routes in `src/main.js`
- asset collections in `src/data.js` / file store
- asset presenter/resolution helpers for learner bootstrap/module endpoints
- lesson asset validation service used by lesson publish/update flows

## 9.2 LMS (`apps/lms-web`)

Add:

- asset API client helpers
- asset picker modal component
- upload widget component
- managed asset badges/preview chips in lesson structured builders
- publish blocker card for unresolved/broken lesson assets

## 9.3 Learner tablet (`apps/learner-tablet`)

Add:

- support for resolved asset metadata on media items
- asset manifest fetch and local cache manager
- local cache lookup before network playback
- degraded-mode event/report when asset missing or unplayable

Note: because current runtime logic often uses the first media item, V1 should explicitly preserve that behavior and validate around it rather than silently changing playback semantics.

---

## 10. Recommended V1 rollout order

### Phase 1 — backend foundation

- asset metadata collection/table
- upload session + commit
- asset list/detail endpoints
- reference resolver

### Phase 2 — LMS authoring

- picker modal
- inline upload
- managed asset chips in step builders
- lesson asset validation endpoint integration

### Phase 3 — learner delivery

- resolved asset info in bootstrap/module payloads
- asset manifest endpoint
- local cache manager

### Phase 4 — migration + publish enforcement

- backfill script
- publish blockers for unresolved legacy refs
- operator report for orphaned/broken lesson references

---

## 11. Recommended V1 decisions

The strongest calls here:

1. **Use object storage for binaries, API store for metadata.** Do not put big blobs in Postgres/file snapshots.
2. **Canonicalize references as `asset:<id>`.** URLs are delivery details, not authoring truth.
3. **Keep lesson payload backward-compatible.** Extend `media.kind/value` with an `asset` object instead of redesigning the whole lesson schema right now.
4. **Resolve URLs server-side for the learner app.** The tablet should not infer CDN/storage rules.
5. **Validate against current runtime limitations.** Since the learner app often uses the first media item, the validator must say so plainly.
6. **Allow legacy refs only as a migration bridge.** Net-new published content should be managed assets, period.

---

## 12. Open questions / remaining work

- Should signed URLs or public CDN URLs be the default learner delivery mode?
- Does the tablet runtime already support all desired audio formats consistently on Android/web?
- Is video in scope for learner playback now, or library-only in V1?
- Should asset ownership map to admin users, content ops roles, or both?
- Do we want lightweight derivative generation in V1 (thumbnail/webp/mp3), or defer until after upload/picker is stable?

---

## 13. Repo anchors

This spec is grounded in these current files:

- `docs/LESSON_ASSET_AUTHORING_NOTE.md`
- `docs/LESSON_ACTIVITY_SCHEMA.md`
- `docs/ARCHITECTURE.md`
- `apps/lms-web/components/lesson-activity-structured-builders.tsx`
- `apps/lms-web/components/lesson-editor-form.tsx`
- `apps/lms-web/lib/types.ts`
- `apps/learner-tablet/lib/models.dart`
- `apps/learner-tablet/lib/api_client.dart`
- `services/api/src/main.js`
- `services/api/src/repository.js`
- `services/api/src/validators.js`

This should be the implementation contract for asset upload/library V1 until the code catches up.