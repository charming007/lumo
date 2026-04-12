import Link from 'next/link';
import { LessonCreateForm } from '../../../../components/lesson-create-form';
import { fetchCurriculumModules, fetchLessons, fetchSubjects } from '../../../../lib/api';
import { Card, PageShell, Pill } from '../../../../lib/ui';
import { createLessonAction } from '../../../actions';

export default async function NewLessonPage({ searchParams }: { searchParams?: Promise<{ subjectId?: string; moduleId?: string; duplicate?: string }> }) {
  const query = await searchParams;
  const [subjects, modules, lessons] = await Promise.all([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
  ]);

  const selectedModule = modules.find((item) => item.id === query?.moduleId) ?? null;
  const duplicateLesson = lessons.find((item) => item.id === query?.duplicate) ?? null;

  return (
    <PageShell
      title="New lesson authoring pack"
      subtitle="Build the real lesson payload before creation: objectives, localization, assessment prompts, activity steps, and a sane learner flow."
      breadcrumbs={[
        { label: 'Content Library', href: '/content' },
        { label: 'New lesson', href: '/content/lessons/new' },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedModule ? <Pill label={selectedModule.title} /> : null}
          {duplicateLesson ? <Pill label={`Duplicate ${duplicateLesson.title}`} tone="#EEF2FF" text="#3730A3" /> : null}
          <Pill label="Author before create" tone="#ECFDF5" text="#166534" />
        </div>
      }
    >
      <section style={{ display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 16, marginBottom: 20 }}>
        <Card title="What changed here" eyebrow="No more tiny modal for serious content work">
          <div style={{ display: 'grid', gap: 10, color: '#475569', lineHeight: 1.7 }}>
            <div>• Create lessons in a full-screen authoring studio instead of a cramped title-only flow.</div>
            <div>• Start from reusable lesson templates or duplicate an existing lesson pack.</div>
            <div>• See timing mismatches and learner flow before the lesson ever hits the dataset.</div>
          </div>
        </Card>

        <Card title="Fast lanes" eyebrow="Entry points that don't waste your time">
          <div style={{ display: 'grid', gap: 10 }}>
            {modules.slice(0, 6).map((module) => (
              <Link key={module.id} href={`/content/lessons/new?subjectId=${module.subjectId ?? ''}&moduleId=${module.id}`} style={{ textDecoration: 'none', color: '#4F46E5', fontWeight: 700 }}>
                Start in {module.title} →
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <LessonCreateForm
        subjects={subjects}
        modules={modules}
        lessons={lessons}
        action={createLessonAction}
        initialSubjectId={query?.subjectId}
        initialModuleId={query?.moduleId}
        duplicateLessonId={query?.duplicate}
      />

      <div style={{ marginTop: 18 }}>
        <Link href="/content" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>← Back to content library</Link>
      </div>
    </PageShell>
  );
}
