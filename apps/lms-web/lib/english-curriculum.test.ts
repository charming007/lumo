import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./english-curriculum.ts', import.meta.url)), 'utf8');

test('english curriculum helpers recover English lanes by subject context instead of subjectName only', () => {
  assert.match(source, /findEnglishModules\(/, 'helpers should centralize English module recovery');
  assert.match(source, /filterModulesForSubject\(modules, englishSubject\)/, 'English modules should recover from the matched subject id/name context');
  assert.match(source, /findSubjectByContext\(englishSubject \? \[englishSubject\] : subjects, \{[\s\S]*subjectId: lesson\.subjectId,[\s\S]*subjectName: lesson\.subjectName,[\s\S]*\}\)/, 'English lessons should stay in-lane when subject ids are valid even if subject names drift');
});

test('english curriculum normalizes legacy lesson and module lifecycle states before showing release readiness', () => {
  assert.match(source, /import \{ isLessonReleaseReady \} from '\.\/lesson-release-readiness';/);
  assert.match(source, /import \{ normalizeModuleLifecycleStatus \} from '\.\/module-status';/);
  assert.match(source, /const normalizedLessonStatus = normalizeLessonLifecycleStatus\(status\);/);
  assert.match(source, /const normalizedModuleStatus = normalizeModuleLifecycleStatus\(moduleStatus\);/);
  assert.match(source, /normalizedModuleStatus === 'review' \|\| normalizedModuleStatus === 'published'/);
  assert.match(source, /normalizedLessonStatus === 'approved' \|\| normalizedLessonStatus === 'published' \|\| normalizedLessonStatus === 'active'/);
  assert.match(source, /publishedLessons: englishLessons\.filter\(\(lesson\) => isLessonReleaseReady\(lesson\)\)\.length/);
  assert.match(source, /lessonsInReview: englishLessons\.filter\(\(lesson\) => normalizeLessonLifecycleStatus\(lesson\.status\) === 'review'\)\.length/);
});
