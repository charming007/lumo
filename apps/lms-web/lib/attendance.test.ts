import test from 'node:test';
import assert from 'node:assert/strict';

import { averageAttendancePercent, formatAttendancePercent } from './attendance.ts';

test('formatAttendancePercent renders decimal attendance rates as whole percentages', () => {
  assert.equal(formatAttendancePercent(0.92), '92%');
  assert.equal(formatAttendancePercent(0.005), '1%');
  assert.equal(formatAttendancePercent(null), '—');
});

test('averageAttendancePercent uses decimal attendance rates from the API payload', () => {
  assert.equal(averageAttendancePercent([0.92, 0.88, 0.81, 0.95]), 89);
  assert.equal(averageAttendancePercent([]), 0);
  assert.equal(averageAttendancePercent([0.4, null, undefined, Number.NaN]), 10);
});
