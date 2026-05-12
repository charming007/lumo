import { notFound } from 'next/navigation';
import { DeleteMallamForm, UpdateMallamForm } from '../../../components/admin-forms';
import { DeploymentBlockerCard } from '../../../components/deployment-blocker-card';
import { MallamRosterManager } from '../../../components/mallam-roster-manager';
import { ModalLauncher } from '../../../components/modal-launcher';
import { fetchCenters, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../../lib/config';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

export default async function MallamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Mallam detail"
        subtitle="Production wiring is incomplete, so facilitator detail is blocked instead of pretending roster coverage is trustworthy."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: mallam detail API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} facilitator profile edits, pod coverage, and learner roster routing would otherwise degrade into misleading fallback states. Fix the env var, redeploy, then verify the live mallam detail flow.
          </>
        )}
        whyBlocked={[
          'Mallam detail drives real facilitator coverage decisions. A calm-looking record backed by localhost, placeholder data, or no backend is operational garbage.',
          'This route controls profile edits, pod ownership, and learner routing. If the API target is unsafe, the honest move is to block loudly instead of faking a healthy roster lane.',
        ]}
        verificationItems={[
          {
            surface: 'Mallam profile',
            expected: 'Live facilitator profile, certification, and coverage data load from production',
            failure: 'Empty or placeholder mallam detail that still looks editable',
          },
          {
            surface: 'Roster management',
            expected: 'Assigned and candidate learners reflect the live pod roster',
            failure: 'Learner lists look suspiciously empty or disconnected from pod coverage',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Mallams blocker', href: '/mallams', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const { id } = await params;
  const [mallamsResult, centersResult, podsResult, studentsResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
    fetchStudents(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  if (mallamsResult.status === 'rejected') {
    return (
      <DeploymentBlockerCard
        title="Mallam detail"
        subtitle="The facilitator detail route is blocked because the live mallam feed is unavailable, so a fake 404 would be a lie."
        blockerHeadline="Deployment blocker: mallam detail feed is unavailable."
        blockerDetail={(
          <>
            The mallam feed failed before this route could verify the requested facilitator. Treating a failed facilitator lookup as “mallam not found” would hide a live outage behind a fake 404.
          </>
        )}
        whyBlocked={[
          'Mallam detail cannot distinguish “record missing” from “backend unavailable” if the core facilitator feed failed outright.',
          'Operators should not lose the route behind a fake not-found screen when the real problem is a live roster outage.',
        ]}
        verificationItems={[
          {
            surface: 'Mallam detail route',
            expected: 'Requested facilitator record loads before detail UI renders',
            failure: 'The route drops into 404 even though the facilitator API is degraded',
          },
          {
            surface: 'Roster controls',
            expected: 'Edit and roster actions only appear when the core mallam feed is trustworthy',
            failure: 'Operators can act on a detail shell that never proved the facilitator record exists',
          },
        ]}
        docs={[
          { label: 'Mallams overview', href: '/mallams', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Dashboard', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
        ]}
      />
    );
  }

  const mallams = mallamsResult.value;
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    centersResult.status === 'rejected' ? 'centers' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    studentsResult.status === 'rejected' ? 'students' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  const mallam = mallams.find((item) => item.id === id);
  if (!mallam) notFound();

  const coveredPodIds = new Set(mallam.podIds || []);
  const assignedLearners = students.filter((student) => student.mallamId === mallam.id);
  const unassignedLearners = students.filter((student) => {
    if (student.mallamId === mallam.id) return false;
    if (!coveredPodIds.size) return !student.mallamId;
    return coveredPodIds.has(student.podId || '') && student.mallamId !== mallam.id;
  });

  return (
    <PageShell
      title={mallam.displayName || mallam.name}
      subtitle="Mallam admin detail for profile updates, pod-first roster control, and deletion."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Mallams', href: '/mallams' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="✏️ Edit mallam"
              title={`Edit ${mallam.displayName || mallam.name}`}
              description="Update mallam details from a focused popup instead of a giant inline form."
              eyebrow="Mallam admin"
              triggerStyle={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', boxShadow: 'none' }}
            >
              <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel="🗑️ Delete mallam"
              title={`Delete ${mallam.displayName || mallam.name}`}
              description="Remove this mallam from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', boxShadow: 'none' }}
            >
              <DeleteMallamForm mallam={mallam} />
            </ModalLauncher>
          </div>
          <Card title="Mallam snapshot" eyebrow="Coverage">
            <MetricList
              items={[
                { label: 'Learners', value: String(mallam.learnerCount || 0) },
                { label: 'Pod coverage', value: String(mallam.podLabels?.length || 0) },
                { label: 'Status', value: mallam.status || '—' },
                { label: 'Center', value: mallam.centerName || '—' },
              ]}
            />
          </Card>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          Mallam detail recovered with degraded feeds: {failedSources.join(', ')}. Core facilitator record is still loaded, but roster management and profile forms may have reduced geography or learner context until those feeds recover.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Mallam profile" eyebrow={mallam.role || 'Mallam'}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={mallam.status || 'Unknown'} tone="#ECFDF5" text="#166534" />
              <Pill label={mallam.certificationLevel || 'Certification pending'} tone="#EEF2FF" text="#3730A3" />
            </div>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              Languages: <strong>{(mallam.languages || []).join(', ') || '—'}</strong><br />
              Primary pod: <strong>{mallam.podLabels?.[0] || '—'}</strong><br />
              Pod coverage: <strong>{(mallam.podLabels || []).join(', ') || '—'}</strong><br />
              Region: <strong>{mallam.region || '—'}</strong>
            </div>
          </div>
        </Card>
        <MallamRosterManager
          mallam={mallam}
          roster={assignedLearners}
          candidateLearners={unassignedLearners}
          mallams={mallams}
          returnPath={`/mallams/${mallam.id}`}
        />
      </section>

    </PageShell>
  );
}
