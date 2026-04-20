import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildConfigAudit } = require('../src/config-audit');

const audit = buildConfigAudit();
const lines = [
  '',
  `Lumo API runtime audit (${audit.environment.nodeEnv}).`,
  `Ready: ${audit.summary.ready ? 'yes' : 'no'}`,
  `Build: v${audit.build.version} revision=${audit.build.revision.short || 'unknown'} boot=${audit.build.bootId}`,
  `Started: ${audit.build.startedAt}`,
  `Storage: ${audit.storage.mode} (${audit.storage.driver})`,
  `Asset uploads: ${audit.assetUploads.ready ? 'ready' : 'blocked'} @ ${audit.assetUploads.root}`,
  `Managed asset public base: ${audit.assetUploads.publicBaseValid ? (audit.assetUploads.publicBase || 'valid') : 'needs attention'}`,
];

if (audit.assetUploads.persistentRisk) {
  lines.push(`Asset durability risk: upload root is ${audit.assetUploads.usesDefaultPath ? 'still default' : 'custom'}${audit.assetUploads.insideWorkspace ? ' and inside the workspace' : ''}.`);
}

if (audit.errors.length > 0) {
  lines.push('', 'Blocking issues:');
  for (const entry of audit.errors) {
    lines.push(`- ${entry}`);
  }
}

if (audit.warnings.length > 0) {
  lines.push('', 'Warnings:');
  for (const entry of audit.warnings) {
    lines.push(`- ${entry}`);
  }
}

if (audit.assetUploads.recommendations?.length) {
  lines.push('', 'Asset/runtime operator actions:');
  for (const entry of audit.assetUploads.recommendations) {
    lines.push(`- ${entry}`);
  }
}

console.log(lines.join('\n'));
process.exit(audit.errors.length > 0 ? 1 : 0);
