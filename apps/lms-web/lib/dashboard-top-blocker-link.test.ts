import assert from 'node:assert/strict';
import test from 'node:test';

import type { DashboardReleaseBlocker } from './dashboard-release.ts';
import { buildTopReleaseBlockerBoardHref, resolveTopReleaseBlockerPrimaryHref } from './dashboard-top-blocker-link.ts';

const blocker: DashboardReleaseBlocker = {
  id: 'module-reading-1',
  title: 'Reading lane',
  subjectId: 'subject-english',
  subjectName: 'English',
  missingLessons: 2,
  hasAssessmentGate: true,
  isDraftModule: false,
  hasAuthoringContext: true,
  blockerCount: 2,
  priorityWeight: 3,
};

test('builds the scoped blocker board href with normalized subject context', () => {
  const href = buildTopReleaseBlockerBoardHref({
    ...blocker,
    subjectId: '  subject-english  ',
  });

  assert.equal(
    href,
    '/content?view=blocked&moduleId=module-reading-1&subject=subject-english&q=Reading+lane',
  );
});

test('drops blank subject context from the scoped blocker board href', () => {
  const href = buildTopReleaseBlockerBoardHref({
    ...blocker,
    subjectId: '   ',
  });

  assert.equal(
    href,
    '/content?view=blocked&moduleId=module-reading-1&q=Reading+lane',
  );
});

test('routes single-lesson blockers into lesson studio', () => {
  const href = resolveTopReleaseBlockerPrimaryHref({
    blocker: {
      ...blocker,
      missingLessons: 1,
    },
    boardHref: '/content?view=blocked&moduleId=module-reading-1',
    canLaunchLessonStudio: true,
  });

  assert.equal(
    href,
    '/content/lessons/new?subjectId=subject-english&moduleId=module-reading-1&from=%2Fcontent%3Fview%3Dblocked%26moduleId%3Dmodule-reading-1&focus=blockers',
  );
});

test('routes multi-lesson blockers into the canvas bulk shell flow', () => {
  const href = resolveTopReleaseBlockerPrimaryHref({
    blocker,
    boardHref: '/content?view=blocked&moduleId=module-reading-1',
    canLaunchLessonStudio: false,
  });

  assert.equal(
    href,
    '/canvas?subject=subject-english&module=module-reading-1&readiness=blocked&q=Reading+lane',
  );
});

test('falls back to the blocker board when authoring context is missing', () => {
  const href = resolveTopReleaseBlockerPrimaryHref({
    blocker: {
      ...blocker,
      hasAuthoringContext: false,
    },
    boardHref: '/content?view=blocked&moduleId=module-reading-1',
    canLaunchLessonStudio: false,
  });

  assert.equal(href, '/content?view=blocked&moduleId=module-reading-1');
});

test('keeps single-lesson blocker launches alive when the subject id is blank but module context is recoverable', () => {
  const href = resolveTopReleaseBlockerPrimaryHref({
    blocker: {
      ...blocker,
      subjectId: '   ',
      missingLessons: 1,
    },
    boardHref: '/content?view=blocked&moduleId=module-reading-1',
    canLaunchLessonStudio: true,
  });

  assert.equal(
    href,
    '/content/lessons/new?moduleId=module-reading-1&from=%2Fcontent%3Fview%3Dblocked%26moduleId%3Dmodule-reading-1&focus=blockers',
  );
});

test('recovered subject ids flow through blocker-board and lesson-studio CTAs after dashboard normalization', () => {
  const recoveredBlocker = {
    ...blocker,
    subjectId: 'subject-legacy-english',
  } satisfies DashboardReleaseBlocker;

  const boardHref = buildTopReleaseBlockerBoardHref({
    ...recoveredBlocker,
    subjectId: 'subject-english',
  });
  const lessonHref = resolveTopReleaseBlockerPrimaryHref({
    blocker: {
      ...recoveredBlocker,
      subjectId: 'subject-english',
      missingLessons: 1,
    },
    boardHref,
    canLaunchLessonStudio: true,
  });

  assert.equal(
    boardHref,
    '/content?view=blocked&moduleId=module-reading-1&subject=subject-english&q=Reading+lane',
  );
  assert.equal(
    lessonHref,
    '/content/lessons/new?subjectId=subject-english&moduleId=module-reading-1&from=%2Fcontent%3Fview%3Dblocked%26moduleId%3Dmodule-reading-1%26subject%3Dsubject-english%26q%3DReading%2Blane&focus=blockers',
  );
});

test('keeps multi-lesson blocker launches alive when the subject id is blank but module context is recoverable', () => {
  const href = resolveTopReleaseBlockerPrimaryHref({
    blocker: {
      ...blocker,
      subjectId: '',
    },
    boardHref: '/content?view=blocked&moduleId=module-reading-1',
    canLaunchLessonStudio: false,
  });

  assert.equal(href, '/canvas?module=module-reading-1&readiness=blocked&q=Reading+lane');
});
