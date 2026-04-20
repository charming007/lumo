# Asset library incident pilot note

_Date: 2026-04-21_

## Bottom line

**Severity: high for content ops, medium for pilot classroom delivery.**

- **Must-fix before pilot** if the pilot plan requires operators to use the new `/content/assets` page for uploading, browsing, registering, editing, or reusing lesson assets during pilot prep or live content operations.
- **Acceptable temporary fallback** only if pilot scope is narrowed so authors work from **pre-prepared asset URLs/keys** and continue authoring lessons through Lesson Studio without depending on the asset-library route.

This is not a classroom runtime outage by itself. It is a **content-operations and authoring productivity outage**.

---

## What is actually in the code now

### 1. The backend asset routes exist in source

`services/api/src/main.js` ships these routes now:

- `GET /api/v1/assets`
- `GET /api/v1/assets/:id`
- `POST /api/v1/assets`
- `PATCH /api/v1/assets/:id`
- `DELETE /api/v1/assets/:id`
- `POST /api/v1/assets/upload`
- `GET /api/v1/admin/assets/runtime`

So if production is returning `404` for `/api/v1/assets`, the most likely explanation is **deployment mismatch**, not missing code in the repo.

### 2. The LMS already treats this as a real backend failure

`apps/lms-web/app/content/assets/page.tsx` does the right thing:

- it fetches subjects/modules/lessons/assets separately
- if only the asset feed fails, it shows a degraded incident state instead of pretending the library is empty
- it **disables upload/register/edit writes** when the asset listing feed is down
- it explicitly tells the operator that a `404` on `/api/v1/assets` means stale deploy, wrong API base, or proxy/rewrite damage

That is honest behavior. It also means the asset-library page is effectively dead for operations until the route is restored.

### 3. Lesson authoring still has a partial fallback

Lesson Studio (`lesson-create-form.tsx`, `lesson-editor-form.tsx`) still allows authors to work with **asset references** inside steps.

Important details:

- lesson steps still store references like runtime URLs, storage paths, or asset keys
- the step editor includes `LessonAssetLibraryPanel`, but that panel is only a convenience picker over the asset registry
- the editor also still supports direct structured asset references and preview/readiness logic
- the editor text explicitly says asset entries are references, not uploads

So the pilot does **not** fully lose lesson authoring when `/content/assets` is broken.

---

## Operational impact by workflow

## A. Curriculum authoring

**Impact: degraded, but not blocked.**

Authors can still:

- create lessons
- edit activity steps
- paste or type final asset references
- save draft lessons
- preview step/runtime intent

Authors cannot reliably:

- browse the shared asset registry
- upload new files through the LMS asset page
- register/edit/archive/delete assets from the dedicated library route
- trust the inline asset picker to reflect the real shared library if the backend feed is failing

### Verdict

For curriculum authoring alone, this is **painful but survivable** if the content team already has a known external storage path and stable asset URLs/keys.

## B. Lesson asset workflows

**Impact: seriously degraded.**

The whole point of the new asset library is to give operators:

- upload
- external registration
- browse/search
- metadata cleanup
- scoped reuse across subject/module/lesson

When `/api/v1/assets` is broken, those workflows are basically gone from the LMS surface.

### Verdict

For any pilot process that depends on the shared media registry, this is a **must-fix**.

## C. Existing classroom delivery

**Impact: limited, unless lessons depend on last-minute asset ops.**

This incident does **not** automatically break learner runtime delivery, because existing lessons can still reference already-known URLs/keys and the learner/runtime path is separate from the admin registry UI.

The risk is operational:

- operators cannot safely add/fix/reuse assets through the intended control plane
- emergency lesson-media fixes become manual
- authors are more likely to create inconsistent or duplicate references

### Verdict

For a tightly controlled pilot with frozen content, this can be tolerated briefly.
For a pilot with active daily content/media changes, it should be treated as a launch blocker.

---

## Fastest acceptable mitigation if the backend route cannot be restored immediately

## Recommended temporary operating mode

Use a **reference-only fallback** for pilot prep:

1. Freeze the shared asset-library route as non-operational.
2. Prepare media outside the LMS in the storage/CDN path the team already trusts.
3. Give authors the final runtime URL or storage key.
4. Continue lesson authoring through Lesson Studio only.
5. Avoid promising shared asset reuse/management from `/content/assets` until the route is restored.

## What to tell operators

- Do **not** treat an empty/broken asset-library page as a clean library.
- Do **not** wait on LMS upload if the media already exists elsewhere.
- Author with final URLs/keys in Lesson Studio.
- Avoid introducing lots of new assets during the incident window.
- Prefer content freeze or small curated batches over live asset churn.

---

## Recommendation

### Must-fix before pilot if:

- the pilot depends on operators using `/content/assets`
- the content team needs in-product upload/browse/reuse during pilot prep
- lessons will be assembled or repaired dynamically from a shared asset registry

### Temporary fallback is acceptable if:

- pilot content is mostly frozen or lightly changing
- authors can work from externally hosted asset URLs/keys
- the team is willing to run Lesson Studio in **reference-only mode** for a short window
- everyone understands this is a workaround, not the intended steady state

## Crisp call

**For curriculum authoring:** acceptable temporary fallback.

**For lesson asset operations and shared media management:** must-fix before pilot if those workflows are part of pilot readiness criteria.

If forced to choose the fastest safe path: **do not block pilot solely on the asset-library page, but immediately switch to reference-only authoring and freeze media-library promises until the backend route is restored.**
