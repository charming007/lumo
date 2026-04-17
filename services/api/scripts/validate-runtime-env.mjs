import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildConfigAudit } = require('../src/config-audit');

const audit = buildConfigAudit();
const lines = [
  '',
  `Lumo API runtime config audit (${audit.environment.nodeEnv}).`,
];

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

if (audit.errors.length > 0) {
  console.error(lines.join('\n'));
  process.exit(1);
}

if (audit.warnings.length > 0) {
  console.warn(lines.join('\n'));
}
