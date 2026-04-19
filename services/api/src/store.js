const repository = require('./repository');
const { getDbMode } = require('./db-mode');


function parseIsoDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getAgeHours(value, now = new Date()) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return Math.max(0, (now.getTime() - parsed.getTime()) / (1000 * 60 * 60));
}

function buildStorageFreshnessSignals(status = getStorageStatus(), now = new Date()) {
  const primaryAgeHours = getAgeHours(status?.updatedAt, now);
  const cacheAgeHours = getAgeHours(status?.cache?.updatedAt, now);
  const journalAgeHours = getAgeHours(status?.journal?.latestAt, now);
  const thresholds = {
    primaryWarningHours: 24,
    primaryCriticalHours: 72,
    cacheWarningHours: 12,
    cacheCriticalHours: 48,
    journalWarningHours: 24,
    journalCriticalHours: 72,
  };
  const classify = (ageHours, warning, critical) => {
    if (ageHours === null) return 'unknown';
    if (ageHours >= critical) return 'critical';
    if (ageHours >= warning) return 'warning';
    return 'healthy';
  };

  return {
    checkedAt: now.toISOString(),
    thresholds,
    primary: {
      updatedAt: status?.updatedAt || null,
      ageHours: primaryAgeHours,
      severity: classify(primaryAgeHours, thresholds.primaryWarningHours, thresholds.primaryCriticalHours),
    },
    cache: {
      updatedAt: status?.cache?.updatedAt || null,
      ageHours: cacheAgeHours,
      severity: classify(cacheAgeHours, thresholds.cacheWarningHours, thresholds.cacheCriticalHours),
      exists: Boolean(status?.cache?.exists),
      inSync: status?.cache?.inSync ?? null,
    },
    journal: {
      updatedAt: status?.journal?.latestAt || null,
      ageHours: journalAgeHours,
      severity: classify(journalAgeHours, thresholds.journalWarningHours, thresholds.journalCriticalHours),
      total: Number(status?.journal?.total || 0),
      latestMutationId: status?.journal?.latestMutationId || null,
      latestMutationRestorable: Boolean(status?.journal?.latestMutationRestorable),
    },
  };
}

function buildStorageDriftReport() {
  const status = getStorageStatus();
  const freshness = buildStorageFreshnessSignals(status);
  const drift = {
    generatedAt: new Date().toISOString(),
    status,
    freshness,
    summary: {
      hasDrift: false,
      severity: 'healthy',
      reasons: [],
    },
  };

  const reasons = [];
  if (status?.cache?.exists === false) reasons.push({ type: 'cache-missing', severity: 'critical' });
  if (status?.cache?.inSync === false) reasons.push({ type: 'cache-out-of-sync', severity: 'warning' });
  if (status?.primaryIntegrity?.journalAligned === false) reasons.push({ type: 'journal-drift', severity: 'critical' });
  if (['warning', 'critical'].includes(freshness.primary.severity)) reasons.push({ type: 'primary-stale', severity: freshness.primary.severity });
  if (['warning', 'critical'].includes(freshness.cache.severity)) reasons.push({ type: 'cache-stale', severity: freshness.cache.severity });
  if (['warning', 'critical'].includes(freshness.journal.severity)) reasons.push({ type: 'journal-stale', severity: freshness.journal.severity });

  const sevRank = { healthy: 0, warning: 1, critical: 2 };
  const severity = reasons.reduce((current, entry) => (sevRank[entry.severity] > sevRank[current] ? entry.severity : current), 'healthy');
  drift.summary = {
    hasDrift: reasons.length > 0,
    severity,
    reasons,
  };

  return drift;
}

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

function listLessonAssets() {
  return repository.listLessonAssets();
}

function createLessonAsset(input) {
  return repository.createLessonAsset(input);
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


function listCurriculumNodeChildren(nodeType, nodeId) {
  return repository.listCurriculumNodeChildren(nodeType, nodeId);
}

function reorderCurriculumNodes(input) {
  return repository.reorderCurriculumNodes(input);
}


function listLessonSessions() {
  return repository.listLessonSessions();
}

function findSessionRepairById(id) {
  return repository.findSessionRepairById(id);
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

function createRewardTransaction(input) {
  return repository.createRewardTransaction(input);
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

function findProgressionOverrideById(id) {
  return repository.findProgressionOverrideById(id);
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

function getStorageEngine() {
  return require('./data').storage || null;
}

function listStorageOperations(filters = {}) {
  const storage = getStorageEngine();

  if (typeof storage?.listOperations === 'function' && storage.kind === 'postgres') {
    return storage.listOperations(filters);
  }

  return repository.listStorageOperations();
}

function findStorageOperationById(id) {
  const storage = getStorageEngine();

  if (typeof storage?.getOperation === 'function' && storage.kind === 'postgres') {
    return storage.getOperation(id);
  }

  return repository.findStorageOperationById(id);
}

function createStorageOperation(input) {
  const created = repository.createStorageOperation(input);
  const storage = getStorageEngine();

  if (typeof storage?.recordOperation === 'function' && storage.kind === 'postgres') {
    storage.recordOperation(created);
  }

  return created;
}

function rebuildLessonSessionFromEventLog(sessionId, { apply = false, actorName = null, actorRole = null, reason = 'event_log_rebuild' } = {}) {
  const existing = findLessonSessionBySessionId(sessionId);
  if (!existing) {
    const error = new Error('Session not found');
    error.statusCode = 404;
    throw error;
  }

  const events = listSessionEventLog()
    .filter((entry) => entry.sessionId === sessionId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!events.length) {
    const error = new Error('Session has no event log to rebuild from');
    error.statusCode = 400;
    throw error;
  }

  const rebuilt = {
    sessionId: existing.sessionId,
    studentId: existing.studentId,
    learnerCode: existing.learnerCode ?? null,
    lessonId: existing.lessonId ?? null,
    moduleId: existing.moduleId ?? null,
    status: 'in_progress',
    completionState: 'inProgress',
    automationStatus: 'guided',
    currentStepIndex: 0,
    stepsTotal: 0,
    responsesCaptured: 0,
    supportActionsUsed: 0,
    audioCaptures: 0,
    facilitatorObservations: 0,
    latestReview: null,
    lastEventType: events[events.length - 1]?.type || null,
    startedAt: existing.startedAt || events[0]?.createdAt || new Date().toISOString(),
    lastActivityAt: events[events.length - 1]?.createdAt || existing.lastActivityAt || new Date().toISOString(),
    completedAt: null,
  };

  for (const entry of events) {
    const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
    rebuilt.studentId = payload.studentId ?? rebuilt.studentId;
    rebuilt.learnerCode = payload.learnerCode ?? rebuilt.learnerCode;
    rebuilt.lessonId = payload.lessonId ?? rebuilt.lessonId;
    rebuilt.moduleId = payload.moduleId ?? rebuilt.moduleId;
    rebuilt.automationStatus = payload.automationStatus ?? rebuilt.automationStatus;
    rebuilt.latestReview = payload.review ?? rebuilt.latestReview;
    rebuilt.lastEventType = entry.type;
    rebuilt.lastActivityAt = payload.capturedAt || entry.createdAt || rebuilt.lastActivityAt;
    rebuilt.startedAt = rebuilt.startedAt || payload.capturedAt || entry.createdAt || new Date().toISOString();

    const stepIndex = payload.stepIndex !== undefined ? Number(payload.stepIndex) : null;
    const stepsTotal = payload.stepsTotal !== undefined ? Number(payload.stepsTotal) : null;
    if (stepIndex !== null && Number.isFinite(stepIndex)) {
      rebuilt.currentStepIndex = Math.max(rebuilt.currentStepIndex, stepIndex);
    }
    if (stepsTotal !== null && Number.isFinite(stepsTotal)) {
      rebuilt.stepsTotal = Math.max(rebuilt.stepsTotal, stepsTotal);
    }

    if (entry.type === 'learner_response_captured') rebuilt.responsesCaptured += 1;
    if (entry.type === 'coach_support_used') rebuilt.supportActionsUsed += 1;
    if (entry.type === 'learner_audio_captured') rebuilt.audioCaptures += 1;
    if (entry.type === 'facilitator_observation_added') rebuilt.facilitatorObservations += 1;
    if (entry.type === 'lesson_step_completed' || entry.type === 'lesson_step_advanced') {
      const nextStep = stepIndex !== null && Number.isFinite(stepIndex) ? stepIndex : rebuilt.currentStepIndex + 1;
      rebuilt.currentStepIndex = Math.max(rebuilt.currentStepIndex, nextStep);
    }
    if (entry.type === 'lesson_completed') {
      const completionState = payload.completionState || 'completed';
      rebuilt.status = completionState === 'abandoned' ? 'abandoned' : 'completed';
      rebuilt.completionState = completionState;
      rebuilt.completedAt = payload.capturedAt || entry.createdAt || rebuilt.completedAt;
      rebuilt.currentStepIndex = Math.max(rebuilt.currentStepIndex, rebuilt.stepsTotal);
    }
    if (entry.type === 'session_abandoned') {
      rebuilt.status = 'abandoned';
      rebuilt.completionState = 'abandoned';
    }
    if (entry.type === 'session_reopened') {
      rebuilt.status = 'in_progress';
      rebuilt.completionState = 'inProgress';
      rebuilt.completedAt = null;
    }
  }

  const preview = { before: existing, after: rebuilt, eventCount: events.length };

  if (!apply) {
    return { ...preview, applied: false };
  }

  const updated = upsertLessonSession(rebuilt);
  createSessionEventLog({
    sessionId: updated.sessionId,
    studentId: updated.studentId,
    lessonId: updated.lessonId,
    moduleId: updated.moduleId,
    type: 'session_rebuilt_from_events',
    payload: { sourceEventCount: events.length, reason, actorName, actorRole },
    createdAt: new Date().toISOString(),
  });
  const repair = createSessionRepair({
    sessionId: updated.sessionId,
    learnerId: updated.studentId,
    actorName,
    actorRole,
    reason,
    patch: { action: 'rebuild-from-events', sourceEventCount: events.length },
    before: existing,
    after: updated,
  });

  return { before: existing, after: updated, eventCount: events.length, applied: true, repair };
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
    storageOperationCount: listStorageOperations().length,
    storageStatus: typeof data.storage?.getStatus === 'function' ? data.storage.getStatus() : null,
    storageFreshness: buildStorageFreshnessSignals(typeof data.storage?.getStatus === 'function' ? data.storage.getStatus() : null),
  };
}

function getStorageStatus() {
  const data = require('./data');
  return typeof data.storage?.getStatus === 'function' ? data.storage.getStatus() : null;
}

function reconcileStorageCache(actor = {}) {
  const data = require('./data');

  if (typeof data.storage?.reconcileCache !== 'function') {
    const error = new Error('Storage cache reconcile is not available');
    error.statusCode = 501;
    throw error;
  }

  const result = {
    reconciledAt: new Date().toISOString(),
    ...(data.storage.reconcileCache() || {}),
    status: getStorageStatus(),
  };

  recordStorageOperation('reconcile-cache', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    summary: {
      reconciled: Boolean(result.reconciled),
      cacheInSync: Boolean(result.status?.cache?.inSync),
      cacheExists: Boolean(result.status?.cache?.exists),
    },
  });

  return result;
}

function createPreflightRecoveryCheckpoint(action, actor = {}) {
  const data = require('./data');

  if (typeof data.storage?.checkpoint !== 'function') {
    return null;
  }

  const label = `pre-${String(action || 'recovery').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'recovery'}-${new Date().toISOString()}`;
  const backupPath = data.storage.checkpoint(label);

  return {
    label,
    backupPath,
  };
}

function recoverStoragePrimaryFromWarmCache(actor = {}) {
  const data = require('./data');

  if (typeof data.storage?.recoverPrimaryFromWarmCache !== 'function') {
    const error = new Error('Primary recovery from warm cache is not available');
    error.statusCode = 501;
    throw error;
  }

  const preflightCheckpoint = createPreflightRecoveryCheckpoint('recover-primary-from-cache', actor);
  const recovered = data.storage.recoverPrimaryFromWarmCache() || {};
  data.reload();
  const snapshot = exportStorageSnapshot();
  const result = {
    recoveredAt: new Date().toISOString(),
    ...recovered,
    preflightCheckpoint,
    collectionCounts: snapshot.collectionCounts,
    status: getStorageStatus(),
  };

  recordStorageOperation('recover-primary-from-cache', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    backupPath: preflightCheckpoint?.backupPath || null,
    label: preflightCheckpoint?.label || null,
    summary: {
      recovered: Boolean(result.recovered),
      recordsAfterRecovery: summarizeCollectionCounts(snapshot.collectionCounts),
      cacheInSync: Boolean(result.status?.cache?.inSync),
      journalAligned: Boolean(result.status?.primaryIntegrity?.journalAligned),
      preflightCheckpointCreated: Boolean(preflightCheckpoint?.backupPath),
    },
    metadata: {
      preflightCheckpoint,
    },
  });

  return result;
}

function summarizeCollectionCounts(counts = {}) {
  return Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
}

function recordStorageOperation(kind, result = {}, options = {}) {
  return createStorageOperation({
    kind,
    status: options.status || 'succeeded',
    actorName: options.actorName,
    actorRole: options.actorRole,
    label: options.label || null,
    backupPath: options.backupPath || result.backupPath || result.restoredFrom || result.deleted || null,
    apply: options.apply,
    merge: options.merge,
    createCheckpoint: options.createCheckpoint,
    summary: options.summary || null,
    metadata: {
      status: result.status || null,
      before: result.before || null,
      after: result.after || null,
      changes: result.changes || null,
      report: result.report || null,
      ...(options.metadata || {}),
    },
  });
}

function checkpointStorage(label, actor = {}) {
  const data = require('./data');
  const backupPath = typeof data.storage?.checkpoint === 'function' ? data.storage.checkpoint(label) : null;
  const result = {
    backupPath,
    status: getStorageStatus(),
  };

  recordStorageOperation('checkpoint', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    label,
    backupPath,
    summary: {
      persistent: Boolean(result.status?.db?.persistent),
      backupCount: result.status?.backups?.length ?? 0,
    },
  });

  return result;
}

function listStorageBackups(limit = 20) {
  const data = require('./data');

  if (typeof data.storage?.listBackups !== 'function') {
    return [];
  }

  return data.storage.listBackups(limit);
}

function getStorageMutationDetail(id) {
  const data = require('./data');

  if (typeof data.storage?.getMutation !== 'function') {
    return null;
  }

  return data.storage.getMutation(id);
}

function restoreStorageMutation(id, actor = {}) {
  const data = require('./data');

  if (typeof data.storage?.restoreFromMutation !== 'function') {
    const error = new Error('Storage mutation restore is not available');
    error.statusCode = 501;
    throw error;
  }

  const detail = getStorageMutationDetail(id);

  if (!detail) {
    const error = new Error('Storage mutation not found');
    error.statusCode = 404;
    throw error;
  }

  if (!detail.hasSnapshot) {
    const error = new Error('Storage mutation does not contain a restorable snapshot');
    error.statusCode = 409;
    throw error;
  }

  const preflightCheckpoint = createPreflightRecoveryCheckpoint('restore-mutation', actor);
  data.storage.restoreFromMutation(id);
  data.reload();

  const status = getStorageStatus();
  const snapshot = exportStorageSnapshot();
  const result = {
    mutationId: Number(id),
    restoredFromMutationId: Number(id),
    preflightCheckpoint,
    status,
    collectionCounts: snapshot.collectionCounts,
  };

  recordStorageOperation('restore-mutation', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    backupPath: preflightCheckpoint?.backupPath || null,
    label: preflightCheckpoint?.label || null,
    summary: {
      restoredFromMutationId: Number(id),
      recordsAfterRestore: summarizeCollectionCounts(snapshot.collectionCounts),
      preflightCheckpointCreated: Boolean(preflightCheckpoint?.backupPath),
    },
    metadata: {
      mutation: {
        id: detail.id,
        action: detail.action,
        createdAt: detail.createdAt,
        snapshotHash: detail.snapshotHash,
        collectionCounts: detail.collectionCounts,
      },
      preflightCheckpoint,
    },
  });

  return result;
}

function deleteStorageBackup(backupPath, actor = {}) {
  const data = require('./data');

  if (typeof data.storage?.deleteBackup !== 'function') {
    const error = new Error('Storage backup deletion is not available');
    error.statusCode = 501;
    throw error;
  }

  data.storage.deleteBackup(backupPath);

  const result = {
    deleted: backupPath,
    status: getStorageStatus(),
  };

  recordStorageOperation('delete-backup', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    backupPath,
    summary: {
      backupCount: result.status?.backups?.length ?? 0,
    },
  });

  return result;
}

function buildStorageIntegrityIssues() {
  const data = require('./data');
  const students = listStudents();
  const studentIds = new Set(students.map((item) => item.id));
  const teacherIds = new Set(listTeachers().map((item) => item.id));
  const cohortIds = new Set(listCohorts().map((item) => item.id));
  const lessonIds = new Set(listLessons().map((item) => item.id));
  const assessmentIds = new Set(listAssessments().map((item) => item.id));
  const subjectIds = new Set(listSubjects().map((item) => item.id));
  const moduleIds = new Set(listModules().map((item) => item.id));
  const rewardIds = new Set(listRewardTransactions().map((item) => item.id));
  const progressIds = new Set(listProgress().map((item) => item.id));
  const sessionIds = new Set(listLessonSessions().map((item) => item.sessionId));
  const itemIds = new Set((require('./rewards').REWARD_STORE_ITEMS || []).map((item) => item.id));
  const sessions = listLessonSessions();
  const requests = listRewardRedemptionRequests();
  const overrides = listProgressionOverrides();
  const repairs = listSessionRepairs();
  const assignments = listAssignments();
  const attendance = listAttendance();
  const progress = listProgress();
  const observations = listObservations();
  const syncEvents = listSyncEvents();
  const sessionEvents = listSessionEventLog();

  const issues = [];

  requests.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'reward-request-missing-student', id: entry.id, entity: 'rewardRequest' });
    if (!itemIds.has(entry.rewardItemId)) issues.push({ type: 'reward-request-missing-item', id: entry.id, entity: 'rewardRequest' });
    if (entry.transactionId && !rewardIds.has(entry.transactionId)) issues.push({ type: 'reward-request-missing-transaction', id: entry.id, entity: 'rewardRequest' });
  });

  sessions.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'session-missing-student', id: entry.sessionId, entity: 'lessonSession' });
  });

  sessionEvents.forEach((entry) => {
    if (entry.studentId && !studentIds.has(entry.studentId)) issues.push({ type: 'session-event-missing-student', id: entry.id, entity: 'sessionEventLog' });
    if (entry.sessionId && !sessionIds.has(entry.sessionId)) issues.push({ type: 'session-event-missing-session', id: entry.id, entity: 'sessionEventLog' });
  });

  syncEvents.forEach((entry) => {
    if (entry.learnerId && !studentIds.has(entry.learnerId)) issues.push({ type: 'sync-event-missing-student', id: entry.id, entity: 'syncEvent' });
  });

  assignments.forEach((entry) => {
    if (entry.cohortId && !cohortIds.has(entry.cohortId)) issues.push({ type: 'assignment-missing-cohort', id: entry.id, entity: 'assignment' });
    if (entry.assignedBy && !teacherIds.has(entry.assignedBy)) issues.push({ type: 'assignment-missing-teacher', id: entry.id, entity: 'assignment' });
    if (entry.lessonId && !lessonIds.has(entry.lessonId)) issues.push({ type: 'assignment-missing-lesson', id: entry.id, entity: 'assignment' });
    if (entry.assessmentId && !assessmentIds.has(entry.assessmentId)) issues.push({ type: 'assignment-missing-assessment', id: entry.id, entity: 'assignment' });
  });

  attendance.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'attendance-missing-student', id: entry.id, entity: 'attendance' });
  });

  progress.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'progress-missing-student', id: entry.id, entity: 'progress' });
    if (entry.subjectId && !subjectIds.has(entry.subjectId)) issues.push({ type: 'progress-missing-subject', id: entry.id, entity: 'progress' });
    if (entry.moduleId && !moduleIds.has(entry.moduleId)) issues.push({ type: 'progress-missing-module', id: entry.id, entity: 'progress' });
    if (entry.recommendedNextModuleId && !moduleIds.has(entry.recommendedNextModuleId)) issues.push({ type: 'progress-missing-recommended-module', id: entry.id, entity: 'progress' });
  });

  observations.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'observation-missing-student', id: entry.id, entity: 'observation' });
    if (entry.teacherId && !teacherIds.has(entry.teacherId)) issues.push({ type: 'observation-missing-teacher', id: entry.id, entity: 'observation' });
  });

  overrides.forEach((entry) => {
    if (!studentIds.has(entry.studentId)) issues.push({ type: 'progression-override-missing-student', id: entry.id, entity: 'progressionOverride' });
    if (entry.progressId && !progressIds.has(entry.progressId)) issues.push({ type: 'progression-override-missing-progress', id: entry.id, entity: 'progressionOverride' });
  });

  repairs.forEach((entry) => {
    if (entry.learnerId && !studentIds.has(entry.learnerId)) issues.push({ type: 'session-repair-missing-student', id: entry.id, entity: 'sessionRepair' });
    if (entry.sessionId && !sessionIds.has(entry.sessionId)) issues.push({ type: 'session-repair-missing-session', id: entry.id, entity: 'sessionRepair' });
  });

  const status = getStorageStatus();
  const freshness = buildStorageFreshnessSignals(status);
  if (status?.kind === 'postgres') {
    if (!status.cache?.exists) {
      issues.push({ type: 'storage-cache-missing', id: status.file, entity: 'storageCache' });
    } else if (status.cache?.inSync === false) {
      issues.push({
        type: 'storage-cache-out-of-sync',
        id: status.file,
        entity: 'storageCache',
        snapshotHash: status.cache?.snapshotHash || null,
        cacheHash: status.cache?.cacheHash || null,
      });
    }

    if (status.primaryIntegrity?.journalAligned === false) {
      issues.push({
        type: 'storage-primary-journal-drift',
        id: status.file,
        entity: 'storagePrimary',
        snapshotHash: status.primaryIntegrity?.snapshotHash || null,
        journalHash: status.journal?.latestMutationHash || null,
        latestMutationId: status.journal?.latestMutationId || null,
      });
    }

    const restorableMutations = typeof data.storage?.listMutations === 'function'
      ? data.storage.listMutations(50).filter((entry) => entry.hasSnapshot)
      : [];
    const availableBackups = typeof data.storage?.listBackups === 'function'
      ? data.storage.listBackups(50)
      : [];

    if (!availableBackups.length && !restorableMutations.length && !status.primaryIntegrity?.recoverableFromWarmCache) {
      issues.push({
        type: 'storage-no-recovery-path',
        id: status.file,
        entity: 'storageRecovery',
      });
    }

    if (['warning', 'critical'].includes(freshness.primary.severity)) {
      issues.push({
        type: 'storage-primary-stale',
        id: status.file,
        entity: 'storagePrimary',
        ageHours: freshness.primary.ageHours,
        severity: freshness.primary.severity,
      });
    }

    if (status.cache?.exists && ['warning', 'critical'].includes(freshness.cache.severity)) {
      issues.push({
        type: 'storage-cache-stale',
        id: status.file,
        entity: 'storageCache',
        ageHours: freshness.cache.ageHours,
        severity: freshness.cache.severity,
      });
    }

    if (status.journal?.total > 0 && ['warning', 'critical'].includes(freshness.journal.severity)) {
      issues.push({
        type: 'storage-journal-stale',
        id: status.file,
        entity: 'storageJournal',
        ageHours: freshness.journal.ageHours,
        severity: freshness.journal.severity,
      });
    }
  }

  return {
    students,
    sessions,
    requests,
    issues,
  };
}

function getStorageIntegrityReport() {
  const { students, sessions, requests, issues } = buildStorageIntegrityIssues();
  const status = getStorageStatus();

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      studentCount: students.length,
      rewardTransactionCount: listRewardTransactions().length,
      rewardRequestCount: requests.length,
      runtimeSessionCount: sessions.length,
      syncEventCount: listSyncEvents().length,
      assignmentCount: listAssignments().length,
      attendanceCount: listAttendance().length,
      progressCount: listProgress().length,
      observationCount: listObservations().length,
      sessionEventCount: listSessionEventLog().length,
      cacheInSync: status?.kind === 'postgres' ? Boolean(status.cache?.inSync) : true,
      issueCount: issues.length,
    },
    issues,
  };
}

function repairStorageIntegrity({ apply = false, actorName = null, actorRole = null } = {}) {
  const data = require('./data');
  const report = buildStorageIntegrityIssues();
  const fixes = [];

  if (apply) {
    const issueIdsByEntity = report.issues.reduce((acc, issue) => {
      if (!acc[issue.entity]) acc[issue.entity] = new Set();
      acc[issue.entity].add(issue.id);
      return acc;
    }, {});

    const prune = (collectionName, entityName, matcher) => {
      const idList = Array.from(issueIdsByEntity[entityName] || []);
      if (!idList.length) return;

      const before = data[collectionName].length;
      data[collectionName] = data[collectionName].filter((entry) => !matcher(entry));
      const removed = before - data[collectionName].length;
      if (removed > 0) {
        fixes.push({ collection: collectionName, removed, ids: idList });
      }
    };

    prune('rewardRedemptionRequests', 'rewardRequest', (entry) => (issueIdsByEntity.rewardRequest || new Set()).has(entry.id));
    prune('progressionOverrides', 'progressionOverride', (entry) => (issueIdsByEntity.progressionOverride || new Set()).has(entry.id));
    prune('sessionRepairs', 'sessionRepair', (entry) => (issueIdsByEntity.sessionRepair || new Set()).has(entry.id));
    prune('lessonSessions', 'lessonSession', (entry) => (issueIdsByEntity.lessonSession || new Set()).has(entry.sessionId));
    prune('sessionEventLog', 'sessionEventLog', (entry) => (issueIdsByEntity.sessionEventLog || new Set()).has(entry.id));
    prune('syncEvents', 'syncEvent', (entry) => (issueIdsByEntity.syncEvent || new Set()).has(entry.id));
    prune('assignments', 'assignment', (entry) => (issueIdsByEntity.assignment || new Set()).has(entry.id));
    prune('attendance', 'attendance', (entry) => (issueIdsByEntity.attendance || new Set()).has(entry.id));
    prune('progress', 'progress', (entry) => (issueIdsByEntity.progress || new Set()).has(entry.id));
    prune('observations', 'observation', (entry) => (issueIdsByEntity.observation || new Set()).has(entry.id));

    if ((issueIdsByEntity.storageCache || new Set()).size > 0 && typeof data.storage?.reconcileCache === 'function') {
      const reconcile = data.storage.reconcileCache() || {};
      fixes.push({
        collection: 'storageCache',
        removed: 0,
        ids: Array.from(issueIdsByEntity.storageCache || []),
        reconciled: Boolean(reconcile.reconciled),
        cache: reconcile.cache || null,
      });
    }

    if ((issueIdsByEntity.storagePrimary || new Set()).size > 0 && typeof data.storage?.repairPrimaryFromLatestSnapshot === 'function') {
      const repaired = data.storage.repairPrimaryFromLatestSnapshot() || {};
      fixes.push({
        collection: 'storagePrimary',
        removed: 0,
        ids: Array.from(issueIdsByEntity.storagePrimary || []),
        repaired: Boolean(repaired.repaired),
        source: repaired.source || null,
      });
    }

    const dataFixesApplied = fixes.some((entry) => !['storageCache', 'storagePrimary'].includes(entry.collection) && Number(entry.removed || 0) > 0);
    if (dataFixesApplied) {
      data.persist();
    }
  }

  const result = {
    checkedAt: new Date().toISOString(),
    apply,
    issueCount: report.issues.length,
    fixes,
    report: getStorageIntegrityReport(),
  };

  recordStorageOperation('repair-integrity', result, {
    actorName,
    actorRole,
    apply,
    summary: {
      issueCount: result.issueCount,
      fixesApplied: fixes.reduce((sum, entry) => sum + Number(entry.removed || 0), 0),
    },
  });

  return result;
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

function getCollectionIdentityField(collection) {
  return collection === 'lessonSessions' ? 'sessionId' : 'id';
}

function buildImportAnalysis({ currentSnapshot = {}, incomingSnapshot = {}, merge = false } = {}) {
  const knownCollections = Array.from(new Set([
    ...Object.keys(currentSnapshot || {}),
    ...Object.keys(incomingSnapshot || {}),
  ]));
  const nextSnapshot = {};

  knownCollections.forEach((key) => {
    const current = Array.isArray(currentSnapshot[key]) ? currentSnapshot[key] : [];
    const incoming = Array.isArray(incomingSnapshot[key]) ? incomingSnapshot[key] : [];
    nextSnapshot[key] = merge ? [...current, ...incoming] : incoming;
  });

  const issues = [];
  const pushIssue = (severity, code, message, details = {}) => {
    issues.push({ severity, code, message, ...details });
  };

  knownCollections.forEach((key) => {
    const incoming = Array.isArray(incomingSnapshot[key]) ? incomingSnapshot[key] : [];
    const next = Array.isArray(nextSnapshot[key]) ? nextSnapshot[key] : [];
    const current = Array.isArray(currentSnapshot[key]) ? currentSnapshot[key] : [];
    const identityField = getCollectionIdentityField(key);

    if (incomingSnapshot[key] !== undefined && !Array.isArray(incomingSnapshot[key])) {
      pushIssue('critical', 'invalid-collection-shape', `${key} must be an array when provided`, { collection: key });
      return;
    }

    const nextIdMap = new Map();
    next.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        pushIssue('critical', 'invalid-record-shape', `${key} contains a non-object record`, { collection: key, index });
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(entry, identityField) || entry[identityField] === undefined || entry[identityField] === null || entry[identityField] === '') {
        pushIssue('critical', 'missing-record-id', `${key} contains a record without a ${identityField}`, { collection: key, index, identityField });
        return;
      }

      const recordId = String(entry[identityField]);
      if (!nextIdMap.has(recordId)) {
        nextIdMap.set(recordId, []);
      }
      nextIdMap.get(recordId).push(index);
    });

    Array.from(nextIdMap.entries())
      .filter(([, indexes]) => indexes.length > 1)
      .forEach(([recordId, indexes]) => {
        pushIssue(merge ? 'critical' : 'warning', 'duplicate-record-id', `${key} contains duplicate ${identityField} ${recordId}`, {
          collection: key,
          id: recordId,
          identityField,
          occurrences: indexes.length,
        });
      });

    if (merge) {
      const currentIds = new Set(current.map((entry) => String(entry?.[identityField] || '')).filter(Boolean));
      incoming.forEach((entry, index) => {
        const recordId = String(entry?.[identityField] || '');
        if (recordId && currentIds.has(recordId)) {
          pushIssue('critical', 'merge-id-collision', `${key} would collide with existing ${identityField} ${recordId}`, {
            collection: key,
            id: recordId,
            identityField,
            index,
          });
        }
      });
    }
  });

  const idSets = {
    students: new Set((nextSnapshot.students || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    teachers: new Set((nextSnapshot.teachers || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    cohorts: new Set((nextSnapshot.cohorts || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    lessons: new Set((nextSnapshot.lessons || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    assessments: new Set((nextSnapshot.assessments || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    subjects: new Set((nextSnapshot.subjects || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    modules: new Set((nextSnapshot.modules || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    rewardTransactions: new Set((nextSnapshot.rewardTransactions || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    progression: new Set((nextSnapshot.progress || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
    lessonSessions: new Set((nextSnapshot.lessonSessions || []).map((entry) => String(entry?.sessionId || '')).filter(Boolean)),
    rewardItems: new Set((require('./rewards').REWARD_STORE_ITEMS || []).map((entry) => String(entry?.id || '')).filter(Boolean)),
  };

  const checkReference = ({ collection, entries = [], field, targetSet, code, message, useSessionId = false }) => {
    entries.forEach((entry, index) => {
      const value = entry?.[field];
      if (!value) return;
      const normalized = String(value);
      if (!targetSet.has(normalized)) {
        pushIssue('critical', code, message(normalized), {
          collection,
          field,
          id: useSessionId ? String(entry?.sessionId || '') : String(entry?.id || ''),
          index,
          missing: normalized,
        });
      }
    });
  };

  checkReference({ collection: 'rewardRedemptionRequests', entries: nextSnapshot.rewardRedemptionRequests || [], field: 'studentId', targetSet: idSets.students, code: 'reward-request-missing-student', message: (value) => `rewardRedemptionRequests references missing student ${value}` });
  checkReference({ collection: 'rewardRedemptionRequests', entries: nextSnapshot.rewardRedemptionRequests || [], field: 'rewardItemId', targetSet: idSets.rewardItems, code: 'reward-request-missing-item', message: (value) => `rewardRedemptionRequests references missing reward item ${value}` });
  checkReference({ collection: 'rewardRedemptionRequests', entries: nextSnapshot.rewardRedemptionRequests || [], field: 'transactionId', targetSet: idSets.rewardTransactions, code: 'reward-request-missing-transaction', message: (value) => `rewardRedemptionRequests references missing reward transaction ${value}` });
  checkReference({ collection: 'lessonSessions', entries: nextSnapshot.lessonSessions || [], field: 'studentId', targetSet: idSets.students, code: 'session-missing-student', message: (value) => `lessonSessions references missing student ${value}`, useSessionId: true });
  checkReference({ collection: 'sessionEventLog', entries: nextSnapshot.sessionEventLog || [], field: 'studentId', targetSet: idSets.students, code: 'session-event-missing-student', message: (value) => `sessionEventLog references missing student ${value}` });
  checkReference({ collection: 'sessionEventLog', entries: nextSnapshot.sessionEventLog || [], field: 'sessionId', targetSet: idSets.lessonSessions, code: 'session-event-missing-session', message: (value) => `sessionEventLog references missing runtime session ${value}` });
  checkReference({ collection: 'syncEvents', entries: nextSnapshot.syncEvents || [], field: 'learnerId', targetSet: idSets.students, code: 'sync-event-missing-student', message: (value) => `syncEvents references missing student ${value}` });
  checkReference({ collection: 'assignments', entries: nextSnapshot.assignments || [], field: 'cohortId', targetSet: idSets.cohorts, code: 'assignment-missing-cohort', message: (value) => `assignments references missing cohort ${value}` });
  checkReference({ collection: 'assignments', entries: nextSnapshot.assignments || [], field: 'assignedBy', targetSet: idSets.teachers, code: 'assignment-missing-teacher', message: (value) => `assignments references missing teacher ${value}` });
  checkReference({ collection: 'assignments', entries: nextSnapshot.assignments || [], field: 'lessonId', targetSet: idSets.lessons, code: 'assignment-missing-lesson', message: (value) => `assignments references missing lesson ${value}` });
  checkReference({ collection: 'assignments', entries: nextSnapshot.assignments || [], field: 'assessmentId', targetSet: idSets.assessments, code: 'assignment-missing-assessment', message: (value) => `assignments references missing assessment ${value}` });
  checkReference({ collection: 'attendance', entries: nextSnapshot.attendance || [], field: 'studentId', targetSet: idSets.students, code: 'attendance-missing-student', message: (value) => `attendance references missing student ${value}` });
  checkReference({ collection: 'progress', entries: nextSnapshot.progress || [], field: 'studentId', targetSet: idSets.students, code: 'progress-missing-student', message: (value) => `progress references missing student ${value}` });
  checkReference({ collection: 'progress', entries: nextSnapshot.progress || [], field: 'subjectId', targetSet: idSets.subjects, code: 'progress-missing-subject', message: (value) => `progress references missing subject ${value}` });
  checkReference({ collection: 'progress', entries: nextSnapshot.progress || [], field: 'moduleId', targetSet: idSets.modules, code: 'progress-missing-module', message: (value) => `progress references missing module ${value}` });
  checkReference({ collection: 'progress', entries: nextSnapshot.progress || [], field: 'recommendedNextModuleId', targetSet: idSets.modules, code: 'progress-missing-recommended-module', message: (value) => `progress references missing recommended module ${value}` });
  checkReference({ collection: 'observations', entries: nextSnapshot.observations || [], field: 'studentId', targetSet: idSets.students, code: 'observation-missing-student', message: (value) => `observations references missing student ${value}` });
  checkReference({ collection: 'observations', entries: nextSnapshot.observations || [], field: 'teacherId', targetSet: idSets.teachers, code: 'observation-missing-teacher', message: (value) => `observations references missing teacher ${value}` });
  checkReference({ collection: 'progressionOverrides', entries: nextSnapshot.progressionOverrides || [], field: 'studentId', targetSet: idSets.students, code: 'progression-override-missing-student', message: (value) => `progressionOverrides references missing student ${value}` });
  checkReference({ collection: 'progressionOverrides', entries: nextSnapshot.progressionOverrides || [], field: 'progressId', targetSet: idSets.progression, code: 'progression-override-missing-progress', message: (value) => `progressionOverrides references missing progress record ${value}` });
  checkReference({ collection: 'sessionRepairs', entries: nextSnapshot.sessionRepairs || [], field: 'learnerId', targetSet: idSets.students, code: 'session-repair-missing-student', message: (value) => `sessionRepairs references missing student ${value}` });
  checkReference({ collection: 'sessionRepairs', entries: nextSnapshot.sessionRepairs || [], field: 'sessionId', targetSet: idSets.lessonSessions, code: 'session-repair-missing-session', message: (value) => `sessionRepairs references missing runtime session ${value}` });

  const severityCounts = issues.reduce((acc, issue) => {
    acc[issue.severity] = Number(acc[issue.severity] || 0) + 1;
    return acc;
  }, { critical: 0, warning: 0, info: 0 });

  return {
    issues,
    summary: {
      issueCount: issues.length,
      criticalCount: severityCounts.critical || 0,
      warningCount: severityCounts.warning || 0,
      safeToImport: issues.every((issue) => issue.severity !== 'critical'),
      trust: issues.some((issue) => issue.severity === 'critical')
        ? 'blocked'
        : issues.some((issue) => issue.severity === 'warning')
          ? 'review'
          : 'clean',
    },
  };
}

function previewStorageImport({ snapshot, merge = false } = {}) {
  const before = exportStorageSnapshot();

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    const error = new Error('Provide snapshot object');
    error.statusCode = 400;
    throw error;
  }

  const after = {};
  const changes = {};

  Object.keys(before.snapshot).forEach((key) => {
    const current = Array.isArray(before.snapshot[key]) ? before.snapshot[key] : [];
    const incoming = Array.isArray(snapshot[key]) ? snapshot[key] : [];
    const next = merge ? [...current, ...incoming] : incoming;
    after[key] = next.length;
    changes[key] = {
      before: current.length,
      incoming: incoming.length,
      after: next.length,
      delta: next.length - current.length,
    };
  });

  const analysis = buildImportAnalysis({
    currentSnapshot: before.snapshot,
    incomingSnapshot: snapshot,
    merge,
  });

  return {
    previewedAt: new Date().toISOString(),
    merge,
    before: before.collectionCounts,
    after,
    changes,
    analysis,
  };
}

function importStorageSnapshot({ snapshot, merge = false, createCheckpoint = true, force = false, actorName = null, actorRole = null } = {}) {
  const data = require('./data');

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    const error = new Error('Provide snapshot object');
    error.statusCode = 400;
    throw error;
  }

  const before = exportStorageSnapshot();
  const preview = previewStorageImport({ snapshot, merge });

  if (!force && !preview.analysis.summary.safeToImport) {
    const error = new Error('Import blocked by critical integrity issues. Preview the import or retry with force: true after review.');
    error.statusCode = 409;
    error.details = preview.analysis;
    throw error;
  }

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

  const after = exportStorageSnapshot().collectionCounts;
  const result = {
    importedAt: new Date().toISOString(),
    merge,
    force,
    before: before.collectionCounts,
    after,
    preview: preview.analysis,
    status: getStorageStatus(),
  };

  recordStorageOperation('import', result, {
    actorName,
    actorRole,
    merge,
    createCheckpoint,
    summary: {
      beforeRecords: summarizeCollectionCounts(before.collectionCounts),
      afterRecords: summarizeCollectionCounts(after),
      deltaRecords: summarizeCollectionCounts(after) - summarizeCollectionCounts(before.collectionCounts),
      importTrust: preview.analysis.summary.trust,
      blockedCriticalIssues: preview.analysis.summary.criticalCount,
    },
    metadata: {
      importPreview: preview.analysis,
      force,
    },
  });

  return result;
}

function reloadStorageSnapshot(actor = {}) {
  const data = require('./data');
  data.reload();

  const result = {
    reloadedAt: new Date().toISOString(),
    status: getStorageStatus(),
  };

  recordStorageOperation('reload', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    summary: {
      backupCount: result.status?.backups?.length ?? 0,
      persistent: Boolean(result.status?.db?.persistent),
    },
  });

  return result;
}

function restoreStorageBackup(backupPath, actor = {}) {
  const data = require('./data');

  if (typeof data.storage?.restoreFromBackup !== 'function') {
    const error = new Error('Storage restore is not available');
    error.statusCode = 501;
    throw error;
  }

  const preflightCheckpoint = createPreflightRecoveryCheckpoint('restore-backup', actor);
  data.storage.restoreFromBackup(backupPath);
  data.reload();

  const result = {
    restoredFrom: backupPath,
    preflightCheckpoint,
    status: getStorageStatus(),
  };

  recordStorageOperation('restore', result, {
    actorName: actor.actorName,
    actorRole: actor.actorRole,
    backupPath,
    label: preflightCheckpoint?.label || null,
    summary: {
      backupCount: result.status?.backups?.length ?? 0,
      persistent: Boolean(result.status?.db?.persistent),
      preflightCheckpointCreated: Boolean(preflightCheckpoint?.backupPath),
    },
    metadata: {
      preflightCheckpoint,
    },
  });

  return result;
}

function buildStorageRecoveryPlan({ label = null, limit = 10, includeStale = true } = {}) {
  const data = require('./data');
  const normalizedLimit = Math.max(1, Math.min(Number(limit || 10), 100));
  const labelQuery = String(label || '').trim().toLowerCase();
  const status = getStorageStatus();
  const integrity = getStorageIntegrityReport();
  const freshness = buildStorageFreshnessSignals(status);
  const backups = listStorageBackups(Math.max(normalizedLimit, 20));
  const mutations = typeof data.storage?.listMutations === 'function'
    ? data.storage.listMutations(Math.max(normalizedLimit, 20))
    : [];
  const restorableMutations = mutations.filter((entry) => entry.hasSnapshot);

  const matchesLabel = (values = []) => !labelQuery || values.some((value) => String(value || '').toLowerCase().includes(labelQuery));
  const candidates = [];

  backups
    .filter((entry) => matchesLabel([entry.label, entry.name, entry.path]))
    .forEach((entry, index) => {
      const ageHours = getAgeHours(entry.modifiedAt || null);
      candidates.push({
        source: 'backup',
        id: entry.path,
        label: entry.label || entry.name || null,
        path: entry.path,
        createdAt: entry.modifiedAt || null,
        ageHours,
        restorable: true,
        stale: ageHours !== null && ageHours >= 72,
        score: 100 - index - Math.min(Math.floor((ageHours || 0) / 24), 20),
        reason: index === 0 ? 'latest durable checkpoint' : 'durable checkpoint',
      });
    });

  restorableMutations.slice(0, Math.max(normalizedLimit, 20)).forEach((entry, index) => {
    const ageHours = getAgeHours(entry.createdAt || null);
    candidates.push({
      source: 'mutation',
      id: entry.id,
      mutationId: entry.id,
      action: entry.action,
      createdAt: entry.createdAt || null,
      ageHours,
      stale: ageHours !== null && ageHours >= 72,
      restorable: true,
      score: 90 - index - Math.min(Math.floor((ageHours || 0) / 24), 20),
      reason: index === 0 ? 'latest journal snapshot' : 'journal snapshot restore point',
    });
  });

  if (status?.primaryIntegrity?.recoverableFromWarmCache) {
    const ageHours = getAgeHours(status?.cache?.updatedAt || null);
    candidates.push({
      source: 'warm-cache',
      id: 'warm-cache',
      createdAt: status?.cache?.updatedAt || null,
      ageHours,
      stale: ageHours !== null && ageHours >= 48,
      restorable: true,
      score: (status?.cache?.inSync === true ? 80 : 65) - Math.min(Math.floor((ageHours || 0) / 12), 20),
      reason: status?.cache?.inSync === true ? 'warm cache matches primary snapshot' : 'warm cache can repopulate primary snapshot',
    });
  }

  const ranked = candidates
    .filter((entry) => includeStale || !entry.stale)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, normalizedLimit);

  return {
    generatedAt: new Date().toISOString(),
    scope: { label: label || null, limit: normalizedLimit },
    summary: {
      issueCount: integrity.summary.issueCount,
      journalAligned: status?.primaryIntegrity?.journalAligned !== false,
      backupCount: backups.length,
      restorableMutationCount: restorableMutations.length,
      warmCacheRecoverable: Boolean(status?.primaryIntegrity?.recoverableFromWarmCache),
      recommendedSource: ranked[0]?.source || null,
      recommendedReason: ranked[0]?.reason || null,
      freshness,
      includeStale,
    },
    status,
    integrity,
    freshness,
    drift: buildStorageDriftReport(),
    candidates: ranked,
  };
}

function restoreStorageSmart({ label = null, backupPath = null, mutationId = null, prefer = 'auto', actorName = null, actorRole = null } = {}) {
  const normalizedPrefer = String(prefer || 'auto').trim().toLowerCase();
  const plan = buildStorageRecoveryPlan({ label, limit: 25 });
  let candidate = null;

  if (backupPath) {
    candidate = { source: 'backup', path: backupPath, id: backupPath, reason: 'explicit backup path' };
  } else if (Number.isInteger(Number(mutationId)) && Number(mutationId) > 0) {
    candidate = { source: 'mutation', mutationId: Number(mutationId), id: Number(mutationId), reason: 'explicit mutation id' };
  } else {
    const allowed = normalizedPrefer === 'auto' ? null : new Set([normalizedPrefer]);
    candidate = plan.candidates.find((entry) => !allowed || allowed.has(entry.source)) || null;
  }

  if (!candidate) {
    const error = new Error(label ? `No recovery candidate found for label: ${label}` : 'No recovery candidate available');
    error.statusCode = 404;
    throw error;
  }

  let result;
  if (candidate.source === 'backup') {
    result = restoreStorageBackup(candidate.path || candidate.id, { actorName, actorRole });
  } else if (candidate.source === 'mutation') {
    result = restoreStorageMutation(candidate.mutationId || candidate.id, { actorName, actorRole });
  } else if (candidate.source === 'warm-cache') {
    result = recoverStoragePrimaryFromWarmCache({ actorName, actorRole });
  } else {
    const error = new Error(`Unsupported recovery candidate source: ${candidate.source}`);
    error.statusCode = 400;
    throw error;
  }

  const output = {
    restoredAt: new Date().toISOString(),
    strategy: normalizedPrefer,
    selectedCandidate: candidate,
    plan,
    result,
  };

  recordStorageOperation('restore-smart', output, {
    actorName,
    actorRole,
    backupPath: candidate.path || result.restoredFrom || null,
    summary: {
      source: candidate.source,
      strategy: normalizedPrefer,
      issueCount: plan.summary.issueCount,
      journalAligned: plan.summary.journalAligned,
    },
    metadata: {
      candidate,
      planSummary: plan.summary,
    },
  });

  return output;
}


function repairStorageDrift({ actorName = null, actorRole = null } = {}) {
  const data = require('./data');
  const before = buildStorageDriftReport();
  const actions = [];

  if (before.status?.kind !== 'postgres') {
    return {
      repairedAt: new Date().toISOString(),
      mode: before.status?.kind || getDbMode(),
      actions,
      before,
      after: before,
    };
  }

  if (before.status?.cache?.inSync === false && typeof data.storage?.reconcileCache === 'function') {
    const reconciled = data.storage.reconcileCache() || {};
    actions.push({ action: 'reconcile-cache', reconciled: Boolean(reconciled.reconciled) });
  }

  if (before.status?.primaryIntegrity?.journalAligned === false && typeof data.storage?.repairPrimaryFromLatestSnapshot === 'function') {
    const repaired = data.storage.repairPrimaryFromLatestSnapshot() || {};
    actions.push({ action: 'repair-primary-from-latest-snapshot', repaired: Boolean(repaired.repaired), source: repaired.source || null });
  }

  const after = buildStorageDriftReport();
  const result = {
    repairedAt: new Date().toISOString(),
    mode: before.status?.kind || getDbMode(),
    actions,
    before,
    after,
  };

  recordStorageOperation('repair-drift', result, {
    actorName,
    actorRole,
    summary: {
      hadDrift: before.summary.hasDrift,
      hasDrift: after.summary.hasDrift,
      actionCount: actions.length,
    },
  });

  return result;
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
  listLessonAssets,
  createLessonAsset,
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
  listCurriculumNodeChildren,
  reorderCurriculumNodes,
  listLessonSessions,
  findLessonSessionBySessionId,
  upsertLessonSession,
  listSessionEventLog,
  createSessionEventLog,
  findSyncEventByClientId,
  createSyncEvent,
  listSessionRepairs,
  findSessionRepairById,
  createSessionRepair,
  listStorageOperations,
  findStorageOperationById,
  createStorageOperation,
  rebuildLessonSessionFromEventLog,
  listRewardTransactions,
  findRewardTransactionById,
  listRewardAdjustments,
  createRewardTransaction,
  createRewardAdjustment,
  listRewardRedemptionRequests,
  findRewardRedemptionRequestById,
  createRewardRedemptionRequest,
  updateRewardRedemptionRequest,
  listProgressionOverrides,
  findProgressionOverrideById,
  createProgressionOverride,
  updateProgressionOverride,
  getStoreMeta,
  getStorageStatus,
  checkpointStorage,
  listStorageBackups,
  getStorageMutationDetail,
  restoreStorageMutation,
  deleteStorageBackup,
  getStorageIntegrityReport,
  repairStorageIntegrity,
  exportStorageSnapshot,
  previewStorageImport,
  importStorageSnapshot,
  reloadStorageSnapshot,
  restoreStorageBackup,
  buildStorageRecoveryPlan,
  restoreStorageSmart,
  reconcileStorageCache,
  recoverStoragePrimaryFromWarmCache,
  buildStorageFreshnessSignals,
  buildStorageDriftReport,
  repairStorageDrift,
};