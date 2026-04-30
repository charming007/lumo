import Link from 'next/link';
import { CreateStudentForm, DeleteStudentForm, UpdateStudentForm } from '../../components/admin-forms';
import { GeographyFilterBar } from '../../components/geography-filter-bar';
import { LearnerMallamAssignmentForm } from '../../components/learner-mallam-assignment-form';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchCohorts, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../lib/api';
import { averageAttendancePercent, formatAttendancePercent } from '../../lib/attendance';
import { filterStudentsByGeography, studentGeographyLabel } from '../../lib/geography';
import { Card, MetricList, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function StudentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
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

  const hasCoreRosterGap = studentsResult.status === 'rejected';
  const geographyFilterDegraded = podsResult.status === 'rejected' || centersResult.status === 'rejected' || statesResult.status === 'rejected' || localGovernmentsResult.status === 'rejected';
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
      <SimpleTable
        columns={['Learner', 'Stage', 'Geography', 'Cohort', 'Pod', 'Mallam', 'Attendance', 'Actions']}
        rows={hasCoreRosterGap ? [[
          <span key="students-outage" style={{ color: '#b91c1c', lineHeight: 1.6 }}>Learner roster unavailable. Recover the students feed before using learner admin actions.</span>,
          '', '', '', '', '', '', '',
        ]] : filteredStudents.map((student) => [
          <div key={`${student.id}-name`}>
            <strong>{student.name}</strong>
            <div style={{ color: '#64748b', marginTop: 4 }}>Age {student.age || '—'} · {student.gender || 'N/A'}</div>
          </div>,
          <Pill key={`${student.id}-stage`} label={student.stage || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          studentGeographyLabel(student, pods, centers, states, localGovernments),
          student.cohortName || '—',
          student.podLabel || '—',
          student.mallamName || '—',
          formatAttendancePercent(student.attendanceRate),
          <div key={`${student.id}-actions`} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/students/${student.id}`} title="View learner" aria-label="View learner" style={{ textDecoration: 'none', borderRadius: 10, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730A3', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
              👁
            </Link>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">✏️</span>}
              title={`Edit ${student.name}`}
              description="Update learner details without blowing up the table layout."
              eyebrow="Learner admin"
              triggerStyle={{ borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} centers={centers} states={states} localGovernments={localGovernments} title={`Edit ${student.name}`} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">🗑️</span>}
              title={`Delete ${student.name}`}
              description="Remove this learner from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <DeleteStudentForm student={student} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">🧭</span>}
              title={`Route ${student.name} by pod`}
              description="Move the learner by pod and let the primary mallam derive from that pod."
              eyebrow="Learner routing"
              triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <LearnerMallamAssignmentForm student={student} pods={pods} returnPath="/students" />
            </ModalLauncher>
          </div>,
        ])}
      />
    </PageShell>
  );
}
