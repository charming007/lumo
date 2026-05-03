'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';
import { LessonActivityStructuredBuilders } from './lesson-activity-structured-builders';
import { buildActivityStepsFromDrafts, countNonEmptyLines, getDraftAssetIntentSummary, type LessonActivityDraft } from './lesson-authoring-shared';
import {
  getLessonStepTypeGuidance,
  getLessonStepTypeWarnings,
  getLessonTypeGuide,
  lessonStepTypeAccentMap,
  lessonStepTypeLabelMap,
} from './lesson-step-authoring';
import { getStepRuntimePreviewHints } from '../lib/lesson-runtime-preview';
import type { Assessment, CurriculumModule, Subject } from '../lib/types';
import { buildEnglishActivities, buildEnglishObjective, buildReadinessChecks, inferVocabulary } from '../lib/english-curriculum';

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
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const autoFitTwoUp = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
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

const typeOptions = [
  { value: 'listen_repeat', label: 'Listen repeat' },
  { value: 'speak_answer', label: 'Speak answer' },
  { value: 'word_build', label: 'Word build' },
  { value: 'image_choice', label: 'Image choice' },
  { value: 'oral_quiz', label: 'Oral quiz' },
  { value: 'listen_answer', label: 'Listen answer' },
  { value: 'tap_choice', label: 'Tap choice' },
  { value: 'drag_to_match', label: 'Drag to match' },
  { value: 'letter_intro', label: 'Letter intro' },
];

const templatePresets = [
  {
    id: 'conversation',
    label: 'Conversation warm-up',
    title: 'Talk about people who help us',
    mode: 'guided',
    durationMinutes: 12,
    activityTypes: ['listen_repeat', 'speak_answer', 'word_build', 'image_choice', 'oral_quiz'],
  },
  {
    id: 'phonics',
    label: 'Phonics sprint',
    title: 'Letter sound S and simple words',
    mode: 'guided',
    durationMinutes: 10,
    activityTypes: ['letter_intro', 'listen_repeat', 'word_build', 'image_choice', 'oral_quiz'],
  },
  {
    id: 'story',
    label: 'Story listening',
    title: 'Listen to a short story and answer',
    mode: 'group',
    durationMinutes: 14,
    activityTypes: ['listen_answer', 'speak_answer', 'image_choice', 'oral_quiz', 'speak_answer'],
  },
] as const;

type ActivityDraft = LessonActivityDraft;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14, minWidth: 0 }}>{children}</label>;
}

function makeActivityDraft(index: number, overrides: Partial<ActivityDraft> = {}): ActivityDraft {
  return {
    id: overrides.id ?? `english-activity-${index + 1}`,
    title: `Activity ${index + 1}`,
    type: 'speak_answer',
    durationMinutes: '2',
    prompt: '',
    detail: '',
    evidence: '',
    expectedAnswers: '',
    tags: 'english',
    facilitatorNotes: '',
    choiceLines: '',
    mediaLines: '',
    ...overrides,
  } as ActivityDraft;
}

function nextActivityDraftId(current: ActivityDraft[]) {
  const highestIndex = current.reduce((max, item) => {
    const match = item.id.match(/^english-activity-(\d+)$/);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
  }, 0);

  return `english-activity-${highestIndex + 1}`;
}


function toDraftsFromGeneratedActivities(
  activities: ReturnType<typeof buildEnglishActivities>,
  activityTypes: readonly string[],
  vocabulary: string[],
  mode: string,
  assessmentTitle: string | null,
  level: string | undefined,
) {
  return activities.map((activity, index) => makeActivityDraft(index, {
    title: activity.title,
    type: activityTypes[index] ?? 'speak_answer',
    durationMinutes: String(Number.parseInt(activity.duration, 10) || 2),
    prompt: activity.title,
    detail: activity.detail,
    evidence: activity.evidence,
    expectedAnswers: vocabulary.join(', '),
    tags: [mode, 'english', level ?? 'beginner'].join(', '),
    facilitatorNotes: assessmentTitle
      ? `Keep evidence aligned to ${assessmentTitle}.\nPush for full spoken responses before support.`
      : 'Capture one clear oral evidence point before exit.',
    choiceLines: '',
    mediaLines: '',
  }));
}

export function EnglishStudioAuthoringForm({
  subjects,
  modules,
  assessments,
  assets,
  action,
}: {
  subjects: Subject[];
  modules: CurriculumModule[];
  assessments: Assessment[];
  assets: import('../lib/types').LessonAsset[];
  action: (formData: FormData) => void;
}) {
  const englishSubject = subjects.find((subject) => subject.name.toLowerCase().includes('english')) ?? null;
  const englishModules = modules.filter((module) => module.subjectId === englishSubject?.id || module.subjectName?.toLowerCase().includes('english'));
  const starterPreset = templatePresets[0];
  const [moduleId, setModuleId] = useState(englishModules[0]?.id ?? '');
  const [title, setTitle] = useState<string>(starterPreset.title);
  const [durationMinutes, setDurationMinutes] = useState<string>(String(starterPreset.durationMinutes));
  const [mode, setMode] = useState<string>(starterPreset.mode);
  const [status, setStatus] = useState<string>('draft');
  const [supportLanguage, setSupportLanguage] = useState('ha');
  const [supportLanguageLabel, setSupportLanguageLabel] = useState('Hausa');
  const [localizationNotesText, setLocalizationNotesText] = useState('Anchor examples in familiar community contexts.\nKeep prompts short and repeatable.');
  const [assessmentKind, setAssessmentKind] = useState('observational');
  const [assessmentItemsText, setAssessmentItemsText] = useState('Can the learner say one complete sentence about the topic?|spoken-response\nCan the learner use at least one target word correctly?|teacher-check');

  const activeModule = englishModules.find((module) => module.id === moduleId) ?? englishModules[0];
  const hasEnglishSubject = Boolean(englishSubject);
  const hasEnglishModules = englishModules.length > 0;
  const dependencyBlockers = [
    hasEnglishSubject ? null : 'English Studio cannot create a lesson until the English subject feed loads.',
    hasEnglishModules ? null : 'English Studio cannot create a lesson until at least one English module is available.',
    moduleId && activeModule ? null : 'Pick a valid English module before creating a lesson.',
  ].filter(Boolean) as string[];
  const activeAssessment = assessments.find((assessment) => assessment.moduleId === activeModule?.id || assessment.moduleTitle === activeModule?.title) ?? null;
  const objective = buildEnglishObjective(title);
  const vocabulary = inferVocabulary(title);
  const generatedActivities = useMemo(() => buildEnglishActivities({
    title,
    durationMinutes: Number(durationMinutes) || 8,
    mode,
    assessmentTitle: activeAssessment?.title ?? null,
  }), [title, durationMinutes, mode, activeAssessment?.title]);

  const [activityDrafts, setActivityDrafts] = useState<ActivityDraft[]>(() => toDraftsFromGeneratedActivities(
    buildEnglishActivities({
      title: starterPreset.title,
      durationMinutes: starterPreset.durationMinutes,
      mode: starterPreset.mode,
      assessmentTitle: null,
    }),
    starterPreset.activityTypes,
    inferVocabulary(starterPreset.title),
    starterPreset.mode,
    null,
    englishModules[0]?.level,
  ));
  const initialSnapshot = useMemo(() => JSON.stringify({
    moduleId: englishModules[0]?.id ?? '',
    title: starterPreset.title,
    durationMinutes: String(starterPreset.durationMinutes),
    mode: starterPreset.mode,
    status: 'draft',
    supportLanguage: 'ha',
    supportLanguageLabel: 'Hausa',
    localizationNotesText: 'Anchor examples in familiar community contexts.\nKeep prompts short and repeatable.',
    assessmentKind: 'observational',
    assessmentItemsText: 'Can the learner say one complete sentence about the topic?|spoken-response\nCan the learner use at least one target word correctly?|teacher-check',
    activityDrafts: toDraftsFromGeneratedActivities(
      buildEnglishActivities({
        title: starterPreset.title,
        durationMinutes: starterPreset.durationMinutes,
        mode: starterPreset.mode,
        assessmentTitle: null,
      }),
      starterPreset.activityTypes,
      inferVocabulary(starterPreset.title),
      starterPreset.mode,
      null,
      englishModules[0]?.level,
    ),
  }), [englishModules, starterPreset]);

  const targetAgeRange = activeModule?.level === 'confident' ? '8-11' : activeModule?.level === 'emerging' ? '7-10' : '6-9';
  const voicePersona = mode === 'group' ? 'discussion-coach-a' : mode === 'independent' ? 'calm-guide-a' : mode === 'practice' ? 'practice-coach-a' : 'friendly-guide-a';
  const readiness = buildReadinessChecks({
    status,
    moduleStatus: activeModule?.status,
    hasAssessment: Boolean(activeAssessment),
    lessonTitle: title,
    durationMinutes: Number(durationMinutes) || 0,
  });
  const recommendedStatus = readiness.readinessScore >= 5 ? 'published' : readiness.readinessScore >= 4 ? 'approved' : readiness.readinessScore >= 3 ? 'review' : 'draft';
  const learningObjectives = useMemo(() => [objective, `Use ${vocabulary.join(', ')} in supported speaking turns.`], [objective, vocabulary]);
  const localization = useMemo(() => ({
    locale: 'en-NG',
    supportLanguage,
    supportLanguageLabel,
    notes: localizationNotesText.split('\n').map((item) => item.trim()).filter(Boolean),
  }), [supportLanguage, supportLanguageLabel, localizationNotesText]);
  const assessmentTitle = activeAssessment?.title ?? `${title} quick check`;
  const lessonAssessment = useMemo(() => ({
    assessmentId: activeAssessment?.id ?? null,
    title: assessmentTitle,
    kind: assessmentKind,
    items: assessmentItemsText.split('\n').map((line, index) => {
      const [prompt, evidence = 'teacher-check'] = line.split('|').map((part) => part.trim());
      return { id: `english-assessment-${index + 1}`, prompt, evidence };
    }).filter((item) => item.prompt),
  }), [activeAssessment?.id, assessmentTitle, assessmentKind, assessmentItemsText]);

  const activitySteps = useMemo(() => buildActivityStepsFromDrafts(activityDrafts), [activityDrafts]);

  const totalActivityMinutes = useMemo(() => activitySteps.reduce((sum, item) => sum + (item.durationMinutes || 0), 0), [activitySteps]);
  const durationGap = (Number(durationMinutes) || 0) - totalActivityMinutes;
  const typeReadinessWarnings = useMemo(() => activityDrafts.flatMap((activity, index) => getLessonStepTypeWarnings(activity).map((warning) => `Step ${index + 1}: ${warning}`)), [activityDrafts]);
  const readinessBlockers = useMemo(() => ([
    title.trim().length >= 8 ? null : 'Give the lesson a specific title with at least 8 characters.',
    (Number(durationMinutes) || 0) >= 8 ? null : 'Set a credible lesson duration of at least 8 minutes.',
    Boolean(activeAssessment) ? null : 'Wire a module assessment gate before treating this lesson as release-safe.',
    lessonAssessment.items.length > 0 ? null : 'Add at least one assessment item so the lesson has observable evidence.',
    activitySteps.length >= 3 ? null : 'Keep at least 3 activity steps so the English lesson has a real teaching spine.',
    Math.abs(durationGap) <= 2 ? null : `Bring lesson timing closer to the activity spine (${Math.abs(durationGap)} min ${durationGap > 0 ? 'buffer' : 'overrun'} right now).`,
    !(activeModule?.status === 'draft' && (status === 'approved' || status === 'published')) ? null : 'This module is still draft, so approving or publishing from English Studio is premature.',
    ...typeReadinessWarnings,
  ].filter(Boolean) as string[]), [title, durationMinutes, activeAssessment, lessonAssessment.items.length, activitySteps.length, durationGap, activeModule?.status, status, typeReadinessWarnings]);
  const publishIntent = status === 'approved' || status === 'published';
  const blockSubmit = dependencyBlockers.length > 0 || (publishIntent && readinessBlockers.length > 0);

  const readinessTone = useMemo(() => {
    if (readiness.readinessScore >= 5) return { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' };
    if (readiness.readinessScore >= 3) return { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' };
    return { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' };
  }, [readiness.readinessScore]);
  const currentSnapshot = useMemo(() => JSON.stringify({
    moduleId,
    title,
    durationMinutes,
    mode,
    status,
    supportLanguage,
    supportLanguageLabel,
    localizationNotesText,
    assessmentKind,
    assessmentItemsText,
    activityDrafts,
  }), [moduleId, title, durationMinutes, mode, status, supportLanguage, supportLanguageLabel, localizationNotesText, assessmentKind, assessmentItemsText, activityDrafts]);
  const isDirty = currentSnapshot !== initialSnapshot;
  const { allowNextNavigation, confirmationDialog } = useUnsavedChangesGuard({ isDirty });

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
      next.splice(index + 1, 0, { ...source, id: nextActivityDraftId(current), title: `${source.title} copy` });
      return next;
    });
  };

  const removeActivity = (index: number) => {
    setActivityDrafts((current) => (current.length === 1 ? [makeActivityDraft(0)] : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const addActivity = () => setActivityDrafts((current) => [...current, makeActivityDraft(current.length, {
    expectedAnswers: vocabulary.join(', '),
    tags: [mode, 'english', activeModule?.level ?? 'beginner'].join(', '),
  })]);

  const regenerateFromBlueprint = () => {
    setActivityDrafts(toDraftsFromGeneratedActivities(
      generatedActivities,
      starterPreset.activityTypes,
      vocabulary,
      mode,
      activeAssessment?.title ?? null,
      activeModule?.level,
    ));
  };

  const applyPreset = (preset: typeof templatePresets[number]) => {
    const presetActivities = buildEnglishActivities({
      title: preset.title,
      durationMinutes: preset.durationMinutes,
      mode: preset.mode,
      assessmentTitle: activeAssessment?.title ?? null,
    });

    setTitle(preset.title);
    setMode(preset.mode);
    setDurationMinutes(String(preset.durationMinutes));
    setActivityDrafts(toDraftsFromGeneratedActivities(
      presetActivities,
      preset.activityTypes,
      inferVocabulary(preset.title),
      preset.mode,
      activeAssessment?.title ?? null,
      activeModule?.level,
    ));
  };

  return (
    <>
      {confirmationDialog}
      <form action={action} onSubmitCapture={() => allowNextNavigation()} style={cardStyle}>
      <input type="hidden" name="subjectId" value={englishSubject?.id ?? ''} />
      <input type="hidden" name="returnPath" value="/content" />
      <input type="hidden" name="targetAgeRange" value={targetAgeRange} />
      <input type="hidden" name="voicePersona" value={voicePersona} />
      <input type="hidden" name="learningObjectives" value={JSON.stringify(learningObjectives)} />
      <input type="hidden" name="localization" value={JSON.stringify(localization)} />
      <input type="hidden" name="lessonAssessment" value={JSON.stringify(lessonAssessment)} />
      <input type="hidden" name="activitySteps" value={JSON.stringify(activitySteps)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>Author English lesson</h2>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 8 }}>
            This is finally a real authoring surface: start from a usable English preset, edit the activity spine, tune assessment and localization, then create the lesson without the usual fake-title nonsense.
          </div>
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: isDirty ? '#FEF3C7' : '#ECFDF5', color: isDirty ? '#92400E' : '#166534', fontSize: 12, fontWeight: 800 }}>
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={regenerateFromBlueprint} style={ghostButtonStyle}>Reset spine from generator</button>
          <Link href={`/content/lessons/new?subjectId=${englishSubject?.id ?? ''}&moduleId=${moduleId}&from=%2Fcontent`} style={{ ...ghostButtonStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open full lesson studio
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b' }}>Quick starts</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {templatePresets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset)} style={ghostButtonStyle}>{preset.label}</button>
          ))}
        </div>
      </div>

      <div style={autoFitFields}>
        <FieldLabel>
          English module
          <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle} disabled={!hasEnglishModules}>
            {englishModules.length ? englishModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>) : <option value="">No English modules available</option>}
          </select>
        </FieldLabel>
        <FieldLabel>
          Lesson title
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Duration
          <input name="durationMinutes" type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} style={inputStyle} />
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 16, padding: 14, minWidth: 0 }}><strong>{activeModule?.level ?? '—'}</strong><div style={{ color: '#475569', marginTop: 4 }}>Target level</div></div>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 14, minWidth: 0 }}><strong>{activeModule?.status ?? '—'}</strong><div style={{ color: '#475569', marginTop: 4 }}>Module readiness</div></div>
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 16, padding: 14, minWidth: 0 }}><strong>{assessmentTitle}</strong><div style={{ color: '#475569', marginTop: 4 }}>Assessment link</div></div>
        <div style={{ background: readinessTone.bg, border: `1px solid ${readinessTone.border}`, borderRadius: 16, padding: 14, color: readinessTone.text, minWidth: 0 }}><strong>{readiness.readinessScore}/5 checks passed</strong><div style={{ marginTop: 4 }}>Recommended status: {recommendedStatus}</div></div>
      </div>

      <div style={{ padding: 16, borderRadius: 18, background: blockSubmit ? '#FEF2F2' : '#F8FAFC', border: `1px solid ${blockSubmit ? '#FECACA' : '#E2E8F0'}`, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, color: blockSubmit ? '#991B1B' : '#0f172a' }}>Inline readiness blockers</div>
          <div style={{ color: blockSubmit ? '#991B1B' : '#475569', fontSize: 13, fontWeight: 700 }}>
            {dependencyBlockers.length
              ? 'Lesson creation is blocked until English dependencies recover'
              : publishIntent
                ? (blockSubmit ? 'Approval/publish is blocked' : 'Approval/publish is clear')
                : 'Draft save stays available'}
          </div>
        </div>
        <div style={{ color: '#64748b', lineHeight: 1.6 }}>
          English Studio now surfaces the obvious release blockers inline so authors stop guessing whether the blueprint is actually safe to ship.
        </div>
        {learningObjectives.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 800, color: '#991B1B' }}>Lesson objective is missing</div>
            <div style={{ color: '#475569', lineHeight: 1.6 }}>
              Image-choice and other step templates still publish against lesson-level objectives. Add the outcome here instead of digging through the wider studio form.
            </div>
            <FieldLabel>
              Lesson learning objectives (one per line)
              <textarea value={learningObjectives.join('\n')} readOnly rows={4} style={{ ...inputStyle, minHeight: 116, background: '#fff' }} />
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
          )) : null}
          {!dependencyBlockers.length && !readinessBlockers.length ? (
            <div style={{ padding: 12, borderRadius: 14, background: '#ECFDF5', border: '1px solid #BBF7D0', color: '#166534', lineHeight: 1.6 }}>
              No visible blockers. The English lesson blueprint is structurally ready for approval or publish.
            </div>
          ) : null}
        </div>
      </div>

      <div style={autoFitTwoUp}>
        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          <FieldLabel>
            Publish state
            <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </FieldLabel>

          <div style={{ padding: 16, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', marginBottom: 8 }}>Generated learning objective</div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{objective}</div>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>Vocabulary focus: {vocabulary.join(' • ')}</div>
          </div>

          <div style={{ padding: 16, borderRadius: 18, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#3730A3', marginBottom: 8 }}>Localization</div>
            <div style={{ ...autoFitCompactFields, marginBottom: 10 }}>
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
              Localization notes
              <textarea value={localizationNotesText} onChange={(event) => setLocalizationNotesText(event.target.value)} rows={4} style={inputStyle} />
            </FieldLabel>
          </div>

          <div style={{ padding: 16, borderRadius: 18, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#6D28D9', marginBottom: 8 }}>Assessment pack</div>
            <div style={{ ...autoFitCompactFields, marginBottom: 10 }}>
              <FieldLabel>
                Assessment title
                <input value={assessmentTitle} readOnly style={{ ...inputStyle, background: '#f8fafc', color: '#475569' }} />
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
              <textarea value={assessmentItemsText} onChange={(event) => setAssessmentItemsText(event.target.value)} rows={5} style={inputStyle} />
            </FieldLabel>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ padding: 16, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B' }}>Live lesson preview</div>
                <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>{title || 'Untitled English lesson'}</div>
              </div>
              <div style={{ textAlign: 'right', color: '#475569', fontSize: 13 }}>
                <div>{activitySteps.length} steps</div>
                <div>{totalActivityMinutes} min activity spine</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: '#E0E7FF', color: '#3730A3', fontWeight: 700, fontSize: 12 }}>{mode}</span>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: 12 }}>{targetAgeRange}</span>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4338CA', fontWeight: 700, fontSize: 12 }}>{voicePersona}</span>
              <span style={{ padding: '6px 10px', borderRadius: 999, background: totalActivityMinutes === (Number(durationMinutes) || 0) ? '#DCFCE7' : '#FEF3C7', color: totalActivityMinutes === (Number(durationMinutes) || 0) ? '#166534' : '#92400E', fontWeight: 700, fontSize: 12 }}>
                {totalActivityMinutes === (Number(durationMinutes) || 0) ? 'Timing aligned' : 'Timing mismatch'}
              </span>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', marginBottom: 8 }}>Readiness control</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {readiness.checks.map((check) => (
                  <div key={check.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 14, background: check.passed ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${check.passed ? '#BBF7D0' : '#FECACA'}` }}>
                    <span style={{ fontWeight: 800, color: check.passed ? '#166534' : '#b91c1c' }}>{check.passed ? '✓' : '!'}</span>
                    <span style={{ color: '#334155', lineHeight: 1.5 }}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Editable activity spine</div>
                <div style={{ color: '#475569', marginTop: 4 }}>This is the real bit now: add, reorder, duplicate, and clean up the English lesson flow before the record exists.</div>
              </div>
              <button type="button" onClick={addActivity} style={{ ...ghostButtonStyle, background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe' }}>+ Add step</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {activityDrafts.map((activity, index) => {
                const stepWarnings = getLessonStepTypeWarnings(activity);
                const typeGuide = getLessonTypeGuide(activity.type);
                const typeGuidance = getLessonStepTypeGuidance(activity.type);
                const accent = lessonStepTypeAccentMap[activity.type] ?? { tint: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
                const choiceCount = countNonEmptyLines(activity.choiceLines);
                const mediaCount = countNonEmptyLines(activity.mediaLines);
                const noteCount = countNonEmptyLines(activity.facilitatorNotes);
                const assetIntent = getDraftAssetIntentSummary(activity);
                const runtimePreview = getStepRuntimePreviewHints(activitySteps[index]);
                const stepSurface = assetIntent.tone === 'good'
                  ? { border: '1px solid #86EFAC', background: '#F0FDF4' }
                  : assetIntent.tone === 'warn'
                    ? { border: '1px solid #FDBA74', background: '#FFFBEB' }
                    : { border: '1px solid #E5E7EB', background: 'white' };
                return (
                  <div key={activity.id} style={{ padding: 14, borderRadius: 16, ...stepSurface, display: 'grid', gap: 10, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>Step {index + 1}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding: '6px 10px', borderRadius: 999, background: accent.tint, border: `1px solid ${accent.border}`, color: accent.text, fontWeight: 800, fontSize: 12 }}>{lessonStepTypeLabelMap[activity.type] ?? activity.type}</span>
                          <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{choiceCount} choices</span>
                          <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{mediaCount} media cues</span>
                          <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{noteCount} coach notes</span>
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: assetIntent.tone === 'warn' ? '#FFF7ED' : assetIntent.tone === 'good' ? '#ECFDF5' : '#F8FAFC', color: assetIntent.tone === 'warn' ? '#9A3412' : assetIntent.tone === 'good' ? '#166534' : '#475569', fontWeight: 700, fontSize: 12 }}>{assetIntent.label}</span>
                          <span style={{ padding: '6px 10px', borderRadius: 999, background: stepWarnings.length ? '#FEF2F2' : '#ECFDF5', color: stepWarnings.length ? '#B91C1C' : '#166534', fontWeight: 700, fontSize: 12 }}>{stepWarnings.length ? `${stepWarnings.length} type warnings` : 'Type checks clear'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => moveActivity(index, -1)} disabled={index === 0} style={{ ...ghostButtonStyle, opacity: index === 0 ? 0.45 : 1 }}>↑ Move</button>
                        <button type="button" onClick={() => moveActivity(index, 1)} disabled={index === activityDrafts.length - 1} style={{ ...ghostButtonStyle, opacity: index === activityDrafts.length - 1 ? 0.45 : 1 }}>↓ Move</button>
                        <button type="button" onClick={() => duplicateActivity(index)} style={ghostButtonStyle}>Duplicate</button>
                        <button type="button" onClick={() => removeActivity(index)} style={{ ...ghostButtonStyle, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Remove</button>
                      </div>
                    </div>

                    <div style={{ padding: 12, borderRadius: 14, background: accent.tint, border: `1px solid ${accent.border}`, display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: accent.text, fontWeight: 800 }}>{lessonStepTypeLabelMap[activity.type] ?? activity.type} authoring guidance</div>
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
                      {stepWarnings.length ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {stepWarnings.map((warning) => (
                            <div key={warning} style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #FED7AA', color: '#9A3412', lineHeight: 1.5 }}>{warning}</div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #BBF7D0', color: '#166534', lineHeight: 1.5 }}>Type-specific signals look sane for this step.</div>
                      )}
                      <div style={{ padding: 10, borderRadius: 12, background: '#fff', border: `1px solid ${assetIntent.tone === 'warn' ? '#FED7AA' : assetIntent.tone === 'good' ? '#BBF7D0' : '#E2E8F0'}`, color: assetIntent.tone === 'warn' ? '#9A3412' : assetIntent.tone === 'good' ? '#166534' : '#475569', lineHeight: 1.5 }}>
                      <strong>{assetIntent.label}:</strong> {assetIntent.detail}
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.6 }}>{typeGuide.summary}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {runtimePreview.assetSummary.total > 0 ? <span style={{ padding: '6px 10px', borderRadius: 999, background: '#fff', color: '#0F766E', fontWeight: 700, fontSize: 12 }}>{runtimePreview.assetSummary.labels.join(' • ')}</span> : <span style={{ padding: '6px 10px', borderRadius: 999, background: '#fff7ed', color: '#9A3412', fontWeight: 700, fontSize: 12 }}>No preview assets yet</span>}
                        <span style={{ padding: '6px 10px', borderRadius: 999, background: runtimePreview.hints.length ? '#FEF3C7' : '#ECFDF5', color: runtimePreview.hints.length ? '#92400E' : '#166534', fontWeight: 700, fontSize: 12 }}>{runtimePreview.hints.length ? 'Needs runtime polish' : 'Preview looks learner-ready'}</span>
                      </div>
                      {runtimePreview.hints.length ? <div style={{ color: '#92400E', lineHeight: 1.6 }}>{runtimePreview.hints[0]}</div> : null}
                    </div>

                    <div style={autoFitCompactFields}>
                      <FieldLabel>
                        Step title
                        <input value={activity.title} onChange={(event) => updateActivity(index, { title: event.target.value })} style={inputStyle} />
                      </FieldLabel>
                      <FieldLabel>
                        Type
                        <select value={activity.type} onChange={(event) => updateActivity(index, { type: event.target.value })} style={inputStyle}>
                          {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </FieldLabel>
                      <FieldLabel>
                        Minutes
                        <input value={activity.durationMinutes} onChange={(event) => updateActivity(index, { durationMinutes: event.target.value })} style={inputStyle} />
                      </FieldLabel>
                    </div>

                    <FieldLabel>
                      Learner prompt
                      <textarea value={activity.prompt} onChange={(event) => updateActivity(index, { prompt: event.target.value })} rows={2} style={inputStyle} />
                    </FieldLabel>

                    <FieldLabel>
                      Detail
                      <textarea value={activity.detail} onChange={(event) => updateActivity(index, { detail: event.target.value })} rows={3} style={inputStyle} />
                    </FieldLabel>

                    <div style={autoFitCompactFields}>
                      <FieldLabel>
                        Evidence
                        <input value={activity.evidence} onChange={(event) => updateActivity(index, { evidence: event.target.value })} style={inputStyle} />
                      </FieldLabel>
                      <FieldLabel>
                        Expected answers
                        <input value={activity.expectedAnswers} onChange={(event) => updateActivity(index, { expectedAnswers: event.target.value })} style={inputStyle} />
                      </FieldLabel>
                    </div>

                    <div style={autoFitCompactFields}>
                      <FieldLabel>
                        Tags
                        <input value={activity.tags} onChange={(event) => updateActivity(index, { tags: event.target.value })} style={inputStyle} />
                      </FieldLabel>
                      <FieldLabel>
                        Facilitator notes
                        <textarea value={activity.facilitatorNotes} onChange={(event) => updateActivity(index, { facilitatorNotes: event.target.value })} rows={2} style={inputStyle} />
                      </FieldLabel>
                    </div>

                    <LessonActivityStructuredBuilders
                      type={activity.type}
                      choiceLines={activity.choiceLines}
                      mediaLines={activity.mediaLines}
                      onChoiceLinesChange={(value) => updateActivity(index, { choiceLines: value })}
                      onMediaLinesChange={(value) => updateActivity(index, { mediaLines: value })}
                      inputStyle={inputStyle}
                      ghostButtonStyle={ghostButtonStyle}
                      sectionLabel={<div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>{typeGuide.choicesLabel ?? typeGuide.mediaLabel ?? 'Structured step builders'}</div>}
                      fieldHint={(children) => <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{children}</div>}
                      fieldLabel={(children) => <FieldLabel>{children}</FieldLabel>}
                      assets={assets}
                      subjectId={englishSubject?.id ?? undefined}
                      moduleId={moduleId}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ActionButton label={dependencyBlockers.length ? 'Load English subject and module data first' : blockSubmit ? 'Fix blockers before approval/publish' : 'Create English lesson'} pendingLabel="Creating lesson…" style={buttonStyle} disabled={blockSubmit} />
      </form>
    </>
  );
}
