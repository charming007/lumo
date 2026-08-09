import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./error.tsx', import.meta.url)), 'utf8');
const internalErrorRouteSource = readFileSync(fileURLToPath(new URL('./internal-error/page.tsx', import.meta.url)), 'utf8');

test('global error copy stays route-agnostic for deployment triage', () => {
  assert.match(source, /LMS route crashed before it could render\./);
  assert.match(source, /Retry page/);
  assert.doesNotMatch(source, /Dashboard crashed before it could render\./);
  assert.doesNotMatch(source, /Retry dashboard/);
});

test('internal app error route preserves deployment triage recovery actions', () => {
  assert.match(internalErrorRouteSource, /LMS route crashed before it could render\./);
  assert.match(internalErrorRouteSource, /Reload dashboard/);
  assert.match(internalErrorRouteSource, /Open settings/);
  assert.match(internalErrorRouteSource, /Open deploy checklist/);
  assert.match(internalErrorRouteSource, /Review content blockers/);
  assert.doesNotMatch(internalErrorRouteSource, /Retry page/);
});
