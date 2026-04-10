import { CreateMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchMallams, fetchPods, fetchStudents } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function MallamsPage({ searchParams }: { searchParams?: Promise<{ message?: string; edit?: string }> }) {
  const query = await searchParams;
  const [mallams, students, centers, pods] = await Promise.all([fetchMallams(), fetchStudents(), fetchCenters(), fetchPods()]);
  const selectedMallam = mallams.find((mallam) => mallam.id === query?.edit) ?? mallams[0];

  return (
    <PageShell
      title="Mallams"
      subtitle="Mallam operations with visible roster ownership, profile drill-down, and quick admin updates."
      aside={
        <ModalLauncher
          buttonLabel="Add Mallam"
          title="Add mallam"
          description="Create a new mallam profile from the deployment roster without losing context."
        >
          <CreateMallamForm centers={centers} pods={pods} />
        </ModalLauncher>
      }
    >
      <FeedbackBanner message={query?.message} />
      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Deployment roster" eyebrow="Profile-first">
          <div style={{ display: 'grid', gap: 14 }}>
            {mallams.map((mallam) => {
              const roster = students.filter((student) => student.mallamId === mallam.id);
              return (
                <div key={mallam.id} style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10, alignItems: 'center' }}>
                    <div>
                      <a href={`/mallams/${mallam.id}`} style={{ fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>{mallam.displayName}</a>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{mallam.centerName ?? mallam.region} • {mallam.podLabels.join(', ') || 'No pod mapped yet'}</div>
                      <a href={`/mallams?edit=${mallam.id}`} style={{ color: '#0f766e', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>Edit in form</a>
                    </div>
                    <Pill label={mallam.status} tone={mallam.status === 'active' ? '#DCFCE7' : '#FEF3C7'} text={mallam.status === 'active' ? '#166534' : '#92400E'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, color: '#334155' }}>
                    <div><strong>{roster.length}</strong><div style={{ color: '#64748b' }}>Rostered learners</div></div>
                    <div><strong>{mallam.certificationLevel}</strong><div style={{ color: '#64748b' }}>Certification</div></div>
                    <div><strong>{mallam.role}</strong><div style={{ color: '#64748b' }}>Deployment role</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SimpleTable
          columns={['Name', 'Center', 'Region', 'Pods', 'Learners', 'Certification', 'Status', 'Actions']}
          rows={mallams.map((mallam) => [
            <strong key={mallam.id}>{mallam.displayName}</strong>,
            mallam.centerName ?? '—',
            mallam.region,
            mallam.podLabels.join(', '),
            String(students.filter((student) => student.mallamId === mallam.id).length),
            mallam.certificationLevel,
            <Pill key={`${mallam.id}-status`} label={mallam.status} tone={mallam.status === 'active' ? '#DCFCE7' : '#FEF3C7'} text={mallam.status === 'active' ? '#166534' : '#92400E'} />,
            <div key={`${mallam.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={`/mallams/${mallam.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
              <a href={`/mallams?edit=${mallam.id}`} style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>Edit mallam</a>
            </div>,
          ])}
        />

        {selectedMallam ? (
          <UpdateMallamForm mallam={selectedMallam} centers={centers} />
        ) : (
          <Card title="Update mallam" eyebrow="No mallam available yet">
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>Create a mallam first to unlock edit controls.</div>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
