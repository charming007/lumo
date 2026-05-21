import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./admin-forms.tsx', import.meta.url)), 'utf8');

test('module forms clamp legacy lifecycle states onto deploy-safe options before rendering', () => {
  assert.match(
    source,
    /import \{ normalizeModuleLifecycleStatus \} from '\.\.\/lib\/module-status';/,
    'module forms should share one status clamp instead of hand-rolling fallback logic',
  );

  assert.match(
    source,
    /<LifecycleStatusField name="status" value=\{normalizeModuleLifecycleStatus\(initialStatus\)\} options=\{\[\.\.\.MODULE_LIFECYCLE_OPTIONS\]\} entityLabel="module" \/>/,
    'create module should clamp legacy lifecycle seeds before the UI renders the status picker',
  );

  assert.match(
    source,
    /<LifecycleStatusField name="status" value=\{normalizeModuleLifecycleStatus\(module\?\.status\)\} options=\{\[\.\.\.MODULE_LIFECYCLE_OPTIONS\]\} entityLabel="module" \/>/,
    'update module should clamp stored legacy lifecycle states before the picker serializes a blocked value back to actions',
  );
});
