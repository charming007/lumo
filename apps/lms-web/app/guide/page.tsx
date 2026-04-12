import Link from 'next/link';
import { Card, PageShell, Pill, responsiveGrid } from '../../lib/ui';

const routeGuides = [
  {
    title: 'Dashboard',
    href: '/',
    guideHref: '/guide#dashboard',
    detail: 'Use this for operational health, escalations, and progression pressure.',
    pillTone: '#E0E7FF',
    pillText: '#3730A3',
  },
  {
    title: 'Content Library',
    href: '/content',
    guideHref: '/guide#content-library',
    detail: 'This is the canonical curriculum spine: subject, strand, module, lesson, assessment gate.',
    pillTone: '#DBEAFE',
    pillText: '#1D4ED8',
  },
  {
    title: 'English Studio',
    href: '/english',
    guideHref: '/guide#english-studio',
    detail: 'English-specific authoring with readiness checks and an actual activity spine.',
    pillTone: '#DCFCE7',
    pillText: '#166534',
  },
  {
    title: 'Lesson Studio',
    href: '/content/lessons/new',
    guideHref: '/guide#lesson-studio',
    detail: 'Use the full editor when you need objectives, localization, assessment, and flow.',
    pillTone: '#F3E8FF',
    pillText: '#7E22CE',
  },
  {
    title: 'Settings',
    href: '/settings',
    guideHref: '/guide#guardrails',
    detail: 'Policy, reward logic, and the UI guardrails that stop this thing from regressing.',
    pillTone: '#F8FAFC',
    pillText: '#334155',
  },
] as const;

const sectionLinks = [
  ['overview', 'What this LMS is for'],
  ['navigation', 'Route map and entry points'],
  ['dashboard', 'Dashboard'],
  ['content-library', 'Content Library'],
  ['english-studio', 'English Studio'],
  ['lesson-studio', 'Lesson Studio'],
  ['workflow', 'Recommended workflow'],
  ['guardrails', 'UI guardrails'],
  ['printable-guide', 'Printable handbook'],
] as const;

const workflow = [
  'Start in Content Library to confirm the subject, strand, and module are real.',
  'Attach the assessment gate before pretending a module is release-safe.',
  'Use English Studio for English blueprinting and readiness checks.',
  'Use Lesson Studio for the full authoring pack and final structure edits.',
  'Push lessons through review, approved, and published only when the checks are real.',
  'Use the Dashboard and rewards/progression views to monitor delivery after release.',
] as const;

export default function GuidePage() {
  return (
    <PageShell
      title="LMS Guide"
      subtitle="The usable version: route map, workflow, internal jump links, and the printable handbook in one place instead of a half-hidden static orphan."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Settings', href: '/settings' },
        { label: 'LMS Guide' },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/content" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open content library
          </Link>
          <Link href="/english" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#ECFDF5', color: '#166534', textDecoration: 'none' }}>
            Open English Studio
          </Link>
          <a href="/LMS_DASHBOARD_GUIDE.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open printable HTML guide
          </a>
        </div>
      }
    >
      <section id="overview" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Guide contents" eyebrow="Jump straight to it">
          <div style={{ display: 'grid', gap: 10 }}>
            {sectionLinks.map(([id, label]) => (
              <a key={id} href={`#${id}`} style={{ color: '#475569', textDecoration: 'none', fontWeight: 700 }}>
                {label}
              </a>
            ))}
          </div>
        </Card>

        <Card title="What this LMS is actually for" eyebrow="Overview">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              The Lumo LMS is not just a stats wall. It is the admin control surface for curriculum structure, lesson authoring, readiness checks, progression, mallam oversight, and pod delivery.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Dashboard', 'Learners', 'Mallams', 'Content Library', 'English Studio', 'Assessments', 'Pods', 'Analytics', 'Settings'].map((item) => (
                <Pill key={item} label={item} tone="#F8FAFC" text="#334155" />
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section id="navigation" style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        {routeGuides.map((item) => (
          <Card key={item.title} title={item.title} eyebrow="Real entry point">
            <div style={{ display: 'grid', gap: 12 }}>
              <Pill label="Live route" tone={item.pillTone} text={item.pillText} />
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>{item.detail}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={item.href} style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                  Open route →
                </Link>
                <Link href={item.guideHref} style={{ color: '#64748b', fontWeight: 700, textDecoration: 'none' }}>
                  Jump to guide section
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="How the LMS fits together" eyebrow="Big picture">
          <pre style={{ margin: 0, padding: 18, borderRadius: 18, background: '#0f172a', color: '#e2e8f0', overflow: 'auto', lineHeight: 1.7 }}>
{`Dashboard
   ↓ surfaces urgency and operational health
Learners / Mallams / Pods
   ↓ show who is learning, teaching, and delivering
Content Library
   ↓ defines the official curriculum structure
   Subject → Strand → Module → Lesson → Assessment gate
English Studio
   ↓ gives English-specific authoring + readiness checks
Lesson Studio
   ↓ handles the full lesson payload before publish
Reports / Analytics
   ↓ measure outcomes and operational gaps`}
          </pre>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <div id="dashboard">
          <Card title="Dashboard" eyebrow="Operational cockpit">
            <div style={{ color: '#64748b', lineHeight: 1.7 }}>
              This is where admins answer the urgent questions fast: who is active, what is blocked, what needs intervention, and who is ready to progress.
            </div>
          </Card>
        </div>
        <div id="content-library">
          <Card title="Content Library" eyebrow="Canonical structure">
            <div style={{ color: '#64748b', lineHeight: 1.7 }}>
              This is the formal curriculum board. Subjects, strands, modules, lessons, and assessment gates live here. If it is not wired here, it is not structurally real.
            </div>
          </Card>
        </div>
        <div id="english-studio">
          <Card title="English Studio" eyebrow="English authoring">
            <div style={{ color: '#64748b', lineHeight: 1.7 }}>
              English Studio is not a duplicate content page. It is the English-specific authoring layer for blueprints, readiness checks, and release visibility.
            </div>
          </Card>
        </div>
      </section>

      <section id="lesson-studio" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Lesson Studio" eyebrow="Full authoring lane">
          <div style={{ color: '#64748b', lineHeight: 1.7, marginBottom: 12 }}>
            Use the full lesson editor when you need more than metadata. This is where the real payload gets shaped: objectives, localization, assessment items, activity steps, duration, mode, and voice persona.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/content/lessons/new" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
              Open lesson studio →
            </Link>
            <Link href="/content" style={{ color: '#64748b', fontWeight: 700, textDecoration: 'none' }}>
              Back to content library
            </Link>
          </div>
        </Card>

        <div id="workflow">
          <Card title="Recommended workflow" eyebrow="Use the thing properly">
            <ol style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.8 }}>
              {workflow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      <section id="guardrails" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="UI guardrails" eyebrow="Do not regress the admin UX">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Navigation must stay explicit', 'Every admin surface should make location, action, and next step obvious.'],
              ['Empty states must be honest', 'If a feed is missing, say which feed failed. No fake wallpaper.'],
              ['Authoring beats metadata', 'Quick edits are fine for status tweaks; real curriculum work belongs in English Studio and Lesson Studio.'],
              ['Destructive actions need friction', 'Typed confirmation and impact notes stay because cascading deletes are serious.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <div id="printable-guide">
          <Card title="Printable handbook" eyebrow="Shareable artifact">
            <div style={{ color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
              The full printable handbook is embedded below and also available as a standalone HTML file. The static file now contains the complete guide instead of the chopped-off version that made half the document vanish.
            </div>
            <iframe
              src="/LMS_DASHBOARD_GUIDE.html"
              title="Lumo LMS dashboard guide"
              style={{ width: '100%', minHeight: '75vh', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white' }}
            />
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
