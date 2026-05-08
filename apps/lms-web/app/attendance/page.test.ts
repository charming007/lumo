import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const attendancePageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('attendance page hard-blocks when production API wiring is unsafe', () => {
  assert.match(attendancePageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'attendance page should block when the LMS API base is unsafe for production');
  assert.match(attendancePageSource, /Deployment blocker: attendance API base URL is unsafe for production\./, 'attendance page should call out the exact deployment blocker');
  assert.match(attendancePageSource, /NEXT_PUBLIC_API_BASE_URL/, 'attendance blocker should name the missing production env');
});

test('attendance page degrades instead of hard-failing on feed outages', () => {
  assert.match(attendancePageSource, /Promise\.allSettled\(\[/, 'attendance page should use Promise.allSettled for feed recovery');
  assert.match(attendancePageSource, /const failedSources = \[/, 'attendance page should surface failed feed labels');
  assert.match(attendancePageSource, /Attendance is running in degraded mode:/, 'attendance page should show an operator-facing degraded-state banner');
  assert.match(attendancePageSource, /eyebrow=\{failedSources\.length \? 'Degraded mode' : 'Live API'\}/, 'attendance snapshot should advertise degraded mode when live feeds are missing');
});

test('attendance page pauses capture when the learner roster is unavailable', () => {
  assert.match(attendancePageSource, /const canCaptureAttendance = students\.length > 0;/, 'attendance page should gate capture on roster availability');
  assert.match(attendancePageSource, /Attendance capture is paused until the learner roster loads again\./, 'attendance page should explain why capture is paused');
  assert.match(attendancePageSource, /Attendance feed unavailable right now\./, 'attendance page should keep the table honest when records are missing');
  assert.match(attendancePageSource, /emptyAttendanceRows\(/, 'attendance page should centralize honest empty-table rows instead of rendering misleading blanks');
});
