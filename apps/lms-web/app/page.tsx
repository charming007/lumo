import Link from 'next/link';
import { fetchMallams, fetchSubjects } from '../lib/api';
import { API_BASE_SOURCE } from '../lib/config';
import { Card, PageShell, Pill, responsiveGrid } from '../lib/ui';
import type { Mallam, Subject } from '../lib/types';

const quickActionStyle = {
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const cardLinkStyle = {
  color: '#3730A3',
  fontWeight: 800,
  textDecoration: 'none',
} as const;

function sectionAlert(message: string) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

function pickLeadMallam(mallams: Mallam[]) {
  return mallams.find((mallam) => mallam.status === 'active') ?? mallams[0] ?? null;
}

function subjectHref(subject: Subject) {
  return `/content?subject=${encodeURIComponent(subject.id)}`;
}

export default async function HomePage() {
  if (API_BASE_SOURCE === 'missing-production-env') {
    return (
      <PageShell
        title="Mallam"
        subtitle="The learner home stays quiet when live data is unavailable."
        aside={(
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/students" style={{ ...quickActionStyle, background: '#111827', color: 'white' }}>
              Open learners
            </Link>
            <Link href="/mallams" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
              Open facilitators
            </Link>
          </div>
        )}
      >
        <Card title="Home" eyebrow="Offline state">
          {sectionAlert('Live subjects and facilitator details are not available yet. Add NEXT_PUBLIC_API_BASE_URL, redeploy, and reload the learner home.')}
        </Card>
      </PageShell>
    );
  }

  const [mallamsResult, subjectsResult] = await Promise.allSettled([
    fetchMallams(),
    fetchSubjects(),
  ]);

  const mallams: Mallam[] = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const subjects: Subject[] = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const leadMallam = pickLeadMallam(mallams);
  const sortedSubjects = [...subjects].sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name));
  const feedIssues = [
    mallamsResult.status === 'rejected' ? 'facilitators' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <PageShell
      title="Mallam"
      subtitle="A calm learner start page with only the essentials."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/students" style={{ ...quickActionStyle, background: '#111827', color: 'white' }}>
            Open learners
          </Link>
          <Link href="/mallams" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open facilitators
          </Link>
          <Link href="/assignments" style={{ ...quickActionStyle, background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
            Review assignments
          </Link>
        </div>
      )}
    >
      <section style={{ marginBottom: 20 }}>
        <div style={{ padding: '18px 20px', borderRadius: 20, background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', fontWeight: 800 }}>Home</div>
              <strong style={{ fontSize: 22, color: '#0f172a' }}>{leadMallam ? leadMallam.displayName || leadMallam.name : 'Mallam'}</strong>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                {feedIssues.length
                  ? `Showing a reduced home view while ${feedIssues.join(' and ')} data reloads.`
                  : 'Pick a subject and continue quietly.'}
              </div>
            </div>
            <Pill label={feedIssues.length ? 'Limited data' : 'Ready'} tone={feedIssues.length ? '#FEF3C7' : '#DCFCE7'} text={feedIssues.length ? '#92400E' : '#166534'} />
          </div>
        </div>
      </section>

      <section style={{ ...responsiveGrid(300), marginBottom: 20 }}>
        <Card title="Facilitator" eyebrow="Today">
          {leadMallam ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <strong style={{ color: '#0f172a' }}>{leadMallam.displayName || leadMallam.name}</strong>
              </div>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                {leadMallam.centerName ?? leadMallam.region} · {leadMallam.learnerCount} learner{leadMallam.learnerCount === 1 ? '' : 's'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={leadMallam.status} tone="#EEF2FF" text="#3730A3" />
                <Pill label={leadMallam.certificationLevel} tone="#ECFDF5" text="#166534" />
              </div>
              <Link href="/mallams" style={cardLinkStyle}>View facilitator details</Link>
            </div>
          ) : (
            sectionAlert('Facilitator details will appear here once the live feed responds.')
          )}
        </Card>

        <Card title="Subjects" eyebrow="Choose one">
          {sortedSubjects.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {sortedSubjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={subjectHref(subject)}
                  style={{
                    textDecoration: 'none',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    borderRadius: 18,
                    padding: '16px 18px',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 14, background: '#EEF2FF', color: '#3730A3', display: 'grid', placeItems: 'center', fontSize: 20 }}>
                      {subject.icon ?? '📘'}
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>{subject.name}</strong>
                      <span style={{ color: '#64748b', fontSize: 14 }}>Open subject</span>
                    </div>
                  </div>
                  <span style={{ color: '#3730A3', fontWeight: 800 }}>Open</span>
                </Link>
              ))}
            </div>
          ) : (
            sectionAlert('Subjects will appear here once the live feed responds.')
          )}
        </Card>
      </section>
    </PageShell>
  );
}
