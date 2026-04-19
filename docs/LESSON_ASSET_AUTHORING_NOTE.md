# Lesson asset authoring note

_Last updated: 2026-04-19_

This note documents the **current** lesson-asset authoring behavior in the LMS and the remaining gap to a true upload/media-library system.

## What shipped in the LMS now

Lesson Studio now gives authors structured asset-entry controls instead of forcing raw pipe-delimited strings for the common step types:

- `image_choice`
- `tap_choice`
- `word_build`
- `listen_repeat`
- `listen_answer`
- `speak_answer`
- `letter_intro`

Authors can now:

- add/remove option rows for choice-driven steps
- add/remove media rows for step-level support assets
- pick a normalized asset kind from the current known list
- enter the asset value directly in a dedicated field
- see step-level warnings when the selected lesson type implies missing image/audio support

The UI is intentionally opinionated: it nudges authors toward matching the step type with the asset shape the learner runtime expects.

## What the asset fields mean today

The current LMS stores **asset references only**.

An author may enter any of these in the asset value field:

- a full URL
- a storage/path style reference
- a stable asset key agreed with downstream delivery

Examples:

- `https://cdn.example.org/lumo/english/unit-2/bag.webp`
- `lesson-media/english/unit-2/bag.webp`
- `bag-card-v2`

The LMS does **not** currently:

- upload files
- browse an existing media library
- validate that the referenced file actually exists
- generate thumbnails/waveforms/duration metadata
- normalize references into one canonical asset registry
- prevent two authors from naming the same thing differently

That means the editor is better than the old raw-text flow, but it is still a structured **reference entry form**, not a full media management system.

## Current implementation contract

Today the contract is simple:

1. Authors choose the closest asset kind (`image`, `audio`, `prompt-card`, `story-card`, etc.).
2. Authors paste the final runtime-resolvable reference.
3. The LMS saves that reference into the lesson payload.
4. Preview/readiness logic only checks for shape and obvious completeness, not actual file existence.
5. The learner runtime consumes what it knows how to read from the saved payload.

Important consequence: a lesson can look structurally valid in the LMS while still failing at delivery time if the referenced media does not exist or is not reachable.

## Known limits that operators should remember

### 1. No upload step
Operators still need a separate path for getting media into storage/CDN before authoring or while coordinating with engineering/content ops.

### 2. No canonical browser/library
Authors have to remember or copy/paste the correct asset reference. There is no picker for "use an existing image/audio item" yet.

### 3. No existence validation
The LMS can warn that an `image_choice` step has no image-linked assets, but it cannot yet confirm that `lesson-media/foo.webp` or `https://.../foo.webp` is real.

### 4. No asset governance
There is no metadata layer yet for:

- ownership
- reuse
- versioning
- alt labels / captions
- transcript pairing
- language variants
- storage lifecycle

### 5. Runtime still has partial media consumption
The learner runtime still prioritizes the first relevant media entry in some flows, so “attach everything and hope” is not a real multi-asset experience yet.

## What a true media-library/upload system needs next

To close the gap, Lumo needs a proper asset system with at least these pieces:

1. **Upload API + storage contract**
   - signed upload or managed ingest
   - canonical stored path returned by the backend
   - file-type/size validation

2. **Media library index**
   - searchable asset records
   - thumbnails / audio metadata
   - labels, tags, subject/module linkage
   - created-by / updated-at visibility

3. **Reference integrity checks**
   - verify asset existence before publish
   - warn on missing, unreachable, or unsupported references
   - detect duplicate or inconsistent naming

4. **Authoring picker UX**
   - choose existing media from library
   - upload new media inline without leaving the editor
   - insert canonical reference automatically

5. **Runtime-aware validation**
   - confirm the chosen asset kind matches the step type
   - flag oversized/unplayable audio or invalid image formats
   - surface when runtime will ignore extra media entries

## Operator guidance for now

Until the media system exists, the safest authoring workflow is:

1. Prepare/upload media through the external storage path your team already trusts.
2. Copy the final stable URL/path/key into Lesson Studio.
3. Use consistent naming conventions.
4. Prefer one clearly meaningful asset per step unless the runtime is known to consume more.
5. Treat publish approval as blocked if the lesson depends on media that has not been externally verified.

## Source files tied to this behavior

- `apps/lms-web/components/lesson-activity-structured-builders.tsx`
- `apps/lms-web/components/lesson-authoring-shared.ts`
- `apps/lms-web/components/lesson-editor-form.tsx`
- `docs/LESSON_ACTIVITY_SCHEMA.md`
