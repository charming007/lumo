import Link from 'next/link';
import { LessonEditorForm } from '../../../../components/lesson-editor-form';
import { fetchCurriculumModules, fetchLesson, fetchSubjects } from '../../../../lib/api';
import { Card, PageShell, Pill } from '../../../../lib/ui';
import { updateLessonAction } from '../../../actions';

function statusTone(status: string) {
  if (status === 'published' || status === 'approved') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lesson, subjects, modules] = await Promise.all([
    fetchLesson(id),
    fetchSubjects(),
    fetchCurriculumModules(),
  ]);

  return (
    <PageShell
      title={lesson.title}
      subtitle="Full lesson authoring editor for objectives, localization, assessment prompts, and activity steps. This is the real content surface, not the toy status-only edit form."
      breadcrumbs={[
        { label: 'Content Library', href: '/content' },
        { label: 'Lesson inventory', href: '/content' },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={lesson.subjectName ?? 'Unknown subject'} />
          <Pill label={lesson.moduleTitle ?? 'Unmapped module'} tone="#F8FAFC" text="#334155" />
          <Pill label={lesson.status} tone={statusTone(lesson.status).tone} text={statusTone(lesson.status).text} />
        </div>
      }
    >
      <section style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Lesson payload snapshot" eyebrow="What this pack already carries">
          <div style={{ display: 'grid', gap: 12 }}>
            <div><strong>Duration:</strong> {lesson.durationMinutes} min</div>
            <div><strong>Mode:</strong> {lesson.mode}</div>
            <div><strong>Voice persona:</strong> {lesson.voicePersona ?? '—'}</div>
            <div><strong>Target age:</strong> {lesson.targetAgeRange ?? '—'}</div>
            <div><strong>Objectives:</strong></div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
              {(lesson.learningObjectives ?? []).map((objective) => <li key={objective}>{objective}</li>)}
            </ul>
          </div>
        </Card>

        <Card title="Delivery contract" eyebrow="What learner-facing clients will receive">
          <div style={{ display: 'grid', gap: 12 }}>
            {(lesson.activitySteps ?? []).map((step) => (
              <div key={step.id} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <strong>{step.title ?? step.prompt}</strong>
                  <span style={{ color: '#7C3AED', fontWeight: 700 }}>{step.durationMinutes ?? 0} min</span>
                </div>
                <div style={{ color: '#475569', lineHeight: 1.6 }}>{step.detail ?? step.prompt}</div>
                <div style={{ marginTop: 8, color: '#64748B' }}>{step.type} • Evidence: {step.evidence ?? '—'}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <LessonEditorForm lesson={lesson} subjects={subjects} modules={modules} action={updateLessonAction} returnPath={`/content/lessons/${lesson.id}`} />

      <div style={{ marginTop: 18 }}>
        <Link href="/content" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>← Back to content library</Link>
      </div>
    </PageShell>
  );
}
