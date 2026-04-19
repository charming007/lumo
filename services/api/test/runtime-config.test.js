const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { buildConfigAudit } = require('../src/config-audit');

const runtimeValidatorPath = path.join(__dirname, '..', 'scripts', 'validate-runtime-env.mjs');

function withEnv(overrides, fn) {
  const original = {};
  for (const [key, value] of Object.entries(overrides)) {
    original[key] = Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined;
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('buildConfigAudit marks production-like deployments without admin auth as not ready', () => {
  const audit = withEnv({
    NODE_ENV: 'production',
    LUMO_ADMIN_API_KEY: undefined,
    LUMO_CORS_ALLOW_ANY_ORIGIN: 'false',
    LUMO_DB_MODE: 'file',
  }, () => buildConfigAudit());

  assert.equal(audit.summary.ready, false);
  assert.ok(audit.errors.some((entry) => entry.includes('LUMO_ADMIN_API_KEY')));
});

test('runtime validator exits non-zero on production auth misconfiguration', () => {
  const result = spawnSync(process.execPath, [runtimeValidatorPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      LUMO_ADMIN_API_KEY: '',
      LUMO_CORS_ALLOW_ANY_ORIGIN: 'false',
      LUMO_DB_MODE: 'file',
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.ok(`${result.stderr}${result.stdout}`.includes('LUMO_ADMIN_API_KEY'));
});

test('runtime validator allows local development and prints warnings instead of failing', () => {
  const result = spawnSync(process.execPath, [runtimeValidatorPath], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      LUMO_ADMIN_API_KEY: '',
      LUMO_CORS_ALLOW_ANY_ORIGIN: 'false',
      LUMO_DB_MODE: 'file',
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.ok(`${result.stderr}${result.stdout}`.includes('Warnings:'));
});

test('buildConfigAudit flags malformed public api base before managed asset urls rely on it', () => {
  const audit = withEnv({
    NODE_ENV: 'production',
    LUMO_ADMIN_API_KEY: 'admin-key',
    LUMO_PUBLIC_API_URL: 'api.lumo.example',
    LUMO_CORS_ALLOW_ANY_ORIGIN: 'false',
    LUMO_DB_MODE: 'file',
  }, () => buildConfigAudit());

  assert.equal(audit.summary.ready, false);
  assert.equal(audit.publicApiBase.valid, false);
  assert.ok(audit.errors.some((entry) => /not a valid URL/i.test(entry)));
});


test('buildConfigAudit surfaces asset durability risk when uploads stay on the default workspace path', () => {
  const audit = withEnv({
    NODE_ENV: 'production',
    LUMO_ADMIN_API_KEY: 'admin-key',
    LUMO_PUBLIC_API_URL: 'https://api.lumo.example',
    LUMO_CORS_ALLOW_ANY_ORIGIN: 'false',
    LUMO_DB_MODE: 'file',
    LUMO_ASSET_UPLOAD_DIR: undefined,
  }, () => buildConfigAudit());

  assert.equal(audit.assetUploads.ready, true);
  assert.equal(audit.assetUploads.usesDefaultPath, true);
  assert.equal(audit.assetUploads.insideWorkspace, true);
  assert.equal(audit.assetUploads.persistentRisk, true);
  assert.ok(audit.assetUploads.recommendations.some((entry) => entry.includes('LUMO_ASSET_UPLOAD_DIR')));
  assert.ok(audit.warnings.some((entry) => /persistence risk/i.test(entry)));
});

test('buildConfigAudit exposes throttle posture for production reviews', () => {
  const audit = withEnv({
    NODE_ENV: 'production',
    LUMO_SYNC_THROTTLE_MAX_REQUESTS: '600',
    LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS: '61',
    LUMO_ADMIN_MUTATION_THROTTLE_MAX_REQUESTS: '241',
  }, () => buildConfigAudit());

  assert.equal(audit.throttles.learnerSync.maxRequests, 600);
  assert.equal(audit.throttles.learnerRewardRequests.maxRequests, 61);
  assert.equal(audit.throttles.adminMutations.maxRequests, 241);
  assert.ok(audit.warnings.some((entry) => entry.includes('LUMO_SYNC_THROTTLE_MAX_REQUESTS')));
  assert.ok(audit.warnings.some((entry) => entry.includes('LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS')));
  assert.ok(audit.warnings.some((entry) => entry.includes('LUMO_ADMIN_MUTATION_THROTTLE_MAX_REQUESTS')));
});
