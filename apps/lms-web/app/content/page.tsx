import { CreateModuleForm, UpdateLessonForm, UpdateModuleForm } from '../../components/admin-forms';
import { DynamicLessonCreateForm } from '../../components/content-ops-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchCurriculumModules, fetchLessons, fetchSubjects } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';
import { createLessonAction } from '../actions';

export default async function ContentPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [modules, lessons, subjects] = await Promise.all([fetchCurriculumModules(), fetchLessons(), fetchSubjects()]);
  const publishedCount = modules.filter((module) => module.status === 'published').length;
  const draftLessons = lessons.filter((lesson) => lesson.status === 'draft').length;

  return (
    <PageShell title="Content Library" subtitle="Curriculum publishing, lesson inventory, module readiness, and actual admin write/edit controls for the content pipeline.">
      <FeedbackBanner message={query?.message} />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        <Card title={String(modules.length)} eyebrow="Modules"><div style={{ color: '#64748b' }}>Across English, numeracy, and life skills strands.</div></Card>
        <Card title={String(publishedCount)} eyebrow="Published"><div style={{ color: '#64748b' }}>Ready for pod deployment now.</div></Card>
        <Card title={String(draftLessons)} eyebrow="Draft lessons"><div style={{ color: '#64748b' }}>Still waiting for approval or release.</div></Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 16, marginBottom: 20 }}>
        <Card title="Publishing overview" eyebrow="Curriculum status">
          <div style={{ display: 'grid', gap: 14 }}>
            {modules.map((module) => (
              <div key={module.id} style={{ padding: 16, borderRadius: 18, border: '1px solid #eef2f7', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <strong>{module.title}</strong>
                  <Pill label={module.status} tone={module.status === 'published' ? '#DCFCE7' : module.status === 'review' ? '#FEF3C7' : '#E0E7FF'} text={module.status === 'published' ? '#166534' : module.status === 'review' ? '#92400E' : '#3730A3'} />
                </div>
                <div style={{ color: '#64748b' }}>{module.subjectName} • {module.strandName} • {module.level}</div>
                <div style={{ marginTop: 8 }}>Lesson count: {module.lessonCount}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Lessons ready for deployment" eyebrow="Lesson inventory">
          <SimpleTable
            columns={['Lesson', 'Subject', 'Module', 'Mode', 'Duration', 'Status']}
            rows={lessons.map((lesson) => [
              lesson.title,
              lesson.subjectName ?? '—',
              lesson.moduleTitle ?? '—',
              lesson.mode,
              `${lesson.durationMinutes} min`,
              lesson.status,
            ])}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <CreateModuleForm />
        <UpdateModuleForm modules={modules} />
        <DynamicLessonCreateForm modules={modules} subjects={subjects} action={createLessonAction} />
        <UpdateLessonForm lessons={lessons} />
      </section>
    </PageShell>
  );
}