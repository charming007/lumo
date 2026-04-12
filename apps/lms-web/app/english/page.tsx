import { EnglishStudioAuthoringForm } from '../../components/english-studio-authoring-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchAssessments, fetchAssignments, fetchCurriculumModules, fetchLessons, fetchSubjects } from '../../lib/api';
import { buildEnglishLessonBlueprints, buildEnglishOpsSummary } from '../../lib/english-curriculum';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';
import { createLessonAction } from '../actions';

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

function readinessTone(score: number) {
  if (score >= 5) return { tone: '#DCFCE7', text: '#166534' };
  if (score >= 3) return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#FEE2E2', text: '#991B1B' };
}

export default async function EnglishCurriculumPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [modules, lessons, assessments, assignments, subjects] = await Promise.all([
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchAssignments(),
    fetchSubjects(),
  ]);

  const blueprints = buildEnglishLessonBlueprints({ modules, lessons, assessments });
  const summary = buildEnglishOpsSummary({ modules, lessons, assignments });
  const englishModules = modules.filter((module) => module.subjectName?.toLowerCase().includes('english'));
  const topBlueprint = blueprints[0];
  const releaseQueue = blueprints.filter((item) => item.releaseLabel !== 'pod-ready');
  const podReady = blueprints.filter((item) => item.releaseLabel === 'pod-ready');
  const readinessBoard = [...blueprints].sort((left, right) => left.readinessScore - right.readinessScore || left.lessonTitle.localeCompare(right.lessonTitle));
  const modulesMissingAssessments = englishModules.filter((module) => !assessments.some((assessment) => assessment.moduleId === module.id || assessment.moduleTitle === module.title));
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
      subtitle="Activity-based English authoring with a visible readiness board, so editors can plan a real lesson spine before they hit publish."
      breadcrumbs={[{ label: 'Content Library', href: '/content' }]}
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ background: '#0f172a', color: 'white', padding: '12px 14px', borderRadius: 16, fontWeight: 800 }}>Interactive curriculum lane</div>
          <ModalLauncher buttonLabel="Author English lesson" title="Author English lesson" description="Build the lesson from an activity spine, inspect readiness, then create it in the live content lane." eyebrow="English studio">
            <EnglishStudioAuthoringForm subjects={subjects} modules={modules} assessments={assessments} action={createLessonAction} />
          </ModalLauncher>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'English modules', value: String(summary.moduleCount), note: 'Modules currently mapped into the English lane.' },
          { label: 'Structured lessons', value: String(summary.lessonCount), note: 'Lesson records surfaced as lesson blueprints with readiness checks.' },
          { label: 'Ready for release', value: String(summary.publishedLessons), note: 'Approved or published lessons that can move into pods.' },
          { label: 'Modules missing gates', value: String(modulesMissingAssessments.length), note: 'Modules still pretending they can publish without assessment control.' },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}>
            <div style={{ color: '#64748b' }}>{item.note}</div>
          </Card>
        ))}
      </section>

      {topBlueprint ? (
        <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
          <Card title={topBlueprint.lessonTitle} eyebrow="Featured lesson blueprint">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Pill label={topBlueprint.moduleTitle} />
                <Pill label={`${topBlueprint.durationMinutes} min`} tone="#F8FAFC" text="#334155" />
                <Pill label={topBlueprint.mode} tone="#ECFDF5" text="#166534" />
                <Pill label={topBlueprint.releaseLabel} tone={releaseTone(topBlueprint.releaseLabel).tone} text={releaseTone(topBlueprint.releaseLabel).text} />
                <Pill label={`${topBlueprint.readinessScore}/5 checks`} tone={readinessTone(topBlueprint.readinessScore).tone} text={readinessTone(topBlueprint.readinessScore).text} />
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
            <Card title="Publish control" eyebrow="Readiness before bravado">
              <div style={{ display: 'grid', gap: 12 }}>
                {topBlueprint.readinessChecks.map((check) => (
                  <div key={check.label} style={{ padding: 14, borderRadius: 16, background: check.passed ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${check.passed ? '#BBF7D0' : '#FECACA'}` }}>
                    <strong style={{ color: check.passed ? '#166534' : '#991B1B' }}>{check.passed ? 'Ready' : 'Blocked'}</strong>
                    <div style={{ color: '#475569', marginTop: 6, lineHeight: 1.6 }}>{check.label}</div>
                  </div>
                ))}
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

        <Card title="Readiness board" eyebrow="Publish only when the checks pass">
          <SimpleTable
            columns={['Lesson', 'Readiness', 'Assessment', 'Immediate blocker']}
            rows={readinessBoard.map((item) => [
              item.lessonTitle,
              <Pill key={`${item.lessonId}-readiness`} label={`${item.readinessScore}/5`} tone={readinessTone(item.readinessScore).tone} text={readinessTone(item.readinessScore).text} />,
              item.assessmentTitle ?? 'No linked gate',
              item.readinessChecks.find((check) => !check.passed)?.label ?? 'Clear to publish',
            ])}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 16, marginBottom: 20 }}>
        <Card title="Modules missing assessment control" eyebrow="Fix these before release">
          <div style={{ display: 'grid', gap: 12 }}>
            {modulesMissingAssessments.length > 0 ? modulesMissingAssessments.map((module) => (
              <div key={module.id} style={{ padding: 14, borderRadius: 16, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <strong>{module.title}</strong>
                <div style={{ color: '#64748b', marginTop: 6 }}>{module.level} • {module.status} • No assessment gate linked yet.</div>
              </div>
            )) : <div style={{ padding: 14, borderRadius: 16, background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#166534', fontWeight: 700 }}>Every English module has an assessment gate. Finally.</div>}
          </div>
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
                      <Pill label={`${blueprint.readinessScore}/5 checks`} tone={readinessTone(blueprint.readinessScore).tone} text={readinessTone(blueprint.readinessScore).text} />
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
