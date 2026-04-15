const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-test-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';

const reporting = require('../src/reporting');
const store = require('../src/store');

test('buildRewardsReport returns reward ops summary and scoped details', () => {
  const report = reporting.buildRewardsReport({ limit: 5 });

  assert.equal(report.scope.learnerCount > 0, true);
  assert.equal(report.summary.transactionCount >= 1, true);
  assert.equal(typeof report.summary.averageOpenRequestAgeDays, 'number');
  assert.equal(typeof report.summary.staleOpenRequestCount, 'number');
  assert.ok(report.queueHealth);
  assert.ok(Array.isArray(report.dailyXpTrend));
  assert.ok(Array.isArray(report.learnerBreakdown));
  assert.ok(Array.isArray(report.leaderboard));
});


test('buildOperationsReport returns combined runtime, progression, rewards, integrity, and storage signals', () => {
  const report = reporting.buildOperationsReport({ limit: 5 });

  assert.equal(report.summary.learnersInScope > 0, true);
  assert.equal(typeof report.summary.runtimeCompletionRate, 'number');
  assert.equal(typeof report.summary.integrityIssueCount, 'number');
  assert.equal(typeof report.summary.rewardPendingRequests, 'number');
  assert.equal(typeof report.summary.rewardFulfillmentRate, 'number');
  assert.equal(typeof report.summary.activeProgressionOverrides, 'number');
  assert.equal(typeof report.summary.sessionRepairs, 'number');
  assert.equal(typeof report.summary.storageOperations, 'number');
  assert.ok(Array.isArray(report.hotlist.watchLearners));
  assert.ok(Array.isArray(report.hotlist.readyLearners));
  assert.ok(Array.isArray(report.recent.sessions));
  assert.ok(Array.isArray(report.recent.sessionRepairs));
  assert.ok(report.adminControls);
  assert.ok(report.storage);
  assert.equal(report.storage.summary.mode, 'file');
  assert.equal(typeof report.storage.summary.recordCount, 'number');
});

test('buildStorageReport summarizes persistence mode, collections, integrity, and backups', () => {
  const report = reporting.buildStorageReport({ limit: 5 });

  assert.equal(report.summary.mode, 'file');
  assert.equal(report.summary.persistent, true);
  assert.equal(typeof report.summary.recordCount, 'number');
  assert.equal(typeof report.summary.integrityIssueCount, 'number');
  assert.ok(report.status);
  assert.ok(report.collections.students >= 1);
  assert.ok(Array.isArray(report.backups));
  assert.ok(report.operations);
  assert.ok(report.recovery);
  assert.equal(typeof report.summary.storageOperationCount, 'number');
  assert.equal(typeof report.summary.recoveryCandidateCount, 'number');
});

test('storage operations report groups recent admin persistence actions', () => {
  const created = store.checkpointStorage('reporting-storage-op', { actorName: 'Ops Admin', actorRole: 'admin' });
  store.reloadStorageSnapshot({ actorName: 'Ops Admin', actorRole: 'admin' });

  const report = reporting.buildStorageOperationsReport({ limit: 10 });

  assert.equal(report.summary.totalOperations >= 2, true);
  assert.ok(report.kinds.some((entry) => entry.kind === 'checkpoint'));
  assert.ok(report.actors.some((entry) => entry.actorName === 'Ops Admin'));
  assert.ok(report.recent.some((entry) => entry.backupPath === created.backupPath));
});

test('buildProgressionOverrideDetail exposes learner, progress, and reapply preview', () => {
  const student = store.listStudents()[0];
  const progress = store.listProgress()[0] || store.createProgress({
    studentId: student.id,
    subjectId: 'english',
    moduleId: 'module-1',
    mastery: 0.51,
    lessonsCompleted: 1,
    progressionStatus: 'watch',
    recommendedNextModuleId: 'module-2',
  });

  const audit = store.createProgressionOverride({
    studentId: progress.studentId,
    progressId: progress.id,
    action: 'override',
    previousStatus: progress.progressionStatus,
    nextStatus: 'ready',
    previousRecommendedNextModuleId: progress.recommendedNextModuleId,
    nextRecommendedNextModuleId: progress.recommendedNextModuleId,
    reason: 'qa_review',
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });

  const detail = reporting.buildProgressionOverrideDetail(audit.id);

  assert.equal(detail.override.id, audit.id);
  assert.equal(detail.learner.id, progress.studentId);
  assert.equal(detail.currentProgress.id, progress.id);
  assert.equal(detail.diff.statusChanged, true);
  assert.equal(detail.reapplyPreview.progressionStatus, 'ready');
  assert.equal(detail.revertPreview.progressionStatus, progress.progressionStatus);
});

test('buildAdminControlsReport summarizes progression overrides and session repair actions', () => {
  const student = store.listStudents()[0];
  const progress = store.listProgress()[0] || store.createProgress({
    studentId: student.id,
    subjectId: 'english',
    moduleId: 'module-1',
    mastery: 0.62,
    lessonsCompleted: 2,
    progressionStatus: 'watch',
    recommendedNextModuleId: 'module-2',
  });

  store.createProgressionOverride({
    studentId: progress.studentId,
    progressId: progress.id,
    action: 'override',
    previousStatus: progress.progressionStatus,
    nextStatus: 'ready',
    previousRecommendedNextModuleId: progress.recommendedNextModuleId,
    nextRecommendedNextModuleId: progress.recommendedNextModuleId,
    reason: 'admin_push',
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });

  store.createSessionRepair({
    sessionId: 'session-reporting-test',
    learnerId: progress.studentId,
    actorName: 'Ops Admin',
    actorRole: 'admin',
    reason: 'resume_fix',
    patch: { action: 'reopen' },
    before: { status: 'abandoned' },
    after: { status: 'in_progress' },
  });
  store.createSessionRepair({
    sessionId: 'session-reporting-test',
    learnerId: progress.studentId,
    actorName: 'Ops Admin',
    actorRole: 'admin',
    reason: 'qa_rollback',
    patch: { action: 'revert-repair' },
    before: { status: 'completed' },
    after: { status: 'in_progress' },
  });

  const report = reporting.buildAdminControlsReport({ learnerId: progress.studentId, limit: 5 });

  assert.equal(report.summary.learnersInScope, 1);
  assert.equal(report.summary.progressionOverrides >= 1, true);
  assert.equal(report.summary.sessionRepairs >= 2, true);
  assert.equal(report.summary.reopenRepairs >= 1, true);
  assert.equal(report.summary.revertedRepairs >= 1, true);
  assert.ok(report.overrideReasons.some((entry) => entry.reason === 'admin_push'));
  assert.ok(report.repairReasons.some((entry) => entry.reason === 'resume_fix'));
  assert.ok(report.actors.some((entry) => entry.actorName === 'Ops Admin'));
  assert.ok(Array.isArray(report.recent.overrides));
  assert.ok(Array.isArray(report.recent.sessionRepairs));
});

test('storage snapshot export exposes persisted data and db metadata', () => {
  const snapshot = store.exportStorageSnapshot();
  const status = store.getStorageStatus();

  assert.equal(snapshot.mode, 'file');
  assert.ok(snapshot.snapshot.students);
  assert.equal(status.db.mode, 'file');
  assert.equal(status.db.persistent, true);
});

test('storage integrity repair dry-run reports without mutating data', () => {
  const before = store.listRewardRedemptionRequests().length;
  const result = store.repairStorageIntegrity({ apply: false });
  const after = store.listRewardRedemptionRequests().length;

  assert.equal(result.apply, false);
  assert.equal(before, after);
  assert.ok(result.report.summary);
});

test('storage integrity repair prunes orphaned non-reward records when applied', () => {
  const data = require('../src/data');

  data.assignments.push({
    id: 'assignment-orphan-1',
    cohortId: 'missing-cohort',
    lessonId: 'missing-lesson',
    assignedBy: 'missing-teacher',
    dueDate: '2026-04-20T00:00:00.000Z',
    status: 'active',
  });
  data.attendance.push({
    id: 'attendance-orphan-1',
    studentId: 'missing-student',
    date: '2026-04-13',
    status: 'present',
  });
  data.progress.push({
    id: 'progress-orphan-1',
    studentId: 'missing-student',
    subjectId: 'missing-subject',
    moduleId: 'missing-module',
    mastery: 0.2,
    lessonsCompleted: 1,
    progressionStatus: 'watch',
    recommendedNextModuleId: 'missing-module',
    lastActiveAt: '2026-04-13T10:00:00.000Z',
  });
  data.observations.push({
    id: 'obs-orphan-1',
    studentId: 'missing-student',
    teacherId: 'missing-teacher',
    note: 'orphan',
    createdAt: '2026-04-13T10:00:00.000Z',
  });
  data.syncEvents.push({
    id: 'sync-orphan-1',
    clientId: 'sync-orphan-1',
    learnerId: 'missing-student',
    type: 'lesson_completed',
    receivedAt: '2026-04-13T10:00:00.000Z',
    appliedAt: '2026-04-13T10:00:00.000Z',
  });
  data.sessionEventLog.push({
    id: 'runtime-event-orphan-1',
    sessionId: 'missing-session',
    studentId: 'missing-student',
    type: 'session_repaired',
    createdAt: '2026-04-13T10:00:00.000Z',
  });
  data.persist();

  const result = store.repairStorageIntegrity({ apply: true, actorName: 'Ops Admin', actorRole: 'admin' });

  assert.equal(result.apply, true);
  assert.equal(result.issueCount >= 6, true);
  assert.equal(store.listAssignments().some((entry) => entry.id === 'assignment-orphan-1'), false);
  assert.equal(store.listAttendance().some((entry) => entry.id === 'attendance-orphan-1'), false);
  assert.equal(store.listProgress().some((entry) => entry.id === 'progress-orphan-1'), false);
  assert.equal(store.listObservations().some((entry) => entry.id === 'obs-orphan-1'), false);
  assert.equal(store.listSyncEvents().some((entry) => entry.id === 'sync-orphan-1'), false);
  assert.equal(store.listSessionEventLog().some((entry) => entry.id === 'runtime-event-orphan-1'), false);
  assert.ok(result.fixes.some((entry) => entry.collection === 'assignments'));
  assert.ok(result.fixes.some((entry) => entry.collection === 'sessionEventLog'));
  assert.equal(result.report.summary.issueCount, 0);
});

test('storage import preview reports projected collection changes without mutating data', () => {
  const before = store.exportStorageSnapshot();
  const preview = store.previewStorageImport({
    merge: true,
    snapshot: {
      students: [{ id: 'student-preview', cohortId: 'cohort-1', podId: 'pod-1', mallamId: 'teacher-1', name: 'Preview Learner', age: 9 }],
      rewardRedemptionRequests: [{ id: 'reward-request-preview', studentId: 'student-1', rewardItemId: 'story-time', xpCost: 30, status: 'pending' }],
    },
  });
  const after = store.exportStorageSnapshot();

  assert.equal(preview.changes.students.delta, 1);
  assert.equal(preview.changes.rewardRedemptionRequests.delta, 1);
  assert.equal(preview.analysis.summary.safeToImport, true);
  assert.equal(preview.analysis.summary.trust, 'clean');
  assert.deepEqual(after.collectionCounts, before.collectionCounts);
});

test('storage import preview surfaces critical collisions and import blocks unless forced', () => {
  const baseline = store.exportStorageSnapshot();
  const conflictingSnapshot = {
    students: [
      { id: 'student-1', cohortId: 'cohort-1', podId: 'pod-1', mallamId: 'teacher-1', name: 'Collision Learner', age: 9 },
    ],
    rewardRedemptionRequests: [
      { id: 'reward-request-bad-ref', studentId: 'missing-student', rewardItemId: 'story-time', xpCost: 30, status: 'pending' },
    ],
  };

  const preview = store.previewStorageImport({ snapshot: conflictingSnapshot, merge: true });
  assert.equal(preview.analysis.summary.safeToImport, false);
  assert.equal(preview.analysis.summary.trust, 'blocked');
  assert.ok(preview.analysis.issues.some((issue) => issue.code === 'merge-id-collision' && issue.collection === 'students'));
  assert.ok(preview.analysis.issues.some((issue) => issue.code === 'reward-request-missing-student'));

  assert.throws(
    () => store.importStorageSnapshot({ snapshot: conflictingSnapshot, merge: true, actorName: 'Ops Admin', actorRole: 'admin' }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.ok(error.details);
      assert.equal(error.details.summary.safeToImport, false);
      return true;
    },
  );

  const forced = store.importStorageSnapshot({
    snapshot: conflictingSnapshot,
    merge: false,
    force: true,
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });
  assert.equal(forced.force, true);
  assert.equal(forced.preview.summary.safeToImport, false);
  assert.equal(forced.preview.summary.trust, 'blocked');

  store.importStorageSnapshot({
    snapshot: baseline.snapshot,
    merge: false,
    force: true,
    createCheckpoint: false,
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });
});


test('storage integrity detects postgres warm-cache drift and repair reconciles it', () => {
  const data = require('../src/data');
  const originalStorage = data.storage;
  let reconciled = false;

  data.storage = {
    kind: 'postgres',
    getStatus() {
      return {
        kind: 'postgres',
        file: '/tmp/lumo-cache.json',
        db: { mode: 'postgres', persistent: true, hasDatabaseUrl: true, driver: 'pg-jsonb-snapshot+journal' },
        cache: {
          exists: true,
          inSync: reconciled,
          snapshotHash: 'db-hash',
          cacheHash: reconciled ? 'db-hash' : 'cache-hash',
        },
      };
    },
    reconcileCache() {
      reconciled = true;
      return {
        reconciled: true,
        cache: {
          exists: true,
          inSync: true,
          snapshotHash: 'db-hash',
          cacheHash: 'db-hash',
        },
      };
    },
  };

  try {
    const before = store.getStorageIntegrityReport();
    assert.equal(before.summary.cacheInSync, false);
    assert.ok(before.issues.some((issue) => issue.type === 'storage-cache-out-of-sync'));

    const repaired = store.repairStorageIntegrity({ apply: true, actorName: 'Ops Admin', actorRole: 'admin' });
    assert.equal(repaired.apply, true);
    assert.ok(repaired.fixes.some((entry) => entry.collection === 'storageCache' && entry.reconciled === true));
    assert.equal(repaired.report.summary.cacheInSync, true);
    assert.equal(repaired.report.issues.some((issue) => issue.type === 'storage-cache-out-of-sync'), false);
  } finally {
    data.storage = originalStorage;
  }
});


test('storage checkpoints can be listed and deleted in file mode', () => {
  const created = store.checkpointStorage('unit-test-backup');
  assert.ok(created.backupPath);
  assert.ok(created.status);

  const backups = store.listStorageBackups(20);
  assert.ok(backups.some((entry) => entry.path === created.backupPath));

  const deleted = store.deleteStorageBackup(created.backupPath);
  assert.equal(deleted.deleted, created.backupPath);
  assert.ok(deleted.status);

  const after = store.listStorageBackups(20);
  assert.equal(after.some((entry) => entry.path === created.backupPath), false);
});

test('storage recovery plan ranks backup candidates and supports smart restore in file mode', () => {
  const created = store.checkpointStorage('smart-restore-test', { actorName: 'Ops Admin', actorRole: 'admin' });
  const plan = store.buildStorageRecoveryPlan({ label: 'smart-restore-test', limit: 5 });

  assert.equal(plan.summary.recommendedSource, 'backup');
  assert.ok(plan.candidates.some((entry) => entry.source === 'backup' && entry.path === created.backupPath));

  const restored = store.restoreStorageSmart({
    label: 'smart-restore-test',
    prefer: 'backup',
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });

  assert.equal(restored.selectedCandidate.source, 'backup');
  assert.equal(restored.result.restoredFrom, created.backupPath);
});


test('reward fulfillment report exposes backlog and queue analytics', () => {
  const rewards = require('../src/rewards');
  const student = store.listStudents()[0];
  rewards.awardManualReward({ studentId: student.id, xpDelta: 40, label: 'Test top-up' });
  const created = rewards.createRewardRedemptionRequest({
    studentId: student.id,
    rewardItemId: 'story-time',
    learnerNote: 'Please',
    requestedBy: student.id,
    requestedVia: 'test',
    clientRequestId: `test-request-${Date.now()}`,
  });

  const report = rewards.buildRewardFulfillmentReport({ limit: 5 });
  const detail = rewards.buildRewardRequestDetail(created.request.id);

  assert.equal(report.summary.requestCount >= 1, true);
  assert.equal(typeof report.summary.backlog.fresh, 'number');
  assert.ok(Array.isArray(report.queueByItem));
  assert.equal(detail.request.id, created.request.id);
  assert.equal(typeof detail.affordability.affordableNow, 'boolean');
});

test('reward request lifecycle supports reopen and requeue repair controls', () => {
  const rewards = require('../src/rewards');
  const student = store.listStudents()[0];
  rewards.awardManualReward({ studentId: student.id, xpDelta: 50, label: 'Lifecycle top-up' });
  const requestId = rewards.createRewardRedemptionRequest({
    studentId: student.id,
    rewardItemId: 'helper-star',
    learnerNote: 'I want this next',
    requestedBy: student.id,
    requestedVia: 'test',
    clientRequestId: `repair-request-${Date.now()}`,
  }).request.id;

  const approved = rewards.approveRewardRedemptionRequest(requestId, { actorName: 'Admin', actorRole: 'admin' });
  assert.equal(approved.request.status, 'approved');

  const requeued = rewards.requeueRewardRedemptionRequest(requestId, { actorName: 'Admin', actorRole: 'admin', reason: 'stock_check' });
  assert.equal(requeued.request.status, 'pending');

  const rejected = rewards.rejectRewardRedemptionRequest(requestId, { actorName: 'Admin', actorRole: 'admin', reason: 'not_now' });
  assert.equal(rejected.request.status, 'rejected');

  const reopened = rewards.reopenRewardRedemptionRequest(requestId, { actorName: 'Admin', actorRole: 'admin', reason: 'learner_confirmed' });
  assert.equal(reopened.request.status, 'pending');
});

test('reward queue analytics and stale expiry controls surface aged requests', () => {
  const rewards = require('../src/rewards');
  const student = store.listStudents()[1];
  rewards.awardManualReward({ studentId: student.id, xpDelta: 80, label: 'Queue analytics top-up' });

  const stalePending = store.createRewardRedemptionRequest({
    studentId: student.id,
    rewardItemId: 'story-time',
    rewardTitle: 'Story Time Pick',
    xpCost: 30,
    status: 'pending',
    requestedBy: student.id,
    requestedVia: 'test',
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-01T09:00:00.000Z',
  });
  const staleApproved = store.createRewardRedemptionRequest({
    studentId: student.id,
    rewardItemId: 'helper-star',
    rewardTitle: 'Helper Star',
    xpCost: 45,
    status: 'approved',
    requestedBy: student.id,
    requestedVia: 'test',
    approvedAt: '2026-03-03T09:00:00.000Z',
    approvedBy: 'Admin',
    createdAt: '2026-03-02T09:00:00.000Z',
    updatedAt: '2026-03-03T09:00:00.000Z',
  });

  const queue = rewards.buildRewardRedemptionQueue({ limit: 10 });
  assert.equal(queue.summary.open >= 2, true);
  assert.equal(queue.summary.staleOpen >= 2, true);
  assert.equal(typeof queue.items[0].ageDays, 'number');
  assert.equal(typeof queue.items[0].lifecycle.fulfillmentHours, 'object');

  const report = reporting.buildRewardsReport({ limit: 10 });
  assert.equal(report.summary.requestStatusCounts.approved >= 1, true);
  assert.equal(report.summary.staleOpenRequestCount >= 2, true);
  assert.equal(report.queueHealth.staleOpen >= 2, true);

  const expired = rewards.expireStaleRewardRedemptionRequests({ olderThanDays: 14, actorName: 'Admin', actorRole: 'admin' });
  assert.equal(expired.count >= 2, true);
  assert.equal(store.findRewardRedemptionRequestById(stalePending.id).status, 'expired');
  assert.equal(store.findRewardRedemptionRequestById(staleApproved.id).status, 'expired');
});

test('reward integrity report and repair controls detect and fix mismatched fulfillment state', () => {
  const rewards = require('../src/rewards');
  const student = store.listStudents()[2];
  rewards.awardManualReward({ studentId: student.id, xpDelta: 120, label: 'Integrity top-up' });

  const dangling = store.createRewardRedemptionRequest({
    studentId: student.id,
    rewardItemId: 'story-time',
    rewardTitle: 'Story Time Pick',
    xpCost: 30,
    status: 'fulfilled',
    transactionId: null,
    requestedBy: student.id,
    requestedVia: 'test',
    fulfilledAt: '2026-04-01T09:00:00.000Z',
    fulfilledBy: 'Admin',
  });

  const recoverable = store.createRewardRedemptionRequest({
    studentId: student.id,
    rewardItemId: 'helper-star',
    rewardTitle: 'Helper Star',
    xpCost: 45,
    status: 'approved',
    requestedBy: student.id,
    requestedVia: 'test',
    approvedAt: '2026-04-01T10:00:00.000Z',
    approvedBy: 'Admin',
  });

  const redemptionTx = store.createRewardTransaction({
    studentId: student.id,
    kind: 'redemption',
    xpDelta: -45,
    label: 'Recovered helper-star redemption',
    metadata: {
      rewardItemId: 'helper-star',
      rewardRequestId: recoverable.id,
      fulfilledBy: 'Admin',
    },
    createdAt: '2026-04-01T11:00:00.000Z',
  });

  const before = rewards.buildRewardRequestIntegrityReport({ learnerId: student.id, limit: 20 });
  assert.equal(before.summary.issueCount >= 2, true);
  assert.equal(before.summary.issuesByType['fulfilled-request-missing-transaction'] >= 1, true);
  assert.equal(before.summary.issuesByType['nonfulfilled-request-has-redemption'] >= 1, true);

  const repaired = rewards.repairRewardRequestIntegrity({ learnerId: student.id, apply: true, actorName: 'Admin', actorRole: 'admin', limit: 20 });
  assert.equal(repaired.count >= 2, true);

  const repairedDangling = store.findRewardRedemptionRequestById(dangling.id);
  const repairedRecoverable = store.findRewardRedemptionRequestById(recoverable.id);
  assert.equal(repairedDangling.status, 'approved');
  assert.equal(repairedDangling.transactionId, null);
  assert.equal(repairedRecoverable.status, 'fulfilled');
  assert.equal(repairedRecoverable.transactionId, redemptionTx.id);

  const afterReport = reporting.buildRewardsReport({ learnerId: student.id, limit: 20 });
  assert.equal(typeof afterReport.summary.rewardIntegrityIssueCount, 'number');
  assert.ok(afterReport.integrity);
});


test('storage freshness and drift reporting surface stale postgres durability signals', () => {
  const data = require('../src/data');
  const originalStorage = data.storage;

  data.storage = {
    kind: 'postgres',
    getStatus() {
      return {
        kind: 'postgres',
        file: '/tmp/lumo-cache.json',
        updatedAt: '2026-04-10T00:00:00.000Z',
        cache: {
          exists: true,
          inSync: false,
          updatedAt: '2026-04-10T00:00:00.000Z',
          snapshotHash: 'db-hash',
          cacheHash: 'cache-hash',
        },
        journal: {
          total: 7,
          latestAt: '2026-04-10T00:00:00.000Z',
          latestMutationId: 7,
          latestMutationRestorable: true,
          latestMutationHash: 'cache-hash',
        },
        primaryIntegrity: {
          snapshotHash: 'db-hash',
          journalAligned: false,
          recoverableFromWarmCache: true,
        },
        db: { mode: 'postgres', persistent: true, hasDatabaseUrl: true, driver: 'pg-jsonb-snapshot+journal' },
      };
    },
  };

  try {
    const freshness = store.buildStorageFreshnessSignals();
    const drift = store.buildStorageDriftReport();
    const report = reporting.buildStorageReport({ limit: 5 });

    assert.equal(freshness.primary.severity, 'critical');
    assert.equal(drift.summary.hasDrift, true);
    assert.equal(drift.summary.severity, 'critical');
    assert.ok(drift.summary.reasons.some((entry) => entry.type === 'journal-drift'));
    assert.equal(report.summary.driftDetected, true);
    assert.equal(report.summary.driftSeverity, 'critical');
    assert.equal(report.summary.freshnessSeverity, 'critical');
    assert.ok(report.drift);
    assert.ok(report.freshness);
  } finally {
    data.storage = originalStorage;
  }
});
