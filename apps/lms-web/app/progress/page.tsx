import type { ReactNode } from 'react';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ProgressCaptureForm, ProgressUpdateForm } from '../../components/progress-form';
import { fetchCohorts, fetchCurriculumModules, fetchMallams, fetchPods, fetchProgress, fetchStudents, fetchSubjects } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function emptyProgressRows(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '', '']];
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

export default async function ProgressPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; cohort?: string | string[]; pod?: string | string[]; mallam?: string | string[]; subject?: string | string[]; status?: string | string[] }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Progress"
        subtitle="Production wiring is incomplete, so progression controls are refusing to fake confidence."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: progress API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} mastery rows, progression readiness, and override workflows would degrade into misleading empty-state output. Fix the env var, redeploy, then verify live progression data before making learner decisions.
          </>
        )}
        whyBlocked={[
          'This route is not just a read-only dashboard. It drives progression capture and override decisions, so quiet fallback rows here would invite bad admin actions.',
          'Without the production API base, learner, subject, module, cohort, pod, and mallam dependencies are all operationally untrustworthy on this page.',
        ]}
        verificationItems={[
          {
            surface: 'Mastery board',
            expected: 'Live learner progression rows load with real mastery and readiness states',
            failure: 'Empty board or generic unavailable copy with no real API data',
          },
          {
            surface: 'Progress capture',
            expected: 'Learner, subject, and module selectors load from the backend before writes are allowed',
            failure: 'Forms appear usable while dependency feeds are missing',
          },
          {
            surface: 'Progress updates',
            expected: 'Override and next-module decisions reflect current live records',
            failure: 'Operators are making decisions against stale or empty fallback data',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
          { label: 'Assignments', href: '/assignments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [progressResult, studentsResult, subjectsResult, modulesResult, cohortsResult, podsResult, mallamsResult] = await Promise.allSettled([
    fetchProgress(),
    fetchStudents(),
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);

  const progress = progressResult.status === 'fulfilled' ? progressResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const failedSources = [
    progressResult.status === 'rejected' ? 'progress board' : null,
    studentsResult.status === 'rejected' ? 'learners' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
  ].filter(Boolean);
  const canCaptureProgress = students.length > 0 && subjects.length > 0 && modules.length > 0;

  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const cohortFilter = normalizeFilterValue(query?.cohort).trim();
  const podFilter = normalizeFilterValue(query?.pod).trim();
  const mallamFilter = normalizeFilterValue(query?.mallam).trim();
  const subjectFilter = normalizeFilterValue(query?.subject).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();

  const filteredStudents = students.filter((student) => {
    const cohortMatches = !cohortFilter || student.cohortId === cohortFilter;
    const podMatches = !podFilter || student.podId === podFilter;
    const mallamMatches = !mallamFilter || student.mallamId === mallamFilter;
    return cohortMatches && podMatches && mallamMatches;
  });
  const filteredStudentIds = new Set(filteredStudents.map((student) => student.id));
  const filteredProgress = progress.filter((item) => {
    const student = students.find((entry) => entry.id === item.studentId);
    const cohortMatches = !cohortFilter || student?.cohortId === cohortFilter;
    const podMatches = !podFilter || student?.podId === podFilter;
    const mallamMatches = !mallamFilter || student?.mallamId === mallamFilter;
    const subjectMatches = !subjectFilter || item.subjectId === subjectFilter;
    const statusMatches = !statusFilter || item.progressionStatus === statusFilter;
    const queryMatches = matchesQuery([
      item.studentName,
      item.subjectName,
      item.moduleTitle,
      item.recommendedNextModuleTitle,
      student?.cohortName,
      student?.podLabel,
      student?.mallamName,
    ], searchText);
    return cohortMatches && podMatches && mallamMatches && subjectMatches && statusMatches && queryMatches;
  });
  const filtersActive = Boolean(searchText || cohortFilter || podFilter || mallamFilter || subjectFilter || statusFilter);

  return (
    <PageShell title="Progress" subtitle="Track mastery, progression readiness, and admin override decisions across learners.">
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Progress is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Progress filters" eyebrow="Scope the board before you start overriding people blind">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search learner, module, or next move" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <select name="cohort" defaultValue={cohortFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All cohorts</option>
                {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
              </select>
              <select name="pod" defaultValue={podFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All pods</option>
                {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
              </select>
              <select name="mallam" defaultValue={mallamFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All mallams</option>
                {mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}
              </select>
              <select name="subject" defaultValue={subjectFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All subjects</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All progression states</option>
                <option value="on-track">On track</option>
                <option value="watch">Watch</option>
                <option value="ready">Ready</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/progress" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 16, color: '#475569', fontWeight: 700 }}>
          Showing {filteredProgress.length} progress record{filteredProgress.length === 1 ? '' : 's'} for the current scope.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Mastery board" eyebrow="Readiness operations">
          <SimpleTable
            columns={['Student', 'Subject', 'Module', 'Mastery', 'Lessons completed', 'Progression', 'Next module']}
            rows={filteredProgress.length ? filteredProgress.map((item) => [
              item.studentName,
              item.subjectName,
              item.moduleTitle ?? '—',
              `${Math.round(item.mastery * 100)}%`,
              String(item.lessonsCompleted),
              <Pill key={item.id} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
              item.recommendedNextModuleTitle ?? '—',
            ]) : emptyProgressRows(filtersActive ? 'No progress records match the current filters.' : 'Progress data is unavailable right now.')}
          />
        </Card>
        <div style={{ display: 'grid', gap: 16 }}>
          {canCaptureProgress ? (
            <ProgressCaptureForm students={filteredStudents.length ? filteredStudents : students} subjects={subjects} modules={modules} />
          ) : (
            <Card title="Capture progress" eyebrow="Unavailable right now">
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                Progress capture is paused until the learner, subject, and module lists load again. Better a clear pause than poisoned records.
              </div>
            </Card>
          )}
          {filteredProgress.length && modules.length ? <ProgressUpdateForm progress={filteredProgress.filter((item) => !filteredStudentIds.size || filteredStudentIds.has(item.studentId ?? ''))} modules={modules} /> : null}
        </div>
      </section>
    </PageShell>
  );
}
