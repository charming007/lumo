import Link from 'next/link';
import { Card, PageShell, responsiveGrid } from '../../lib/ui';

const guideSections = [
  {
    title: 'Content Library',
    detail: 'Subject → strand → module → lesson → assessment gate. This is the official curriculum spine, not a dumping ground for random lesson records.',
  },
  {
    title: 'English Studio',
    detail: 'English-specific authoring with readiness checks, structured activity maps, and faster creation paths into the lesson studio.',
  },
  {
    title: 'Lesson Studio',
    detail: 'The full authoring lane for objectives, localization, assessment items, voice persona, and the learner activity spine before publish.',
  },
  {
    title: 'Rewards & progression',
    detail: 'XP, levels, badges, and workboard readiness stay visible so promotion decisions do not drift into guesswork.',
  },
] as const;

const guardrails = [
  ['Navigation must stay explicit', 'Every serious admin page should make location, action, and next step obvious. Hidden state is how demo UX rots.'],
  ['Empty states must be honest', 'If a feed is missing, say which one. No fake data wallpaper and no “coming soon” theatre.'],
  ['Authoring beats metadata', 'Quick edit is fine for status tweaks, but real curriculum work belongs in English Studio and Lesson Studio.'],
  ['Destructive actions need friction', 'Typed confirmation and impact notes stay. Cascading deletes should feel serious because they are.'],
] as const;

export default function GuidePage() {
  return (
    <PageShell
      title="LMS Guide"
      subtitle="In-app visual documentation for the LMS structure, content workflow, and the UI rules that keep the admin surface from sliding back into placeholder sludge."
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
          <a href="/LMS_DASHBOARD_GUIDE.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open printable HTML guide
          </a>
        </div>
      }
    >
      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {guideSections.map((section) => (
          <Card key={section.title} title={section.title} eyebrow="Guide section">
            <div style={{ color: '#64748b', lineHeight: 1.7 }}>{section.detail}</div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 16, marginBottom: 20 }}>
        <Card title="Recommended authoring workflow" eyebrow="Use the thing properly">
          <ol style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.8 }}>
            <li>Set the subject, strand, and module in Content Library.</li>
            <li>Use English Studio for English-specific blueprinting and readiness checks.</li>
            <li>Move into Lesson Studio for the full authoring pack: objectives, localization, assessment, and activity spine.</li>
            <li>Only push lessons toward approved or published when readiness and assessment wiring are real.</li>
            <li>Use rewards and workboards to explain progression, not to mask weak curriculum structure.</li>
          </ol>
        </Card>

        <Card title="UI guardrails" eyebrow="Do not regress the admin UX">
          <div style={{ display: 'grid', gap: 12 }}>
            {guardrails.map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <Card title="Embedded guide" eyebrow="Visual documentation">
          <div style={{ color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
            The printable handbook is embedded below so operators can review the LMS structure without leaving the app. That is a lot less stupid than hiding it as an orphaned static file.
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
