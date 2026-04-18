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


test('sync and learner reward request throttles fail noisy instead of allowing retry storms', async () => {
  const originalSyncMax = process.env.LUMO_SYNC_THROTTLE_MAX_REQUESTS;
  const originalRewardMax = process.env.LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS;
  process.env.LUMO_SYNC_THROTTLE_MAX_REQUESTS = '2';
  process.env.LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS = '1';

  await withServer(async (baseUrl) => {
    const syncHeaders = {
      'content-type': 'application/json',
      'x-lumo-client-id': 'throttle-sync-client',
    };

    const syncPayload = { events: [{ id: 'sync-1', type: 'unsupported_event', payload: { studentId: 'student-1' } }] };
    const firstSync = await fetch(`${baseUrl}/api/v1/learner-app/sync`, { method: 'POST', headers: syncHeaders, body: JSON.stringify(syncPayload) });
    const secondSync = await fetch(`${baseUrl}/api/v1/learner-app/sync`, { method: 'POST', headers: syncHeaders, body: JSON.stringify({ events: [{ id: 'sync-2', type: 'unsupported_event', payload: { studentId: 'student-1' } }] }) });
    const thirdSync = await fetch(`${baseUrl}/api/v1/learner-app/sync`, { method: 'POST', headers: syncHeaders, body: JSON.stringify({ events: [{ id: 'sync-3', type: 'unsupported_event', payload: { studentId: 'student-1' } }] }) });

    assert.equal(firstSync.status, 202);
    assert.equal(secondSync.status, 202);
    assert.equal(thirdSync.status, 429);
    assert.match(String(thirdSync.headers.get('retry-after') || ''), /^\d+$/);
    const throttledSyncBody = await thirdSync.json();
    assert.equal(throttledSyncBody.throttle.bucket, 'learner-sync');

    const rewardHeaders = { 'content-type': 'application/json' };
    const firstReward = await fetch(`${baseUrl}/api/v1/learner-app/rewards/requests`, {
      method: 'POST',
      headers: rewardHeaders,
      body: JSON.stringify({ learnerId: 'student-1', rewardItemId: 'sticker-badge', learnerNote: 'please', clientRequestId: 'reward-1' }),
    });
    const secondReward = await fetch(`${baseUrl}/api/v1/learner-app/rewards/requests`, {
      method: 'POST',
      headers: rewardHeaders,
      body: JSON.stringify({ learnerId: 'student-1', rewardItemId: 'helper-star', learnerNote: 'again', clientRequestId: 'reward-2' }),
    });

    assert.ok([201, 409].includes(firstReward.status));
    assert.equal(secondReward.status, 429);
    const throttledRewardBody = await secondReward.json();
    assert.equal(throttledRewardBody.throttle.bucket, 'learner-reward-request');
  });

  if (originalSyncMax === undefined) delete process.env.LUMO_SYNC_THROTTLE_MAX_REQUESTS;
  else process.env.LUMO_SYNC_THROTTLE_MAX_REQUESTS = originalSyncMax;
  if (originalRewardMax === undefined) delete process.env.LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS;
  else process.env.LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS = originalRewardMax;
});
