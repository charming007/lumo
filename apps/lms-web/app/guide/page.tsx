import Link from 'next/link';
import { Card, PageShell, Pill, responsiveGrid } from '../../lib/ui';

export const dynamic = 'force-dynamic';

const sectionLinks = [
  ['overview', 'What this guide is for'],
  ['route-map', 'Route map and live entry points'],
  ['workflow', 'Recommended workflow'],
  ['resource-library', 'Resource library'],
  ['spotlight', 'Guide spotlight'],
] as const;

const routeGuides = [
  {
    title: 'Dashboard',
    href: '/',
    detail: 'Operational cockpit for rollout health, blockers, and where intervention is needed first.',
    tone: '#E0E7FF',
    text: '#3730A3',
  },
  {
    title: 'Content Library',
    href: '/content',
    detail: 'Canonical curriculum spine: subject → strand → module → lesson → assessment gate.',
    tone: '#DBEAFE',
    text: '#1D4ED8',
  },
  {
    title: 'Assignments',
    href: '/assignments',
    detail: 'Where content becomes delivery work, not just structure sitting on a shelf.',
    tone: '#DCFCE7',
    text: '#166534',
  },
  {
    title: 'Progress',
    href: '/progress',
    detail: 'Progress and completion visibility, useful only when sync truth is trustworthy.',
    tone: '#F3E8FF',
    text: '#7E22CE',
  },
  {
    title: 'Settings',
    href: '/settings',
    detail: 'Runtime trust, environment posture, and operator-facing controls.',
    tone: '#F8FAFC',
    text: '#334155',
  },
] as const;

const workflow = [
  'Confirm the curriculum structure in Content Library before authoring around it.',
  'Use lesson authoring surfaces to build something real, not just metadata wallpaper.',
  'Assign deliberately so delivery has an owner, target cohort, and visible next step.',
  'Check progress and reporting with a healthy level of suspicion when sync or degraded-mode warnings appear.',
  'Use the fallback catalog and QA/UAT guide when the product feels fine but truth may be lying underneath.',
] as const;

const resources = [
  {
    title: 'LMS Dashboard Guide',
    href: '/LMS_DASHBOARD_GUIDE.html',
    eyebrow: 'Recovered core guide',
    format: 'HTML handbook',
    summary: 'The original operator-facing LMS walkthrough: route purpose, dashboards, content flow, and admin UX guidance.',
    bestFor: 'New operators, product walkthroughs, and route-by-route orientation.',
    highlight: 'Recovered from the earliest guide implementation and kept as the central handbook.',
  },
  {
    title: 'Admin Video Tutorial Pack',
    href: '/LMS_ADMIN_VIDEO_TUTORIAL_PACK.html',
    eyebrow: 'Training pack',
    format: 'HTML tutorial scripts',
    summary: 'Recording-ready training scripts and run-of-show structure for onboarding LMS admins fast.',
    bestFor: 'Enablement, training recordings, and fast operator onboarding.',
    highlight: 'Restores the tutorial pack that used to be surfaced from the guide route.',
  },
  {
    title: 'LMS Data Map',
    href: '/LMS_DATA_MAP.html',
    eyebrow: 'Truth source map',
    format: 'HTML systems doc',
    summary: 'Explains what each LMS surface shows and whether the data is live backend truth, learner sync, derived UI rollup, or fallback copy.',
    bestFor: 'Debugging trust questions and separating reality from presentation.',
    highlight: 'Brings back the data lineage reference added after the guide launched.',
  },
  {
    title: 'Fallback & Failure Modes Catalog',
    href: '/LMS_FALLBACK_FAILURE_CATALOG.html',
    eyebrow: 'Failure guide',
    format: 'HTML field guide',
    summary: 'Covers degraded states, sync trouble, stale content, reporting confidence gaps, and where operators need to intervene.',
    bestFor: 'Pilot operations, incident handling, and not getting fooled by a polished but lying UI.',
    highlight: 'Recovered from later docs work and surfaced where operators will actually find it.',
  },
  {
    title: 'MVP QA / UAT Guide',
    href: '/LUMO_MVP_QA_UAT_GUIDE.html',
    eyebrow: 'Test playbook',
    format: 'HTML QA guide',
    summary: 'Structured acceptance and validation flows for checking the LMS and learner ecosystem without hand-wavy testing.',
    bestFor: 'Pre-pilot checks, regression passes, and disciplined UAT sessions.',
    highlight: 'Restores a practical test artifact that should never have been stranded as a raw static file.',
  },
  {
    title: 'Lumo Positioning Brief',
    href: '/LUMO_POSITIONING_BRIEF.html',
    eyebrow: 'Product context',
    format: 'HTML brief',
    summary: 'Narrative and positioning context for explaining what Lumo is, how it should be framed, and what story the product is meant to tell.',
    bestFor: 'Stakeholder briefings, demos, and team alignment.',
    highlight: 'Recovered as a supporting artifact linked by historical guide-related commits.',
  },
] as const;

function ActionLink({ href, children, tone = '#EEF2FF', text = '#3730A3' }: { href: string; children: React.ReactNode; tone?: string; text?: string }) {
  return (
    <Link
      href={href}
      style={{
        borderRadius: 16,
        padding: '12px 14px',
        fontWeight: 800,
        background: tone,
        color: text,
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  );
}

export default function GuidePage() {
  return (
    <PageShell
      title="LMS Guide"
      subtitle="Restored as the useful version again: route map, operating workflow, and the docs/tutorial resources that were already in this repo instead of a dead-end blocker card."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Settings', href: '/settings' },
        { label: 'LMS Guide' },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ActionLink href="/content">Open content library</ActionLink>
          <ActionLink href="/assignments" tone="#ECFDF5" text="#166534">
            Open assignments
          </ActionLink>
          <a href="/LMS_DASHBOARD_GUIDE.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 800, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open handbook
          </a>
        </div>
      }
    >
      <section id="overview" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Guide contents" eyebrow="Jump links">
          <div style={{ display: 'grid', gap: 10 }}>
            {sectionLinks.map(([id, label]) => (
              <a key={id} href={`#${id}`} style={{ color: '#475569', textDecoration: 'none', fontWeight: 700 }}>
                {label}
              </a>
            ))}
          </div>
        </Card>

        <Card title="What this guide is for" eyebrow="Recovered docs surface">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              This route used to be an actual docs surface, then got flattened into a pilot-scope blocker. That was tidy from a navigation-politics standpoint, but stupid for operators who still need the handbook, training pack, data map, QA guide, and failure catalog. So this page now does the sane thing again.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Guide', 'Tutorials', 'Data map', 'QA/UAT', 'Fallbacks', 'Product brief'].map((item) => (
                <Pill key={item} label={item} tone="#F8FAFC" text="#334155" />
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section id="route-map" style={{ ...responsiveGrid(240), marginBottom: 20 }}>
        {routeGuides.map((item) => (
          <Card key={item.title} title={item.title} eyebrow="Live route">
            <div style={{ display: 'grid', gap: 12 }}>
              <Pill label="Pilot route" tone={item.tone} text={item.text} />
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>{item.detail}</div>
              <Link href={item.href} style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                Open route →
              </Link>
            </div>
          </Card>
        ))}
      </section>

      <section id="workflow" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, marginBottom: 20 }}>
        <Card title="Recommended operator workflow" eyebrow="Use the thing properly">
          <ol style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.8 }}>
            {workflow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Card>

        <Card title="What was historically restored" eyebrow="Audit result">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              'The original rich LMS guide page structure and embedded handbook flow.',
              'Deep-linked docs assets added later in guide-related commits.',
              'Training/tutorial resources that were stranded in public/ as orphaned HTML files.',
              'Operational references for data truth, QA/UAT, and failure/degraded-mode behavior.',
            ].map((item) => (
              <div key={item} style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#475569', lineHeight: 1.6 }}>
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="resource-library" style={{ ...responsiveGrid(300), marginBottom: 20 }}>
        {resources.map((resource) => (
          <Card key={resource.title} title={resource.title} eyebrow={resource.eyebrow}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Pill label={resource.format} tone="#EEF2FF" text="#3730A3" />
                <Pill label={resource.bestFor} tone="#ECFDF5" text="#166534" />
              </div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>{resource.summary}</div>
              <div style={{ color: '#475569', lineHeight: 1.6, padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <strong style={{ color: '#0f172a' }}>Why it matters:</strong> {resource.highlight}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={resource.href} target="_blank" rel="noreferrer" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                  Open resource →
                </a>
                <a href={resource.href} download style={{ color: '#64748b', fontWeight: 700, textDecoration: 'none' }}>
                  Download
                </a>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section id="spotlight" style={{ display: 'grid', gap: 16 }}>
        <Card title="Guide spotlight: embedded handbook" eyebrow="Inline reference">
          <div style={{ color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
            The main LMS handbook is embedded below so operators can read it without leaving the app. That was one of the better parts of the old guide, so it stays.
          </div>
          <iframe
            src="/LMS_DASHBOARD_GUIDE.html"
            title="Lumo LMS dashboard guide"
            style={{ width: '100%', minHeight: '75vh', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white' }}
          />
        </Card>
      </section>
    </PageShell>
  );
}
