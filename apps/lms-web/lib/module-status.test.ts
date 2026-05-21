import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeModuleLifecycleStatus, parseModuleStatus } from './module-status.ts';

test('normalizeModuleLifecycleStatus clamps legacy live module states to published', () => {
  assert.equal(normalizeModuleLifecycleStatus('approved'), 'published');
  assert.equal(normalizeModuleLifecycleStatus('active'), 'published');
  assert.equal(normalizeModuleLifecycleStatus(' published '), 'published');
  assert.equal(normalizeModuleLifecycleStatus('review'), 'review');
  assert.equal(normalizeModuleLifecycleStatus('nonsense'), 'draft');
});

test('parseModuleStatus accepts only deploy-safe module lifecycle states', () => {
  assert.equal(parseModuleStatus('draft'), 'draft');
  assert.equal(parseModuleStatus(' review '), 'review');
  assert.equal(parseModuleStatus('published'), 'published');
  assert.equal(parseModuleStatus('approved'), null);
  assert.equal(parseModuleStatus('active'), null);
});
