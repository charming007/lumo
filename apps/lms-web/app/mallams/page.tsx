import { CreateMallamForm, DeleteMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchMallams, fetchPods, fetchStudents } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

const actionButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: 'none',
};

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
  if (status === 'training') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function MallamsPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; center?: string | string[]; pod?: string | string[]; status?: string | string[]; certification?: string | string[] }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Mallams"
        subtitle="Production wiring is incomplete, so mallam deployment coverage is blocked instead of pretending live operator load and roster controls are trustworthy."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: mallam roster API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} mallam coverage, learner load, intervention pressure, and add/edit/delete roster controls would degrade into polished fiction. Fix the env var, redeploy, then verify live mallam assignments before touching operator coverage.
          </>
        )}
        whyBlocked={[
          'This page drives real deployment decisions: assigning mallams, reviewing learner load, and deciding who needs intervention first.',
          'Without the production API base, training status, center coverage, pod mapping, and learner-risk counts can all look calm while the backend is actually disconnected.',
          'Blocking here is safer than letting a glossy roster imply operator capacity that does not exist.',
        ]}
        verificationItems={[
          {
            surface: 'Mallam roster',
            expected: 'Live mallams load with center, pod, certification, and status data from production',
            failure: 'Roster looks empty or deceptively healthy while the backend is unreachable',
          },
          {
            surface: 'Intervention queue',
            expected: 'Pressure scores and at-risk learner counts reflect the live learner roster',
            failure: 'No intervention cards appear because the learner feed silently vanished',
          },
          {
            surface: 'Roster controls',
            expected: 'Add, edit, and delete actions only appear once live centers, pods, and mallam records are loaded',
            failure: 'Operators can open mallam actions while deployment dependencies are missing',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Learner blocker', href: '/students', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [mallamsResult, studentsResult, centersResult, podsResult] = await Promise.allSettled([
    fetchMallams(),
    fetchStudents(),
    fetchCenters(),
    fetchPods(),
  ]);

  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];

  const failedSources = [
    { label: 'mallams', result: mallamsResult },
    { label: 'learners', result: studentsResult },
    { label: 'centers', result: centersResult },
    { label: 'pods', result: podsResult },
  ].filter((entry) => entry.result.status === 'rejected').map((entry) => entry.label);

  const rosterDependenciesReady = centers.length > 0 && pods.length > 0;
  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const centerFilter = normalizeFilterValue(query?.center).trim();
  const podFilter = normalizeFilterValue(query?.pod).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();
  const certificationFilter = normalizeFilterValue(query?.certification).trim();

  const certificationLevels = Array.from(new Set(mallams.map((mallam) => mallam.certificationLevel).filter(Boolean))).sort();
  const filteredMallams = mallams.filter((mallam) => {
    const centerMatches = !centerFilter || mallam.centerId === centerFilter;
    const podMatches = !podFilter || (mallam.podIds ?? []).includes(podFilter);
    const statusMatches = !statusFilter || mallam.status === statusFilter;
    const certificationMatches = !certificationFilter || mallam.certificationLevel === certificationFilter;
    const queryMatches = matchesQuery([
      mallam.displayName,
      mallam.name,
      mallam.centerName,
      mallam.region,
      mallam.role,
      mallam.certificationLevel,
      mallam.languages?.join(' '),
      mallam.podLabels.join(' '),
    ], searchText);
    return centerMatches && podMatches && statusMatches && certificationMatches && queryMatches;
  });
  const filtersActive = Boolean(searchText || centerFilter || podFilter || statusFilter || certificationFilter);

  const activeCount = filteredMallams.filter((mallam) => mallam.status === 'active').length;
  const trainingCount = filteredMallams.filter((mallam) => mallam.status === 'training').length;
  const rosteredLearners = filteredMallams.reduce((sum, mallam) => sum + students.filter((student) => student.mallamId === mallam.id).length, 0);
  const watchLearners = filteredMallams.reduce((sum, mallam) => sum + students.filter((student) => student.mallamId === mallam.id && student.attendanceRate < 0.85).length, 0);
  const avgAttendance = average(filteredMallams.flatMap((mallam) => students.filter((student) => student.mallamId === mallam.id).map((student) => student.attendanceRate)));
  const interventionQueue = filteredMallams
    .map((mallam) => {
      const roster = students.filter((student) => student.mallamId === mallam.id);
      const atRisk = roster.filter((student) => student.attendanceRate < 0.85);
      const attendanceAverage = average(roster.map((student) => student.attendanceRate));
      const pressureScore = (atRisk.length * 3) + (mallam.status === 'training' ? 2 : 0) + (roster.length >= 18 ? 2 : roster.length >= 12 ? 1 : 0);
      return {
        mallam,
        roster,
        atRisk,
        attendanceAverage,
        pressureScore,
      };
    })
    .filter((entry) => entry.pressureScore > 0)
    .sort((left, right) => (right.pressureScore - left.pressureScore) || (right.atRisk.length - left.atRisk.length) || (left.attendanceAverage - right.attendanceAverage))
    .slice(0, 5);

  return (
    <PageShell
      title="Mallams"
      subtitle="Mallam operations with real scoping, deployment health, learner load visibility, and faster intervention cues instead of a flat roster dump."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/reports" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open reports
          </a>
          <a href="/rewards" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#F5F3FF', color: '#6D28D9', textDecoration: 'none' }}>
            Open rewards
          </a>
          {rosterDependenciesReady ? (
            <ModalLauncher
              buttonLabel="Add Mallam"
              title="Add mallam"
              description="Create a new mallam profile from the deployment roster without losing context."
            >
              <CreateMallamForm centers={centers} pods={pods} />
            </ModalLauncher>
          ) : (
            <div style={{ padding: '12px 14px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700, maxWidth: 340 }}>
              Add mallam is temporarily unavailable until centers and pods load.
            </div>
          )}
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Mallam roster is running in degraded mode: {failedSources.join(', ')} data {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Mallam filters" eyebrow="Scope by center, pod, status, and certification before you start blaming the wrong operator">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search mallam, center, language, or pod" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <select name="center" defaultValue={centerFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All centers</option>
                {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
              <select name="pod" defaultValue={podFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All pods</option>
                {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
              </select>
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="training">Training</option>
                <option value="leave">Leave</option>
              </select>
              <select name="certification" defaultValue={certificationFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All certifications</option>
                {certificationLevels.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/mallams" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 16, color: '#475569', fontWeight: 700 }}>
          Showing {filteredMallams.length} mallam profile{filteredMallams.length === 1 ? '' : 's'} in the current scope.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Deployment coverage" eyebrow="Roster health">
          <MetricList
            items={[
              { label: 'Mallams in scope', value: String(filteredMallams.length) },
              { label: 'Rostered learners', value: String(rosteredLearners) },
              { label: 'Avg learner attendance', value: `${Math.round(avgAttendance * 100)}%` },
              { label: 'Watchlist learners', value: String(watchLearners) },
            ]}
          />
        </Card>
        <Card title="Readiness posture" eyebrow="Operator status">
          <MetricList
            items={[
              { label: 'Active now', value: String(activeCount) },
              { label: 'Still in training', value: String(trainingCount) },
              { label: 'On leave', value: String(filteredMallams.filter((mallam) => mallam.status === 'leave').length) },
              { label: 'Pods covered', value: String(new Set(filteredMallams.flatMap((mallam) => mallam.podIds ?? [])).size) },
            ]}
          />
        </Card>
        <Card title="Admin reading" eyebrow="What to look for first">
          <div style={{ display: 'grid', gap: 10, color: '#64748b', lineHeight: 1.6 }}>
            <div>High learner load plus weak attendance usually means coaching capacity, not just a lazy mallam.</div>
            <div>Training mallams with live rosters need a tighter support plan before you stack more pods on them.</div>
            <div>If pod coverage is thin, reassign before attendance starts sliding and everyone pretends it was inevitable.</div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Intervention queue" eyebrow="Who needs help first">
          <div style={{ display: 'grid', gap: 12 }}>
            {interventionQueue.length ? interventionQueue.map(({ mallam, roster, atRisk, attendanceAverage, pressureScore }) => (
              <div key={mallam.id} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  <a href={`/mallams/${mallam.id}`} style={{ fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>{mallam.displayName}</a>
                  <Pill label={`Pressure ${pressureScore}`} tone={pressureScore >= 6 ? '#FEE2E2' : '#FEF3C7'} text={pressureScore >= 6 ? '#B91C1C' : '#92400E'} />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
                  {mallam.centerName ?? mallam.region} • {mallam.podLabels.join(', ') || 'No pod mapped yet'}
                </div>
                <div style={{ ...responsiveGrid(140), color: '#334155' }}>
                  <div><strong>{roster.length}</strong><div style={{ color: '#64748b' }}>Rostered learners</div></div>
                  <div><strong>{atRisk.length}</strong><div style={{ color: '#64748b' }}>At-risk learners</div></div>
                  <div><strong>{Math.round(attendanceAverage * 100)}%</strong><div style={{ color: '#64748b' }}>Avg attendance</div></div>
                  <div><strong>{mallam.status}</strong><div style={{ color: '#64748b' }}>Deployment status</div></div>
                </div>
              </div>
            )) : <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>No intervention queue in the current scope.</div>}
          </div>
        </Card>

        <Card title="How pressure is ranked" eyebrow="Quick operator logic">
          <div style={{ display: 'grid', gap: 12, color: '#64748b', lineHeight: 1.6 }}>
            <div>At-risk learners drive the ranking hardest because poor attendance is usually the first operational failure you can still fix.</div>
            <div>Training status adds pressure because new mallams with live rosters need coaching support before the roster gets heavier.</div>
            <div>Large rosters add extra weight so overloaded operators show up before the damage spreads quietly.</div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Deployment roster" eyebrow="Profile-first">
          <div style={{ display: 'grid', gap: 14 }}>
            {filteredMallams.length ? filteredMallams.map((mallam) => {
              const roster = students.filter((student) => student.mallamId === mallam.id);
              const atRisk = roster.filter((student) => student.attendanceRate < 0.85);
              const attendanceAverage = average(roster.map((student) => student.attendanceRate));
              const tone = statusTone(mallam.status);
              return (
                <div key={mallam.id} style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <a href={`/mallams/${mallam.id}`} style={{ fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}>{mallam.displayName}</a>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{mallam.centerName ?? mallam.region} • {mallam.podLabels.join(', ') || 'No pod mapped yet'}</div>
                    </div>
                    <Pill label={mallam.status} tone={tone.tone} text={tone.text} />
                  </div>
                  <div style={{ ...responsiveGrid(180), color: '#334155', marginBottom: 14 }}>
                    <div><strong>{roster.length}</strong><div style={{ color: '#64748b' }}>Rostered learners</div></div>
                    <div><strong>{Math.round(attendanceAverage * 100)}%</strong><div style={{ color: '#64748b' }}>Avg attendance</div></div>
                    <div><strong>{atRisk.length}</strong><div style={{ color: '#64748b' }}>Learners at risk</div></div>
                    <div><strong>{mallam.certificationLevel}</strong><div style={{ color: '#64748b' }}>Certification</div></div>
                    <div><strong>{mallam.role}</strong><div style={{ color: '#64748b' }}>Deployment role</div></div>
                    <div><strong>{mallam.languages?.join(', ') ?? '—'}</strong><div style={{ color: '#64748b' }}>Languages</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href={`/mallams/${mallam.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
                    {rosterDependenciesReady ? (
                      <ModalLauncher
                        buttonLabel="Edit"
                        title={`Edit mallam · ${mallam.displayName}`}
                        description="Update mallam profile, deployment metadata, and coverage without leaving this roster."
                        eyebrow="Edit mallam"
                        triggerStyle={{ ...actionButtonStyle, background: '#e6fffb', color: '#0f766e' }}
                      >
                        <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} embedded />
                      </ModalLauncher>
                    ) : null}
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
            }) : <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>{filtersActive ? 'No mallams match the current filters.' : 'Mallam roster data is unavailable right now.'}</div>}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
        <SimpleTable
          columns={['Name', 'Center', 'Pods', 'Learners', 'Avg attendance', 'At risk', 'Certification', 'Status', 'Actions']}
          rows={filteredMallams.length ? filteredMallams.map((mallam) => {
            const roster = students.filter((student) => student.mallamId === mallam.id);
            const tone = statusTone(mallam.status);
            return [
              <strong key={mallam.id}>{mallam.displayName}</strong>,
              mallam.centerName ?? mallam.region,
              mallam.podLabels.join(', ') || '—',
              String(roster.length),
              `${Math.round(average(roster.map((student) => student.attendanceRate)) * 100)}%`,
              String(roster.filter((student) => student.attendanceRate < 0.85).length),
              mallam.certificationLevel,
              <Pill key={`${mallam.id}-status`} label={mallam.status} tone={tone.tone} text={tone.text} />,
              <div key={`${mallam.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href={`/mallams/${mallam.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
                {rosterDependenciesReady ? (
                  <ModalLauncher
                    buttonLabel="Edit mallam"
                    title={`Edit mallam · ${mallam.displayName}`}
                    description="Update mallam profile, deployment metadata, and coverage without leaving this list."
                    eyebrow="Edit mallam"
                    triggerStyle={{ ...actionButtonStyle, background: '#e6fffb', color: '#0f766e' }}
                  >
                    <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} embedded />
                  </ModalLauncher>
                ) : null}
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
            ];
          }) : [[<span key="no-mallams" style={{ color: '#64748b' }}>{filtersActive ? 'No mallams match the current filters.' : 'Mallam roster data is unavailable right now.'}</span>, '', '', '', '', '', '', '', '']]}
        />

        <Card title="Coverage watchlist" eyebrow="Who needs follow-up first">
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredMallams.length ? filteredMallams
              .map((mallam) => {
                const roster = students.filter((student) => student.mallamId === mallam.id);
                const atRisk = roster.filter((student) => student.attendanceRate < 0.85).length;
                return {
                  mallam,
                  rosterCount: roster.length,
                  atRisk,
                  attendanceAverage: average(roster.map((student) => student.attendanceRate)),
                };
              })
              .sort((a, b) => (b.atRisk - a.atRisk) || (a.attendanceAverage - b.attendanceAverage))
              .slice(0, 5)
              .map(({ mallam, rosterCount, atRisk, attendanceAverage }) => (
                <div key={mallam.id} style={{ padding: 16, borderRadius: 18, background: atRisk > 0 || mallam.status !== 'active' ? '#fff7ed' : '#f8fafc', border: `1px solid ${atRisk > 0 || mallam.status !== 'active' ? '#fed7aa' : '#eef2f7'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <strong>{mallam.displayName}</strong>
                    <Pill label={mallam.status} tone={statusTone(mallam.status).tone} text={statusTone(mallam.status).text} />
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                    {rosterCount} learners • {Math.round(attendanceAverage * 100)}% average attendance • {atRisk} learner{atRisk === 1 ? '' : 's'} below 85% attendance.
                  </div>
                </div>
              )) : (
                <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                  No watchlist cards available in the current scope.
                </div>
              )}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
