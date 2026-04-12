import type { ReactNode } from 'react';
import { ReassignAssignmentForm } from '../../components/admin-forms';
import { CreateAssignmentForm } from '../../components/create-assignment-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchAssignments, fetchAssessments, fetchCohorts, fetchLessons, fetchMallams } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function emptyAssignmentRows(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '', '']];
}

export default async function AssignmentsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [assignmentsResult, cohortsResult, lessonsResult, mallamsResult, assessmentsResult] = await Promise.allSettled([
    fetchAssignments(),
    fetchCohorts(),
    fetchLessons(),
    fetchMallams(),
    fetchAssessments(),
  ]);

  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const failedSources = [
    assignmentsResult.status === 'rejected' ? 'assignment board' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter(Boolean);
  const canCreateAssignment = cohorts.length > 0 && lessons.length > 0 && mallams.length > 0 && assessments.length > 0;

  return (
    <PageShell title="Assignments" subtitle="Manage lesson delivery across centers, cohorts, and assessment gates with live create + update flows.">
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Assignments is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20 }}>
        <Card title="Assignment board" eyebrow="Delivery control">
          <SimpleTable
            columns={['Lesson', 'Cohort', 'Pod', 'Assessment', 'Mallam', 'Due date', 'Status']}
            rows={assignments.length ? assignments.map((item) => [
              item.lessonTitle,
              item.cohortName,
              item.podLabel ?? '—',
              item.assessmentTitle ?? '—',
              item.teacherName,
              item.dueDate,
              <Pill key={item.id} label={item.status} tone={item.status === 'active' ? '#DCFCE7' : item.status === 'scheduled' ? '#E0E7FF' : '#E5E7EB'} text={item.status === 'active' ? '#166534' : item.status === 'scheduled' ? '#3730A3' : '#334155'} />,
            ]) : emptyAssignmentRows('Assignments are unavailable right now.')}
          />
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          {canCreateAssignment ? (
            <CreateAssignmentForm cohorts={cohorts} lessons={lessons} mallams={mallams} assessments={assessments} />
          ) : (
            <Card title="Create assignment" eyebrow="Unavailable right now">
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                The reference data needed to create assignments did not load cleanly yet, so the form is paused instead of letting someone publish broken delivery data.
              </div>
            </Card>
          )}
          {assignments[0] && cohorts.length && mallams.length ? <ReassignAssignmentForm assignment={assignments[0]} cohorts={cohorts} mallams={mallams} /> : null}
        </div>
      </section>
    </PageShell>
  );
}
