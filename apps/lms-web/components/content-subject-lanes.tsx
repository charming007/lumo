'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  CreateAssessmentForm,
  DeleteAssessmentForm,
  DeleteLessonForm,
  DeleteModuleForm,
  DeleteStrandForm,
  DeleteSubjectForm,
  CreateModuleForm,
  CreateStrandForm,
  UpdateAssessmentForm,
  UpdateLessonForm,
  UpdateModuleForm,
  UpdateStrandForm,
  UpdateSubjectForm,
} from './admin-forms';
import { ModalLauncher } from './modal-launcher';
import { quickUpdateCanvasModuleAction, quickUpdateLessonStatusAction, quickUpdateSubjectStatusAction, reorderModuleLessonsAction, updateStrandAction } from '../app/actions';
import { assessmentMatchesModule, isLiveAssessmentGate } from '../lib/module-assessment-match';
import { filterLessonsForModule } from '../lib/module-lesson-match';
import { getModuleReleaseState } from '../lib/module-release';
import { resolveModuleSubjectId } from '../lib/module-subject-match';
import { Card, Pill } from '../lib/ui';
import type { Assessment, Assignment, CurriculumModule, Lesson, Strand, Subject } from '../lib/types';

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

function statusPill(status: string) {
  if (status === 'published' || status === 'approved' || status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review' || status === 'scheduled') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

const lifecycleOptions = [
  { value: 'draft', label: 'Draft', activeBackground: '#E2E8F0', idleBackground: '#FFFFFF', color: '#334155', border: '#CBD5E1' },
  { value: 'review', label: 'Review', activeBackground: '#FDE68A', idleBackground: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  { value: 'published', label: 'Publish', activeBackground: '#BBF7D0', idleBackground: '#ECFDF5', color: '#166534', border: '#86EFAC' },
] as const;

function LessonReorderLane({
  module,
  lessons,
  assignments,
  returnPath,
}: {
  module: CurriculumModule;
  lessons: Lesson[];
  assignments: Assignment[];
  returnPath: string;
}) {
  const [orderedLessons, setOrderedLessons] = useState(lessons);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrderedLessons(lessons);
  }, [lessons]);

  function moveLesson(targetLessonId: string) {
    if (!draggedLessonId || draggedLessonId === targetLessonId) return;

    const sourceIndex = orderedLessons.findIndex((lesson) => lesson.id === draggedLessonId);
    const targetIndex = orderedLessons.findIndex((lesson) => lesson.id === targetLessonId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const next = [...orderedLessons];
    const [movedLesson] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, movedLesson);
    setOrderedLessons(next);
    setDraggedLessonId(null);
    setFeedback('Saving lesson order…');

    startTransition(async () => {
      const result = await reorderModuleLessonsAction({
        moduleId: module.id,
        orderedLessonIds: next.map((lesson) => lesson.id),
      });

      if (!result.ok) {
        setOrderedLessons(lessons);
      }

      setFeedback(result.message);
    });
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {orderedLessons.length > 1 ? (
        <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>
          Drag lessons to change their module order. Lesson studio keeps the same saved sequence.
        </div>
      ) : null}
      {feedback ? (
        <div style={{ color: feedback.toLowerCase().includes('updated') ? '#166534' : '#475569', fontSize: 12, fontWeight: 700 }}>
          {feedback}
        </div>
      ) : null}
      {orderedLessons.length > 0 ? orderedLessons.map((lesson, lessonIndex) => {
        const lessonPill = statusPill(lesson.status);
        const usageCount = assignments.filter((assignment) => assignment.lessonTitle === lesson.title).length;
        const isDragging = draggedLessonId === lesson.id;

        return (
          <div
            key={lesson.id}
            draggable={orderedLessons.length > 1 && !isPending}
            onDragStart={() => setDraggedLessonId(lesson.id)}
            onDragEnd={() => setDraggedLessonId(null)}
            onDragOver={(event) => {
              if (!draggedLessonId || draggedLessonId === lesson.id) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              moveLesson(lesson.id);
            }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: 12,
              borderRadius: 16,
              background: isDragging ? '#eef2ff' : '#f8fafc',
              border: `1px solid ${isDragging ? '#c7d2fe' : '#eef2f7'}`,
              opacity: isPending && isDragging ? 0.7 : 1,
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ cursor: orderedLessons.length > 1 && !isPending ? 'grab' : 'default', color: '#64748b', fontSize: 16 }}>⋮⋮</span>
                <div style={{ fontWeight: 700 }}>{lessonIndex + 1}. {lesson.title}</div>
              </div>
              <div style={{ color: '#64748b' }}>{lesson.mode} • {lesson.durationMinutes} min • {lesson.activityTypes?.length ?? lesson.activityCount ?? 0} typed step{(lesson.activityTypes?.length ?? lesson.activityCount ?? 0) === 1 ? '' : 's'}</div>
              {lesson.activityTypes && lesson.activityTypes.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {lesson.activityTypes.slice(0, 4).map((type) => {
                    const accentMap: Record<string, { tint: string; border: string; text: string }> = {
                      image_choice: { tint: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
                      tap_choice: { tint: '#ECFDF5', border: '#BBF7D0', text: '#166534' },
                      listen_repeat: { tint: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
                      speak_answer: { tint: '#FDF2F8', border: '#FBCFE8', text: '#9D174D' },
                      word_build: { tint: '#FEFCE8', border: '#FDE68A', text: '#854D0E' },
                      letter_intro: { tint: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
                      oral_quiz: { tint: '#F8FAFC', border: '#CBD5E1', text: '#334155' },
                      listen_answer: { tint: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
                    };
                    const labelMap: Record<string, string> = {
                      listen_repeat: 'Listen & repeat',
                      speak_answer: 'Speak answer',
                      word_build: 'Word build',
                      image_choice: 'Image choice',
                      oral_quiz: 'Oral quiz',
                      listen_answer: 'Listen answer',
                      tap_choice: 'Tap choice',
                      letter_intro: 'Letter intro',
                    };
                    const accent = accentMap[type] ?? { tint: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
                    return (
                      <span key={type} style={{ padding: '4px 8px', borderRadius: 999, background: accent.tint, border: `1px solid ${accent.border}`, color: accent.text, fontSize: 11, fontWeight: 800 }}>
                        {labelMap[type] ?? type}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: '#B45309', fontSize: 12, fontWeight: 700, marginTop: 8 }}>Type mix still hidden until authored steps are added.</div>
              )}
              <div style={{ color: '#9A3412', fontSize: 12, fontWeight: 700, marginTop: 6 }}>
                {usageCount} live assignment{usageCount === 1 ? '' : 's'} using this learner-facing lesson
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                <Link href={`/content/lessons/${lesson.id}?from=${encodeURIComponent(returnPath)}`} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Open typed lesson studio →</Link>
                <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(module.subjectId ?? '')}&moduleId=${encodeURIComponent(module.id)}&duplicate=${encodeURIComponent(lesson.id)}&from=${encodeURIComponent(returnPath)}`} style={{ color: '#7C3AED', fontWeight: 700, textDecoration: 'none' }}>Duplicate into new lesson →</Link>
                <Link href={`/assignments?q=${encodeURIComponent(lesson.title)}`} style={{ color: '#C2410C', fontWeight: 700, textDecoration: 'none' }}>View delivery usage →</Link>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Pill label={lesson.status} tone={lessonPill.tone} text={lessonPill.text} />
              <form action={quickUpdateLessonStatusAction}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="status" value="draft" />
                <button type="submit" style={{ ...actionButtonStyle, background: lesson.status === 'draft' ? '#E2E8F0' : '#F8FAFC', color: '#334155', border: '1px solid #CBD5E1' }}>
                  Draft
                </button>
              </form>
              <form action={quickUpdateLessonStatusAction}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="status" value="published" />
                <button type="submit" style={{ ...actionButtonStyle, background: lesson.status === 'published' ? '#BBF7D0' : '#ECFDF5', color: '#166534', border: '1px solid #86EFAC' }}>
                  Publish
                </button>
              </form>
              <ModalLauncher buttonLabel="✏️" title={`Edit lesson lifecycle · ${lesson.title}`} description="Update the lesson lifecycle, mode, or duration without leaving the module card." eyebrow="Edit lesson" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                <UpdateLessonForm lessons={[lesson]} returnPath={returnPath} />
              </ModalLauncher>
              <ModalLauncher buttonLabel="🗑" title={`Delete lesson · ${lesson.title}`} description="Delete this lesson if it should no longer be in the module lane." eyebrow="Delete lesson" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                <DeleteLessonForm lessons={[lesson]} returnPath={returnPath} />
              </ModalLauncher>
            </div>
          </div>
        );
      }) : (
        <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>No lessons linked yet.</div>
      )}
    </div>
  );
}

function LifecycleRail({
  entityLabel,
  status,
  helper,
  forms,
}: {
  entityLabel: string;
  status: string;
  helper: string;
  forms: Array<Record<string, string>>;
}) {
  const pill = statusPill(status);

  return (
    <div style={{ padding: 14, borderRadius: 18, border: '1px solid #dbe4ee', background: '#f8fafc', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', color: '#475569', marginBottom: 4 }}>{entityLabel} lifecycle</div>
          <div style={{ color: '#475569', lineHeight: 1.5 }}>{helper}</div>
        </div>
        <Pill label={`Now ${status}`} tone={pill.tone} text={pill.text} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {lifecycleOptions.map((option) => {
          const fields = forms.find((entry) => entry.status === option.value) ?? forms[0] ?? {};
          const isActive = status === option.value;

          return (
            <form key={option.value} action={entityLabel === 'Strand' ? updateStrandAction : quickUpdateSubjectStatusAction}>
              {Object.entries({ ...fields, status: option.value }).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <button
                type="submit"
                style={{
                  ...actionButtonStyle,
                  width: '100%',
                  padding: '14px 12px',
                  border: `1px solid ${option.border}`,
                  background: isActive ? option.activeBackground : option.idleBackground,
                  color: option.color,
                  boxShadow: isActive ? `0 0 0 2px ${option.border}33` : 'none',
                }}
              >
                {isActive ? `✓ ${option.label}` : option.label}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

export function ContentSubjectLanes({
  subjects,
  strands,
  modules,
  lessons,
  assessments,
  assignments,
  returnPath,
}: {
  subjects: Subject[];
  strands: Strand[];
  modules: CurriculumModule[];
  lessons: Lesson[];
  assessments: Assessment[];
  assignments: Assignment[];
  returnPath: string;
}) {
  const subjectSummaries = useMemo(() => subjects
    .map((subject) => {
      const palette = subjectPalette[subject.id] || subjectPalette.english;
      const subjectStrands = strands.filter((strand) => strand.subjectId === subject.id);
      const subjectModules = modules.filter((module) => module.subjectId === subject.id || module.subjectName === subject.name);
      const subjectLessons = lessons.filter((lesson) => lesson.subjectId === subject.id || lesson.subjectName === subject.name);
      const subjectAssessments = assessments.filter((assessment) => assessment.subjectId === subject.id || assessment.subjectName === subject.name);
      const subjectAssignments = assignments.filter((assignment) => subjectLessons.some((lesson) => lesson.title === assignment.lessonTitle));
      const publishedModules = subjectModules.filter((module) => module.status === 'published').length;
      const readyLessons = subjectLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;

      return { subject, palette, subjectStrands, subjectModules, subjectLessons, subjectAssessments, subjectAssignments, publishedModules, readyLessons };
    })
    .sort((left, right) => (left.subject.order ?? 999) - (right.subject.order ?? 999) || left.subject.name.localeCompare(right.subject.name)), [subjects, strands, modules, lessons, assessments, assignments]);

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
          <div style={{ color: '#64748b' }}>Collapse the noise when you want the big picture, then drill into one subject or one strand without the rest of the board yelling at you.</div>
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
        {subjectSummaries.map(({ subject, palette, subjectStrands, subjectModules, subjectLessons, subjectAssessments, subjectAssignments, publishedModules, readyLessons }) => {
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
                        background: collapsed ? '#f8fafc' : '#eef2ff',
                        color: '#334155',
                        cursor: 'pointer',
                        fontSize: 18,
                        fontWeight: 900,
                        flexShrink: 0,
                        transition: 'transform 120ms ease, background 120ms ease',
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
                    <ModalLauncher buttonLabel="✏️" title={`Edit subject lifecycle · ${subject.name}`} description="Update the subject label, icon, sort order, and lifecycle state from the same modal." eyebrow="Edit subject" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                      <UpdateSubjectForm subject={subject} embedded returnPath={returnPath} />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel="🗑" title={`Delete subject · ${subject.name}`} description="Remove the full subject lane only if it should disappear from the content library." eyebrow="Delete subject" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                      <DeleteSubjectForm subject={subject} embedded returnPath={returnPath} />
                    </ModalLauncher>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Pill label={collapsed ? 'Collapsed' : 'Expanded'} tone={collapsed ? '#E2E8F0' : '#EEF2FF'} text={collapsed ? '#334155' : '#3730A3'} />
                    <Pill label={subject.status ?? 'draft'} tone={statusPill(subject.status ?? 'draft').tone} text={statusPill(subject.status ?? 'draft').text} />
                    <Pill label={`${subjectStrands.filter((strand) => collapsedStrands[strand.id]).length}/${subjectStrands.length} strands collapsed`} tone="#F8FAFC" text="#334155" />
                    <Pill label={`${publishedModules} published`} tone={palette.tone} text={palette.text} />
                    <Pill label={`${readyLessons} ready lessons`} tone="#F8FAFC" text="#334155" />
                    <Pill label={`${subjectAssignments.length} learner-facing assignment${subjectAssignments.length === 1 ? '' : 's'}`} tone="#FFF7ED" text="#9A3412" />
                  </div>
                  <LifecycleRail
                    entityLabel="Subject"
                    status={subject.status ?? 'draft'}
                    helper="These controls now sit directly on the lane surface, so nobody has to hunt inside a modal just to move the subject between draft, review, and published."
                    forms={lifecycleOptions.map((option) => ({
                      subjectId: subject.id,
                      returnPath,
                      name: subject.name,
                      icon: subject.icon ?? '',
                      order: String(subject.order ?? 1),
                      status: option.value,
                    }))}
                  />
                </div>

                <div id={`subject-panel-${subject.id}`} hidden={collapsed} style={{ display: collapsed ? 'none' : 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <ModalLauncher buttonLabel="＋ Strand" title={`Create strand in ${subject.name}`} description="Add a real strand directly from the curriculum canvas instead of bouncing to a separate admin surface." eyebrow="Create strand" triggerStyle={iconButtonStyle('#EEF2FF', '#3730A3')}>
                      <CreateStrandForm subjects={subjects} initialSubjectId={subject.id} initialOrder={subjectStrands.length + 1} returnPath={returnPath} />
                    </ModalLauncher>
                    <Link href={`/content/lessons/new?subjectId=${subject.id}&from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#ede9fe', color: '#5b21b6', textDecoration: 'none' }}>
                      Open lesson studio for {subject.name} →
                    </Link>
                    {subjectAssignments.length ? (
                      <Link href={`/assignments?q=${encodeURIComponent(subject.name)}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#FFF7ED', color: '#9A3412', textDecoration: 'none' }}>
                        See learner delivery impact →
                      </Link>
                    ) : null}
                  </div>
                  {subjectStrands.length > 0 ? subjectStrands.map((strand) => {
                    const strandModules = subjectModules.filter((module) => module.strandName === strand.name);
                    const strandCollapsed = Boolean(collapsedStrands[strand.id]);

                    return (
                      <div key={strand.id} style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', display: 'grid', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
                                background: strandCollapsed ? 'white' : '#eef2ff',
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
                              <div style={{ color: '#64748b', fontSize: 13 }}>{strandModules.length} module{strandModules.length === 1 ? '' : 's'} in this planning lane</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <Pill label={strandCollapsed ? 'Hidden' : 'Visible'} tone={strandCollapsed ? '#E2E8F0' : '#ECFDF5'} text={strandCollapsed ? '#334155' : '#166534'} />
                            <ModalLauncher buttonLabel="＋ Module" title={`Create module in ${strand.name}`} description="Create a real module directly from this strand lane so the canvas writes back into the live curriculum spine." eyebrow="Create module" triggerStyle={iconButtonStyle('#EEF2FF', '#3730A3')}>
                              <CreateModuleForm strands={strands} initialStrandId={strand.id} initialTitle={`${strand.name} Module`} initialOrder={strandModules.length + 1} returnPath={returnPath} />
                            </ModalLauncher>
                            <ModalLauncher buttonLabel="✏️" title={`Edit strand · ${strand.name}`} description="Rename or reorder this strand without turning strand lifecycle into another operator chore." eyebrow="Edit strand" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                              <UpdateStrandForm strand={strand} subjects={subjects} embedded returnPath={returnPath} />
                            </ModalLauncher>
                            <ModalLauncher buttonLabel="🗑" title={`Delete strand · ${strand.name}`} description="Remove this strand and everything nested under it if it no longer belongs in the curriculum map." eyebrow="Delete strand" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                              <DeleteStrandForm strand={strand} embedded returnPath={returnPath} />
                            </ModalLauncher>
                          </div>
                        </div>

                        <div id={`strand-panel-${strand.id}`} hidden={strandCollapsed} style={{ display: strandCollapsed ? 'none' : 'grid', gap: 12 }}>
                          {strandModules.length > 0 ? strandModules.map((module) => {
                            const moduleLessons = filterLessonsForModule(subjectLessons, module);
                            const moduleAssessments = subjectAssessments.filter((assessment) => assessmentMatchesModule(module, assessment) && isLiveAssessmentGate(assessment));
                            const moduleAssignments = assignments.filter((assignment) => moduleLessons.some((lesson) => lesson.title === assignment.lessonTitle));
                            const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
                            const pill = statusPill(module.status);
                            const releaseState = getModuleReleaseState({
                              module,
                              lessons: subjectLessons,
                              assessments: subjectAssessments,
                              subjects,
                            });
                            const moduleSubjectId = resolveModuleSubjectId(module, subjects);
                            const canLaunchLessonStudio = Boolean(moduleSubjectId && subjects.some((subject) => subject.id === moduleSubjectId));

                            return (
                              <div key={module.id} style={{ padding: 18, borderRadius: 20, border: '1px solid #e5e7eb', background: 'white', display: 'grid', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                  <div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{module.title}</div>
                                    <div style={{ color: '#64748b' }}>{module.level} • {module.lessonCount} planned lessons • {readyLessonCount} ready now • {moduleAssignments.length} live assignment{moduleAssignments.length === 1 ? '' : 's'}</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <Pill label={module.status} tone={pill.tone} text={pill.text} />
                                    {lifecycleOptions.map((option) => {
                                      const blockers = option.value === 'published'
                                        ? releaseState.publishBlockers
                                        : option.value === 'review'
                                          ? releaseState.reviewBlockers
                                          : [];
                                      const isDisabled = option.value === 'published'
                                        ? !releaseState.canPublish
                                        : option.value === 'review'
                                          ? !releaseState.canReview
                                          : false;
                                      const isActive = module.status === option.value;

                                      return (
                                        <form key={`${module.id}-${option.value}`} action={quickUpdateCanvasModuleAction}>
                                          <input type="hidden" name="moduleId" value={module.id} />
                                          <input type="hidden" name="returnPath" value={returnPath} />
                                          <input type="hidden" name="title" value={module.title} />
                                          <input type="hidden" name="level" value={module.level} />
                                          <input type="hidden" name="lessonCount" value={String(module.lessonCount)} />
                                          <input type="hidden" name="status" value={option.value} />
                                          <button
                                            type="submit"
                                            disabled={isDisabled}
                                            title={isDisabled ? blockers.join(' ') : undefined}
                                            style={{
                                              ...actionButtonStyle,
                                              background: isActive ? option.activeBackground : option.idleBackground,
                                              color: option.color,
                                              border: `1px solid ${option.border}`,
                                              opacity: isDisabled ? 0.55 : 1,
                                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            }}
                                          >
                                            {option.label}
                                          </button>
                                        </form>
                                      );
                                    })}
                                    {canLaunchLessonStudio ? (
                                      <>
                                        <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(moduleSubjectId)}&moduleId=${encodeURIComponent(module.id)}&from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
                                          Open lesson studio →
                                        </Link>
                                        <ModalLauncher buttonLabel="＋ Lesson" title={`Create lesson in ${module.title}`} description="Create a lesson shell from the module card, then hand off immediately into the full lesson studio flow." eyebrow="Create lesson" triggerStyle={iconButtonStyle('#ede9fe', '#5b21b6')}>
                                          <div style={{ display: 'grid', gap: 12 }}>
                                            <div style={{ color: '#64748b', lineHeight: 1.6 }}>For the real payload, use the full lesson studio. This shortcut only creates the lesson record in the correct curriculum lane.</div>
                                            <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(moduleSubjectId)}&moduleId=${encodeURIComponent(module.id)}&from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none', textAlign: 'center' }}>
                                              Open full lesson studio
                                            </Link>
                                          </div>
                                        </ModalLauncher>
                                      </>
                                    ) : (
                                      <div style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' }}>
                                        Recover subject context first
                                      </div>
                                    )}
                                    <ModalLauncher buttonLabel="✏️ Edit module" title={`Edit module lifecycle · ${module.title}`} description="Update module metadata and lifecycle state from the same content lane." eyebrow="Edit module" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                                      <UpdateModuleForm modules={[module]} returnPath={returnPath} />
                                    </ModalLauncher>
                                    <ModalLauncher buttonLabel="🗑 Delete module" title={`Delete module · ${module.title}`} description="Remove this module and its linked content if it should no longer exist." eyebrow="Delete module" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                                      <DeleteModuleForm modules={[module]} returnPath={returnPath} />
                                    </ModalLauncher>
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                                  <LessonReorderLane
                                    module={module}
                                    lessons={moduleLessons}
                                    assignments={assignments}
                                    returnPath={returnPath}
                                  />

                                  <div style={{ display: 'grid', gap: 10 }}>
                                    <div style={{ padding: 14, borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1d4ed8', marginBottom: 8 }}>Assessment gate</div>
                                      {moduleAssessments.length > 0 ? moduleAssessments.map((assessment) => {
                                        const assessmentPill = statusPill(assessment.status);
                                        return (
                                          <div key={assessment.id} style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                                            <div>
                                              <div style={{ fontWeight: 700 }}>{assessment.title}</div>
                                              <div style={{ color: '#475569' }}>{assessment.triggerLabel} • {assessment.kind}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                              <Pill label={assessment.status} tone={assessmentPill.tone} text={assessmentPill.text} />
                                              <ModalLauncher buttonLabel="✏️" title={`Edit assessment · ${assessment.title}`} description="Update this progression gate from inside the module lane." eyebrow="Edit assessment" triggerStyle={iconButtonStyle('#e6fffb', '#0f766e')}>
                                                <UpdateAssessmentForm assessments={[assessment]} returnPath={returnPath} />
                                              </ModalLauncher>
                                              <ModalLauncher buttonLabel="🗑" title={`Delete assessment · ${assessment.title}`} description="Remove this assessment gate if it should no longer control progression." eyebrow="Delete assessment" triggerStyle={iconButtonStyle('#fee2e2', '#b91c1c')}>
                                                <DeleteAssessmentForm assessments={[assessment]} returnPath={returnPath} />
                                              </ModalLauncher>
                                            </div>
                                          </div>
                                        );
                                      }) : (
                                        <div style={{ display: 'grid', gap: 10 }}>
                                          <div style={{ color: '#64748b' }}>No assessment linked yet.</div>
                                          <ModalLauncher buttonLabel="Create gate" title={`Create assessment gate · ${module.title}`} description="Attach the missing progression gate without leaving this strand." eyebrow="Create assessment" triggerStyle={iconButtonStyle('#ede9fe', '#5b21b6')}>
                                            <CreateAssessmentForm modules={[module]} subjects={subjects} returnPath={returnPath} />
                                          </ModalLauncher>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ padding: 14, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', marginBottom: 8 }}>Release note</div>
                                      <div style={{ color: '#334155', lineHeight: 1.6 }}>
                                        {module.status === 'published'
                                          ? 'Live in the deployment-ready lane for learner pods.'
                                          : module.status === 'review'
                                            ? 'Almost there — content is organised, but still needs ops sign-off.'
                                            : 'This lane exists, but it still needs authoring or approval.'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }) : <div style={{ color: '#64748b', lineHeight: 1.5 }}>No modules yet.</div>}
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
