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

test('tablet-scoped bootstrap only returns learners and registration targets for the registered pod', async () => {
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
