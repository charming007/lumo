import test from 'node:test';
import assert from 'node:assert/strict';

import { getLessonStatusTransitionBlockers, isLessonReleaseReady, lessonHasLaunchableActivityPayload } from './lesson-release-readiness.ts';

test('lessonHasLaunchableActivityPayload treats explicit activity count as launchable payload', () => {
  assert.equal(lessonHasLaunchableActivityPayload({ activityCount: 2 } as any), true);
  assert.equal(lessonHasLaunchableActivityPayload({ activityCount: 0 } as any), false);
});

test('lessonHasLaunchableActivityPayload falls back to activity steps or activities arrays', () => {
  assert.equal(lessonHasLaunchableActivityPayload({ activitySteps: [{ id: 'step-1' }] } as any), true);
  assert.equal(lessonHasLaunchableActivityPayload({ activitySteps: [] } as any), false);
  assert.equal(lessonHasLaunchableActivityPayload({ activities: [{ id: 'step-1' }] } as any), true);
  assert.equal(lessonHasLaunchableActivityPayload({ activities: [] } as any), false);
});

test('isLessonReleaseReady blocks approved or published lesson shells that have no activity payload', () => {
  assert.equal(isLessonReleaseReady({ status: 'approved', activityCount: 0 } as any), false);
  assert.equal(isLessonReleaseReady({ status: 'published', activitySteps: [] } as any), false);
  assert.equal(isLessonReleaseReady({ status: 'active', activities: [] } as any), false);
});

test('isLessonReleaseReady requires both a release-safe status and a launchable payload', () => {
  assert.equal(isLessonReleaseReady({ status: 'approved', activityCount: 1 } as any), true);
  assert.equal(isLessonReleaseReady({ status: 'review', activityCount: 3 } as any), false);
});

test('getLessonStatusTransitionBlockers rejects release-ish status changes for payload-empty lessons', () => {
  assert.deepEqual(
    getLessonStatusTransitionBlockers('approved', { status: 'draft', activityCount: 0 } as any),
    ['Add a launchable activity payload before moving this lesson into a live release status.'],
  );
  assert.deepEqual(getLessonStatusTransitionBlockers('review', { status: 'draft', activityCount: 0 } as any), []);
  assert.deepEqual(getLessonStatusTransitionBlockers('published', { status: 'review', activitySteps: [{ id: 'step-1' }] } as any), []);
});
