import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./error.tsx', import.meta.url)), 'utf8');

test('global error copy stays route-agnostic for deployment triage', () => {
  assert.match(source, /LMS route crashed before it could render\./);
  assert.match(source, /Retry page/);
  assert.doesNotMatch(source, /Dashboard crashed before it could render\./);
  assert.doesNotMatch(source, /Retry dashboard/);
});
