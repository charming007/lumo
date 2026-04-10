const crypto = require('crypto');
const express = require('express');
const store = require('./store');
const presenters = require('./presenters');
const validators = require('./validators');
const reporting = require('./reporting');
const seed = require('./seed');
const { getActor, requireRole } = require('./auth');

const app = express();

function buildAllowedOrigins() {
  const configured = (process.env.LUMO_CORS_ORIGINS || process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0
    ? configured
    : [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ];
}

function isLoopbackOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || '');
}

function applyCors(req, res) {
  const requestOrigin = req.headers.origin;
  const allowAnyOrigin = (process.env.LUMO_CORS_ALLOW_ANY_ORIGIN || '').toLowerCase() === 'true';
  const allowedOrigins = buildAllowedOrigins();

  if (!requestOrigin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (allowAnyOrigin || isLoopbackOrigin(requestOrigin) || allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Headers', [
    'Content-Type',
    'Accept',
    'Origin',
    'x-lumo-role',
    'x-lumo-user',
    'x-lumo-sync-batch',
    'x-lumo-client-id',
  ].join(', '));
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.header('Access-Control-Expose-Headers', 'x-lumo-sync-accepted, x-lumo-sync-ignored');
  res.header('Access-Control-Max-Age', '86400');
}

app.use((req, res, next) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
app.use(express.json());

app.use((req, _res, next) => {
  req.actor = getActor(req);
  next();
});

function getDefaultRegistrationTarget() {
  const cohort = store.listCohorts()[0] || null;
  const mallam = cohort
    ? store.listTeachers().find((teacher) => (teacher.podIds || []).includes(cohort.podId)) || store.listTeachers()[0] || null
    : store.listTeachers()[0] || null;

  return { cohort, mallam };
}

function buildRegistrationContext() {
  const cohorts = store.listCohorts();
  const mallams = store.listTeachers().map(presenters.presentMallam);
  const target = getDefaultRegistrationTarget();

  return {
    cohorts,
    mallams,
    defaultTarget: {
      cohortId: target.cohort?.id ?? null,
      podId: target.cohort?.podId ?? null,
      mallamId: target.mallam?.id ?? null,
    },
  };
}

function normalizeLearnerAppStudentPayload(body = {}) {
  const defaultTarget = getDefaultRegistrationTarget();

  return {
    ...body,
    name: body.fullName || body.name,
    gender: body.gender || (body.sex === 'Boy' ? 'male' : body.sex === 'Girl' ? 'female' : undefined),
    cohortId: body.cohortId || defaultTarget.cohort?.id,
    podId: body.podId || body.cohort?.podId || defaultTarget.cohort?.podId,
    mallamId: body.mallamId || defaultTarget.mallam?.id,
    guardianName: body.guardian?.name || body.guardianName,
    guardianPhone: body.guardian?.phone || body.guardianPhone,
    caregiverRelationship: body.guardian?.relationship || body.caregiverRelationship,
    preferredLanguage: body.placement?.preferredLanguage || body.preferredLanguage,
    consentCaptured: body.consentCaptured,
    supportPlan: body.placement?.supportPlan || body.supportPlan,
    village: body.village,
    level: body.level || (body.placement?.readinessLabel === 'Confident responder'
      ? 'confident'
      : body.placement?.readinessLabel === 'Ready for guided practice'
        ? 'emerging'
        : 'beginner'),
    stage: body.stage || body.placement?.baselineLevel || 'foundation-a',
    deviceAccess: body.deviceAccess || 'shared-tablet',
  };
}

function findStudentByLearnerCode(learnerCode) {
  if (!learnerCode) return null;

  return store
    .listStudents()
    .find((student) => presenters.presentLearnerProfile(student).learnerCode === learnerCode) || null;
}

function buildLearnerAssignmentIndex() {
  return store
    .listAssignments()
    .filter((assignment) => assignment.status === 'active')
    .map(presenters.presentLearnerAssignmentPack);
}

function buildLearnerLessons() {
  return store
    .listLessons()
    .filter((lesson) => ['approved', 'published'].includes(lesson.status))
    .map(presenters.presentLearnerLesson);
}

function buildLearnerAppBootstrap() {
  const learners = store.listStudents().map(presenters.presentLearnerProfile);
  const modules = store
    .listModules()
    .filter((module) => module.status === 'published')
    .map(presenters.presentLearnerModule);
  const lessons = buildLearnerLessons();
  const assignments = buildLearnerAssignmentIndex();
  const lastSync = store.listSyncEvents().slice(-1)[0] || null;

  return {
    learners,
    modules,
    lessons,
    assignments,
    assignmentPacks: assignments,
    registrationContext: buildRegistrationContext(),
    sync: {
      acceptedEventCount: store.listSyncEvents().length,
      lastCursor: lastSync?.id ?? null,
      supports: ['idempotent-client-event-id', 'batch-receipts', 'progress-upsert'],
    },
    meta: {
      learnerCount: learners.length,
      moduleCount: modules.length,
      lessonCount: lessons.length,
      assignmentCount: assignments.length,
      assignmentPackCount: assignments.length,
      generatedAt: new Date().toISOString(),
      contractVersion: 'learner-app-v2.1',
      supports: ['cors-local-origins', 'assignment-index', 'sync-dedupe', 'progress-upsert'],
    },
  };
}

function hashPayload(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload || {})).digest('hex');
}

function buildSyncReceipt(event, result, batchId) {
  return {
    eventId: event.id || event.clientId || null,
    batchId: batchId || null,
    type: event.type || event.eventType || 'unknown',
    learnerId: result?.student?.id || result?.progress?.studentId || null,
    result,
  };
}

function syncLearnerAppEvents(events = [], options = {}) {
  const items = Array.isArray(events) ? events : [events];
  const batchId = options.batchId || null;

  const results = items.filter(Boolean).map((event, index) => {
    const type = event.type || event.eventType;
    const payload = event.payload || event;
    const clientId = event.id || event.clientId || payload.id || payload.clientId || null;
    const existingSync = clientId ? store.findSyncEventByClientId(clientId) : null;

    if (existingSync) {
      return {
        index,
        type,
        status: 'duplicate',
        reason: 'duplicate_client_event',
        previousSyncId: existingSync.id,
        receiptId: existingSync.id,
        syncedAt: existingSync.appliedAt || existingSync.receivedAt || null,
        result: existingSync.result,
      };
    }

    if (type === 'learner_registered') {
      const body = normalizeLearnerAppStudentPayload(payload);
      validators.validateStudent(body);
      const student = store.createStudent(body);
      const result = {
        index,
        type,
        status: 'accepted',
        student: presenters.presentLearnerProfile(student),
      };

      const receipt = store.createSyncEvent({
        clientId,
        batchId,
        type,
        learnerId: student.id,
        payloadHash: hashPayload(payload),
        result: buildSyncReceipt(event, result, batchId),
      });

      return {
        ...result,
        receiptId: receipt.id,
        syncedAt: receipt.appliedAt || receipt.receivedAt || null,
      };
    }

    if (type === 'lesson_completed') {
      const student = payload.studentId
        ? store.findStudentById(payload.studentId)
        : findStudentByLearnerCode(payload.learnerCode);

      if (!student) {
        const error = new Error(`Unknown learner for sync event: ${payload.learnerCode || payload.studentId || 'missing identifier'}`);
        error.statusCode = 400;
        throw error;
      }

      const lesson = payload.lessonId ? store.findLessonById(payload.lessonId) : null;
      const lessonModule = lesson?.moduleId ? store.listModules().find((module) => module.id === lesson.moduleId) : null;
      const moduleId = payload.curriculumModuleId || payload.moduleId || lesson?.moduleId || null;
      const subjectId = lesson?.subjectId || lessonModule?.subjectId || 'english';
      const progressRecord = store.upsertProgress({
        studentId: student.id,
        subjectId,
        moduleId,
        mastery: payload.review === 'onTrack' ? 0.75 : payload.review === 'needsSupport' ? 0.45 : 0.6,
        lessonsCompleted: Number(payload.stepsTotal || payload.stepIndex || 1),
        progressionStatus: payload.review === 'needsSupport' ? 'watch' : 'on-track',
        recommendedNextModuleId: moduleId,
      });

      if (Array.isArray(payload.observations)) {
        payload.observations
          .filter((item) => item && item.trim())
          .forEach((note) => {
            store.createObservation({
              studentId: student.id,
              teacherId: student.mallamId,
              note,
              competencyTag: lesson?.subjectId || subjectId,
              supportLevel: payload.review === 'needsSupport' ? 'guided' : 'independent',
            });
          });
      }

      const result = {
        index,
        type,
        status: 'accepted',
        progress: presenters.presentProgress(progressRecord),
      };

      const receipt = store.createSyncEvent({
        clientId,
        batchId,
        type,
        learnerId: student.id,
        payloadHash: hashPayload(payload),
        result: buildSyncReceipt(event, result, batchId),
      });

      return {
        ...result,
        receiptId: receipt.id,
        syncedAt: receipt.appliedAt || receipt.receivedAt || null,
      };
    }

    const result = {
      index,
      type: type || 'unknown',
      status: 'ignored',
      reason: 'unsupported_event_type',
    };

    store.createSyncEvent({
      clientId,
      batchId,
      type: type || 'unknown',
      learnerId: payload.studentId || null,
      payloadHash: hashPayload(payload),
      status: 'ignored',
      result: buildSyncReceipt(event, result, batchId),
    });

    return result;
  });

  return {
    accepted: results.filter((item) => item.status === 'accepted').length,
    duplicates: results.filter((item) => item.status === 'duplicate').length,
    ignored: results.filter((item) => item.status === 'ignored').length,
    results,
    syncedAt: new Date().toISOString(),
    batchId,
    cursor: store.listSyncEvents().slice(-1)[0]?.id ?? null,
    contractVersion: 'learner-app-v2.1',
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'lumo-api' });
});

app.get('/api/v1/meta', (req, res) => {
  res.json({
    actor: req.actor,
    mode: 'demo-seeded',
    seedSummary: seed.getSeedSummary(),
    store: store.getStoreMeta(),
  });
});

app.get('/api/v1/learner-app/bootstrap', (_req, res) => {
  res.json(buildLearnerAppBootstrap());
});

app.get('/api/v1/learner-app/context', (_req, res) => {
  res.json(buildLearnerAppBootstrap());
});

app.get('/api/v1/learner-app/registration-context', (_req, res) => {
  res.json(buildRegistrationContext());
});

app.get('/api/v1/learner-app/learners', (_req, res) => {
  res.json(store.listStudents().map(presenters.presentLearnerProfile));
});

app.post('/api/v1/learner-app/learners', (req, res, next) => {
  try {
    const body = normalizeLearnerAppStudentPayload(req.body);

    validators.validateStudent(body);
    const student = store.createStudent(body);
    return res.status(201).json(presenters.presentLearnerProfile(student));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/sync', (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events)
      ? req.body.events
      : Array.isArray(req.body)
        ? req.body
        : [req.body];
    const batchId = req.headers['x-lumo-sync-batch'] || req.body?.batchId || null;
    const result = syncLearnerAppEvents(events, { batchId });

    res.setHeader('x-lumo-sync-accepted', String(result.accepted));
    res.setHeader('x-lumo-sync-ignored', String(result.ignored));
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/sync-batches', (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events)
      ? req.body.events
      : Array.isArray(req.body)
        ? req.body
        : [req.body];
    const batchId = req.headers['x-lumo-sync-batch'] || req.body?.batchId || null;
    const result = syncLearnerAppEvents(events, { batchId });

    res.setHeader('x-lumo-sync-accepted', String(result.accepted));
    res.setHeader('x-lumo-sync-ignored', String(result.ignored));
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/learner-app/modules', (_req, res) => {
  res.json(
    store
      .listModules()
      .filter((module) => module.status === 'published')
      .map(presenters.presentLearnerModule),
  );
});

app.get('/api/v1/learner-app/assignments', (_req, res) => {
  res.json(buildLearnerAssignmentIndex());
});

app.get('/api/v1/learner-app/assignment-packs', (_req, res) => {
  res.json({
    items: buildLearnerAssignmentIndex(),
    generatedAt: new Date().toISOString(),
  });
});

app.get('/api/v1/learner-app/modules/:id', (req, res) => {
  const sourceModule = store
    .listModules()
    .find((module) => module.id === req.params.id || presenters.presentLearnerModule(module).id === req.params.id);

  if (!sourceModule) {
    return res.status(404).json({ message: 'Module not found' });
  }

  const module = presenters.presentLearnerModule(sourceModule);
  const lessons = store
    .listLessons()
    .filter(
      (lesson) =>
        lesson.moduleId === sourceModule.id && ['approved', 'published'].includes(lesson.status),
    )
    .map(presenters.presentLearnerLesson);
  const assignmentPacks = buildLearnerAssignmentIndex().filter(
    (assignment) =>
      assignment.lessonPack?.curriculumModuleId === sourceModule.id ||
      assignment.lessonPack?.moduleKey === module.id,
  );

  return res.json({
    ...module,
    lessons,
    assignmentPacks,
  });
});

app.get('/api/v1/dashboard/summary', (_req, res) => {
  const assignments = store.listAssignments();
  const progress = store.listProgress();
  const pods = store.listPods();
  const assessments = store.listAssessments();

  res.json({
    activeLearners: store.listStudents().length,
    lessonsCompleted: progress.reduce((sum, item) => sum + item.lessonsCompleted, 0),
    centers: store.listCenters().length,
    syncSuccessRate: 0.96,
    mallams: store.listTeachers().length,
    activePods: pods.filter((item) => ['active', 'pilot'].includes(item.status)).length,
    activeAssignments: assignments.filter((item) => item.status === 'active').length,
    assessmentsLive: assessments.filter((item) => item.status === 'active').length,
    learnersReadyToProgress: progress.filter((item) => item.progressionStatus === 'ready').length,
  });
});

app.get('/api/v1/dashboard/insights', (_req, res) => {
  res.json(reporting.buildDashboardInsights());
});

app.get('/api/v1/dashboard/workboard', (_req, res) => {
  res.json(reporting.buildWorkboard());
});

app.get('/api/v1/centers', (_req, res) => {
  res.json(store.listCenters());
});

app.get('/api/v1/pods', (_req, res) => {
  res.json(store.listPods().map(presenters.presentPod));
});

app.get('/api/v1/cohorts', (_req, res) => {
  res.json(store.listCohorts());
});

app.get('/api/v1/teachers', (_req, res) => {
  res.json(store.listTeachers());
});

app.get('/api/v1/mallams', (_req, res) => {
  res.json(store.listTeachers().map(presenters.presentMallam));
});

app.get('/api/v1/mallams/:id', (req, res) => {
  const profile = reporting.buildMallamProfile(req.params.id);

  if (!profile) {
    return res.status(404).json({ message: 'Mallam not found' });
  }

  return res.json(profile);
});

app.post('/api/v1/mallams', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateTeacher(req.body);
    const mallam = store.createTeacher(req.body);
    return res.status(201).json(presenters.presentMallam(mallam));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/mallams/:id', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateTeacher(req.body, { partial: true });
    const mallam = store.updateTeacher(req.params.id, req.body);

    if (!mallam) {
      return res.status(404).json({ message: 'Mallam not found' });
    }

    return res.json(presenters.presentMallam(mallam));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/mallams/:id', requireRole(['admin']), (req, res) => {
  const mallam = store.deleteTeacher(req.params.id);

  if (!mallam) {
    return res.status(404).json({ message: 'Mallam not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/students', (_req, res) => {
  res.json(store.listStudents().map(presenters.presentStudent));
});

app.post('/api/v1/students', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateStudent(req.body);
    const student = store.createStudent(req.body);
    return res.status(201).json(presenters.presentStudent(student));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/students/:id', requireRole(['admin', 'teacher']), (req, res, next) => {
  try {
    validators.validateStudent(req.body, { partial: true });
    const student = store.updateStudent(req.params.id, req.body);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.json(presenters.presentStudent(student));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/students/:id', requireRole(['admin']), (req, res) => {
  const student = store.deleteStudent(req.params.id);

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/students/:id', (req, res) => {
  const profile = reporting.buildStudentProfile(req.params.id);

  if (!profile) {
    return res.status(404).json({ message: 'Student not found' });
  }

  return res.json(profile);
});

app.get('/api/v1/subjects', (_req, res) => {
  res.json(store.listSubjects());
});

app.get('/api/v1/curriculum/modules', (_req, res) => {
  res.json(store.listModules().map(presenters.presentCurriculumModule));
});

app.post('/api/v1/curriculum/modules', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateModule(req.body);
    const module = store.createModule(req.body);
    return res.status(201).json(presenters.presentCurriculumModule(module));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/curriculum/modules/:id', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateModule(req.body, { partial: true });
    const module = store.updateModule(req.params.id, req.body);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    return res.json(presenters.presentCurriculumModule(module));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/lessons', (_req, res) => {
  res.json(store.listLessons().map(presenters.presentLesson));
});

app.post('/api/v1/lessons', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateLesson(req.body);
    const lesson = store.createLesson(req.body);
    return res.status(201).json(presenters.presentLesson(lesson));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/lessons/:id', requireRole(['admin']), (req, res, next) => {
  try {
    validators.validateLesson(req.body, { partial: true });
    const lesson = store.updateLesson(req.params.id, req.body);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    return res.json(presenters.presentLesson(lesson));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/assessments', (_req, res) => {
  res.json(store.listAssessments().map(presenters.presentAssessment));
});

app.get('/api/v1/assignments', (_req, res) => {
  res.json(store.listAssignments().map(presenters.presentAssignment));
});

app.post('/api/v1/assignments', requireRole(['admin', 'teacher']), (req, res, next) => {
  try {
    validators.validateAssignment(req.body);
    const assignment = store.createAssignment(req.body);
    return res.status(201).json(presenters.presentAssignment(assignment));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/assignments/:id', requireRole(['admin', 'teacher']), (req, res, next) => {
  try {
    validators.validateAssignment(req.body, { partial: true });
    const assignment = store.updateAssignment(req.params.id, req.body);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    return res.json(presenters.presentAssignment(assignment));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/attendance', (_req, res) => {
  res.json(store.listAttendance().map(presenters.presentAttendance));
});

app.post('/api/v1/attendance', requireRole(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateAttendance(req.body);
    const record = store.createAttendance(req.body);
    return res.status(201).json(presenters.presentAttendance(record));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/progress', (_req, res) => {
  res.json(store.listProgress().map(presenters.presentProgress));
});

app.post('/api/v1/progress', requireRole(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateProgress(req.body);
    const record = store.createProgress(req.body);
    return res.status(201).json(presenters.presentProgress(record));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/progress/:id', requireRole(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateProgress(req.body, { partial: true });
    const record = store.updateProgress(req.params.id, req.body);

    if (!record) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    return res.json(presenters.presentProgress(record));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/observations', (_req, res) => {
  res.json(store.listObservations().map(presenters.presentObservation));
});

app.post('/api/v1/observations', requireRole(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateObservation(req.body);
    const record = store.createObservation(req.body);
    return res.status(201).json(presenters.presentObservation(record));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/reports/overview', (_req, res) => {
  res.json(reporting.buildOverviewReport());
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    message: error.message || 'Internal server error',
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Lumo API listening on port ${port}`);
});