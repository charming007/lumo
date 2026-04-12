import { CreateMallamForm, DeleteMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchMallams, fetchPods, fetchStudents } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

const actionButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: 'none',
};

export default async function MallamsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [mallams, students, centers, pods] = await Promise.all([fetchMallams(), fetchStudents(), fetchCenters(), fetchPods()]);

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
                    </div>
                    <Pill label={mallam.status} tone={mallam.status === 'active' ? '#DCFCE7' : '#FEF3C7'} text={mallam.status === 'active' ? '#166534' : '#92400E'} />
                  </div>
                  <div style={{ ...responsiveGrid(180), color: '#334155', marginBottom: 14 }}>
                    <div><strong>{roster.length}</strong><div style={{ color: '#64748b' }}>Rostered learners</div></div>
                    <div><strong>{mallam.certificationLevel}</strong><div style={{ color: '#64748b' }}>Certification</div></div>
                    <div><strong>{mallam.role}</strong><div style={{ color: '#64748b' }}>Deployment role</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href={`/mallams/${mallam.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
                    <ModalLauncher
                      buttonLabel="Edit"
                      title={`Edit mallam · ${mallam.displayName}`}
                      description="Update mallam profile, deployment metadata, and coverage without leaving this roster."
                      eyebrow="Edit mallam"
                      triggerStyle={{ ...actionButtonStyle, background: '#e6fffb', color: '#0f766e' }}
                    >
                      <UpdateMallamForm mallam={mallam} centers={centers} embedded />
                    </ModalLauncher>
                    <ModalLauncher
                      buttonLabel="Delete"
                      title={`Delete mallam · ${mallam.displayName}`}
                      description="Remove this mallam from the deployment roster if the profile should no longer appear in admin."
                      eyebrow="Delete mallam"
                      triggerStyle={{ ...actionButtonStyle, background: '#fee2e2', color: '#b91c1c' }}
                    >
                      <DeleteMallamForm mallam={mallam} embedded />
                    </ModalLauncher>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
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
            <div key={`${mallam.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`/mallams/${mallam.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
              <ModalLauncher
                buttonLabel="Edit mallam"
                title={`Edit mallam · ${mallam.displayName}`}
                description="Update mallam profile, deployment metadata, and coverage without leaving this list."
                eyebrow="Edit mallam"
                triggerStyle={{ ...actionButtonStyle, background: '#e6fffb', color: '#0f766e' }}
              >
                <UpdateMallamForm mallam={mallam} centers={centers} embedded />
              </ModalLauncher>
              <ModalLauncher
                buttonLabel="Delete mallam"
                title={`Delete mallam · ${mallam.displayName}`}
                description="Remove this mallam from the deployment roster if the profile should no longer appear in admin."
                eyebrow="Delete mallam"
                triggerStyle={{ ...actionButtonStyle, background: '#fee2e2', color: '#b91c1c' }}
              >
                <DeleteMallamForm mallam={mallam} embedded />
              </ModalLauncher>
            </div>,
          ])}
        />
      </section>
    </PageShell>
  );
}
