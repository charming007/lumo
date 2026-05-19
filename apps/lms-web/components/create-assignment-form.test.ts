import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const createAssignmentFormSource = readFileSync(fileURLToPath(new URL('./create-assignment-form.tsx', import.meta.url)), 'utf8');

test('assignment publishing keeps assessment gates visible when lesson module ids drift', () => {
  assert.match(createAssignmentFormSource, /assessmentMatchesModule\(selectedModule, assessment\)/);
  assert.match(createAssignmentFormSource, /subjectId: selectedLesson\.subjectId \?\? ''/);
  assert.match(createAssignmentFormSource, /subjectName: selectedLesson\.subjectName \?\? ''/);
  assert.doesNotMatch(createAssignmentFormSource, /assessment\.moduleId && assessment\.moduleId === selectedLesson\?\.moduleId/);
});

test('assignment publishing only exposes lessons with launchable payloads', () => {
  assert.match(createAssignmentFormSource, /import \{ isLessonReleaseReady \} from '\.\.\/lib\/lesson-release-readiness';/);
  assert.match(createAssignmentFormSource, /lessons\.filter\(\(lesson\) => isLessonReleaseReady\(lesson\)\)/);
  assert.match(createAssignmentFormSource, /launchable activity payload/);
});
