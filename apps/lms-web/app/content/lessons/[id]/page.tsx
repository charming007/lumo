import Link from 'next/link';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { LessonEditorForm } from '../../../../components/lesson-editor-form';
import { fetchCurriculumModules, fetchLesson, fetchSubjects } from '../../../../lib/api';
import { Card, PageShell, Pill } from '../../../../lib/ui';
import { updateLessonAction } from '../../../actions';

function statusTone(status: string) {
  if (status === 'published' || status === 'approved') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function normalizeSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string; from?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [lesson, subjects, modules] = await Promise.all([
    fetchLesson(id),
    fetchSubjects(),
    fetchCurriculumModules(),
  ]);

  const message = normalizeSearchParam(query?.message);
  const returnPath = normalizeSearchParam(query?.from) || '/content';
  const localization = lesson.localization as {
    locale?: string;
    supportLanguage?: string;
    supportLanguageLabel?: string;
    notes?: string[];
  } | null;
  const assessmentItems = lesson.lessonAssessment?.items ?? [];

  return (
    <PageShell
      title={lesson.title}
      subtitle="Full lesson authoring editor for objectives, localization, assessment prompts, and activity steps. This is the real content surface, not the toy status-only edit form."
      breadcrumbs={[
        { label: 'Content Library', href: '/content' },
        { label: 'Lesson inventory', href: '/content' },
        { label: lesson.title, href: `/content/lessons/${lesson.id}` },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={lesson.subjectName ?? 'Unknown subject'} />
          <Pill label={lesson.moduleTitle ?? 'Unmapped module'} tone="#F8FAFC" text="#334155" />
          <Pill label={lesson.status} tone={statusTone(lesson.status).tone} text={statusTone(lesson.status).text} />
          <Link href={`/content/lessons/new?duplicate=${lesson.id}`} style={{ borderRadius: 999, padding: '8px 12px', background: '#EEF2FF', color: '#3730A3', textDecoration: 'none', fontWeight: 700 }}>
            Duplicate as new
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={message} />

      <section style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gap: 16 }}>
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

          <Card title="Authoring contract" eyebrow="The metadata that actually drives delivery">
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 14, borderRadius: 16, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#1D4ED8', marginBottom: 8 }}>Localization</div>
                <div style={{ color: '#334155', lineHeight: 1.7 }}>
                  <strong>{localization?.supportLanguageLabel ?? 'Support language unset'}</strong>
                  {localization?.supportLanguage ? ` (${localization.supportLanguage})` : ''}
                  <div style={{ marginTop: 6 }}>Locale: {localization?.locale ?? 'en-NG'}</div>
                </div>
                {localization?.notes?.length ? (
                  <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
                    {localization.notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                ) : <div style={{ marginTop: 10, color: '#64748b' }}>No localization notes yet.</div>}
              </div>

              <div style={{ padding: 14, borderRadius: 16, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#6D28D9', marginBottom: 8 }}>Assessment pack</div>
                <div style={{ color: '#334155', lineHeight: 1.7 }}>
                  <strong>{lesson.lessonAssessment?.title ?? 'Assessment title unset'}</strong>
                  <div style={{ marginTop: 6 }}>Kind: {lesson.lessonAssessment?.kind ?? 'observational'} • {assessmentItems.length} item{assessmentItems.length === 1 ? '' : 's'}</div>
                </div>
                {assessmentItems.length ? (
                  <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
                    {assessmentItems.map((item) => <li key={item.id}>{item.prompt}{item.evidence ? ` • ${item.evidence}` : ''}</li>)}
                  </ul>
                ) : <div style={{ marginTop: 10, color: '#64748b' }}>No assessment items wired yet.</div>}
              </div>
            </div>
          </Card>
        </div>

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
                {step.choices && step.choices.length > 0 ? (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {step.choices.map((choice) => (
                      <span key={choice.id} style={{ padding: '6px 10px', borderRadius: 999, background: choice.isCorrect ? '#DCFCE7' : '#F8FAFC', color: choice.isCorrect ? '#166534' : '#334155', fontWeight: 700, fontSize: 12 }}>
                        {choice.label}{choice.isCorrect ? ' ✓' : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
                {step.media && step.media.length > 0 ? (
                  <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                    {step.media.map((item, index) => (
                      <div key={`${step.id}-media-${index}`} style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>
                        Media cue: {item.kind} • {Array.isArray(item.value) ? item.value.join(', ') : String(item.value ?? '—')}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <LessonEditorForm lesson={lesson} subjects={subjects} modules={modules} action={updateLessonAction} returnPath={`/content/lessons/${lesson.id}`} />

      <div style={{ marginTop: 18 }}>
        <Link href={returnPath} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>← Back to {returnPath === '/english' ? 'English curriculum studio' : 'content library'}</Link>
      </div>
    </PageShell>
  );
}
