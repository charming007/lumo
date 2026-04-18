const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-dangerous-admin-guard-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.LUMO_ADMIN_API_KEY = 'guard-admin-key';
process.env.PORT = '0';

const { startServer } = require('../src/main');
const { buildConfigAudit } = require('../src/config-audit');

let server;
let baseUrl;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-lumo-api-key': process.env.LUMO_ADMIN_API_KEY,
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

test('config audit exposes dangerous admin mutation guard posture', () => {
  const audit = buildConfigAudit();
  assert.equal(audit.dangerousAdminMutationGuard.enforced, true);
  assert.equal(audit.dangerousAdminMutationGuard.confirmationHeader, 'x-lumo-confirm-action');
  assert.equal(audit.dangerousAdminMutationGuard.idempotencyHeader, 'idempotency-key');
  assert.ok(audit.dangerousAdminMutationGuard.protectedActions.includes('storage-restore-latest'));
});

test('dangerous storage restore routes require explicit confirmation and idempotency headers', async () => {
  const missingHeaders = await request('/api/v1/admin/storage/restore-latest', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  assert.equal(missingHeaders.status, 428);
  assert.equal(missingHeaders.body.required.confirmationValue, 'storage-restore-latest');

  const confirmed = await request('/api/v1/admin/storage/restore-latest', {
    method: 'POST',
    headers: {
      'x-lumo-confirm-action': 'storage-restore-latest',
      'idempotency-key': 'restore-latest-1',
    },
    body: JSON.stringify({}),
  });

  assert.notEqual(confirmed.status, 428);
  assert.equal(confirmed.headers.get('x-lumo-confirmed-action'), 'storage-restore-latest');
  assert.equal(confirmed.headers.get('x-lumo-idempotency-key'), 'restore-latest-1');
});

test('dangerous storage restore routes reject duplicate idempotency keys for the same actor and action', async () => {
  const headers = {
    'x-lumo-confirm-action': 'storage-restore-latest',
    'idempotency-key': 'restore-latest-duplicate',
  };

  const first = await request('/api/v1/admin/storage/restore-latest', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  assert.notEqual(first.status, 428);

  const second = await request('/api/v1/admin/storage/restore-latest', {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  assert.equal(second.status, 409);
  assert.equal(second.body.action, 'storage-restore-latest');
  assert.equal(second.body.idempotencyKey, 'restore-latest-duplicate');
});
