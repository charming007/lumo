'use client';

import { useEffect, useMemo, useState } from 'react';
import { createAssignmentAction } from '../app/actions';
import { assessmentMatchesModule } from '../lib/module-assessment-match';
import type { Assessment, Cohort, CurriculumModule, Lesson, Mallam } from '../lib/types';
import { ActionButton } from './action-button';

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
} as const;

const buttonStyle = {
  background: '#6C63FF',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

function nextWeekDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function isReleaseReadyLesson(lesson: Lesson) {
  return lesson.status === 'approved' || lesson.status === 'published';
}

export function CreateAssignmentForm({ cohorts, lessons, mallams, assessments }: { cohorts: Cohort[]; lessons: Lesson[]; mallams: Mallam[]; assessments: Assessment[] }) {
  const activeAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.status !== 'retired'),
    [assessments],
  );
  const eligibleLessons = useMemo(
    () => lessons.filter((lesson) => isReleaseReadyLesson(lesson)),
    [lessons],
  );

  const [lessonId, setLessonId] = useState(eligibleLessons[0]?.id ?? '');

  useEffect(() => {
    if (!eligibleLessons.some((lesson) => lesson.id === lessonId)) {
      setLessonId(eligibleLessons[0]?.id ?? '');
    }
  }, [eligibleLessons, lessonId]);

  const selectedLesson = eligibleLessons.find((lesson) => lesson.id === lessonId) ?? null;
  const selectedModule = useMemo<CurriculumModule | null>(
    () => (selectedLesson
      ? {
          id: selectedLesson.moduleId ?? '',
          title: selectedLesson.moduleTitle ?? 'Recovered lesson module',
          subjectId: selectedLesson.subjectId ?? '',
          subjectName: selectedLesson.subjectName ?? '',
          level: 'Recovered lane',
          lessonCount: 1,
          status: 'recovered-fallback',
          strandName: 'Recovered strand',
        }
      : null),
    [selectedLesson],
  );
  const matchingAssessments = useMemo(
    () => (selectedModule ? activeAssessments.filter((assessment) => assessmentMatchesModule(selectedModule, assessment)) : []),
    [activeAssessments, selectedModule],
  );
  const blockedLessons = lessons.filter((lesson) => !eligibleLessons.some((eligible) => eligible.id === lesson.id));
  const [assessmentId, setAssessmentId] = useState(matchingAssessments[0]?.id ?? '');

  useEffect(() => {
    if (!matchingAssessments.some((assessment) => assessment.id === assessmentId)) {
      setAssessmentId(matchingAssessments[0]?.id ?? '');
    }
  }, [matchingAssessments, assessmentId]);

  const formLocked = !eligibleLessons.length;

  return (
    <form action={createAssignmentAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <div>
        <h2 style={{ margin: 0 }}>Create assignment</h2>
        <div style={{ color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
          Publish a clean delivery window: lesson, cohort, mallam owner, assessment gate, and due date in one go.
        </div>
      </div>

      <div style={{ padding: 14, borderRadius: 16, background: formLocked ? '#fff7ed' : '#eff6ff', border: `1px solid ${formLocked ? '#fed7aa' : '#bfdbfe'}`, color: formLocked ? '#9a3412' : '#1d4ed8', lineHeight: 1.6 }}>
        {formLocked
          ? 'Assignment publishing is paused because there is no release-ready lesson yet. Approve or publish the lesson first.'
          : activeAssessments.length
            ? `Only release-ready lessons are available here. ${blockedLessons.length} draft lesson${blockedLessons.length === 1 ? ' is' : 's are'} intentionally blocked from assignment.`
            : `Assessment gate data is unavailable right now, but assignment publishing is still live. ${blockedLessons.length} draft lesson${blockedLessons.length === 1 ? ' is' : 's are'} intentionally blocked from assignment.`}
      </div>

      <select name="cohortId" defaultValue={cohorts[0]?.id} style={inputStyle}>
        {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
      </select>

      <select name="lessonId" value={lessonId} onChange={(event) => setLessonId(event.target.value)} style={inputStyle} disabled={!eligibleLessons.length}>
        {eligibleLessons.length
          ? eligibleLessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title} · {lesson.moduleTitle ?? 'Unmapped module'}</option>
            ))
          : <option value="">No release-ready lessons with assessment gates</option>}
      </select>

      <select name="assignedBy" defaultValue={mallams[0]?.id} style={inputStyle}>
        {mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}
      </select>

      <select name="assessmentId" value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)} style={inputStyle}>
        <option value="">No assessment gate linked yet</option>
        {matchingAssessments.map((assessment) => (
          <option key={assessment.id} value={assessment.id}>{assessment.title} · {assessment.triggerLabel}</option>
        ))}
      </select>

      <input name="dueDate" defaultValue={nextWeekDate()} placeholder="Due date (YYYY-MM-DD)" style={inputStyle} />
      <select name="status" defaultValue="active" style={inputStyle}><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option></select>
      <ActionButton label="Save assignment" pendingLabel="Saving assignment…" style={buttonStyle} disabled={formLocked} />
      <small style={{ color: '#6b7280', lineHeight: 1.6 }}>Posts to the live API, links the lesson to a real delivery owner, and revalidates assignments, students, mallams, and dashboard views. Assessment linkage is optional when that feed is missing or the lesson has not been gated yet.</small>
    </form>
  );
}
