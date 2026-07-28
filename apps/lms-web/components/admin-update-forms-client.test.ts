import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./admin-update-forms-client.tsx', import.meta.url)), 'utf8');

test('module update form re-seeds editable fields from the selected module instead of the first row', () => {
  assert.match(
    source,
    /const \[moduleId, setModuleId\] = useState\(modules\[0\]\?\.id \?\? ''\);/,
    'module update should track which module is actually selected',
  );

  assert.match(
    source,
    /const selectedModule = useMemo\([\s\S]*modules\.find\(\(item\) => item\.id === moduleId\) \?\? modules\[0\]/,
    'module update should derive its editable values from the actively selected module',
  );

  assert.match(
    source,
    /<FieldLabel>Title<input key=\{selectedModule\?\.id \?\? 'no-module'\} name="title" defaultValue=\{selectedModule\?\.title \?\? ''\} style=\{inputStyle\} \/><\/FieldLabel>/,
    'module title input should remount when the module selection changes so stale values cannot leak into another module save',
  );
});

test('lesson and assessment update forms also remount field defaults when the selected entity changes', () => {
  assert.match(
    source,
    /const selectedLesson = useMemo\([\s\S]*lessons\.find\(\(item\) => item\.id === lessonId\) \?\? lessons\[0\]/,
    'lesson update should resolve the active lesson from the current selection',
  );
  assert.match(
    source,
    /<FieldLabel>Mode<select key=\{`lesson-mode-\$\{selectedLesson\?\.id \?\? 'no-lesson'\}`\} name="mode" defaultValue=\{selectedLesson\?\.mode \?\? 'guided'\}/,
    'lesson mode should re-seed from the selected lesson instead of carrying the first lesson\'s mode forward',
  );
  assert.match(
    source,
    /const selectedAssessment = useMemo\([\s\S]*assessments\.find\(\(item\) => item\.id === assessmentId\) \?\? assessments\[0\]/,
    'assessment update should resolve the active assessment from the current selection',
  );
  assert.match(
    source,
    /<FieldLabel>Assessment title<input key=\{`assessment-title-\$\{selectedAssessment\?\.id \?\? 'no-assessment'\}`\} name="title" defaultValue=\{selectedAssessment\?\.title \?\? ''\} style=\{inputStyle\} \/><\/FieldLabel>/,
    'assessment title should remount when the assessment changes so operators cannot silently overwrite one gate with another gate\'s title',
  );
});
