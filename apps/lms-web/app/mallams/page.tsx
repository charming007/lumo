import Link from 'next/link';
import { CreateMallamForm, DeleteMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { GeographyFilterBar } from '../../components/geography-filter-bar';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../lib/api';
import { filterMallamsByGeography, mallamGeographyLabel } from '../../lib/geography';
import { Card, MetricList, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function MallamsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const stateId = typeof query?.stateId === 'string' ? query.stateId : '';
  const localGovernmentId = typeof query?.localGovernmentId === 'string' ? query.localGovernmentId : '';
  const podId = typeof query?.podId === 'string' ? query.podId : '';

  const [mallamsResult, centersResult, podsResult, studentsResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
    fetchStudents(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    studentsResult.status === 'rejected' ? 'students' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  const hasCoreRosterGap = mallamsResult.status === 'rejected';
  const geographyFilterDegraded = centersResult.status === 'rejected' || statesResult.status === 'rejected' || localGovernmentsResult.status === 'rejected';
  const filteredMallams = filterMallamsByGeography(mallams, centers, { stateId, localGovernmentId, podId });
  const active = filteredMallams.filter((mallam) => (mallam.status || '').toLowerCase() === 'active');
  const podCoverageCount = new Set(mallams.flatMap((mallam) => mallam.podLabels || [])).size;

  return (
    <PageShell
      title="Mallams"
      subtitle="Manage facilitator coverage, assigned pods, languages, and center distribution."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="Add mallam"
              title="Add mallam"
              description="Create a mallam from a focused popup instead of burying a long form inside the page grid."
              eyebrow="Mallam admin"
              disabled={hasCoreRosterGap}
            >
              <CreateMallamForm centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
          </div>
          <Card title="Mallam coverage" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Mallams', value: String(filteredMallams.length) },
                { label: 'Active', value: String(active.length) },
                { label: 'Pods covered', value: String(podCoverageCount) },
              ]}
            />
          </Card>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: hasCoreRosterGap ? '#fef2f2' : '#fff7ed', border: `1px solid ${hasCoreRosterGap ? '#fecaca' : '#fed7aa'}`, color: hasCoreRosterGap ? '#b91c1c' : '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          {hasCoreRosterGap
            ? `Mallam admin is degraded because the ${failedSources.join(', ')} feed${failedSources.length === 1 ? ' has' : 's have'} failed. The page stays visible so operators get an honest outage surface instead of a crash, but mallam profile and roster writes are not trustworthy until the mallams feed recovers.`
            : `Mallam admin recovered with degraded feeds: ${failedSources.join(', ')}. Core mallam actions stay live, but geography coverage and supporting labels may be incomplete until those feeds recover.`}
        </div>
      ) : null}

      <GeographyFilterBar
        resetHref="/mallams"
        fields={[
          { name: 'stateId', label: 'State', value: stateId, options: states.map((state) => ({ value: state.id, label: state.name })) },
          { name: 'localGovernmentId', label: 'Local government', value: localGovernmentId, options: localGovernments.filter((item) => !stateId || item.stateId === stateId).map((item) => ({ value: item.id, label: item.name })) },
          { name: 'podId', label: 'Pod', value: podId, options: pods.map((pod) => ({ value: pod.id, label: pod.label })) },
        ]}
        helper={hasCoreRosterGap
          ? 'Mallam roster feed is unavailable, so this page is showing an outage-safe shell instead of pretending facilitator coverage is empty.'
          : geographyFilterDegraded
            ? `Showing ${filteredMallams.length} mallam profile${filteredMallams.length === 1 ? '' : 's'} with degraded geography context because one of the region feeds is down.`
            : `Showing ${filteredMallams.length} mallam profile${filteredMallams.length === 1 ? '' : 's'} in the selected geography slice.`}
      />
      <SimpleTable
        columns={['Mallam', 'Status', 'Geography', 'Learners', 'Primary pod', 'Languages', 'Center', 'Actions']}
        rows={hasCoreRosterGap ? [[
          <span key="mallams-outage" style={{ color: '#b91c1c', lineHeight: 1.6 }}>Mallam roster unavailable. Recover the mallams feed before using facilitator admin actions.</span>,
          '', '', '', '', '', '', '',
        ]] : filteredMallams.map((mallam) => [
          <div key={`${mallam.id}-name`}>
            <strong>{mallam.displayName || mallam.name}</strong>
            <div style={{ color: '#64748b', marginTop: 4 }}>{mallam.role || 'Mallam'} · {mallam.region || 'Unknown region'}</div>
          </div>,
          <Pill key={`${mallam.id}-status`} label={mallam.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          mallamGeographyLabel(mallam, centers, states, localGovernments),
          String(mallam.learnerCount || 0),
          mallam.podLabels?.[0] || '—',
          (mallam.languages || []).join(', ') || '—',
          mallam.centerName || '—',
          <div key={`${mallam.id}-actions`} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/mallams/${mallam.id}`} title="View mallam profile" aria-label="View mallam profile" style={{ textDecoration: 'none', borderRadius: 10, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730A3', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
              👁
            </Link>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">✏️</span>}
              title={`Edit ${mallam.displayName || mallam.name}`}
              description="Update mallam details without stretching the table row into a form graveyard."
              eyebrow="Mallam admin"
              triggerStyle={{ borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">🗑️</span>}
              title={`Delete ${mallam.displayName || mallam.name}`}
              description="Remove this mallam from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <DeleteMallamForm mallam={mallam} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">🧭</span>}
              title={`Manage roster for ${mallam.displayName || mallam.name}`}
              description="Assign, remove, or re-route learners without leaving the mallams table."
              eyebrow="Roster control"
              triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <div style={{ display: 'grid', gap: 16 }}>
                <Card title="Mallam roster manager" eyebrow="Roster control">
                  <div style={{ color: '#475569', lineHeight: 1.6 }}>
                    Use the mallam profile for the full roster surface. This quick action is intentionally lightweight from the table.
                  </div>
                </Card>
                <Link href={`/mallams/${mallam.id}`} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
                  Open full roster manager
                </Link>
              </div>
            </ModalLauncher>
          </div>,
        ])}
      />
    </PageShell>
  );
}
