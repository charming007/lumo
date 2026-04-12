const repository = require('./repository');

const LESSON_ACTIVITY_TYPES = [
  'letter_intro',
  'listen_repeat',
  'image_choice',
  'speak_answer',
  'word_build',
  'tap_choice',
  'listen_answer',
  'oral_quiz',
];

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

function assertArray(label, value) {
  if (value === undefined || value === null) {
    return;
  }

  if (!Array.isArray(value)) {
    const error = new Error(`Invalid ${label}: expected an array`);
    error.statusCode = 400;
    throw error;
  }
}

function validateLocalization(body) {
  if (body.localization === undefined || body.localization === null) {
    return;
  }

  if (typeof body.localization !== 'object' || Array.isArray(body.localization)) {
    const error = new Error('Invalid localization: expected an object');
    error.statusCode = 400;
    throw error;
  }
}

function validateAssessmentItems(items, label = 'items') {
  if (items === undefined || items === null) {
    return;
  }

  assertArray(label, items);

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      const error = new Error(`Invalid ${label}[${index}]: expected an object`);
      error.statusCode = 400;
      throw error;
    }

    requireFields(item, ['id', 'prompt']);

    if (item.choices !== undefined) {
      assertArray(`${label}[${index}].choices`, item.choices);
    }
  });
}

function validateLessonAssessment(body) {
  if (body.lessonAssessment === undefined || body.lessonAssessment === null) {
    return;
  }

  if (typeof body.lessonAssessment !== 'object' || Array.isArray(body.lessonAssessment)) {
    const error = new Error('Invalid lessonAssessment: expected an object');
    error.statusCode = 400;
    throw error;
  }

  validateAssessmentItems(body.lessonAssessment.items, 'lessonAssessment.items');
}

function validateLessonActivities(body) {
  const activities = body.activitySteps ?? body.activities;

  if (activities === undefined) {
    return;
  }

  assertArray('activitySteps', activities);

  activities.forEach((activity, index) => {
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
      const error = new Error(`Invalid activitySteps[${index}]: expected an object`);
      error.statusCode = 400;
      throw error;
    }

    requireFields(activity, ['id', 'type', 'prompt']);
    assertAllowed(`activitySteps[${index}].type`, activity.type, LESSON_ACTIVITY_TYPES);

    if (activity.order !== undefined && (!Number.isInteger(Number(activity.order)) || Number(activity.order) <= 0)) {
      const error = new Error(`Invalid activitySteps[${index}].order`);
      error.statusCode = 400;
      throw error;
    }

    ['expectedAnswers', 'media', 'choices', 'tags'].forEach((field) => {
      assertArray(`activitySteps[${index}].${field}`, activity[field]);
    });

    if (activity.choices) {
      activity.choices.forEach((choice, choiceIndex) => {
        if (!choice || typeof choice !== 'object' || Array.isArray(choice)) {
          const error = new Error(`Invalid activitySteps[${index}].choices[${choiceIndex}]`);
          error.statusCode = 400;
          throw error;
        }

        requireFields(choice, ['id', 'label']);
      });
    }
  });
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

  if (body.override !== undefined && body.override !== null) {
    if (typeof body.override !== 'object' || Array.isArray(body.override)) {
      const error = new Error('Invalid override payload');
      error.statusCode = 400;
      throw error;
    }

    assertAllowed('override.status', body.override.status, ['on-track', 'watch', 'ready']);
  }
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
  validateLocalization(body);
  validateLessonAssessment(body);
  validateLessonActivities(body);
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

  validateAssessmentItems(body.items, 'items');
}

module.exports = {
  LESSON_ACTIVITY_TYPES,
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
