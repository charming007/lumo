import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const settingsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('settings route hard-blocks when production API wiring is unsafe', () => {
  assert.match(settingsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'settings route should block when the LMS API base is unsafe for production');
  assert.match(settingsPageSource, /Settings is blocked until NEXT_PUBLIC_API_BASE_URL is configured\./, 'settings route should call out the missing production env blocker');
  assert.match(settingsPageSource, /storage, rewards, workboard, and integrity feeds are dead/, 'settings blocker should explain why a fake-live trust cockpit is unsafe');
});

test('settings route blocks when core storage audit feeds degrade instead of leaving repair controls interactive', () => {
  assert.match(settingsPageSource, /const criticalSettingsFailures = \[/, 'settings should isolate the persistence feeds that make storage actions unsafe');
  assert.match(settingsPageSource, /if \(criticalSettingsFailures\.length\)/, 'settings should hard-block when core storage audit feeds are down');
  assert.match(settingsPageSource, /Deployment blocker: settings storage audit feeds are degraded\./, 'settings should use an explicit degraded storage-audit blocker headline');
  assert.match(settingsPageSource, /This page can create checkpoints, run integrity repair, restore backups, and delete backups\./, 'settings blocker should explain which live controls become unsafe');
  assert.match(settingsPageSource, /A nice degraded banner is bullshit here\./, 'settings blocker should call out why a warning-only fallback is not acceptable');
  assert.match(settingsPageSource, /storage control surface should stop cold when the storage audit feeds disappear\./, 'settings blocker should distinguish critical storage blindness from tolerable secondary degradation');
});

test('settings route normalizes progression status before computing ops counts and reward-surface badges', () => {
  assert.match(settingsPageSource, /import \{ formatProgressionStatusLabel, normalizeProgressionStatus, progressionStatusTone \} from '\.\.\/\.\.\/lib\/progression-status';/);
  assert.match(settingsPageSource, /const ready = workboard\.filter\(\(item\) => normalizeProgressionStatus\(item\.progressionStatus\) === 'ready'\)\.length;/);
  assert.match(settingsPageSource, /const watch = workboard\.filter\(\(item\) => normalizeProgressionStatus\(item\.progressionStatus\) === 'watch'\)\.length;/);
  assert.match(settingsPageSource, /const progressionStatus = matchingWorkboard\?\.progressionStatus \?\? 'on-track';/);
  assert.match(settingsPageSource, /<Pill key=\{item\.learnerId\} label=\{formatProgressionStatusLabel\(progressionStatus\)\} tone=\{pillTone\} text=\{pillText\} \/>/);
  assert.doesNotMatch(settingsPageSource, /workboard\.filter\(\(item\) => item\.progressionStatus === 'ready'\)|workboard\.filter\(\(item\) => item\.progressionStatus === 'watch'\)/);
});
