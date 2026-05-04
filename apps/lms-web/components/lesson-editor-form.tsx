'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';
import { LessonActivityStructuredBuilders } from './lesson-activity-structured-builders';
import { LessonAssetLibraryPanel } from './lesson-asset-library-panel';
import { LessonStepPreviewCard } from './lesson-step-preview-card';
import { buildActivityDraftsFromLesson, buildActivityStepsFromDrafts, countNonEmptyLines, getDraftAssetIntentSummary, type LessonActivityDraft } from './lesson-authoring-shared';
import { findModuleForLesson } from '../lib/module-lesson-match';
import { filterModulesForSubject, findSubjectByContext } from '../lib/module-subject-match';
import { getStepRuntimePreviewHints } from '../lib/lesson-runtime-preview';
import {
  getLessonStepTypeGuidance,
  getLessonStepTypeWarnings,
  getLessonTypeGuide,
  lessonStepTypeAccentMap,
  lessonStepTypeLabelMap,
} from './lesson-step-authoring';
import type { CurriculumModule, Lesson, LessonAsset, Subject } from '../lib/types';

const cardStyle = {
  background: 'white',
  borderRadius: 20,
  padding: 24,
  display: 'grid',
  gap: 16,
  border: '1px solid #eef2f7',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
} as const;

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
  minWidth: 0,
} as const;

const buttonStyle = {
  background: '#4F46E5',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

const ghostButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  border: '1px solid #dbe3f0',
  background: 'white',
  color: '#334155',
  cursor: 'pointer',
} as const;

const autoFitTwoUp = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
} as const;

const wideStack = {
  display: 'grid',
  gap: 18,
} as const;

const autoFitFields = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
} as const;

const autoFitCompactFields = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14, minWidth: 0 }}>{children}</label>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>{children}</div>;
}

function renderLessonTypeBadge(type: string) {
  const accent = lessonStepTypeAccentMap[type] ?? { tint: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
  return (
    <span key={type} style={{ padding: '7px 11px', borderRadius: 999, background: accent.tint, border: `1px solid ${accent.border}`, color: accent.text, fontWeight: 800, fontSize: 12 }}>
      {lessonStepTypeLabelMap[type] ?? type}
    </span>
  );
}

function safeStringify(value: unknown) {
  return JSON.stringify(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function makeActivityDraft(index: number, overrides: Partial<ReturnType<typeof makeActivityDraftBase>> = {}) {
  return makeActivityDraftBase(index, overrides);
}

function makeActivityDraftBase(index: number, overrides: Partial<{
  id: string;
  title: string;
  prompt: string;
  type: string;
  durationMinutes: string;
  detail: string;
  evidence: string;
  expectedAnswers: string;
  tags: string;
  facilitatorNotes: string;
  choiceLines: string;
  mediaLines: string;
}> = {}) {
  return {
    id: overrides.id ?? `activity-${index + 1}`,
    title: `Activity ${index + 1}`,
    prompt: `Activity ${index + 1}`,
    type: 'speak_answer',
    durationMinutes: '2',
    detail: '',
    evidence: '',
    expectedAnswers: '',
    tags: '',
    facilitatorNotes: '',
    choiceLines: '',
    mediaLines: '',
    ...overrides,
  };
}

type ActivityDraft = LessonActivityDraft;

function nextActivityDraftId(current: Array<ActivityDraft>) {
  const highestIndex = current.reduce((max, item) => {
    const match = item.id.match(/^activity-(\d+)$/);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);

  return `activity-${highestIndex + 1}`;
}


function starterTemplates(mode: string) {
  const normalizedMode = mode || 'guided';
  if (normalizedMode === 'practice') {
    return [
      makeActivityDraft(0, { title: 'Warm-up recall', prompt: 'Recall the last lesson aloud before independent practice begins.', type: 'listen_repeat', durationMinutes: '3', detail: 'Short recall to reactivate vocabulary and confidence.', evidence: 'learner-recall', tags: 'warm-up, recall' }),
      makeActivityDraft(1, { title: 'Independent practice', prompt: 'Complete the main practice task and narrate your thinking.', type: 'word_build', durationMinutes: '8', detail: 'Learners work through a focused task with minimal prompts.', evidence: 'practice-output', tags: 'independent, practice' }),
      makeActivityDraft(2, { title: 'Review and correct', prompt: 'Check answers, explain one correction, and repeat the target language.', type: 'oral_quiz', durationMinutes: '4', detail: 'Close with self-correction and teacher feedback.', evidence: 'reflection', tags: 'review, correction' }),
    ];
  }

  if (normalizedMode === 'group') {
    return [
      makeActivityDraft(0, { title: 'Whole-group hook', prompt: 'Open with a shared prompt the whole pod can answer together.', type: 'listen_answer', durationMinutes: '3', detail: 'Anchor the room with one shared entry question.', evidence: 'choral-response', tags: 'group, opener' }),
      makeActivityDraft(1, { title: 'Pair or circle practice', prompt: 'Learners practise with a partner or in a response circle.', type: 'speak_answer', durationMinutes: '7', detail: 'Use call-and-response or pair turns to reinforce the target concept.', evidence: 'peer-practice', tags: 'group, collaboration' }),
      makeActivityDraft(2, { title: 'Shared check-out', prompt: 'Invite selected learners to demonstrate and explain.', type: 'oral_quiz', durationMinutes: '4', detail: 'Finish with a visible check that the room actually got it.', evidence: 'group-check', tags: 'closure, demonstration' }),
    ];
  }

  if (normalizedMode === 'independent') {
    return [
      makeActivityDraft(0, { title: 'Brief instruction', prompt: 'Explain the task and success criteria before learners work alone.', type: 'listen_answer', durationMinutes: '2', detail: 'Keep the setup crisp so the independent block stays clean.', evidence: 'task-briefing', tags: 'setup' }),
      makeActivityDraft(1, { title: 'Independent build', prompt: 'Learners complete the core task individually.', type: 'word_build', durationMinutes: '8', detail: 'Main individual work block with light facilitator monitoring.', evidence: 'independent-output', tags: 'independent, core' }),
      makeActivityDraft(2, { title: 'Reflection share', prompt: 'Learners explain one answer or strategy they used.', type: 'speak_answer', durationMinutes: '3', detail: 'Close with verbal reflection so the evidence is not hidden in silence.', evidence: 'reflection-share', tags: 'reflection' }),
    ];
  }

  return [
    makeActivityDraft(0, { title: 'Hook', prompt: 'Introduce the target idea with a concrete prompt or cue.', type: 'listen_repeat', durationMinutes: '2', detail: 'Get attention fast and model the key language.', evidence: 'engagement-check', tags: 'hook' }),
    makeActivityDraft(1, { title: 'Guided practice', prompt: 'Lead learners through the main task with scaffolded support.', type: 'speak_answer', durationMinutes: '6', detail: 'Use guided prompts so learners practise the target skill with support.', evidence: 'guided-practice', tags: 'guided, core' }),
    makeActivityDraft(2, { title: 'Check for understanding', prompt: 'Ask learners to demonstrate the skill independently.', type: 'oral_quiz', durationMinutes: '4', detail: 'Close with an evidence-producing check rather than vibes.', evidence: 'understanding-check', tags: 'assessment, close' }),
  ];
}

export function LessonEditorForm({
  lesson,
  subjects,
  modules,
  action,
  returnPath = '/content',
  assets,
}: {
  lesson: Lesson;
  subjects: Subject[];
  modules: CurriculumModule[];
  assets: LessonAsset[];
  action: (formData: FormData) => void;
  returnPath?: string;
}) {
  const initialSubject = findSubjectByContext(subjects, {
    subjectId: lesson.subjectId,
    subjectName: lesson.subjectName,
  }) ?? subjects[0] ?? null;
  const [subjectId, setSubjectId] = useState(initialSubject?.id ?? '');
  const [moduleId, setModuleId] = useState(lesson.moduleId ?? findModuleForLesson(modules, lesson)?.id ?? modules[0]?.id ?? '');
  const [title, setTitle] = useState(lesson.title);
  const [durationMinutes, setDurationMinutes] = useState(String(lesson.durationMinutes));
  const [mode, setMode] = useState(lesson.mode);
  const [status, setStatus] = useState(lesson.status);
  const [targetAgeRange, setTargetAgeRange] = useState(lesson.targetAgeRange ?? '');
  const [voicePersona, setVoicePersona] = useState(lesson.voicePersona ?? '');
  const [learningObjectivesText, setLearningObjectivesText] = useState(asArray<string>(lesson.learningObjectives).join('\n'));
  const [supportLanguage, setSupportLanguage] = useState(String(lesson.localization?.supportLanguage ?? 'ha'));
  const [supportLanguageLabel, setSupportLanguageLabel] = useState(String(lesson.localization?.supportLanguageLabel ?? 'Hausa'));
  const [localizationNotesText, setLocalizationNotesText] = useState(asArray<string>(lesson.localization?.notes).join('\n'));
  const [assessmentTitle, setAssessmentTitle] = useState(String(lesson.lessonAssessment?.title ?? ''));
  const [assessmentKind, setAssessmentKind] = useState(String(lesson.lessonAssessment?.kind ?? 'observational'));
  const [assessmentItemsText, setAssessmentItemsText] = useState(
    asArray<{ prompt?: string; evidence?: string }>(lesson.lessonAssessment?.items)
      .map((item) => `${item.prompt ?? ''}|${item.evidence ?? 'teacher-check'}`)
      .join('\n'),
  );
  const [activityDrafts, setActivityDrafts] = useState<ActivityDraft[]>(
    (() => {
      const drafts = buildActivityDraftsFromLesson(lesson);
      return drafts.length ? drafts : [makeActivityDraft(0)];
    })(),
  );
  const initialSnapshot = useMemo(() => JSON.stringify({
    subjectId: initialSubject?.id ?? '',
    moduleId: lesson.moduleId ?? findModuleForLesson(modules, lesson)?.id ?? modules[0]?.id ?? '',
    title: lesson.title,
    durationMinutes: String(lesson.durationMinutes),
    mode: lesson.mode,
    status: lesson.status,
    targetAgeRange: lesson.targetAgeRange ?? '',
    voicePersona: lesson.voicePersona ?? '',
    learningObjectivesText: asArray<string>(lesson.learningObjectives).join('\n'),
    supportLanguage: String(lesson.localization?.supportLanguage ?? 'ha'),
    supportLanguageLabel: String(lesson.localization?.supportLanguageLabel ?? 'Hausa'),
    localizationNotesText: asArray<string>(lesson.localization?.notes).join('\n'),
    assessmentTitle: String(lesson.lessonAssessment?.title ?? ''),
    assessmentKind: String(lesson.lessonAssessment?.kind ?? 'observational'),
    assessmentItemsText: asArray<{ prompt?: string; evidence?: string }>(lesson.lessonAssessment?.items).map((item) => `${item.prompt ?? ''}|${item.evidence ?? 'teacher-check'}`).join('\n'),
    activityDrafts: (() => {
      const drafts = buildActivityDraftsFromLesson(lesson);
      return drafts.length ? drafts : [makeActivityDraft(0)];
    })(),
  }), [initialSubject, lesson, modules]);

  const activeSubject = useMemo(
    () => findSubjectByContext(subjects, { subjectId }) ?? initialSubject ?? null,
    [initialSubject, subjectId, subjects],
  );
  const filteredModules = useMemo(() => {
    const scoped = filterModulesForSubject(modules, activeSubject);
    return scoped.length ? scoped : modules;
  }, [activeSubject, modules]);

  const activeModule = filteredModules.find((item) => item.id === moduleId) ?? filteredModules[0] ?? modules[0];
  const readinessCount = useMemo(() => {
    let count = 0;
    if (title.trim().length >= 8) count += 1;
    if ((Number(durationMinutes) || 0) >= 8) count += 1;
    if (activeModule?.status && activeModule.status !== 'draft') count += 1;
    if (assessmentTitle.trim()) count += 1;
    if (status === 'approved' || status === 'published') count += 1;
    return count;
  }, [title, durationMinutes, activeModule?.status, assessmentTitle, status]);

  const learningObjectives = useMemo(
    () => learningObjectivesText.split('\n').map((item) => item.trim()).filter(Boolean),
    [learningObjectivesText],
  );

  const localization = useMemo(
    () => ({
      locale: String(lesson.localization?.locale ?? 'en-NG'),
      supportLanguage,
      supportLanguageLabel,
      notes: localizationNotesText.split('\n').map((item) => item.trim()).filter(Boolean),
    }),
    [lesson.localization?.locale, supportLanguage, supportLanguageLabel, localizationNotesText],
  );

  const lessonAssessment = useMemo(
    () => ({
      ...(lesson.lessonAssessment && typeof lesson.lessonAssessment === 'object' ? lesson.lessonAssessment : {}),
      title: assessmentTitle,
      kind: assessmentKind,
      items: assessmentItemsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [prompt, evidence = 'teacher-check'] = line.split('|').map((part) => part.trim());
          return {
            id: `assessment-item-${index + 1}`,
            prompt,
            evidence,
          };
        }),
    }),
    [lesson.lessonAssessment, assessmentTitle, assessmentKind, assessmentItemsText],
  );

  const activitySteps = useMemo(() => buildActivityStepsFromDrafts(activityDrafts), [activityDrafts]);

  const visibleLessonTypes = useMemo(
    () => Array.from(new Set(activitySteps.map((step) => step.type).filter(Boolean))),
    [activitySteps],
  );
  const primaryLessonType = visibleLessonTypes[0] ?? 'speak_answer';
  const primaryLessonTypeGuide = getLessonStepTypeGuidance(primaryLessonType);
  const totalActivityMinutes = useMemo(
    () => activitySteps.reduce((sum, step) => sum + (step.durationMinutes || 0), 0),
    [activitySteps],
  );
  const durationGap = (Number(durationMinutes) || 0) - totalActivityMinutes;
  const assetRuntimeBlockers = useMemo(() => activitySteps.flatMap((step, index) => {
    const runtime = getStepRuntimePreviewHints(step, assets);
    return runtime.hints
      .filter((hint) => /asset registry|managed asset|archived media/i.test(hint))
      .map((hint) => `Step ${index + 1}: ${hint}`);
  }), [activitySteps, assets]);
  const readinessBlockers = useMemo(() => ([
    title.trim().length >= 8 ? null : 'Give the lesson a specific title with at least 8 characters.',
    (Number(durationMinutes) || 0) >= 8 ? null : 'Set a credible lesson duration of at least 8 minutes.',
    learningObjectives.length > 0 ? null : 'Add at least one learning objective so the lesson has an actual outcome.',
    lessonAssessment.items.length > 0 ? null : 'Add at least one assessment item so evidence exists beyond vibes.',
    activitySteps.length >= 3 ? null : 'Build at least 3 activity steps so the lesson has a real learner flow.',
    Math.abs(durationGap) <= 2 ? null : `Bring lesson timing closer to the activity spine (${Math.abs(durationGap)} min ${durationGap > 0 ? 'buffer' : 'overrun'} right now).`,
    !(activeModule?.status === 'draft' && (status === 'approved' || status === 'published')) ? null : 'This module is still draft, so approving or publishing the lesson is bullshit until the lane is release-safe.',
    ...assetRuntimeBlockers,
  ].filter(Boolean) as string[]), [title, durationMinutes, learningObjectives.length, lessonAssessment.items.length, activitySteps.length, durationGap, activeModule?.status, status, assetRuntimeBlockers]);
  const publishIntent = status === 'approved' || status === 'published';
  const blockSubmit = publishIntent && readinessBlockers.length > 0;
  const currentSnapshot = useMemo(() => JSON.stringify({
    subjectId,
    moduleId,
    title,
    durationMinutes,
    mode,
    status,
    targetAgeRange,
    voicePersona,
    learningObjectivesText,
    supportLanguage,
    supportLanguageLabel,
    localizationNotesText,
    assessmentTitle,
    assessmentKind,
    assessmentItemsText,
    activityDrafts,
  }), [subjectId, moduleId, title, durationMinutes, mode, status, targetAgeRange, voicePersona, learningObjectivesText, supportLanguage, supportLanguageLabel, localizationNotesText, assessmentTitle, assessmentKind, assessmentItemsText, activityDrafts]);
  const isDirty = currentSnapshot !== initialSnapshot;
  const { allowNextNavigation, confirmationDialog } = useUnsavedChangesGuard({ isDirty });

  useEffect(() => {
    if (findSubjectByContext(subjects, { subjectId })) return;
    const fallbackSubjectId = String(initialSubject?.id ?? subjects[0]?.id ?? '');
    if (fallbackSubjectId !== subjectId) {
      setSubjectId(fallbackSubjectId);
    }
  }, [initialSubject, subjectId, subjects]);

  useEffect(() => {
    const nextModuleId = filteredModules.some((module) => module.id === moduleId)
      ? moduleId
      : String(filteredModules[0]?.id ?? modules[0]?.id ?? '');
    if (nextModuleId !== moduleId) {
      setModuleId(nextModuleId);
    }
  }, [filteredModules, moduleId, modules]);
  const activityHealthTone = durationGap === 0
    ? { background: '#DCFCE7', color: '#166534', label: 'Runtime aligned' }
    : Math.abs(durationGap) <= 2
      ? { background: '#FEF3C7', color: '#92400E', label: durationGap > 0 ? 'Light buffer' : 'Slight overrun' }
      : { background: '#FEE2E2', color: '#991B1B', label: durationGap > 0 ? 'Too much dead air' : 'Overbooked lesson' };

  const updateActivity = (index: number, patch: Partial<ActivityDraft>) => {
    setActivityDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const moveActivity = (index: number, direction: -1 | 1) => {
    setActivityDrafts((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const duplicateActivity = (index: number) => {
    setActivityDrafts((current) => {
      const next = [...current];
      const source = current[index];
      next.splice(index + 1, 0, {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        title: `${source.title} copy`,
        prompt: `${source.prompt} copy`,
      });
      return next;
    });
  };

  const removeActivity = (index: number) => {
    setActivityDrafts((current) => (current.length === 1 ? [makeActivityDraft(0)] : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const addActivity = () => {
    setActivityDrafts((current) => [...current, makeActivityDraft(current.length, { id: nextActivityDraftId(current) })]);
  };

  const applyStarterTemplate = () => {
    setActivityDrafts(starterTemplates(mode).map((item, index) => ({ ...item, id: `activity-${index + 1}` })));
  };

  return (
    <>
      {confirmationDialog}
      <form action={action} style={cardStyle} onSubmitCapture={() => allowNextNavigation()}>
      <input type="hidden" name="lessonId" value={lesson.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="learningObjectives" value={safeStringify(learningObjectives)} />
      <input type="hidden" name="localization" value={safeStringify(localization)} />
      <input type="hidden" name="lessonAssessment" value={safeStringify(lessonAssessment)} />
      <input type="hidden" name="activitySteps" value={safeStringify(activitySteps)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>Edit lesson authoring pack</h2>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 8 }}>
            This edits the real payload: objectives, localization, assessment items, and activity steps. Now it also lets authors shape the flow instead of babysitting a dumb JSON blob.
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
          <div style={{ minWidth: 180, padding: 16, borderRadius: 18, background: readinessCount >= 5 ? '#DCFCE7' : readinessCount >= 3 ? '#FEF3C7' : '#FEE2E2', color: readinessCount >= 5 ? '#166534' : readinessCount >= 3 ? '#92400E' : '#991B1B', fontWeight: 800 }}>
            {readinessCount}/5 release checks
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Module: {activeModule?.status ?? 'unknown'}</div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 14, background: activityHealthTone.background, color: activityHealthTone.color, fontWeight: 700, fontSize: 13 }}>
            {activityHealthTone.label} {durationGap === 0 ? '• exact runtime match' : `• ${Math.abs(durationGap)} min ${durationGap > 0 ? 'unplanned buffer' : 'over target'}`}
          </div>
        </div>
      </div>

      <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Visible lesson-type signal</div>
            <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>
              Primary authoring pattern: {lessonStepTypeLabelMap[primaryLessonType] ?? primaryLessonType}
            </div>
            <div style={{ color: '#475569', lineHeight: 1.6, marginTop: 6 }}>{primaryLessonTypeGuide.summary}</div>
          </div>
          <div style={{ minWidth: 220, padding: 14, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Type coverage</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{visibleLessonTypes.length} lesson type{visibleLessonTypes.length === 1 ? '' : 's'} live in this flow</div>
            <div style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>Operators can now tell at a glance whether this lesson is a single-pattern drill or a mixed activity build.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {visibleLessonTypes.map((type) => renderLessonTypeBadge(type))}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {primaryLessonTypeGuide.checklist.slice(0, 3).map((item) => (
            <div key={item} style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>• {item}</div>
          ))}
        </div>
      </div>

      <div style={autoFitFields}>
        <FieldLabel>
          Subject
          <select value={subjectId} onChange={(event) => {
            const next = event.target.value;
            setSubjectId(next);
            const nextSubject = findSubjectByContext(subjects, { subjectId: next }) ?? null;
            const nextModules = filterModulesForSubject(modules, nextSubject);
            setModuleId(nextModules[0]?.id ?? modules[0]?.id ?? '');
          }} style={inputStyle}>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel>
          Module
          <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle}>
            {filteredModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel>
          Duration
          <input name="durationMinutes" type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Status
          <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
        </FieldLabel>
      </div>

      <div style={autoFitFields}>
        <FieldLabel>
          Lesson title
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Delivery mode
          <select name="mode" value={mode} onChange={(event) => setMode(event.target.value)} style={inputStyle}>
            <option value="guided">Guided</option>
            <option value="group">Group</option>
            <option value="independent">Independent</option>
            <option value="practice">Practice</option>
          </select>
        </FieldLabel>
        <FieldLabel>
          Target age
          <input name="targetAgeRange" value={targetAgeRange} onChange={(event) => setTargetAgeRange(event.target.value)} style={inputStyle} />
        </FieldLabel>
      </div>

      <FieldLabel>
        Voice persona
        <input name="voicePersona" value={voicePersona} onChange={(event) => setVoicePersona(event.target.value)} style={inputStyle} />
      </FieldLabel>

      <div style={autoFitTwoUp}>
        <FieldLabel>
          Learning objectives (one per line)
          <textarea value={learningObjectivesText} onChange={(event) => setLearningObjectivesText(event.target.value)} rows={6} style={{ ...inputStyle, minHeight: 164 }} />
        </FieldLabel>

        <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Live learner preview</div>
              <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>{title || 'Untitled lesson'}</div>
            </div>
            <div style={{ textAlign: 'right', color: '#475569', fontSize: 13 }}>
              <div>{activitySteps.length} steps</div>
              <div>{totalActivityMinutes} min activity spine</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#E0E7FF', color: '#3730A3', fontWeight: 700, fontSize: 12 }}>{mode}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: 12 }}>{targetAgeRange || 'Age band unset'}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4338CA', fontWeight: 700, fontSize: 12 }}>{voicePersona || 'Voice persona pending'}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#ECFEFF', color: '#155E75', fontWeight: 700, fontSize: 12 }}>English runtime: {localization.locale || 'en-NG'}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: supportLanguageLabel.trim() ? '#FFF7ED' : '#F8FAFC', color: supportLanguageLabel.trim() ? '#9A3412' : '#475569', fontWeight: 700, fontSize: 12 }}>{supportLanguageLabel.trim() ? `Support: ${supportLanguageLabel}` : 'Support language pending'}</span>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 8 }}>Objective snapshot</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
                {learningObjectives.length > 0 ? learningObjectives.map((objective) => <li key={objective}>{objective}</li>) : <li>Add at least one clear objective.</li>}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 8 }}>Learner flow</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {activitySteps.map((step, index) => (
                  <LessonStepPreviewCard key={step.id} step={step} index={index} showRuntimeHints assets={assets} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: blockSubmit ? '#FEF2F2' : '#F8FAFC', border: `1px solid ${blockSubmit ? '#FECACA' : '#E2E8F0'}`, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, color: blockSubmit ? '#991B1B' : '#0f172a' }}>Inline readiness blockers</div>
          <div style={{ color: blockSubmit ? '#991B1B' : '#475569', fontSize: 13, fontWeight: 700 }}>
            {publishIntent ? (blockSubmit ? 'Approval/publish is blocked' : 'Approval/publish is clear') : 'Draft save stays available'}
          </div>
        </div>
        <div style={{ color: '#64748b', lineHeight: 1.6 }}>
          The editor now flags the exact blockers inline before someone saves an approved or published lesson that still has obvious holes.
        </div>
        {learningObjectives.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 800, color: '#991B1B' }}>Lesson objective is missing</div>
            <div style={{ color: '#475569', lineHeight: 1.6 }}>
              Step type does not matter here — even image-choice lessons still need a lesson-level objective. Add it right here instead of hunting through the form.
            </div>
            <FieldLabel>
              Lesson learning objectives (one per line)
              <textarea value={learningObjectivesText} onChange={(event) => setLearningObjectivesText(event.target.value)} rows={4} style={{ ...inputStyle, minHeight: 116, background: '#fff' }} />
            </FieldLabel>
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 8 }}>
          {readinessBlockers.length ? readinessBlockers.map((blocker) => (
            <div key={blocker} style={{ padding: 12, borderRadius: 14, background: '#fff', border: `1px solid ${blockSubmit ? '#FECACA' : '#E2E8F0'}`, color: '#475569', lineHeight: 1.6 }}>
              {blocker}
            </div>
          )) : (
            <div style={{ padding: 12, borderRadius: 14, background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#166534', lineHeight: 1.6 }}>
              No visible blockers. This lesson pack is structurally ready for approval or publish.
            </div>
          )}
        </div>
      </div>

      <div style={wideStack}>
        <div style={{ ...autoFitTwoUp, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            <div style={{ padding: 18, borderRadius: 18, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1D4ED8', marginBottom: 10 }}>Localization</div>
              <div style={{ ...autoFitCompactFields, marginBottom: 12 }}>
                <FieldLabel>
                  Support language code
                  <input value={supportLanguage} onChange={(event) => setSupportLanguage(event.target.value)} style={inputStyle} />
                </FieldLabel>
                <FieldLabel>
                  Support language label
                  <input value={supportLanguageLabel} onChange={(event) => setSupportLanguageLabel(event.target.value)} style={inputStyle} />
                </FieldLabel>
              </div>
              <FieldLabel>
                Localization notes (one per line)
                <textarea value={localizationNotesText} onChange={(event) => setLocalizationNotesText(event.target.value)} rows={4} style={{ ...inputStyle, minHeight: 144 }} />
              </FieldLabel>
            </div>

            <div style={{ padding: 18, borderRadius: 18, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6D28D9', marginBottom: 10 }}>Assessment pack</div>
              <div style={{ ...autoFitCompactFields, marginBottom: 12 }}>
                <FieldLabel>
                  Assessment title
                  <input value={assessmentTitle} onChange={(event) => setAssessmentTitle(event.target.value)} style={inputStyle} />
                </FieldLabel>
                <FieldLabel>
                  Kind
                  <select value={assessmentKind} onChange={(event) => setAssessmentKind(event.target.value)} style={inputStyle}>
                    <option value="observational">Observational</option>
                    <option value="oral">Oral</option>
                    <option value="automatic">Automatic</option>
                  </select>
                </FieldLabel>
              </div>
              <FieldLabel>
                Assessment items (prompt|evidence per line)
                <textarea value={assessmentItemsText} onChange={(event) => setAssessmentItemsText(event.target.value)} rows={5} style={{ ...inputStyle, minHeight: 164 }} />
              </FieldLabel>
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 14, minWidth: 0, alignContent: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Activity spine</div>
                <div style={{ color: '#475569', marginTop: 4 }}>The step planner now gets a proper lane instead of being crammed beside metadata. Build the flow here, then tighten the supporting details around it.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                <span>{activitySteps.length} steps</span>
                <span>•</span>
                <span>{totalActivityMinutes} min mapped</span>
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', lineHeight: 1.7 }}>
              Put learner flow first: sequence, prompt, evidence, and support cues. Localization and assessment stay visible, but they no longer steal the main editing surface.
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800, color: '#3730A3' }}>Starter sequence</div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>If the current flow is junk or empty, drop in a sane {mode || 'guided'} template and edit from there instead of building step structure from scratch.</div>
              <button type="button" onClick={applyStarterTemplate} style={{ ...ghostButtonStyle, background: '#4F46E5', color: 'white', border: '1px solid #4F46E5' }}>
                Replace with {mode || 'guided'} starter flow
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: 20, borderRadius: 20, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Primary workspace · Activity spine</div>
              <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>Full-width sequence editor</div>
              <div style={{ color: '#475569', marginTop: 6 }}>Add, duplicate, reorder, and trim steps without wrecking the lesson payload. This is the main authoring surface now, not a sidebar casualty.</div>
            </div>
            <button type="button" onClick={addActivity} style={{ ...ghostButtonStyle, background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe', padding: '12px 14px' }}>+ Add step</button>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {activityDrafts.map((activity, index) => {
              const typeGuidance = getLessonStepTypeGuidance(activity.type);
              const typeGuide = getLessonTypeGuide(activity.type);
              const typeWarnings = getLessonStepTypeWarnings(activity);
              const accent = lessonStepTypeAccentMap[activity.type] ?? { tint: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
              const choiceCount = countNonEmptyLines(activity.choiceLines);
              const mediaCount = countNonEmptyLines(activity.mediaLines);
              const noteCount = countNonEmptyLines(activity.facilitatorNotes);
              const assetIntent = getDraftAssetIntentSummary(activity);

              const stepSurface = assetIntent.tone === 'good'
                ? { border: '1px solid #86EFAC', background: '#F0FDF4' }
                : assetIntent.tone === 'warn'
                  ? { border: '1px solid #FDBA74', background: '#FFFBEB' }
                  : { border: '1px solid #E5E7EB', background: 'white' };

              return (
                <div key={activity.id} style={{ padding: 18, borderRadius: 18, ...stepSurface, display: 'grid', gap: 14, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>Step {index + 1}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: accent.tint, border: `1px solid ${accent.border}`, color: accent.text, fontWeight: 800, fontSize: 12 }}>
                          {lessonStepTypeLabelMap[activity.type] ?? activity.type}
                        </span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{choiceCount} choices</span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{mediaCount} media cues</span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{noteCount} coach notes</span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: assetIntent.tone === 'warn' ? '#FFF7ED' : assetIntent.tone === 'good' ? '#ECFDF5' : '#F8FAFC', color: assetIntent.tone === 'warn' ? '#9A3412' : assetIntent.tone === 'good' ? '#166534' : '#475569', fontWeight: 700, fontSize: 12 }}>{assetIntent.label}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => moveActivity(index, -1)} disabled={index === 0} style={{ ...ghostButtonStyle, opacity: index === 0 ? 0.45 : 1 }}>↑ Move</button>
                      <button type="button" onClick={() => moveActivity(index, 1)} disabled={index === activityDrafts.length - 1} style={{ ...ghostButtonStyle, opacity: index === activityDrafts.length - 1 ? 0.45 : 1 }}>↓ Move</button>
                      <button type="button" onClick={() => duplicateActivity(index)} style={ghostButtonStyle}>Duplicate</button>
                      <button type="button" onClick={() => removeActivity(index)} style={{ ...ghostButtonStyle, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Remove</button>
                    </div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 16, background: accent.tint, border: `1px solid ${accent.border}`, display: 'grid', gap: 10 }}>
                    <SectionLabel>{lessonStepTypeLabelMap[activity.type] ?? activity.type} authoring guidance</SectionLabel>
                    <div style={{ color: '#334155', lineHeight: 1.6 }}>{typeGuidance.summary}</div>
                    {typeGuidance.learnerTemplate ? (
                      <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 12, background: '#fff', border: `1px solid ${accent.border}` }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding: '5px 9px', borderRadius: 999, background: accent.tint, color: accent.text, fontWeight: 800, fontSize: 12 }}>{typeGuidance.learnerTemplate.label}</span>
                          <span style={{ padding: '5px 9px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{typeGuidance.learnerTemplate.structure}</span>
                        </div>
                        <div style={{ color: '#475569', lineHeight: 1.6 }}>{typeGuidance.learnerTemplate.operatorTip}</div>
                      </div>
                    ) : null}
                    <div style={{ display: 'grid', gap: 6 }}>
                      {typeGuidance.checklist.map((item) => (
                        <div key={item} style={{ color: accent.text, fontWeight: 700, fontSize: 13 }}>• {item}</div>
                      ))}
                    </div>
                    {typeWarnings.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8, marginTop: 2 }}>
                        {typeWarnings.map((warning) => (
                          <div key={warning} style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #FECACA', color: '#991B1B', lineHeight: 1.5 }}>
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #BBF7D0', color: '#166534', lineHeight: 1.5 }}>
                        Type-specific signals look sane for this step.
                      </div>
                    )}
                  </div>

                  <div style={{ ...autoFitCompactFields, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
                    <FieldLabel>
                      Step title
                      <input value={activity.title} onChange={(event) => updateActivity(index, { title: event.target.value })} style={inputStyle} />
                    </FieldLabel>
                    <FieldLabel>
                      Type
                      <select value={activity.type} onChange={(event) => updateActivity(index, { type: event.target.value })} style={inputStyle}>
                        <option value="listen_repeat">Listen repeat</option>
                        <option value="speak_answer">Speak answer</option>
                        <option value="word_build">Word build</option>
                        <option value="image_choice">Image choice</option>
                        <option value="oral_quiz">Oral quiz</option>
                        <option value="listen_answer">Listen answer</option>
                        <option value="tap_choice">Tap choice</option>
                        <option value="drag_to_match">Drag to match</option>
                        <option value="letter_intro">Letter intro</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel>
                      Minutes
                      <input value={activity.durationMinutes} onChange={(event) => updateActivity(index, { durationMinutes: event.target.value })} style={inputStyle} />
                    </FieldLabel>
                  </div>

                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
                    <FieldLabel>
                      {typeGuide.promptLabel}
                      <textarea value={activity.prompt} onChange={(event) => updateActivity(index, { prompt: event.target.value })} rows={3} style={{ ...inputStyle, minHeight: 110 }} />
                      <FieldHint>{typeGuide.promptHint}</FieldHint>
                    </FieldLabel>
                    <FieldLabel>
                      {typeGuide.detailLabel}
                      <textarea value={activity.detail} onChange={(event) => updateActivity(index, { detail: event.target.value })} rows={4} style={{ ...inputStyle, minHeight: 132 }} />
                      <FieldHint>{typeGuide.detailHint}</FieldHint>
                    </FieldLabel>
                  </div>

                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
                    <FieldLabel>
                      {typeGuide.evidenceLabel}
                      <input value={activity.evidence} onChange={(event) => updateActivity(index, { evidence: event.target.value })} style={inputStyle} />
                      <FieldHint>{typeGuide.evidenceHint}</FieldHint>
                    </FieldLabel>
                    <FieldLabel>
                      {typeGuide.expectedAnswersLabel}
                      <input value={activity.expectedAnswers} onChange={(event) => updateActivity(index, { expectedAnswers: event.target.value })} style={inputStyle} />
                      <FieldHint>{typeGuide.expectedAnswersHint}</FieldHint>
                    </FieldLabel>
                  </div>

                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
                    <FieldLabel>
                      Tags (comma separated)
                      <input value={activity.tags} onChange={(event) => updateActivity(index, { tags: event.target.value })} style={inputStyle} />
                      <FieldHint>{typeGuide.tagsHint}</FieldHint>
                    </FieldLabel>
                    <FieldLabel>
                      {typeGuide.facilitatorLabel}
                      <textarea value={activity.facilitatorNotes} onChange={(event) => updateActivity(index, { facilitatorNotes: event.target.value })} rows={3} style={{ ...inputStyle, minHeight: 104 }} />
                      <FieldHint>{typeGuide.facilitatorHint}</FieldHint>
                    </FieldLabel>
                  </div>

                  <div style={{ padding: 12, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', lineHeight: 1.6, fontSize: 13 }}>
                    Asset entries are references, not uploads. Paste the final URL, storage path, or stable asset key you expect runtime to resolve.
                  </div>

                  <LessonAssetLibraryPanel
                    stepType={activity.type}
                    mediaLines={activity.mediaLines}
                    choiceLines={activity.choiceLines}
                    activitySteps={activitySteps}
                    assets={assets}
                    subjectId={subjectId}
                    subjectName={activeSubject?.name}
                    moduleId={moduleId}
                    moduleTitle={activeModule?.title}
                    lessonId={lesson.id}
                    onMediaLinesChange={(value) => updateActivity(index, { mediaLines: value })}
                    onChoiceLinesChange={(value) => updateActivity(index, { choiceLines: value })}
                  />

                  <LessonActivityStructuredBuilders
                    type={activity.type}
                    choiceLines={activity.choiceLines}
                    mediaLines={activity.mediaLines}
                    assets={assets}
                    subjectId={subjectId}
                    subjectName={activeSubject?.name}
                    moduleId={moduleId}
                    moduleTitle={activeModule?.title}
                    lessonId={lesson.id}
                    onChoiceLinesChange={(value) => updateActivity(index, { choiceLines: value })}
                    onMediaLinesChange={(value) => updateActivity(index, { mediaLines: value })}
                    inputStyle={inputStyle}
                    ghostButtonStyle={ghostButtonStyle}
                    sectionLabel={<SectionLabel>{activity.type === 'word_build' ? 'Build pieces / options' : activity.type === 'listen_repeat' ? 'Listen support' : activity.type === 'speak_answer' ? 'Speaking support' : activity.type === 'letter_intro' ? 'Letter support' : 'Choice setup'}</SectionLabel>}
                    fieldHint={(children) => <FieldHint>{children}</FieldHint>}
                    fieldLabel={(children) => <FieldLabel>{children}</FieldLabel>}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ActionButton label={blockSubmit ? 'Fix blockers before approval/publish' : 'Save full lesson pack'} pendingLabel="Saving lesson pack…" style={buttonStyle} disabled={blockSubmit} />
      </form>
    </>
  );
}
