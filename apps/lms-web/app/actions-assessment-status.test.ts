import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./actions.ts', import.meta.url)), 'utf8');

test('createAssessmentAction normalizes stale UI lifecycle statuses into real assessment statuses', () => {
  assert.match(
    source,
    /function normalizeAssessmentStatusInput\(rawStatus: FormDataEntryValue \| null\)/,
    'assessment creation should normalize incoming status values before writing to the API',
  );

  assert.match(
    source,
    /if \(status === 'published'\) return 'active';/,
    'legacy published assessment submissions should map to active so progression gates actually count as live',
  );

  assert.match(
    source,
    /if \(status === 'review'\) return 'draft';/,
    'legacy review assessment submissions should fall back to draft instead of inventing an unsupported state',
  );

  assert.match(
    source,
    /status: normalizeAssessmentStatusInput\(formData.get\('status'\)\)/,
    'createAssessmentAction should post the normalized assessment status instead of the raw form value',
  );
});
