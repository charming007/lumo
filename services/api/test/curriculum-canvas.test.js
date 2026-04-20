const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-canvas-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';

const store = require('../src/store');
const { startServer } = require('../src/main');

let server;
let baseUrl;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  return {
    status: response.status,
    body: raw ? JSON.parse(raw) : null,
  };
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

test('curriculum canvas tree exposes real nested subject/strand/module graph', async () => {
  const response = await request('/api/v1/curriculum/canvas');

  assert.equal(response.status, 200);
  assert.equal(response.body.root.nodeType, 'root');
  assert.equal(response.body.root.children.length >= 1, true);
  assert.equal(response.body.meta.subjectCount, store.listSubjects().length);
  assert.equal(response.body.meta.moduleCount, store.listModules().length);

  const subject = response.body.root.children[0];
  assert.equal(subject.nodeType, 'subject');
  assert.ok(Array.isArray(subject.children));
  assert.equal(subject.stats.strandCount >= 1, true);
}
);

test('subject endpoints accept full lifecycle transitions', async () => {
  const created = await request('/api/v1/subjects', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      id: 'status-parity-subject',
      name: 'Status Parity Subject',
      status: 'review',
      initialStrandName: 'Launch lane',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, 'review');

  const published = await request('/api/v1/subjects/status-parity-subject', {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      status: 'published',
    }),
  });

  assert.equal(published.status, 200, JSON.stringify(published.body));
  assert.equal(published.body.status, 'published');

  const reverted = await request('/api/v1/subjects/status-parity-subject', {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      status: 'draft',
    }),
  });

  assert.equal(reverted.status, 200, JSON.stringify(reverted.body));
  assert.equal(reverted.body.status, 'draft');
  assert.equal(store.listSubjects().find((item) => item.id === 'status-parity-subject').status, 'draft');
});

test('strand endpoints persist lifecycle status like subjects do', async () => {
  const subject = store.listSubjects()[0];
  const created = await request('/api/v1/strands', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      subjectId: subject.id,
      name: 'Lifecycle Parity Strand',
      status: 'published',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, 'published');

  const updated = await request(`/api/v1/strands/${created.body.id}`, {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      status: 'draft',
    }),
  });

  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.status, 'draft');
  assert.equal(store.listStrands().find((item) => item.id === created.body.id).status, 'draft');
});

test('canvas mutation endpoints create, update, reorder, and move curriculum nodes', async () => {
  const subject = store.listSubjects()[0];
  const createStrand = await request('/api/v1/curriculum/canvas/children', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      parentType: 'subject',
      parentId: subject.id,
      childType: 'strand',
      name: 'Storytelling',
      status: 'published',
    }),
  });

  assert.equal(createStrand.status, 201, JSON.stringify(createStrand.body));
  assert.equal(createStrand.body.created.status, 'published');
  const createdStrandId = createStrand.body.created.id;

  const publishStrand = await request(`/api/v1/curriculum/canvas/nodes/strand/${createdStrandId}`, {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      status: 'published',
    }),
  });

  assert.equal(publishStrand.status, 200, JSON.stringify(publishStrand.body));
  assert.equal(publishStrand.body.updated.status, 'published');

  const createModule = await request('/api/v1/curriculum/canvas/children', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      parentType: 'strand',
      parentId: createdStrandId,
      childType: 'module',
      title: 'Listening Circles',
      level: 'beginner',
    }),
  });

  assert.equal(createModule.status, 201, JSON.stringify(createModule.body));
  const moduleId = createModule.body.created.id;

  const createLesson = await request('/api/v1/curriculum/canvas/children', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      parentType: 'module',
      parentId: moduleId,
      childType: 'lesson',
      title: 'Echo Greetings',
      durationMinutes: 12,
      mode: 'guided',
      status: 'draft',
      activitySteps: [
        { id: 'step-1', type: 'listen_repeat', prompt: 'Say hello after Mallam.' },
      ],
    }),
  });

  assert.equal(createLesson.status, 201, JSON.stringify(createLesson.body));
  assert.equal(createLesson.body.created.subjectId, subject.id);
  const lessonId = createLesson.body.created.id;

  const updateLesson = await request(`/api/v1/curriculum/canvas/nodes/lesson/${lessonId}`, {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      title: 'Echo Greetings Revised',
      status: 'approved',
    }),
  });

  assert.equal(updateLesson.status, 200, JSON.stringify(updateLesson.body));
  assert.equal(updateLesson.body.updated.title, 'Echo Greetings Revised');
  assert.equal(updateLesson.body.updated.status, 'approved');

  const secondLesson = await request('/api/v1/curriculum/canvas/children', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      parentType: 'module',
      parentId: moduleId,
      childType: 'lesson',
      title: 'Name Game',
      durationMinutes: 10,
      mode: 'guided',
      status: 'draft',
      activitySteps: [
        { id: 'step-1', type: 'listen_repeat', prompt: 'Say your name.' },
      ],
    }),
  });

  assert.equal(secondLesson.status, 201, JSON.stringify(secondLesson.body));

  const reorder = await request('/api/v1/curriculum/canvas/reorder', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      parentType: 'module',
      parentId: moduleId,
      nodeType: 'lesson',
      orderedIds: [secondLesson.body.created.id, lessonId],
    }),
  });

  assert.equal(reorder.status, 201, JSON.stringify(reorder.body));
  assert.deepEqual(reorder.body.items.map((item) => item.id), [secondLesson.body.created.id, lessonId]);

  const focus = await request(`/api/v1/curriculum/canvas/focus/module/${moduleId}`);
  assert.equal(focus.status, 200);
  assert.deepEqual(focus.body.children.filter((item) => item.nodeType === 'lesson').map((item) => item.id), [secondLesson.body.created.id, lessonId]);
  assert.equal(store.listModules().find((entry) => entry.id === moduleId).lessonCount, 2);

  const sourceModule = store.listModules().find((entry) => entry.id === 'module-1');
  const targetModule = store.listModules().find((entry) => entry.id === 'module-2');
  const createdMoveLesson = await request('/api/v1/curriculum/canvas/children', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      parentType: 'module',
      parentId: sourceModule.id,
      childType: 'lesson',
      title: 'Move Me',
      durationMinutes: 8,
      mode: 'guided',
      status: 'draft',
      activitySteps: [
        { id: 'step-1', type: 'listen_repeat', prompt: 'Repeat after me.' },
      ],
    }),
  });

  assert.equal(createdMoveLesson.status, 201, JSON.stringify(createdMoveLesson.body));

  const moved = await request(`/api/v1/curriculum/canvas/nodes/lesson/${createdMoveLesson.body.created.id}`, {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Canvas Admin',
    },
    body: JSON.stringify({
      moduleId: targetModule.id,
      title: 'Moved Lesson',
    }),
  });

  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal(moved.body.updated.moduleId, targetModule.id);
  assert.equal(moved.body.updated.subjectId, 'math');
  assert.equal(store.listModules().find((entry) => entry.id === sourceModule.id).lessonCount >= 0, true);
  assert.equal(store.listModules().find((entry) => entry.id === targetModule.id).lessonCount >= 1, true);
});

