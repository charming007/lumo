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

test('attendance page hard-blocks when the live attendance register or learner roster feeds degrade', () => {
  assert.match(attendancePageSource, /const criticalAttendanceFailures = \[/, 'attendance page should collect critical attendance feed failures explicitly');
  assert.match(attendancePageSource, /recordsResult\.status === 'rejected' \? 'attendance records' : null/, 'attendance page should treat the live attendance register as critical');
  assert.match(attendancePageSource, /studentsResult\.status === 'rejected' \? 'students' : null/, 'attendance page should treat the learner roster as critical too');
  assert.match(attendancePageSource, /if \(criticalAttendanceFailures\.length\)/, 'attendance page should branch into a blocker when either critical attendance feed fails');
  assert.match(attendancePageSource, /Deployment blocker: attendance operations feeds are degraded\./, 'attendance page should name the attendance-operations outage as a deployment blocker');
  assert.match(attendancePageSource, /live attendance register or learner roster is degraded/, 'attendance page should explain that roster blindness is just as blocking as register blindness');
});

test('attendance page still degrades gracefully when only supporting feeds are missing', () => {
  assert.match(attendancePageSource, /Promise\.allSettled\(\[/, 'attendance page should use Promise.allSettled for feed recovery');
  assert.match(attendancePageSource, /const failedSources = \[/, 'attendance page should surface failed feed labels');
  assert.match(attendancePageSource, /Attendance is running in degraded mode:/, 'attendance page should still show an operator-facing degraded-state banner for non-critical feed issues');
  assert.match(attendancePageSource, /eyebrow=\{failedSources\.length \? 'Degraded mode' : 'Live API'\}/, 'attendance snapshot should advertise degraded mode when supporting feeds are missing');
});

test('attendance page still pauses capture when no learners are currently available', () => {
  assert.match(attendancePageSource, /const canCaptureAttendance = students\.length > 0;/, 'attendance page should gate capture on roster availability');
  assert.match(attendancePageSource, /Attendance capture is paused until the learner roster loads again\./, 'attendance page should explain why capture is paused');
  assert.match(attendancePageSource, /emptyAttendanceRows\(/, 'attendance page should centralize honest empty-table rows instead of rendering misleading blanks');
});
