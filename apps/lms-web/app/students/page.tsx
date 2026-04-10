import { CreateStudentForm, UpdateStudentForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCohorts, fetchMallams, fetchPods, fetchStudents, fetchWorkboard } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function tone(status: string) {
  if (status === 'ready') return ['#DCFCE7', '#166534'] as const;
  if (status === 'watch') return ['#FEF3C7', '#92400E'] as const;
  return ['#E0E7FF', '#3730A3'] as const;
}

export default async function StudentsPage({ searchParams }: { searchParams?: Promise<{ message?: string; edit?: string }> }) {
  const query = await searchParams;
  const [students, workboard, cohorts, pods, mallams] = await Promise.all([
    fetchStudents(),
    fetchWorkboard(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);

  const selectedStudent = students.find((student) => student.id === query?.edit) ?? students[0];
  const flaggedLearners = students.filter((student) => student.attendanceRate < 0.85).length;

  return (
    <PageShell
      title="Learners"
      subtitle="Roster operations, assignment/reassignment, and readiness signals for the live admin desk."
      aside={
        <ModalLauncher
          buttonLabel="Add Student"
          title="Add learner"
          description="Create a new learner without leaving the roster view."
        >
          <CreateStudentForm cohorts={cohorts} pods={pods} mallams={mallams} />
        </ModalLauncher>
      }
    >
      <FeedbackBanner message={query?.message} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Learners live', value: String(students.length), note: 'Across the current seeded cohorts' },
          { label: 'Below attendance comfort zone', value: String(flaggedLearners), note: 'Needs guardian follow-up or scheduling fix' },
          { label: 'Ready to progress', value: String(workboard.filter((item) => item.progressionStatus === 'ready').length), note: 'Good candidates for the next module gate' },
          { label: 'Watchlist', value: String(workboard.filter((item) => item.progressionStatus === 'watch').length), note: 'Keep mallam coaching visible this week' },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.note}</div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Learner roster" eyebrow="Profiles + quick ownership scan">
          <SimpleTable
            columns={['Learner', 'Cohort', 'Mallam', 'Pod', 'Attendance', 'Level', 'Actions']}
            rows={students.map((student) => [
              <strong key={student.id}>{student.name}</strong>,
              student.cohortName ?? '—',
              student.mallamName ?? '—',
              student.podLabel ?? '—',
              `${Math.round(student.attendanceRate * 100)}%`,
              `${student.level} · ${student.stage}`,
              <div key={`${student.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <a href={`/students/${student.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
                <a href={`/students?edit=${student.id}`} style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>Edit learner</a>
              </div>,
            ])}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Learner support queue" eyebrow="Actionable">
          <SimpleTable
            columns={['Learner', 'Focus area', 'Attendance', 'Mastery', 'Progression', 'Next module']}
            rows={workboard.map((item) => {
              const [pillTone, pillText] = tone(item.progressionStatus);
              return [
                item.studentName,
                item.focus,
                `${Math.round(item.attendanceRate * 100)}%`,
                `${Math.round(item.mastery * 100)}%`,
                <Pill key={item.id} label={item.progressionStatus} tone={pillTone} text={pillText} />,
                item.recommendedNextModuleTitle ?? '—',
              ];
            })}
          />
        </Card>

        {selectedStudent ? (
          <UpdateStudentForm student={selectedStudent} cohorts={cohorts} pods={pods} mallams={mallams} title={`Edit learner · ${selectedStudent.name}`} />
        ) : (
          <Card title="Edit learner" eyebrow="No learner available yet">
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>Create a learner first to unlock edit controls.</div>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
