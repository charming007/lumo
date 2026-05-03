import test from 'node:test';
import assert from 'node:assert/strict';

import { buildActivityDraftsFromLesson, getPreviewAssetSummary } from './lesson-authoring-shared.ts';

test('buildActivityDraftsFromLesson keeps drag-to-match duplicate hydration stable for legacy-safe lesson payloads', () => {
  const drafts = buildActivityDraftsFromLesson({
    id: 'lesson-drag',
    title: 'Match the helpers',
    durationMinutes: 8,
    mode: 'guided',
    status: 'draft',
    activitySteps: [
      {
        id: 'step-drag',
        type: 'drag_to_match',
        title: 'Match the helpers',
        prompt: 'Drag each helper to the right role.',
        expectedAnswers: ['teacher', 'nurse'],
        dragItems: [
          { id: 'item-teacher', label: 'Teacher', targetId: 'target-school', media: { kind: 'image', value: ['asset:teacher-card', 'asset:teacher-card-2'] } },
          { id: 'item-nurse', label: 'Nurse', targetId: 'target-clinic', media: { kind: 'image', value: 'asset:nurse-card' } },
        ],
        dragTargets: [
          { id: 'target-school', prompt: 'School', media: { kind: 'prompt-card', value: 'asset:school-zone' } },
          { id: 'target-clinic', prompt: 'Clinic' },
        ],
      },
    ],
  });

  assert.equal(drafts.length, 1);
  assert.equal(
    drafts[0]?.choiceLines,
    'item-teacher|Teacher|target-school|image|asset:teacher-card, asset:teacher-card-2\nitem-nurse|Nurse|target-clinic|image|asset:nurse-card',
  );
  assert.equal(
    drafts[0]?.mediaLines,
    'target-school|School|prompt-card|asset:school-zone\ntarget-clinic|Clinic',
  );
});

test('getPreviewAssetSummary counts drag-to-match assets instead of treating the step like text-only filler', () => {
  const summary = getPreviewAssetSummary({
    id: 'step-drag',
    type: 'drag_to_match',
    prompt: 'Match each helper to the right place.',
    dragItems: [
      { id: 'item-1', label: 'Teacher', targetId: 'target-1', media: { kind: 'image', value: 'asset:teacher-card' } },
      { id: 'item-2', label: 'Nurse', targetId: 'target-2', media: { kind: 'image', value: 'asset:nurse-card' } },
    ],
    dragTargets: [
      { id: 'target-1', prompt: 'School', media: { kind: 'prompt-card', value: 'asset:school-zone' } },
      { id: 'target-2', prompt: 'Clinic', media: { kind: 'prompt-card', value: 'asset:clinic-zone' } },
    ],
  });

  assert.equal(summary.label, 'Drag match mapped');
  assert.equal(summary.isMediaBacked, true);
  assert.equal(summary.totalAssetEntries, 4);
  assert.equal(summary.readinessLabel, 'Media-backed');
  assert.deepEqual(summary.assetKinds, ['Image', 'Prompt card']);
});
