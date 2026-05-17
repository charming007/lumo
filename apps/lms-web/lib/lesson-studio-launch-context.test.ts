import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveLessonStudioLaunchContext } from './lesson-studio-launch-context.ts';

const subjects = [
  { id: 'subject-english', name: 'English' },
  { id: 'subject-math', name: 'Mathematics' },
] as any;

const modules = [
  { id: 'module-reading', title: 'Reading lane', subjectId: 'subject-english', subjectName: 'English' },
  { id: 'module-counting', title: 'Counting lane', subjectId: 'subject-math', subjectName: 'Mathematics' },
] as any;

test('module launch context wins over a stale subject query when both params are present', () => {
  const resolved = resolveLessonStudioLaunchContext(subjects, modules, {
    requestedSubjectId: 'subject-english',
    requestedModuleId: 'module-counting',
  });

  assert.equal(resolved.selectedSubject?.id, 'subject-math');
  assert.equal(resolved.selectedModule?.id, 'module-counting');
  assert.equal(resolved.subjectRecoveredFromModule, true);
});

test('unknown module ids fall back to the requested subject lane instead of leaking an invalid module selection', () => {
  const resolved = resolveLessonStudioLaunchContext(subjects, modules, {
    requestedSubjectId: 'subject-english',
    requestedModuleId: 'module-missing',
  });

  assert.equal(resolved.requestedModule, null);
  assert.equal(resolved.selectedSubject?.id, 'subject-english');
  assert.equal(resolved.selectedModule?.id, 'module-reading');
});

test('requested modules with unrecoverable subject context stay flagged for the blocker card path', () => {
  const resolved = resolveLessonStudioLaunchContext(subjects, [
    ...modules,
    { id: 'module-bad', title: 'Broken lane', subjectId: 'legacy-subject', subjectName: 'Unknown subject' },
  ] as any, {
    requestedModuleId: 'module-bad',
  });

  assert.equal(resolved.requestedModule?.id, 'module-bad');
  assert.equal(resolved.requestedModuleHasRecoverableSubject, false);
  assert.equal(resolved.requestedModuleRecoveredSubject, null);
});
