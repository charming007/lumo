'use client';

import type React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill } from '../lib/ui';
import type { Assessment } from '../lib/types';
import type { CurriculumCanvasData, CurriculumCanvasLesson, CurriculumCanvasModule } from '../lib/curriculum-canvas';

const palettes = ['#4F46E5', '#0F766E', '#EA580C', '#9333EA', '#2563EB'];

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
  if (status === 'published' || status === 'approved' || status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review' || status === 'scheduled') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function lessonSummary(lesson: CurriculumCanvasLesson) {
  return `${lesson.mode} · ${lesson.durationMinutes} min`;
}

function assessmentLabel(assessment: Assessment | null) {
  if (!assessment) return 'No assessment gate linked yet';
  return `${assessment.triggerLabel} · ${Math.round(assessment.passingScore * 100)}% pass mark`;
}

export function CurriculumCanvas({ data }: { data: CurriculumCanvasData }) {
  const firstModule = data.subjects[0]?.strands[0]?.modules[0] ?? null;
  const [selectedModuleId, setSelectedModuleId] = useState(firstModule?.id ?? '');

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
    return (
      <section style={{ padding: 24, borderRadius: 24, background: 'white', border: '1px solid #e5e7eb', color: '#64748b' }}>
        Curriculum canvas is empty because no subject → strand → module chain came back from the API yet.
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          ['Subjects on canvas', String(data.summary.subjects)],
          ['Strands mapped', String(data.summary.strands)],
          ['Modules visible', String(data.summary.modules)],
          ['Lessons visible', String(data.summary.lessons)],
          ['Assessment gates', String(data.summary.assessments)],
          ['Blocked modules', String(data.summary.blockedModules)],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 16, borderRadius: 20, background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="curriculum-canvas__grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 0.9fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ padding: 18, borderRadius: 28, background: 'linear-gradient(180deg, #f8fbff 0%, #eef2ff 100%)', border: '1px solid #dbeafe', boxShadow: '0 18px 40px rgba(79, 70, 229, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Curriculum graph</div>
              <div style={{ color: '#334155', lineHeight: 1.6 }}>This is not a fake whiteboard. Every card below is tied to live curriculum records and can jump you into authoring, blockers, or assessment work.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/content" style={{ ...actionLinkStyle, background: '#111827', color: 'white' }}>Open content board</Link>
              <Link href="/content?view=blocked" style={{ ...actionLinkStyle, background: '#FEF3C7', color: '#92400E' }}>Clear blockers</Link>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {data.subjects.map((subject, index) => {
              const accent = palettes[index % palettes.length];
              return (
                <div key={subject.id} style={{ padding: 18, borderRadius: 24, background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(148, 163, 184, 0.22)', display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 14, alignSelf: 'stretch', minHeight: 58, borderRadius: 999, background: accent }} />
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{subject.name}</div>
                        <div style={{ color: '#64748b' }}>{subject.totals.modules} modules · {subject.totals.lessons} lessons · {subject.totals.assessments} assessments</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Pill label={`${subject.totals.readyLessons} ready lessons`} tone="#DCFCE7" text="#166534" />
                      <Pill label={`${subject.totals.gaps} release gaps`} tone={subject.totals.gaps ? '#FEF3C7' : '#EEF2FF'} text={subject.totals.gaps ? '#92400E' : '#3730A3'} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 14 }}>
                    {subject.strands.map((strand) => (
                      <div key={strand.id} style={{ display: 'grid', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontWeight: 800 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
                          <span>{strand.name}</span>
                          <span style={{ color: '#94a3b8', fontWeight: 700 }}>→</span>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>{strand.modules.length} module nodes</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                          {strand.modules.map((module) => {
                            const active = selected?.module.id === module.id;
                            const pill = statusTone(module.status);
                            return (
                              <button
                                key={module.id}
                                type="button"
                                onClick={() => setSelectedModuleId(module.id)}
                                style={{
                                  textAlign: 'left',
                                  borderRadius: 22,
                                  padding: 16,
                                  border: active ? `2px solid ${accent}` : '1px solid #dbe4ee',
                                  background: active ? 'linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)' : 'white',
                                  boxShadow: active ? '0 16px 34px rgba(79, 70, 229, 0.15)' : '0 10px 20px rgba(15, 23, 42, 0.04)',
                                  cursor: 'pointer',
                                  display: 'grid',
                                  gap: 12,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{module.title}</div>
                                    <div style={{ color: '#64748b' }}>{module.level} · {module.readyLessons}/{module.lessonCount} ready lessons</div>
                                  </div>
                                  <Pill label={module.status} tone={pill.tone} text={pill.text} />
                                </div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <Pill label={`${module.lessons.length} lesson nodes`} tone="#EFF6FF" text="#1D4ED8" />
                                  <Pill label={`${module.assessments.length} assessment nodes`} tone="#F3E8FF" text="#7E22CE" />
                                  <Pill label={module.gapCount ? `${module.gapCount} gaps` : 'release-ready'} tone={module.gapCount ? '#FEF3C7' : '#DCFCE7'} text={module.gapCount ? '#92400E' : '#166534'} />
                                </div>

                                <div style={{ display: 'grid', gap: 8 }}>
                                  {module.lessons.slice(0, 3).map((lesson) => {
                                    const lessonTone = statusTone(lesson.status);
                                    return (
                                      <div key={lesson.id} style={{ display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                          <strong style={{ color: '#0f172a' }}>{lesson.title}</strong>
                                          <Pill label={lesson.status} tone={lessonTone.tone} text={lessonTone.text} />
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: 13 }}>{lessonSummary(lesson)}</div>
                                      </div>
                                    );
                                  })}
                                  {module.lessons.length > 3 ? <div style={{ color: '#6366f1', fontWeight: 800, fontSize: 13 }}>+{module.lessons.length - 3} more lesson nodes</div> : null}
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

        <aside style={{ padding: 18, borderRadius: 28, background: '#0f172a', color: 'white', border: '1px solid rgba(15, 23, 42, 0.18)', boxShadow: '0 20px 44px rgba(15, 23, 42, 0.22)', position: 'sticky', top: 20 }}>
          {selected ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Selected node</div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{selected.module.title}</div>
                <div style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.6 }}>{selected.subject.name} → {selected.strand.name} → {selected.module.level}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${selected.module.readyLessons}/${selected.module.lessonCount} ready`} tone="#DCFCE7" text="#166534" />
                <Pill label={`${selected.module.assessments.length} gates`} tone="#F3E8FF" text="#7E22CE" />
                <Pill label={selected.module.gapCount ? `${selected.module.gapCount} gaps to clear` : 'ready to release'} tone={selected.module.gapCount ? '#FEF3C7' : '#E0E7FF'} text={selected.module.gapCount ? '#92400E' : '#3730A3'} />
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <Link href={`/content?subject=${selected.subject.id}&q=${encodeURIComponent(selected.module.title)}`} style={{ ...actionLinkStyle, background: 'white', color: '#0f172a' }}>Open module in content board</Link>
                <Link href={`/content/lessons/new?subjectId=${selected.subject.id}&moduleId=${selected.module.id}&from=${encodeURIComponent('/canvas')}`} style={{ ...actionLinkStyle, background: '#4F46E5', color: 'white' }}>Author a new lesson in this module</Link>
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
                        <div key={assessment.id} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', gap: 8 }}>
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
          ) : null}
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

function LessonNode({ lesson }: { lesson: CurriculumCanvasLesson }) {
  const pill = statusTone(lesson.status);
  return (
    <div style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', gap: 8 }}>
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
