import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lessonMatchesModule } from '../lib/module-lesson-match.ts';

const source = readFileSync(fileURLToPath(new URL('./asset-library-forms.tsx', import.meta.url)), 'utf8');

test('asset library scope recovery uses normalized subject context for drifted ids', () => {
  assert.match(
    source,
    /const activeSubject = useMemo\(\(\) => findSubjectByContext\(subjects, \{ subjectId \}\), \[subjectId, subjects\]\);/,
    'asset scope selectors should recover the active subject through the shared matcher when the selected id drifts',
  );

  assert.match(
    source,
    /const nextSubject = findSubjectByContext\(subjects, \{ subjectId: nextSubjectId \}\);/,
    'changing subject scope should validate modules against normalized recovered subject context',
  );

  assert.match(
    source,
    /return subjectMatchesContext\(activeSubject, \{\s*subjectIds: \[lesson\.subjectId\],\s*subjectNames: \[lesson\.subjectName\],\s*\}\);/s,
    'lesson scope filtering should match by normalized subject id or subject name instead of exact id-only checks',
  );

  assert.doesNotMatch(
    source,
    /const activeSubject = useMemo\(\(\) => subjects\.find\(\(subject\) => subject\.id === subjectId\) \?\? null, \[subjectId, subjects\]\);/,
    'asset library forms should not rely on brittle exact subject-id matching for active subject recovery',
  );

  assert.doesNotMatch(
    source,
    /if \(lesson\.subjectId === subjectId\) return true;/,
    'lesson scope filtering should not short-circuit on raw exact subject-id equality',
  );

  assert.match(
    source,
    /return lessonMatchesModule\(lesson, activeModule\);/,
    'module-scoped lesson filtering should recover drifted lesson/module links through the shared lesson matcher',
  );
});

test('lesson scope matcher keeps drifted module-title lessons visible in asset forms', () => {
  assert.equal(
    lessonMatchesModule(
      {
        id: 'lesson-1',
        moduleId: 'stale-module-id',
        moduleTitle: 'Reading Foundations',
        subjectId: 'stale-subject-id',
        subjectName: 'English',
        title: 'Blend short vowels',
      },
      {
        id: 'module-live',
        title: 'Reading Foundations',
        subjectId: 'subject-live',
        subjectName: 'English',
        status: 'published',
      },
    ),
    true,
  );
});
