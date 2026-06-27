import Link from 'next/link';
import { CreateStudentForm, DeleteStudentForm, UpdateStudentForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { GeographyFilterBar } from '../../components/geography-filter-bar';
import { LearnerMallamAssignmentForm } from '../../components/learner-mallam-assignment-form';
import { ModalLauncher } from '../../components/modal-launcher';
import { AdminDirectory } from '../../components/admin-directory';
import { fetchCenters, fetchCohorts, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../lib/api';
import { averageAttendancePercent } from '../../lib/attendance';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { filterStudentsByGeography, studentGeographyLabel } from '../../lib/geography';
import { Card, MetricList, PageShell, Pill } from '../../lib/ui';

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'L';
}

function progressPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function levelTone(level?: string | null) {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('confident') || normalized.includes('advanced')) return ['#DCFCE7', '#166534'] as const;
  if (normalized.includes('emerging') || normalized.includes('intermediate')) return ['#FEF3C7', '#92400E'] as const;
  return ['#DBEAFE', '#1D4ED8'] as const;
}

export default async function StudentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Students"
        subtitle="Learner roster control is blocked until production wiring is real, because fake-empty admin pages are worse than an honest blocker."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: students API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the learner roster cannot be trusted for enrollment, routing, attendance follow-up, or pod ownership changes. Fix the env var, redeploy, then verify live learner data.
          </>
        )}
        whyBlocked={[
          'Students is not a read-only vanity page. It drives learner creation, routing, deletion, and mallam assignment against live records.',
          'If production is pointed at localhost, a placeholder host, or no backend at all, showing an empty roster would be a lie with operational consequences.',
        ]}
        verificationItems={[
          {
            surface: 'Learner roster',
            expected: 'Live learners, attendance, pod, and mallam rows load from the backend',
            failure: 'Table looks clean only because the dashboard never connected to the real API',
          },
          {
            surface: 'Add / edit learner flows',
            expected: 'Cohort, pod, mallam, center, and geography selectors load and submit against the live backend',
            failure: 'Forms open with empty selectors, stale references, or writes that go nowhere',
          },
          {
            surface: 'Pod routing actions',
            expected: 'Learner routing reflects the actual pod and mallam graph after save',
            failure: 'Operators think they reassigned a learner when the deployment was disconnected the whole time',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Attendance board', href: '/attendance', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const stateId = typeof query?.stateId === 'string' ? query.stateId : '';
  const localGovernmentId = typeof query?.localGovernmentId === 'string' ? query.localGovernmentId : '';
  const podId = typeof query?.podId === 'string' ? query.podId : '';
  const cohortId = typeof query?.cohortId === 'string' ? query.cohortId : '';
  const mallamId = typeof query?.mallamId === 'string' ? query.mallamId : '';

  const [studentsResult, cohortsResult, podsResult, mallamsResult, centersResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    studentsResult.status === 'rejected' ? 'students' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];
  const criticalRosterFailures = [
    studentsResult.status === 'rejected' ? 'students' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  const hasCoreRosterGap = criticalRosterFailures.length > 0;
  const geographyFilterDegraded = false;

  if (criticalRosterFailures.length) {
    const blockerDetail = criticalRosterFailures.length === 1
      ? `The ${criticalRosterFailures[0]} feed failed to load from the live API. Leaving learner create, edit, delete, or routing controls up would let operators change roster ownership while the core reference graph is blind.`
      : `The ${criticalRosterFailures.join(', ')} feeds failed to load from the live API. Leaving learner create, edit, delete, or routing controls up would let operators change roster ownership while the core reference graph is blind.`;

    return (
      <DeploymentBlockerCard
        title="Students"
        subtitle="Learner admin is a live roster control surface, not a decorative directory. If the core feeds are down, the route should block instead of inviting blind writes."
        blockerHeadline="Deployment blocker: learner roster feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalRosterFailures.length
              ? `Additional degraded feed${failedSources.length - criticalRosterFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalRosterFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={[
          'Operators use this route to enroll learners, reassign pod ownership, change cohort placement, and manage live roster records. If students, cohorts, pods, mallams, centers, states, or local governments disappear, a polished UI becomes dangerous fiction fast.',
          'The create/edit forms on this page depend on the same geography feeds they summarize. If states or local governments disappear, learner routing and enrollment writes become polished guesswork, not a tolerable warning state.',
        ]}
        verificationItems={[
          {
            surface: 'Learner roster + ownership graph',
            expected: 'Live learner rows, cohorts, pods, mallams, and centers all load before operators trust learner admin',
            failure: 'Add, edit, delete, or routing controls remain reachable while the core learner-reference graph is missing or stale',
          },
          {
            surface: 'Enrollment and routing forms',
            expected: 'Cohort, pod, mallam, and center references load from the live backend before a learner write is allowed',
            failure: 'Forms stay interactive while the core reference feeds are missing or stale',
          },
          {
            surface: 'Route trustworthiness',
            expected: 'Deployment review sees a blocker card until the core learner roster feeds recover',
            failure: 'The route implies learner operations are safe when the roster control surface is blind',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Pods', href: '/pods', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Attendance board', href: '/attendance', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
        ]}
      />
    );
  }

  const filteredStudents = filterStudentsByGeography(students, pods, centers, { stateId, localGovernmentId, podId, cohortId, mallamId });
  const activeStudents = filteredStudents.filter((student) => (student.stage || '').toLowerCase() !== 'inactive');
  const avgAttendance = averageAttendancePercent(filteredStudents.map((student) => student.attendanceRate));

  return (
    <PageShell
      title="Students"
      subtitle="Track learner roster health, attendance, and pod-based ownership from one place."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="Add learner"
              title="Add learner"
              description="Create a learner without dumping a giant form into the roster page."
              eyebrow="Learner admin"
              disabled={hasCoreRosterGap}
            >
              <CreateStudentForm cohorts={cohorts} pods={pods} mallams={mallams} centers={centers} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
          </div>
          <Card title="Roster snapshot" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Learners', value: String(filteredStudents.length) },
                { label: 'Active', value: String(activeStudents.length) },
                { label: 'Avg attendance', value: `${avgAttendance}%` },
              ]}
            />
          </Card>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: hasCoreRosterGap ? '#fef2f2' : '#fff7ed', border: `1px solid ${hasCoreRosterGap ? '#fecaca' : '#fed7aa'}`, color: hasCoreRosterGap ? '#b91c1c' : '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          {hasCoreRosterGap
            ? `Learner admin is degraded because the ${failedSources.join(', ')} feed${failedSources.length === 1 ? ' has' : 's have'} failed. The page stays visible so operators get an honest outage surface instead of a crash, but learner roster writes are not trustworthy until the students feed recovers.`
            : `Learner admin recovered with degraded feeds: ${failedSources.join(', ')}. Core learner actions stay live, but geography labels and supporting selectors may be incomplete until those feeds recover.`}
        </div>
      ) : null}

      <GeographyFilterBar
        resetHref="/students"
        fields={[
          { name: 'stateId', label: 'State', value: stateId, options: states.map((state) => ({ value: state.id, label: state.name })) },
          { name: 'localGovernmentId', label: 'Local government', value: localGovernmentId, options: localGovernments.filter((item) => !stateId || item.stateId === stateId).map((item) => ({ value: item.id, label: item.name })) },
          { name: 'podId', label: 'Pod', value: podId, options: pods.map((pod) => ({ value: pod.id, label: pod.label })) },
          { name: 'cohortId', label: 'Cohort', value: cohortId, options: cohorts.map((cohort) => ({ value: cohort.id, label: cohort.name })) },
          { name: 'mallamId', label: 'Mallam', value: mallamId, options: mallams.map((mallam) => ({ value: mallam.id, label: mallam.displayName || mallam.name })) },
        ]}
        helper={hasCoreRosterGap
          ? 'Learner roster feed is unavailable, so this page is showing an outage-safe shell instead of pretending the roster is empty.'
          : geographyFilterDegraded
            ? `Showing ${filteredStudents.length} learner${filteredStudents.length === 1 ? '' : 's'} with degraded geography context because one of the support feeds is down.`
            : `Showing ${filteredStudents.length} learner${filteredStudents.length === 1 ? '' : 's'} in the current geography/program slice.`}
      />
      <AdminDirectory
        title="All learners"
        count={filteredStudents.length}
        searchPlaceholder="Search learners..."
      >
        {hasCoreRosterGap ? (
          <div style={{ color: '#b91c1c', lineHeight: 1.6 }}>Learner roster unavailable. Recover the students feed before using learner admin actions.</div>
        ) : (
          <>
            <div data-directory-view="grid">
              {filteredStudents.map((student) => {
                const attendance = progressPercent(student.attendanceRate);
                const [levelToneColor, levelTextColor] = levelTone(student.level);
                const search = [student.name, student.stage, student.level, student.cohortName, student.podLabel, student.mallamName, studentGeographyLabel(student, pods, centers, states, localGovernments)].filter(Boolean).join(' ');
                const actions = (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link href={`/students/${student.id}`} title="View learner" aria-label="View learner" style={{ textDecoration: 'none', color: '#202436', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>◉</Link>
                    <ModalLauncher buttonLabel={<span aria-hidden="true">✎</span>} title={`Edit ${student.name}`} description="Update learner details without blowing up the table layout." eyebrow="Learner admin" triggerStyle={{ borderRadius: 10, border: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}>
                      <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} centers={centers} states={states} localGovernments={localGovernments} title={`Edit ${student.name}`} />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel={<span aria-hidden="true">⇄</span>} title={`Route ${student.name} by pod`} description="Move the learner by pod and let the primary mallam derive from that pod." eyebrow="Learner routing" triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}>
                      <LearnerMallamAssignmentForm student={student} pods={pods} returnPath="/students" />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel={<span aria-hidden="true">×</span>} title={`Delete ${student.name}`} description="Remove this learner from the live roster carefully." eyebrow="Danger zone" triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 18 }}>
                      <DeleteStudentForm student={student} />
                    </ModalLauncher>
                  </div>
                );

                return (
                  <article key={student.id} data-directory-item data-search={search} style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, border: '1px solid #e4e8ef', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', padding: 22, display: 'grid', gap: 18, boxShadow: '0 18px 45px rgba(76, 83, 112, 0.06)' }}>
                    <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 5, background: 'linear-gradient(90deg, #6D5DF7, #FF79C8, #9EE7F2)' }} />
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 58, height: 58, borderRadius: 999, background: '#E5E7EB', color: '#202436', display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: 20, flex: '0 0 auto' }}>{initials(student.name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 20, color: '#151827' }}>{student.name}</h3>
                        <div style={{ color: '#7b8496', marginTop: 4 }}>Age {student.age || '—'} · {student.cohortName || 'No cohort'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {[['Mallam', student.mallamName || '—'], ['Pod', student.podLabel || '—'], ['Attendance', `${attendance}%`]].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#7b8496' }}><span>{label}:</span><strong style={{ color: '#202436' }}>{value}</strong></div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7b8496' }}><span>Progress</span><strong style={{ color: '#202436' }}>{attendance}%</strong></div>
                      <div style={{ height: 9, borderRadius: 999, background: '#dbe7f5', overflow: 'hidden' }}><div style={{ width: `${attendance}%`, height: '100%', borderRadius: 999, background: '#0B73D9' }} /></div>
                    </div>
                    <div style={{ height: 1, background: '#edf0f6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <Pill label={student.level || student.stage || 'Learner'} tone={levelToneColor} text={levelTextColor} />
                      {actions}
                    </div>
                  </article>
                );
              })}
            </div>
            <div data-directory-view="list">
              {filteredStudents.map((student) => {
                const attendance = progressPercent(student.attendanceRate);
                const [levelToneColor, levelTextColor] = levelTone(student.level);
                const search = [student.name, student.stage, student.level, student.cohortName, student.podLabel, student.mallamName].filter(Boolean).join(' ');
                return (
                  <div key={student.id} data-directory-item data-search={search} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.2fr) 80px 120px minmax(150px, 0.9fr) 150px minmax(220px, 1fr)', gap: 16, alignItems: 'center', padding: '16px 18px', borderRadius: 18, border: '1px solid #edf0f6', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ width: 44, height: 44, borderRadius: 999, background: '#E5E7EB', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{initials(student.name)}</span><strong>{student.name}</strong></div>
                    <div>{student.age || '—'}</div>
                    <Pill label={student.level || 'Learner'} tone={levelToneColor} text={levelTextColor} />
                    <div>{student.mallamName || '—'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ height: 8, width: 72, borderRadius: 999, background: '#dbe7f5', overflow: 'hidden' }}><div style={{ width: `${attendance}%`, height: '100%', background: '#0B73D9' }} /></div>{attendance}%</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Link href={`/students/${student.id}`} title="View learner" aria-label="View learner" style={{ textDecoration: 'none', color: '#202436', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>◉</Link>
                      <ModalLauncher buttonLabel={<span aria-hidden="true">✎</span>} title={`Edit ${student.name}`} description="Update learner details without blowing up the table layout." eyebrow="Learner admin" triggerStyle={{ borderRadius: 10, border: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}>
                        <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} centers={centers} states={states} localGovernments={localGovernments} title={`Edit ${student.name}`} />
                      </ModalLauncher>
                      <ModalLauncher buttonLabel={<span aria-hidden="true">⇄</span>} title={`Route ${student.name} by pod`} description="Move the learner by pod and let the primary mallam derive from that pod." eyebrow="Learner routing" triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}>
                        <LearnerMallamAssignmentForm student={student} pods={pods} returnPath="/students" />
                      </ModalLauncher>
                      <ModalLauncher buttonLabel={<span aria-hidden="true">×</span>} title={`Delete ${student.name}`} description="Remove this learner from the live roster carefully." eyebrow="Danger zone" triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 18 }}>
                        <DeleteStudentForm student={student} />
                      </ModalLauncher>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </AdminDirectory>
    </PageShell>
  );
}
