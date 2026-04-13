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
