import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./actions.ts', import.meta.url)), 'utf8');

test('storage danger actions validate typed confirmation and acknowledgement server-side', () => {
  assert.match(source, /function assertDangerActionConfirmed\(formData: FormData, expectedText: string, failureMessage: string\)/);
  assert.match(source, /const typedConfirmation = String\(formData.get\('dangerConfirmation'\) \|\| ''\)\.trim\(\);/);
  assert.match(source, /const acknowledged = String\(formData.get\('dangerAcknowledgement'\) \|\| ''\)\.trim\(\)\.toLowerCase\(\) === 'yes';/);
  assert.match(source, /redirectDangerConfirmationFailure\(`\$\{failureMessage\}: acknowledgement is required`\);/);
  assert.match(source, /redirectDangerConfirmationFailure\(`\$\{failureMessage\}: typed confirmation did not match`\);/);
});

test('repair, restore, and delete storage actions all enforce server-side danger confirmation', () => {
  assert.match(source, /assertDangerActionConfirmed\(formData, backupPath, 'Backup deletion blocked'\);/);
  assert.match(source, /assertDangerActionConfirmed\(formData, backupPath, 'Backup restore blocked'\);/);
  assert.match(source, /export async function repairStorageIntegrityAction\(formData: FormData\) \{/);
  assert.match(source, /assertDangerActionConfirmed\(formData, 'REPAIR', 'Storage integrity repair blocked'\);/);
});
