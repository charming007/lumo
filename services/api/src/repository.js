const data = require('./data');

function listCenters() {
  return data.centers;
}

function findCenterById(id) {
  return data.centers.find((item) => item.id === id) || null;
}

function listPods() {
  return data.pods;
}

function findPodById(id) {
  return data.pods.find((item) => item.id === id) || null;
}

function listCohorts() {
  return data.cohorts;
}

function findCohortById(id) {
  return data.cohorts.find((item) => item.id === id) || null;
}

function listTeachers() {
  return data.teachers;
}

function findTeacherById(id) {
  return data.teachers.find((item) => item.id === id) || null;
}

function createTeacher(input) {
  const teacher = {
    id: `teacher-${data.teachers.length + 1}`,
    centerId: input.centerId,
    podIds: input.podIds || [],
    name: input.name,
    displayName: input.displayName || input.name,
    role: input.role || 'mallam-lead',
    status: input.status || 'active',
    languages: input.languages || ['Hausa', 'English'],
    learnerCount: Number(input.learnerCount || 0),
    certificationLevel: input.certificationLevel || 'Level 1',
  };

  data.teachers.push(teacher);
  return teacher;
}

function updateTeacher(id, input) {
  const teacher = findTeacherById(id);

  if (!teacher) {
    return null;
  }

  Object.assign(teacher, {
    centerId: input.centerId ?? teacher.centerId,
    podIds: input.podIds ?? teacher.podIds,
    name: input.name ?? teacher.name,
    displayName: input.displayName ?? teacher.displayName,
    role: input.role ?? teacher.role,
    status: input.status ?? teacher.status,
    languages: input.languages ?? teacher.languages,
    learnerCount: input.learnerCount !== undefined ? Number(input.learnerCount) : teacher.learnerCount,
    certificationLevel: input.certificationLevel ?? teacher.certificationLevel,
  });

  return teacher;
}

function deleteTeacher(id) {
  const index = data.teachers.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [teacher] = data.teachers.splice(index, 1);

  data.students.forEach((student) => {
    if (student.mallamId === id) {
      student.mallamId = null;
    }
  });

  data.assignments = data.assignments.filter((assignment) => assignment.assignedBy !== id);
  data.observations = data.observations.filter((observation) => observation.teacherId !== id);

  return teacher;
}

function listStudents() {
  return data.students;
}

function findStudentById(id) {
  return data.students.find((item) => item.id === id) || null;
}

function createStudent(input) {
  const student = {
    id: `student-${data.students.length + 1}`,
    cohortId: input.cohortId,
    podId: input.podId,
    mallamId: input.mallamId,
    name: input.name,
    age: Number(input.age),
    gender: input.gender || 'unspecified',
    level: input.level || 'beginner',
    stage: input.stage || 'foundation-a',
    attendanceRate: input.attendanceRate !== undefined ? Number(input.attendanceRate) : 0.85,
    guardianName: input.guardianName || '',
    guardianPhone: input.guardianPhone || '',
    caregiverRelationship: input.caregiverRelationship || 'Guardian',
    preferredLanguage: input.preferredLanguage || 'Hausa',
    consentCaptured: input.consentCaptured !== undefined ? Boolean(input.consentCaptured) : true,
    supportPlan: input.supportPlan || '',
    village: input.village || '',
    deviceAccess: input.deviceAccess || 'shared-tablet',
  };

  data.students.push(student);
  return student;
}

function updateStudent(id, input) {
  const student = findStudentById(id);

  if (!student) {
    return null;
  }

  Object.assign(student, {
    cohortId: input.cohortId ?? student.cohortId,
    podId: input.podId ?? student.podId,
    mallamId: input.mallamId ?? student.mallamId,
    name: input.name ?? student.name,
    age: input.age !== undefined ? Number(input.age) : student.age,
    gender: input.gender ?? student.gender,
    level: input.level ?? student.level,
    stage: input.stage ?? student.stage,
    attendanceRate: input.attendanceRate !== undefined ? Number(input.attendanceRate) : student.attendanceRate,
    guardianName: input.guardianName ?? student.guardianName,
    guardianPhone: input.guardianPhone ?? student.guardianPhone,
    caregiverRelationship: input.caregiverRelationship ?? student.caregiverRelationship,
    preferredLanguage: input.preferredLanguage ?? student.preferredLanguage,
    consentCaptured: input.consentCaptured !== undefined ? Boolean(input.consentCaptured) : student.consentCaptured,
    supportPlan: input.supportPlan ?? student.supportPlan,
    village: input.village ?? student.village,
    deviceAccess: input.deviceAccess ?? student.deviceAccess,
  });

  return student;
}

function deleteStudent(id) {
  const index = data.students.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [student] = data.students.splice(index, 1);

  data.attendance = data.attendance.filter((record) => record.studentId !== id);
  data.progress = data.progress.filter((record) => record.studentId !== id);
  data.observations = data.observations.filter((record) => record.studentId !== id);
  data.assignments = data.assignments.filter((assignment) => assignment.studentId !== id);
  data.syncEvents = data.syncEvents.filter((event) => event.learnerId !== id);

  return student;
}

function listSubjects() {
  return data.subjects;
}

function findSubjectById(id) {
  return data.subjects.find((item) => item.id === id) || null;
}

function listStrands() {
  return data.strands;
}

function findStrandById(id) {
  return data.strands.find((item) => item.id === id) || null;
}

function listModules() {
  return data.modules;
}

function findModuleById(id) {
  return data.modules.find((item) => item.id === id) || null;
}

function createModule(input) {
  const module = {
    id: `module-${data.modules.length + 1}`,
    strandId: input.strandId,
    level: input.level,
    title: input.title,
    lessonCount: Number(input.lessonCount || 0),
    order: Number(input.order || data.modules.length + 1),
    status: input.status || 'draft',
  };

  data.modules.push(module);
  return module;
}

function updateModule(id, input) {
  const module = findModuleById(id);

  if (!module) {
    return null;
  }

  Object.assign(module, {
    strandId: input.strandId ?? module.strandId,
    level: input.level ?? module.level,
    title: input.title ?? module.title,
    lessonCount: input.lessonCount !== undefined ? Number(input.lessonCount) : module.lessonCount,
    order: input.order !== undefined ? Number(input.order) : module.order,
    status: input.status ?? module.status,
  });

  return module;
}

function deleteModule(id) {
  const index = data.modules.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [module] = data.modules.splice(index, 1);
  const lessonIds = data.lessons.filter((lesson) => lesson.moduleId === id).map((lesson) => lesson.id);
  const assessmentIds = data.assessments.filter((assessment) => assessment.moduleId === id).map((assessment) => assessment.id);

  data.lessons = data.lessons.filter((lesson) => lesson.moduleId !== id);
  data.assessments = data.assessments.filter((assessment) => assessment.moduleId !== id);
  data.assignments = data.assignments.filter((assignment) => !lessonIds.includes(assignment.lessonId) && !assessmentIds.includes(assignment.assessmentId));
  data.progress.forEach((record) => {
    if (record.moduleId === id) record.moduleId = null;
    if (record.recommendedNextModuleId === id) record.recommendedNextModuleId = null;
  });

  return module;
}

function listLessons() {
  return data.lessons;
}

function findLessonById(id) {
  return data.lessons.find((item) => item.id === id) || null;
}

function createLesson(input) {
  const lesson = {
    id: `lesson-${data.lessons.length + 1}`,
    subjectId: input.subjectId,
    moduleId: input.moduleId,
    title: input.title,
    durationMinutes: Number(input.durationMinutes || 0),
    mode: input.mode || 'guided',
    status: input.status || 'draft',
  };

  data.lessons.push(lesson);
  return lesson;
}

function updateLesson(id, input) {
  const lesson = findLessonById(id);

  if (!lesson) {
    return null;
  }

  Object.assign(lesson, {
    subjectId: input.subjectId ?? lesson.subjectId,
    moduleId: input.moduleId ?? lesson.moduleId,
    title: input.title ?? lesson.title,
    durationMinutes: input.durationMinutes !== undefined ? Number(input.durationMinutes) : lesson.durationMinutes,
    mode: input.mode ?? lesson.mode,
    status: input.status ?? lesson.status,
  });

  return lesson;
}

function deleteLesson(id) {
  const index = data.lessons.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [lesson] = data.lessons.splice(index, 1);
  data.assignments = data.assignments.filter((assignment) => assignment.lessonId !== id);

  return lesson;
}

function listAssessments() {
  return data.assessments;
}

function findAssessmentById(id) {
  return data.assessments.find((item) => item.id === id) || null;
}

function createAssessment(input) {
  const assessment = {
    id: `assessment-${data.assessments.length + 1}`,
    moduleId: input.moduleId,
    subjectId: input.subjectId,
    title: input.title,
    kind: input.kind || 'automatic',
    trigger: input.trigger || 'module-complete',
    triggerLabel: input.triggerLabel || 'After module completion',
    progressionGate: input.progressionGate || 'foundation-a',
    passingScore: Number(input.passingScore || 0.6),
    status: input.status || 'draft',
  };

  data.assessments.push(assessment);
  return assessment;
}

function updateAssessment(id, input) {
  const assessment = findAssessmentById(id);

  if (!assessment) {
    return null;
  }

  Object.assign(assessment, {
    moduleId: input.moduleId ?? assessment.moduleId,
    subjectId: input.subjectId ?? assessment.subjectId,
    title: input.title ?? assessment.title,
    kind: input.kind ?? assessment.kind,
    trigger: input.trigger ?? assessment.trigger,
    triggerLabel: input.triggerLabel ?? assessment.triggerLabel,
    progressionGate: input.progressionGate ?? assessment.progressionGate,
    passingScore: input.passingScore !== undefined ? Number(input.passingScore) : assessment.passingScore,
    status: input.status ?? assessment.status,
  });

  return assessment;
}

function deleteAssessment(id) {
  const index = data.assessments.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [assessment] = data.assessments.splice(index, 1);
  data.assignments.forEach((assignment) => {
    if (assignment.assessmentId === id) {
      assignment.assessmentId = null;
    }
  });

  return assessment;
}

function listAssignments() {
  return data.assignments;
}

function findAssignmentById(id) {
  return data.assignments.find((item) => item.id === id) || null;
}

function createAssignment(input) {
  const assignment = {
    id: `assignment-${data.assignments.length + 1}`,
    cohortId: input.cohortId,
    lessonId: input.lessonId,
    assignedBy: input.assignedBy,
    dueDate: input.dueDate,
    status: input.status || 'active',
    podId: input.podId || findCohortById(input.cohortId)?.podId || null,
    assessmentId: input.assessmentId || null,
    assignedAt: input.assignedAt || new Date().toISOString(),
  };

  data.assignments.push(assignment);
  return assignment;
}

function updateAssignment(id, input) {
  const assignment = findAssignmentById(id);

  if (!assignment) {
    return null;
  }

  const nextCohortId = input.cohortId ?? assignment.cohortId;

  Object.assign(assignment, {
    cohortId: nextCohortId,
    lessonId: input.lessonId ?? assignment.lessonId,
    assignedBy: input.assignedBy ?? assignment.assignedBy,
    dueDate: input.dueDate ?? assignment.dueDate,
    status: input.status ?? assignment.status,
    podId: input.podId ?? findCohortById(nextCohortId)?.podId ?? assignment.podId,
    assessmentId: input.assessmentId ?? assignment.assessmentId,
    assignedAt: input.assignedAt ?? assignment.assignedAt,
  });

  return assignment;
}

function listAttendance() {
  return data.attendance;
}

function createAttendance(input) {
  const record = {
    id: `attendance-${data.attendance.length + 1}`,
    studentId: input.studentId,
    date: input.date,
    status: input.status,
  };

  data.attendance.push(record);
  return record;
}

function listProgress() {
  return data.progress;
}

function findProgressById(id) {
  return data.progress.find((item) => item.id === id) || null;
}

function createProgress(input) {
  const record = {
    id: `progress-${data.progress.length + 1}`,
    studentId: input.studentId,
    subjectId: input.subjectId,
    moduleId: input.moduleId,
    mastery: Number(input.mastery || 0),
    lessonsCompleted: Number(input.lessonsCompleted || 0),
    progressionStatus: input.progressionStatus || 'on-track',
    recommendedNextModuleId: input.recommendedNextModuleId || input.moduleId || null,
    lastActiveAt: new Date().toISOString(),
  };

  data.progress.push(record);
  return record;
}

function updateProgress(id, input) {
  const record = findProgressById(id);

  if (!record) {
    return null;
  }

  Object.assign(record, {
    subjectId: input.subjectId ?? record.subjectId,
    moduleId: input.moduleId ?? record.moduleId,
    mastery: input.mastery !== undefined ? Number(input.mastery) : record.mastery,
    lessonsCompleted: input.lessonsCompleted !== undefined ? Number(input.lessonsCompleted) : record.lessonsCompleted,
    progressionStatus: input.progressionStatus ?? record.progressionStatus,
    recommendedNextModuleId: input.recommendedNextModuleId ?? record.recommendedNextModuleId,
    lastActiveAt: new Date().toISOString(),
  });

  return record;
}

function listObservations() {
  return data.observations;
}

function createObservation(input) {
  const record = {
    id: `obs-${data.observations.length + 1}`,
    studentId: input.studentId,
    teacherId: input.teacherId,
    note: input.note,
    competencyTag: input.competencyTag || null,
    supportLevel: input.supportLevel || 'guided',
    createdAt: new Date().toISOString(),
  };

  data.observations.push(record);
  return record;
}

function listSyncEvents() {
  return data.syncEvents;
}

function findSyncEventByClientId(clientId) {
  if (!clientId) return null;
  return data.syncEvents.find((item) => item.clientId === clientId) || null;
}

function createSyncEvent(input) {
  const record = {
    id: `sync-${data.syncEvents.length + 1}`,
    clientId: input.clientId || null,
    batchId: input.batchId || null,
    type: input.type || 'unknown',
    learnerId: input.learnerId || null,
    status: input.status || 'accepted',
    payloadHash: input.payloadHash || null,
    receivedAt: input.receivedAt || new Date().toISOString(),
    appliedAt: input.appliedAt || new Date().toISOString(),
    result: input.result || null,
  };

  data.syncEvents.push(record);
  return record;
}

module.exports = {
  listCenters,
  findCenterById,
  listPods,
  findPodById,
  listCohorts,
  findCohortById,
  listTeachers,
  findTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  listStudents,
  findStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  listSubjects,
  findSubjectById,
  listStrands,
  findStrandById,
  listModules,
  findModuleById,
  createModule,
  updateModule,
  deleteModule,
  listLessons,
  findLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  listAssessments,
  findAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  listAssignments,
  findAssignmentById,
  createAssignment,
  updateAssignment,
  listAttendance,
  createAttendance,
  listProgress,
  findProgressById,
  createProgress,
  updateProgress,
  listObservations,
  createObservation,
  listSyncEvents,
  findSyncEventByClientId,
  createSyncEvent,
};