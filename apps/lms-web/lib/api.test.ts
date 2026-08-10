import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const apiSource = readFileSync(fileURLToPath(new URL('./api.ts', import.meta.url)), 'utf8');

test('device registrations do not swallow 404s into an empty fleet', () => {
  const match = apiSource.match(/export function fetchDeviceRegistrations[\s\S]*?\n}\n/);
  assert.ok(match, 'fetchDeviceRegistrations should exist');
  assert.ok(!match[0].includes('error instanceof ApiRequestError && error.status === 404'), 'device registrations should not special-case 404s');
  assert.ok(match[0].includes('return getJson<DeviceRegistration[]>'), 'device registrations should delegate directly to getJson');
});

test('optional geography feeds still keep their 404 fallback', () => {
  assert.match(apiSource, /export async function fetchStates\([\s\S]*?error instanceof ApiRequestError && error.status === 404[\s\S]*?return \[] as State\[];/);
  assert.match(apiSource, /export async function fetchLocalGovernments\([\s\S]*?error instanceof ApiRequestError && error.status === 404[\s\S]*?return \[] as LocalGovernment\[];/);
});

test('configured API requests do not fall back to mock payloads after live fetch failures', () => {
  assert.doesNotMatch(
    apiSource,
    /catch \(error\) \{[\s\S]*?const mockValue = getMockJson\(path\);[\s\S]*?return mockValue as T;[\s\S]*?\}/,
    'live fetch failures should surface honestly instead of quietly swapping in mock data',
  );
  assert.match(
    apiSource,
    /if \(API_BASE_SOURCE === 'local-fallback'\) \{[\s\S]*?return mockValue as T;[\s\S]*?\}/,
    'mock payloads should stay limited to explicit local fallback mode',
  );
});
