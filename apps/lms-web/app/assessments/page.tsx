import Link from 'next/link';
import { CreateAssessmentForm, DeleteAssessmentForm, UpdateAssessmentForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchAssessments, fetchCurriculumModules, fetchSubjects } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { matchesSubjectFilter } from '../../lib/module-subject-match';
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
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Assessments"
        subtitle="Progression gates are production-critical, so this route now blocks loudly instead of crashing or pretending an empty registry is safe."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: assessments API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} assessment gates would otherwise degrade into a fake-empty registry, which is a nice way to ship broken progression decisions.
          </>
        )}
        whyBlocked={[
          'Assessment gates decide learner progression, remediation, and publish readiness. If the API target is missing or unsafe, showing an empty board would be a lie with operational consequences.',
          'This route used to fetch immediately and explode on bad wiring. Blocking up front is safer than letting deployment review discover a runtime crash the hard way.',
        ]}
        verificationItems={[
          {
            surface: 'Assessment registry',
            expected: 'Live assessment rows load with real subjects, modules, triggers, and statuses',
            failure: 'Crash page, empty registry, or only filter chrome with no trustworthy data',
          },
          {
            surface: 'Assessment filters',
            expected: 'Subject and status filters reflect live backend data',
            failure: 'Empty subject dropdowns or fake-success filtering against no data',
          },
          {
            surface: 'Create / edit assessment',
            expected: 'Module and subject pickers load from the live curriculum before operators publish gates',
            failure: 'Forms open without real curriculum context or save against the wrong backend',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Content library', href: '/content', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
          { label: 'Settings', href: '/settings', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const query = (await searchParams) ?? {};
  const message = Array.isArray(query.message) ? query.message[0] : query.message;
  const searchText = (Array.isArray(query.q) ? query.q[0] : query.q ?? '').trim().toLowerCase();
  const subjectFilter = (Array.isArray(query.subject) ? query.subject[0] : query.subject ?? '').trim();
  const statusFilter = (Array.isArray(query.status) ? query.status[0] : query.status ?? '').trim();

  const [assessmentsResult, modulesResult, subjectsResult] = await Promise.allSettled([
    fetchAssessments(),
    fetchCurriculumModules(),
    fetchSubjects(),
  ]);

  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const failedSources = [
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    modulesResult.status === 'rejected' ? 'curriculum modules' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
  ].filter(Boolean) as string[];
  const hasCoreRegistryGap = assessmentsResult.status === 'rejected';
  const canManageAssessments = modules.length > 0 && subjects.length > 0;

  const filteredAssessments = assessments.filter((assessment) => {
    const subjectMatches = matchesSubjectFilter(subjectFilter, subjects, {
      subjectIds: [assessment.subjectId],
      subjectNames: [assessment.subjectName],
    });
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
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: hasCoreRegistryGap ? '#fef2f2' : '#fff7ed', border: `1px solid ${hasCoreRegistryGap ? '#fecaca' : '#fed7aa'}`, color: hasCoreRegistryGap ? '#b91c1c' : '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          {hasCoreRegistryGap
            ? `Assessment admin is degraded because the ${failedSources.join(', ')} feed${failedSources.length === 1 ? ' has' : 's have'} failed. The page stays visible so operators get an honest outage surface instead of a crash, but gate edits are not trustworthy until the assessments feed recovers.`
            : `Assessment admin recovered with degraded feeds: ${failedSources.join(', ')}. Existing gates stay visible, but module or subject pickers may be incomplete until those feeds recover.`}
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(240), marginBottom: 24 }}>
        <Card title="Assessment controls" eyebrow={failedSources.length ? 'Degraded mode' : 'Filters + actions'}>
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
            rows={hasCoreRegistryGap ? [[
              <span key="assessments-outage" style={{ color: '#b91c1c', lineHeight: 1.6 }}>Assessment registry unavailable. Recover the assessments feed before using gate admin actions.</span>,
              '', '', '', '', '', '',
            ]] : filteredAssessments.length ? filteredAssessments.map((assessment) => [
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

        <Card title="Create assessment gate" eyebrow={canManageAssessments ? 'Publish new progression checks' : 'Unavailable right now'}>
          {canManageAssessments ? (
            <CreateAssessmentForm modules={modules} subjects={subjects} returnPath="/assessments" />
          ) : (
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              Assessment creation is paused until the module and subject feeds load again. Better a loud pause than publishing progression gates against missing curriculum context.
            </div>
          )}
        </Card>
      </section>
    </PageShell>
  );
}
