import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const adminFormsSource = readFileSync(fileURLToPath(new URL('./admin-forms.tsx', import.meta.url)), 'utf8');
const clientSource = readFileSync(fileURLToPath(new URL('./admin-update-forms-client.tsx', import.meta.url)), 'utf8');

test('module forms clamp legacy lifecycle states onto deploy-safe options before rendering', () => {
  assert.match(
    adminFormsSource,
    /import \{ normalizeModuleLifecycleStatus \} from '\.\.\/lib\/module-status';/,
    'module forms should share one status clamp instead of hand-rolling fallback logic',
  );

  assert.match(
    adminFormsSource,
    /<LifecycleStatusField name="status" value=\{normalizeModuleLifecycleStatus\(initialStatus\)\} options=\{\[\.\.\.MODULE_LIFECYCLE_OPTIONS\]\} entityLabel="module" \/>/,
    'create module should clamp legacy lifecycle seeds before the UI renders the status picker',
  );

  assert.match(
    adminFormsSource,
    /return <UpdateModuleFormClient modules=\{modules\} returnPath=\{returnPath\} \/>;/,
    'server admin forms should delegate module editing to the client form that can react to selection changes',
  );

  assert.match(
    clientSource,
    /<LifecycleStatusField key=\{`module-status-\$\{selectedModule\?\.id \?\? 'no-module'\}`\} name="status" value=\{normalizeModuleLifecycleStatus\(selectedModule\?\.status\)\} options=\{\[\.\.\.MODULE_LIFECYCLE_OPTIONS\]\} entityLabel="module" \/>/,
    'update module should still clamp stored legacy lifecycle states before the picker serializes a blocked value back to actions',
  );
});
