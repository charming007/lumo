const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-protected-throttle-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.LUMO_ADMIN_MUTATION_THROTTLE_MAX_REQUESTS = '1';
process.env.LUMO_SYNC_THROTTLE_MAX_REQUESTS = '2';
process.env.PORT = '0';

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
    headers: response.headers,
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

test('protected mutation routes throttle after the configured limit while GET routes stay reachable', async () => {
  const headers = {
    'x-lumo-role': 'admin',
    'x-lumo-actor': 'Throttle Admin',
  };

  const first = await request('/api/v1/admin/storage/checkpoint', {
    method: 'POST',
    headers,
    body: JSON.stringify({ label: 'throttle-checkpoint-1' }),
  });
  assert.equal(first.status, 201);
  assert.equal(first.headers.get('ratelimit-limit'), '1');
  assert.equal(first.headers.get('ratelimit-remaining'), '0');

  const second = await request('/api/v1/admin/storage/checkpoint', {
    method: 'POST',
    headers,
    body: JSON.stringify({ label: 'throttle-checkpoint-2' }),
  });
  assert.equal(second.status, 429);
  assert.match(String(second.headers.get('retry-after') || ''), /^\d+$/);
  assert.equal(second.headers.get('ratelimit-limit'), '1');
  assert.equal(second.headers.get('ratelimit-remaining'), '0');
  assert.match(String(second.headers.get('ratelimit-reset') || ''), /^\d+$/);
  assert.equal(second.body.throttle.bucket, 'admin-mutation');

  const getStatus = await request('/api/v1/admin/storage/status', {
    headers,
  });
  assert.equal(getStatus.status, 200);
  assert.ok(getStatus.body.db);
});

test('learner sync keeps using its own throttle and is not blocked by the protected mutation bucket', async () => {
  const protectedHeaders = {
    'x-lumo-role': 'admin',
    'x-lumo-actor': 'Exhausted Admin',
  };

  const exhaust = await request('/api/v1/admin/storage/checkpoint', {
    method: 'POST',
    headers: protectedHeaders,
    body: JSON.stringify({ label: 'exhaust-admin-bucket' }),
  });
  assert.equal(exhaust.status, 201);

  const syncHeaders = {
    'x-lumo-client-id': 'learner-sync-throttle-client',
  };

  const firstSync = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    headers: syncHeaders,
    body: JSON.stringify({ events: [{ id: 'protected-throttle-sync-1', type: 'unsupported_event', payload: { studentId: 'student-1' } }] }),
  });
  const secondSync = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    headers: syncHeaders,
    body: JSON.stringify({ events: [{ id: 'protected-throttle-sync-2', type: 'unsupported_event', payload: { studentId: 'student-1' } }] }),
  });
  const thirdSync = await request('/api/v1/learner-app/sync', {
    method: 'POST',
    headers: syncHeaders,
    body: JSON.stringify({ events: [{ id: 'protected-throttle-sync-3', type: 'unsupported_event', payload: { studentId: 'student-1' } }] }),
  });

  assert.equal(firstSync.status, 202);
  assert.equal(secondSync.status, 202);
  assert.equal(thirdSync.status, 429);
  assert.equal(thirdSync.body.throttle.bucket, 'learner-sync');
});
