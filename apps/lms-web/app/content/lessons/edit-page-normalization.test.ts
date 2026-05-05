import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const editPageSource = readFileSync(fileURLToPath(new URL('./[id]/page.tsx', import.meta.url)), 'utf8');

test('lesson edit page normalizes fulfilled lesson, module, subject, and assessment payloads before using array methods', () => {
  assert.match(
    editPageSource,
    /normalizeLessonsForAuthoring\(lessonsResult\.status === 'fulfilled' \? lessonsResult\.value : \[\]\)/,
    'edit page should sanitize fulfilled lesson inventory payloads before trying to .find the fallback lesson',
  );
  assert.match(
    editPageSource,
    /const fallbackInventoryLesson = inventoryLessons\.find\(\(entry\) => entry\.id === id\) \?\? null;/,
    'edit page should search the normalized inventory lessons instead of calling .find on raw feed payloads',
  );
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

test('lesson edit page remounts the editor form when lesson or launch context changes on the same route', () => {
  assert.match(
    editPageSource,
    /const resolvedSubjectId = selectedSubject\?\.id \?\? lesson\.subjectId \?\? '';/,
    'edit page should compute a normalized launch subject id before keying follow-up surfaces',
  );
  assert.match(
    editPageSource,
    /const resolvedModuleId = selectedModule\?\.id \?\? lesson\.moduleId \?\? '';/,
    'edit page should compute a normalized launch module id before keying follow-up surfaces',
  );
  assert.match(
    editPageSource,
    /const lessonEditorFormKey = \[/,
    'edit page should derive a stable remount key for same-route lesson/context changes',
  );
  assert.match(
    editPageSource,
    /resolvedSubjectId/,
    'edit page remount key should track the recovered subject context, not only stale lesson ids',
  );
  assert.match(
    editPageSource,
    /resolvedModuleId/,
    'edit page remount key should track the recovered module context, not only stale lesson ids',
  );
  assert.match(
    editPageSource,
    /<LessonEditorForm\s+key=\{lessonEditorFormKey\}/,
    'edit page should key the editor form so stale authoring state does not leak across same-route lesson transitions',
  );
});

test('lesson edit page keeps linked assessment gates visible when module ids drift', () => {
  assert.match(
    editPageSource,
    /assessmentMatchesModule\(selectedModule, assessment\)/,
    'edit page should use the normalized assessment matcher so drifted module ids do not hide the linked gate',
  );
  assert.doesNotMatch(
    editPageSource,
    /assessment\.moduleId === selectedModule\?\.id/,
    'edit page should not fall back to brittle exact module-id gate matching',
  );
});

test('lesson edit page resolves modules with lesson-aware matching instead of raw title collisions', () => {
  assert.match(
    editPageSource,
    /findModuleForLesson\(loadedModules, lesson\)/,
    'edit page should use the lesson-aware module matcher when recovering module context from live curriculum feeds',
  );
  assert.match(
    editPageSource,
    /const selectedModule = findModuleForLesson\(modules, lesson\) \?\? fallbackModule \?\? modules\[0\] \?\? null;/,
    'selected lesson module should be recovered with subject-aware lesson/module matching before any generic fallback applies',
  );
  assert.doesNotMatch(
    editPageSource,
    /module\.title === lesson\.moduleTitle/,
    'edit page should not recover lesson modules by raw title-only matching, because duplicate module titles across subjects can land authors in the wrong lane',
  );
});

test('lesson edit page quick links reuse recovered curriculum ids instead of stale lesson query params', () => {
  assert.match(
    editPageSource,
    /content\/assets\?subjectId=\$\{encodeURIComponent\(resolvedSubjectId\)\}&moduleId=\$\{encodeURIComponent\(resolvedModuleId\)\}/,
    'asset-library handoff should use recovered subject/module ids so drifted lessons do not relaunch into false-empty scope',
  );
  assert.match(
    editPageSource,
    /content\/lessons\/new\?duplicate=\$\{encodeURIComponent\(lesson\.id\)\}&subjectId=\$\{encodeURIComponent\(resolvedSubjectId\)\}&moduleId=\$\{encodeURIComponent\(resolvedModuleId\)\}/,
    'duplicate-lesson handoff should use recovered subject/module ids so Lesson Studio opens in the real recovered lane',
  );
});
