import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTopReleaseBlockerCta } from './dashboard-top-blocker.ts';

test('launches lesson studio only when subject metadata is still trustworthy', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 2,
    hasAuthoringContext: true,
    subjectMetadataDegraded: false,
  }), {
    canLaunchLessonStudio: true,
    label: 'Create 2 missing lessons',
  });
});

test('still launches lesson studio when the module already carries recoverable subject context', () => {
  assert.deepEqual(resolveTopReleaseBlockerCta({
    missingLessons: 2,
    hasAuthoringContext: true,
    subjectMetadataDegraded: true,
  }), {
    canLaunchLessonStudio: true,
    label: 'Create 2 missing lessons',
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
