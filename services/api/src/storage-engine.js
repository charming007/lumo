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

function hashSnapshot(value) {
  return require('crypto').createHash('sha1').update(JSON.stringify(value || {})).digest('hex');
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
    deleteBackup(backupPath) {
      ensureDir(resolvedFile);
      if (!backupPath || !fs.existsSync(backupPath)) {
        const error = new Error('Backup file not found');
        error.statusCode = 404;
        throw error;
      }

      fs.unlinkSync(backupPath);
      return backupPath;
    },
    listBackups,
    listOperations() {
      return [];
    },
    getOperation() {
      return null;
    },
    recordOperation(record) {
      return clone(record);
    },
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
    await client.query("CREATE TABLE IF NOT EXISTS lumo_storage_mutations (id BIGSERIAL PRIMARY KEY, action TEXT NOT NULL, snapshot_id TEXT NOT NULL DEFAULT 'primary', snapshot_hash TEXT NULL, snapshot JSONB NULL, collection_counts JSONB NULL, metadata JSONB NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await client.query("CREATE TABLE IF NOT EXISTS lumo_storage_operations (operation_id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'succeeded', actor_name TEXT NULL, actor_role TEXT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), payload JSONB NOT NULL)");
    await client.query('ALTER TABLE lumo_storage_mutations ADD COLUMN IF NOT EXISTS snapshot JSONB NULL');
    const summarize = (snapshot) => Object.fromEntries(Object.entries(snapshot || {}).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length]));
    const hashSnapshot = (snapshot) => require('crypto').createHash('sha1').update(JSON.stringify(snapshot || {})).digest('hex');
    if (${JSON.stringify(action)} === 'read') {
      const existing = await client.query('SELECT snapshot, updated_at FROM lumo_storage_snapshots WHERE id = $1', ['primary']);
      process.stdout.write(JSON.stringify(existing.rows[0] || null));
      return;
    }
    if (${JSON.stringify(action)} === 'write') {
      const snapshot = payload.snapshot || {};
      const result = await client.query(
        'INSERT INTO lumo_storage_snapshots (id, snapshot, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW() RETURNING updated_at',
        ['primary', JSON.stringify(snapshot)],
      );
      const counts = summarize(snapshot);
      const snapshotHash = hashSnapshot(snapshot);
      await client.query(
        'INSERT INTO lumo_storage_mutations (action, snapshot_id, snapshot_hash, snapshot, collection_counts, metadata) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)',
        ['write', 'primary', snapshotHash, JSON.stringify(snapshot), JSON.stringify(counts), JSON.stringify(payload.metadata || {})],
      );
      process.stdout.write(JSON.stringify({ updatedAt: result.rows[0]?.updated_at || null, snapshotHash, collectionCounts: counts }));
      return;
    }
    if (${JSON.stringify(action)} === 'checkpoint') {
      const current = await client.query('SELECT snapshot FROM lumo_storage_snapshots WHERE id = $1', ['primary']);
      if (!current.rows[0]) {
        process.stdout.write(JSON.stringify(null));
        return;
      }
      const snapshot = current.rows[0].snapshot || {};
      const created = await client.query(
        'INSERT INTO lumo_storage_backups (label, snapshot) VALUES ($1, $2::jsonb) RETURNING id, label, created_at',
        [payload.label || 'manual-checkpoint', JSON.stringify(snapshot)],
      );
      await client.query(
        'INSERT INTO lumo_storage_mutations (action, snapshot_id, snapshot_hash, snapshot, collection_counts, metadata) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)',
        ['checkpoint', 'primary', hashSnapshot(snapshot), JSON.stringify(snapshot), JSON.stringify(summarize(snapshot)), JSON.stringify({ label: payload.label || 'manual-checkpoint', backupId: created.rows[0]?.id || null })],
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
      const snapshot = row.rows[0].snapshot || {};
      await client.query(
        'INSERT INTO lumo_storage_snapshots (id, snapshot, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()',
        ['primary', JSON.stringify(snapshot)],
      );
      await client.query(
        'INSERT INTO lumo_storage_mutations (action, snapshot_id, snapshot_hash, snapshot, collection_counts, metadata) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)',
        ['restore', 'primary', hashSnapshot(snapshot), JSON.stringify(snapshot), JSON.stringify(summarize(snapshot)), JSON.stringify({ backupId })],
      );
      process.stdout.write(JSON.stringify({ restored: true, backupId }));
      return;
    }
    if (${JSON.stringify(action)} === 'deleteBackup') {
      const deleted = await client.query('DELETE FROM lumo_storage_backups WHERE id = $1 RETURNING id', [payload.backupId]);
      if (!deleted.rows[0]) {
        throw Object.assign(new Error('Backup row not found'), { statusCode: 404 });
      }
      await client.query(
        'INSERT INTO lumo_storage_mutations (action, snapshot_id, metadata) VALUES ($1, $2, $3::jsonb)',
        ['delete-backup', 'primary', JSON.stringify({ backupId: payload.backupId })],
      );
      process.stdout.write(JSON.stringify({ deleted: true, backupId: payload.backupId }));
      return;
    }
    if (${JSON.stringify(action)} === 'status') {
      const snap = await client.query('SELECT updated_at, pg_column_size(snapshot) AS size_bytes FROM lumo_storage_snapshots WHERE id = $1', ['primary']);
      const backups = await client.query('SELECT id, label, created_at, pg_column_size(snapshot) AS size_bytes FROM lumo_storage_backups ORDER BY created_at DESC LIMIT 10');
      const journal = await client.query("SELECT COUNT(*)::int AS total, MAX(created_at) AS latest_at FROM lumo_storage_mutations");
      process.stdout.write(JSON.stringify({ snapshot: snap.rows[0] || null, backups: backups.rows || [], journal: journal.rows[0] || { total: 0, latest_at: null } }));
      return;
    }
    if (${JSON.stringify(action)} === 'listMutations') {
      const limit = Math.max(1, Math.min(Number(payload.limit || 20), 100));
      const rows = await client.query('SELECT id, action, snapshot_id, snapshot_hash, snapshot IS NOT NULL AS has_snapshot, collection_counts, metadata, created_at FROM lumo_storage_mutations ORDER BY created_at DESC LIMIT ' + limit);
      process.stdout.write(JSON.stringify(rows.rows || []));
      return;
    }
    if ('getMutation' === ${JSON.stringify(action)}) {
      const row = await client.query('SELECT id, action, snapshot_id, snapshot_hash, snapshot, snapshot IS NOT NULL AS has_snapshot, collection_counts, metadata, created_at FROM lumo_storage_mutations WHERE id = $1', [payload.id]);
      process.stdout.write(JSON.stringify(row.rows[0] || null));
      return;
    }
    if ('listOperations' === ${JSON.stringify(action)}) {
      const limit = Math.max(1, Math.min(Number(payload.limit || 20), 100));
      const filters = [];
      const params = [];
      if (payload.kind) {
        params.push(payload.kind);
        filters.push('kind = $' + params.length);
      }
      if (payload.actorName) {
        params.push(payload.actorName);
        filters.push('actor_name = $' + params.length);
      }
      const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
      const rows = await client.query('SELECT operation_id, kind, status, actor_name, actor_role, created_at, payload FROM lumo_storage_operations ' + where + ' ORDER BY created_at DESC LIMIT ' + limit, params);
      process.stdout.write(JSON.stringify(rows.rows || []));
      return;
    }
    if ('getOperation' === ${JSON.stringify(action)}) {
      const row = await client.query('SELECT operation_id, kind, status, actor_name, actor_role, created_at, payload FROM lumo_storage_operations WHERE operation_id = $1', [String(payload.id)]);
      process.stdout.write(JSON.stringify(row.rows[0] || null));
      return;
    }
    if ('recordOperation' === ${JSON.stringify(action)}) {
      const record = payload.record || {};
      const operationId = String(record.id || payload.id || 'storage-operation-' + Date.now());
      const merged = {
        ...record,
        id: operationId,
        kind: record.kind || 'unknown',
        status: record.status || 'succeeded',
        actorName: record.actorName || null,
        actorRole: record.actorRole || null,
        createdAt: record.createdAt || new Date().toISOString(),
      };
      await client.query(
        'INSERT INTO lumo_storage_operations (operation_id, kind, status, actor_name, actor_role, created_at, payload) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::jsonb) ON CONFLICT (operation_id) DO UPDATE SET kind = EXCLUDED.kind, status = EXCLUDED.status, actor_name = EXCLUDED.actor_name, actor_role = EXCLUDED.actor_role, created_at = EXCLUDED.created_at, payload = EXCLUDED.payload',
        [operationId, merged.kind, merged.status, merged.actorName, merged.actorRole, merged.createdAt, JSON.stringify(merged)],
      );
      process.stdout.write(JSON.stringify(merged));
      return;
    }
    if ('restoreMutation' === ${JSON.stringify(action)}) {
      const row = await client.query('SELECT id, snapshot FROM lumo_storage_mutations WHERE id = $1', [payload.id]);
      if (!row.rows[0]) {
        throw Object.assign(new Error('Mutation row not found'), { statusCode: 404 });
      }
      const snapshot = row.rows[0].snapshot || null;
      if (!snapshot) {
        throw Object.assign(new Error('Mutation does not contain a restorable snapshot'), { statusCode: 409 });
      }
      await client.query(
        'INSERT INTO lumo_storage_snapshots (id, snapshot, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, updated_at = NOW()',
        ['primary', JSON.stringify(snapshot)],
      );
      await client.query(
        'INSERT INTO lumo_storage_mutations (action, snapshot_id, snapshot_hash, snapshot, collection_counts, metadata) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)',
        ['restore-mutation', 'primary', hashSnapshot(snapshot), JSON.stringify(snapshot), JSON.stringify(summarize(snapshot)), JSON.stringify({ mutationId: payload.id })],
      );
      process.stdout.write(JSON.stringify({ restored: true, mutationId: payload.id }));
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

  function describeWarmCache(snapshot = null) {
    ensureDir(resolvedFile);
    const exists = fs.existsSync(resolvedFile);
    const cachedSnapshot = exists ? safeReadJson(resolvedFile, {}) : null;
    const stats = exists ? fs.statSync(resolvedFile) : null;
    const cacheHash = exists ? hashSnapshot(cachedSnapshot) : null;
    const snapshotHash = snapshot ? hashSnapshot(snapshot) : null;

    return {
      file: resolvedFile,
      exists,
      sizeBytes: stats?.size ?? 0,
      updatedAt: stats?.mtime?.toISOString() ?? null,
      snapshotHash,
      cacheHash,
      inSync: snapshotHash ? cacheHash === snapshotHash : exists,
    };
  }

  function syncWarmCache(snapshot) {
    ensureDir(resolvedFile);
    writeJsonFile(resolvedFile, snapshot);
    return describeWarmCache(snapshot);
  }

  function read(seedData) {
    const row = runPg('read');
    if (!row?.snapshot) {
      runPg('write', { snapshot: seedData });
      syncWarmCache(seedData);
      return clone(seedData);
    }

    const snapshot = typeof row.snapshot === 'object' ? row.snapshot : clone(seedData);
    const cache = describeWarmCache(snapshot);
    if (!cache.exists || !cache.inSync) {
      syncWarmCache(snapshot);
    }

    return snapshot;
  }

  function write(snapshot) {
    runPg('write', { snapshot });
    syncWarmCache(snapshot);
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

  function parseBackupId(backupPath) {
    const match = String(backupPath || '').match(/^postgres:lumo_storage_backups:(\d+)$/);
    if (!match) {
      const error = new Error('Backup path must look like postgres:lumo_storage_backups:<id>');
      error.statusCode = 400;
      throw error;
    }

    return Number(match[1]);
  }

  function restoreFromBackup(backupPath) {
    runPg('restore', { backupId: parseBackupId(backupPath) });
    const row = runPg('read');
    if (row?.snapshot && typeof row.snapshot === 'object') {
      syncWarmCache(row.snapshot);
    }
    return backupPath;
  }

  function deleteBackup(backupPath) {
    runPg('deleteBackup', { backupId: parseBackupId(backupPath) });
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
    deleteBackup,
    listBackups,
    listMutations(limit = 20) {
      return (runPg('listMutations', { limit }) || []).map((row) => ({
        id: row.id,
        action: row.action,
        snapshotId: row.snapshot_id,
        snapshotHash: row.snapshot_hash || null,
        hasSnapshot: Boolean(row.has_snapshot),
        collectionCounts: row.collection_counts || null,
        metadata: row.metadata || null,
        createdAt: row.created_at,
      }));
    },
    getMutation(id) {
      const row = runPg('getMutation', { id: Number(id) });
      if (!row) return null;
      return {
        id: row.id,
        action: row.action,
        snapshotId: row.snapshot_id,
        snapshotHash: row.snapshot_hash || null,
        hasSnapshot: Boolean(row.has_snapshot),
        collectionCounts: row.collection_counts || null,
        metadata: row.metadata || null,
        createdAt: row.created_at,
        snapshot: row.snapshot || null,
      };
    },
    restoreFromMutation(id) {
      runPg('restoreMutation', { id: Number(id) });
      const row = runPg('read');
      if (row?.snapshot && typeof row.snapshot === 'object') {
        syncWarmCache(row.snapshot);
      }
      return Number(id);
    },
    listOperations({ limit = 20, kind = null, actorName = null } = {}) {
      return (runPg('listOperations', { limit, kind, actorName }) || []).map((row) => ({
        ...(row.payload || {}),
        id: row.operation_id,
        kind: row.kind,
        status: row.status,
        actorName: row.actor_name || row.payload?.actorName || null,
        actorRole: row.actor_role || row.payload?.actorRole || null,
        createdAt: row.created_at || row.payload?.createdAt || null,
      }));
    },
    getOperation(id) {
      const row = runPg('getOperation', { id: String(id) });
      if (!row) return null;
      return {
        ...(row.payload || {}),
        id: row.operation_id,
        kind: row.kind,
        status: row.status,
        actorName: row.actor_name || row.payload?.actorName || null,
        actorRole: row.actor_role || row.payload?.actorRole || null,
        createdAt: row.created_at || row.payload?.createdAt || null,
      };
    },
    recordOperation(record) {
      return runPg('recordOperation', { record });
    },
    reconcileCache() {
      const row = runPg('read');
      if (!row?.snapshot || typeof row.snapshot !== 'object') {
        return {
          reconciled: false,
          reason: 'missing-primary-snapshot',
          cache: describeWarmCache(null),
        };
      }

      return {
        reconciled: true,
        cache: syncWarmCache(row.snapshot),
      };
    },
    getStatus() {
      const status = runPg('status') || {};
      const row = runPg('read');
      const snapshot = row?.snapshot && typeof row.snapshot === 'object' ? row.snapshot : null;
      return {
        kind: 'postgres',
        file: resolvedFile,
        exists: Boolean(status.snapshot),
        sizeBytes: Number(status.snapshot?.size_bytes || 0),
        updatedAt: status.snapshot?.updated_at || null,
        backupFile: null,
        backupUpdatedAt: status.backups?.[0]?.created_at || null,
        backups: listBackups(10),
        cache: describeWarmCache(snapshot),
        journal: {
          total: Number(status.journal?.total || 0),
          latestAt: status.journal?.latest_at || null,
        },
        note: 'Primary durability is Postgres; local JSON file is maintained as a warm snapshot cache and every snapshot mutation is journaled in Postgres.',
        db: { ...getDbModeMeta(), driver: 'pg-jsonb-snapshot+journal' },
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
