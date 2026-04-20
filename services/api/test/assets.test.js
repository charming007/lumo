const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-assets-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.LUMO_ASSET_MAX_UPLOAD_BYTES = '32';
process.env.LUMO_ADMIN_API_KEY = 'asset-test-key';
process.env.PORT = '0';

const { startServer } = require('../src/main');
const store = require('../src/store');

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

test('assets can be updated, archived, filtered, and safely deleted', async () => {
  const headers = {
    'x-lumo-role': 'admin',
    'x-lumo-actor': 'Asset Admin',
    'x-lumo-api-key': 'asset-test-key',
  };

  const created = await request('/api/v1/assets', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      kind: 'image',
      title: 'Phonics card',
      tags: ['phonics', 'alpha'],
      subjectId: 'english',
      moduleId: 'module-1',
      fileUrl: 'https://cdn.example.com/card.png',
      status: 'ready',
    }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Phonics card');

  const updated = await request(`/api/v1/assets/${created.body.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title: 'Phonics card v2', status: 'archived', tags: ['phonics', 'review'] }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, 'Phonics card v2');
  assert.equal(updated.body.status, 'archived');

  const hiddenByDefault = await request('/api/v1/assets');
  assert.equal(hiddenByDefault.status, 200);
  assert.equal(hiddenByDefault.body.some((item) => item.id === created.body.id), false);

  const archivedVisible = await request('/api/v1/assets?includeArchived=true&status=archived&tag=review&q=v2');
  assert.equal(archivedVisible.status, 200);
  assert.equal(archivedVisible.body.length, 1);
  assert.equal(archivedVisible.body[0].id, created.body.id);

  const missingHeaders = await request(`/api/v1/assets/${created.body.id}`, {
    method: 'DELETE',
    headers,
  });
  assert.equal(missingHeaders.status, 428);

  const deleted = await request(`/api/v1/assets/${created.body.id}`, {
    method: 'DELETE',
    headers: {
      ...headers,
      'x-lumo-confirm-action': 'asset-delete',
      'idempotency-key': 'asset-delete-test-1',
    },
  });
  assert.equal(deleted.status, 204);

  const afterDelete = await request('/api/v1/assets?includeArchived=true');
  assert.equal(afterDelete.status, 200);
  assert.equal(afterDelete.body.some((item) => item.id === created.body.id), false);
});

test('asset upload enforces mime and size limits', async () => {
  const headers = {
    'x-lumo-role': 'admin',
    'x-lumo-actor': 'Asset Admin',
    'x-lumo-api-key': 'asset-test-key',
  };

  const badMime = await request('/api/v1/assets/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName: 'script.svg',
      contentType: 'image/svg+xml',
      base64: Buffer.from('tiny').toString('base64'),
      kind: 'image',
      title: 'Bad svg',
    }),
  });
  assert.equal(badMime.status, 400);
  assert.match(badMime.body.message, /Invalid content type/);

  const tooLarge = await request('/api/v1/assets/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName: 'large.png',
      contentType: 'image/png',
      base64: Buffer.alloc(40, 1).toString('base64'),
      kind: 'image',
      title: 'Too large',
    }),
  });
  assert.equal(tooLarge.status, 413);
  assert.match(tooLarge.body.message, /upload limit/);
});

test('upload endpoint fails with actionable blocker when storage path cannot be created', async () => {
  const uploadRoot = path.resolve(__dirname, '..', 'data', 'uploads');
  const datedPath = path.join(uploadRoot, new Date().toISOString().slice(0, 10));
  fs.mkdirSync(uploadRoot, { recursive: true });
  fs.rmSync(datedPath, { recursive: true, force: true });
  fs.writeFileSync(datedPath, 'not-a-directory');

  const response = await request('/api/v1/assets/upload', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Asset Admin',
      'x-lumo-api-key': 'asset-test-key',
    },
    body: JSON.stringify({
      fileName: 'tiny.png',
      contentType: 'image/png',
      base64: Buffer.from('tiny').toString('base64'),
      kind: 'image',
      title: 'Tiny image',
    }),
  });

  assert.equal(response.status, 503);
  assert.match(response.body.message, /asset upload root|writable|filesystem access|storage is unavailable/i);
  assert.equal(response.body.storage?.ready, false);
  assert.equal(response.body.storage?.root, uploadRoot);

  fs.rmSync(datedPath, { force: true });
});

test('managed uploaded assets present canonical public file URLs instead of stale internal origins', async () => {
  process.env.LUMO_PUBLIC_API_URL = 'https://api.lumo.example';

  const headers = {
    'x-lumo-role': 'admin',
    'x-lumo-actor': 'Asset Admin',
    'x-lumo-api-key': 'asset-test-key',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'internal-proxy.example',
  };

  try {
    const uploaded = await request('/api/v1/assets/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileName: 'tiny.png',
        contentType: 'image/png',
        base64: Buffer.from('tiny').toString('base64'),
        kind: 'image',
        title: 'Tiny image',
      }),
    });

    assert.equal(uploaded.status, 201);
    assert.match(uploaded.body.fileUrl, /^https:\/\/api\.lumo\.example\/media\//);
    assert.doesNotMatch(uploaded.body.fileUrl, /internal-proxy\.example/);

    const listed = await request('/api/v1/assets?includeArchived=true', {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'another-internal-hop.example',
      },
    });

    assert.equal(listed.status, 200);
    const asset = listed.body.find((item) => item.id === uploaded.body.id);
    assert.ok(asset);
    assert.equal(asset.fileUrl, uploaded.body.fileUrl);
  } finally {
    delete process.env.LUMO_PUBLIC_API_URL;
  }
});

test('managed uploaded assets keep the registry feed alive when public api base is malformed', async () => {
  process.env.LUMO_PUBLIC_API_URL = 'api.lumo.example';

  const headers = {
    'x-lumo-role': 'admin',
    'x-lumo-actor': 'Asset Admin',
    'x-lumo-api-key': 'asset-test-key',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'fallback-origin.example',
  };

  try {
    const uploaded = await request('/api/v1/assets/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileName: 'fallback.png',
        contentType: 'image/png',
        base64: Buffer.from('tiny').toString('base64'),
        kind: 'image',
        title: 'Fallback image',
      }),
    });

    assert.equal(uploaded.status, 201);
    assert.match(uploaded.body.fileUrl, /^https:\/\/fallback-origin\.example\/media\//);

    const listed = await request('/api/v1/assets?includeArchived=true', {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'fallback-origin.example',
      },
    });

    assert.equal(listed.status, 200);
    const asset = listed.body.find((item) => item.id === uploaded.body.id);
    assert.ok(asset);
    assert.equal(asset.fileUrl, uploaded.body.fileUrl);
  } finally {
    delete process.env.LUMO_PUBLIC_API_URL;
  }
});

test('asset scope validation rejects mismatched lesson/module relationships', async () => {
  const response = await request('/api/v1/assets', {
    method: 'POST',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Asset Admin',
      'x-lumo-api-key': 'asset-test-key',
    },
    body: JSON.stringify({
      kind: 'image',
      title: 'Broken scope',
      subjectId: 'math',
      moduleId: 'module-1',
      fileUrl: 'https://cdn.example.com/broken.png',
    }),
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /does not belong/);
});

test('asset registry feed skips malformed records instead of failing the whole listing', async () => {
  const assets = store.listLessonAssets();
  const originalLength = assets.length;

  assets.push(null);
  assets.push('totally-not-an-asset');
  assets.push({
    id: 'asset-poison-pill',
    kind: 'image',
    title: 'Poison pill',
    tags: ['bad'],
    subjectId: 'english',
    storagePath: { bad: 'path-shape' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  try {
    const response = await request('/api/v1/assets?includeArchived=true');

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
    assert.equal(response.body.some((item) => item?.id === 'asset-poison-pill'), false);
    assert.equal(response.body.some((item) => item == null), false);
  } finally {
    assets.splice(originalLength);
  }
});

test('asset coverage report endpoint exposes operator-facing integrity signals', async () => {
  const managedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-assets-report-'));
  const existingFile = path.join(managedDir, 'report-ok.png');
  const missingFile = path.join(managedDir, 'report-missing.png');
  fs.writeFileSync(existingFile, 'ok');

  const readyAsset = store.createLessonAsset({
    id: 'asset-report-ready',
    kind: 'image',
    title: 'Report ready image',
    fileName: 'report-ok.png',
    storagePath: existingFile,
    fileUrl: 'https://cdn.example.com/report-ok.png',
    status: 'ready',
  });
  store.createLessonAsset({
    id: 'asset-report-broken',
    kind: 'image',
    title: 'Report broken image',
    fileName: 'report-missing.png',
    storagePath: missingFile,
    fileUrl: 'https://cdn.example.com/report-missing.png',
    status: 'ready',
  });
  store.createLessonAsset({
    id: 'asset-report-orphan',
    kind: 'image',
    title: 'Report orphan image',
    fileName: 'report-orphan.png',
    fileUrl: 'https://cdn.example.com/report-orphan.png',
    status: 'ready',
  });

  store.createLesson({
    id: 'lesson-assets-report-route',
    subjectId: 'english',
    moduleId: 'module-1',
    title: 'Route-level asset coverage',
    status: 'published',
    activitySteps: [
      {
        id: 'route-step-1',
        type: 'listen_repeat',
        prompt: 'Repeat hello.',
        media: [
          { kind: 'image', value: `asset:${readyAsset.id}` },
          { kind: 'image', value: readyAsset.fileUrl },
          { kind: 'image', value: 'asset:route-missing-asset' },
          { kind: 'image', value: 'asset:asset-report-broken' },
        ],
      },
    ],
  });

  const response = await request('/api/v1/reports/assets?includeArchived=true&limit=20', {
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-actor': 'Asset Ops',
      'x-lumo-api-key': 'asset-test-key',
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.summary.referenceCount >= 4, true);
  assert.equal(response.body.summary.legacyCount >= 1, true);
  assert.equal(response.body.summary.missingCount >= 1, true);
  assert.equal(response.body.summary.brokenManagedCount >= 1, true);
  assert.ok(response.body.issues.some((issue) => issue.type === 'legacy-asset-reference' && issue.assetId === readyAsset.id));
  assert.ok(response.body.issues.some((issue) => issue.type === 'missing-canonical-asset-reference'));
  assert.ok(response.body.issues.some((issue) => issue.type === 'broken-managed-asset-file' && issue.assetId === 'asset-report-broken'));
  assert.ok(response.body.orphanedAssets.some((asset) => asset.assetId === 'asset-report-orphan'));
});


test('asset runtime report surfaces skipped registry records and upload diagnostics', async () => {
  const assets = store.listLessonAssets();
  const originalLength = assets.length;

  assets.push({
    id: 'asset-runtime-poison',
    kind: 'image',
    title: 'Broken runtime record',
    storagePath: { bad: 'shape' },
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  try {
    const response = await request('/api/v1/admin/assets/runtime?limit=5', {
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-actor': 'Asset Ops',
        'x-lumo-api-key': 'asset-test-key',
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.summary.skippedRecordCount >= 1, true);
    assert.equal(response.body.registry.totalRecords, assets.length);
    assert.equal(response.body.registry.usableRecords < response.body.registry.totalRecords, true);
    assert.equal(typeof response.body.uploads.ready, 'boolean');
    assert.equal(response.body.summary.readiness, 'blocked');
    assert.equal(typeof response.body.summary.headline, 'string');
    assert.equal(typeof response.body.summary.operatorAction, 'string');
    assert.ok(Array.isArray(response.body.nextActions));
    assert.ok(response.body.nextActions.length >= 1);
    assert.ok(Array.isArray(response.body.registry.topIssues));
  } finally {
    assets.splice(originalLength);
  }
});
