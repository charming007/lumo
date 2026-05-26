import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./actions.ts', import.meta.url)), 'utf8');

test('assessment actions normalize stale UI lifecycle statuses into real assessment statuses', () => {
  assert.match(
    source,
    /function normalizeAssessmentStatusInput\(rawStatus: FormDataEntryValue \| null\)/,
    'assessment actions should normalize incoming status values before writing to the API',
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

  assert.match(
    source,
    /const normalizedStatus = normalizeAssessmentStatusInput\(formData.get\('status'\)\);[\s\S]*apiWrite\(`\/api\/v1\/assessments\/\$\{assessmentId\}`, 'PATCH', \{ status: normalizedStatus \}\);/,
    'quick canvas assessment status changes should normalize module-style statuses before patching the API',
  );

  assert.match(
    source,
    /const normalizedStatus = normalizeAssessmentStatusInput\(formData.get\('status'\)\);[\s\S]*status: normalizedStatus,[\s\S]*triggerLabel,[\s\S]*progressionGate,[\s\S]*passingScore,[\s\S]*\}\);/,
    'full inline canvas assessment edits should normalize stale statuses before saving gate details',
  );
});
