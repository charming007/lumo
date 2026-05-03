import test from 'node:test';
import assert from 'node:assert/strict';

import { buildActivityDraftsFromLesson, buildActivityStepsFromDrafts, getPreviewAssetSummary } from './lesson-authoring-shared.ts';

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

test('buildActivityStepsFromDrafts keeps drag-to-match create/edit serialization on one shared path', () => {
  const [step] = buildActivityStepsFromDrafts([
    {
      id: 'activity-1',
      title: 'Match the helpers',
      prompt: 'Drag each helper to the right role.',
      type: 'drag_to_match',
      durationMinutes: '3',
      detail: '',
      evidence: '',
      expectedAnswers: 'teacher, nurse',
      tags: 'matching, drag',
      facilitatorNotes: 'Coach the first match only.',
      choiceLines: 'item-teacher|Teacher|target-school|image|asset:teacher-card\nitem-nurse|Nurse|target-clinic|image|asset:nurse-card',
      mediaLines: 'target-school|School|prompt-card|asset:school-zone\ntarget-clinic|Clinic|prompt-card|asset:clinic-zone',
    },
  ]);

  assert.equal(step?.choices?.length ?? 0, 0);
  assert.equal(step?.media?.length ?? 0, 0);
  assert.deepEqual(step?.dragItems?.map((item) => item.targetId), ['target-school', 'target-clinic']);
  assert.deepEqual(step?.dragTargets?.map((target) => target.prompt), ['School', 'Clinic']);
  assert.equal(step?.dragItems?.[0]?.media?.kind, 'image');
  assert.equal(step?.dragTargets?.[0]?.media?.kind, 'prompt-card');
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
