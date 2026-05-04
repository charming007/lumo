import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./lesson-asset-library-panel.tsx', import.meta.url)), 'utf8');
const builderSource = readFileSync(fileURLToPath(new URL('./lesson-activity-structured-builders.tsx', import.meta.url)), 'utf8');

test('drag-to-match asset panel writes drag rows instead of corrupting generic choice/media lines', () => {
  assert.match(
    source,
    /function appendDragItemLine\(/,
    'asset panel should have a drag-card line appender',
  );

  assert.match(
    source,
    /function appendDragTargetLine\(/,
    'asset panel should have a drag-target line appender',
  );

  assert.match(
    source,
    /stepType === 'drag_to_match' \? \(/,
    'drag-to-match should take its own insertion path in the asset picker actions',
  );

  assert.match(
    source,
    /Add as drag card/,
    'drag asset picker should offer drag-card insertion instead of generic choice insertion',
  );

  assert.match(
    source,
    /Add as target zone/,
    'drag asset picker should offer target-zone insertion instead of generic shared media insertion',
  );

  assert.doesNotMatch(
    source,
    /appliesTo: \['image_choice', 'tap_choice', 'drag_to_match'\]/,
    'generic image choice templates should not pretend drag-to-match uses the same row shape',
  );
});

test('lesson asset pickers keep scoped assets visible when module or subject ids drift but names still match', () => {
  for (const [label, fileSource] of [['panel', source], ['builder', builderSource]] as const) {
    assert.match(
      fileSource,
      /function getScopeRank\(asset: LessonAsset, lessonId\?: string, module\?: \{ id\?: string \| null; title\?: string \| null; subjectId\?: string \| null; subjectName\?: string \| null \} \| null, subjectId\?: string, subjectName\?: string\)/,
      `${label} should accept recovered module context alongside subject context for scope ranking`,
    );
    assert.match(
      fileSource,
      /assetMatchesModuleContext\(asset, module\)/,
      `${label} should recover module scope through the shared asset/module matcher instead of exact module-id checks`,
    );
    assert.match(
      fileSource,
      /const normalizedSubjectName = normalizeScopeValue\(subjectName\);[\s\S]*const normalizedAssetSubjectName = normalizeScopeValue\(asset\.subjectName\);[\s\S]*normalizedAssetSubjectName === normalizedSubjectName/s,
      `${label} should recover subject scope from normalized subject names when ids drift`,
    );
  }
});
