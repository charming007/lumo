import Link from 'next/link';
import type { ReactNode } from 'react';
import { CreateAssignmentForm } from '../../components/create-assignment-form';
import { ReassignAssignmentForm } from '../../components/reassign-assignment-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchAssignments, fetchAssessments, fetchCohorts, fetchLessons, fetchMallams, fetchPods } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function emptyAssignmentRows(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '', '']];
}

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = values.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function statusTone(status: string) {
  if (status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'scheduled') return { tone: '#E0E7FF', text: '#3730A3' };
  if (status === 'completed') return { tone: '#E5E7EB', text: '#334155' };
  return { tone: '#FEF3C7', text: '#92400E' };
}

function dueTone(value: string, status: string) {
  if (status === 'completed') return { label: 'Completed', tone: '#E5E7EB', text: '#334155' };

  const dueDate = startOfDay(new Date(value));
  if (Number.isNaN(dueDate.getTime())) return { label: 'Date unverified', tone: '#E5E7EB', text: '#475569' };

  const today = startOfDay(new Date());
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / dayMs);

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, tone: '#FEE2E2', text: '#991B1B' };
  if (diffDays === 0) return { label: 'Due today', tone: '#FEF3C7', text: '#92400E' };
  if (diffDays === 1) return { label: 'Due tomorrow', tone: '#FEF3C7', text: '#92400E' };
  if (diffDays <= 7) return { label: `Due in ${diffDays}d`, tone: '#E0E7FF', text: '#3730A3' };
  return { label: 'Upcoming', tone: '#F8FAFC', text: '#334155' };
}

function formatDueLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function AssignmentsPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; status?: string | string[]; cohort?: string | string[]; mallam?: string | string[]; pod?: string | string[] }> }) {
  const query = await searchParams;

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Assignments"
        subtitle="Production wiring is incomplete, so assignment operations are blocked instead of pretending delivery control still works."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: assignments API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the assignments board cannot be trusted for scheduling, reassignment, or due-date triage. Fix the env var, redeploy, then verify live delivery data.
          </>
        )}
        whyBlocked={[
          'Assignments is an operational control surface. Showing empty rows here would imply no delivery risk when the app is actually disconnected.',
          'Create and reassign flows depend on live cohorts, lessons, mallams, assessments, and pods. Missing production wiring makes those actions unsafe theatre.',
        ]}
        verificationItems={[
          {
            surface: 'Assignment board',
            expected: 'Live lesson, cohort, pod, mallam, and due-date rows load from the backend',
            failure: 'Blank or tiny board that looks clean only because the API never connected',
          },
          {
            surface: 'Create assignment',
            expected: 'Reference data loads and the form submits against the live backend',
            failure: 'Dropdowns are empty, stale, or the form posts into the void',
          },
          {
            surface: 'Reassign flow',
            expected: 'Existing assignments and mallam options are available for reassignment',
            failure: 'No assignments visible or operator actions silently fail',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Content library', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Mallam ops', href: '/mallams', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }
  const [assignmentsResult, cohortsResult, lessonsResult, mallamsResult, assessmentsResult, podsResult] = await Promise.allSettled([
    fetchAssignments(),
    fetchCohorts(),
    fetchLessons(),
    fetchMallams(),
    fetchAssessments(),
    fetchPods(),
  ]);

  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const failedSources = [
    assignmentsResult.status === 'rejected' ? 'assignment board' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
  ].filter(Boolean);
  const canCreateAssignment = cohorts.length > 0 && lessons.length > 0 && mallams.length > 0;

  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const statusFilter = normalizeFilterValue(query?.status).trim();
  const cohortFilter = normalizeFilterValue(query?.cohort).trim();
  const mallamFilter = normalizeFilterValue(query?.mallam).trim();
  const podFilter = normalizeFilterValue(query?.pod).trim();

  const filteredAssignments = assignments.filter((item) => {
    const matchedCohort = cohorts.find((cohort) => cohort.name === item.cohortName);
    const matchedMallam = mallams.find((mallam) => mallam.displayName === item.teacherName || mallam.name === item.teacherName);
    const matchedPod = pods.find((pod) => pod.label === (item.podLabel ?? ''));

    const statusMatches = !statusFilter || item.status === statusFilter;
    const cohortMatches = !cohortFilter || item.cohortName === cohortFilter || matchedCohort?.id === cohortFilter;
    const mallamMatches = !mallamFilter || item.teacherName === mallamFilter || matchedMallam?.id === mallamFilter;
    const podMatches = !podFilter || (item.podLabel ?? 'Unassigned') === podFilter || matchedPod?.id === podFilter;
    const queryMatches = matchesQuery([item.lessonTitle, item.cohortName, item.podLabel, item.assessmentTitle, item.teacherName, item.status, item.dueDate], searchText);
    return statusMatches && cohortMatches && mallamMatches && podMatches && queryMatches;
  });
  const filtersActive = Boolean(searchText || statusFilter || cohortFilter || mallamFilter || podFilter);

  const today = startOfDay(new Date());
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const dueSoonCount = filteredAssignments.filter((item) => {
    const dueDate = startOfDay(new Date(item.dueDate));
    if (Number.isNaN(dueDate.getTime())) return false;
    return dueDate >= today && dueDate <= sevenDaysFromNow && item.status !== 'completed';
  }).length;
  const overdueCount = filteredAssignments.filter((item) => {
    const dueDate = startOfDay(new Date(item.dueDate));
    if (Number.isNaN(dueDate.getTime())) return false;
    return dueDate < today && item.status !== 'completed';
  }).length;
  const activeCount = filteredAssignments.filter((item) => item.status === 'active').length;
  const scheduledCount = filteredAssignments.filter((item) => item.status === 'scheduled').length;

  const workload = filteredAssignments.reduce<Record<string, number>>((acc, item) => {
    const key = item.teacherName || 'Unassigned';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const busiestOwnerEntry = Object.entries(workload).sort((a, b) => b[1] - a[1])[0];
  const busiestOwnerLabel = busiestOwnerEntry ? `${busiestOwnerEntry[0]} · ${busiestOwnerEntry[1]} live` : 'No live delivery load yet';

  const podOptions = pods
    .filter((pod) => assignments.some((item) => item.podLabel === pod.label))
    .sort((a, b) => a.label.localeCompare(b.label));
  const cohortOptions = cohorts
    .filter((cohort) => assignments.some((item) => item.cohortName === cohort.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const mallamOptions = mallams
    .filter((mallam) => assignments.some((item) => item.teacherName === mallam.displayName || item.teacherName === mallam.name))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const overdueAssignments = filteredAssignments
    .filter((item) => {
      const dueDate = startOfDay(new Date(item.dueDate));
      return !Number.isNaN(dueDate.getTime()) && dueDate < today && item.status !== 'completed';
    })
    .slice()
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .slice(0, 4);
  const dueTodayAssignments = filteredAssignments
    .filter((item) => {
      const dueDate = startOfDay(new Date(item.dueDate));
      return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() === today.getTime() && item.status !== 'completed';
    })
    .slice(0, 4);
  const loadByMallam = mallams.map((mallam) => {
    const scopedAssignments = filteredAssignments.filter((item) => item.teacherName === mallam.displayName || item.teacherName === mallam.name);
    const overdue = scopedAssignments.filter((item) => dueTone(item.dueDate, item.status).label.includes('overdue')).length;
    return {
      id: mallam.id,
      displayName: mallam.displayName,
      assignmentCount: scopedAssignments.length,
      overdue,
    };
  }).filter((entry) => entry.assignmentCount > 0)
    .sort((left, right) => right.assignmentCount - left.assignmentCount || right.overdue - left.overdue)
    .slice(0, 4);

  return (
    <PageShell
      title="Assignments"
      subtitle="Delivery control with actual triage: filter the board, spot overdue work, rebalance mallam load, and create cleaner lesson windows instead of firing assignments into the void."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/content" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open content library
          </Link>
          <Link href="/mallams" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Open mallam ops
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Assignments is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Assignment filters" eyebrow="Delivery scoping">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search lesson, cohort, pod, assessment, or mallam" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
              <select name="cohort" defaultValue={cohortFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All cohorts</option>
                {cohortOptions.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
              </select>
              <select name="mallam" defaultValue={mallamFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All mallams</option>
                {mallamOptions.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}
              </select>
              <select name="pod" defaultValue={podFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All pods</option>
                {podOptions.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/assignments" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 16, color: '#475569', fontWeight: 700 }}>
          Showing {filteredAssignments.length} assignment{filteredAssignments.length === 1 ? '' : 's'} in the current delivery scope.
        </div>
      ) : null}

      {filtersActive && filteredAssignments.length === 0 ? (
        <section style={{ marginBottom: 20 }}>
          <Card title="No assignments matched this delivery scope" eyebrow="Route-safe empty state">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                This filter combo returned nothing useful. Reset the board or jump to the next operational surface instead of treating an empty table like proof the delivery queue is clean.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/assignments" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
                  Reset delivery scope
                </Link>
                <Link href="/mallams" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#ECFDF5', color: '#166534', textDecoration: 'none' }}>
                  Check mallam load
                </Link>
                <Link href="/content?view=blocked" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#FFF7ED', color: '#9A3412', textDecoration: 'none', border: '1px solid #FED7AA' }}>
                  Review content blockers
                </Link>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Delivery pulse" eyebrow="Current scope">
          <MetricList
            items={[
              { label: 'Assignments visible', value: String(filteredAssignments.length) },
              { label: 'Active windows', value: String(activeCount) },
              { label: 'Scheduled next', value: String(scheduledCount) },
              { label: 'Due in 7 days', value: String(dueSoonCount) },
            ]}
          />
        </Card>
        <Card title="Risk readout" eyebrow="What needs attention first">
          <MetricList
            items={[
              { label: 'Overdue and not done', value: String(overdueCount) },
              { label: 'Missing pod labels', value: String(filteredAssignments.filter((item) => !item.podLabel).length) },
              { label: 'No assessment gate', value: String(filteredAssignments.filter((item) => !item.assessmentTitle).length) },
              { label: 'Busiest owner', value: busiestOwnerLabel },
            ]}
          />
        </Card>
        <Card title="Delivery hotspots" eyebrow="Act here before the board lies to you">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: overdueCount ? '#FEF2F2' : '#F8FAFC', border: `1px solid ${overdueCount ? '#FECACA' : '#E2E8F0'}` }}>
              <div style={{ fontWeight: 800, marginBottom: 6, color: overdueCount ? '#991B1B' : '#0F172A' }}>
                {overdueCount ? `${overdueCount} overdue assignment${overdueCount === 1 ? '' : 's'} need intervention now` : 'No overdue assignments in this scope'}
              </div>
              <div style={{ color: overdueCount ? '#991B1B' : '#64748B', lineHeight: 1.6 }}>
                {overdueCount
                  ? 'Reassign, reschedule, or escalate the overdue windows before they quietly rot into fake “active” work.'
                  : 'Good. Keep the due-date discipline from slipping.'}
              </div>
            </div>
            {overdueAssignments.length ? overdueAssignments.map((item) => (
              <div key={`overdue-${item.id}`} style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong style={{ color: '#0F172A' }}>{item.lessonTitle}</strong>
                  <Pill label={dueTone(item.dueDate, item.status).label} tone={dueTone(item.dueDate, item.status).tone} text={dueTone(item.dueDate, item.status).text} />
                </div>
                <div style={{ color: '#64748B', lineHeight: 1.6 }}>{item.cohortName} • {item.podLabel ?? 'No pod'} • {item.teacherName}</div>
              </div>
            )) : null}
            {!overdueAssignments.length && dueTodayAssignments.length ? dueTodayAssignments.map((item) => (
              <div key={`today-${item.id}`} style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FDE68A', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong style={{ color: '#0F172A' }}>{item.lessonTitle}</strong>
                  <Pill label={dueTone(item.dueDate, item.status).label} tone={dueTone(item.dueDate, item.status).tone} text={dueTone(item.dueDate, item.status).text} />
                </div>
                <div style={{ color: '#64748B', lineHeight: 1.6 }}>{item.cohortName} • {item.podLabel ?? 'No pod'} • {item.teacherName}</div>
              </div>
            )) : null}
            {loadByMallam.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {loadByMallam.map((entry) => (
                  <Link key={entry.id} href={`/assignments?mallam=${encodeURIComponent(entry.id)}`} style={{ padding: 12, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', textDecoration: 'none', color: '#334155', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontWeight: 800 }}>{entry.displayName}</span>
                    <span>{entry.assignmentCount} live • {entry.overdue} overdue</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
        <Card title="Operator guidance" eyebrow="Use some taste">
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              ['Overdue means review now', 'If the due date has passed and the assignment is still active, the next move is intervention or reschedule — not pretending the board is fine.'],
              ['Assessment links are not optional theatre', 'If a lesson should prove mastery, attach the gate. Otherwise the delivery lane is tracking activity without evidence.'],
              ['Spread the load', 'One mallam carrying all live windows is usually bad planning dressed up as hustle.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20 }}>
        <Card title="Assignment board" eyebrow="Delivery control">
          <SimpleTable
            columns={['Lesson', 'Cohort', 'Pod', 'Assessment', 'Mallam', 'Due date', 'Status']}
            rows={filteredAssignments.length ? filteredAssignments.map((item) => {
              const tone = statusTone(item.status);
              const due = dueTone(item.dueDate, item.status);
              return [
                item.lessonTitle,
                item.cohortName,
                item.podLabel ?? '—',
                item.assessmentTitle ?? '—',
                item.teacherName,
                <div key={`${item.id}-due`} style={{ display: 'grid', gap: 6 }}>
                  <span>{formatDueLabel(item.dueDate)}</span>
                  <Pill label={due.label} tone={due.tone} text={due.text} />
                </div>,
                <Pill key={item.id} label={item.status} tone={tone.tone} text={tone.text} />,
              ];
            }) : emptyAssignmentRows(filtersActive ? 'No assignments match the current filters.' : 'Assignments are unavailable right now.')}
          />
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          {canCreateAssignment ? (
            <CreateAssignmentForm cohorts={cohorts} lessons={lessons} mallams={mallams} assessments={assessments} />
          ) : (
            <Card title="Create assignment" eyebrow="Unavailable right now">
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                The minimum reference data for assignment creation is still missing. Load cohorts, release-ready lessons, and mallams first, then retry.
              </div>
            </Card>
          )}
          {filteredAssignments.length && cohorts.length && mallams.length ? <ReassignAssignmentForm assignments={filteredAssignments} cohorts={cohorts} mallams={mallams} /> : null}
        </div>
      </section>
    </PageShell>
  );
}
