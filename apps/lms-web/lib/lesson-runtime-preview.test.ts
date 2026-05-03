import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./lesson-runtime-preview.ts', import.meta.url)), 'utf8');

test('lesson runtime preview includes drag-to-match assets in preview + readiness summaries', () => {
  assert.match(
    source,
    /buildLessonAssetPreviewItems\(step: Pick<LessonActivityStep, 'media' \| 'choices' \| 'dragItems' \| 'dragTargets'>/,
    'runtime preview should accept drag item/target payloads instead of only generic choices/media',
  );

  assert.match(
    source,
    /const dragItems = \(Array\.isArray\(step\.dragItems\) \? step\.dragItems : \[\]\)/,
    'preview builder should surface drag card assets',
  );

  assert.match(
    source,
    /const dragTargets = \(Array\.isArray\(step\.dragTargets\) \? step\.dragTargets : \[\]\)/,
    'preview builder should surface target zone assets',
  );

  assert.match(
    source,
    /step\.dragItems\.map\(\(item\) => item\.media\)/,
    'asset summary should count drag card media instead of ignoring it',
  );

  assert.match(
    source,
    /step\.dragTargets\.map\(\(target\) => target\.media\)/,
    'asset summary should count target zone media instead of ignoring it',
  );
});
