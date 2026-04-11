const repository = require('./repository');

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
}

function assertExists(label, value, finder) {
  if (!value) {
    return;
  }

  if (!finder(value)) {
    const error = new Error(`Invalid ${label}: ${value}`);
    error.statusCode = 400;
    throw error;
  }
}

function assertAllowed(label, value, allowedValues) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (!allowedValues.includes(value)) {
    const error = new Error(`Invalid ${label}: ${value}`);
    error.statusCode = 400;
    throw error;
  }
}

function validateAssignment(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['cohortId', 'lessonId', 'assignedBy', 'dueDate']);
  }

  assertExists('cohortId', body.cohortId, repository.findCohortById);
  assertExists('lessonId', body.lessonId, repository.findLessonById);
  assertExists('assignedBy', body.assignedBy, repository.findTeacherById);
  assertAllowed('status', body.status, ['active', 'scheduled', 'completed']);

  if (body.assessmentId) {
    assertExists('assessmentId', body.assessmentId, repository.findAssessmentById);
  }
}

function validateAttendance(body) {
  requireFields(body, ['studentId', 'date', 'status']);
  assertExists('studentId', body.studentId, repository.findStudentById);
  assertAllowed('status', body.status, ['present', 'absent', 'late']);
}

function validateObservation(body) {
  requireFields(body, ['studentId', 'teacherId', 'note']);
  assertExists('studentId', body.studentId, repository.findStudentById);
  assertExists('teacherId', body.teacherId, repository.findTeacherById);
  assertAllowed('supportLevel', body.supportLevel, ['independent', 'guided', 'intensive']);
}

function validateProgress(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['studentId', 'subjectId', 'moduleId', 'mastery', 'lessonsCompleted']);
  }

  assertExists('studentId', body.studentId, repository.findStudentById);
  assertExists('subjectId', body.subjectId, repository.findSubjectById);
  assertExists('moduleId', body.moduleId, repository.findModuleById);
  assertExists('recommendedNextModuleId', body.recommendedNextModuleId, repository.findModuleById);
  assertAllowed('progressionStatus', body.progressionStatus, ['on-track', 'watch', 'ready']);
}

function validateStudent(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['name', 'age', 'cohortId', 'podId', 'mallamId']);
  }

  assertExists('cohortId', body.cohortId, repository.findCohortById);
  assertExists('podId', body.podId, repository.findPodById);
  assertExists('mallamId', body.mallamId, repository.findTeacherById);
  assertAllowed('gender', body.gender, ['male', 'female', 'unspecified']);
  assertAllowed('level', body.level, ['beginner', 'emerging', 'confident']);
  assertAllowed('deviceAccess', body.deviceAccess, ['shared-tablet', 'family-phone', 'center-device']);

  if (body.age !== undefined && Number(body.age) <= 0) {
    const error = new Error('Invalid age');
    error.statusCode = 400;
    throw error;
  }
}

function validateTeacher(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['name', 'displayName', 'centerId']);
  }

  assertExists('centerId', body.centerId, repository.findCenterById);
  (body.podIds || []).forEach((podId) => assertExists('podId', podId, repository.findPodById));
  assertAllowed('status', body.status, ['active', 'training', 'leave']);
  assertAllowed('role', body.role, ['mallam-lead', 'facilitator', 'coach']);
}

function validateSubject(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['id', 'name']);
  }

  if (!partial && repository.findSubjectById(body.id)) {
    const error = new Error(`Subject already exists: ${body.id}`);
    error.statusCode = 409;
    throw error;
  }
}

function validateStrand(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['subjectId', 'name']);
  }

  assertExists('subjectId', body.subjectId, repository.findSubjectById);
}

function validateModule(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['strandId', 'title', 'level']);
  }

  assertExists('strandId', body.strandId, repository.findStrandById);
  assertAllowed('status', body.status, ['draft', 'review', 'published']);
  assertAllowed('level', body.level, ['beginner', 'emerging', 'confident']);
}

function validateLesson(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['subjectId', 'moduleId', 'title', 'durationMinutes']);
  }

  assertExists('subjectId', body.subjectId, repository.findSubjectById);
  assertExists('moduleId', body.moduleId, repository.findModuleById);
  assertAllowed('mode', body.mode, ['guided', 'independent', 'group', 'practice']);
  assertAllowed('status', body.status, ['draft', 'review', 'approved', 'published']);
}

function validateAssessment(body, { partial = false } = {}) {
  if (!partial) {
    requireFields(body, ['subjectId', 'moduleId', 'title', 'kind', 'trigger', 'triggerLabel', 'progressionGate', 'passingScore']);
  }

  assertExists('subjectId', body.subjectId, repository.findSubjectById);
  assertExists('moduleId', body.moduleId, repository.findModuleById);
  assertAllowed('kind', body.kind, ['automatic', 'manual']);
  assertAllowed('trigger', body.trigger, ['module-complete', 'lesson-cluster', 'mallam-review']);
  assertAllowed('status', body.status, ['draft', 'active', 'retired']);

  if (body.passingScore !== undefined) {
    const score = Number(body.passingScore);

    if (Number.isNaN(score) || score < 0 || score > 1) {
      const error = new Error('Invalid passingScore');
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = {
  validateAssignment,
  validateAttendance,
  validateObservation,
  validateProgress,
  validateStudent,
  validateTeacher,
  validateSubject,
  validateStrand,
  validateModule,
  validateLesson,
  validateAssessment,
};
