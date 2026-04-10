import { ReassignAssignmentForm } from '../../components/admin-forms';
import { CreateAssignmentForm } from '../../components/create-assignment-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchAssignments, fetchAssessments, fetchCohorts, fetchLessons, fetchMallams } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function AssignmentsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [assignments, cohorts, lessons, mallams, assessments] = await Promise.all([
    fetchAssignments(),
    fetchCohorts(),
    fetchLessons(),
    fetchMallams(),
    fetchAssessments(),
  ]);

  return (
    <PageShell title="Assignments" subtitle="Manage lesson delivery across centers, cohorts, and assessment gates with live create + update flows.">
      <FeedbackBanner message={query?.message} />
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20 }}>
        <Card title="Assignment board" eyebrow="Delivery control">
          <SimpleTable
            columns={['Lesson', 'Cohort', 'Pod', 'Assessment', 'Mallam', 'Due date', 'Status']}
            rows={assignments.map((item) => [
              item.lessonTitle,
              item.cohortName,
              item.podLabel ?? '—',
              item.assessmentTitle ?? '—',
              item.teacherName,
              item.dueDate,
              <Pill key={item.id} label={item.status} tone={item.status === 'active' ? '#DCFCE7' : item.status === 'scheduled' ? '#E0E7FF' : '#E5E7EB'} text={item.status === 'active' ? '#166534' : item.status === 'scheduled' ? '#3730A3' : '#334155'} />,
            ])}
          />
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <CreateAssignmentForm cohorts={cohorts} lessons={lessons} mallams={mallams} assessments={assessments} />
          {assignments[0] ? <ReassignAssignmentForm assignment={assignments[0]} cohorts={cohorts} mallams={mallams} /> : null}
        </div>
      </section>
    </PageShell>
  );
}
