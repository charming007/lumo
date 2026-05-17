import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lessonEditorFormSource = readFileSync(fileURLToPath(new URL('./lesson-editor-form.tsx', import.meta.url)), 'utf8');

test('lesson editor form boots module state from recovered lesson context before stale lesson ids', () => {
  assert.match(
    lessonEditorFormSource,
    /const recoveredInitialModule = findModuleForLesson\(modules, lesson\);/,
    'lesson editor form should recover the initial module from normalized lesson/module matching before hydrating local state',
  );
  assert.match(
    lessonEditorFormSource,
    /const \[moduleId, setModuleId\] = useState\(recoveredInitialModule\?\.id \?\? lesson\.moduleId \?\? modules\[0\]\?\.id \?\? ''\);/,
    'lesson editor form should prefer the recovered module id so drifted lesson.moduleId values do not boot the editor into the wrong lane',
  );
  assert.match(
    lessonEditorFormSource,
    /moduleId: recoveredInitialModule\?\.id \?\? lesson\.moduleId \?\? modules\[0\]\?\.id \?\? ''/,
    'dirty-state baseline should track the recovered initial module id as well, not only the stale raw lesson.moduleId value',
  );
});
