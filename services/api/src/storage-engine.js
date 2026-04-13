const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { getDbMode, getDbModeMeta } = require('./db-mode');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function quarantineCorruptFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const corruptPath = `${filePath}.corrupt-${stamp}`;
  fs.renameSync(filePath, corruptPath);
  return corruptPath;
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    if (fs.existsSync(filePath)) {
      const quarantined = quarantineCorruptFile(filePath);
      if (quarantined) {
        writeJsonFile(filePath, fallback);
      }
    }

    return clone(fallback);
  }
}

function createFileStorageEngine(filePath) {
  const resolvedFile = path.resolve(filePath);

  function createBackup(label = 'manual-checkpoint') {
    ensureDir(resolvedFile);
    if (!fs.existsSync(resolvedFile)) return null;

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${resolvedFile}.${label}-${stamp}.bak`;
    fs.copyFileSync(resolvedFile, backupFile);
    return backupFile;
  }

  function listBackups(limit = 20) {
    ensureDir(resolvedFile);
    const dir = path.dirname(resolvedFile);
    const prefix = `${path.basename(resolvedFile)}.`;

    return fs.readdirSync(dir)
      .filter((name) => name.startsWith(prefix) && name.endsWith('.bak'))
      .map((name) => {
        const fullPath = path.join(dir, name);
        const stats = fs.statSync(fullPath);
        return {
          name,
          path: fullPath,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
      .slice(0, Math.max(1, Math.min(Number(limit || 20), 100)));
  }

  return {
    kind: 'file',
    file: resolvedFile,
    read(seedData) {
      ensureDir(resolvedFile);

      if (!fs.existsSync(resolvedFile)) {
        writeJsonFile(resolvedFile, seedData);
        return clone(seedData);
      }

      return safeReadJson(resolvedFile, seedData);
    },
    write(snapshot) {
      ensureDir(resolvedFile);
      const tempFile = `${resolvedFile}.tmp`;
      const backupFile = `${resolvedFile}.bak`;
      writeJsonFile(tempFile, snapshot);

      if (fs.existsSync(resolvedFile)) {
        fs.copyFileSync(resolvedFile, backupFile);
      }

      fs.renameSync(tempFile, resolvedFile);
    },
    checkpoint(label) {
      return createBackup(label);
    },
    restoreFromBackup(backupPath) {
      ensureDir(resolvedFile);
      if (!backupPath || !fs.existsSync(backupPath)) {
        const error = new Error('Backup file not found');
        error.statusCode = 404;
        throw error;
      }

      createBackup('pre-restore');
      fs.copyFileSync(backupPath, resolvedFile);
      return resolvedFile;
    },
    listBackups,
    getStatus() {
      ensureDir(resolvedFile);
      const exists = fs.existsSync(resolvedFile);
      const stats = exists ? fs.statSync(resolvedFile) : null;
      const backupFile = `${resolvedFile}.bak`;
      const backupExists = fs.existsSync(backupFile);
      const backupStats = backupExists ? fs.statSync(backupFile) : null;

      return {
        kind: 'file',
        file: resolvedFile,
        exists,
        sizeBytes: stats?.size ?? 0,
        updatedAt: stats?.mtime?.toISOString() ?? null,
        backupFile: backupExists ? backupFile : null,
        backupUpdatedAt: backupStats?.mtime?.toISOString() ?? null,
        backups: listBackups(10),
        db: getDbModeMeta(),
      };
    },
  };
}

function runNodeScript(script, env = process.env) {
  return childProcess.execFileSync(process.execPath, ['-e', script], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function createPostgresStorageEngine(filePath) {
  const resolvedFile = path.resolve(filePath);
  const databaseUrl = String(process.env.DATABASE_URL || '').trim();

  if (!databaseUrl) {
    const fileEngine = createFileStorageEngine(filePath);
    return {
      ...fileEngine,
      kind: 'postgres-misconfigured',
      note: 'LUMO_DB_MODE=postgres but DATABASE_URL is not set; using file storage fallback.',
      getStatus() {
        return {
          ...fileEngine.getStatus(),
          kind: 'postgres-misconfigured',
          note: 'LUMO_DB_MODE=postgres but DATABASE_URL is not set; using file storage fallback.',
          db: getDbModeMeta(),
        };
      },
    };
  }

  const escapedUrl = JSON.stringify(databaseUrl);

  function runPg(action, payload = {}) {
    const encodedPayload = JSON.stringify(payload);
    const script = `
const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: ${escapedUrl} });
  const payload = ${encodedPayload};
  await client.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS lumo_storage_snapshots (id TEXT PRIMARY KEY, snapshot JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    await client.query('CREATE TABLE IF NOT EXISTS lumo_storage_backups (id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, snapshot JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    if (${JSON.stringify(action)} === 'read') {
      const existing = await client.query('SELECT snapshot, updated_at FROM lumo_storage_snapshots WHERE id = $1', ['primary']);
      process.stdout.write(JSON.stringify(existing.rows[0] || null));
      return;
    }
    if (${JSON.stringify(action)} === 'write') {
      const result = await client.query(
        'INSERT INTO lumo_storage_snapshots (id, snapshot, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW() RETURNING updated_at',
        ['primary', JSON.stringify(payload.snapshot || {})],
      );
      process.stdout.write(JSON.stringify({ updatedAt: result.rows[0]?.updated_at || null }));
      return;
    }
    if (${JSON.stringify(action)} === 'checkpoint') {
      const current = await client.query('SELECT snapshot FROM lumo_storage_snapshots WHERE id = $1', ['primary']);
      if (!current.rows[0]) {
        process.stdout.write(JSON.stringify(null));
        return;
      }
      const created = await client.query(
        'INSERT INTO lumo_storage_backups (label, snapshot) VALUES ($1, $2::jsonb) RETURNING id, label, created_at',
        [payload.label || 'manual-checkpoint', JSON.stringify(current.rows[0].snapshot || {})],
      );
      process.stdout.write(JSON.stringify(created.rows[0] || null));
      return;
    }
    if (${JSON.stringify(action)} === 'listBackups') {
      const limit = Math.max(1, Math.min(Number(payload.limit || 20), 100));
      const rows = await client.query(
        'SELECT id, label, created_at, pg_column_size(snapshot) AS size_bytes FROM lumo_storage_backups ORDER BY created_at DESC LIMIT ' + limit,
      );
      process.stdout.write(JSON.stringify(rows.rows || []));
      return;
    }
    if (${JSON.stringify(action)} === 'restore') {
      const backupId = payload.backupId;
      const row = await client.query('SELECT snapshot FROM lumo_storage_backups WHERE id = $1', [backupId]);
      if (!row.rows[0]) {
        throw Object.assign(new Error('Backup row not found'), { statusCode: 404 });
      }
      await client.query(
        'INSERT INTO lumo_storage_snapshots (id, snapshot, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()',
        ['primary', JSON.stringify(row.rows[0].snapshot || {})],
      );
      process.stdout.write(JSON.stringify({ restored: true, backupId }));
      return;
    }
    if (${JSON.stringify(action)} === 'status') {
      const snap = await client.query('SELECT updated_at, pg_column_size(snapshot) AS size_bytes FROM lumo_storage_snapshots WHERE id = $1', ['primary']);
      const backups = await client.query('SELECT id, label, created_at, pg_column_size(snapshot) AS size_bytes FROM lumo_storage_backups ORDER BY created_at DESC LIMIT 10');
      process.stdout.write(JSON.stringify({ snapshot: snap.rows[0] || null, backups: backups.rows || [] }));
      return;
    }
    throw new Error('Unsupported action');
  } finally {
    await client.end();
  }
})().catch((error) => {
  const payload = { message: error.message, statusCode: error.statusCode || 500 };
  process.stderr.write(JSON.stringify(payload));
  process.exit(1);
});`;

    try {
      const output = runNodeScript(script, process.env);
      return output ? JSON.parse(output) : null;
    } catch (error) {
      const stderr = String(error.stderr || '').trim();
      let parsed = null;
      try {
        parsed = stderr ? JSON.parse(stderr) : null;
      } catch (_parseError) {
        parsed = null;
      }
      const wrapped = new Error(parsed?.message || error.message || 'Postgres storage operation failed');
      wrapped.statusCode = parsed?.statusCode || 500;
      throw wrapped;
    }
  }

  function read(seedData) {
    const row = runPg('read');
    if (!row?.snapshot) {
      runPg('write', { snapshot: seedData });
      return clone(seedData);
    }
    return typeof row.snapshot === 'object' ? row.snapshot : clone(seedData);
  }

  function write(snapshot) {
    runPg('write', { snapshot });
    ensureDir(resolvedFile);
    writeJsonFile(resolvedFile, snapshot);
  }

  function checkpoint(label) {
    const backup = runPg('checkpoint', { label: label || 'manual-checkpoint' });
    return backup ? `postgres:lumo_storage_backups:${backup.id}` : null;
  }

  function listBackups(limit = 20) {
    return (runPg('listBackups', { limit }) || []).map((row) => ({
      id: row.id,
      name: `${row.label}-${row.id}`,
      path: `postgres:lumo_storage_backups:${row.id}`,
      sizeBytes: Number(row.size_bytes || 0),
      modifiedAt: row.created_at,
      label: row.label,
    }));
  }

  function restoreFromBackup(backupPath) {
    const match = String(backupPath || '').match(/^postgres:lumo_storage_backups:(\d+)$/);
    if (!match) {
      const error = new Error('Backup path must look like postgres:lumo_storage_backups:<id>');
      error.statusCode = 400;
      throw error;
    }
    runPg('restore', { backupId: Number(match[1]) });
    return backupPath;
  }

  return {
    kind: 'postgres',
    file: resolvedFile,
    note: 'Primary durability is Postgres; local JSON file is maintained as a warm snapshot cache.',
    read,
    write,
    checkpoint,
    restoreFromBackup,
    listBackups,
    getStatus() {
      const status = runPg('status') || {};
      return {
        kind: 'postgres',
        file: resolvedFile,
        exists: Boolean(status.snapshot),
        sizeBytes: Number(status.snapshot?.size_bytes || 0),
        updatedAt: status.snapshot?.updated_at || null,
        backupFile: null,
        backupUpdatedAt: status.backups?.[0]?.created_at || null,
        backups: listBackups(10),
        note: 'Primary durability is Postgres; local JSON file is maintained as a warm snapshot cache.',
        db: getDbModeMeta(),
      };
    },
  };
}

function createStorageEngine({ filePath } = {}) {
  const mode = getDbMode();

  if (mode === 'postgres') {
    return createPostgresStorageEngine(filePath);
  }

  return createFileStorageEngine(filePath);
}

module.exports = {
  createStorageEngine,
};
