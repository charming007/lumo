const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-health-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';

const { startServer } = require('../src/main');

async function withServer(run) {
  const server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('health endpoint returns storage/db metadata instead of crashing', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.service, 'lumo-api');
    assert.equal(body.storage.mode, 'file');
    assert.equal(body.storage.driver, 'json-file');
    assert.equal(typeof body.config.ready, 'boolean');
  });
});

test('OPTIONS preflight exposes auth headers needed by browser admin clients', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/rewards/requests`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,x-lumo-api-key,content-type',
      },
    });

    assert.equal(response.status, 204);

    const allowedHeaders = String(response.headers.get('access-control-allow-headers') || '').toLowerCase();
    assert.match(allowedHeaders, /authorization/);
    assert.match(allowedHeaders, /x-lumo-api-key/);
  });
});
