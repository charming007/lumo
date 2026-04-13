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


function listRewardTransactions() {
  return repository.listRewardTransactions();
}

function findRewardTransactionById(id) {
  return repository.findRewardTransactionById(id);
}

function listRewardAdjustments() {
  return repository.listRewardAdjustments();
}

function createRewardAdjustment(input) {
  return repository.createRewardAdjustment(input);
}


function listRewardRedemptionRequests() {
  return repository.listRewardRedemptionRequests();
}

function findRewardRedemptionRequestById(id) {
  return repository.findRewardRedemptionRequestById(id);
}

function createRewardRedemptionRequest(input) {
  return repository.createRewardRedemptionRequest(input);
}

function updateRewardRedemptionRequest(id, input) {
  return repository.updateRewardRedemptionRequest(id, input);
}

function listProgressionOverrides() {
  return repository.listProgressionOverrides();
}

function createProgressionOverride(input) {
  return repository.createProgressionOverride(input);
}

function updateProgressionOverride(id, input) {
  return repository.updateProgressionOverride(id, input);
}

function listSessionRepairs() {
  return repository.listSessionRepairs();
}

function createSessionRepair(input) {
  return repository.createSessionRepair(input);
}

function getStoreMeta() {
  const data = require('./data');

  return {
    mode: getDbMode(),
    persistenceReady: true,
    syncEventCount: listSyncEvents().length,
    dataFile: data.__meta?.file ?? null,
    storageKind: data.__meta?.storageKind ?? 'file',
    storageNote: data.__meta?.storageNote ?? null,
    runtimeSessionCount: listLessonSessions().length,
    rewardAdjustmentCount: listRewardAdjustments().length,
    rewardRedemptionRequestCount: listRewardRedemptionRequests().length,
    progressionOverrideCount: listProgressionOverrides().length,
    sessionRepairCount: listSessionRepairs().length,
    storageStatus: typeof data.storage?.getStatus === 'function' ? data.storage.getStatus() : null,
  };
}

function getStorageStatus() {
  const data = require('./data');
  return typeof data.storage?.getStatus === 'function' ? data.storage.getStatus() : null;
}

function checkpointStorage(label) {
  const data = require('./data');
  const backupPath = typeof data.storage?.checkpoint === 'function' ? data.storage.checkpoint(label) : null;

  return {
    backupPath,
    status: getStorageStatus(),
  };
}

function buildStorageIntegrityIssues() {
  const students = listStudents();
  const studentIds = new Set(students.map((item) => item.id));
  const rewardIds = new Set(listRewardTransactions().map((item) => item.id));
  const progressIds = new Set(listProgress().map((item) => item.id));
  const sessionIds = new Set(listLessonSessions().map((item) => item.sessionId));
  const itemIds = new Set((require('./rewards').REWARD_STORE_ITEMS || []).map((item) => item.id));
  const sessions = listLessonSessions();
  const requests = listRewardRedemptionRequests();
  const overrides = listProgressionOverrides();
  const repairs = listSessionRepairs();

  const issues = [];

  requests.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'reward-request-missing-student', id: entry.id, entity: 'rewardRequest' });
    if (!itemIds.has(entry.rewardItemId)) issues.push({ type: 'reward-request-missing-item', id: entry.id, entity: 'rewardRequest' });
    if (entry.transactionId && !rewardIds.has(entry.transactionId)) issues.push({ type: 'reward-request-missing-transaction', id: entry.id, entity: 'rewardRequest' });
  });

  sessions.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'session-missing-student', id: entry.sessionId, entity: 'lessonSession' });
  });

  overrides.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'progression-override-missing-student', id: entry.id, entity: 'progressionOverride' });
    if (entry.progressId && !progressIds.has(entry.progressId)) issues.push({ type: 'progression-override-missing-progress', id: entry.id, entity: 'progressionOverride' });
  });

  repairs.forEach((entry) => {
    if (entry.learnerId && !studentIds.has(entry.learnerId)) issues.push({ type: 'session-repair-missing-student', id: entry.id, entity: 'sessionRepair' });
    if (entry.sessionId && !sessionIds.has(entry.sessionId)) issues.push({ type: 'session-repair-missing-session', id: entry.id, entity: 'sessionRepair' });
  });

  return {
    students,
    sessions,
    requests,
    issues,
  };
}

function getStorageIntegrityReport() {
  const { students, sessions, requests, issues } = buildStorageIntegrityIssues();

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      studentCount: students.length,
      rewardTransactionCount: listRewardTransactions().length,
      rewardRequestCount: requests.length,
      runtimeSessionCount: sessions.length,
      issueCount: issues.length,
    },
    issues,
  };
}

function repairStorageIntegrity({ apply = false } = {}) {
  const data = require('./data');
  const report = buildStorageIntegrityIssues();
  const fixes = [];

  if (apply) {
    const orphanRequestIds = new Set(
      report.issues
        .filter((issue) => issue.entity === 'rewardRequest')
        .map((issue) => issue.id),
    );
    const orphanOverrideIds = new Set(
      report.issues
        .filter((issue) => issue.entity === 'progressionOverride')
        .map((issue) => issue.id),
    );
    const orphanRepairIds = new Set(
      report.issues
        .filter((issue) => issue.entity === 'sessionRepair')
        .map((issue) => issue.id),
    );
    const orphanSessionIds = new Set(
      report.issues
        .filter((issue) => issue.entity === 'lessonSession')
        .map((issue) => issue.id),
    );

    const prune = (collectionName, matcher, idList) => {
      const before = data[collectionName].length;
      data[collectionName] = data[collectionName].filter((entry) => !matcher(entry));
      const removed = before - data[collectionName].length;
      if (removed > 0) {
        fixes.push({ collection: collectionName, removed, ids: Array.from(idList) });
      }
    };

    prune('rewardRedemptionRequests', (entry) => orphanRequestIds.has(entry.id), orphanRequestIds);
    prune('progressionOverrides', (entry) => orphanOverrideIds.has(entry.id), orphanOverrideIds);
    prune('sessionRepairs', (entry) => orphanRepairIds.has(entry.id), orphanRepairIds);
    prune('lessonSessions', (entry) => orphanSessionIds.has(entry.sessionId), orphanSessionIds);

    if (fixes.length > 0) {
      data.persist();
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    apply,
    issueCount: report.issues.length,
    fixes,
    report: getStorageIntegrityReport(),
  };
}

function exportStorageSnapshot() {
  const data = require('./data');
  const snapshot = {};

  Object.keys(data)
    .filter((key) => !key.startsWith('__') && !['persist', 'reload', 'storage'].includes(key))
    .forEach((key) => {
      snapshot[key] = data[key];
    });

  const collectionCounts = Object.fromEntries(
    Object.entries(snapshot)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, value.length]),
  );

  return {
    exportedAt: new Date().toISOString(),
    mode: getDbMode(),
    collectionCounts,
    snapshot,
  };
}

function importStorageSnapshot({ snapshot, merge = false, createCheckpoint = true } = {}) {
  const data = require('./data');

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    const error = new Error('Provide snapshot object');
    error.statusCode = 400;
    throw error;
  }

  const before = exportStorageSnapshot();

  if (createCheckpoint && typeof data.storage?.checkpoint === 'function') {
    data.storage.checkpoint('pre-import');
  }

  Object.keys(before.snapshot).forEach((key) => {
    const incoming = snapshot[key];

    if (!Array.isArray(incoming)) {
      if (!merge) {
        data[key] = [];
      }
      return;
    }

    data[key] = merge ? [...data[key], ...incoming] : incoming;
  });

  data.persist();
  data.reload();

  return {
    importedAt: new Date().toISOString(),
    merge,
    before: before.collectionCounts,
    after: exportStorageSnapshot().collectionCounts,
    status: getStorageStatus(),
  };
}

function reloadStorageSnapshot() {
  const data = require('./data');
  data.reload();

  return {
    reloadedAt: new Date().toISOString(),
    status: getStorageStatus(),
  };
}

function restoreStorageBackup(backupPath) {
  const data = require('./data');

  if (typeof data.storage?.restoreFromBackup !== 'function') {
    const error = new Error('Storage restore is not available');
    error.statusCode = 501;
    throw error;
  }

  data.storage.restoreFromBackup(backupPath);
  data.reload();

  return {
    restoredFrom: backupPath,
    status: getStorageStatus(),
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
  listSessionRepairs,
  createSessionRepair,
  listRewardTransactions,
  findRewardTransactionById,
  listRewardAdjustments,
  createRewardAdjustment,
  listRewardRedemptionRequests,
  findRewardRedemptionRequestById,
  createRewardRedemptionRequest,
  updateRewardRedemptionRequest,
  getStoreMeta,
  getStorageStatus,
  checkpointStorage,
  getStorageIntegrityReport,
  repairStorageIntegrity,
  exportStorageSnapshot,
  importStorageSnapshot,
  reloadStorageSnapshot,
  restoreStorageBackup,
};