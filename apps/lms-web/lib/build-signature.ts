import { execSync } from 'node:child_process';

export type BuildSignature = {
  version: string;
  commitShort: string;
  builtAtLabel: string;
  deploymentLabel: string;
  summary: string;
};

function readFirstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function resolveCommitShort() {
  const envCommit = readFirstEnv('VERCEL_GIT_COMMIT_SHA', 'SOURCE_VERSION', 'COMMIT_SHA', 'GIT_COMMIT');
  if (envCommit) {
    return envCommit.slice(0, 7);
  }

  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'no-git';
  }
}

function resolveBuiltAtLabel() {
  const raw = readFirstEnv('VERCEL_GIT_COMMIT_DATE', 'BUILD_TIMESTAMP', 'SOURCE_DATE_EPOCH');

  if (raw && /^\d+$/.test(raw)) {
    const millis = Number(raw) * (raw.length <= 10 ? 1000 : 1);
    return new Date(millis).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }

  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    }
  }

  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function resolveDeploymentLabel() {
  const vercelEnv = readFirstEnv('VERCEL_ENV');
  if (vercelEnv) {
    return `vercel:${vercelEnv}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'node:production';
  }

  return 'node:development';
}

export function getBuildSignature(): BuildSignature {
  const version = process.env.npm_package_version?.trim() || '0.1.0';
  const commitShort = resolveCommitShort();
  const builtAtLabel = resolveBuiltAtLabel();
  const deploymentLabel = resolveDeploymentLabel();

  return {
    version,
    commitShort,
    builtAtLabel,
    deploymentLabel,
    summary: `build v${version} · ${commitShort} · ${builtAtLabel} · ${deploymentLabel}`,
  };
}
