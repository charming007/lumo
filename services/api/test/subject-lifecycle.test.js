const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-subject-lifecycle-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';

const store = require('../src/store');
const data = require('../src/data');
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

test('subject lifecycle status survives API saves and persists in the store snapshot', async () => {
  const created = await request('/api/v1/subjects', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Lifecycle QA',
    },
    body: JSON.stringify({
      id: 'lifecycle-regression-subject',
      name: 'Lifecycle Regression Subject',
      icon: 'biotech',
      order: 42,
      status: 'review',
      initialStrandName: 'Regression lane',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, 'review');

  const saved = await request('/api/v1/subjects/lifecycle-regression-subject', {
    method: 'PATCH',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Lifecycle QA',
    },
    body: JSON.stringify({
      name: 'Lifecycle Regression Subject',
      icon: 'science',
      order: 42,
      status: 'published',
    }),
  });

  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.status, 'published');

  const subjectInStore = store.listSubjects().find((item) => item.id === 'lifecycle-regression-subject');
  assert.equal(subjectInStore?.status, 'published');

  const persistedSnapshot = JSON.parse(fs.readFileSync(process.env.LUMO_DATA_FILE, 'utf8'));
  const persistedSubject = persistedSnapshot.subjects.find((item) => item.id === 'lifecycle-regression-subject');
  assert.equal(persistedSubject?.status, 'published');
});

test('legacy curriculum snapshots are hydrated with lifecycle status defaults and upgraded on disk', async () => {
  const legacySnapshot = JSON.parse(fs.readFileSync(process.env.LUMO_DATA_FILE, 'utf8'));
  legacySnapshot.subjects = legacySnapshot.subjects.map(({ status, ...subject }) => subject);
  legacySnapshot.strands = legacySnapshot.strands.map(({ status, ...strand }) => strand);
  fs.writeFileSync(process.env.LUMO_DATA_FILE, JSON.stringify(legacySnapshot, null, 2));

  data.reload();

  const english = store.listSubjects().find((item) => item.id === 'english');
  const math = store.listSubjects().find((item) => item.id === 'math');
  const englishSpeaking = store.listStrands().find((item) => item.id === 'strand-1');
  const upgradedSnapshot = JSON.parse(fs.readFileSync(process.env.LUMO_DATA_FILE, 'utf8'));

  assert.equal(english?.status, 'published');
  assert.equal(math?.status, 'published');
  assert.equal(englishSpeaking?.status, 'published');
  assert.equal(upgradedSnapshot.subjects.find((item) => item.id === 'english')?.status, 'published');
  assert.equal(upgradedSnapshot.strands.find((item) => item.id === 'strand-1')?.status, 'published');
});
