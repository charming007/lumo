import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./curriculum-canvas.tsx', import.meta.url)), 'utf8');

test('curriculum canvas recovers subject selection from normalized context instead of exact id-only matching', () => {
  assert.match(
    source,
    /const nextSubject = data\.subjects\.find\(\(subject\) => subjectMatchesContext\(subject, \{[\s\S]*subjectIds: \[nextSubjectId\],[\s\S]*subjectNames: \[nextSubjectId\],[\s\S]*\}\)\) \?\? null;/s,
  );
  assert.doesNotMatch(source, /data\.subjects\.find\(\(subject\) => subject\.id === nextSubjectId\)/);
});

test('curriculum canvas blocker and module handoffs carry exact module ids into content views', () => {
  assert.match(
    source,
    /href=\{`\/content\?subject=\$\{selected\.subject\.id\}&moduleId=\$\{encodeURIComponent\(selected\.module\.id\)\}&q=\$\{encodeURIComponent\(selected\.module\.title\)\}`\}/,
  );
  assert.match(
    source,
    /href=\{`\/content\?view=blocked&subject=\$\{selected\.subject\.id\}&moduleId=\$\{encodeURIComponent\(selected\.module\.id\)\}&q=\$\{encodeURIComponent\(selected\.module\.title\)\}`\}/,
  );
  assert.match(
    source,
    /assessmentBoardHref\(\{ subjectId, moduleId: assessment\.moduleId \?\? undefined, query: moduleTitle \}\)/,
  );
  assert.match(
    source,
    /href=\{`\/content\?subject=\$\{encodeURIComponent\(subjectId\)\}\$\{assessment\.moduleId \? `&moduleId=\$\{encodeURIComponent\(assessment\.moduleId\)\}` : ''\}&q=\$\{encodeURIComponent\(moduleTitle\)\}`\}/,
  );
  assert.match(
    source,
    /href=\{`\/content\?view=blocked&subject=\$\{encodeURIComponent\(subjectId\)\}\$\{assessment\.moduleId \? `&moduleId=\$\{encodeURIComponent\(assessment\.moduleId\)\}` : ''\}&q=\$\{encodeURIComponent\(moduleTitle\)\}`\}/,
  );
});

test('curriculum canvas triage quick action keeps payload-empty published lessons in the not-ready queue', () => {
  assert.match(source, /import \{ isLessonReleaseReady \} from '\.\.\/lib\/lesson-release-readiness';/);
  assert.match(
    source,
    /const selectedModuleNotReadyLessons = selected \? selected\.module\.lessons\.filter\(\(lesson\) => !isLessonReleaseReady\(lesson\)\) : \[];/,
  );
  assert.doesNotMatch(
    source,
    /const selectedModuleNotReadyLessons = selected \? selected\.module\.lessons\.filter\(\(lesson\) => !\['approved', 'published', 'active'\]\.includes\(normalize\(lesson\.status\)\)\) : \[];/,
  );
});

test('curriculum canvas disables inline write controls when only rescue data is available', () => {
  assert.match(source, /const hasTrustedLiveAuthoringContext = mode === 'live' \|\| mode === 'blended';/);
  assert.match(
    source,
    /Canvas is running from rescue data only\. Inline create\/edit controls are disabled until the live curriculum graph comes back, because a tree snapshot can help you inspect blockers but it is not safe authority for production writes\./,
  );
  assert.match(source, /\{hasTrustedLiveAuthoringContext \? \(/);
  assert.match(source, /Lesson create locked on rescue data/);
  assert.match(source, /Gate creation locked on rescue data/);
  assert.match(source, /Operator controls are locked because this module is coming from rescue-only canvas data\./);
  assert.match(source, /readOnly=\{!hasTrustedLiveAuthoringContext\}/);
  assert.match(source, /Rescue-only lesson context is inspectable, not writable\./);
  assert.match(source, /Rescue-only gate context is inspectable, not writable\./);
});

test('curriculum canvas normalizes active module lifecycle values into the published quick-edit option', () => {
  assert.match(source, /import \{ normalizeModuleLifecycleStatus \} from '\.\.\/lib\/module-status';/);
  assert.match(
    source,
    /<select name="status" defaultValue=\{normalizeModuleLifecycleStatus\(selected\.module\.status\)\}[\s\S]*?<option value="draft">Draft<\/option>[\s\S]*?<option value="review">Review<\/option>[\s\S]*?<option value="published">Published<\/option>[\s\S]*?<\/select>/,
  );
});
