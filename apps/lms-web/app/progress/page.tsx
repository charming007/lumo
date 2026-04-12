import type { ReactNode } from 'react';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ProgressCaptureForm, ProgressUpdateForm } from '../../components/progress-form';
import { fetchCurriculumModules, fetchProgress, fetchStudents, fetchSubjects } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function emptyProgressRows(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '', '']];
}

export default async function ProgressPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [progressResult, studentsResult, subjectsResult, modulesResult] = await Promise.allSettled([
    fetchProgress(),
    fetchStudents(),
    fetchSubjects(),
    fetchCurriculumModules(),
  ]);

  const progress = progressResult.status === 'fulfilled' ? progressResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const failedSources = [
    progressResult.status === 'rejected' ? 'progress board' : null,
    studentsResult.status === 'rejected' ? 'learners' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
  ].filter(Boolean);
  const canCaptureProgress = students.length > 0 && subjects.length > 0 && modules.length > 0;

  return (
    <PageShell title="Progress" subtitle="Track mastery, progression readiness, and next curriculum moves across learners.">
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Progress is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}
      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Mastery board" eyebrow="Readiness operations">
          <SimpleTable
            columns={['Student', 'Subject', 'Module', 'Mastery', 'Lessons completed', 'Progression', 'Next module']}
            rows={progress.length ? progress.map((item) => [
              item.studentName,
              item.subjectName,
              item.moduleTitle ?? '—',
              `${Math.round(item.mastery * 100)}%`,
              String(item.lessonsCompleted),
              <Pill key={item.id} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
              item.recommendedNextModuleTitle ?? '—',
            ]) : emptyProgressRows('Progress data is unavailable right now.')}
          />
        </Card>
        <div style={{ display: 'grid', gap: 16 }}>
          {canCaptureProgress ? (
            <ProgressCaptureForm students={students} subjects={subjects} modules={modules} />
          ) : (
            <Card title="Capture progress" eyebrow="Unavailable right now">
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                Progress capture is paused until the learner, subject, and module lists load again. Better a clear pause than poisoned records.
              </div>
            </Card>
          )}
          {progress.length && modules.length ? <ProgressUpdateForm progress={progress} modules={modules} /> : null}
        </div>
      </section>
    </PageShell>
  );
}
