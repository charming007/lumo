'use client';

import type React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Pill } from '../lib/ui';
import type { Assessment } from '../lib/types';
import type { CurriculumCanvasData, CurriculumCanvasLesson, CurriculumCanvasModule } from '../lib/curriculum-canvas';

const palettes = ['#8B5CF6', '#14B8A6', '#F97316', '#60A5FA', '#F43F5E'];

const actionLinkStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function statusTone(status: string) {
  if (status === 'published' || status === 'approved' || status === 'active') return { tone: '#052e16', text: '#86efac', border: '1px solid rgba(134,239,172,0.18)' };
  if (status === 'review' || status === 'scheduled') return { tone: '#3b2f0d', text: '#fcd34d', border: '1px solid rgba(252,211,77,0.16)' };
  return { tone: '#1e1b4b', text: '#c4b5fd', border: '1px solid rgba(196,181,253,0.14)' };
}

function lessonSummary(lesson: CurriculumCanvasLesson) {
  const details = [`${lesson.mode} · ${lesson.durationMinutes} min`];
  if (lesson.activityCount) details.push(`${lesson.activityCount} activities`);
  if (lesson.objectiveCount) details.push(`${lesson.objectiveCount} objectives`);
  return details.join(' · ');
}

function assessmentLabel(assessment: Assessment | null) {
  if (!assessment) return 'No assessment gate linked yet';
  return `${assessment.triggerLabel} · ${Math.round(assessment.passingScore * 100)}% pass mark`;
}

function provenancePill(module: CurriculumCanvasModule) {
  if (module.provenance === 'live') return { label: 'live graph', tone: '#052e16', text: '#86efac' };
  if (module.provenance === 'rescue') return { label: 'tree rescue', tone: '#0c4a6e', text: '#a5f3fc' };
  return { label: 'live + rescue', tone: '#312e81', text: '#c7d2fe' };
}

export function CurriculumCanvas({ data, failedSources = [] }: { data: CurriculumCanvasData; failedSources?: string[] }) {
  const firstModule = data.subjects[0]?.strands[0]?.modules[0] ?? null;
  const [selectedModuleId, setSelectedModuleId] = useState(firstModule?.id ?? '');

  useEffect(() => {
    if (!selectedModuleId && firstModule?.id) {
      setSelectedModuleId(firstModule.id);
    }
  }, [firstModule?.id, selectedModuleId]);

  const selected = useMemo(() => {
    for (const subject of data.subjects) {
      for (const strand of subject.strands) {
        for (const module of strand.modules) {
          if (module.id === selectedModuleId) {
            return { subject, strand, module };
          }
        }
      }
    }

    if (firstModule) {
      const subject = data.subjects[0];
      const strand = subject?.strands[0];
      return subject && strand ? { subject, strand, module: firstModule } : null;
    }

    return null;
  }, [data.subjects, firstModule, selectedModuleId]);

  if (!data.subjects.length) {
    return <CanvasEmptyState failedSources={failedSources} />;
  }

  return (
    <section style={{ display: 'grid', gap: 18, minHeight: 420 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          ['Subjects on canvas', String(data.summary.subjects)],
          ['Strands mapped', String(data.summary.strands)],
          ['Modules visible', String(data.summary.modules)],
          ['Lessons visible', String(data.summary.lessons)],
          ['Assessment gates', String(data.summary.assessments)],
          ['Blocked modules', String(data.summary.blockedModules)],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 16, borderRadius: 20, background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 18px 32px rgba(2, 6, 23, 0.24)' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: '#f8fafc' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="curriculum-canvas__grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 0.9fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ padding: 18, borderRadius: 28, background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,1) 100%)', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 24px 44px rgba(2, 6, 23, 0.34)', minHeight: 520 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Curriculum graph</div>
              <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>The canvas is live, dark, and operational. Every visible card below can hand you into authoring, blocker cleanup, or assessment work without pretending to be a blank whiteboard.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/content" style={{ ...actionLinkStyle, background: '#ffffff', color: '#0f172a' }}>Open content board</Link>
              <Link href="/content?view=blocked" style={{ ...actionLinkStyle, background: '#FEF3C7', color: '#92400E' }}>Clear blockers</Link>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {data.subjects.map((subject, index) => {
              const accent = palettes[index % palettes.length];
              return (
                <div key={subject.id} style={{ padding: 18, borderRadius: 24, background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148, 163, 184, 0.18)', display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 14, alignSelf: 'stretch', minHeight: 58, borderRadius: 999, background: accent }} />
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc' }}>{subject.name}</div>
                        <div style={{ color: '#94a3b8' }}>{subject.totals.modules} modules · {subject.totals.lessons} lessons · {subject.totals.assessments} assessments</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Pill label={`${subject.totals.readyLessons} ready lessons`} tone="#052e16" text="#86efac" />
                      <Pill label={`${subject.totals.gaps} release gaps`} tone={subject.totals.gaps ? '#3b2f0d' : '#1e1b4b'} text={subject.totals.gaps ? '#fcd34d' : '#c4b5fd'} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 14 }}>
                    {subject.strands.map((strand) => (
                      <div key={strand.id} style={{ display: 'grid', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontWeight: 800 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
                          <span>{strand.name}</span>
                          <span style={{ color: '#64748b', fontWeight: 700 }}>→</span>
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>{strand.modules.length} module nodes</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
                          {strand.modules.map((module) => {
                            const active = selected?.module.id === module.id;
                            const pill = statusTone(module.status);
                            const provenance = provenancePill(module);
                            return (
                              <button
                                key={module.id}
                                type="button"
                                onClick={() => setSelectedModuleId(module.id)}
                                style={{
                                  textAlign: 'left',
                                  borderRadius: 22,
                                  padding: 16,
                                  border: active ? `2px solid ${accent}` : '1px solid rgba(148,163,184,0.18)',
                                  background: active ? 'linear-gradient(180deg, rgba(30,41,59,0.96) 0%, rgba(30,27,75,0.92) 100%)' : 'rgba(15,23,42,0.92)',
                                  boxShadow: active ? '0 18px 34px rgba(79, 70, 229, 0.22)' : '0 12px 22px rgba(2, 6, 23, 0.18)',
                                  cursor: 'pointer',
                                  display: 'grid',
                                  gap: 12,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{module.title}</div>
                                    <div style={{ color: '#94a3b8' }}>{module.level} · {module.coverageLabel}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <Pill label={module.status} tone={pill.tone} text={pill.text} />
                                    <Pill label={provenance.label} tone={provenance.tone} text={provenance.text} />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <Pill label={`${module.readyLessons}/${module.lessonCount} ready lessons`} tone="#172554" text="#93c5fd" />
                                  <Pill label={module.assessmentCoverageLabel} tone="#3b0764" text="#d8b4fe" />
                                  <Pill label={module.gapCount ? `${module.gapCount} gaps` : 'release-ready'} tone={module.gapCount ? '#3b2f0d' : '#052e16'} text={module.gapCount ? '#fcd34d' : '#86efac'} />
                                </div>

                                <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.12)', color: module.gapCount ? '#fde68a' : '#bbf7d0', lineHeight: 1.6, fontSize: 14 }}>
                                  {module.blockerSummary}
                                </div>

                                <div style={{ display: 'grid', gap: 8 }}>
                                  {module.lessons.slice(0, 3).map((lesson) => {
                                    const lessonTone = statusTone(lesson.status);
                                    return (
                                      <div key={lesson.id} style={{ display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.12)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                          <strong style={{ color: '#f8fafc' }}>{lesson.title}</strong>
                                          <Pill label={lesson.status} tone={lessonTone.tone} text={lessonTone.text} />
                                        </div>
                                        <div style={{ color: '#94a3b8', fontSize: 13 }}>{lessonSummary(lesson)}</div>
                                      </div>
                                    );
                                  })}
                                  {module.lessons.length > 3 ? <div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 13 }}>+{module.lessons.length - 3} more lesson nodes</div> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside style={{ padding: 18, borderRadius: 28, background: '#020617', color: 'white', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 20px 44px rgba(2, 6, 23, 0.38)', position: 'sticky', top: 20, minHeight: 320 }}>
          {selected ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Selected node</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{selected.module.title}</div>
                <div style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.6 }}>{selected.subject.name} → {selected.strand.name} → {selected.module.level}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${selected.module.readyLessons}/${selected.module.lessonCount} ready`} tone="#052e16" text="#86efac" />
                <Pill label={selected.module.assessmentCoverageLabel} tone="#3b0764" text="#d8b4fe" />
                <Pill label={selected.module.gapCount ? `${selected.module.gapCount} gaps to clear` : 'ready to release'} tone={selected.module.gapCount ? '#3b2f0d' : '#1e1b4b'} text={selected.module.gapCount ? '#fcd34d' : '#c4b5fd'} />
              </div>

              <div style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 8 }}>
                <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Release readout</div>
                <div style={{ color: selected.module.gapCount ? '#fde68a' : '#bbf7d0', lineHeight: 1.7 }}>{selected.module.blockerSummary}</div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <Link href={`/content?subject=${selected.subject.id}&q=${encodeURIComponent(selected.module.title)}`} style={{ ...actionLinkStyle, background: 'white', color: '#0f172a' }}>Open module in content board</Link>
                <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(selected.subject.id)}&moduleId=${encodeURIComponent(selected.module.id)}&from=${encodeURIComponent('/canvas')}`} style={{ ...actionLinkStyle, background: '#4F46E5', color: 'white' }}>Author a new lesson in this module</Link>
                <Link href={`/content?view=blocked&subject=${selected.subject.id}&q=${encodeURIComponent(selected.module.title)}`} style={{ ...actionLinkStyle, background: '#FEF3C7', color: '#92400E' }}>Inspect release blockers</Link>
                <Link href="/assessments" style={{ ...actionLinkStyle, background: '#EDE9FE', color: '#5B21B6' }}>Open assessment control board</Link>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Lesson nodes</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {selected.module.lessons.length ? selected.module.lessons.map((lesson) => <LessonNode key={lesson.id} lesson={lesson} />) : <div style={{ color: '#cbd5e1' }}>No lessons mapped yet.</div>}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Assessment gates</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {selected.module.assessments.length ? selected.module.assessments.map((assessment) => {
                      const pill = statusTone(assessment.status);
                      return (
                        <div key={assessment.id} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                            <strong>{assessment.title}</strong>
                            <Pill label={assessment.status} tone={pill.tone} text={pill.text} />
                          </div>
                          <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{assessmentLabel(assessment)}</div>
                        </div>
                      );
                    }) : <div style={{ color: '#fbbf24', lineHeight: 1.6 }}>No gate linked. That module is not truly release-ready yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <CanvasEmptyState failedSources={failedSources} compact />
          )}
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 1080px) {
          .curriculum-canvas__grid {
            grid-template-columns: minmax(0, 1fr);
          }

          aside {
            position: static !important;
          }
        }
      `}</style>
    </section>
  );
}

function CanvasEmptyState({ failedSources, compact = false }: { failedSources: string[]; compact?: boolean }) {
  return (
    <section style={{ padding: compact ? 0 : 24, borderRadius: compact ? 0 : 28, background: compact ? 'transparent' : 'linear-gradient(180deg, rgba(2,6,23,0.98) 0%, rgba(15,23,42,0.96) 100%)', border: compact ? '0' : '1px solid rgba(99,102,241,0.16)', color: '#e2e8f0' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Canvas V1 fallback</div>
          <div style={{ fontSize: compact ? 22 : 28, fontWeight: 900, color: '#f8fafc' }}>The route works. The data spine doesn’t.</div>
          <div style={{ color: '#cbd5e1', lineHeight: 1.7, marginTop: 8 }}>
            {failedSources.length
              ? `Live curriculum feeds are degraded right now: ${failedSources.join(', ')}.`
              : 'Subjects, strands, or modules are not returning a complete chain yet, so the canvas cannot draw the live graph.'}
            {' '}Use the real authoring surfaces below instead of staring at an empty page like it insulted your family.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { label: 'Open content board', href: '/content', note: 'See the full curriculum library and filter by module, subject, or blockers.', background: '#ffffff', color: '#0f172a' },
            { label: 'Create a lesson', href: '/content/lessons/new?from=%2Fcanvas', note: 'Jump straight into authoring instead of waiting for the graph to fill in.', background: '#4F46E5', color: '#ffffff' },
            { label: 'Review blockers', href: '/content?view=blocked', note: 'Find modules missing ready lessons or assessment gates.', background: '#FEF3C7', color: '#92400E' },
            { label: 'Open assessments', href: '/assessments', note: 'Manage progression gates and release readiness from the real board.', background: '#EDE9FE', color: '#5B21B6' },
          ].map((item) => (
            <div key={item.label} style={{ padding: 16, borderRadius: 20, background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.16)', display: 'grid', gap: 12 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 800 }}>{item.label}</div>
              <div style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 14 }}>{item.note}</div>
              <Link href={item.href} style={{ ...actionLinkStyle, background: item.background, color: item.color }}>Go now</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LessonNode({ lesson }: { lesson: CurriculumCanvasLesson }) {
  const pill = statusTone(lesson.status);
  return (
    <div style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <strong>{lesson.title}</strong>
        <Pill label={lesson.status} tone={pill.tone} text={pill.text} />
      </div>
      <div style={{ color: '#cbd5e1' }}>{lessonSummary(lesson)}</div>
      <div style={{ color: lesson.assessmentTitle ? '#ddd6fe' : '#fbbf24', fontSize: 13, lineHeight: 1.5 }}>
        {lesson.assessmentTitle ? `Linked gate: ${lesson.assessmentTitle}` : 'No linked assessment gate yet'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/content/lessons/${lesson.id}?from=${encodeURIComponent('/canvas')}`} style={{ color: 'white', fontWeight: 800, textDecoration: 'none' }}>Open lesson →</Link>
        <Link href={`/content/lessons/new?duplicate=${lesson.id}&from=${encodeURIComponent('/canvas')}`} style={{ color: '#c4b5fd', fontWeight: 800, textDecoration: 'none' }}>Duplicate →</Link>
      </div>
    </div>
  );
}
