import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const attendancePageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('attendance page degrades instead of hard-failing on feed outages', () => {
  assert.match(attendancePageSource, /Promise\.allSettled\(\[/, 'attendance page should use Promise.allSettled for feed recovery');
  assert.match(attendancePageSource, /const failedSources = \[/, 'attendance page should surface failed feed labels');
  assert.match(attendancePageSource, /Attendance is running in degraded mode:/, 'attendance page should show an operator-facing degraded-state banner');
});

test('attendance page pauses capture when the learner roster is unavailable', () => {
  assert.match(attendancePageSource, /const canCaptureAttendance = students\.length > 0;/, 'attendance page should gate capture on roster availability');
  assert.match(attendancePageSource, /Attendance capture is paused until the learner roster loads again\./, 'attendance page should explain why capture is paused');
  assert.match(attendancePageSource, /Attendance feed unavailable right now\./, 'attendance page should keep the table honest when records are missing');
});
