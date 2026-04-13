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
