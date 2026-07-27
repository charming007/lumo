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

test('attendance page keeps the board visible when attendance feeds degrade', () => {
  assert.match(attendancePageSource, /Promise\.allSettled\(\[/, 'attendance page should use Promise.allSettled for feed recovery');
  assert.match(attendancePageSource, /const failedSources = \[/, 'attendance page should surface failed feed labels');
  assert.match(attendancePageSource, /recordsResult\.status === 'rejected' \? 'attendance register' : null/, 'attendance page should name the register outage honestly');
  assert.match(attendancePageSource, /studentsResult\.status === 'rejected' \? 'learner roster' : null/, 'attendance page should name the learner-roster outage honestly');
  assert.doesNotMatch(attendancePageSource, /criticalAttendanceFailures/, 'attendance page should no longer nuke the entire route for recoverable feed outages');
  assert.match(attendancePageSource, /Attendance is running in degraded mode:/, 'attendance page should still show an operator-facing degraded-state banner');
  assert.match(attendancePageSource, /eyebrow=\{failedSources\.length \? 'Degraded mode' : 'Live API'\}/, 'attendance snapshot should advertise degraded mode when feeds are missing');
});

test('attendance page pauses capture when the learner roster is unavailable', () => {
  assert.match(attendancePageSource, /const captureDisabled = students\.length === 0;/, 'attendance page should gate capture on roster availability');
  assert.match(attendancePageSource, /eyebrow=\{captureDisabled \? 'Capture paused' : 'Live write path'\}/, 'attendance capture card should call out when writes are paused');
  assert.match(attendancePageSource, /Learner roster is unavailable right now, so attendance capture is paused instead of risking marks against missing or stale records\./, 'attendance page should explain why capture is paused');
  assert.match(attendancePageSource, /emptyAttendanceRows\(/, 'attendance page should centralize honest empty-table rows instead of rendering misleading blanks');
  assert.match(attendancePageSource, /Attendance records are temporarily unavailable\./, 'attendance table should say when the register is temporarily unavailable');
});
