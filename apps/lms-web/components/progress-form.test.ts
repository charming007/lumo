import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./progress-form.tsx', import.meta.url)), 'utf8');

test('progress forms normalize progression status before rendering admin override controls', () => {
  assert.match(source, /import \{ formatProgressionStatusLabel, normalizeProgressionStatus, progressionStatusTone \} from '\.\.\/lib\/progression-status';/);
  assert.match(source, /const normalizedProgressionStatus = normalizeProgressionStatus\(item\.progressionStatus\);/);
  assert.match(source, /const progressionTone = progressionStatusTone\(item\.progressionStatus\);/);
  assert.match(source, /background: progressionTone\.tone, color: progressionTone\.text/);
  assert.match(source, /\{formatProgressionStatusLabel\(item\.progressionStatus\)\}/);
  assert.match(source, /<select name="progressionStatus" defaultValue=\{normalizedProgressionStatus\} style=\{inputStyle\}>/);
  assert.match(source, /Last override: \{formatProgressionStatusLabel\(item\.override\?\.status \?\? item\.progressionStatus\)\}/);
  assert.doesNotMatch(source, /defaultValue=\{item\.progressionStatus\}/);
});
