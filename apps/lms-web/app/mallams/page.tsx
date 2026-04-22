import Link from 'next/link';
import { CreateMallamForm, DeleteMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchMallams, fetchPods, fetchStudents } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function MallamsPage() {
  const [mallams, centers, pods, students] = await Promise.all([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
    fetchStudents(),
  ]);
  const active = mallams.filter((mallam) => (mallam.status || '').toLowerCase() === 'active');

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
            >
              <CreateMallamForm centers={centers} pods={pods} />
            </ModalLauncher>
          </div>
          <Card title="Mallam coverage" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Mallams', value: String(mallams.length) },
                { label: 'Active', value: String(active.length) },
                { label: 'Pods covered', value: String(new Set(mallams.flatMap((mallam) => mallam.podLabels || [])).size) },
              ]}
            />
          </Card>
        </div>
      }
    >
      <SimpleTable
        columns={['Mallam', 'Status', 'Learners', 'Pods', 'Languages', 'Center', 'Actions']}
        rows={mallams.map((mallam) => [
          <div key={`${mallam.id}-name`}>
            <strong>{mallam.displayName || mallam.name}</strong>
            <div style={{ color: '#64748b', marginTop: 4 }}>{mallam.role || 'Mallam'} · {mallam.region || 'Unknown region'}</div>
          </div>,
          <Pill key={`${mallam.id}-status`} label={mallam.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          String(mallam.learnerCount || 0),
          (mallam.podLabels || []).join(', ') || '—',
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
              <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} />
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
