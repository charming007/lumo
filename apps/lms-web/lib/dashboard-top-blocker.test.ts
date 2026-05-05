import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTopReleaseBlockerCta } from './dashboard-top-blocker.ts';

test('keeps multi-slot blockers on the bulk shell flow instead of dumping operators into single-lesson studio', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 2,
    hasAuthoringContext: true,
    subjectMetadataDegraded: false,
  }), {
    canLaunchLessonStudio: false,
    label: 'Open bulk lesson shell flow (2)',
  });
});

test('still keeps multi-slot blockers on the bulk shell flow even when module subject context is recoverable', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 2,
    hasAuthoringContext: true,
    subjectMetadataDegraded: true,
  }), {
    canLaunchLessonStudio: false,
    label: 'Open bulk lesson shell flow (2)',
  });
});

test('launches lesson studio for a single missing lesson when authoring context is trustworthy', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 1,
    hasAuthoringContext: true,
    subjectMetadataDegraded: false,
  }), {
    canLaunchLessonStudio: true,
    label: 'Create missing lesson',
  });
});

test('keeps recovery wording when authoring context is missing entirely', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 1,
    hasAuthoringContext: false,
    subjectMetadataDegraded: false,
  }), {
    canLaunchLessonStudio: false,
    label: 'Recover subject context first',
  });
});

test('opens the exact blocker when there is no missing-lesson shortcut to offer', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 0,
    hasAuthoringContext: true,
    subjectMetadataDegraded: false,
  }), {
    canLaunchLessonStudio: false,
    label: 'Open exact blocker',
  });
});
