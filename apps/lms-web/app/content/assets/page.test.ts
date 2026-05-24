import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const assetLibraryPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('asset library hard-blocks when production API wiring is unsafe', () => {
  assert.match(
    assetLibraryPageSource,
    /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/,
    'asset library should refuse to render against an unsafe production API target',
  );
  assert.match(
    assetLibraryPageSource,
    /title="Asset Library"[\s\S]*subtitle="Production wiring is incomplete, so the asset registry is blocked instead of exploding behind a dead backend dependency\./,
    'asset library blocker should tell operators the page is intentionally blocked on unsafe deployment wiring',
  );
});

test('asset library hard-blocks when protected audit feeds cannot authenticate', () => {
  assert.match(
    assetLibraryPageSource,
    /isProtectedEndpointAuthFailure/,
    'asset library should detect protected audit auth failures instead of treating them like soft degradation',
  );
  assert.match(
    assetLibraryPageSource,
    /const assetAuditAuthBlocked = storageStatusAuthBlocked \|\| configAuditAuthBlocked \|\| assetRuntimeAuthBlocked;/,
    'asset library should combine auth failures across the protected asset audit feeds',
  );
  assert.match(
    assetLibraryPageSource,
    /Deployment blocker: LMS admin API key cannot unlock asset audit feeds\./,
    'asset library should escalate a missing or wrong LMS admin API key into an explicit deployment blocker',
  );
  assert.match(
    assetLibraryPageSource,
    /LUMO_ADMIN_API_KEY/,
    'asset library blocker should name the exact LMS deployment secret operators need to fix',
  );
});

test('asset library blocks writes when the live registry feed is failing', () => {
  assert.match(
    assetLibraryPageSource,
    /const assetFeedFailed = assetsResult\.status === 'rejected';/,
    'asset library should compute a dedicated registry failure state instead of pretending an empty table is healthy',
  );
  assert.match(
    assetLibraryPageSource,
    /Asset writes intentionally disabled/,
    'asset library should explicitly tell operators that uploads and edits are disabled during a live registry outage',
  );
  assert.match(
    assetLibraryPageSource,
    /\{assetFeedFailed \? \([\s\S]*Asset writes intentionally disabled[\s\S]*\) : \([\s\S]*<AssetUploadForm returnPath=\{assetLibraryHref\}/,
    'asset library should keep upload/register forms on the healthy branch only, never inside the live-registry-failure branch',
  );
});

test('asset library calls out wrong-backend 404 evidence instead of claiming the library is empty', () => {
  assert.match(
    assetLibraryPageSource,
    /function isExactAssetRegistry404\(error: unknown\)/,
    'asset library should keep an exact /api\/v1\/assets 404 detector for backend mismatch evidence',
  );
  assert.match(
    assetLibraryPageSource,
    /The response looks like a wrong-backend or missing-route 404, not an empty library\./,
    'asset library should tell operators that a 404 is deployment evidence, not proof the asset catalog is empty',
  );
  assert.match(
    assetLibraryPageSource,
    /Repo source already includes the asset routes\. A live 404 here means stale deploy, wrong API target, or proxy damage until proven otherwise\./,
    'asset library should preserve the strongest repo-vs-runtime deployment mismatch guidance',
  );
});

test('asset library normalizes array-shaped search params before building filters and return links', () => {
  assert.match(
    assetLibraryPageSource,
    /import \{ normalizeRouteParam, sanitizeInternalReturnPath \} from '\.\.\/\.\.\/\.\.\/lib\/safe-return-path';/,
    'asset library should import the shared query-param normalizer alongside return-path sanitizing',
  );
  assert.match(
    assetLibraryPageSource,
    /searchParams\?: Promise<Record<string, string \| string\[\] \| undefined>>;/,
    'asset library should accept the real Next.js string-or-array search-param shape',
  );
  assert.match(
    assetLibraryPageSource,
    /q: normalizeRouteParam\(query\.q\),[\s\S]*kind: normalizeRouteParam\(query\.kind\),[\s\S]*status: normalizeRouteParam\(query\.status\),[\s\S]*tag: normalizeRouteParam\(query\.tag\),[\s\S]*subjectId: normalizeRouteParam\(query\.subjectId\),[\s\S]*moduleId: normalizeRouteParam\(query\.moduleId\),[\s\S]*lessonId: normalizeRouteParam\(query\.lessonId\),[\s\S]*includeArchived: normalizeRouteParam\(query\.includeArchived\),/,
    'asset library should normalize every operator-facing filter param before reusing it in fetches and self-links',
  );
  assert.match(
    assetLibraryPageSource,
    /const feedbackMessage = normalizeRouteParam\(query\.message\);[\s\S]*<FeedbackBanner message=\{feedbackMessage\} \/>/,
    'asset library should normalize banner feedback params too, so redirected success/error messages cannot crash when duplicate query keys arrive as arrays',
  );
  assert.doesNotMatch(
    assetLibraryPageSource,
    /q: query\.q \|\| ''|kind: query\.kind \|\| ''|status: query\.status \|\| ''|tag: query\.tag \|\| ''|subjectId: query\.subjectId \|\| ''|moduleId: query\.moduleId \|\| ''|lessonId: query\.lessonId \|\| ''|includeArchived: query\.includeArchived \|\| ''|<FeedbackBanner message=\{query\?\.message\} \/>/,
    'asset library should stop trusting raw searchParams values because duplicate query keys can arrive as arrays',
  );
});
