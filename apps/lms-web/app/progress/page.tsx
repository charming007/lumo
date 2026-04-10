import { FeedbackBanner } from '../../components/feedback-banner';
import { ProgressCaptureForm, ProgressUpdateForm } from '../../components/progress-form';
import { fetchCurriculumModules, fetchProgress, fetchStudents, fetchSubjects } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function ProgressPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [progress, students, subjects, modules] = await Promise.all([fetchProgress(), fetchStudents(), fetchSubjects(), fetchCurriculumModules()]);

  return (
    <PageShell title="Progress" subtitle="Track mastery, progression readiness, and next curriculum moves across learners.">
      <FeedbackBanner message={query?.message} />
      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Mastery board" eyebrow="Readiness operations">
          <SimpleTable
            columns={['Student', 'Subject', 'Module', 'Mastery', 'Lessons completed', 'Progression', 'Next module']}
            rows={progress.map((item) => [
              item.studentName,
              item.subjectName,
              item.moduleTitle ?? '—',
              `${Math.round(item.mastery * 100)}%`,
              String(item.lessonsCompleted),
              <Pill key={item.id} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
              item.recommendedNextModuleTitle ?? '—',
            ])}
          />
        </Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <ProgressCaptureForm students={students} subjects={subjects} modules={modules} />
          <ProgressUpdateForm progress={progress} modules={modules} />
        </div>
      </section>
    </PageShell>
  );
}
