import Link from 'next/link';
import { CreateAssessmentForm, DeleteAssessmentForm, UpdateAssessmentForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchAssessments, fetchCurriculumModules, fetchSubjects } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function statusPill(status: string) {
  if (status === 'published' || status === 'approved' || status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review' || status === 'scheduled') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = values.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function emptyTableRows(message: string, columns: number) {
  return [[<span key={message} style={{ color: '#64748b', lineHeight: 1.6 }}>{message}</span>, ...Array.from({ length: columns - 1 }, () => '')]];
}

const actionButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: 'none',
};

function iconButtonStyle(background: string, color: string) {
  return { ...actionButtonStyle, background, color };
}

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string; q?: string | string[]; subject?: string | string[]; status?: string | string[] }>;
}) {
  const query = (await searchParams) ?? {};
  const message = Array.isArray(query.message) ? query.message[0] : query.message;
  const searchText = (Array.isArray(query.q) ? query.q[0] : query.q ?? '').trim().toLowerCase();
  const subjectFilter = (Array.isArray(query.subject) ? query.subject[0] : query.subject ?? '').trim();
  const statusFilter = (Array.isArray(query.status) ? query.status[0] : query.status ?? '').trim();

  const [assessments, modules, subjects] = await Promise.all([
    fetchAssessments(),
    fetchCurriculumModules(),
    fetchSubjects(),
  ]);

  const filteredAssessments = assessments.filter((assessment) => {
    const subjectMatches = !subjectFilter || assessment.subjectId === subjectFilter;
    const statusMatches = !statusFilter || assessment.status === statusFilter;
    const queryMatches = matchesQuery(
      [assessment.title, assessment.moduleTitle, assessment.subjectName, assessment.triggerLabel, assessment.kind, assessment.status],
      searchText,
    );

    return subjectMatches && statusMatches && queryMatches;
  });

  const filtersActive = Boolean(searchText || subjectFilter || statusFilter);
  const activeCount = assessments.filter((assessment) => assessment.status === 'active').length;
  const draftCount = assessments.filter((assessment) => assessment.status === 'draft').length;
  const manualCount = assessments.filter((assessment) => assessment.kind === 'manual').length;
  const mappedModules = new Set(assessments.map((assessment) => assessment.moduleId).filter(Boolean)).size;

  return (
    <PageShell
      title="Assessments"
      subtitle="Manage progression gates without bouncing back through content. This is now its own real admin surface, not a redirect shim."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={(
        <MetricList
          items={[
            { label: 'Total gates', value: String(assessments.length) },
            { label: 'Active', value: String(activeCount) },
            { label: 'Draft', value: String(draftCount) },
            { label: 'Manual reviews', value: String(manualCount) },
            { label: 'Modules covered', value: String(mappedModules) },
          ]}
        />
      )}
    >
      <FeedbackBanner message={message} />

      <section style={{ ...responsiveGrid(240), marginBottom: 24 }}>
        <Card title="Assessment controls" eyebrow="Filters + actions">
          <form action="/assessments" style={{ display: 'grid', gap: 12 }}>
            <input
              name="q"
              defaultValue={searchText}
              placeholder="Search title, module, subject, trigger, or status"
              style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 12 }}>
              <select name="subject" defaultValue={subjectFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="retired">Retired</option>
                <option value="review">Review</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, border: 0, background: '#4F46E5', color: 'white', cursor: 'pointer' }}>Apply filters</button>
              <Link href="/assessments" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
                Clear filters
              </Link>
              <Link href="/content" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#ECFDF5', color: '#166534', textDecoration: 'none', border: '1px solid #BBF7D0' }}>
                Open content library
              </Link>
            </div>
          </form>
        </Card>

        <Card title="Coverage snapshot" eyebrow="At a glance">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#64748b' }}>Visible rows</span>
              <strong style={{ color: '#0f172a' }}>{filteredAssessments.length}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={`${activeCount} active`} tone="#DCFCE7" text="#166534" />
              <Pill label={`${draftCount} draft`} tone="#E0E7FF" text="#3730A3" />
              <Pill label={`${manualCount} manual`} tone="#FEF3C7" text="#92400E" />
            </div>
            <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
              {filtersActive
                ? 'Filters are active, so this list is intentionally scoped instead of pretending the whole gate registry is in front of you.'
                : 'Every assessment gate lives here now. No more route aliasing nonsense.'}
            </p>
          </div>
        </Card>
      </section>

      <section style={responsiveGrid(320)}>
        <Card title="Assessment registry" eyebrow="Standalone admin route">
          <SimpleTable
            columns={['Assessment', 'Subject', 'Module', 'Trigger', 'Pass mark', 'Status', 'Actions']}
            rows={filteredAssessments.length ? filteredAssessments.map((assessment) => [
              assessment.title,
              assessment.subjectName ?? '—',
              assessment.moduleTitle ?? '—',
              assessment.triggerLabel,
              `${Math.round((assessment.passingScore ?? 0) * 100)}%`,
              <Pill key={`${assessment.id}-status`} label={assessment.status} tone={statusPill(assessment.status).tone} text={statusPill(assessment.status).text} />,
              <div key={`${assessment.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ModalLauncher buttonLabel="Edit assessment" title={`Edit assessment · ${assessment.title}`} description="Update the selected assessment gate from the dedicated assessments route." eyebrow="Edit assessment" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                  <UpdateAssessmentForm assessments={[assessment]} returnPath="/assessments" />
                </ModalLauncher>
                <ModalLauncher buttonLabel="Delete assessment" title={`Delete assessment · ${assessment.title}`} description="Remove this gate from the standalone assessments surface if it should no longer exist." eyebrow="Delete assessment" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                  <DeleteAssessmentForm assessments={[assessment]} returnPath="/assessments" />
                </ModalLauncher>
              </div>,
            ]) : emptyTableRows(filtersActive ? 'No assessment gates match the current filters.' : 'No assessment gates are available right now.', 7)}
          />
        </Card>

        <Card title="Create assessment gate" eyebrow="Publish new progression checks">
          <CreateAssessmentForm modules={modules} subjects={subjects} returnPath="/assessments" />
        </Card>
      </section>
    </PageShell>
  );
}
