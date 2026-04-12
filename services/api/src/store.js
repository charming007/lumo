const repository = require('./repository');
const { getDbMode } = require('./db-mode');

function listStudents() {
  return repository.listStudents();
}

function findStudentById(id) {
  return repository.findStudentById(id);
}

function createStudent(input) {
  return repository.createStudent(input);
}

function updateStudent(id, input) {
  return repository.updateStudent(id, input);
}

function deleteStudent(id) {
  return repository.deleteStudent(id);
}

function listAssignments() {
  return repository.listAssignments();
}

function findAssignmentById(id) {
  return repository.findAssignmentById(id);
}

function createAssignment(input) {
  return repository.createAssignment(input);
}

function updateAssignment(id, input) {
  return repository.updateAssignment(id, input);
}

function listAttendance() {
  return repository.listAttendance();
}

function createAttendance(input) {
  return repository.createAttendance(input);
}

function listObservations() {
  return repository.listObservations();
}

function createObservation(input) {
  return repository.createObservation(input);
}

function listProgress() {
  return repository.listProgress();
}

function findProgressById(id) {
  return repository.findProgressById(id);
}

function findProgressByStudentAndModule(studentId, moduleId) {
  if (!studentId || !moduleId) return null;
  return repository
    .listProgress()
    .filter((entry) => entry.studentId === studentId && entry.moduleId === moduleId)
    .sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))[0] || null;
}

function createProgress(input) {
  return repository.createProgress(input);
}

function updateProgress(id, input) {
  return repository.updateProgress(id, input);
}

function upsertProgress(input) {
  const existing = findProgressByStudentAndModule(input.studentId, input.moduleId);
  if (!existing) {
    return repository.createProgress(input);
  }

  const nextLessonsCompleted = input.lessonsCompleted !== undefined
    ? Math.max(Number(input.lessonsCompleted), Number(existing.lessonsCompleted || 0))
    : existing.lessonsCompleted;
  const nextMastery = input.mastery !== undefined
    ? Math.max(Number(input.mastery), Number(existing.mastery || 0))
    : existing.mastery;

  return repository.updateProgress(existing.id, {
    subjectId: input.subjectId ?? existing.subjectId,
    moduleId: input.moduleId ?? existing.moduleId,
    mastery: nextMastery,
    lessonsCompleted: nextLessonsCompleted,
    progressionStatus: input.progressionStatus ?? existing.progressionStatus,
    recommendedNextModuleId: input.recommendedNextModuleId ?? existing.recommendedNextModuleId,
  });
}

function listLessons() {
  return repository.listLessons();
}

function findLessonById(id) {
  return repository.findLessonById(id);
}

function createLesson(input) {
  return repository.createLesson(input);
}

function updateLesson(id, input) {
  return repository.updateLesson(id, input);
}

function deleteLesson(id) {
  return repository.deleteLesson(id);
}

function listSubjects() {
  return repository.listSubjects();
}

function createSubject(input) {
  return repository.createSubject(input);
}

function updateSubject(id, input) {
  return repository.updateSubject(id, input);
}

function deleteSubject(id) {
  return repository.deleteSubject(id);
}

function listCenters() {
  return repository.listCenters();
}

function listPods() {
  return repository.listPods();
}

function listCohorts() {
  return repository.listCohorts();
}

function listTeachers() {
  return repository.listTeachers();
}

function createTeacher(input) {
  return repository.createTeacher(input);
}

function updateTeacher(id, input) {
  return repository.updateTeacher(id, input);
}

function deleteTeacher(id) {
  return repository.deleteTeacher(id);
}

function listStrands() {
  return repository.listStrands();
}

function createStrand(input) {
  return repository.createStrand(input);
}

function updateStrand(id, input) {
  return repository.updateStrand(id, input);
}

function deleteStrand(id) {
  return repository.deleteStrand(id);
}

function listModules() {
  return repository.listModules();
}

function createModule(input) {
  return repository.createModule(input);
}

function updateModule(id, input) {
  return repository.updateModule(id, input);
}

function deleteModule(id) {
  return repository.deleteModule(id);
}

function listAssessments() {
  return repository.listAssessments();
}

function createAssessment(input) {
  return repository.createAssessment(input);
}

function updateAssessment(id, input) {
  return repository.updateAssessment(id, input);
}

function deleteAssessment(id) {
  return repository.deleteAssessment(id);
}

function listSyncEvents() {
  return repository.listSyncEvents();
}

function listLessonSessions() {
  return repository.listLessonSessions();
}

function findLessonSessionBySessionId(sessionId) {
  return repository.findLessonSessionBySessionId(sessionId);
}

function upsertLessonSession(input) {
  return repository.upsertLessonSession(input);
}

function listSessionEventLog() {
  return repository.listSessionEventLog();
}

function createSessionEventLog(input) {
  return repository.createSessionEventLog(input);
}

function findSyncEventByClientId(clientId) {
  return repository.findSyncEventByClientId(clientId);
}

function createSyncEvent(input) {
  return repository.createSyncEvent(input);
}

function getStoreMeta() {
  return {
    mode: getDbMode(),
    persistenceReady: true,
    syncEventCount: listSyncEvents().length,
  };
}

module.exports = {
  listStudents,
  findStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  listAssignments,
  findAssignmentById,
  createAssignment,
  updateAssignment,
  listAttendance,
  createAttendance,
  listObservations,
  createObservation,
  listProgress,
  findProgressById,
  findProgressByStudentAndModule,
  createProgress,
  updateProgress,
  upsertProgress,
  listLessons,
  findLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  listCenters,
  listPods,
  listCohorts,
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  listStrands,
  createStrand,
  updateStrand,
  deleteStrand,
  listModules,
  createModule,
  updateModule,
  deleteModule,
  listAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  listSyncEvents,
  listLessonSessions,
  findLessonSessionBySessionId,
  upsertLessonSession,
  listSessionEventLog,
  createSessionEventLog,
  findSyncEventByClientId,
  createSyncEvent,
  getStoreMeta,
};