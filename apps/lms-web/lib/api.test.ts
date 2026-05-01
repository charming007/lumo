import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiSource = readFileSync(resolve('apps/lms-web/lib/api.ts'), 'utf8');

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
