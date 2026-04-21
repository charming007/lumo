import Link from 'next/link';
import {
  CreateAssessmentForm,
  CreateModuleForm,
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
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchAssessments, fetchAssignments, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import { assessmentMatchesModule, isLiveAssessmentGate } from '../../lib/module-assessment-match';
import { filterLessonsForModule, findModuleForLesson } from '../../lib/module-lesson-match';
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

function blockerRiskMeta(missingLessons: number, hasAssessment: boolean, isDraftModule: boolean) {
  if (missingLessons > 0 && !hasAssessment) return { label: 'Hard block', tone: '#FEE2E2', text: '#991B1B' };
  if (isDraftModule && (missingLessons > 0 || !hasAssessment)) return { label: 'Draft + release gap', tone: '#FEE2E2', text: '#991B1B' };
  if (isDraftModule) return { label: 'Draft blocker', tone: '#FEF3C7', text: '#92400E' };
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

function emptyTableRows(message: string, columns: number) {
  return [[<span key={message} style={{ color: '#64748b', lineHeight: 1.6 }}>{message}</span>, ...Array.from({ length: columns - 1 }, () => '')]];
}

function buildContentReturnPath(query?: { q?: string | string[]; subject?: string | string[]; status?: string | string[]; view?: string | string[] }) {
  const params = new URLSearchParams();
  const q = normalizeFilterValue(query?.q).trim();
  const subject = normalizeFilterValue(query?.subject).trim();
  const status = normalizeFilterValue(query?.status).trim();
  const view = normalizeFilterValue(query?.view).trim();

  if (q) params.set('q', q);
  if (subject) params.set('subject', subject);
  if (status) params.set('status', status);
  if (view) params.set('view', view);

  return params.size ? `/content?${params.toString()}` : '/content';
}

export default async function ContentPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; subject?: string | string[]; status?: string | string[]; view?: string | string[] }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Content library"
        subtitle="Production wiring is incomplete, so the publishing board is refusing to fake a healthy release pipeline."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: content API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} module blockers, lesson readiness, and assessment-gate coverage would all degrade into misleading fallback states. Fix the env var, redeploy, then verify the real content workflow.
          </>
        )}
        whyBlocked={[
          'This route drives module release readiness, lesson authoring handoffs, and assessment coverage. Pretending that missing data means “all clear” would be operationally stupid.',
          'Until the API base exists, the content board can render a shell, but it cannot truthfully tell operators what is blocked, publishable, or missing.',
        ]}
        verificationItems={[
          {
            surface: 'Content board',
            expected: 'Real modules, lessons, and assessment counts load from the live backend',
            failure: 'Blank tables, zero blockers, or only fallback copy',
          },
          {
            surface: 'Blocked view',
            expected: 'Missing lessons and missing gates show exact blocker counts',
            failure: 'Everything looks publishable with no API traffic',
          },
          {
            surface: 'Lesson authoring',
            expected: 'Subject/module pickers populate with live curriculum data',
            failure: 'Create flows open without real curriculum context',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Assignments blocker', href: '/assignments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
          { label: 'Settings blocker', href: '/settings', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [modulesResult, lessonsResult, subjectsResult, strandsResult, assessmentsResult, assignmentsResult] = await Promise.allSettled([
    fetchCurriculumModules(),
    fetchLessons(),
    fetchSubjects(),
    fetchStrands(),
    fetchAssessments(),
    fetchAssignments(),
  ]);

  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const strands = strandsResult.status === 'fulfilled' ? strandsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const failedSources = [
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    assignmentsResult.status === 'rejected' ? 'assignments' : null,
  ].filter(Boolean);
  const criticalReleaseFailures = [
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter(Boolean);
  const hasCriticalContentGap = criticalReleaseFailures.length > 0;

  if (hasCriticalContentGap) {
    const blockerDetail = criticalReleaseFailures.length === 1
      ? `The ${criticalReleaseFailures[0]} feed failed to load from the live API. Leaving the content board up would turn blocker counts, readiness scoring, and authoring actions into polished fiction.`
      : `The ${criticalReleaseFailures.join(', ')} feeds failed to load from the live API. Leaving the content board up would turn blocker counts, readiness scoring, and authoring actions into polished fiction.`;

    return (
      <DeploymentBlockerCard
        title="Content library"
        subtitle="Critical curriculum feeds are degraded, so the publishing board is blocked instead of pretending blank counts mean release-safe content."
        blockerHeadline="Deployment blocker: content release-readiness feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalReleaseFailures.length
              ? `Additional degraded feed${failedSources.length - criticalReleaseFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalReleaseFailures.includes(source)).join(', ')}.`
              : null}
          </>
        )}
        whyBlocked={[
          'This page decides whether modules are genuinely shippable. Zeroed cards and empty blocker rows during an outage are a lie, not a fallback.',
          'Operators should not be able to open lesson or assessment creation flows when the reference curriculum context is missing or stale.',
          'Assignments can degrade separately, but modules, lessons, subjects, and assessment gates are the trust backbone for this route.',
        ]}
        verificationItems={[
          {
            surface: 'Content board counts',
            expected: 'Subjects, modules, lessons, and assessment gates reflect live backend totals',
            failure: 'Neat zero-value cards or empty blocker rows appear while one of the core feeds is down',
          },
          {
            surface: 'Blocked modules board',
            expected: 'Missing lessons, draft modules, and missing gates show exact blocker rows',
            failure: 'The page suggests nothing is blocked because fallback arrays collapsed the board to empty',
          },
          {
            surface: 'Authoring actions',
            expected: 'Lesson studio and assessment creation are only available with trustworthy curriculum context',
            failure: 'Operators can launch write flows against degraded reference data',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Assignments blocker', href: '/assignments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
          { label: 'Settings blocker', href: '/settings', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const subjectFilter = normalizeFilterValue(query?.subject).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();
  const viewFilter = normalizeFilterValue(query?.view).trim();
  const returnPath = buildContentReturnPath(query);
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
    const moduleForLesson = findModuleForLesson(modules, lesson);
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

  const moduleHasAssessmentGate = (module: (typeof modules)[number]) => assessments.some(
    (assessment) => assessmentMatchesModule(module, assessment) && isLiveAssessmentGate(assessment),
  );

  const blockedModules = modules.filter((module) => {
    const moduleLessons = filterLessonsForModule(lessons, module);
    const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
    return readyLessonCount < module.lessonCount || !moduleHasAssessmentGate(module) || module.status === 'draft';
  });

  const filteredBlockedModules = blockedModules.filter((module) => {
    const subjectMatches = !subjectFilter || module.subjectId === subjectFilter || module.subjectName === subjectFilterName;
    const viewMatches = !viewFilter || viewFilter === 'blocked';
    const queryMatches = matchesQuery([module.title, module.subjectName, module.strandName, module.level, module.status], searchText);
    return subjectMatches && viewMatches && queryMatches;
  });

  const showingBlockedView = viewFilter === 'blocked';
  const activeResultCount = showingBlockedView
    ? filteredBlockedModules.length
    : filteredModules.length + filteredLessons.length + filteredAssessments.length;
  const filtersActive = Boolean(searchText || subjectFilter || statusFilter || viewFilter);

  return (
    <PageShell
      title="Content Library"
      subtitle="Subject lifecycle stays obvious here, while strand structure stays in the background so operators can focus on modules, lessons, and gates."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ModalLauncher buttonLabel="Create Subject" title="Create subject" description="Add a new subject lane and optionally seed its first strand.">
            <CreateSubjectForm returnPath={returnPath} />
          </ModalLauncher>
          <ModalLauncher buttonLabel="Create Module" title="Create module" description="Add a module to the right strand without leaving the content board.">
            <CreateModuleForm strands={strands} returnPath={returnPath} />
          </ModalLauncher>
          <Link href="/content/lessons/new" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Open lesson studio
          </Link>
          <Link href="/content/assets" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#ECFDF5', color: '#166534', textDecoration: 'none', border: '1px solid #BBF7D0' }}>
            Asset library
          </Link>
          <Link href="/settings" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
            Open settings
          </Link>
          <ModalLauncher buttonLabel="Quick lesson shell" title="Quick lesson shell" description="Need a fast lesson record in the right module? This compact form creates the shell, then opens the full typed lesson editor immediately.">
            <DynamicLessonCreateForm modules={modules} subjects={subjects} action={createLessonAction} returnPath={returnPath} />
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
                Search across modules, lessons, assessments, and blockers without scrolling like a maniac. Subject lifecycle stays visible on the lane cards; strand lifecycle stays out of the way.
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

          <div style={{ ...responsiveGrid(180), gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
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
          { label: 'Subjects', value: String(subjects.length), note: 'Visible lanes with direct lifecycle controls you can trust.' },
          { label: 'Modules', value: String(modules.length), note: 'Structured under strands, without making strand lifecycle another noisy operator job.' },
          { label: 'Lessons ready', value: String(lessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length), note: 'Approved or published lessons live in the release lane.' },
          { label: 'Assessment gates', value: String(assessments.length), note: 'Every progression checkpoint stays visible and editable.' },
          { label: 'Live assignments', value: String(assignments.length), note: 'This curriculum board now points at learner-facing delivery, not placeholder curriculum rows.' },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}><div style={{ color: '#64748b' }}>{item.note}</div></Card>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Filtered board summary" eyebrow="What this exact view is showing">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              {showingBlockedView
                ? `Blocked-only mode is showing ${filteredBlockedModules.length} module${filteredBlockedModules.length === 1 ? '' : 's'} that still need lesson coverage, assessment gates, or both.`
                : `This board currently surfaces ${filteredModules.length} module${filteredModules.length === 1 ? '' : 's'}, ${filteredLessons.length} lesson${filteredLessons.length === 1 ? '' : 's'}, and ${filteredAssessments.length} assessment gate${filteredAssessments.length === 1 ? '' : 's'} in scope.`}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={`${filteredModules.length} modules`} tone="#EEF2FF" text="#3730A3" />
              <Pill label={`${filteredLessons.length} lessons`} tone="#ECFDF5" text="#166534" />
              <Pill label={`${filteredAssessments.length} assessments`} tone="#F3E8FF" text="#7E22CE" />
              <Pill label={`${filteredBlockedModules.length} blockers`} tone={filteredBlockedModules.length ? '#FEF3C7' : '#F8FAFC'} text={filteredBlockedModules.length ? '#92400E' : '#334155'} />
            </div>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              Filters now keep the library honest: no more silent blank tables that make operators guess whether content vanished or the board is just scoped tightly.
            </div>
          </div>
        </Card>

        <Card title="Operational handoff" eyebrow="What to do next from here">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Clear blockers first', filteredBlockedModules.length ? `${filteredBlockedModules.length} blocker row${filteredBlockedModules.length === 1 ? '' : 's'} still need action before this curriculum slice is genuinely release-safe.` : 'No blocker rows in this scoped view right now.'],
              ['Use full authoring when structure matters', 'Quick edit is fine for status or duration. If the learner flow, media cues, or evidence design matters, open Lesson Studio and do it properly.'],
              ['Asset library is live', 'Authors can upload or register media once, then browse copy-ready runtime URLs and asset keys from the library instead of winging every media reference by hand.'],
              ['Route back into delivery on purpose', 'After content is structurally clean, move into assignments or reports with the same scoped story instead of making operators reconstruct context from memory.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/content/lessons/new?from=%2Fcontent" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                Open lesson studio →
              </Link>
              <Link href="/assignments" style={{ color: '#166534', fontWeight: 800, textDecoration: 'none' }}>
                Open assignments →
              </Link>
              <Link href="/reports" style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}>
                Cross-check reports →
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {!showingBlockedView ? (
        <>
          <ContentSubjectLanes
            subjects={subjects}
            strands={strands}
            modules={filteredModules}
            lessons={filteredLessons}
            assessments={filteredAssessments}
            assignments={assignments}
            returnPath={returnPath}
          />

          <section style={{ display: 'grid', gap: 20, marginBottom: 20 }}>
            <Card title="Release blockers" eyebrow="What still stops publish">
              <SimpleTable
                columns={['Module', 'Subject', 'Readiness gap', 'Release risk', 'Fix now']}
                rows={filteredBlockedModules.length ? filteredBlockedModules.map((module) => {
                  const moduleLessons = filterLessonsForModule(lessons, module);
                  const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
                  const missingLessons = Math.max(module.lessonCount - readyLessonCount, 0);
                  const hasAssessment = moduleHasAssessmentGate(module);
                  const isDraftModule = module.status === 'draft';
                  const blocker = blockerRiskMeta(missingLessons, hasAssessment, isDraftModule);

                  return [
                    <div key={`${module.id}-title`} style={{ display: 'grid', gap: 6 }}>
                      <strong>{module.title}</strong>
                      <span style={{ color: '#64748b', fontSize: 13 }}>{module.level} • {readyLessonCount}/{module.lessonCount} ready lessons</span>
                    </div>,
                    module.subjectName ?? '—',
                    <div key={`${module.id}-gap`} style={{ display: 'grid', gap: 6, color: '#334155' }}>
                      <span>{missingLessons > 0 ? `${missingLessons} lesson${missingLessons === 1 ? '' : 's'} still need approval or publishing.` : 'Lesson count is ready.'}</span>
                      <span>{hasAssessment ? 'Assessment gate linked.' : 'Assessment gate missing.'}</span>
                      <span style={{ color: isDraftModule ? '#B45309' : '#64748b', fontWeight: isDraftModule ? 800 : 600 }}>
                        {isDraftModule ? 'Module is still draft.' : 'Module status is release-safe.'}
                      </span>
                    </div>,
                    <div key={`${module.id}-risk`} style={{ display: 'grid', gap: 8 }}>
                      <Pill label={blocker.label} tone={blocker.tone} text={blocker.text} />
                      <span style={{ color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
                        {missingLessons > 0 && !hasAssessment
                          ? 'Module cannot ship: content is incomplete and progression has no gate.'
                          : isDraftModule && missingLessons > 0
                            ? 'Lessons are partly ready, but the module is still draft and cannot ship yet.'
                            : isDraftModule && !hasAssessment
                              ? 'This module is still draft and also missing its progression gate.'
                              : isDraftModule
                                ? 'Content is structurally ready, but the draft module status still blocks release.'
                                : missingLessons > 0
                                  ? 'Assessment exists, but learner-facing lesson coverage is still short.'
                                  : 'Lessons are ready, but progression still has no gate.'}
                      </span>
                    </div>,
                    <div key={`${module.id}-actions`} style={{ display: 'grid', gap: 8 }}>
                      <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(module.subjectId ?? '')}&moduleId=${encodeURIComponent(module.id)}&from=%2Fcontent&focus=blockers`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none', textAlign: 'center' }}>
                        Add lesson pack
                      </Link>
                      {!hasAssessment ? (
                        <ModalLauncher buttonLabel="Create gate" title={`Create assessment gate · ${module.title}`} description="Ship the missing progression gate from the blockers board instead of hunting through the full content lane." eyebrow="Create assessment" triggerStyle={{ ...iconButtonStyle('#ede9fe', '#5b21b6'), textAlign: 'center', justifyContent: 'center' }}>
                          <CreateAssessmentForm modules={[module]} subjects={subjects} returnPath={returnPath} />
                        </ModalLauncher>
                      ) : (
                        <Link href={`/content?view=assessments&q=${encodeURIComponent(module.title)}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                          Review gate
                        </Link>
                      )}
                    </div>,
                  ];
                }) : [[<span key="release-clear" style={{ color: '#64748b', lineHeight: 1.6 }}>No blocker rows match the current content filters.</span>, '', '', '', '']]}
              />
            </Card>

            <Card title="Assessment control board" eyebrow="Gatekeeping progression">
              <SimpleTable
                columns={['Assessment', 'Module', 'Trigger', 'Pass mark', 'Status', 'Actions']}
                rows={filteredAssessments.length ? filteredAssessments.map((assessment) => [
                  assessment.title,
                  assessment.moduleTitle ?? '—',
                  assessment.triggerLabel,
                  `${Math.round((assessment.passingScore ?? 0) * 100)}%`,
                  <Pill key={`${assessment.id}-status`} label={assessment.status} tone={statusPill(assessment.status).tone} text={statusPill(assessment.status).text} />,
                  <div key={`${assessment.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ModalLauncher buttonLabel="Edit assessment" title={`Edit assessment · ${assessment.title}`} description="Update the selected assessment gate from the control board." eyebrow="Edit assessment" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                      <UpdateAssessmentForm assessments={[assessment]} returnPath={returnPath} />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel="Delete assessment" title={`Delete assessment · ${assessment.title}`} description="Remove this gate from the control board if it should no longer exist." eyebrow="Delete assessment" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                      <DeleteAssessmentForm assessments={[assessment]} returnPath={returnPath} />
                    </ModalLauncher>
                  </div>,
                ]) : emptyTableRows(filtersActive ? 'No assessment gates match the current content filters.' : 'No assessment gates are available right now.', 6)}
              />
            </Card>
          </section>

          <section style={responsiveGrid(320)}>
            <Card title="Curriculum release tracker" eyebrow="Ops visibility">
              <SimpleTable
                columns={['Subject', 'Strand', 'Module', 'Level', 'Lessons', 'Status', 'Actions']}
                rows={filteredModules.length ? filteredModules.map((module) => [
                  module.subjectName ?? '—',
                  module.strandName,
                  module.title,
                  module.level,
                  String(module.lessonCount),
                  <Pill key={`${module.id}-status`} label={module.status} tone={statusPill(module.status).tone} text={statusPill(module.status).text} />,
                  <div key={`${module.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ModalLauncher buttonLabel="Edit module" title={`Edit module lifecycle · ${module.title}`} description="Update the selected module and its lifecycle state without leaving the tracker." eyebrow="Edit module" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                      <UpdateModuleForm modules={[module]} returnPath={returnPath} />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel="Delete module" title={`Delete module · ${module.title}`} description="Remove this module from the release tracker." eyebrow="Delete module" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                      <DeleteModuleForm modules={[module]} returnPath={returnPath} />
                    </ModalLauncher>
                  </div>,
                ]) : emptyTableRows(filtersActive ? 'No modules match the current content filters.' : 'No modules are available right now.', 7)}
              />
            </Card>

            <Card title="Lesson inventory" eyebrow="Deployment-ready detail">
              <SimpleTable
                columns={['Lesson', 'Subject', 'Module', 'Mode', 'Duration', 'Status', 'Actions']}
                rows={filteredLessons.length ? filteredLessons.map((lesson) => [
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
                    <ModalLauncher buttonLabel="Edit lifecycle" title={`Edit lesson lifecycle · ${lesson.title}`} description="Use the compact editor for lifecycle, mode, and duration. For actual authoring, open the full lesson editor." eyebrow="Edit lesson" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                      <UpdateLessonForm lessons={[lesson]} returnPath={returnPath} />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel="Delete lesson" title={`Delete lesson · ${lesson.title}`} description="Remove this lesson from the inventory if it no longer belongs here." eyebrow="Delete lesson" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                      <DeleteLessonForm lessons={[lesson]} returnPath={returnPath} />
                    </ModalLauncher>
                  </div>,
                ]) : emptyTableRows(filtersActive ? 'No lessons match the current content filters.' : 'No lessons are available right now.', 7)}
              />
            </Card>
          </section>
        </>
      ) : (
        <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
          <Card title="Release blockers" eyebrow="Blocked modules only">
            <SimpleTable
              columns={['Module', 'Subject', 'Readiness gap', 'Release risk', 'Fix now']}
              rows={filteredBlockedModules.length ? filteredBlockedModules.map((module) => {
                const moduleLessons = filterLessonsForModule(lessons, module);
                const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
                const missingLessons = Math.max(module.lessonCount - readyLessonCount, 0);
                const hasAssessment = moduleHasAssessmentGate(module);
                const isDraftModule = module.status === 'draft';
                const blocker = blockerRiskMeta(missingLessons, hasAssessment, isDraftModule);
                const moduleSubjectId = module.subjectId?.trim() ?? '';
                const canLaunchLessonCreate = Boolean(moduleSubjectId && subjects.some((subject) => subject.id === moduleSubjectId));
                const createLessonHref = canLaunchLessonCreate
                  ? `/content/lessons/new?subjectId=${encodeURIComponent(moduleSubjectId)}&moduleId=${encodeURIComponent(module.id)}&from=%2Fcontent%3Fview%3Dblocked&focus=blockers`
                  : null;

                return [
                  <div key={`${module.id}-title`} style={{ display: 'grid', gap: 6 }}>
                    <strong>{module.title}</strong>
                    <span style={{ color: '#64748b', fontSize: 13 }}>{module.level} • {readyLessonCount}/{module.lessonCount} ready lessons</span>
                  </div>,
                  module.subjectName ?? '—',
                  <div key={`${module.id}-gap`} style={{ display: 'grid', gap: 6, color: '#334155' }}>
                    <span>{missingLessons > 0 ? `${missingLessons} lesson${missingLessons === 1 ? '' : 's'} still need approval or publishing.` : 'Lesson count is ready.'}</span>
                    <span>{hasAssessment ? 'Assessment gate linked.' : 'Assessment gate missing.'}</span>
                    <span style={{ color: isDraftModule ? '#B45309' : '#64748b', fontWeight: isDraftModule ? 800 : 600 }}>
                      {isDraftModule ? 'Module is still draft.' : 'Module status is release-safe.'}
                    </span>
                  </div>,
                  <div key={`${module.id}-risk`} style={{ display: 'grid', gap: 8 }}>
                    <Pill label={blocker.label} tone={blocker.tone} text={blocker.text} />
                    <span style={{ color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
                      {missingLessons > 0 && !hasAssessment
                        ? 'Module cannot ship: content is incomplete and progression has no gate.'
                        : isDraftModule && missingLessons > 0
                          ? 'Lessons are partly ready, but the module is still draft and cannot ship yet.'
                          : isDraftModule && !hasAssessment
                            ? 'This module is still draft and also missing its progression gate.'
                            : isDraftModule
                              ? 'Content is structurally ready, but the draft module status still blocks release.'
                              : missingLessons > 0
                                ? 'Assessment exists, but learner-facing lesson coverage is still short.'
                                : 'Lessons are ready, but progression still has no gate.'}
                    </span>
                  </div>,
                  <div key={`${module.id}-actions`} style={{ display: 'grid', gap: 8 }}>
                    {createLessonHref ? (
                      <Link href={createLessonHref} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none', textAlign: 'center' }}>
                        Add lesson pack
                      </Link>
                    ) : (
                      <div style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', textAlign: 'center', lineHeight: 1.5 }}>
                        Recover subject context first
                      </div>
                    )}
                    {!hasAssessment ? (
                      <ModalLauncher buttonLabel="Create gate" title={`Create assessment gate · ${module.title}`} description="Ship the missing progression gate directly from the blockers-only view." eyebrow="Create assessment" triggerStyle={{ ...iconButtonStyle('#ede9fe', '#5b21b6'), textAlign: 'center', justifyContent: 'center' }}>
                        <CreateAssessmentForm modules={[module]} subjects={subjects} returnPath="/content?view=blocked" />
                      </ModalLauncher>
                    ) : (
                      <Link href={`/content?view=assessments&q=${encodeURIComponent(module.title)}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                        Review gate
                      </Link>
                    )}
                  </div>,
                ];
              }) : [[<span key="release-clear" style={{ color: '#64748b', lineHeight: 1.6 }}>No blocker rows match the current content filters.</span>, '', '', '', '']]}
            />
          </Card>
        </section>
      )}
    </PageShell>
  );
}
