import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const settingsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('settings hard-blocks when protected asset runtime audit auth is missing', () => {
  assert.match(
    settingsPageSource,
    /if \(assetRuntimeAuthBlocked\) \{/,
    'settings should return a blocker card instead of rendering the trust center when protected audit auth is broken',
  );
  assert.match(
    settingsPageSource,
    /title="Settings"[\s\S]*blockerHeadline="Deployment blocker: LMS admin API key cannot unlock settings audit feeds\./,
    'settings should call out the exact protected-audit deployment blocker',
  );
  assert.match(
    settingsPageSource,
    /LUMO_ADMIN_API_KEY/,
    'settings blocker should name the admin key operators must fix before trusting the route again',
  );
  assert.doesNotMatch(
    settingsPageSource,
    /Settings is blocked on protected audit auth:[\s\S]*<PageShell/,
    'settings should not fall through to the full trust-center shell after declaring the protected audit auth blocker',
  );
});
