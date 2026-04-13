const fs = require('fs');
const path = require('path');
const { getDbMode } = require('./db-mode');

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
  } catch (error) {
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
      };
    },
  };
}

function createStorageEngine({ filePath } = {}) {
  const mode = getDbMode();

  if (mode === 'postgres') {
    const fileEngine = createFileStorageEngine(filePath);
    return {
      kind: 'postgres-placeholder',
      file: path.resolve(filePath),
      read(seedData) {
        return fileEngine.read(seedData);
      },
      write(snapshot) {
        return fileEngine.write(snapshot);
      },
      checkpoint(label) {
        return fileEngine.checkpoint(label);
      },
      restoreFromBackup(backupPath) {
        return fileEngine.restoreFromBackup(backupPath);
      },
      listBackups(limit) {
        return fileEngine.listBackups(limit);
      },
      getStatus() {
        return {
          ...fileEngine.getStatus(),
          kind: 'postgres-placeholder',
          note: 'Postgres mode is not wired yet; file storage remains the active durability adapter.',
        };
      },
      note: 'Postgres mode is not wired yet; file storage remains the active durability adapter.',
    };
  }

  return createFileStorageEngine(filePath);
}

module.exports = {
  createStorageEngine,
};
