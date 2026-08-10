import fs from 'node:fs';
import path from 'node:path';

const projectDir = process.cwd();
const nextDir = path.join(projectDir, '.next');
const lockFile = path.join(nextDir, 'lock');
const lifecycleEvent = process.env.npm_lifecycle_event;
const shouldClearLock = lifecycleEvent === 'build';

if (!shouldClearLock || !fs.existsSync(lockFile)) {
  process.exit(0);
}

const stats = fs.statSync(lockFile);
const ageMs = Date.now() - stats.mtimeMs;
const minimumStaleAgeMs = 15_000;

if (ageMs < minimumStaleAgeMs) {
  console.warn(
    `Skipping stale Next.js lock cleanup because ${path.relative(projectDir, lockFile)} was updated ${Math.round(ageMs)}ms ago.`
  );
  process.exit(0);
}

fs.rmSync(lockFile, { force: true });
console.warn(
  `Removed stale Next.js build lock at ${path.relative(projectDir, lockFile)} before starting a fresh production build.`
);
