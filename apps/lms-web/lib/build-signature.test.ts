import test from 'node:test';
import assert from 'node:assert/strict';

const buildSignatureModulePath = new URL('./build-signature.ts', import.meta.url).pathname;
const mutableEnv = process.env as Record<string, string | undefined>;

function clearBuildSignatureEnv() {
  for (const key of [
    'VERCEL_GIT_COMMIT_SHA',
    'SOURCE_VERSION',
    'COMMIT_SHA',
    'GIT_COMMIT',
    'VERCEL_GIT_COMMIT_DATE',
    'BUILD_TIMESTAMP',
    'SOURCE_DATE_EPOCH',
    'VERCEL_ENV',
    'VERCEL_URL',
    'VERCEL_DEPLOYMENT_ID',
    'npm_package_version',
    'NODE_ENV',
  ]) {
    delete mutableEnv[key];
  }
}

function setEnv(key: string, value: string) {
  mutableEnv[key] = value;
}

test('build signature never pretends request time is the build time when metadata is missing', async () => {
  clearBuildSignatureEnv();
  setEnv('NODE_ENV', 'production');
  setEnv('npm_package_version', '0.1.0');

  const { getBuildSignature } = await import(`${buildSignatureModulePath}?case=missing-metadata-${Date.now()}`);
  const signature = getBuildSignature();

  assert.ok(signature.commitShort.length >= 7, 'build signature should still expose either a git short SHA or a source-archive fallback label');
  assert.equal(signature.builtAtLabel, 'build time unavailable');
  assert.equal(signature.metadataTrusted, false);
  assert.match(signature.summary, /build time unavailable/);
  assert.doesNotMatch(signature.summary, /\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/);
});

test('deployment id fallback stays untrusted without real commit provenance', async () => {
  clearBuildSignatureEnv();
  setEnv('VERCEL_GIT_COMMIT_DATE', '2026-05-09T12:34:56Z');
  setEnv('VERCEL_ENV', 'production');
  setEnv('VERCEL_URL', 'lumo-example.vercel.app');
  setEnv('npm_package_version', '0.1.0');

  const { hasTrustedCommitProvenance } = await import(`${buildSignatureModulePath}?case=deployment-id-fallback-${Date.now()}`);

  assert.equal(hasTrustedCommitProvenance('deploy:dpl_12345'), false);
  assert.equal(hasTrustedCommitProvenance('source-archive'), false);
  assert.equal(hasTrustedCommitProvenance('abcdef1'), true);
});

test('build signature uses explicit Vercel metadata when it exists', async () => {
  clearBuildSignatureEnv();
  setEnv('VERCEL_GIT_COMMIT_SHA', 'abcdef1234567890');
  setEnv('VERCEL_GIT_COMMIT_DATE', '2026-05-09T12:34:56Z');
  setEnv('VERCEL_ENV', 'production');
  setEnv('VERCEL_URL', 'lumo-example.vercel.app');
  setEnv('npm_package_version', '0.1.0');

  const { getBuildSignature } = await import(`${buildSignatureModulePath}?case=with-metadata-${Date.now()}`);
  const signature = getBuildSignature();

  assert.equal(signature.commitShort, 'abcdef1');
  assert.equal(signature.builtAtLabel, '2026-05-09 12:34 UTC');
  assert.equal(signature.deploymentLabel, 'vercel:production @ lumo-example.vercel.app');
  assert.equal(signature.metadataTrusted, true);
});
