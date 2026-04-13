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


test('buildOperationsReport returns combined runtime, progression, rewards, and integrity signals', () => {
  const report = reporting.buildOperationsReport({ limit: 5 });

  assert.equal(report.summary.learnersInScope > 0, true);
  assert.equal(typeof report.summary.runtimeCompletionRate, 'number');
  assert.equal(typeof report.summary.integrityIssueCount, 'number');
  assert.equal(typeof report.summary.rewardPendingRequests, 'number');
  assert.equal(typeof report.summary.rewardFulfillmentRate, 'number');
  assert.ok(Array.isArray(report.hotlist.watchLearners));
  assert.ok(Array.isArray(report.hotlist.readyLearners));
  assert.ok(Array.isArray(report.recent.sessions));
  assert.ok(Array.isArray(report.recent.integrityIssues));
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
  assert.deepEqual(after.collectionCounts, before.collectionCounts);
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
