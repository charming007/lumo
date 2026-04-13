import Link from 'next/link';
import {
  CreateAssessmentForm,
  CreateModuleForm,
  CreateStrandForm,
  CreateSubjectForm,
  DeleteAssessmentForm,
  DeleteLessonForm,
  DeleteModuleForm,
  UpdateAssessmentForm,
  UpdateLessonForm,
  UpdateModuleForm,
} from '../../components/admin-forms';
import { DynamicLessonCreateForm } from '../../components/content-ops-form';
import { ContentSubjectLanes } from '../../components/content-subject-lanes';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchAssessments, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import { createLessonAction } from '../actions';

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

function blockerRiskMeta(missingLessons: number, hasAssessment: boolean) {
  if (missingLessons > 0 && !hasAssessment) return { label: 'Hard block', tone: '#FEE2E2', text: '#991B1B' };
  if (missingLessons > 0) return { label: 'Content gap', tone: '#FEF3C7', text: '#92400E' };
  return { label: 'Gate missing', tone: '#E0E7FF', text: '#3730A3' };
}

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = values.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

export default async function ContentPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; subject?: string | string[]; status?: string | string[]; view?: string | string[] }> }) {
  const query = await searchParams;
  const [modulesResult, lessonsResult, subjectsResult, strandsResult, assessmentsResult] = await Promise.allSettled([
    fetchCurriculumModules(),
    fetchLessons(),
    fetchSubjects(),
    fetchStrands(),
    fetchAssessments(),
  ]);

  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const strands = strandsResult.status === 'fulfilled' ? strandsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const failedSources = [
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter(Boolean);

  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const subjectFilter = normalizeFilterValue(query?.subject).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();
  const viewFilter = normalizeFilterValue(query?.view).trim();
  const subjectFilterName = subjects.find((subject) => subject.id === subjectFilter)?.name;

  const filteredModules = modules.filter((module) => {
    const subjectMatches = !subjectFilter || module.subjectId === subjectFilter || module.subjectName === subjectFilterName;
    const statusMatches = !statusFilter || module.status === statusFilter;
    const viewMatches = !viewFilter || viewFilter === 'modules' || viewFilter === 'blocked';
    const queryMatches = matchesQuery([module.title, module.subjectName, module.strandName, module.level, module.status], searchText);
    return subjectMatches && statusMatches && viewMatches && queryMatches;
  });

  const filteredLessons = lessons.filter((lesson) => {
    const lessonSubjectId = lesson.subjectId ?? subjects.find((subject) => subject.name === lesson.subjectName)?.id;
    const moduleForLesson = modules.find((module) => module.id === lesson.moduleId || module.title === lesson.moduleTitle);
    const subjectMatches = !subjectFilter || lessonSubjectId === subjectFilter || lesson.subjectName === subjectFilterName || moduleForLesson?.subjectId === subjectFilter;
    const statusMatches = !statusFilter || lesson.status === statusFilter;
    const viewMatches = !viewFilter || viewFilter === 'lessons';
    const queryMatches = matchesQuery([lesson.title, lesson.subjectName, lesson.moduleTitle, lesson.mode, lesson.status, lesson.targetAgeRange], searchText);
    return subjectMatches && statusMatches && viewMatches && queryMatches;
  });

  const filteredAssessments = assessments.filter((assessment) => {
    const assessmentSubjectId = assessment.subjectId ?? subjects.find((subject) => subject.name === assessment.subjectName)?.id;
    const subjectMatches = !subjectFilter || assessmentSubjectId === subjectFilter || assessment.subjectName === subjectFilterName;
    const statusMatches = !statusFilter || assessment.status === statusFilter;
    const viewMatches = !viewFilter || viewFilter === 'assessments' || viewFilter === 'blocked';
    const queryMatches = matchesQuery([assessment.title, assessment.moduleTitle, assessment.subjectName, assessment.triggerLabel, assessment.kind, assessment.status], searchText);
    return subjectMatches && statusMatches && viewMatches && queryMatches;
  });

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

  const moduleHasAssessmentGate = (moduleId: string, moduleTitle: string) => assessments.some(
    (assessment) => assessment.moduleId === moduleId || assessment.moduleTitle === moduleTitle,
  );

  const blockedModules = modules.filter((module) => {
    const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id || lesson.moduleTitle === module.title);
    const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
    return readyLessonCount < module.lessonCount || !moduleHasAssessmentGate(module.id, module.title);
  });

  const filteredBlockedModules = blockedModules.filter((module) => {
    const subjectMatches = !subjectFilter || module.subjectId === subjectFilter || module.subjectName === subjectFilterName;
    const viewMatches = !viewFilter || viewFilter === 'blocked';
    const queryMatches = matchesQuery([module.title, module.subjectName, module.strandName, module.level, module.status], searchText);
    return subjectMatches && viewMatches && queryMatches;
  });

  const activeResultCount = filteredModules.length + filteredLessons.length + filteredAssessments.length + filteredBlockedModules.length;
  const filtersActive = Boolean(searchText || subjectFilter || statusFilter || viewFilter);

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
          <Link href="/guide#content-library" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
            Open LMS guide
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

      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Content library degraded gracefully: {failedSources.join(', ')} feed {failedSources.length === 1 ? 'is' : 'are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20, padding: 18, borderRadius: 24, background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
        <form style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', marginBottom: 8 }}>Library filters</div>
              <div style={{ color: '#475569', lineHeight: 1.6, maxWidth: 700 }}>
                Search across modules, lessons, assessments, and blockers without scrolling like a maniac. Filter by subject, publish state, or board view when ops needs a real answer fast.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
                Clear filters
              </Link>
              <button type="submit" style={{ borderRadius: 12, padding: '10px 12px', fontWeight: 700, background: '#4F46E5', color: 'white', border: 0, cursor: 'pointer' }}>
                Apply filters
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(3, minmax(160px, 0.7fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
              Search title, module, strand, trigger, or status
              <input name="q" defaultValue={searchText} placeholder="Try English, published, story, oral…" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
              Subject
              <select name="subject" defaultValue={subjectFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All subjects</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
              Status
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">Any status</option>
                {['draft', 'review', 'approved', 'published', 'active'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
              Focus view
              <select name="view" defaultValue={viewFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">Whole board</option>
                <option value="modules">Modules only</option>
                <option value="lessons">Lessons only</option>
                <option value="assessments">Assessments only</option>
                <option value="blocked">Release blockers only</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Pill label={`${activeResultCount} matching items`} tone="#EEF2FF" text="#3730A3" />
            {subjectFilterName ? <Pill label={`Subject: ${subjectFilterName}`} tone="#ECFDF5" text="#166534" /> : null}
            {statusFilter ? <Pill label={`Status: ${statusFilter}`} tone="#FEF3C7" text="#92400E" /> : null}
            {viewFilter ? <Pill label={`View: ${viewFilter}`} tone="#F3E8FF" text="#7E22CE" /> : null}
            {searchText ? <Pill label={`Query: ${searchText}`} tone="#F8FAFC" text="#334155" /> : null}
          </div>
        </form>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 16, background: activeResultCount > 0 ? '#eef2ff' : '#fff7ed', border: `1px solid ${activeResultCount > 0 ? '#c7d2fe' : '#fed7aa'}`, color: activeResultCount > 0 ? '#3730a3' : '#9a3412', fontWeight: 700 }}>
          {activeResultCount > 0
            ? `Showing ${activeResultCount} matching records across the filtered board.`
            : 'No records match those filters yet. Loosen the query or clear the filters instead of assuming the library is empty.'}
        </div>
      ) : null}

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

      <ContentSubjectLanes
        subjects={subjects}
        strands={strands}
        modules={modules}
        lessons={lessons}
        assessments={assessments}
      />

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        {strandGroups
          .map((group) => ({ ...group, modules: group.modules.filter((module) => filteredModules.some((filteredModule) => filteredModule.id === module.id)) }))
          .filter((group) => group.modules.length > 0)
          .map((group) => (
          <Card key={group.key} title={group.strandName} eyebrow={group.subjectName || 'Curriculum strand'}>
            <div style={{ display: 'grid', gap: 14 }}>
              {group.modules.map((module) => {
                const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id || lesson.moduleTitle === module.title);
                const moduleAssessments = assessments.filter((assessment) => assessment.moduleId === module.id || assessment.moduleTitle === module.title);
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
                                  <Link href={`/content/lessons/${lesson.id}?from=%2Fcontent`} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Open authoring editor →</Link>
                                  <Link href={`/content/lessons/new?subjectId=${module.subjectId ?? ''}&moduleId=${module.id}&duplicate=${lesson.id}&from=%2Fcontent`} style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'none' }}>Duplicate into new lesson →</Link>
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
            columns={['Module', 'Subject', 'Readiness gap', 'Release risk', 'Fix now']}
            rows={filteredBlockedModules.map((module) => {
              const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id || lesson.moduleTitle === module.title);
              const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
              const missingLessons = Math.max(module.lessonCount - readyLessonCount, 0);
              const hasAssessment = moduleHasAssessmentGate(module.id, module.title);
              const blocker = blockerRiskMeta(missingLessons, hasAssessment);

              return [
                <div key={`${module.id}-title`} style={{ display: 'grid', gap: 6 }}>
                  <strong>{module.title}</strong>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{module.level} • {readyLessonCount}/{module.lessonCount} ready lessons</span>
                </div>,
                module.subjectName ?? '—',
                <div key={`${module.id}-gap`} style={{ display: 'grid', gap: 6, color: '#334155' }}>
                  <span>{missingLessons > 0 ? `${missingLessons} lesson${missingLessons === 1 ? '' : 's'} still need approval or publishing.` : 'Lesson count is ready.'}</span>
                  <span>{hasAssessment ? 'Assessment gate linked.' : 'Assessment gate missing.'}</span>
                </div>,
                <div key={`${module.id}-risk`} style={{ display: 'grid', gap: 8 }}>
                  <Pill label={blocker.label} tone={blocker.tone} text={blocker.text} />
                  <span style={{ color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
                    {missingLessons > 0 && !hasAssessment
                      ? 'Module cannot ship: content is incomplete and progression has no gate.'
                      : missingLessons > 0
                        ? 'Assessment exists, but learner-facing lesson coverage is still short.'
                        : 'Lessons are ready, but progression still has no gate.'}
                  </span>
                </div>,
                <div key={`${module.id}-actions`} style={{ display: 'grid', gap: 8 }}>
                  <Link href={`/content/lessons/new?subjectId=${module.subjectId ?? ''}&moduleId=${module.id}&from=%2Fcontent&focus=blockers`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none', textAlign: 'center' }}>
                    Add lesson pack
                  </Link>
                  {!hasAssessment ? (
                    <ModalLauncher buttonLabel="Create gate" title={`Create assessment gate · ${module.title}`} description="Ship the missing progression gate from the blockers board instead of hunting through the full content lane." eyebrow="Create assessment" triggerStyle={{ ...iconButtonStyle('#ede9fe', '#5b21b6'), textAlign: 'center', justifyContent: 'center' }}>
                      <CreateAssessmentForm modules={[module]} subjects={subjects} />
                    </ModalLauncher>
                  ) : (
                    <Link href={`/content?view=assessments&q=${encodeURIComponent(module.title)}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      Review gate
                    </Link>
                  )}
                </div>,
              ];
            })}
          />
        </Card>

        <Card title="Assessment control board" eyebrow="Gatekeeping progression">
          <SimpleTable
            columns={['Assessment', 'Module', 'Trigger', 'Pass mark', 'Status', 'Actions']}
            rows={filteredAssessments.map((assessment) => [
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
            rows={filteredModules.map((module) => [
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
            rows={filteredLessons.map((lesson) => [
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
