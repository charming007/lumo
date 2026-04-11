import { CreateModuleForm, UpdateLessonForm, UpdateModuleForm } from '../../components/admin-forms';
import { DynamicLessonCreateForm } from '../../components/content-ops-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchAssessments, fetchCurriculumModules, fetchLessons, fetchSubjects } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';
import { createLessonAction } from '../actions';

const subjectPalette: Record<string, { tone: string; text: string; accent: string }> = {
  english: { tone: '#EEF2FF', text: '#3730A3', accent: '#4F46E5' },
  math: { tone: '#ECFDF5', text: '#166534', accent: '#16A34A' },
  'life-skills': { tone: '#FFF7ED', text: '#9A3412', accent: '#F97316' },
};

function statusPill(status: string) {
  if (status === 'published' || status === 'approved' || status === 'active') {
    return { tone: '#DCFCE7', text: '#166534' };
  }

  if (status === 'review' || status === 'scheduled') {
    return { tone: '#FEF3C7', text: '#92400E' };
  }

  return { tone: '#E0E7FF', text: '#3730A3' };
}

export default async function ContentPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [modules, lessons, subjects, assessments] = await Promise.all([
    fetchCurriculumModules(),
    fetchLessons(),
    fetchSubjects(),
    fetchAssessments(),
  ]);

  const publishedCount = modules.filter((module) => module.status === 'published').length;
  const draftLessons = lessons.filter((lesson) => lesson.status === 'draft').length;
  const englishMathModules = modules.filter((module) => ['Foundational English', 'Basic Numeracy'].includes(module.subjectName));

  const subjectSummaries = subjects
    .map((subject) => {
      const palette = subjectPalette[subject.id] || subjectPalette.english;
      const subjectModules = modules.filter((module) => module.subjectId === subject.id);
      const subjectLessons = lessons.filter((lesson) => lesson.subjectName === subject.name);
      const subjectAssessments = assessments.filter((assessment) => assessment.subjectName === subject.name);
      const strandNames = Array.from(new Set(subjectModules.map((module) => module.strandName).filter(Boolean)));
      const publishedModules = subjectModules.filter((module) => module.status === 'published').length;
      const readyLessons = subjectLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;

      return {
        subject,
        palette,
        subjectModules,
        subjectLessons,
        subjectAssessments,
        strandNames,
        publishedModules,
        readyLessons,
      };
    })
    .filter((entry) => entry.subjectModules.length > 0)
    .sort((left, right) => left.subject.name.localeCompare(right.subject.name));

  const strandGroups = Array.from(
    modules.reduce((map, module) => {
      const key = `${module.subjectId || 'general'}::${module.strandName || 'General'}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectId: module.subjectId || 'general',
          subjectName: module.subjectName,
          strandName: module.strandName || 'General',
          modules: [],
        });
      }

      map.get(key)?.modules.push(module);
      return map;
    }, new Map<string, { key: string; subjectId: string; subjectName: string; strandName: string; modules: typeof modules }>())
      .values(),
  )
    .map((group) => ({
      ...group,
      modules: group.modules.sort((left, right) => left.title.localeCompare(right.title)),
    }))
    .sort((left, right) => {
      if (left.subjectName === right.subjectName) {
        return left.strandName.localeCompare(right.strandName);
      }

      return (left.subjectName || '').localeCompare(right.subjectName || '');
    });

  return (
    <PageShell title="Content Library" subtitle="A visibly real curriculum map for Maths and English: subject lanes, strands, modules, lesson inventory, and release-readiness instead of a fake flat list.">
      <FeedbackBanner message={query?.message} />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        <Card title={String(modules.length)} eyebrow="Modules"><div style={{ color: '#64748b' }}>Structured across subject strands and progression levels.</div></Card>
        <Card title={String(englishMathModules.length)} eyebrow="Maths + English"><div style={{ color: '#64748b' }}>Core library modules now mapped into curriculum lanes.</div></Card>
        <Card title={String(publishedCount)} eyebrow="Published"><div style={{ color: '#64748b' }}>Ready for pod deployment now.</div></Card>
        <Card title={String(draftLessons)} eyebrow="Draft lessons"><div style={{ color: '#64748b' }}>Still waiting for approval or release.</div></Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {subjectSummaries.map(({ subject, palette, subjectModules, subjectLessons, subjectAssessments, strandNames, publishedModules, readyLessons }) => (
          <Card key={subject.id} title={subject.name} eyebrow="Subject lane">
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 16, height: 52, borderRadius: 999, background: palette.accent }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{strandNames.length} strand{strandNames.length === 1 ? '' : 's'}</div>
                  <div style={{ color: '#64748b' }}>{subjectModules.length} modules • {subjectLessons.length} lessons • {subjectAssessments.length} assessments</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${publishedModules} published`} tone={palette.tone} text={palette.text} />
                <Pill label={`${readyLessons} lesson${readyLessons === 1 ? '' : 's'} ready`} tone="#F8FAFC" text="#334155" />
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {strandNames.map((strandName) => {
                  const strandModules = subjectModules.filter((module) => module.strandName === strandName);
                  return (
                    <div key={strandName} style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{strandName}</div>
                      <div style={{ color: '#64748b', lineHeight: 1.5 }}>{strandModules.map((module) => module.title).join(' • ')}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        {strandGroups.map((group) => (
          <Card key={group.key} title={group.strandName} eyebrow={group.subjectName || 'Curriculum strand'}>
            <div style={{ display: 'grid', gap: 14 }}>
              {group.modules.map((module) => {
                const moduleLessons = lessons.filter((lesson) => lesson.moduleTitle === module.title);
                const moduleAssessments = assessments.filter((assessment) => assessment.moduleTitle === module.title);
                const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
                const pill = statusPill(module.status);

                return (
                  <div key={module.id} style={{ padding: 18, borderRadius: 20, border: '1px solid #e5e7eb', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{module.title}</div>
                        <div style={{ color: '#64748b' }}>{module.level} • {module.lessonCount} planned lessons • {readyLessonCount} ready now</div>
                      </div>
                      <Pill label={module.status} tone={pill.tone} text={pill.text} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {moduleLessons.map((lesson) => {
                          const lessonPill = statusPill(lesson.status);
                          return (
                            <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                              <div>
                                <div style={{ fontWeight: 700 }}>{lesson.title}</div>
                                <div style={{ color: '#64748b' }}>{lesson.mode} • {lesson.durationMinutes} min</div>
                              </div>
                              <Pill label={lesson.status} tone={lessonPill.tone} text={lessonPill.text} />
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ padding: 14, borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1d4ed8', marginBottom: 8 }}>Assessment gate</div>
                          {moduleAssessments.length > 0 ? moduleAssessments.map((assessment) => (
                            <div key={assessment.id} style={{ marginBottom: 10 }}>
                              <div style={{ fontWeight: 700 }}>{assessment.title}</div>
                              <div style={{ color: '#475569' }}>{assessment.triggerLabel} • {assessment.kind}</div>
                            </div>
                          )) : <div style={{ color: '#64748b' }}>No assessment linked yet.</div>}
                        </div>
                        <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', marginBottom: 8 }}>Release note</div>
                          <div style={{ color: '#334155', lineHeight: 1.6 }}>
                            {module.status === 'published'
                              ? 'Live in the deployment-ready lane for learner pods.'
                              : module.status === 'review'
                                ? 'Almost there — content is organised, but still needs ops sign-off.'
                                : 'Library structure exists, but this module still needs authoring or approval.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 16, marginBottom: 20 }}>
        <Card title="Curriculum release tracker" eyebrow="Ops visibility">
          <SimpleTable
            columns={['Subject', 'Strand', 'Module', 'Level', 'Lessons', 'Status']}
            rows={modules.map((module) => [
              module.subjectName ?? '—',
              module.strandName,
              module.title,
              module.level,
              String(module.lessonCount),
              <Pill key={`${module.id}-status`} label={module.status} tone={statusPill(module.status).tone} text={statusPill(module.status).text} />,
            ])}
          />
        </Card>

        <Card title="Lesson inventory" eyebrow="Deployment-ready detail">
          <SimpleTable
            columns={['Lesson', 'Subject', 'Module', 'Mode', 'Duration', 'Status']}
            rows={lessons.map((lesson) => [
              lesson.title,
              lesson.subjectName ?? '—',
              lesson.moduleTitle ?? '—',
              lesson.mode,
              `${lesson.durationMinutes} min`,
              <Pill key={`${lesson.id}-status`} label={lesson.status} tone={statusPill(lesson.status).tone} text={statusPill(lesson.status).text} />,
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
