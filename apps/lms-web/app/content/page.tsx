import Link from 'next/link';
import {
  CreateAssessmentForm,
  CreateModuleForm,
  CreateStrandForm,
  CreateSubjectForm,
  DeleteAssessmentForm,
  DeleteLessonForm,
  DeleteModuleForm,
  DeleteStrandForm,
  DeleteSubjectForm,
  UpdateAssessmentForm,
  UpdateLessonForm,
  UpdateModuleForm,
  UpdateStrandForm,
  UpdateSubjectForm,
} from '../../components/admin-forms';
import { DynamicLessonCreateForm } from '../../components/content-ops-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchAssessments, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import { createLessonAction } from '../actions';

const subjectPalette: Record<string, { tone: string; text: string; accent: string }> = {
  english: { tone: '#EEF2FF', text: '#3730A3', accent: '#4F46E5' },
  math: { tone: '#ECFDF5', text: '#166534', accent: '#16A34A' },
  'life-skills': { tone: '#FFF7ED', text: '#9A3412', accent: '#F97316' },
};

const actionButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: 'none',
};

function statusPill(status: string) {
  if (status === 'published' || status === 'approved' || status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review' || status === 'scheduled') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function iconButtonStyle(background: string, color: string) {
  return { ...actionButtonStyle, background, color };
}

export default async function ContentPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [modules, lessons, subjects, strands, assessments] = await Promise.all([
    fetchCurriculumModules(),
    fetchLessons(),
    fetchSubjects(),
    fetchStrands(),
    fetchAssessments(),
  ]);

  const subjectSummaries = subjects
    .map((subject) => {
      const palette = subjectPalette[subject.id] || subjectPalette.english;
      const subjectStrands = strands.filter((strand) => strand.subjectId === subject.id);
      const subjectModules = modules.filter((module) => module.subjectId === subject.id);
      const subjectLessons = lessons.filter((lesson) => lesson.subjectName === subject.name);
      const subjectAssessments = assessments.filter((assessment) => assessment.subjectName === subject.name);
      const publishedModules = subjectModules.filter((module) => module.status === 'published').length;
      const readyLessons = subjectLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;

      return { subject, palette, subjectStrands, subjectModules, subjectLessons, subjectAssessments, publishedModules, readyLessons };
    })
    .sort((left, right) => (left.subject.order ?? 999) - (right.subject.order ?? 999) || left.subject.name.localeCompare(right.subject.name));

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
    }, new Map<string, { key: string; subjectId: string; subjectName: string; strandName: string; modules: typeof modules }>()).values(),
  ).map((group) => ({ ...group, modules: group.modules.sort((a, b) => a.title.localeCompare(b.title)) }));

  const assessmentLinkedModuleIds = new Set(assessments.map((assessment) => assessment.moduleId).filter(Boolean));
  const blockedModules = modules.filter((module) => {
    const moduleLessons = lessons.filter((lesson) => lesson.moduleTitle === module.title);
    const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
    return readyLessonCount < module.lessonCount || !assessmentLinkedModuleIds.has(module.id);
  });

  return (
    <PageShell
      title="Content Library"
      subtitle="Subject lanes, strands, modules, lessons, and assessment gates with the same cleaner modal-driven admin UX used on learners and mallams."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ModalLauncher buttonLabel="Create Subject" title="Create subject" description="Add a new subject lane and optionally seed its first strand.">
            <CreateSubjectForm />
          </ModalLauncher>
          <ModalLauncher buttonLabel="Create Strand" title="Create strand" description="Add a planning lane inside the right subject before you drop modules into it.">
            <CreateStrandForm subjects={subjects} />
          </ModalLauncher>
          <ModalLauncher buttonLabel="Create Module" title="Create module" description="Add a module to the right strand without leaving the content board.">
            <CreateModuleForm strands={strands} />
          </ModalLauncher>
          <Link href="/content/lessons/new" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Open lesson studio
          </Link>
          <ModalLauncher buttonLabel="Quick create lesson" title="Quick create lesson" description="Need a fast record only? Use the compact form. For actual authoring, use the full lesson studio.">
            <DynamicLessonCreateForm modules={modules} subjects={subjects} action={createLessonAction} />
          </ModalLauncher>
          <ModalLauncher buttonLabel="Create Assessment" title="Create assessment gate" description="Attach a progression gate to a module from the same board.">
            <CreateAssessmentForm modules={modules} subjects={subjects} />
          </ModalLauncher>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {[
          { label: 'Subjects', value: String(subjects.length), note: 'Visible lanes with edit and delete controls.' },
          { label: 'Modules', value: String(modules.length), note: 'Structured by strand, not dumped into a fake flat list.' },
          { label: 'Lessons ready', value: String(lessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length), note: 'Approved or published lessons live in the release lane.' },
          { label: 'Assessment gates', value: String(assessments.length), note: 'Every progression checkpoint stays visible and editable.' },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}><div style={{ color: '#64748b' }}>{item.note}</div></Card>
        ))}
      </section>

      <section style={{ ...responsiveGrid(280), marginBottom: 20 }}>
        {subjectSummaries.map(({ subject, palette, subjectStrands, subjectModules, subjectLessons, subjectAssessments, publishedModules, readyLessons }) => (
          <Card key={subject.id} title={subject.name} eyebrow="Subject lane">
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 16, height: 52, borderRadius: 999, background: palette.accent }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{subjectStrands.length} strand{subjectStrands.length === 1 ? '' : 's'}</div>
                    <div style={{ color: '#64748b' }}>{subjectModules.length} modules • {subjectLessons.length} lessons • {subjectAssessments.length} assessments</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <ModalLauncher buttonLabel="✏️" title={`Edit subject · ${subject.name}`} description="Update the subject label, icon, or sort order." eyebrow="Edit subject" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                    <UpdateSubjectForm subject={subject} embedded />
                  </ModalLauncher>
                  <ModalLauncher buttonLabel="🗑" title={`Delete subject · ${subject.name}`} description="Remove the full subject lane only if it should disappear from the content library." eyebrow="Delete subject" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                    <DeleteSubjectForm subject={subject} embedded />
                  </ModalLauncher>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${publishedModules} published`} tone={palette.tone} text={palette.text} />
                <Pill label={`${readyLessons} ready lessons`} tone="#F8FAFC" text="#334155" />
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {subjectStrands.length > 0 ? subjectStrands.map((strand) => {
                  const strandModules = subjectModules.filter((module) => module.strandName === strand.name);
                  return (
                    <div key={strand.id} style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700 }}>{strand.name}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <ModalLauncher buttonLabel="✏️" title={`Edit strand · ${strand.name}`} description="Rename or reorder this strand without leaving the subject lane." eyebrow="Edit strand" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                            <UpdateStrandForm strand={strand} subjects={subjects} embedded />
                          </ModalLauncher>
                          <ModalLauncher buttonLabel="🗑" title={`Delete strand · ${strand.name}`} description="Remove this strand and everything nested under it if it no longer belongs in the curriculum map." eyebrow="Delete strand" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                            <DeleteStrandForm strand={strand} embedded />
                          </ModalLauncher>
                        </div>
                      </div>
                      <div style={{ color: '#64748b', lineHeight: 1.5 }}>{strandModules.length > 0 ? strandModules.map((module) => module.title).join(' • ') : 'No modules yet.'}</div>
                    </div>
                  );
                }) : <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>No strands yet. Create one by adding a subject with an initial strand or expand the API later.</div>}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{module.title}</div>
                        <div style={{ color: '#64748b' }}>{module.level} • {module.lessonCount} planned lessons • {readyLessonCount} ready now</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Pill label={module.status} tone={pill.tone} text={pill.text} />
                        <ModalLauncher buttonLabel="✏️ Edit module" title={`Edit module · ${module.title}`} description="Update module metadata from the same content lane." eyebrow="Edit module" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                          <UpdateModuleForm modules={[module]} />
                        </ModalLauncher>
                        <ModalLauncher buttonLabel="🗑 Delete module" title={`Delete module · ${module.title}`} description="Remove this module and its linked content if it should no longer exist." eyebrow="Delete module" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                          <DeleteModuleForm modules={[module]} />
                        </ModalLauncher>
                      </div>
                    </div>

                    <div style={responsiveGrid(320)}>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {moduleLessons.map((lesson) => {
                          const lessonPill = statusPill(lesson.status);
                          return (
                            <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                              <div>
                                <div style={{ fontWeight: 700 }}>{lesson.title}</div>
                                <div style={{ color: '#64748b' }}>{lesson.mode} • {lesson.durationMinutes} min</div>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                  <Link href={`/content/lessons/${lesson.id}`} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Open authoring editor →</Link>
                                  <Link href={`/content/lessons/new?subjectId=${module.subjectId ?? ''}&moduleId=${module.id}&duplicate=${lesson.id}`} style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'none' }}>Duplicate into new lesson →</Link>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <Pill label={lesson.status} tone={lessonPill.tone} text={lessonPill.text} />
                                <ModalLauncher buttonLabel="✏️" title={`Edit lesson · ${lesson.title}`} description="Update the lesson state, mode, or duration without leaving the module card." eyebrow="Edit lesson" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                                  <UpdateLessonForm lessons={[lesson]} />
                                </ModalLauncher>
                                <ModalLauncher buttonLabel="🗑" title={`Delete lesson · ${lesson.title}`} description="Delete this lesson if it should no longer be in the module lane." eyebrow="Delete lesson" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                                  <DeleteLessonForm lessons={[lesson]} />
                                </ModalLauncher>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ padding: 14, borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1d4ed8', marginBottom: 8 }}>Assessment gate</div>
                          {moduleAssessments.length > 0 ? moduleAssessments.map((assessment) => {
                            const assessmentPill = statusPill(assessment.status);
                            return (
                              <div key={assessment.id} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{assessment.title}</div>
                                  <div style={{ color: '#475569' }}>{assessment.triggerLabel} • {assessment.kind}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <Pill label={assessment.status} tone={assessmentPill.tone} text={assessmentPill.text} />
                                  <ModalLauncher buttonLabel="✏️" title={`Edit assessment · ${assessment.title}`} description="Update this progression gate from inside the module lane." eyebrow="Edit assessment" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                                    <UpdateAssessmentForm assessments={[assessment]} />
                                  </ModalLauncher>
                                  <ModalLauncher buttonLabel="🗑" title={`Delete assessment · ${assessment.title}`} description="Remove this assessment gate if it should no longer control progression." eyebrow="Delete assessment" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                                    <DeleteAssessmentForm assessments={[assessment]} />
                                  </ModalLauncher>
                                </div>
                              </div>
                            );
                          }) : <div style={{ color: '#64748b' }}>No assessment linked yet.</div>}
                        </div>
                        <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', marginBottom: 8 }}>Release note</div>
                          <div style={{ color: '#334155', lineHeight: 1.6 }}>
                            {module.status === 'published'
                              ? 'Live in the deployment-ready lane for learner pods.'
                              : module.status === 'review'
                                ? 'Almost there — content is organised, but still needs ops sign-off.'
                                : 'This lane exists, but it still needs authoring or approval.'}
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

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Release blockers" eyebrow="What still stops publish">
          <SimpleTable
            columns={['Module', 'Subject', 'Gap', 'Release risk']}
            rows={blockedModules.map((module) => {
              const moduleLessons = lessons.filter((lesson) => lesson.moduleTitle === module.title);
              const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
              const missingLessons = Math.max(module.lessonCount - readyLessonCount, 0);
              const hasAssessment = assessmentLinkedModuleIds.has(module.id);

              return [
                module.title,
                module.subjectName ?? '—',
                `${missingLessons} lesson gap${missingLessons === 1 ? '' : 's'}`,
                hasAssessment ? 'Assessment linked but content is still incomplete.' : 'No assessment gate linked yet.',
              ];
            })}
          />
        </Card>

        <Card title="Assessment control board" eyebrow="Gatekeeping progression">
          <SimpleTable
            columns={['Assessment', 'Module', 'Trigger', 'Pass mark', 'Status', 'Actions']}
            rows={assessments.map((assessment) => [
              assessment.title,
              assessment.moduleTitle ?? '—',
              assessment.triggerLabel,
              `${Math.round((assessment.passingScore ?? 0) * 100)}%`,
              <Pill key={`${assessment.id}-status`} label={assessment.status} tone={statusPill(assessment.status).tone} text={statusPill(assessment.status).text} />,
              <div key={`${assessment.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ModalLauncher buttonLabel="Edit assessment" title={`Edit assessment · ${assessment.title}`} description="Update the selected assessment gate from the control board." eyebrow="Edit assessment" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                  <UpdateAssessmentForm assessments={[assessment]} />
                </ModalLauncher>
                <ModalLauncher buttonLabel="Delete assessment" title={`Delete assessment · ${assessment.title}`} description="Remove this gate from the control board if it should no longer exist." eyebrow="Delete assessment" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                  <DeleteAssessmentForm assessments={[assessment]} />
                </ModalLauncher>
              </div>,
            ])}
          />
        </Card>
      </section>

      <section style={responsiveGrid(320)}>
        <Card title="Curriculum release tracker" eyebrow="Ops visibility">
          <SimpleTable
            columns={['Subject', 'Strand', 'Module', 'Level', 'Lessons', 'Status', 'Actions']}
            rows={modules.map((module) => [
              module.subjectName ?? '—',
              module.strandName,
              module.title,
              module.level,
              String(module.lessonCount),
              <Pill key={`${module.id}-status`} label={module.status} tone={statusPill(module.status).tone} text={statusPill(module.status).text} />,
              <div key={`${module.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ModalLauncher buttonLabel="Edit module" title={`Edit module · ${module.title}`} description="Update the selected module without leaving the tracker." eyebrow="Edit module" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                  <UpdateModuleForm modules={[module]} />
                </ModalLauncher>
                <ModalLauncher buttonLabel="Delete module" title={`Delete module · ${module.title}`} description="Remove this module from the release tracker." eyebrow="Delete module" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                  <DeleteModuleForm modules={[module]} />
                </ModalLauncher>
              </div>,
            ])}
          />
        </Card>

        <Card title="Lesson inventory" eyebrow="Deployment-ready detail">
          <SimpleTable
            columns={['Lesson', 'Subject', 'Module', 'Mode', 'Duration', 'Status', 'Actions']}
            rows={lessons.map((lesson) => [
              lesson.title,
              lesson.subjectName ?? '—',
              lesson.moduleTitle ?? '—',
              lesson.mode,
              `${lesson.durationMinutes} min`,
              <Pill key={`${lesson.id}-status`} label={lesson.status} tone={statusPill(lesson.status).tone} text={statusPill(lesson.status).text} />,
              <div key={`${lesson.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href={`/content/lessons/${lesson.id}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#ede9fe', color: '#5b21b6', textDecoration: 'none', textAlign: 'center' }}>
                  Open full editor
                </Link>
                <Link href={`/content/lessons/new?duplicate=${lesson.id}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none', textAlign: 'center' }}>
                  Duplicate as new
                </Link>
                <ModalLauncher buttonLabel="Quick edit" title={`Quick edit · ${lesson.title}`} description="Use the compact editor for status/mode/duration only. For actual authoring, open the full lesson editor." eyebrow="Quick edit" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                  <UpdateLessonForm lessons={[lesson]} />
                </ModalLauncher>
                <ModalLauncher buttonLabel="Delete lesson" title={`Delete lesson · ${lesson.title}`} description="Remove this lesson from the inventory if it no longer belongs here." eyebrow="Delete lesson" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                  <DeleteLessonForm lessons={[lesson]} />
                </ModalLauncher>
              </div>,
            ])}
          />
        </Card>
      </section>
    </PageShell>
  );
}
