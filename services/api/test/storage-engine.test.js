const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

const storageEnginePath = require.resolve('../src/storage-engine');

function withFreshStorageEngine(run) {
  const originalDbMode = process.env.LUMO_DB_MODE;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  delete require.cache[storageEnginePath];
  process.env.LUMO_DB_MODE = 'postgres';
  process.env.DATABASE_URL = 'postgres://lumo:test@127.0.0.1:5432/lumo';

  try {
    const storageEngine = require('../src/storage-engine');
    return run(storageEngine);
  } finally {
    delete require.cache[storageEnginePath];
    if (originalDbMode === undefined) delete process.env.LUMO_DB_MODE;
    else process.env.LUMO_DB_MODE = originalDbMode;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

test('postgres storage writes request payload over stdin while keeping the runner script out of stdin', () => {
  const originalExecFileSync = childProcess.execFileSync;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-storage-engine-'));
  const filePath = path.join(tempDir, 'store.json');
  const largeSnapshot = {
    lessonAssets: Array.from({ length: 64 }, (_, index) => ({
      id: `asset-${index}`,
      title: `Large asset ${index}`,
      fileUrl: `https://cdn.example.com/assets/${index}`,
      description: 'x'.repeat(4096),
    })),
  };

  let captured = null;
  childProcess.execFileSync = (command, args, options) => {
    captured = { command, args, options };
    return '{"updatedAt":"2026-05-01T00:00:00.000Z","snapshotHash":"hash","collectionCounts":{"lessonAssets":64}}';
  };

  try {
    withFreshStorageEngine(({ createStorageEngine }) => {
      const engine = createStorageEngine({ filePath });
      engine.write(largeSnapshot);
    });
  } finally {
    childProcess.execFileSync = originalExecFileSync;
  }

  assert.ok(captured, 'expected postgres persistence to spawn node');
  assert.equal(captured.command, process.execPath);
  assert.equal(captured.args[0], '-e');
  assert.match(String(captured.args[1] || ''), /const request = JSON\.parse\(fs\.readFileSync\(0, 'utf8'\) \|\| '\{\}'\);/);
  assert.equal(captured.options.stdio[0], 'pipe');

  const stdinPayload = String(captured.options.input || '');
  assert.doesNotMatch(stdinPayload, /const request = JSON\.parse\(fs\.readFileSync\(0, 'utf8'\) \|\| '\{\}'\);/);
  assert.match(stdinPayload, /"action":"write"/);
  assert.match(stdinPayload, /"lessonAssets":\[/);
  assert.doesNotMatch(captured.args.join(' '), /lessonAssets|Large asset|cdn\.example\.com/);

  const persistedWarmCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(persistedWarmCache.lessonAssets.length, 64);
});
