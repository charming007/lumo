import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ObservationForm } from '../../../components/observation-form';
import { DeploymentBlockerCard } from '../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { LearnerMallamAssignmentForm } from '../../../components/learner-mallam-assignment-form';
import { ApiRequestError, fetchMallams, fetchStudent } from '../../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../../lib/config';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../../lib/ui';

function sectionAlert(message: string, tone: 'warning' | 'neutral' = 'neutral') {
  const palette = tone === 'warning'
    ? { background: '#fff7ed', border: '#fed7aa', text: '#9a3412' }
    : { background: '#f8fafc', border: '#e2e8f0', text: '#64748b' };

  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export default async function StudentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ message?: string }> }) {
  const { id } = await params;

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Learner detail"
        subtitle="Production wiring is incomplete, so learner-level intervention, reassignment, and observation workflows are blocked instead of pretending a specific child record is safely loaded."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: learner detail API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} learner profile detail, progress history, assignment timelines, observation capture, and mallam reassignment cannot be trusted. Fix the env var, redeploy, then verify a real learner record before making intervention decisions.
          </>
        )}
        whyBlocked={[
          'Learner detail is where operators decide what to do next for an actual child. A disconnected page here is not a harmless empty state; it can produce bad support decisions.',
          'Without the production API base, attendance history, mastery, assignment load, and observation context can all vanish while the UI still looks ready to act.',
          'Blocking this route keeps deployment review honest until a live learner record can be verified end-to-end.',
        ]}
        verificationItems={[
          {
            surface: 'Learner profile header',
            expected: 'A real learner name, cohort, mallam, pod, and stage load from production',
            failure: 'Generic shell or empty profile cards that could be mistaken for a valid record',
          },
          {
            surface: 'Intervention + progress detail',
            expected: 'Attendance, mastery, assignments, and recommended actions all reflect live backend data',
            failure: 'Clean-looking cards appear with missing timelines, empty actions, or suspiciously blank assignment history',
          },
          {
            surface: 'Operator actions',
            expected: 'Observation capture and mallam reassignment only run once the live mallam directory and learner detail are loaded',
            failure: 'Controls appear even though the deployment is disconnected from the API',
          },
        ]}
        docs={[
          { label: 'Learner roster blocker', href: '/students', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Dashboard blocker', href: '/', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;

  try {
    const [studentResult, mallamsResult] = await Promise.allSettled([fetchStudent(id), fetchMallams()]);
    if (studentResult.status === 'rejected') {
      if (studentResult.reason instanceof ApiRequestError && studentResult.reason.status === 404) {
        notFound();
      }
      throw studentResult.reason;
    }

    const student = studentResult.value;
    const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
    const progress = asArray(student.progress);
    const attendance = asArray(student.attendance);
    const observations = asArray(student.observations);
    const assignments = asArray(student.assignments);
    const recommendedActions = asArray(student.recommendedActions);
    const summary = {
      attendanceRate: asNumber(student.summary?.attendanceRate),
      latestMastery: typeof student.summary?.latestMastery === 'number' && Number.isFinite(student.summary.latestMastery) ? student.summary.latestMastery : null,
      activeAssignments: asNumber(student.summary?.activeAssignments),
    };

    return (
      <PageShell
        title={student.name}
        subtitle="Learner detail view with progress, attendance, live assignments, and mallam observations in one place."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Learners', href: '/students' },
          { label: student.name },
        ]}
      >
        <FeedbackBanner message={query?.message} />
        {mallamsResult.status === 'rejected' ? (
          <div style={{ marginBottom: 16 }}>
            {sectionAlert('Mallam roster data is temporarily unavailable. Learner detail still loads, but reassignment controls are hidden until that feed recovers.', 'warning')}
          </div>
        ) : null}
        <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
          <Card title="Learner snapshot" eyebrow="Profile">
            <div style={{ ...responsiveGrid(180), gap: 12 }}>
              {[
                ['Cohort', student.cohortName ?? '—'],
                ['Mallam', student.mallamName ?? '—'],
                ['Pod', student.podLabel ?? '—'],
                ['Guardian', student.guardianName ?? '—'],
                ['Device', student.deviceAccess ?? '—'],
                ['Stage', `${student.level} · ${student.stage}`],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>{label}</div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Intervention summary" eyebrow="What to do next">
            <div style={{ ...responsiveGrid(160), gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 14, borderRadius: 16, background: '#eef2ff' }}><strong>{Math.round(summary.attendanceRate * 100)}%</strong><div style={{ color: '#64748b' }}>Attendance</div></div>
              <div style={{ padding: 14, borderRadius: 16, background: '#ecfeff' }}><strong>{summary.latestMastery !== null ? `${Math.round(summary.latestMastery * 100)}%` : '—'}</strong><div style={{ color: '#64748b' }}>Latest mastery</div></div>
              <div style={{ padding: 14, borderRadius: 16, background: '#fef3c7' }}><strong>{summary.activeAssignments}</strong><div style={{ color: '#64748b' }}>Active assignments</div></div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {recommendedActions.map((action) => (
                <div key={action} style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff' }}>{action}</div>
              ))}
            </div>
          </Card>
        </section>

        <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
          <Card title="Progress timeline" eyebrow="Mastery + readiness">
            <SimpleTable
              columns={['Subject', 'Module', 'Mastery', 'Lessons', 'Progression', 'Next module']}
              rows={progress.map((item) => [
                item.subjectName,
                item.moduleTitle ?? '—',
                `${Math.round(item.mastery * 100)}%`,
                String(item.lessonsCompleted),
                <Pill key={item.id} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
                item.recommendedNextModuleTitle ?? '—',
              ])}
            />
          </Card>

          {mallamsResult.status === 'fulfilled' ? (
            <LearnerMallamAssignmentForm student={student} mallams={mallams} returnPath={`/students/${student.id}`} />
          ) : (
            <Card title="Mallam assignment" eyebrow="Temporarily unavailable">
              {sectionAlert('Reassignment controls are paused because the mallam directory feed failed. Retry once the API recovers.', 'warning')}
            </Card>
          )}
          <ObservationForm studentId={student.id} />
        </section>

        <section style={{ ...responsiveGrid(320) }}>
          <Card title="Attendance history" eyebrow="Recent sessions">
            <SimpleTable columns={['Date', 'Status']} rows={attendance.map((item) => [item.date, item.status])} />
          </Card>
          <Card title="Active delivery" eyebrow="Assignments + observations">
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              {assignments.map((assignment) => (
                <div key={assignment.id} style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <strong>{assignment.lessonTitle}</strong>
                  <div style={{ color: '#64748b', marginTop: 4 }}>{assignment.teacherName} • due {assignment.dueDate}</div>
                </div>
              ))}
            </div>
            <SimpleTable columns={['When', 'Support', 'Note']} rows={observations.map((item) => [new Date(item.createdAt).toLocaleString('en-GB'), item.supportLevel, item.note])} />
          </Card>
        </section>
      </PageShell>
    );
  } catch {
    return (
      <PageShell
        title="Learner detail temporarily unavailable"
        subtitle="The learner record could not be loaded from the live API. This is an outage/config problem, not a trustworthy 'record missing' result."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Learners', href: '/students' },
          { label: 'Detail unavailable' },
        ]}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          {sectionAlert('Learner detail failed to load from the API, so this route is intentionally refusing to masquerade as a 404. Check the deployment API URL or backend health, then retry from the learner roster.', 'warning')}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/students" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 800, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
              Back to learners
            </Link>
            <Link href="/reports" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 800, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
              Cross-check reports
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }
}
