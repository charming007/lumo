import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./storage-danger-action-launcher.tsx', import.meta.url)), 'utf8');

test('storage danger launcher requires typed confirmation and acknowledgement before enabling submit', () => {
  assert.match(source, /const matches = useMemo\(\(\) => normalize\(typedValue\) === normalize\(expectedText\), \[typedValue, expectedText\]\);/);
  assert.match(source, /const ready = matches && acknowledged;/);
  assert.match(source, /Type <strong style=\{\{ color: '#0f172a' \}\}>\{expectedText\}<\/strong> exactly to unlock this action/);
  assert.match(source, /<ActionButton[\s\S]*disabled=\{!ready\}/);
});

test('storage danger launcher uses the shared modal pattern for production-danger actions', () => {
  assert.match(source, /<ModalLauncher/);
  assert.match(source, /dangerConfirmation/);
  assert.match(source, /Impact summary/);
});
