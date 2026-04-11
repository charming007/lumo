import { fetchAssessments, fetchAssignments, fetchCurriculumModules, fetchLessons } from '../../lib/api';
import { buildEnglishLessonBlueprints, buildEnglishOpsSummary } from '../../lib/english-curriculum';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function statusTone(status: string) {
  if (status === 'published' || status === 'approved') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function releaseTone(label: string) {
  if (label === 'pod-ready') return { tone: '#DCFCE7', text: '#166534' };
  if (label === 'queued') return { tone: '#DBEAFE', text: '#1D4ED8' };
  if (label === 'review') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#F3E8FF', text: '#7E22CE' };
}

export default async function EnglishCurriculumPage() {
  const [modules, lessons, assessments, assignments] = await Promise.all([
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchAssignments(),
  ]);

  const blueprints = buildEnglishLessonBlueprints({ modules, lessons, assessments });
  const summary = buildEnglishOpsSummary({ modules, lessons, assignments });
  const topBlueprint = blueprints[0];
  const releaseQueue = blueprints.filter((item) => item.releaseLabel !== 'pod-ready');
  const podReady = blueprints.filter((item) => item.releaseLabel === 'pod-ready');
  const byModule = Array.from(
    blueprints.reduce((map, blueprint) => {
      if (!map.has(blueprint.moduleTitle)) map.set(blueprint.moduleTitle, [] as typeof blueprints);
      map.get(blueprint.moduleTitle)?.push(blueprint);
      return map;
    }, new Map<string, typeof blueprints>()),
  );

  return (
    <PageShell
      title="English Curriculum Studio"
      subtitle="A proper visible slice for authoring and reviewing structured English lesson activities from LMS — not just loose lessons in a table."
      breadcrumbs={[{ label: 'Content Library', href: '/content' }]}
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ background: '#0f172a', color: 'white', padding: '12px 14px', borderRadius: 16, fontWeight: 800 }}>Interactive curriculum lane</div>
          <div style={{ background: '#EEF2FF', color: '#3730A3', padding: '12px 14px', borderRadius: 16, fontWeight: 800 }}>English authoring focus</div>
        </div>
      }
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'English modules', value: String(summary.moduleCount), note: 'Modules currently mapped into the English lane.' },
          { label: 'Structured lessons', value: String(summary.lessonCount), note: 'Lesson records now surfaced as activity blueprints.' },
          { label: 'Ready for release', value: String(summary.publishedLessons), note: 'Approved or published lessons that can move into pods.' },
          { label: 'Live assignments', value: String(summary.liveAssignments), note: 'Delivery load already tied to English content.' },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}>
            <div style={{ color: '#64748b' }}>{item.note}</div>
          </Card>
        ))}
      </section>

      {topBlueprint ? (
        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
          <Card title={topBlueprint.lessonTitle} eyebrow="Featured lesson blueprint">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Pill label={topBlueprint.moduleTitle} />
                <Pill label={`${topBlueprint.durationMinutes} min`} tone="#F8FAFC" text="#334155" />
                <Pill label={topBlueprint.mode} tone="#ECFDF5" text="#166534" />
                <Pill label={topBlueprint.releaseLabel} tone={releaseTone(topBlueprint.releaseLabel).tone} text={releaseTone(topBlueprint.releaseLabel).text} />
              </div>
              <div style={{ padding: 18, borderRadius: 20, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', marginBottom: 8 }}>Learning objective</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{topBlueprint.objective}</div>
                <div style={{ color: '#64748b', lineHeight: 1.7 }}>Vocabulary focus: {topBlueprint.vocabularyFocus.join(' • ')}</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {topBlueprint.activities.map((activity) => (
                  <div key={activity.title} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, padding: 16, borderRadius: 18, border: '1px solid #EEF2F7', background: 'white' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{activity.title}</div>
                      <div style={{ color: '#64748b', marginTop: 6 }}>{activity.type} • {activity.duration}</div>
                    </div>
                    <div>
                      <div style={{ color: '#334155', lineHeight: 1.7 }}>{activity.detail}</div>
                      <div style={{ marginTop: 8, color: '#7c3aed', fontWeight: 700 }}>Evidence: {activity.evidence}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gap: 16 }}>
            <Card title="Authoring health" eyebrow="What needs attention">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 16, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <strong>{summary.modulesMissingLessons}</strong> module{summary.modulesMissingLessons === 1 ? '' : 's'} still have fewer lessons than planned. The curriculum map is pretending harder than it should.
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                  <strong>{summary.lessonsInReview}</strong> lesson{summary.lessonsInReview === 1 ? '' : 's'} are waiting on sign-off before they can be released to learner pods.
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
                  <strong>{podReady.length}</strong> lesson blueprint{podReady.length === 1 ? '' : 's'} are pod-ready right now.
                </div>
              </div>
            </Card>

            <Card title="Assessment wiring" eyebrow="Progression gates">
              <div style={{ display: 'grid', gap: 12 }}>
                {blueprints.slice(0, 4).map((item) => (
                  <div key={item.lessonId} style={{ padding: 14, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <strong>{item.lessonTitle}</strong>
                      <Pill label={item.status} tone={statusTone(item.status).tone} text={statusTone(item.status).text} />
                    </div>
                    <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                      {item.assessmentTitle ? `${item.assessmentTitle} • ${item.assessmentTrigger}` : 'No gate linked yet — add one before pretending this module is release-safe.'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 16, marginBottom: 20 }}>
        <Card title="Release queue" eyebrow="Editorial board">
          <SimpleTable
            columns={['Lesson', 'Module', 'Status', 'Release note']}
            rows={releaseQueue.map((item) => [
              item.lessonTitle,
              item.moduleTitle,
              <Pill key={`${item.lessonId}-status`} label={item.status} tone={statusTone(item.status).tone} text={statusTone(item.status).text} />,
              item.releaseRisk,
            ])}
          />
        </Card>

        <Card title="Pod-ready lesson set" eyebrow="Can ship now">
          <SimpleTable
            columns={['Lesson', 'Vocabulary focus', 'Assessment', 'Mode']}
            rows={podReady.map((item) => [
              item.lessonTitle,
              item.vocabularyFocus.join(', '),
              item.assessmentTitle ?? 'Quick oral exit check',
              item.mode,
            ])}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        {byModule.map(([moduleTitle, moduleBlueprints]) => (
          <Card key={moduleTitle} title={moduleTitle} eyebrow="Structured activity map">
            <div style={{ display: 'grid', gap: 14 }}>
              {moduleBlueprints.map((blueprint) => (
                <div key={blueprint.lessonId} style={{ padding: 18, borderRadius: 20, border: '1px solid #E5E7EB', background: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{blueprint.lessonTitle}</div>
                      <div style={{ color: '#64748b' }}>{blueprint.objective}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Pill label={blueprint.level} tone="#EEF2FF" text="#3730A3" />
                      <Pill label={blueprint.status} tone={statusTone(blueprint.status).tone} text={statusTone(blueprint.status).text} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
                    {blueprint.activities.map((activity) => (
                      <div key={activity.title} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7', minHeight: 180 }}>
                        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', marginBottom: 8 }}>{activity.type}</div>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{activity.title}</div>
                        <div style={{ color: '#475569', lineHeight: 1.6, marginBottom: 10 }}>{activity.detail}</div>
                        <div style={{ color: '#7c3aed', fontWeight: 700 }}>{activity.duration}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}
