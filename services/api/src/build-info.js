const crypto = require('crypto');
const apiPackage = require('../package.json');

const SERVER_STARTED_AT = new Date().toISOString();
const SERVER_BOOT_ID = crypto.randomUUID();

function coerceOptionalString(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function getBuildRevision() {
  const candidates = [
    process.env.LUMO_BUILD_REVISION,
    process.env.RAILWAY_GIT_COMMIT_SHA,
    process.env.SOURCE_VERSION,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.RENDER_GIT_COMMIT,
    process.env.GITHUB_SHA,
    process.env.COMMIT_SHA,
  ].map(coerceOptionalString).filter(Boolean);

  if (candidates.length === 0) {
    return {
      full: null,
      short: null,
      source: null,
    };
  }

  const full = candidates[0];
  return {
    full,
    short: full.slice(0, 12),
    source: full === process.env.LUMO_BUILD_REVISION ? 'LUMO_BUILD_REVISION'
      : full === process.env.RAILWAY_GIT_COMMIT_SHA ? 'RAILWAY_GIT_COMMIT_SHA'
        : full === process.env.SOURCE_VERSION ? 'SOURCE_VERSION'
          : full === process.env.VERCEL_GIT_COMMIT_SHA ? 'VERCEL_GIT_COMMIT_SHA'
            : full === process.env.RENDER_GIT_COMMIT ? 'RENDER_GIT_COMMIT'
              : full === process.env.GITHUB_SHA ? 'GITHUB_SHA'
                : 'COMMIT_SHA',
  };
}

function getBuildInfo() {
  const revision = getBuildRevision();
  const deploymentTarget = coerceOptionalString(process.env.LUMO_DEPLOY_TARGET)
    || coerceOptionalString(process.env.RAILWAY_SERVICE_NAME)
    || coerceOptionalString(process.env.RAILWAY_ENVIRONMENT_NAME)
    || coerceOptionalString(process.env.VERCEL_ENV)
    || coerceOptionalString(process.env.RENDER_SERVICE_NAME)
    || null;

  return {
    service: 'lumo-api',
    version: apiPackage.version,
    revision,
    startedAt: SERVER_STARTED_AT,
    bootId: SERVER_BOOT_ID,
    nodeVersion: process.version,
    deployTarget: deploymentTarget,
  };
}

module.exports = {
  getBuildInfo,
};
