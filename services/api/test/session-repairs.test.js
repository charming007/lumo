const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-session-repairs-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';

const store = require('../src/store');
const reporting = require('../src/reporting');
const { startServer } = require('../src/main');

let server;
let baseUrl;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const body = await response.json();
  return { status: response.status, body };
}

test.before(async () => {
  server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('session repair detail report includes learner context and revert preview', () => {
  const student = store.listStudents()[0];
  const module = store.listModules()[0];
  const session = store.upsertLessonSession({
    sessionId: 'detail-session-1',
    studentId: student.id,
    learnerCode: 'DET-001',
    moduleId: module.id,
    status: 'in_progress',
    completionState: 'inProgress',
    currentStepIndex: 1,
    stepsTotal: 5,
    supportActionsUsed: 1,
    responsesCaptured: 2,
    startedAt: '2026-04-13T10:00:00.000Z',
    lastActivityAt: '2026-04-13T10:00:00.000Z',
  });
  const before = { ...session };
  const patched = store.upsertLessonSession({
    ...session,
    status: 'abandoned',
    completionState: 'abandoned',
    supportActionsUsed: Number(session.supportActionsUsed || 0) + 2,
    lastEventType: 'session_abandoned',
    lastActivityAt: '2026-04-13T10:15:00.000Z',
  });

  const repair = store.createSessionRepair({
    sessionId: session.sessionId,
    learnerId: session.studentId,
    actorName: 'Ops Admin',
    actorRole: 'admin',
    reason: 'manual_abandon',
    patch: { action: 'abandon' },
    before,
    after: patched,
  });

  const detail = reporting.buildSessionRepairDetail(repair.id);

  assert.equal(detail.repair.id, repair.id);
  assert.equal(detail.learner.id, session.studentId);
  assert.equal(detail.currentSession.sessionId, session.sessionId);
  assert.equal(detail.diff.statusChanged, true);
  assert.equal(detail.diff.supportActionsDelta, 2);
  assert.equal(detail.revertPreview.status, before.status);
});

test('progression override endpoints expose detail, revoke, and reapply control', async () => {
  const student = store.listStudents()[0];
  const progress = store.createProgress({
    studentId: student.id,
    subjectId: 'english',
    moduleId: 'module-1',
    mastery: 0.62,
    lessonsCompleted: 2,
    progressionStatus: 'watch',
    recommendedNextModuleId: 'module-2',
  });

  const overridden = store.updateProgress(progress.id, {
    progressionStatus: 'ready',
    recommendedNextModuleId: 'module-3',
  });
  const audit = store.createProgressionOverride({
    studentId: progress.studentId,
    progressId: progress.id,
    action: 'override',
    previousStatus: 'watch',
    nextStatus: overridden.progressionStatus,
    previousRecommendedNextModuleId: 'module-2',
    nextRecommendedNextModuleId: overridden.recommendedNextModuleId,
    reason: 'manual_push',
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });

  const detailResponse = await request(`/api/v1/progression-overrides/${audit.id}`);
  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.override.id, audit.id);
  assert.equal(detailResponse.body.revertPreview.progressionStatus, 'watch');

  const revokeResponse = await request(`/api/v1/progression-overrides/${audit.id}/revoke`, {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ reason: 'qa_rollback' }),
  });

  assert.equal(revokeResponse.status, 200);
  assert.equal(revokeResponse.body.action, 'revoked');
  assert.equal(revokeResponse.body.progress.progressionStatus, 'watch');

  const reapplyResponse = await request(`/api/v1/progression-overrides/${audit.id}/reapply`, {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ reason: 'qa_restore' }),
  });

  assert.equal(reapplyResponse.status, 200);
  assert.equal(reapplyResponse.body.action, 'override');
  assert.equal(reapplyResponse.body.progress.progressionStatus, 'ready');
  assert.equal(reapplyResponse.body.revokedAt, null);

  const current = store.findProgressById(progress.id);
  assert.equal(current.progressionStatus, 'ready');
  assert.equal(current.recommendedNextModuleId, 'module-3');
});

test('session repair endpoints expose detail, admin report, and revert control', async () => {
  const student = store.listStudents()[1];
  const module = store.listModules()[1];
  const session = store.upsertLessonSession({
    sessionId: 'revert-session-1',
    studentId: student.id,
    learnerCode: 'REV-001',
    moduleId: module.id,
    status: 'in_progress',
    completionState: 'inProgress',
    currentStepIndex: 2,
    stepsTotal: 4,
    responsesCaptured: 3,
    supportActionsUsed: 1,
    startedAt: '2026-04-13T11:00:00.000Z',
    lastActivityAt: '2026-04-13T11:00:00.000Z',
  });
  const before = { ...session };
  const repairedSession = store.upsertLessonSession({
    ...session,
    status: 'completed',
    completionState: 'completed',
    currentStepIndex: Number(session.stepsTotal || 0),
    completedAt: '2026-04-13T12:00:00.000Z',
    lastEventType: 'session_repaired',
    lastActivityAt: '2026-04-13T12:00:00.000Z',
  });
  const repair = store.createSessionRepair({
    sessionId: session.sessionId,
    learnerId: session.studentId,
    actorName: 'Teacher One',
    actorRole: 'teacher',
    reason: 'manual_repair',
    patch: { status: 'completed' },
    before,
    after: repairedSession,
  });

  const detailResponse = await request(`/api/v1/session-repairs/${repair.id}`);
  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.repair.id, repair.id);
  assert.equal(detailResponse.body.revertPreview.status, before.status);

  const reportResponse = await request('/api/v1/reports/admin-controls?limit=5');
  assert.equal(reportResponse.status, 200);
  assert.equal(reportResponse.body.summary.sessionRepairs >= 1, true);
  assert.ok(Array.isArray(reportResponse.body.repairActions));

  const revertResponse = await request(`/api/v1/session-repairs/${repair.id}/revert`, {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ reason: 'qa_rollback' }),
  });

  assert.equal(revertResponse.status, 201);
  assert.equal(revertResponse.body.revertedFrom, repair.id);
  assert.equal(revertResponse.body.session.status, before.status);
  assert.equal(revertResponse.body.repair.patch.action, 'revert-repair');

  const reverted = store.findLessonSessionBySessionId(session.sessionId);
  assert.equal(reverted.status, before.status);

  const revertEvent = store.listSessionEventLog().find((entry) => entry.type === 'session_repair_reverted' && entry.sessionId === session.sessionId);
  assert.ok(revertEvent);
});

test('admin storage report endpoint and x-lumo-actor alias expose persisted control metadata', async () => {
  const student = store.listStudents()[0];
  const module = store.listModules()[0];

  store.upsertLessonSession({
    sessionId: 'alias-session-1',
    studentId: student.id,
    learnerCode: 'ALIAS-001',
    moduleId: module.id,
    status: 'abandoned',
    completionState: 'abandoned',
    currentStepIndex: 1,
    stepsTotal: 4,
    responsesCaptured: 1,
    supportActionsUsed: 0,
    startedAt: '2026-04-13T14:00:00.000Z',
    lastActivityAt: '2026-04-13T14:05:00.000Z',
  });

  const reopenResponse = await request('/api/v1/learner-app/sessions/alias-session-1/reopen', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Alias Admin',
    },
    body: JSON.stringify({ reason: 'alias_header_check' }),
  });

  assert.equal(reopenResponse.status, 201);
  assert.equal(reopenResponse.body.repair.actorName, 'Alias Admin');

  const checkpointResponse = await request('/api/v1/admin/storage/checkpoint', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Alias Admin',
    },
    body: JSON.stringify({ label: 'alias-checkpoint' }),
  });

  assert.equal(checkpointResponse.status, 201);
  assert.ok(checkpointResponse.body.backupPath);

  const operationsResponse = await request('/api/v1/admin/storage/operations?limit=5', {
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Alias Admin',
    },
  });

  assert.equal(operationsResponse.status, 200);
  assert.equal(operationsResponse.body.summary.totalOperations >= 1, true);
  assert.ok(operationsResponse.body.actors.some((entry) => entry.actorName === 'Alias Admin'));
  const operationId = operationsResponse.body.recent[0]?.id;
  assert.ok(operationId);

  const operationDetailResponse = await request(`/api/v1/admin/storage/operations/${operationId}`, {
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Alias Admin',
    },
  });

  assert.equal(operationDetailResponse.status, 200);
  assert.equal(operationDetailResponse.body.actorName, 'Alias Admin');

  const storageResponse = await request('/api/v1/reports/storage?limit=5', {
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Alias Admin',
    },
  });

  assert.equal(storageResponse.status, 200);
  assert.equal(storageResponse.body.summary.mode, 'file');
  assert.equal(typeof storageResponse.body.summary.recordCount, 'number');
  assert.equal(typeof storageResponse.body.summary.storageOperationCount, 'number');
  assert.ok(storageResponse.body.status);
  assert.ok(storageResponse.body.collections.students >= 1);
  assert.ok(storageResponse.body.operations);
});


test('admin can preview and apply session rebuild from event log', async () => {
  const student = store.listStudents()[0];
  const session = store.upsertLessonSession({
    sessionId: 'rebuild-session-1',
    studentId: student.id,
    learnerCode: 'REB-001',
    moduleId: 'module-1',
    lessonId: 'lesson-preview',
    status: 'completed',
    completionState: 'completed',
    currentStepIndex: 99,
    stepsTotal: 99,
    responsesCaptured: 99,
    supportActionsUsed: 99,
    startedAt: '2026-04-13T09:00:00.000Z',
    lastActivityAt: '2026-04-13T09:30:00.000Z',
  });

  store.createSessionEventLog({
    sessionId: session.sessionId,
    studentId: student.id,
    lessonId: 'lesson-1',
    moduleId: 'module-1',
    type: 'lesson_session_started',
    payload: { sessionId: session.sessionId, studentId: student.id, learnerCode: 'REB-001', lessonId: 'lesson-1', moduleId: 'module-1', stepIndex: 0, stepsTotal: 3, capturedAt: '2026-04-13T09:00:00.000Z' },
    createdAt: '2026-04-13T09:00:00.000Z',
  });
  store.createSessionEventLog({
    sessionId: session.sessionId,
    studentId: student.id,
    lessonId: 'lesson-1',
    moduleId: 'module-1',
    type: 'learner_response_captured',
    payload: { sessionId: session.sessionId, studentId: student.id, stepIndex: 1, stepsTotal: 3, capturedAt: '2026-04-13T09:05:00.000Z', review: 'onTrack' },
    createdAt: '2026-04-13T09:05:00.000Z',
  });
  store.createSessionEventLog({
    sessionId: session.sessionId,
    studentId: student.id,
    lessonId: 'lesson-1',
    moduleId: 'module-1',
    type: 'coach_support_used',
    payload: { sessionId: session.sessionId, studentId: student.id, stepIndex: 2, stepsTotal: 3, capturedAt: '2026-04-13T09:06:00.000Z' },
    createdAt: '2026-04-13T09:06:00.000Z',
  });
  store.createSessionEventLog({
    sessionId: session.sessionId,
    studentId: student.id,
    lessonId: 'lesson-1',
    moduleId: 'module-1',
    type: 'lesson_completed',
    payload: { sessionId: session.sessionId, studentId: student.id, learnerCode: 'REB-001', lessonId: 'lesson-1', moduleId: 'module-1', stepIndex: 3, stepsTotal: 3, completionState: 'completed', capturedAt: '2026-04-13T09:10:00.000Z', review: 'onTrack' },
    createdAt: '2026-04-13T09:10:00.000Z',
  });

  const preview = await request(`/api/v1/admin/sessions/${session.sessionId}/rebuild-from-events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ apply: false, reason: 'preview_rebuild' }),
  });

  assert.equal(preview.status, 200);
  assert.equal(preview.body.applied, false);
  assert.equal(preview.body.after.responsesCaptured, 1);
  assert.equal(preview.body.after.supportActionsUsed, 1);
  assert.equal(preview.body.after.currentStepIndex, 3);

  const applied = await request(`/api/v1/admin/sessions/${session.sessionId}/rebuild-from-events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ apply: true, reason: 'apply_rebuild' }),
  });

  assert.equal(applied.status, 201);
  assert.equal(applied.body.applied, true);
  assert.equal(applied.body.after.responsesCaptured, 1);
  assert.equal(applied.body.after.supportActionsUsed, 1);
  assert.equal(applied.body.repair.patch.action, 'rebuild-from-events');

  const rebuilt = store.findLessonSessionBySessionId(session.sessionId);
  assert.equal(rebuilt.responsesCaptured, 1);
  assert.equal(rebuilt.supportActionsUsed, 1);
  assert.equal(rebuilt.currentStepIndex, 3);
  assert.equal(rebuilt.stepsTotal, 3);
});


test('admin storage mutation endpoints expose journal detail and restore control', async () => {
  const data = require('../src/data');
  const originalStorage = data.storage;
  const originalReload = data.reload;
  let restoredMutationId = null;

  data.storage = {
    ...originalStorage,
    listMutations(limit = 20) {
      return [
        {
          id: 42,
          action: 'write',
          snapshotId: 'primary',
          snapshotHash: 'abc123',
          hasSnapshot: true,
          collectionCounts: { students: 4 },
          metadata: { source: 'test' },
          createdAt: '2026-04-14T12:00:00.000Z',
        },
      ].slice(0, limit);
    },
    getMutation(id) {
      if (Number(id) !== 42) return null;
      return {
        id: 42,
        action: 'write',
        snapshotId: 'primary',
        snapshotHash: 'abc123',
        hasSnapshot: true,
        collectionCounts: { students: 4 },
        metadata: { source: 'test' },
        createdAt: '2026-04-14T12:00:00.000Z',
        snapshot: { students: [{ id: 'student-1' }] },
      };
    },
    restoreFromMutation(id) {
      restoredMutationId = Number(id);
      return restoredMutationId;
    },
    getStatus() {
      const base = originalStorage.getStatus ? originalStorage.getStatus() : {};
      return {
        ...base,
        kind: 'postgres',
        db: { ...(base.db || {}), persistent: true, driver: 'pg-jsonb-snapshot+journal' },
        journal: { total: 1, latestAt: '2026-04-14T12:00:00.000Z' },
      };
    },
  };
  data.reload = () => {};

  try {
    const listResponse = await request('/api/v1/admin/storage/mutations?limit=5', {
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
    });

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.summary.total, 1);
    assert.equal(listResponse.body.summary.restorable, 1);
    assert.equal(listResponse.body.items[0].id, 42);

    const detailResponse = await request('/api/v1/admin/storage/mutations/42', {
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
    });

    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.mutation.id, 42);
    assert.equal(detailResponse.body.mutation.hasSnapshot, true);
    assert.deepEqual(detailResponse.body.mutation.snapshot, { students: [{ id: 'student-1' }] });

    const restoreResponse = await request('/api/v1/admin/storage/restore-mutation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
      body: JSON.stringify({ mutationId: 42 }),
    });

    assert.equal(restoreResponse.status, 200);
    assert.equal(restoredMutationId, 42);
    assert.equal(restoreResponse.body.restoredFromMutationId, 42);
    assert.equal(restoreResponse.body.status.journal.total, 1);

    const storageReport = await request('/api/v1/reports/storage?limit=5', {
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
    });

    assert.equal(storageReport.status, 200);
    assert.equal(storageReport.body.summary.mutationCount, 1);
    assert.equal(storageReport.body.summary.restorableMutationCount, 1);
    assert.equal(storageReport.body.journal.summary.total, 1);
    assert.equal(storageReport.body.journal.recent[0].id, 42);
  } finally {
    data.storage = originalStorage;
    data.reload = originalReload;
  }
});


test('admin storage recovery endpoints expose durable recovery summary and latest restore control', async () => {
  const checkpoint = store.checkpointStorage('latest-restore-test', {
    actorName: 'Ops Admin',
    actorRole: 'admin',
  });

  const recoveryResponse = await request('/api/v1/admin/storage/recovery?limit=5', {
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
  });

  assert.equal(recoveryResponse.status, 200);
  assert.ok(recoveryResponse.body.status);
  assert.ok(recoveryResponse.body.storage);
  assert.ok(recoveryResponse.body.operations);
  assert.ok(recoveryResponse.body.recoveryPlan);
  assert.ok(typeof recoveryResponse.body.latestBackup.path === 'string');

  const planResponse = await request('/api/v1/admin/storage/recovery-plan?label=latest-restore-test&limit=5', {
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
  });

  assert.equal(planResponse.status, 200);
  assert.equal(planResponse.body.summary.recommendedSource, 'backup');
  assert.ok(planResponse.body.candidates.some((entry) => entry.source === 'backup' && entry.path === checkpoint.backupPath));

  const restoreSmartResponse = await request('/api/v1/admin/storage/restore-smart', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ label: 'latest-restore-test', prefer: 'backup' }),
  });

  assert.equal(restoreSmartResponse.status, 201);
  assert.equal(restoreSmartResponse.body.selectedCandidate.source, 'backup');
  assert.ok(typeof restoreSmartResponse.body.result.restoredFrom === 'string');

  const restoreLatestResponse = await request('/api/v1/admin/storage/restore-latest', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({ label: 'latest-restore-test' }),
  });

  assert.equal(restoreLatestResponse.status, 201);
  assert.ok(typeof restoreLatestResponse.body.selectedBackup.path === 'string');
  assert.ok(typeof restoreLatestResponse.body.result.restoredFrom === 'string');
});

test('admin storage reconcile-cache endpoint returns 501 when cache reconcile is unavailable in file mode', async () => {
  const response = await request('/api/v1/admin/storage/reconcile-cache', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Ops Admin',
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 501);
  assert.equal(response.body.message, 'Storage cache reconcile is not available');
});

test('admin storage recovery control restores Postgres primary from warm cache when available', async () => {
  const data = require('../src/data');
  const originalStorage = data.storage;
  const originalReload = data.reload;
  let recovered = false;

  data.storage = {
    ...originalStorage,
    kind: 'postgres',
    recoverPrimaryFromWarmCache() {
      recovered = true;
      return {
        recovered: true,
        source: 'warm-cache',
        snapshotHash: 'cache-hash-1',
        cache: {
          exists: true,
          inSync: true,
          updatedAt: '2026-04-15T12:00:00.000Z',
          cacheHash: 'cache-hash-1',
          snapshotHash: 'cache-hash-1',
        },
      };
    },
    getStatus() {
      return {
        kind: 'postgres',
        exists: true,
        updatedAt: '2026-04-15T12:00:00.000Z',
        cache: { exists: true, inSync: true, updatedAt: '2026-04-15T12:00:00.000Z' },
        journal: { total: 12, latestAt: '2026-04-15T12:00:00.000Z', latestMutationId: 12, latestMutationAction: 'write', latestMutationHash: 'cache-hash-1', latestMutationRestorable: true },
        primaryIntegrity: { snapshotHash: 'cache-hash-1', journalAligned: true, recoverableFromWarmCache: true },
        db: { persistent: true, driver: 'pg-jsonb-snapshot+journal' },
      };
    },
  };
  data.reload = () => {};

  try {
    const response = await request('/api/v1/admin/storage/recover-primary-from-cache', {
      method: 'POST',
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 201);
    assert.equal(recovered, true);
    assert.equal(response.body.recovered, true);
    assert.equal(response.body.source, 'warm-cache');
    assert.equal(response.body.status.primaryIntegrity.journalAligned, true);

  } finally {
    data.storage = originalStorage;
    data.reload = originalReload;
  }
});


test('admin storage drift endpoints expose drift report and repair control for postgres mode', async () => {
  const data = require('../src/data');
  const originalStorage = data.storage;
  let reconciled = false;
  let repairedPrimary = false;

  data.storage = {
    kind: 'postgres',
    getStatus() {
      return {
        kind: 'postgres',
        file: '/tmp/lumo-cache.json',
        updatedAt: '2026-04-10T00:00:00.000Z',
        cache: {
          exists: true,
          inSync: reconciled,
          updatedAt: '2026-04-10T00:00:00.000Z',
          snapshotHash: 'db-hash',
          cacheHash: reconciled ? 'db-hash' : 'cache-hash',
        },
        journal: {
          total: 11,
          latestAt: '2026-04-10T00:00:00.000Z',
          latestMutationId: 11,
          latestMutationRestorable: true,
          latestMutationHash: repairedPrimary ? 'db-hash' : 'cache-hash',
        },
        primaryIntegrity: {
          snapshotHash: 'db-hash',
          journalAligned: repairedPrimary,
          recoverableFromWarmCache: true,
        },
        db: { mode: 'postgres', persistent: true, hasDatabaseUrl: true, driver: 'pg-jsonb-snapshot+journal' },
      };
    },
    reconcileCache() {
      reconciled = true;
      return { reconciled: true, cache: { exists: true, inSync: true } };
    },
    repairPrimaryFromLatestSnapshot() {
      repairedPrimary = true;
      return { repaired: true, source: 'latest-mutation' };
    },
    listOperations() { return []; },
    getOperation() { return null; },
    recordOperation(record) { return record; },
  };

  try {
    const driftResponse = await request('/api/v1/admin/storage/drift', {
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
    });

    assert.equal(driftResponse.status, 200);
    assert.equal(driftResponse.body.summary.hasDrift, true);
    assert.equal(driftResponse.body.summary.severity, 'critical');

    const freshnessResponse = await request('/api/v1/admin/storage/freshness', {
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
    });

    assert.equal(freshnessResponse.status, 200);
    assert.equal(freshnessResponse.body.primary.severity, 'critical');

    const repairResponse = await request('/api/v1/admin/storage/repair-drift', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Ops Admin',
      },
      body: JSON.stringify({}),
    });

    assert.equal(repairResponse.status, 201);
    assert.equal(reconciled, true);
    assert.equal(repairedPrimary, true);
    assert.equal(repairResponse.body.after.summary.hasDrift, true);
    assert.ok(repairResponse.body.actions.some((entry) => entry.action === 'reconcile-cache'));
    assert.ok(repairResponse.body.actions.some((entry) => entry.action === 'repair-primary-from-latest-snapshot'));
  } finally {
    data.storage = originalStorage;
  }
});
