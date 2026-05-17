import Link from 'next/link';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { EnglishStudioAuthoringForm } from '../../components/english-studio-authoring-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { createLessonAction } from '../actions';
import { fetchAssessments, fetchAssignments, fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../lib/api';
import { buildEnglishLessonBlueprints, buildEnglishOpsSummary } from '../../lib/english-curriculum';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { filterModulesForSubject } from '../../lib/module-subject-match';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function emptyRows(message: string) {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '']];
}

export default async function EnglishStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const query = await searchParams;

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="English Studio"
        subtitle="Production wiring is incomplete, so English authoring is blocked instead of pretending lesson creation is safe."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: English Studio API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} English Studio would otherwise advertise live lesson authoring while pointing at a dead, placeholder, or localhost backend. Fix the env var, redeploy, then re-check <code>/english</code> before trusting any authoring flow.
          </>
        )}
        whyBlocked={[
          'English Studio is already linked from the LMS shell and dashboard as a live operator route. Letting it open on unsafe backend wiring would be pure trust-destroying theatre.',
          'Creating lessons against the wrong API target risks saving into the wrong environment or faking a healthy authoring lane when nothing production-safe exists.',
        ]}
        verificationItems={[
          {
            surface: 'English lane bootstrap',
            expected: 'The route only opens when the LMS is wired to a production-safe API base',
            failure: 'English Studio renders while NEXT_PUBLIC_API_BASE_URL is missing, placeholder-only, or pointed at localhost',
          },
          {
            surface: 'Authoring controls',
            expected: 'Module selection, readiness cues, and lesson creation all run against live English curriculum data',
            failure: 'The page looks usable but is really backed by empty fallback data or the wrong environment',
          },
          {
            surface: 'Dashboard handoff',
            expected: 'Operators can move from dashboard to /english without hitting a fake-live shell',
            failure: 'Dashboard advertises English Studio as live, then the route silently opens on unsafe backend wiring',
          },
        ]}
        docs={[
          { label: 'Dashboard', href: '/', background: '#111827', color: '#FFFFFF', border: '1px solid #1F2937' },
          { label: 'Content library', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const [subjectsResult, modulesResult, assessmentsResult, assetsResult, lessonsResult, assignmentsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchAssessments(),
    fetchLessonAssets(),
    fetchLessons(),
    fetchAssignments(),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];

  const englishSubject = subjects.find((subject) => subject.name.toLowerCase().includes('english')) ?? null;
  const englishModules = englishSubject
    ? filterModulesForSubject(modules, englishSubject)
    : modules.filter((module) => module.subjectName?.toLowerCase().includes('english'));
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assignmentsResult.status === 'rejected' ? 'assignments' : null,
  ].filter(Boolean) as string[];
  const criticalEnglishStudioFailures = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
  ].filter(Boolean) as string[];
  const missingEnglishLane = !englishSubject || !englishModules.length;

  if (criticalEnglishStudioFailures.length || missingEnglishLane) {
    const secondaryFailures = failedSources.filter((source) => !criticalEnglishStudioFailures.includes(source));

    return (
      <DeploymentBlockerCard
        title="English Studio"
        subtitle="English authoring is blocked when the curriculum lane, assessment context, or asset library goes blind, because polished lesson creation against partial live state is still broken." 
        blockerHeadline={missingEnglishLane
          ? 'Deployment blocker: English Studio cannot recover a real curriculum lane.'
          : 'Deployment blocker: English Studio authoring feeds are degraded.'}
        blockerDetail={missingEnglishLane
          ? (
            <>
              The English subject or module lane did not load from the live API, so this route refuses to pretend authoring is available. Failed feed{failedSources.length === 1 ? '' : 's'}: {failedSources.join(', ') || 'unknown'}.
            </>
          )
          : (
            <>
              The {criticalEnglishStudioFailures.join(', ')} feed{criticalEnglishStudioFailures.length === 1 ? ' failed' : 's failed'} to load from the live API, so English Studio cannot safely author or preview lesson payloads. {secondaryFailures.length
                ? `Additional degraded feed${secondaryFailures.length === 1 ? '' : 's'}: ${secondaryFailures.join(', ')}.`
                : ''}
            </>
          )}
        whyBlocked={missingEnglishLane
          ? [
              'Navigation, dashboard handoffs, and README copy already present English Studio as a live operator flow. Leaving the route as a decorative shell would create release confusion fast.',
              'Authoring without a verified English subject + module lane risks creating lessons in the wrong curriculum context or advertising a flow that cannot actually save safely.',
              'Blocking here is correct when the curriculum lane itself is missing — not as a leftover pilot-era excuse card.',
            ]
          : [
              'This form is not a harmless draft pad. It builds lesson steps, assessment context, and media references against live curriculum state.',
              'If the assessments or assets feed is down, operators can still create lessons that look finished while the readiness gate or media payload is blind. That is deployment-grade bullshit.',
              'A loud blocker is safer than letting English Studio keep its buttons while critical authoring dependencies are missing.',
            ]}
        verificationItems={missingEnglishLane
          ? [
              {
                surface: 'English subject lane',
                expected: 'At least one real English subject loads from the API',
                failure: 'Route opens but cannot scope authoring to English',
              },
              {
                surface: 'English module inventory',
                expected: 'At least one English module is available for lesson authoring',
                failure: 'Operators can open the route but cannot attach lessons to a real module',
              },
              {
                surface: 'Route behavior',
                expected: 'English Studio shows live authoring controls, readiness cues, and launch links',
                failure: 'Old pilot blocker or empty decorative shell still renders after deploy',
              },
            ]
          : [
              {
                surface: 'Assessment context',
                expected: 'English Studio can load the live assessment lane before generating readiness-aware lesson payloads',
                failure: 'Operators can keep authoring while the assessment feed is blind or stale',
              },
              {
                surface: 'Asset library handoff',
                expected: 'Structured lesson steps can attach to live lesson assets instead of an empty fallback list',
                failure: 'The form stays interactive while media references are silently unavailable',
              },
              {
                surface: 'Route trustworthiness',
                expected: 'The route hard-blocks until critical authoring feeds recover',
                failure: 'Dashboard-linked English authoring still looks usable during a critical feed outage',
              },
            ]}
        fixItems={missingEnglishLane
          ? [
              { label: 'English subject', value: englishSubject ? englishSubject.name : 'Missing' },
              { label: 'English modules', value: englishModules.length ? String(englishModules.length) : 'Missing' },
              { label: 'Operator action', value: 'Restore the English curriculum feeds, then redeploy and re-check /english.' },
            ]
          : [
              { label: 'Critical failed feeds', value: criticalEnglishStudioFailures.join(', ') },
              { label: 'English subject', value: englishSubject?.name ?? 'Recovered but not trustworthy' },
              { label: 'English modules', value: englishModules.length ? String(englishModules.length) : 'Missing' },
              { label: 'Operator action', value: 'Restore assessment + asset authoring context before trusting English Studio again.' },
            ]}
        docs={[
          { label: 'Dashboard', href: '/', background: '#111827', color: '#FFFFFF', border: '1px solid #1F2937' },
          { label: 'Content library', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Lesson Studio', href: '/content/lessons/new?from=%2Fenglish', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const englishSummary = buildEnglishOpsSummary({ subjects, modules, lessons, assignments });
  const lessonBlueprints = buildEnglishLessonBlueprints({ subjects, modules, lessons, assessments });

  return (
    <PageShell
      title="English Studio"
      subtitle="Live English authoring lane for blueprinting, readiness checks, and lesson creation. This route is part of the real LMS shell now, not pilot-era theatre."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content Library', href: '/content' },
      ]}
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/content?subject=english" style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 800, textDecoration: 'none', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open content lane
          </Link>
          <Link href="/content/lessons/new?from=%2Fenglish" style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 800, textDecoration: 'none', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>
            Open Lesson Studio
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />

      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          English Studio recovered with secondary degraded feeds: {failedSources.join(', ')}. Lesson creation stays live only because the critical curriculum, assessment, and asset context is still loaded, but treat readiness snapshots and downstream delivery evidence as incomplete until those supporting feeds recover.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="English lane snapshot" eyebrow="Operational readout">
          <MetricList
            items={[
              { label: 'English modules', value: String(englishSummary.moduleCount) },
              { label: 'English lessons', value: String(englishSummary.lessonCount) },
              { label: 'Published lessons', value: String(englishSummary.publishedLessons) },
              { label: 'Live assignments', value: String(englishSummary.liveAssignments) },
            ]}
          />
        </Card>
        <Card title="Readiness pressure" eyebrow="What still needs work">
          <MetricList
            items={[
              { label: 'Modules missing lessons', value: String(englishSummary.modulesMissingLessons) },
              { label: 'Lessons in review', value: String(englishSummary.lessonsInReview) },
              { label: 'Assessments loaded', value: String(assessments.length) },
              { label: 'Assets loaded', value: String(assets.length) },
            ]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 20, marginBottom: 20 }}>
        <Card title="English blueprint + authoring" eyebrow="Create the next lesson pack">
          <EnglishStudioAuthoringForm
            subjects={subjects}
            modules={modules}
            assessments={assessments}
            assets={assets}
            action={createLessonAction}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
        <Card title="Current lesson readiness" eyebrow="What the lane already proves">
          <SimpleTable
            columns={['Lesson', 'Module', 'Readiness', 'Risk']}
            rows={lessonBlueprints.length ? lessonBlueprints.slice(0, 8).map((blueprint) => [
              <div key={blueprint.lessonId} style={{ display: 'grid', gap: 6 }}>
                <strong>{blueprint.lessonTitle}</strong>
                <div style={{ color: '#64748b' }}>{blueprint.objective}</div>
              </div>,
              blueprint.moduleTitle,
              <Pill label={`${blueprint.readinessScore}/${blueprint.readinessChecks.length} checks`} tone={blueprint.readinessScore === blueprint.readinessChecks.length ? '#DCFCE7' : blueprint.readinessScore >= 3 ? '#FEF3C7' : '#FEE2E2'} text={blueprint.readinessScore === blueprint.readinessChecks.length ? '#166534' : blueprint.readinessScore >= 3 ? '#92400E' : '#991B1B'} />,
              blueprint.releaseRisk,
            ]) : emptyRows('No English lesson evidence is loading right now.')}
          />
        </Card>

        <Card title="Operator reality check" eyebrow="Keep the route honest">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', lineHeight: 1.7 }}>
              English Studio is deployment-critical because the LMS shell, sidebar, and docs already advertise it as live. A blocker card here means operators get told a core route exists, then hit a dead end the moment they try to use it.
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730A3', lineHeight: 1.7 }}>
              Best handoff: author the lesson here, then jump into full Lesson Studio for final payload edits and asset linking when needed.
            </div>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
