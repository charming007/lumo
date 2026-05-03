import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const editPageSource = readFileSync(fileURLToPath(new URL('./[id]/page.tsx', import.meta.url)), 'utf8');

test('lesson edit page normalizes fulfilled module, subject, and assessment payloads before using array methods', () => {
  assert.match(
    editPageSource,
    /normalizeModulesForAuthoring\(modulesResult\.status === 'fulfilled' \? modulesResult\.value : \[\]\)/,
    'edit page should sanitize fulfilled module payloads before any .find/.some fallback logic runs',
  );
  assert.match(
    editPageSource,
    /normalizeSubjectsForAuthoring\(subjectsResult\.status === 'fulfilled' \? subjectsResult\.value : \[\]\)/,
    'edit page should sanitize fulfilled subject payloads before building fallback curriculum context',
  );
  assert.match(
    editPageSource,
    /normalizeAssessmentsForAuthoring\(assessmentsResult\.status === 'fulfilled' \? assessmentsResult\.value : \[\]\)/,
    'edit page should sanitize fulfilled assessment payloads before filtering linked module assessments',
  );
});
