import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSubjectMutationPayload } from './subject-lifecycle.ts';

test('subject lifecycle form mapping preserves an explicit non-draft status during update saves', () => {
  const formData = new FormData();
  formData.set('name', 'Foundational Science');
  formData.set('icon', 'biotech');
  formData.set('order', '4');
  formData.set('status', 'published');

  assert.deepEqual(buildSubjectMutationPayload(formData), {
    name: 'Foundational Science',
    icon: 'biotech',
    order: 4,
    status: 'published',
  });
});

test('subject lifecycle form mapping keeps create-only fields and falls back to draft only when status is actually absent', () => {
  const formData = new FormData();
  formData.set('id', 'science');
  formData.set('name', 'Foundational Science');
  formData.set('icon', '');
  formData.set('order', '4');
  formData.set('initialStrandName', 'Observation & Discovery');

  assert.deepEqual(buildSubjectMutationPayload(formData, {
    includeId: true,
    includeInitialStrandName: true,
  }), {
    id: 'science',
    name: 'Foundational Science',
    icon: '',
    order: 4,
    status: 'draft',
    initialStrandName: 'Observation & Discovery',
  });
});
