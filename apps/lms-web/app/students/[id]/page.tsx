import { notFound } from 'next/navigation';
import { ObservationForm } from '../../../components/observation-form';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { LearnerMallamAssignmentForm } from '../../../components/learner-mallam-assignment-form';
import { fetchMallams, fetchStudent } from '../../../lib/api';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../../lib/ui';

export default async function StudentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;

  try {
    const [student, mallams] = await Promise.all([fetchStudent(id), fetchMallams()]);

    return (
      <PageShell
        title={student.name}
        subtitle="Learner detail view with progress, attendance, live assignments, and mallam observations in one place."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Learners', href: '/students' },
          { label: student.name },
        ]}
      >
        <FeedbackBanner message={query?.message} />
        <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
          <Card title="Learner snapshot" eyebrow="Profile">
            <div style={{ ...responsiveGrid(180), gap: 12 }}>
              {[
                ['Cohort', student.cohortName ?? '—'],
                ['Mallam', student.mallamName ?? '—'],
                ['Pod', student.podLabel ?? '—'],
                ['Guardian', student.guardianName ?? '—'],
                ['Device', student.deviceAccess ?? '—'],
                ['Stage', `${student.level} · ${student.stage}`],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>{label}</div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Intervention summary" eyebrow="What to do next">
            <div style={{ ...responsiveGrid(160), gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 14, borderRadius: 16, background: '#eef2ff' }}><strong>{Math.round(student.summary.attendanceRate * 100)}%</strong><div style={{ color: '#64748b' }}>Attendance</div></div>
              <div style={{ padding: 14, borderRadius: 16, background: '#ecfeff' }}><strong>{student.summary.latestMastery !== null ? `${Math.round(student.summary.latestMastery * 100)}%` : '—'}</strong><div style={{ color: '#64748b' }}>Latest mastery</div></div>
              <div style={{ padding: 14, borderRadius: 16, background: '#fef3c7' }}><strong>{student.summary.activeAssignments}</strong><div style={{ color: '#64748b' }}>Active assignments</div></div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {student.recommendedActions.map((action) => (
                <div key={action} style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>{action}</div>
              ))}
            </div>
          </Card>
        </section>

        <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
          <Card title="Progress timeline" eyebrow="Mastery + readiness">
            <SimpleTable
              columns={['Subject', 'Module', 'Mastery', 'Lessons', 'Progression', 'Next module']}
              rows={student.progress.map((item) => [
                item.subjectName,
                item.moduleTitle ?? '—',
                `${Math.round(item.mastery * 100)}%`,
                String(item.lessonsCompleted),
                <Pill key={item.id} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
                item.recommendedNextModuleTitle ?? '—',
              ])}
            />
          </Card>

          <LearnerMallamAssignmentForm student={student} mallams={mallams} returnPath={`/students/${student.id}`} />
          <ObservationForm studentId={student.id} />
        </section>

        <section style={{ ...responsiveGrid(320) }}>
          <Card title="Attendance history" eyebrow="Recent sessions">
            <SimpleTable columns={['Date', 'Status']} rows={student.attendance.map((item) => [item.date, item.status])} />
          </Card>
          <Card title="Active delivery" eyebrow="Assignments + observations">
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {student.assignments.map((assignment) => (
                <div key={assignment.id} style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <strong>{assignment.lessonTitle}</strong>
                  <div style={{ color: '#64748b', marginTop: 4 }}>{assignment.teacherName} • due {assignment.dueDate}</div>
                </div>
              ))}
            </div>
            <SimpleTable columns={['When', 'Support', 'Note']} rows={student.observations.map((item) => [new Date(item.createdAt).toLocaleString('en-GB'), item.supportLevel, item.note])} />
          </Card>
        </section>
      </PageShell>
    );
  } catch {
    notFound();
  }
}
