import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('progress page blocks when the LMS API base is unsafe for production', () => {
  assert.match(source, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'progress page should block when the LMS API base is unsafe for production');
  assert.match(source, /Deployment blocker: progress API base URL is unsafe for production\./, 'progress page should explain the unsafe API base blocker');
});

test('progress page blocks when core progression feeds are degraded', () => {
  assert.match(source, /const criticalProgressFailures = \[/, 'progress page should identify critical progression feeds');
  assert.match(source, /progressResult\.status === 'rejected' \? 'progress board' : null/, 'progress board failures should be treated as critical');
  assert.match(source, /studentsResult\.status === 'rejected' \? 'learners' : null/, 'learner roster failures should be treated as critical');
  assert.match(source, /subjectsResult\.status === 'rejected' \? 'subjects' : null/, 'subject feed failures should be treated as critical');
  assert.match(source, /modulesResult\.status === 'rejected' \? 'modules' : null/, 'module feed failures should be treated as critical');
  assert.match(source, /if \(criticalProgressFailures\.length\)/, 'progress page should hard-block when core progression feeds degrade');
  assert.match(source, /Deployment blocker: progression feeds are degraded\./, 'progress page should render a degraded-feed blocker headline');
});

test('progress page uses subject-drift-safe filtering', () => {
  assert.match(source, /import \{ matchesSubjectFilter \} from '\.\.\/\.\.\/lib\/module-subject-match';/);
  assert.match(
    source,
    /const subjectMatches = matchesSubjectFilter\(subjectFilter, subjects, \{\s*subjectIds: \[item\.subjectId\],\s*subjectNames: \[item\.subjectName\],\s*\}\);/s,
  );
  assert.doesNotMatch(source, /item\.subjectId === subjectFilter/);
});

test('progress page normalizes progression status before filtering and badge tone rendering', () => {
  assert.match(source, /import \{ formatProgressionStatusLabel, normalizeProgressionStatus, progressionStatusTone \} from '\.\.\/\.\.\/lib\/progression-status';/);
  assert.match(source, /const statusMatches = !statusFilter \|\| normalizeProgressionStatus\(item\.progressionStatus\) === statusFilter;/);
  assert.match(source, /label=\{formatProgressionStatusLabel\(item\.progressionStatus\)\}/);
  assert.match(source, /tone=\{progressionStatusTone\(item\.progressionStatus\)\.tone\}/);
  assert.match(source, /text=\{progressionStatusTone\(item\.progressionStatus\)\.text\}/);
  assert.doesNotMatch(source, /item\.progressionStatus === statusFilter/);
});

test('progress page surfaces override audit context in the mastery board', () => {
  assert.match(source, /function formatOverrideAuditSummary\(item:/, 'progress page should format override provenance for board rows');
  assert.match(source, /columns=\{\['Student', 'Subject', 'Module', 'Mastery', 'Lessons completed', 'Progression', 'Override audit', 'Next module'\]\}/, 'mastery board should include an override audit column');
  assert.match(source, /item\.override\?\.actorName/, 'override audit should surface the acting admin when available');
  assert.match(source, /item\.override\?\.reason/, 'override audit should surface the override reason when available');
  assert.match(source, /formatOverrideAuditSummary\(item\)/, 'mastery board rows should render the override audit summary inline');
});
