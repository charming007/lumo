import Link from 'next/link';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { fetchCurriculumModules, fetchLesson, fetchSubjects } from '../../../../lib/api';
import { PageShell, Pill } from '../../../../lib/ui';
import { createLessonAction } from '../../../actions';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

const cardStyle = {
  padding: 20,
  borderRadius: 24,
  background: 'white',
  border: '1px solid #e5e7eb',
  boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
} as const;

export default async function LessonStudioCreatePage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    from?: string | string[];
    subjectId?: string | string[];
    moduleId?: string | string[];
    duplicate?: string | string[];
    createdLessonId?: string | string[];
    createdLessonTitle?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const [subjects, modules] = await Promise.all([fetchSubjects(), fetchCurriculumModules()]);

  const from = normalizeParam(query?.from) || '/content';
  const subjectId = normalizeParam(query?.subjectId) || subjects[0]?.id || '';
  const moduleId = normalizeParam(query?.moduleId) || modules.find((module) => module.subjectId === subjectId)?.id || modules[0]?.id || '';
  const duplicateLessonId = normalizeParam(query?.duplicate);
  const createdLessonId = normalizeParam(query?.createdLessonId);
  const createdLessonTitle = normalizeParam(query?.createdLessonTitle);

  const duplicateLesson = duplicateLessonId ? await fetchLesson(duplicateLessonId).catch(() => null) : null;
  const selectedModule = modules.find((module) => module.id === moduleId) ?? modules[0] ?? null;
  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? subjects.find((subject) => subject.id === selectedModule?.subjectId) ?? subjects[0] ?? null;
  const subjectModules = modules.filter((module) => module.subjectId === (selectedSubject?.id ?? subjectId));

  const initialTitle = duplicateLesson ? `${duplicateLesson.title} (Copy)` : 'Who helps in our community?';
  const initialDuration = duplicateLesson?.durationMinutes ?? 8;
  const initialMode = duplicateLesson?.mode ?? 'guided';
  const initialStatus = duplicateLesson?.status === 'published' ? 'draft' : duplicateLesson?.status ?? 'draft';
  const initialOrder = duplicateLesson?.order ?? '';

  return (
    <PageShell
      title="Lesson Studio"
      subtitle="The missing lesson authoring route is live now. Create a real lesson pack here instead of bouncing operators into a 404."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content Library', href: '/content' },
      ]}
      aside={(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={from} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
            Back to board
          </Link>
          <Link href="/canvas" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open canvas
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />

      {createdLessonId ? (
        <section style={{ ...cardStyle, marginBottom: 18, background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', border: '1px solid #c7d2fe' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#6366f1', fontWeight: 900 }}>Lesson created</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b' }}>{createdLessonTitle || 'New lesson saved'}</div>
            <div style={{ color: '#4338ca', lineHeight: 1.7 }}>
              The create flow no longer dead-ends. You can immediately open the new lesson, duplicate again, or jump back to the source board with context intact.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/content/lessons/${createdLessonId}?from=${encodeURIComponent(from)}`} style={{ borderRadius: 12, padding: '11px 14px', textDecoration: 'none', fontWeight: 800, background: '#4F46E5', color: '#ffffff' }}>
                Open lesson editor
              </Link>
              <Link href={from} style={{ borderRadius: 12, padding: '11px 14px', textDecoration: 'none', fontWeight: 800, background: '#ffffff', color: '#0f172a', border: '1px solid #dbe4ee' }}>
                Return to previous board
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)', gap: 18 }}>
        <form action={createLessonAction} style={{ ...cardStyle, display: 'grid', gap: 16 }}>
          <input type="hidden" name="returnPath" value={from} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Authoring pack</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>{duplicateLesson ? 'Duplicate lesson into a new pack' : 'Create a lesson pack'}</div>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                Subject and module context are preloaded from the link you clicked, so the LMS stops making operators reassemble state by hand.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={selectedSubject?.name ?? 'No subject'} tone="#EEF2FF" text="#3730A3" />
              <Pill label={selectedModule?.title ?? 'No module'} tone="#ECFDF5" text="#166534" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Subject
              <select name="subjectId" defaultValue={selectedSubject?.id ?? ''} style={inputStyle}>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Module
              <select name="moduleId" defaultValue={selectedModule?.id ?? ''} style={inputStyle}>
                {subjectModules.length ? subjectModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>) : modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
            Lesson title
            <input name="title" defaultValue={initialTitle} maxLength={120} style={inputStyle} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Sequence slot
              <input name="order" type="number" min="1" max="60" defaultValue={initialOrder} placeholder="Optional" style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Duration (min)
              <input name="durationMinutes" type="number" min="1" max="240" defaultValue={initialDuration} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Mode
              <select name="mode" defaultValue={initialMode} style={inputStyle}>
                <option value="guided">Guided</option>
                <option value="group">Group</option>
                <option value="independent">Independent</option>
                <option value="practice">Practice</option>
                <option value="ops">Ops</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Status
              <select name="status" defaultValue={initialStatus} style={inputStyle}>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <button type="submit" style={{ border: 0, borderRadius: 14, padding: '13px 16px', fontWeight: 800, background: '#4F46E5', color: '#ffffff', cursor: 'pointer' }}>
            {duplicateLesson ? 'Create duplicated lesson' : 'Create lesson'}
          </button>
        </form>

        <aside style={{ display: 'grid', gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Why this matters</div>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              This route was being linked from the canvas, content board, and English studio without existing. That is exactly the kind of last-mile polish miss that makes a “working” LMS feel fake in production.
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Operator moves</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href={from} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Return to previous board →</Link>
              <Link href={`/content?subject=${encodeURIComponent(selectedSubject?.id ?? '')}&q=${encodeURIComponent(selectedModule?.title ?? '')}`} style={{ color: '#166534', fontWeight: 800, textDecoration: 'none' }}>Open related module lane →</Link>
              <Link href="/content?view=blocked" style={{ color: '#92400E', fontWeight: 800, textDecoration: 'none' }}>Review blocker stack →</Link>
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
