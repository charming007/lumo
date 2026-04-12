const fs = require('fs');
const path = require('path');
const { getDbMode } = require('./db-mode');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return clone(fallback);
  }
}

function createFileStorageEngine(filePath) {
  const resolvedFile = path.resolve(filePath);

  return {
    kind: 'file',
    file: resolvedFile,
    read(seedData) {
      ensureDir(resolvedFile);

      if (!fs.existsSync(resolvedFile)) {
        fs.writeFileSync(resolvedFile, JSON.stringify(seedData, null, 2));
        return clone(seedData);
      }

      return safeReadJson(resolvedFile, seedData);
    },
    write(snapshot) {
      ensureDir(resolvedFile);
      const tempFile = `${resolvedFile}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(snapshot, null, 2));
      fs.renameSync(tempFile, resolvedFile);
    },
  };
}

function createStorageEngine({ filePath } = {}) {
  const mode = getDbMode();

  if (mode === 'postgres') {
    return {
      kind: 'postgres-placeholder',
      file: path.resolve(filePath),
      read(seedData) {
        return createFileStorageEngine(filePath).read(seedData);
      },
      write(snapshot) {
        return createFileStorageEngine(filePath).write(snapshot);
      },
      note: 'Postgres mode is not wired yet; file storage remains the active durability adapter.',
    };
  }

  return createFileStorageEngine(filePath);
}

module.exports = {
  createStorageEngine,
};
