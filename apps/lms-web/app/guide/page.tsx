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
    detail: 'English-specific authoring with readiness checks, inline blockers, and an actual activity spine.',
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
    title: 'Reports',
    href: '/reports',
    guideHref: '/guide#reports',
    detail: 'Program, donor, and ministry-ready reporting with pod risk, mallam lift, and compliance checks.',
    pillTone: '#FFF7ED',
    pillText: '#9A3412',
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
  ['reports', 'Reports and NGO readouts'],
  ['mallam-ops', 'Mallam ops and history depth'],
  ['system-flow', 'How content, delivery, progress, and rewards connect'],
  ['lesson-studio', 'Lesson Studio'],
  ['interactive-authoring', 'Interactive / option-based lesson tutorial'],
  ['qa-uat-guide', 'MVP QA / UAT guide'],
  ['fallback-catalog', 'Fallback / failure mode catalog'],
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
  'Create assignments only after the module, lessons, and gate are genuinely release-safe.',
  'Use Mallams and Reports to monitor operator load, delivery history, and external reporting quality after release.',
  'Use the Dashboard, Progress, and Rewards surfaces to monitor learner runtime after release.',
] as const;

export default function GuidePage() {
  return (
    <PageShell
      title="LMS Guide"
      subtitle="The usable version: route map, workflow, internal jump links, mallam/reporting notes, and the printable handbook in one place instead of a half-hidden static orphan."
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
          <Link href="/reports" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#FFF7ED', color: '#9A3412', textDecoration: 'none' }}>
            Open reports
          </Link>
          <a href="/LUMO_MVP_QA_UAT_GUIDE.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', textDecoration: 'none', border: '1px solid #BFDBFE' }}>
            Open QA / UAT guide
          </a>
          <a href="/LMS_FALLBACK_FAILURE_CATALOG.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#FFF7ED', color: '#9A3412', textDecoration: 'none', border: '1px solid #FED7AA' }}>
            Open fallback catalog
          </a>
          <a href="/LMS_DASHBOARD_GUIDE.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open printable HTML guide
          </a>
          <a href="/LMS_ADMIN_VIDEO_TUTORIAL_PACK.html" target="_blank" rel="noreferrer" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open video tutorial pack
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
              The Lumo LMS is not just a stats wall. It is the admin control surface for curriculum structure, lesson authoring, readiness checks, progression, mallam oversight, pod delivery, and external reporting.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Dashboard', 'Learners', 'Mallams', 'Content Library', 'English Studio', 'Assessments', 'Pods', 'Reports', 'Settings'].map((item) => (
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
Reports
   ↓ packages internal ops, donor, and ministry reporting views
Lesson Studio
   ↓ handles the full lesson payload before publish`}
          </pre>
        </Card>
      </section>

      <section id="system-flow" style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="How Content Library, English Studio, assignments, learner progress, rewards, and reporting fit together" eyebrow="End-to-end system flow">
          <pre style={{ margin: 0, padding: 18, borderRadius: 18, background: '#0f172a', color: '#e2e8f0', overflow: 'auto', lineHeight: 1.7 }}>
{`Content Library
   ↓ defines the official curriculum spine
   Subject → Strand → Module → Lesson → Assessment gate
English Studio
   ↓ turns English modules into structured, release-checked lesson blueprints
Assignments
   ↓ deliver approved lessons to real cohorts, pods, and mallams
Learner runtime
   ↓ produces completion, mastery, progression, and intervention signals
Rewards & Progression
   ↓ convert verified milestones into XP, badges, levels, and admin follow-up
Reports & external readouts
   ↓ package program evidence for internal ops, donors, and government review
Dashboard / learner views / workboards
   ↓ show the feedback loop back to LMS operators`}
          </pre>
          <div style={{ ...responsiveGrid(240), marginTop: 16 }}>
            <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>1. Structure first</div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>Content Library makes the subject, strand, module, lesson, and assessment relationships real. If that spine is broken, the rest of the flow is built on nonsense.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>2. English authoring tightens quality</div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>English Studio reads that curriculum context, adds objectives, vocabulary, activity sequencing, and readiness checks, then writes the lesson back into the live content lane.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>3. Delivery wraps curriculum in assignments</div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>Assignments are not separate magic. They are the delivery wrapper around approved lessons and modules, mapped to cohorts, pods, and mallams.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>4. Learner runtime generates evidence</div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>Once work is live, the LMS starts surfacing completion, mastery, progression status, next-module recommendations, and who needs intervention right now.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>5. Rewards are feedback, not fake promotion</div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>XP, badges, and levels reinforce verified milestones and show up back in rewards boards, learner records, and workboards. They should support motivation, not replace mastery or assessment gates.</div>
            </div>
            <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>6. Reporting closes the outside loop</div>
              <div style={{ color: '#64748b', lineHeight: 1.7 }}>Reports packages the same live signals into donor, NGO, and ministry-ready views so external review is grounded in the same system evidence the operators use every day.</div>
            </div>
          </div>
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
              This is the formal curriculum board. Subjects, strands, modules, lessons, and assessment gates live here. If it is not wired here, it is not structurally real. The board now includes real filters for subject, status, focused view, and free-text search so ops can answer concrete inventory questions without scrolling through the whole damn library.
            </div>
          </Card>
        </div>
        <div id="english-studio">
          <Card title="English Studio" eyebrow="English authoring">
            <div style={{ color: '#64748b', lineHeight: 1.7 }}>
              English Studio is not a duplicate content page. It is the English-specific authoring layer for blueprints, readiness checks, inline release blockers, editable activity spines, localization packs, and release visibility before a lesson record gets shipped.
            </div>
          </Card>
        </div>
      </section>

      <section id="reports" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Reports" eyebrow="Program + NGO readout">
          <div style={{ color: '#64748b', lineHeight: 1.7 }}>
            Reports is no longer just a metric dump. It now includes pod risk ranking, mallam contribution, NGO / donor narrative cards, and a compliance board that answers the first questions grant reviewers and ministry stakeholders will ask.
          </div>
        </Card>
        <Card title="What reports now covers" eyebrow="Decision support">
          <div style={{ display: 'grid', gap: 10, color: '#475569', lineHeight: 1.7 }}>
            <div><strong>Internal ops</strong> — pod risk, assignment pressure, and mallam readiness lift.</div>
            <div><strong>External reporting</strong> — coverage, attendance retention, progression readiness, and facilitator pressure.</div>
            <div><strong>Compliance checks</strong> — attendance capture, assignment tracking, intervention load, and promotion evidence.</div>
          </div>
        </Card>
      </section>

      <section id="mallam-ops" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Mallam ops" eyebrow="History depth that matters">
          <div style={{ color: '#64748b', lineHeight: 1.7 }}>
            Mallam detail now carries roster pressure, attendance spread, assignment timeline, stable-vs-watch learner split, and history summary blocks so review calls do not start from a weak profile card and a prayer.
          </div>
        </Card>
        <Card title="What to read first on a mallam profile" eyebrow="Fast triage">
          <div style={{ display: 'grid', gap: 10, color: '#475569', lineHeight: 1.7 }}>
            <div><strong>Load posture</strong> — roster size plus pod coverage.</div>
            <div><strong>Support posture</strong> — watchlist volume and attendance spread.</div>
            <div><strong>Delivery history</strong> — assignment timeline, recent checkpoint, and next due moment.</div>
            <div><strong>Roster momentum</strong> — whether the stable learners outnumber the risky ones.</div>
          </div>
        </Card>
      </section>

      <section id="lesson-studio" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Lesson Studio" eyebrow="Full authoring lane">
          <div style={{ color: '#64748b', lineHeight: 1.7, marginBottom: 12 }}>
            Use the full lesson editor when you need more than metadata. This is where the real payload gets shaped: objectives, localization, assessment items, activity steps, duration, mode, voice persona, interactive answer options, and the inline blockers that stop weak packs from being marked approved or published.
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

        <Card title="When to use which authoring route" eyebrow="Quick routing">
          <div style={{ display: 'grid', gap: 10, color: '#475569', lineHeight: 1.7 }}>
            <div><strong>Content Library</strong> — create the lesson record in the right module.</div>
            <div><strong>English Studio</strong> — generate an English blueprint with readiness checks.</div>
            <div><strong>Lesson Studio</strong> — build or refine the full interactive lesson pack, including step flow, expected answers, choices, media, and assessment items.</div>
          </div>
        </Card>
      </section>

      <section id="interactive-authoring" style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Interactive / option-based lesson tutorial" eyebrow="Lesson Studio walkthrough">
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              If the lesson includes choices, taps, prompts, hints, expected answers, or a step-by-step learner flow, do not stop at the quick create form. Open <strong>Lesson Studio</strong> and build the real lesson pack.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                ['1. Start in the right lane', 'Begin from Content Library or jump in from English Studio. Pick the correct subject and module first so the lesson lands in the real curriculum spine.'],
                ['2. Create the lesson shell', 'Add title, duration, mode, age band, and voice persona. Use a template, duplicate a lesson, or start clean.'],
                ['3. Build the activity spine', 'Add, reorder, duplicate, and remove steps. Each step needs a title, type, learner prompt, detail, duration, and evidence expectation.'],
                ['4. Add options / choices', 'For image-choice or tap-choice steps, use one line per option in the format id|label|correct/wrong|mediaKind|mediaValue. Mark the correct option explicitly.'],
                ['5. Define expected answers + hints', 'Use Expected answers for what counts as correct, Evidence for what staff should confirm, and Facilitator notes for hints, retries, and coaching moves.'],
                ['6. Add assessment items', 'Create the lesson assessment pack with prompt|evidence lines and keep it aligned to the step-level evidence inside the lesson flow.'],
                ['7. Check readiness before publish', 'Make sure the title is clear, duration is credible, objectives exist, the assessment is attached, the activity spine is complete, and the module/gate context is real.'],
                ['8. Understand learner app flow', 'After approval, the lesson can be assigned to pods and opened in the learner tablet app, where prompts, choice options, speaking responses, feedback, completion, and sync all follow from this authored payload.'],
              ].map(([title, detail]) => (
                <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 18, borderRadius: 18, background: '#0f172a', color: '#e2e8f0', overflow: 'auto' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c4b5fd', marginBottom: 8 }}>Choice format</div>
                <pre style={{ margin: 0, background: 'transparent', padding: 0, color: 'inherit', whiteSpace: 'pre-wrap' }}>{`choice-1|Go to the market|correct|image|market.png
choice-2|Go to sleep|wrong|image|sleep.png
choice-3|Go to school|wrong|image|school.png`}</pre>
              </div>
              <div style={{ padding: 18, borderRadius: 18, background: '#0f172a', color: '#e2e8f0', overflow: 'auto' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#93c5fd', marginBottom: 8 }}>Learner runtime flow</div>
                <pre style={{ margin: 0, background: 'transparent', padding: 0, color: 'inherit', whiteSpace: 'pre-wrap' }}>{`Facilitator opens tablet app
→ selects learner
→ opens assigned lesson
→ learner responds by speaking or tapping
→ feedback appears
→ completion summary is saved
→ progress syncs later if offline`}</pre>
              </div>
            </div>
          </div>
        </Card>

        <div id="qa-uat-guide">
          <Card title="MVP QA / UAT guide" eyebrow="Cross-product test handbook">
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                The MVP now has a dedicated QA / UAT guide for structured validation across the LMS and learner tablet app: smoke test, LMS checks, learner app checks, end-to-end flows, pass / fail criteria, troubleshooting, and issue capture.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="/LUMO_MVP_QA_UAT_GUIDE.html" target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', fontWeight: 800, textDecoration: 'none' }}>
                  Open QA / UAT HTML guide →
                </a>
              </div>
              <iframe
                src="/LUMO_MVP_QA_UAT_GUIDE.html"
                title="Lumo MVP QA and UAT guide"
                style={{ width: '100%', minHeight: '72vh', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white' }}
              />
            </div>
          </Card>
        </div>

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
              ['Inventory needs search, not scavenger hunts', 'Content ops should be able to slice the board by subject, status, and focused view instead of eyeballing giant tables.'],
              ['Operational history matters', 'Mallam detail and reports should carry timing, pressure, and risk context — not just flat totals.'],
              ['Destructive actions need friction', 'Typed confirmation and impact notes stay because cascading deletes are serious.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <div id="fallback-catalog">
          <Card title="Fallback / failure mode catalog" eyebrow="Companion guide">
            <div style={{ display: 'grid', gap: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.7 }}>
              <div>
                The companion fallback catalog maps the messy states across the learner tablet and the LMS: offline bootstrap, stale content, transcript failure, saved-audio review, partial LMS feeds, reward correction, and reporting-confidence gaps.
              </div>
              <div>
                Use it when you need the blunt operational answer to “what happens when the system is not on the happy path?” instead of the cleaner onboarding walkthrough.
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <a href="/LMS_FALLBACK_FAILURE_CATALOG.html" target="_blank" rel="noreferrer" style={{ color: '#C2410C', fontWeight: 800, textDecoration: 'none' }}>
                Open the printable fallback catalog →
              </a>
            </div>
            <iframe
              src="/LMS_FALLBACK_FAILURE_CATALOG.html"
              title="Lumo LMS fallback and failure catalog"
              style={{ width: '100%', minHeight: '72vh', border: '1px solid #e2e8f0', borderRadius: 20, background: 'white', marginBottom: 18 }}
            />
          </Card>
        </div>

        <div id="printable-guide">
          <Card title="Printable handbook" eyebrow="Shareable artifact">
            <div style={{ color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
              The full printable handbook is embedded below and also available as a standalone HTML file. The static file now tracks the same reporting and mallam-ops guidance as the live route instead of drifting off into stale demo-land. There is also a separate printable admin video tutorial pack for recording or operator onboarding.
            </div>
            <div style={{ marginBottom: 14 }}>
              <a href="/LMS_ADMIN_VIDEO_TUTORIAL_PACK.html" target="_blank" rel="noreferrer" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                Open the admin video tutorial pack →
              </a>
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
