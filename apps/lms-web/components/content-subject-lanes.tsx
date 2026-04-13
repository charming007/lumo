'use client';

import { useMemo, useState } from 'react';
import {
  DeleteStrandForm,
  DeleteSubjectForm,
  UpdateStrandForm,
  UpdateSubjectForm,
} from './admin-forms';
import { ModalLauncher } from './modal-launcher';
import { Card, Pill } from '../lib/ui';
import type { Assessment, CurriculumModule, Lesson, Strand, Subject } from '../lib/types';

const subjectPalette: Record<string, { tone: string; text: string; accent: string }> = {
  english: { tone: '#EEF2FF', text: '#3730A3', accent: '#4F46E5' },
  math: { tone: '#ECFDF5', text: '#166534', accent: '#16A34A' },
  'life-skills': { tone: '#FFF7ED', text: '#9A3412', accent: '#F97316' },
};

const actionButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: 'none',
} as const;

function iconButtonStyle(background: string, color: string) {
  return { ...actionButtonStyle, background, color };
}

export function ContentSubjectLanes({
  subjects,
  strands,
  modules,
  lessons,
  assessments,
}: {
  subjects: Subject[];
  strands: Strand[];
  modules: CurriculumModule[];
  lessons: Lesson[];
  assessments: Assessment[];
}) {
  const subjectSummaries = useMemo(() => subjects
    .map((subject) => {
      const palette = subjectPalette[subject.id] || subjectPalette.english;
      const subjectStrands = strands.filter((strand) => strand.subjectId === subject.id);
      const subjectModules = modules.filter((module) => module.subjectId === subject.id);
      const subjectLessons = lessons.filter((lesson) => lesson.subjectId === subject.id || lesson.subjectName === subject.name);
      const subjectAssessments = assessments.filter((assessment) => assessment.subjectId === subject.id || assessment.subjectName === subject.name);
      const publishedModules = subjectModules.filter((module) => module.status === 'published').length;
      const readyLessons = subjectLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;

      return { subject, palette, subjectStrands, subjectModules, subjectLessons, subjectAssessments, publishedModules, readyLessons };
    })
    .sort((left, right) => (left.subject.order ?? 999) - (right.subject.order ?? 999) || left.subject.name.localeCompare(right.subject.name)), [subjects, strands, modules, lessons, assessments]);

  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const [collapsedStrands, setCollapsedStrands] = useState<Record<string, boolean>>({});
  const collapsedCount = subjectSummaries.filter(({ subject }) => collapsedSubjects[subject.id]).length;
  const strandIds = subjectSummaries.flatMap(({ subjectStrands }) => subjectStrands.map((strand) => strand.id));
  const collapsedStrandCount = strandIds.filter((strandId) => collapsedStrands[strandId]).length;
  const allCollapsed = subjectSummaries.length > 0 && collapsedCount === subjectSummaries.length && collapsedStrandCount === strandIds.length;
  const allExpanded = collapsedCount === 0 && collapsedStrandCount === 0;

  return (
    <section style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', marginBottom: 6 }}>Subject lanes</div>
          <div style={{ color: '#64748b' }}>Collapse the noise when you want the big picture, then drill into one subject without the rest of the board yelling at you.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              setCollapsedSubjects(Object.fromEntries(subjectSummaries.map(({ subject }) => [subject.id, true])));
              setCollapsedStrands(Object.fromEntries(strandIds.map((strandId) => [strandId, true])));
            }}
            disabled={allCollapsed}
            style={{
              ...actionButtonStyle,
              border: '1px solid #cbd5e1',
              background: allCollapsed ? '#e2e8f0' : '#f8fafc',
              color: '#334155',
              cursor: allCollapsed ? 'not-allowed' : 'pointer',
            }}
          >
            Collapse all
          </button>
          <button
            type="button"
            onClick={() => {
              setCollapsedSubjects({});
              setCollapsedStrands({});
            }}
            disabled={allExpanded}
            style={{
              ...actionButtonStyle,
              border: 0,
              background: allExpanded ? '#c7d2fe' : '#4F46E5',
              color: 'white',
              cursor: allExpanded ? 'not-allowed' : 'pointer',
            }}
          >
            Expand all
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {subjectSummaries.map(({ subject, palette, subjectStrands, subjectModules, subjectLessons, subjectAssessments, publishedModules, readyLessons }) => {
          const collapsed = Boolean(collapsedSubjects[subject.id]);

          return (
            <Card key={subject.id} title={subject.name} eyebrow="Subject lane">
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => setCollapsedSubjects((current) => ({ ...current, [subject.id]: !current[subject.id] }))}
                      aria-expanded={!collapsed}
                      aria-controls={`subject-panel-${subject.id}`}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        border: '1px solid #dbe4ee',
                        background: 'white',
                        color: '#334155',
                        cursor: 'pointer',
                        fontSize: 18,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                      title={collapsed ? `Expand ${subject.name}` : `Collapse ${subject.name}`}
                    >
                      {collapsed ? '▸' : '▾'}
                    </button>
                    <div style={{ width: 16, alignSelf: 'stretch', borderRadius: 999, background: palette.accent, minHeight: 52 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{subjectStrands.length} strand{subjectStrands.length === 1 ? '' : 's'}</div>
                      <div style={{ color: '#64748b' }}>{subjectModules.length} modules • {subjectLessons.length} lessons • {subjectAssessments.length} assessments</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <ModalLauncher buttonLabel="✏️" title={`Edit subject · ${subject.name}`} description="Update the subject label, icon, or sort order." eyebrow="Edit subject" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                      <UpdateSubjectForm subject={subject} embedded />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel="🗑" title={`Delete subject · ${subject.name}`} description="Remove the full subject lane only if it should disappear from the content library." eyebrow="Delete subject" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                      <DeleteSubjectForm subject={subject} embedded />
                    </ModalLauncher>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Pill label={collapsed ? 'Collapsed' : 'Expanded'} tone={collapsed ? '#E2E8F0' : '#EEF2FF'} text={collapsed ? '#334155' : '#3730A3'} />
                  <Pill label={`${subjectStrands.filter((strand) => collapsedStrands[strand.id]).length}/${subjectStrands.length} strands collapsed`} tone="#F8FAFC" text="#334155" />
                  <Pill label={`${publishedModules} published`} tone={palette.tone} text={palette.text} />
                  <Pill label={`${readyLessons} ready lessons`} tone="#F8FAFC" text="#334155" />
                </div>

                <div id={`subject-panel-${subject.id}`} hidden={collapsed} style={{ display: collapsed ? 'none' : 'grid', gap: 10 }}>
                  {subjectStrands.length > 0 ? subjectStrands.map((strand) => {
                    const strandModules = subjectModules.filter((module) => module.strandName === strand.name);
                    const strandCollapsed = Boolean(collapsedStrands[strand.id]);
                    return (
                      <div key={strand.id} style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: strandCollapsed ? 0 : 4, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                            <button
                              type="button"
                              onClick={() => setCollapsedStrands((current) => ({ ...current, [strand.id]: !current[strand.id] }))}
                              aria-expanded={!strandCollapsed}
                              aria-controls={`strand-panel-${strand.id}`}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                border: '1px solid #dbe4ee',
                                background: 'white',
                                color: '#334155',
                                cursor: 'pointer',
                                fontSize: 16,
                                fontWeight: 900,
                                flexShrink: 0,
                              }}
                              title={strandCollapsed ? `Expand ${strand.name}` : `Collapse ${strand.name}`}
                            >
                              {strandCollapsed ? '▸' : '▾'}
                            </button>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700 }}>{strand.name}</div>
                              <div style={{ color: '#64748b', fontSize: 13 }}>{strandModules.length} module{strandModules.length === 1 ? '' : 's'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <ModalLauncher buttonLabel="✏️" title={`Edit strand · ${strand.name}`} description="Rename or reorder this strand without leaving the subject lane." eyebrow="Edit strand" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                              <UpdateStrandForm strand={strand} subjects={subjects} embedded />
                            </ModalLauncher>
                            <ModalLauncher buttonLabel="🗑" title={`Delete strand · ${strand.name}`} description="Remove this strand and everything nested under it if it no longer belongs in the curriculum map." eyebrow="Delete strand" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                              <DeleteStrandForm strand={strand} embedded />
                            </ModalLauncher>
                          </div>
                        </div>
                        <div id={`strand-panel-${strand.id}`} hidden={strandCollapsed} style={{ display: strandCollapsed ? 'none' : 'block', color: '#64748b', lineHeight: 1.5 }}>
                          {strandModules.length > 0 ? strandModules.map((module) => module.title).join(' • ') : 'No modules yet.'}
                        </div>
                      </div>
                    );
                  }) : <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>No strands yet. Create one by adding a subject with an initial strand or expand the API later.</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
