import test from 'node:test';
import assert from 'node:assert/strict';

import { isProtectedEndpointAuthFailureValue } from './protected-endpoint-auth.ts';

test('treats protected endpoint 401 api-key failures as auth blockers', () => {
  assert.equal(isProtectedEndpointAuthFailureValue({
    status: 401,
    diagnostic: {
      backendMessage: 'Missing or invalid API key',
      bodySnippet: '{"message":"Missing or invalid API key"}',
    },
  }), true);
});

test('treats missing LMS admin key config errors as auth blockers too', () => {
  const error = new Error(
    'LMS is missing LUMO_ADMIN_API_KEY, so it cannot authenticate to protected API endpoints. Add the same admin key to the LMS deployment env and redeploy.',
  );

  assert.equal(isProtectedEndpointAuthFailureValue(error), true);
});

test('does not misclassify unrelated request failures as auth blockers', () => {
  assert.equal(isProtectedEndpointAuthFailureValue({
    status: 500,
    diagnostic: {
      backendMessage: 'database offline',
      bodySnippet: '{"message":"database offline"}',
    },
  }), false);
});
