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
