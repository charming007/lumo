'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';
import { LessonActivityStructuredBuilders } from './lesson-activity-structured-builders';
import { LessonStepPreviewCard } from './lesson-step-preview-card';
import { LessonAssetLibraryPanel } from './lesson-asset-library-panel';
import { buildActivityDraftsFromLesson, buildActivityStepsFromDrafts, countNonEmptyLines, getDraftAssetIntentSummary, type LessonActivityDraft } from './lesson-authoring-shared';
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
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}


function safeStringify(value: unknown) {
  return JSON.stringify(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function makeActivityDraft(index: number, overrides: Partial<ActivityDraft> = {}): ActivityDraft {
  return {
    id: overrides.id ?? `activity-${index + 1}`,
    title: `Activity ${index + 1}`,
    prompt: `Activity ${index + 1}`,
    type: 'speak_answer',
    durationMinutes: '2',
    detail: '',
    evidence: '',
    targetText: '',
    supportText: '',
    expectedAnswers: '',
    tags: '',
    facilitatorNotes: '',
    choiceLines: '',
    mediaLines: '',
    ...overrides,
  };
}

function nextActivityDraftId(current: ActivityDraft[]) {
  const highestIndex = current.reduce((max, item) => {
    const match = item.id.match(/^activity-(\d+)$/);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);

  return `activity-${highestIndex + 1}`;
}

type ActivityDraft = LessonActivityDraft;

type LessonTemplate = {
  id: string;
  label: string;
  title: string;
  mode: string;
  targetAgeRange: string;
  voicePersona: string;
  objectives: string[];
  assessmentTitle: string;
  assessmentKind: string;
  assessmentItemsText: string;
  supportLanguage: string;
  supportLanguageLabel: string;
  localizationNotesText: string;
  activities: ActivityDraft[];
};

const lessonTemplates: LessonTemplate[] = [
  {
    id: 'conversation',
    label: 'Conversation warm-up',
    title: 'Talk about people who help us',
    mode: 'guided',
    targetAgeRange: '7-10',
    voicePersona: 'friendly-guide-a',
    objectives: ['Name familiar helpers in the community.', 'Say one complete sentence about what each helper does.'],
    assessmentTitle: 'Community helpers quick check',
    assessmentKind: 'oral',
    assessmentItemsText: 'Can the learner name one helper correctly?|spoken-response\nCan the learner say what that helper does?|teacher-check',
    supportLanguage: 'ha',
    supportLanguageLabel: 'Hausa',
    localizationNotesText: 'Use local community examples before abstract ones.\nKeep prompts short and repeatable.',
    activities: [
      makeActivityDraft(0, { title: 'Coach model', prompt: 'Listen: This is a nurse. A nurse helps sick people.', type: 'listen_repeat', durationMinutes: '2', detail: 'Model one helper sentence with a clear speaking rhythm.', evidence: 'learner repeats target sentence', expectedAnswers: 'This is a nurse, A nurse helps sick people', tags: 'guided, speaking', facilitatorNotes: 'Point to a visual while modelling.' }),
      makeActivityDraft(1, { title: 'Picture talk', prompt: 'Who is this? What does this person do?', type: 'image_choice', durationMinutes: '3', detail: 'Show helper pictures and prompt for name plus action.', evidence: 'learner names helper and role', expectedAnswers: 'teacher, doctor, nurse, helps, teaches', tags: 'vocabulary, oral', facilitatorNotes: 'Accept supported answers first, then extend to a full sentence.' }),
      makeActivityDraft(2, { title: 'My sentence turn', prompt: 'Say one full sentence about a helper.', type: 'speak_answer', durationMinutes: '3', detail: 'Learner produces one complete supported sentence independently.', evidence: 'spoken full sentence', expectedAnswers: 'A teacher helps children learn', tags: 'sentence, speaking', facilitatorNotes: 'Use sentence frames only if needed.' }),
    ],
  },
  {
    id: 'phonics',
    label: 'Phonics / sound focus',
    title: 'Letter sound S and simple words',
    mode: 'guided',
    targetAgeRange: '6-9',
    voicePersona: 'phonic-coach-a',
    objectives: ['Recognize the target letter sound.', 'Match the sound to a familiar word or picture.'],
    assessmentTitle: 'Letter sound quick check',
    assessmentKind: 'observational',
    assessmentItemsText: 'Can the learner say the sound clearly?|spoken-response\nCan the learner identify a picture with the target sound?|teacher-check',
    supportLanguage: 'ha',
    supportLanguageLabel: 'Hausa',
    localizationNotesText: 'Use concrete objects learners know.\nKeep the contrast between correct and distractor sounds obvious.',
    activities: [
      makeActivityDraft(0, { title: 'Sound intro', prompt: 'This is the letter S. It says /s/.', type: 'letter_intro', durationMinutes: '2', detail: 'Introduce the letter shape and sound with repetition.', evidence: 'learner repeats /s/', expectedAnswers: 's, /s/', tags: 'phonics, intro', facilitatorNotes: 'Trace the letter in the air.' }),
      makeActivityDraft(1, { title: 'Sound hunt', prompt: 'Which picture starts with /s/?', type: 'image_choice', durationMinutes: '3', detail: 'Use three image options and ask the learner to pick the right one.', evidence: 'correct image choice', expectedAnswers: 'sun, soap, sock', tags: 'phonics, picture match', facilitatorNotes: 'Name all options slowly before learner answers.' }),
      makeActivityDraft(2, { title: 'Say and blend', prompt: 'Say the sound, then say the whole word.', type: 'word_build', durationMinutes: '3', detail: 'Move from isolated sound to a simple target word.', evidence: 'learner produces sound then word', expectedAnswers: 's, sun', tags: 'blend, speaking', facilitatorNotes: 'Use claps or finger taps to chunk the sounds.' }),
    ],
  },
  {
    id: 'comprehension',
    label: 'Listen and answer',
    title: 'Listen to a short story and answer',
    mode: 'group',
    targetAgeRange: '8-11',
    voicePersona: 'calm-guide-a',
    objectives: ['Listen for one key detail from a short story.', 'Answer a simple comprehension question in a full sentence.'],
    assessmentTitle: 'Story listening check',
    assessmentKind: 'oral',
    assessmentItemsText: 'Can the learner recall one key detail?|spoken-response\nCan the learner answer who/what/where from the story?|teacher-check',
    supportLanguage: 'ha',
    supportLanguageLabel: 'Hausa',
    localizationNotesText: 'Keep stories grounded in daily life.\nRepeat the story once before asking the final question.',
    activities: [
      makeActivityDraft(0, { title: 'Story listen', prompt: 'Listen carefully to the short story.', type: 'listen_answer', durationMinutes: '3', detail: 'Read a short story aloud once with clear pacing.', evidence: 'learner attention and recall', expectedAnswers: 'key detail from story', tags: 'listening, comprehension', facilitatorNotes: 'Pause briefly before the key detail.' }),
      makeActivityDraft(1, { title: 'Detail check', prompt: 'Who helped Amina in the story?', type: 'oral_quiz', durationMinutes: '2', detail: 'Ask one direct recall question tied to the story detail.', evidence: 'spoken answer', expectedAnswers: 'teacher, mother, friend', tags: 'recall, oral', facilitatorNotes: 'Allow one replay if needed.' }),
      makeActivityDraft(2, { title: 'Full sentence response', prompt: 'Answer in one full sentence.', type: 'speak_answer', durationMinutes: '3', detail: 'Push the learner from one-word recall into a full spoken sentence.', evidence: 'complete spoken sentence', expectedAnswers: 'Her teacher helped her', tags: 'sentence, comprehension', facilitatorNotes: 'Use a sentence frame only after the first attempt.' }),
    ],
  },
];


function buildDraftsFromLesson(lesson?: Lesson | null) {
  const drafts = buildActivityDraftsFromLesson(lesson);
  return drafts.length ? drafts.map((draft, index) => makeActivityDraft(index, draft)) : [makeActivityDraft(0)];
}

export function LessonCreateForm({
  subjects,
  modules,
  lessons,
  action,
  initialSubjectId,
  initialModuleId,
  duplicateLessonId,
  returnPath = '/content',
  assets,
}: {
  subjects: Subject[];
  modules: CurriculumModule[];
  lessons: Lesson[];
  assets: LessonAsset[];
  action: (formData: FormData) => void;
  initialSubjectId?: string;
  initialModuleId?: string;
  duplicateLessonId?: string;
  returnPath?: string;
}) {
  const duplicateLesson = lessons.find((item) => item.id === duplicateLessonId) ?? null;
  const duplicateSubject = duplicateLesson
    ? findSubjectByContext(subjects, {
      subjectId: duplicateLesson.subjectId,
      subjectName: duplicateLesson.subjectName,
    })
    : null;
  const initialSubject = findSubjectByContext(subjects, {
    subjectId: initialSubjectId,
  })
    ?? duplicateSubject
    ?? subjects[0]
    ?? null;
  const [subjectId, setSubjectId] = useState(String(initialSubject?.id ?? ''));
  const activeSubject = useMemo(
    () => findSubjectByContext(subjects, { subjectId }) ?? initialSubject ?? null,
    [initialSubject, subjectId, subjects],
  );
  const filteredModules = useMemo(() => filterModulesForSubject(modules, activeSubject), [activeSubject, modules]);
  const initialModule = initialModuleId ? modules.find((item) => item.id === initialModuleId) : null;
  const duplicateModule = duplicateLesson?.moduleId
    ? modules.find((item) => item.id === duplicateLesson.moduleId)
    : modules.find((item) => item.title === duplicateLesson?.moduleTitle);
  const fallbackModuleId = (initialModule && filteredModules.some((module) => module.id === initialModule.id) ? initialModule.id : undefined)
    ?? (duplicateModule && filteredModules.some((module) => module.id === duplicateModule.id) ? duplicateModule.id : undefined)
    ?? filteredModules[0]?.id
    ?? '';
  const [moduleId, setModuleId] = useState(String(fallbackModuleId));
  const [title, setTitle] = useState(duplicateLesson ? `${duplicateLesson.title} copy` : 'New lesson title');
  const [durationMinutes, setDurationMinutes] = useState(String(duplicateLesson?.durationMinutes ?? 8));
  const [mode, setMode] = useState(duplicateLesson?.mode ?? 'guided');
  const [status, setStatus] = useState('draft');
  const [targetAgeRange, setTargetAgeRange] = useState(String(duplicateLesson?.targetAgeRange ?? '7-10'));
  const [voicePersona, setVoicePersona] = useState(String(duplicateLesson?.voicePersona ?? 'friendly-guide-a'));
  const [learningObjectivesText, setLearningObjectivesText] = useState(asArray<string>(duplicateLesson?.learningObjectives).join('\n'));
  const [supportLanguage, setSupportLanguage] = useState(String((duplicateLesson?.localization as Record<string, unknown> | null)?.supportLanguage ?? 'ha'));
  const [supportLanguageLabel, setSupportLanguageLabel] = useState(String((duplicateLesson?.localization as Record<string, unknown> | null)?.supportLanguageLabel ?? 'Hausa'));
  const [defaultStepSupportText, setDefaultStepSupportText] = useState(String((duplicateLesson?.localization as Record<string, unknown> | null)?.defaultStepSupportText ?? ''));
  const [localizationNotesText, setLocalizationNotesText] = useState(asArray<string>((duplicateLesson?.localization as Record<string, unknown> | null)?.notes).join('\n'));
  const [assessmentTitle, setAssessmentTitle] = useState(String(duplicateLesson?.lessonAssessment?.title ?? ''));
  const [assessmentKind, setAssessmentKind] = useState(String(duplicateLesson?.lessonAssessment?.kind ?? 'observational'));
  const [assessmentItemsText, setAssessmentItemsText] = useState(asArray<{ prompt?: string; evidence?: string }>(duplicateLesson?.lessonAssessment?.items).map((item) => `${item.prompt ?? ''}|${item.evidence ?? 'teacher-check'}`).join('\n'));
  const [activityDrafts, setActivityDrafts] = useState(buildDraftsFromLesson(duplicateLesson));
  const baselineSnapshot = useMemo(() => JSON.stringify({
    subjectId: String(initialSubject?.id ?? ''),
    moduleId: String(fallbackModuleId),
    title: duplicateLesson ? `${duplicateLesson.title} copy` : 'New lesson title',
    durationMinutes: String(duplicateLesson?.durationMinutes ?? 8),
    mode: duplicateLesson?.mode ?? 'guided',
    status: 'draft',
    targetAgeRange: String(duplicateLesson?.targetAgeRange ?? '7-10'),
    voicePersona: String(duplicateLesson?.voicePersona ?? 'friendly-guide-a'),
    learningObjectivesText: asArray<string>(duplicateLesson?.learningObjectives).join('\n'),
    supportLanguage: String((duplicateLesson?.localization as Record<string, unknown> | null)?.supportLanguage ?? 'ha'),
    supportLanguageLabel: String((duplicateLesson?.localization as Record<string, unknown> | null)?.supportLanguageLabel ?? 'Hausa'),
    defaultStepSupportText: String((duplicateLesson?.localization as Record<string, unknown> | null)?.defaultStepSupportText ?? ''),
    localizationNotesText: asArray<string>((duplicateLesson?.localization as Record<string, unknown> | null)?.notes).join('\n'),
    assessmentTitle: String(duplicateLesson?.lessonAssessment?.title ?? ''),
    assessmentKind: String(duplicateLesson?.lessonAssessment?.kind ?? 'observational'),
    assessmentItemsText: asArray<{ prompt?: string; evidence?: string }>(duplicateLesson?.lessonAssessment?.items).map((item) => `${item.prompt ?? ''}|${item.evidence ?? 'teacher-check'}`).join('\n'),
    activityDrafts: buildDraftsFromLesson(duplicateLesson),
  }), [duplicateLesson, fallbackModuleId, initialSubject]);

  const activeModule = filteredModules.find((item) => item.id === moduleId) ?? filteredModules[0] ?? modules[0];
  const dependencyBlockers = useMemo(() => ([
    subjects.length > 0 ? null : 'Load subject data first so the lesson can be attached to a real curriculum lane.',
    modules.length > 0 ? null : 'Load module data first so Lesson Studio does not create a floating orphan lesson.',
    filteredModules.length > 0 ? null : 'The selected subject has no modules yet. Create or restore a module before authoring a lesson here.',
  ].filter(Boolean) as string[]), [subjects.length, modules.length, filteredModules.length]);

  const learningObjectives = useMemo(() => learningObjectivesText.split('\n').map((item) => item.trim()).filter(Boolean), [learningObjectivesText]);
  const localization = useMemo(() => ({ locale: 'en-NG', supportLanguage: 'ha', supportLanguageLabel: 'Hausa', targetLanguage: 'en', targetLanguageLabel: 'English', defaultStepSupportText: defaultStepSupportText.trim() || undefined, notes: localizationNotesText.split('\n').map((item) => item.trim()).filter(Boolean) }), [defaultStepSupportText, localizationNotesText]);
  const lessonAssessment = useMemo(() => ({
    ...(duplicateLesson?.lessonAssessment && typeof duplicateLesson.lessonAssessment === 'object' ? duplicateLesson.lessonAssessment : {}),
    title: assessmentTitle,
    kind: assessmentKind,
    items: assessmentItemsText.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [prompt, evidence = 'teacher-check'] = line.split('|').map((part) => part.trim());
      return { id: `assessment-item-${index + 1}`, prompt, evidence };
    }),
  }), [duplicateLesson?.lessonAssessment, assessmentTitle, assessmentKind, assessmentItemsText]);
  const activitySteps = useMemo(() => buildActivityStepsFromDrafts(activityDrafts), [activityDrafts]);
  const totalActivityMinutes = useMemo(() => activitySteps.reduce((sum, step) => sum + (step.durationMinutes || 0), 0), [activitySteps]);
  const durationGap = (Number(durationMinutes) || 0) - totalActivityMinutes;
  const typeReadinessWarnings = useMemo(() => activityDrafts.flatMap((activity, index) => getLessonStepTypeWarnings(activity).map((warning) => `Step ${index + 1}: ${warning}`)), [activityDrafts]);
  const assetRuntimeBlockers = useMemo(() => activitySteps.flatMap((step, index) => {
    const runtime = getStepRuntimePreviewHints(step, assets);
    return runtime.hints
      .filter((hint) => /asset registry|managed asset|archived media/i.test(hint))
      .map((hint) => `Step ${index + 1}: ${hint}`);
  }), [activitySteps, assets]);
  const readinessCount = useMemo(() => {
    let count = 0;
    if (title.trim().length >= 8) count += 1;
    if ((Number(durationMinutes) || 0) >= 8) count += 1;
    if (learningObjectives.length > 0) count += 1;
    if (lessonAssessment.items.length > 0) count += 1;
    if (activitySteps.length >= 3) count += 1;
    return count;
  }, [title, durationMinutes, learningObjectives.length, lessonAssessment.items.length, activitySteps.length]);
  const readinessBlockers = useMemo(() => ([
    title.trim().length >= 8 ? null : 'Give the lesson a specific title with at least 8 characters.',
    (Number(durationMinutes) || 0) >= 8 ? null : 'Set a credible lesson duration of at least 8 minutes.',
    learningObjectives.length > 0 ? null : 'Add at least one learning objective so the lesson has an actual outcome.',
    lessonAssessment.items.length > 0 ? null : 'Add at least one assessment item so evidence exists beyond vibes.',
    activitySteps.length >= 3 ? null : 'Build at least 3 activity steps so the lesson has a real learner flow.',
    Math.abs(durationGap) <= 2 ? null : `Bring lesson timing closer to the activity spine (${Math.abs(durationGap)} min ${durationGap > 0 ? 'buffer' : 'overrun'} right now).`,
    !(activeModule?.status === 'draft' && (status === 'approved' || status === 'published')) ? null : 'This module is still draft, so approving or publishing the lesson is bullshit until the lane is release-safe.',
    ...typeReadinessWarnings,
    ...assetRuntimeBlockers,
  ].filter(Boolean) as string[]), [title, durationMinutes, learningObjectives.length, lessonAssessment.items.length, activitySteps.length, durationGap, activeModule?.status, status, typeReadinessWarnings, assetRuntimeBlockers]);
  const publishIntent = status === 'approved' || status === 'published';
  const blockSubmit = dependencyBlockers.length > 0 || (publishIntent && readinessBlockers.length > 0);
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
    defaultStepSupportText,
    localizationNotesText,
    assessmentTitle,
    assessmentKind,
    assessmentItemsText,
    activityDrafts,
  }), [subjectId, moduleId, title, durationMinutes, mode, status, targetAgeRange, voicePersona, learningObjectivesText, supportLanguage, supportLanguageLabel, defaultStepSupportText, localizationNotesText, assessmentTitle, assessmentKind, assessmentItemsText, activityDrafts]);
  const isDirty = currentSnapshot !== baselineSnapshot;
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
      next.splice(index + 1, 0, { ...source, id: `${source.id}-copy-${Date.now()}`, title: `${source.title} copy`, prompt: `${source.prompt} copy` });
      return next;
    });
  };
  const removeActivity = (index: number) => {
    setActivityDrafts((current) => (current.length === 1 ? [makeActivityDraft(0)] : current.filter((_, itemIndex) => itemIndex !== index)));
  };
  const addActivity = () => setActivityDrafts((current) => [...current, makeActivityDraft(current.length, { id: nextActivityDraftId(current) })]);
  const applyTemplate = (template: LessonTemplate) => {
    setTitle(template.title);
    setMode(template.mode);
    setTargetAgeRange(template.targetAgeRange);
    setVoicePersona(template.voicePersona);
    setLearningObjectivesText(template.objectives.join('\n'));
    setAssessmentTitle(template.assessmentTitle);
    setAssessmentKind(template.assessmentKind);
    setAssessmentItemsText(template.assessmentItemsText);
    setSupportLanguage(template.supportLanguage);
    setSupportLanguageLabel(template.supportLanguageLabel);
    setDefaultStepSupportText('');
    setLocalizationNotesText(template.localizationNotesText);
    setActivityDrafts(template.activities.map((activity, index) => makeActivityDraft(index, activity)));
    setDurationMinutes(String(template.activities.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0) || 8));
  };

  return (
    <>
      {confirmationDialog}
      <form action={action} style={cardStyle} onSubmitCapture={() => allowNextNavigation()}>
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="openEditorAfterCreate" value="1" />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="learningObjectives" value={safeStringify(learningObjectives)} />
      <input type="hidden" name="localization" value={safeStringify(localization)} />
      <input type="hidden" name="lessonAssessment" value={safeStringify(lessonAssessment)} />
      <input type="hidden" name="activitySteps" value={safeStringify(activitySteps)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>Create lesson authoring pack</h2>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 8 }}>
            Full-screen lesson creation, finally. Pick a module, start from a usable template or duplicate an existing lesson, then shape the actual learner flow before the record exists.
          </div>
        </div>
        <div style={{ minWidth: 220, padding: 16, borderRadius: 18, background: readinessCount >= 5 ? '#DCFCE7' : readinessCount >= 3 ? '#FEF3C7' : '#FEE2E2', color: readinessCount >= 5 ? '#166534' : readinessCount >= 3 ? '#92400E' : '#991B1B', fontWeight: 800 }}>
          {readinessCount}/5 authoring checks
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>{totalActivityMinutes} min in activity spine • module {activeModule?.status ?? 'unknown'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b' }}>Quick starts</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {lessonTemplates.map((template) => (
            <button key={template.id} type="button" onClick={() => applyTemplate(template)} style={ghostButtonStyle}>{template.label}</button>
          ))}
          {duplicateLesson ? <div style={{ padding: '10px 12px', borderRadius: 12, background: '#EEF2FF', color: '#3730A3', fontWeight: 700 }}>Duplicating: {duplicateLesson.title}</div> : null}
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
          <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle} disabled={!filteredModules.length}>
            {filteredModules.length ? filteredModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>) : <option value="">No modules available for this subject</option>}
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
        <FieldLabel>
          Voice persona
          <input name="voicePersona" value={voicePersona} onChange={(event) => setVoicePersona(event.target.value)} style={inputStyle} />
        </FieldLabel>
      </div>

      <div style={autoFitTwoUp}>
        <FieldLabel>
          Learning objectives (one per line)
          <textarea value={learningObjectivesText} onChange={(event) => setLearningObjectivesText(event.target.value)} rows={6} style={{ ...inputStyle, minHeight: 164 }} />
        </FieldLabel>

        <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Live lesson preview</div>
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
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#ECFEFF', color: '#155E75', fontWeight: 700, fontSize: 12 }}>English runtime: en-NG</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: supportLanguageLabel.trim() ? '#FFF7ED' : '#F8FAFC', color: supportLanguageLabel.trim() ? '#9A3412' : '#475569', fontWeight: 700, fontSize: 12 }}>{supportLanguageLabel.trim() ? `Support: ${supportLanguageLabel}` : 'Support language pending'}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: totalActivityMinutes === (Number(durationMinutes) || 0) ? '#DCFCE7' : '#FEF3C7', color: totalActivityMinutes === (Number(durationMinutes) || 0) ? '#166534' : '#92400E', fontWeight: 700, fontSize: 12 }}>{totalActivityMinutes === (Number(durationMinutes) || 0) ? 'Timing aligned' : 'Timing mismatch'}</span>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 8 }}>Objective snapshot</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
                {learningObjectives.length > 0 ? learningObjectives.map((objective) => <li key={objective}>{objective}</li>) : <li>Add at least one clear objective.</li>}
              </ul>
            </div>

            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 8 }}>Flow snapshot</div>
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
            {dependencyBlockers.length
              ? 'Lesson creation is blocked until subject and module dependencies recover'
              : publishIntent
                ? (blockSubmit ? 'Approval/publish is blocked' : 'Approval/publish is clear')
                : 'Draft save stays available'}
          </div>
        </div>
        <div style={{ color: '#64748b', lineHeight: 1.6 }}>
          Save drafts whenever you want. But if you mark this lesson approved or published, the form now calls out the blockers instead of letting junk slip through quietly.
        </div>
        {learningObjectives.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 800, color: '#991B1B' }}>Lesson objective is missing</div>
            <div style={{ color: '#475569', lineHeight: 1.6 }}>
              Even when authors are focused on image-choice step cards, approval/publish still expects a lesson-level objective. Add it here without leaving the blocker panel.
            </div>
            <FieldLabel>
              Lesson learning objectives (one per line)
              <textarea value={learningObjectivesText} onChange={(event) => setLearningObjectivesText(event.target.value)} rows={4} style={{ ...inputStyle, minHeight: 116, background: '#fff' }} />
            </FieldLabel>
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 8 }}>
          {dependencyBlockers.length ? dependencyBlockers.map((blocker) => (
            <div key={blocker} style={{ padding: 12, borderRadius: 14, background: '#fff', border: '1px solid #FECACA', color: '#991B1B', lineHeight: 1.6 }}>
              {blocker}
            </div>
          )) : null}
          {readinessBlockers.length ? readinessBlockers.map((blocker) => (
            <div key={blocker} style={{ padding: 12, borderRadius: 14, background: '#fff', border: `1px solid ${blockSubmit ? '#FECACA' : '#E2E8F0'}`, color: '#475569', lineHeight: 1.6 }}>
              {blocker}
            </div>
          )) : dependencyBlockers.length ? null : (
            <div style={{ padding: 12, borderRadius: 14, background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#166534', lineHeight: 1.6 }}>
              No visible blockers. The lesson pack is structurally ready for approval or publish.
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
                <FieldLabel>
                  Target language
                  <input value="English" readOnly style={{ ...inputStyle, background: '#f8fafc', color: '#475569' }} />
                </FieldLabel>
              </div>
              <FieldLabel>
                Default Hausa support cue for steps
                <textarea value={defaultStepSupportText} onChange={(event) => setDefaultStepSupportText(event.target.value)} rows={3} style={{ ...inputStyle, minHeight: 104 }} />
              </FieldLabel>
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
              const typeGuide = getLessonTypeGuide(activity.type);
              const typeGuidance = getLessonStepTypeGuidance(activity.type);
              const typeWarnings = getLessonStepTypeWarnings(activity);
              const supportsChoices = Boolean(typeGuide.choicesLabel);
              const supportsMedia = Boolean(typeGuide.mediaLabel);
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

                  <div style={{ padding: 14, borderRadius: 16, background: accent.tint, border: `1px solid ${accent.border}`, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>{lessonStepTypeLabelMap[activity.type] ?? activity.type} authoring guidance</div>
                      <div style={{ padding: '6px 10px', borderRadius: 999, background: '#fff', color: accent.text, fontWeight: 700, fontSize: 12 }}>{typeWarnings.length ? `${typeWarnings.length} type warning${typeWarnings.length === 1 ? '' : 's'}` : 'Type checks clear'}</div>
                    </div>
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
                    {typeWarnings.length ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {typeWarnings.map((warning) => (
                          <div key={warning} style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #FECACA', color: '#991B1B', lineHeight: 1.5 }}>{warning}</div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #BBF7D0', color: '#166534', lineHeight: 1.5 }}>Type-specific signals look sane for this step.</div>
                    )}
                    <div style={{ padding: 10, borderRadius: 12, background: '#fff', border: `1px solid ${assetIntent.tone === 'warn' ? '#FED7AA' : assetIntent.tone === 'good' ? '#BBF7D0' : '#E2E8F0'}`, color: assetIntent.tone === 'warn' ? '#9A3412' : assetIntent.tone === 'good' ? '#166534' : '#475569', lineHeight: 1.5 }}>
                      <strong>{assetIntent.label}:</strong> {assetIntent.detail}
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.6 }}>{typeGuide.summary}</div>
                  </div>

                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
                    <FieldLabel>
                      {typeGuide.promptLabel}
                      <textarea value={activity.prompt} onChange={(event) => updateActivity(index, { prompt: event.target.value })} rows={3} style={{ ...inputStyle, minHeight: 110 }} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.promptHint}</span>
                    </FieldLabel>
                    <FieldLabel>
                      {typeGuide.detailLabel}
                      <textarea value={activity.detail} onChange={(event) => updateActivity(index, { detail: event.target.value })} rows={4} style={{ ...inputStyle, minHeight: 132 }} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.detailHint}</span>
                    </FieldLabel>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
                    <FieldLabel>
                      {typeGuide.evidenceLabel}
                      <input value={activity.evidence} onChange={(event) => updateActivity(index, { evidence: event.target.value })} style={inputStyle} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.evidenceHint}</span>
                    </FieldLabel>
                    <FieldLabel>
                      {typeGuide.expectedAnswersLabel}
                      <input value={activity.expectedAnswers} onChange={(event) => updateActivity(index, { expectedAnswers: event.target.value })} style={inputStyle} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.expectedAnswersHint}</span>
                    </FieldLabel>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
                    <FieldLabel>
                      English target text
                      <input value={activity.targetText} onChange={(event) => updateActivity(index, { targetText: event.target.value })} style={inputStyle} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>The exact English word, phrase, sentence, or answer this step is trying to teach.</span>
                    </FieldLabel>
                    <FieldLabel>
                      Hausa support override
                      <textarea value={activity.supportText} onChange={(event) => updateActivity(index, { supportText: event.target.value })} rows={3} style={{ ...inputStyle, minHeight: 104 }} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>Optional step-specific Hausa coaching. Leave blank to rely on the lesson default support cue.</span>
                    </FieldLabel>
                  </div>
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))' }}>
                    <FieldLabel>
                      Tags (comma separated)
                      <input value={activity.tags} onChange={(event) => updateActivity(index, { tags: event.target.value })} style={inputStyle} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.tagsHint}</span>
                    </FieldLabel>
                    <FieldLabel>
                      {typeGuide.facilitatorLabel}
                      <textarea value={activity.facilitatorNotes} onChange={(event) => updateActivity(index, { facilitatorNotes: event.target.value })} rows={3} style={{ ...inputStyle, minHeight: 104 }} />
                      <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.facilitatorHint}</span>
                    </FieldLabel>
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
                    onMediaLinesChange={(value) => updateActivity(index, { mediaLines: value })}
                    onChoiceLinesChange={(value) => updateActivity(index, { choiceLines: value })}
                  />

                  {supportsChoices || supportsMedia ? (
                    <div style={{ display: 'grid', gap: 14 }}>
                      <LessonActivityStructuredBuilders
                        type={activity.type}
                        choiceLines={activity.choiceLines}
                        mediaLines={activity.mediaLines}
                        onChoiceLinesChange={(value) => updateActivity(index, { choiceLines: value })}
                        onMediaLinesChange={(value) => updateActivity(index, { mediaLines: value })}
                        inputStyle={inputStyle}
                        ghostButtonStyle={ghostButtonStyle}
                        sectionLabel={<div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>{supportsChoices ? typeGuide.choicesLabel : typeGuide.mediaLabel}</div>}
                        fieldHint={(children) => <span style={{ color: '#64748B', fontSize: 12 }}>{children}</span>}
                        fieldLabel={(children) => <FieldLabel>{children}</FieldLabel>}
                        assets={assets}
                        subjectId={subjectId}
                        subjectName={activeSubject?.name}
                        moduleId={moduleId}
                        moduleTitle={activeModule?.title}
                      />
                      {supportsChoices ? <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.choicesHint}</span> : null}
                      {supportsMedia ? <span style={{ color: '#64748B', fontSize: 12 }}>{typeGuide.mediaHint}</span> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ActionButton label={dependencyBlockers.length ? 'Load subject and module data first' : blockSubmit ? 'Fix blockers before approval/publish' : 'Create full lesson pack'} pendingLabel="Creating lesson pack…" style={buttonStyle} disabled={blockSubmit} />
      </form>
    </>
  );
}
