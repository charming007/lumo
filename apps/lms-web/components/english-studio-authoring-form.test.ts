import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const englishStudioAuthoringFormSource = readFileSync(fileURLToPath(new URL('./english-studio-authoring-form.tsx', import.meta.url)), 'utf8');

test('english studio keeps assessment gates attached when module ids drift', () => {
  assert.match(englishStudioAuthoringFormSource, /assessmentMatchesModule\(activeModule, assessment\)/);
  assert.doesNotMatch(englishStudioAuthoringFormSource, /assessment\.moduleId === activeModule\?\.id \|\| assessment\.moduleTitle === activeModule\?\.title/);
});
