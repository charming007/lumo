const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-learner-bootstrap-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';

const repository = require('../src/repository');
const rewards = require('../src/rewards');
const { startServer } = require('../src/main');

let server;
let baseUrl;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  return {
    status: response.status,
    body: raw ? JSON.parse(raw) : null,
  };
}

test.before(async () => {
  server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('legacy learner bootstrap alias returns the same contract as learner-app bootstrap', async () => {
  const canonical = await request('/api/v1/learner-app/bootstrap');
  const legacy = await request('/api/v1/learner/bootstrap');

  assert.equal(canonical.status, 200);
  assert.equal(legacy.status, 200);
  assert.deepEqual(
    { ...legacy.body, meta: { ...legacy.body.meta, generatedAt: null } },
    { ...canonical.body, meta: { ...canonical.body.meta, generatedAt: null } },
  );
});

test('learner bootstrap projects published subjects first while keeping lesson subject links intact', async () => {
  const lessonA = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Greetings hello',
    durationMinutes: 12,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say hello.' }],
  });
  const lessonB = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-5',
    title: 'Letter sound s',
    durationMinutes: 10,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say s.' }],
  });

  repository.createAssessment({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Greetings gate',
    kind: 'automatic',
    trigger: 'module-complete',
    triggerLabel: 'After module completion',
    progressionGate: 'bridge',
    passingScore: 0.7,
    status: 'active',
  });
  repository.createAssessment({
    subjectId: 'english',
    moduleId: 'module-5',
    title: 'Phonics gate',
    kind: 'automatic',
    trigger: 'module-complete',
    triggerLabel: 'After module completion',
    progressionGate: 'bridge',
    passingScore: 0.7,
    status: 'active',
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: lessonA.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-20',
    status: 'active',
  });
  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: lessonB.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-21',
    status: 'active',
  });

  const response = await request('/api/v1/learner-app/bootstrap');

  assert.equal(response.status, 200);

  const subjectIds = response.body.modules.map((subject) => subject.id);
  assert.equal(subjectIds.includes('english'), true, JSON.stringify(response.body.modules));
  assert.equal(subjectIds.includes('module-1'), false, JSON.stringify(response.body.modules));
  assert.equal(subjectIds.includes('module-5'), false, JSON.stringify(response.body.modules));

  const englishSubject = response.body.modules.find((subject) => subject.id === 'english');
  assert.ok(englishSubject, JSON.stringify(response.body.modules));
  assert.equal(englishSubject.lessonCount >= 2, true, JSON.stringify(englishSubject));

  const lessonSubjectIds = response.body.lessons
    .filter((lesson) => lesson.id === lessonA.id || lesson.id === lessonB.id)
    .map((lesson) => lesson.lessonPack?.subjectId);
  assert.deepEqual([...new Set(lessonSubjectIds)], ['english']);

  const assignmentModuleIds = response.body.assignments
    .filter((assignment) => assignment.lessonPack?.lessonId === lessonA.id || assignment.lessonPack?.lessonId === lessonB.id)
    .map((assignment) => assignment.lessonPack?.moduleKey)
    .sort();
  assert.deepEqual(assignmentModuleIds, ['module-1', 'module-5']);
});

test('learner module bundle keeps the same projected lessons visible in bootstrap', async () => {
  const lessonA = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Greeting circle',
    durationMinutes: 12,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say hello.' }],
  });
  const lessonB = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Ask a friend\'s name',
    durationMinutes: 10,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Ask their name.' }],
  });

  const bootstrap = await request('/api/v1/learner-app/bootstrap');
  assert.equal(bootstrap.status, 200);

  const bundle = await request('/api/v1/learner-app/modules/module-1');
  assert.equal(bundle.status, 200);

  const bootstrapLessonIds = bootstrap.body.lessons
    .filter((lesson) => lesson.id === lessonA.id || lesson.id === lessonB.id)
    .map((lesson) => lesson.id)
    .sort();
  const bundleLessonIds = bundle.body.lessons
    .filter((lesson) => lesson.id === lessonA.id || lesson.id === lessonB.id)
    .map((lesson) => lesson.id)
    .sort();

  assert.deepEqual(bundleLessonIds, bootstrapLessonIds);
});

test('learner bootstrap keeps unpublished module labels hidden while assigned lessons still retain module routing metadata', async () => {
  repository.updateModule('module-4', { status: 'review' });
  const reviewLesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-4',
    title: 'Daily conversation check-in',
    durationMinutes: 11,
    status: 'review',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'How are you today?' }],
  });

  repository.createAssessment({
    subjectId: 'english',
    moduleId: 'module-4',
    title: 'Conversation gate',
    kind: 'automatic',
    trigger: 'module-complete',
    triggerLabel: 'After module completion',
    progressionGate: 'bridge',
    passingScore: 0.7,
    status: 'active',
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: reviewLesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-22',
    status: 'active',
  });

  const response = await request('/api/v1/learner-app/bootstrap');

  assert.equal(response.status, 200);
  const englishSubject = response.body.modules.find((module) => module.id === 'english');
  assert.ok(englishSubject, JSON.stringify(response.body.modules));
  const hiddenReviewModule = response.body.modules.find((module) => module.id === 'module-4');
  assert.equal(hiddenReviewModule, undefined, JSON.stringify(response.body.modules));

  const projectedLesson = response.body.lessons.find((lesson) => lesson.id === reviewLesson.id);
  assert.equal(projectedLesson, undefined, JSON.stringify(response.body.lessons));

  const reviewAssignment = response.body.assignments.find(
    (assignment) => assignment.lessonPack?.lessonId === reviewLesson.id,
  );
  assert.ok(reviewAssignment, JSON.stringify(response.body.assignments));
  assert.equal(reviewAssignment.lessonPack?.moduleKey, 'module-4');
  assert.equal(reviewAssignment.lessonPack?.subjectId, 'english');
});

test('learner bootstrap keeps scheduled assignments without exposing unpublished lessons on the subject list', async () => {
  repository.updateModule('module-3', { status: 'review' });
  const scheduledLesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-3',
    title: 'Planned speaking rehearsal',
    durationMinutes: 13,
    status: 'draft',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Practice the greeting.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: scheduledLesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-25',
    status: 'scheduled',
  });

  const response = await request('/api/v1/learner-app/bootstrap');

  assert.equal(response.status, 200);
  const projectedLesson = response.body.lessons.find((lesson) => lesson.id === scheduledLesson.id);
  assert.equal(projectedLesson, undefined, JSON.stringify(response.body.lessons));

  const scheduledAssignment = response.body.assignments.find(
    (assignment) => assignment.lessonPack?.lessonId === scheduledLesson.id,
  );
  assert.ok(scheduledAssignment, JSON.stringify(response.body.assignments));
  assert.equal(scheduledAssignment.status, 'scheduled');
  assert.equal(scheduledAssignment.lessonPack?.subjectId, 'english');
});

test('module bundle still exposes assigned unpublished lessons for internal routing while bootstrap stays subject-first', async () => {
  repository.updateModule('module-5', { status: 'review' });
  const assignedLessonA = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-5',
    title: 'Sound hunt one',
    durationMinutes: 9,
    status: 'draft',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say s.' }],
  });
  const assignedLessonB = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-5',
    title: 'Sound hunt two',
    durationMinutes: 9,
    status: 'review',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say t.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: assignedLessonA.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-23',
    status: 'active',
  });
  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: assignedLessonB.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-24',
    status: 'active',
  });

  const bootstrap = await request('/api/v1/learner-app/bootstrap');
  assert.equal(bootstrap.status, 200);

  const bootstrapLessonIds = bootstrap.body.lessons
    .filter((lesson) => lesson.id === assignedLessonA.id || lesson.id === assignedLessonB.id)
    .map((lesson) => lesson.id)
    .sort();
  assert.deepEqual(bootstrapLessonIds, []);

  const bundle = await request('/api/v1/learner-app/modules/module-5');
  assert.equal(bundle.status, 200);

  const bundleLessonIds = bundle.body.lessons
    .filter((lesson) => lesson.id === assignedLessonA.id || lesson.id === assignedLessonB.id)
    .map((lesson) => lesson.id)
    .sort();

  assert.deepEqual(bundleLessonIds, [assignedLessonA.id, assignedLessonB.id].sort());
  assert.equal(bundle.body.lessonCount >= 2, true, JSON.stringify(bundle.body));
});

test('learner bootstrap derives learner geography and mallam from the assigned pod instead of stale mallam fallback data', async () => {
  repository.updateTeacher('teacher-2', { podIds: ['pod-2'], primaryPodId: 'pod-2' });
  const student = repository.createStudent({
    cohortId: 'cohort-1',
    mallamId: 'teacher-2',
    name: 'Canonical pod learner',
    age: 8,
    gender: 'female',
    level: 'beginner',
    stage: 'foundation-a',
    attendanceRate: 0.87,
    guardianName: 'Guardian Canonical',
    deviceAccess: 'shared-tablet',
  });

  const response = await request('/api/v1/learner-app/bootstrap?deviceIdentifier=lumo-tablet-kano-01');
  assert.equal(response.status, 200, JSON.stringify(response.body));

  const presented = response.body.learners.find((learner) => learner.id === student.id);
  assert.ok(presented, JSON.stringify(response.body.learners));
  assert.equal(presented.podId, 'pod-1');
  assert.equal(presented.podLabel, 'Kano Pod 01');
  assert.equal(presented.village, 'Kano Pod 01');
  assert.equal(presented.mallamId, 'teacher-1');
  assert.equal(presented.mallamName, 'Mallama Amina Yusuf');
});


test('learner bootstrap normalizes stale learner pod fields to the canonical cohort pod', async () => {
  const student = repository.createStudent({
    cohortId: 'cohort-1',
    podId: 'pod-1',
    mallamId: 'teacher-1',
    name: 'Stale Pod Label Learner',
    age: 8,
    gender: 'female',
    level: 'beginner',
    stage: 'foundation-a',
    guardianName: 'Guardian Stale',
    deviceAccess: 'shared-tablet',
  });

  const persisted = repository.findStudentById(student.id);
  persisted.podId = 'pod-2';
  persisted.podLabel = 'Wrong Pod Label';

  const response = await request('/api/v1/learner-app/bootstrap?deviceIdentifier=lumo-tablet-kano-01');
  assert.equal(response.status, 200, JSON.stringify(response.body));

  const presented = response.body.learners.find((learner) => learner.id === student.id);
  assert.ok(presented, JSON.stringify(response.body.learners));
  assert.equal(presented.podId, 'pod-1');
  assert.equal(presented.podLabel, 'Kano Pod 01');
  assert.equal(response.body.learners.some((learner) => learner.id === student.id && learner.podId === 'pod-2'), false);

  const normalized = repository.findStudentById(student.id);
  assert.equal(normalized.podId, 'pod-1');
  assert.equal(Object.hasOwn(normalized, 'podLabel'), false);
});

test('tablet-scoped bootstrap only returns pod-scoped learners across roster, assignment, and launch availability payloads', async () => {
  const scopedLesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Scoped pod launch roster check',
    durationMinutes: 8,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say scoped.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: scopedLesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-24',
    status: 'active',
  });

  const response = await request('/api/v1/learner-app/bootstrap?deviceIdentifier=lumo-tablet-kano-01');

  assert.equal(response.status, 200);
  assert.deepEqual(
    [...new Set(response.body.learners.map((learner) => learner.podId))],
    ['pod-1'],
  );
  assert.equal(response.body.learners.some((learner) => learner.id === 'student-4'), false);
  assert.deepEqual(
    response.body.registrationContext.cohorts.map((cohort) => cohort.podId),
    ['pod-1', 'pod-1'],
  );
  assert.deepEqual(
    [...new Set(response.body.registrationContext.mallams.flatMap((mallam) => mallam.podIds))],
    ['pod-1'],
  );
  assert.equal(response.body.registrationContext.tabletRegistration.deviceIdentifier, 'lumo-tablet-kano-01');
  assert.equal(response.body.meta.scopedPodId, 'pod-1');

  const scopedAssignment = response.body.assignments.find(
    (assignment) => assignment.lessonPack?.lessonId === scopedLesson.id,
  );
  assert.ok(scopedAssignment, JSON.stringify(response.body.assignments));
  assert.equal(scopedAssignment.eligibleLearners.length >= 1, true, JSON.stringify(scopedAssignment));
  assert.equal(
    scopedAssignment.eligibleLearners.every((learner) => learner.podId === 'pod-1'),
    true,
    JSON.stringify(scopedAssignment),
  );
  assert.equal(
    scopedAssignment.eligibleLearners.some((learner) => learner.id === 'student-4'),
    false,
    JSON.stringify(scopedAssignment),
  );

  const scopedAvailability = response.body.lessonAvailability.find(
    (entry) => entry.lessonId === scopedLesson.id,
  );
  assert.ok(scopedAvailability, JSON.stringify(response.body.lessonAvailability));
  assert.equal(
    scopedAvailability.availableLearners.every((learner) => learner.podId === 'pod-1'),
    true,
    JSON.stringify(scopedAvailability),
  );
  assert.equal(
    scopedAvailability.availableLearners.some((learner) => learner.id === 'student-4'),
    false,
    JSON.stringify(scopedAvailability),
  );

  const scopedLearnerIds = new Set(response.body.learners.map((learner) => learner.id));
  assert.equal(
    response.body.learnerStatuses.every((status) => scopedLearnerIds.has(status.learnerId)),
    true,
    JSON.stringify(response.body.learnerStatuses),
  );
});

test('tablet-scoped learner registration rejects cross-pod cohort selection and pins valid learners to the tablet pod', async () => {
  const rejected = await request('/api/v1/learner-app/learners', {
    method: 'POST',
    headers: { 'x-lumo-device-identifier': 'lumo-tablet-kano-01' },
    body: JSON.stringify({
      name: 'Scoped mismatch',
      age: 8,
      cohortId: 'cohort-3',
      podId: 'pod-2',
      mallamId: 'teacher-2',
    }),
  });

  assert.equal(rejected.status, 409);

  const created = await request('/api/v1/learner-app/learners', {
    method: 'POST',
    headers: { 'x-lumo-device-identifier': 'lumo-tablet-kano-01' },
    body: JSON.stringify({
      name: 'Scoped learner',
      age: 7,
      cohortId: 'cohort-1',
      preferredLanguage: 'Hausa',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.podId, 'pod-1');
  assert.equal(created.body.mallamId, 'teacher-1');
});


test('learner availability marks same-day completed lessons as completed and not startable', async () => {
  const lesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Shared tablet completion lockout',
    durationMinutes: 9,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say hello again.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: lesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-23',
    status: 'active',
  });

  const learner = repository.listStudents().find((entry) => entry.cohortId === 'cohort-1');
  assert.ok(learner);

  const syncResponse = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'tablet-test-client',
      batchId: 'batch-completed-availability',
      events: [
        {
          clientEventId: 'completed-availability-1',
          type: 'lesson_completed',
          payload: {
            sessionId: 'session-completed-availability-1',
            studentId: learner.id,
            learnerCode: learner.learnerCode,
            lessonId: lesson.id,
            moduleId: lesson.moduleId,
            stepIndex: 1,
            stepsTotal: 1,
            completionState: 'completed',
            review: 'onTrack',
            capturedAt: '2026-04-23T10:00:00.000Z',
          },
        },
      ],
    }),
  });

  assert.equal(syncResponse.status, 202);

  const bootstrap = await request('/api/v1/learner-app/bootstrap');
  assert.equal(bootstrap.status, 200);

  const projectedLesson = bootstrap.body.lessons.find((entry) => entry.id === lesson.id);
  assert.ok(projectedLesson, JSON.stringify(bootstrap.body.lessons));
  const availability = projectedLesson.learnerAvailability;
  assert.ok(availability, JSON.stringify(projectedLesson));
  assert.equal(availability.counts.completed >= 1, true, JSON.stringify(availability));

  const learnerEntry = availability.availableLearners.find((entry) => entry.id === learner.id);
  assert.ok(learnerEntry, JSON.stringify(availability.availableLearners));
  assert.equal(learnerEntry.lessonStatus.status, 'completed');
  assert.equal(learnerEntry.lessonStatus.canStart, false);
  assert.equal(learnerEntry.lessonStatus.canResume, false);
  assert.equal(learnerEntry.lessonStatus.isTerminalUnavailable, true);
});

test('learner availability supports absent terminal status from offline tablet sync', async () => {
  const lesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Shared tablet absent lockout',
    durationMinutes: 9,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say hello again.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: lesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-23',
    status: 'active',
  });

  const learner = repository.listStudents().find((entry) => entry.cohortId === 'cohort-1');
  assert.ok(learner);

  const syncResponse = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'tablet-test-client',
      batchId: 'batch-absent-availability',
      events: [
        {
          clientEventId: 'absent-availability-1',
          type: 'learner_marked_absent',
          payload: {
            sessionId: 'session-absent-availability-1',
            studentId: learner.id,
            learnerCode: learner.learnerCode,
            lessonId: lesson.id,
            moduleId: lesson.moduleId,
            capturedAt: '2026-04-23T11:00:00.000Z',
          },
        },
      ],
    }),
  });

  assert.equal(syncResponse.status, 202);
  assert.equal(syncResponse.body.results[0].session.completionState, 'absent');
  assert.equal(syncResponse.body.results[0].session.status, 'absent');

  const bootstrap = await request('/api/v1/learner-app/bootstrap');
  assert.equal(bootstrap.status, 200);

  const projectedLesson = bootstrap.body.lessons.find((entry) => entry.id === lesson.id);
  assert.ok(projectedLesson, JSON.stringify(bootstrap.body.lessons));
  const availability = projectedLesson.learnerAvailability;
  assert.ok(availability, JSON.stringify(projectedLesson));
  assert.equal(availability.counts.absent >= 1, true, JSON.stringify(availability));

  const learnerEntry = availability.availableLearners.find((entry) => entry.id === learner.id);
  assert.ok(learnerEntry, JSON.stringify(availability.availableLearners));
  assert.equal(learnerEntry.lessonStatus.status, 'absent');
  assert.equal(learnerEntry.lessonStatus.canStart, false);
  assert.equal(learnerEntry.lessonStatus.isTerminalUnavailable, true);
});

test('learner reward redemption sync accepts stable student identifiers and updates reward totals', async () => {
  const learner = repository.listStudents().find((entry) => entry.id === 'student-1');
  assert.ok(learner);

  const before = rewards.buildLearnerRewards(learner.id);
  const syncResponse = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    body: JSON.stringify({
      events: [
        {
          id: 'reward-redemption-student-1',
          type: 'learner_reward_redeemed',
          studentId: learner.id,
          learnerCode: learner.learnerCode,
          rewardId: 'tablet-reward-1',
          optionId: 'helper-star',
          title: 'Helper Star',
          category: 'celebration',
          cost: 15,
          redeemedAt: '2026-04-23T11:30:00.000Z',
        },
      ],
    }),
  });

  assert.equal(syncResponse.status, 202, JSON.stringify(syncResponse.body));
  assert.equal(syncResponse.body.accepted, 1, JSON.stringify(syncResponse.body));
  assert.equal(syncResponse.body.results[0].type, 'learner_reward_redeemed');
  assert.equal(syncResponse.body.results[0].rewards.totalXp, before.totalXp - 15);

  const after = rewards.buildLearnerRewards(learner.id);
  assert.equal(after.totalXp, before.totalXp - 15);

  const redemption = repository.listRewardTransactions().find((entry) => entry.metadata?.clientRewardId === 'tablet-reward-1');
  assert.ok(redemption, JSON.stringify(repository.listRewardTransactions()));
  assert.equal(redemption.studentId, learner.id);
  assert.equal(redemption.kind, 'redemption');
  assert.equal(redemption.xpDelta, -15);
});

test('tablet-scoped learner registration also resolves pod scope from body deviceIdentifier when the header is absent', async () => {
  const created = await request('/api/v1/learner-app/learners', {
    method: 'POST',
    body: JSON.stringify({
      deviceIdentifier: 'lumo-tablet-kano-01',
      name: 'Scoped body learner',
      age: 7,
      cohortId: 'cohort-1',
      podId: 'pod-2',
      mallamId: 'teacher-2',
      preferredLanguage: 'Hausa',
    }),
  });

  assert.equal(created.status, 409);

  const accepted = await request('/api/v1/learner-app/learners', {
    method: 'POST',
    body: JSON.stringify({
      deviceIdentifier: 'lumo-tablet-kano-01',
      name: 'Scoped body learner',
      age: 7,
      cohortId: 'cohort-1',
      preferredLanguage: 'Hausa',
    }),
  });

  assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
  assert.equal(accepted.body.podId, 'pod-1');
  assert.equal(accepted.body.mallamId, 'teacher-1');
});


test('tablet-scoped bootstrap and learner registration use the pod canonical mallam even when device registration stores a stale mallam', async () => {
  const registration = repository.findDeviceRegistrationByIdentifier('lumo-tablet-kano-01');
  assert.ok(registration);
  registration.assignedMallamId = 'teacher-2';

  const bootstrap = await request('/api/v1/learner-app/bootstrap?deviceIdentifier=lumo-tablet-kano-01');
  assert.equal(bootstrap.status, 200, JSON.stringify(bootstrap.body));
  assert.equal(bootstrap.body.registrationContext.tabletRegistration.podId, 'pod-1');
  assert.equal(bootstrap.body.registrationContext.tabletRegistration.mallamId, 'teacher-1');
  assert.equal(bootstrap.body.registrationContext.tabletRegistration.mallamName, 'Mallama Amina Yusuf');
  assert.equal(bootstrap.body.registrationContext.defaultTarget.mallamId, 'teacher-1');

  const created = await request('/api/v1/learner-app/learners', {
    method: 'POST',
    headers: { 'x-lumo-device-identifier': 'lumo-tablet-kano-01' },
    body: JSON.stringify({
      name: 'Canonical device mallam learner',
      age: 8,
      cohortId: 'cohort-1',
      preferredLanguage: 'Hausa',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.podId, 'pod-1');
  assert.equal(created.body.mallamId, 'teacher-1');
  assert.equal(created.body.mallamName, 'Mallama Amina Yusuf');
});


test('learner bootstrap exposes pod-scoped learner availability and per-learner lesson statuses for lesson launch', async () => {
  const lesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Shared tablet readiness lesson',
    durationMinutes: 12,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say hello.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: lesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-24',
    status: 'active',
  });

  const completeResponse = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    body: JSON.stringify({
      events: [{
        id: 'lesson-complete-student-1',
        type: 'lesson_completed',
        payload: {
          sessionId: 'session-complete-student-1',
          studentId: 'student-1',
          lessonId: lesson.id,
          moduleId: 'module-1',
          stepIndex: 3,
          stepsTotal: 3,
          review: 'onTrack',
          completionState: 'completed',
          capturedAt: '2026-04-23T10:00:00.000Z',
        },
      }],
    }),
  });
  assert.equal(completeResponse.status, 202, JSON.stringify(completeResponse.body));

  const resumeResponse = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    body: JSON.stringify({
      events: [{
        id: 'lesson-start-student-2',
        type: 'lesson_session_started',
        payload: {
          sessionId: 'session-resume-student-2',
          studentId: 'student-2',
          lessonId: lesson.id,
          moduleId: 'module-1',
          stepIndex: 1,
          stepsTotal: 4,
          capturedAt: '2026-04-23T11:00:00.000Z',
        },
      }],
    }),
  });
  assert.equal(resumeResponse.status, 202, JSON.stringify(resumeResponse.body));

  const retryResponse = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    body: JSON.stringify({
      events: [{
        id: 'lesson-retry-student-3',
        type: 'lesson_completed',
        payload: {
          sessionId: 'session-retry-student-3',
          studentId: 'student-3',
          lessonId: lesson.id,
          moduleId: 'module-1',
          stepIndex: 1,
          stepsTotal: 4,
          review: 'needsSupport',
          completionState: 'abandoned',
          capturedAt: '2026-04-23T12:00:00.000Z',
        },
      }],
    }),
  });
  assert.equal(retryResponse.status, 202, JSON.stringify(retryResponse.body));

  const bootstrap = await request('/api/v1/learner-app/bootstrap?deviceIdentifier=lumo-tablet-kano-01');
  assert.equal(bootstrap.status, 200, JSON.stringify(bootstrap.body));

  const projectedLesson = bootstrap.body.lessons.find((entry) => entry.id === lesson.id);
  assert.ok(projectedLesson, JSON.stringify(bootstrap.body.lessons));
  assert.equal(projectedLesson.learnerAvailability.availableLearnerCount >= 3, true);
  assert.equal(projectedLesson.learnerAvailability.counts.resume >= 1, true);
  assert.equal(projectedLesson.learnerAvailability.counts.completed >= 1, true);
  assert.equal(projectedLesson.learnerAvailability.counts.retry >= 1, true);

  const statusByLearnerId = Object.fromEntries(
    projectedLesson.learnerAvailability.availableLearners.map((learner) => [learner.id, learner.lessonStatus.status]),
  );
  assert.equal(statusByLearnerId['student-1'], 'completed');
  assert.equal(statusByLearnerId['student-2'], 'resume');
  assert.equal(statusByLearnerId['student-3'], 'retry');
  assert.equal(statusByLearnerId['student-4'], undefined);

  const lessonAvailability = bootstrap.body.lessonAvailability.find((entry) => entry.lessonId === lesson.id);
  assert.ok(lessonAvailability, JSON.stringify(bootstrap.body.lessonAvailability));
  assert.equal(lessonAvailability.availableLearnerCount >= 3, true);
  assert.equal(bootstrap.body.meta.supports.includes('lesson-learner-availability'), true);
  assert.equal(bootstrap.body.meta.supports.includes('per-learner-lesson-status'), true);
});

test('lesson learner endpoint returns pod-scoped available learners with launch statuses', async () => {
  const lesson = repository.createLesson({
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Lesson launch roster endpoint',
    durationMinutes: 10,
    status: 'published',
    mode: 'guided',
    activitySteps: [{ type: 'listen_repeat', prompt: 'Say ready.' }],
  });

  repository.createAssignment({
    cohortId: 'cohort-1',
    lessonId: lesson.id,
    assignedBy: 'teacher-1',
    dueDate: '2026-04-24',
    status: 'active',
  });

  const response = await request(`/api/v1/learner-app/lessons/${lesson.id}/learners?deviceIdentifier=lumo-tablet-kano-01`);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.meta.scopedPodId, 'pod-1');
  assert.equal(response.body.meta.lessonId, lesson.id);
  assert.equal(response.body.learners.length >= 3, true);
  assert.equal(response.body.learners.every((learner) => learner.podId === 'pod-1'), true);
  assert.equal(response.body.learners.every((learner) => learner.lessonStatus.lessonId === lesson.id), true);
});
