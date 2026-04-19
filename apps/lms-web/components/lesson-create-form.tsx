'use client';

import { useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import { LessonActivityStructuredBuilders } from './lesson-activity-structured-builders';
import type { CurriculumModule, Lesson, LessonActivityStep, Subject } from '../lib/types';

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

const typeLabelMap: Record<string, string> = {
  listen_repeat: 'Listen & repeat',
  speak_answer: 'Speak answer',
  word_build: 'Word build',
  image_choice: 'Image choice',
  oral_quiz: 'Oral quiz',
  listen_answer: 'Listen answer',
  tap_choice: 'Tap choice',
  letter_intro: 'Letter intro',
};

const lessonTypeFieldGuide: Record<string, {
  summary: string;
  promptLabel: string;
  promptHint: string;
  detailLabel: string;
  detailHint: string;
  expectedAnswersLabel: string;
  expectedAnswersHint: string;
  evidenceLabel: string;
  evidenceHint: string;
  facilitatorLabel: string;
  facilitatorHint: string;
  tagsHint: string;
  choicesLabel?: string;
  choicesHint?: string;
  mediaLabel?: string;
  mediaHint?: string;
}> = {
  listen_repeat: {
    summary: 'Model the target language, define exactly what the learner repeats, and attach any audio/image cue the facilitator needs.',
    promptLabel: 'Model line / learner prompt',
    promptHint: 'The exact phrase the learner hears and repeats.',
    detailLabel: 'Delivery notes',
    detailHint: 'Pacing, gestures, chunking, or repetition rhythm.',
    expectedAnswersLabel: 'Target utterance(s)',
    expectedAnswersHint: 'Comma-separated acceptable repetitions or pronunciation variants.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'What proves the learner repeated accurately?',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'How the adult should model, prompt, or correct.',
    tagsHint: 'Example: modelling, repetition, pronunciation',
    mediaLabel: 'Media cues (kind|value per line)',
    mediaHint: 'Optional audio/image prompt such as audio|https://... or image|nurse-card',
  },
  speak_answer: {
    summary: 'Capture the spoken question, the expected response frame, and how the facilitator should support without overfeeding the answer.',
    promptLabel: 'Spoken question / prompt',
    promptHint: 'What the learner should answer aloud.',
    detailLabel: 'Scaffold / response setup',
    detailHint: 'Sentence frame, turn-taking rule, or support pattern.',
    expectedAnswersLabel: 'Acceptable spoken answers',
    expectedAnswersHint: 'Comma-separated phrases or sentence stems.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'What counts as a successful spoken response?',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'Prompt fading, re-tries, or correction rule.',
    tagsHint: 'Example: oral-language, sentence-frame, fluency',
  },
  word_build: {
    summary: 'Define the target word build, expected blend/segment output, and any tiles, chunks, or distractors needed to run the step.',
    promptLabel: 'Build task prompt',
    promptHint: 'What the learner must build, blend, or say.',
    detailLabel: 'Build sequence / setup',
    detailHint: 'How sounds, letters, or chunks should be presented.',
    expectedAnswersLabel: 'Target word(s) or sound chunks',
    expectedAnswersHint: 'Comma-separated sounds, chunks, or final word outputs.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'Correct build, blend, pronunciation, or self-correction.',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'Blending gestures, finger taps, or correction cues.',
    tagsHint: 'Example: phonics, blending, encoding',
    choicesLabel: 'Build options / distractors (id|label|correct/wrong|mediaKind|mediaValue per line)',
    choicesHint: 'Optional tiles or distractors. Mark the components learners should use as correct.',
    mediaLabel: 'Media cues (kind|value per line)',
    mediaHint: 'Optional letter cards, audio, or visual supports.',
  },
  image_choice: {
    summary: 'This step should feel like a proper visual multiple-choice task: prompt, image options, correct option, and support notes.',
    promptLabel: 'Image-choice prompt',
    promptHint: 'Question the learner answers by selecting an image.',
    detailLabel: 'Choice setup / contrast notes',
    detailHint: 'How the images differ and what distractors test.',
    expectedAnswersLabel: 'Expected answer labels',
    expectedAnswersHint: 'Comma-separated correct labels or spoken follow-up answers.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'Correct selection, explanation, or spoken extension.',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'How to name options, repeat prompt, or extend the answer.',
    tagsHint: 'Example: visual-discrimination, vocabulary, comprehension',
    choicesLabel: 'Image options (id|label|correct/wrong|mediaKind|mediaValue per line)',
    choicesHint: 'One line per option. Usually use image as mediaKind and an asset/id/url as mediaValue.',
    mediaLabel: 'Shared media cues (kind|value per line)',
    mediaHint: 'Optional shared instruction image/audio shown before the choices.',
  },
  oral_quiz: {
    summary: 'Treat this as a quick oral check: crisp question, acceptable answers, and a clear success criterion.',
    promptLabel: 'Quiz question',
    promptHint: 'Short oral question the facilitator asks.',
    detailLabel: 'Quiz setup / scoring notes',
    detailHint: 'Replay rules, wait time, or follow-up probe.',
    expectedAnswersLabel: 'Acceptable oral answers',
    expectedAnswersHint: 'Comma-separated correct answers or variants.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'Correct recall, explanation, or pronunciation.',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'When to repeat, probe, or move on.',
    tagsHint: 'Example: check-for-understanding, recall, oral-assessment',
  },
  listen_answer: {
    summary: 'Define the listen-first input, then the response you expect after the learner hears the audio, story, or teacher readout.',
    promptLabel: 'Listen task prompt',
    promptHint: 'What the learner must listen for or answer after listening.',
    detailLabel: 'Listening script / setup',
    detailHint: 'Story snippet, audio directions, or listening focus.',
    expectedAnswersLabel: 'Expected listening answers',
    expectedAnswersHint: 'Comma-separated key details or acceptable responses.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'Recall, attention, key-detail identification, or follow-up answer.',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'Replay rule, pacing, or emphasis cue.',
    tagsHint: 'Example: listening, recall, comprehension',
    mediaLabel: 'Listening media (kind|value per line)',
    mediaHint: 'Optional audio or image cues tied to the listening task.',
  },
  tap_choice: {
    summary: 'Structure this as a tap-select interaction with explicit options, correct tap target, and any shared media the learner sees.',
    promptLabel: 'Tap-choice prompt',
    promptHint: 'Instruction the learner follows by tapping one option.',
    detailLabel: 'Interaction notes',
    detailHint: 'How distractors work or what the learner should notice before tapping.',
    expectedAnswersLabel: 'Expected answer labels',
    expectedAnswersHint: 'Comma-separated correct labels or verbal follow-up answers.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'Correct tap, speed, confidence, or verbal justification.',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'Prompting, retries, or extension question after the tap.',
    tagsHint: 'Example: interaction, selection, comprehension',
    choicesLabel: 'Tap options (id|label|correct/wrong|mediaKind|mediaValue per line)',
    choicesHint: 'One line per tappable option. Add media when the option is visual.',
    mediaLabel: 'Shared media cues (kind|value per line)',
    mediaHint: 'Optional shared image/audio shown above the tap choices.',
  },
  letter_intro: {
    summary: 'Call out the grapheme, sound, anchor word, and any tracing or visual support needed for the introduction step.',
    promptLabel: 'Letter introduction prompt',
    promptHint: 'What the learner hears about the letter/sound.',
    detailLabel: 'Teaching move / anchor word',
    detailHint: 'Letter formation, sound cue, anchor word, or motion.',
    expectedAnswersLabel: 'Target letter / sound outputs',
    expectedAnswersHint: 'Comma-separated grapheme, phoneme, or anchor word.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'Learner names the letter, says the sound, or traces correctly.',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'How to trace, point, or reinforce the sound.',
    tagsHint: 'Example: phonics, letter-intro, sound-awareness',
    mediaLabel: 'Letter media cues (kind|value per line)',
    mediaHint: 'Optional image/audio/trace card that supports the letter intro.',
  },
};

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

type ActivityDraft = {
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
};

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

function parseActivityChoices(choiceLines: string) {
  return choiceLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, labelRaw, correctnessRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      const id = idRaw || `choice-${index + 1}`;
      const label = labelRaw || id;
      const isCorrect = ['correct', 'true', 'yes', '1'].includes((correctnessRaw || '').toLowerCase());
      const mediaKind = mediaKindRaw || '';
      const mediaValue = mediaValueRaw || '';
      return {
        id,
        label,
        isCorrect,
        ...(mediaKind && mediaValue ? { media: { kind: mediaKind, value: mediaValue.includes(',') ? mediaValue.split(',').map((item) => item.trim()).filter(Boolean) : mediaValue } } : {}),
      };
    });
}

function parseActivityMedia(mediaLines: string) {
  return mediaLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindRaw, valueRaw] = line.split('|').map((part) => part.trim());
      const kind = kindRaw || 'image';
      const value = valueRaw || '';
      return {
        kind,
        value: value.includes(',') ? value.split(',').map((item) => item.trim()).filter(Boolean) : value,
      };
    });
}

function getLessonTypeGuide(type: string) {
  return lessonTypeFieldGuide[type] ?? lessonTypeFieldGuide.speak_answer;
}

function buildDraftsFromLesson(lesson?: Lesson | null) {
  if (!lesson) return [makeActivityDraft(0)];

  const source = asArray<LessonActivityStep>(lesson.activitySteps ?? lesson.activities);
  if (!source.length) return [makeActivityDraft(0)];

  return source.map((step, index) => makeActivityDraft(index, {
    id: step.id || `activity-${index + 1}`,
    title: step.title ?? step.prompt ?? `Activity ${index + 1}`,
    prompt: step.prompt ?? step.title ?? `Activity ${index + 1}`,
    type: step.type ?? 'speak_answer',
    durationMinutes: String(step.durationMinutes ?? 2),
    detail: step.detail ?? '',
    evidence: step.evidence ?? '',
    expectedAnswers: asArray<string>(step.expectedAnswers).join(', '),
    tags: asArray<string>(step.tags).join(', '),
    facilitatorNotes: asArray<string>(step.facilitatorNotes).join('\n'),
    choiceLines: asArray<any>(step.choices).map((choice: any, choiceIndex: number) => {
      const mediaKind = choice?.media?.kind ? `|${choice.media.kind}` : '';
      const mediaValue = choice?.media?.value !== undefined ? `|${Array.isArray(choice.media.value) ? choice.media.value.join(', ') : String(choice.media.value)}` : '';
      return `${choice.id || `choice-${choiceIndex + 1}`}|${choice.label || ''}|${choice.isCorrect ? 'correct' : 'wrong'}${mediaKind}${mediaValue}`;
    }).join('\n'),
    mediaLines: asArray<any>(step.media).map((item: any) => `${item.kind || 'image'}|${Array.isArray(item.value) ? item.value.join(', ') : String(item.value ?? '')}`).join('\n'),
  }));
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
}: {
  subjects: Subject[];
  modules: CurriculumModule[];
  lessons: Lesson[];
  action: (formData: FormData) => void;
  initialSubjectId?: string;
  initialModuleId?: string;
  duplicateLessonId?: string;
  returnPath?: string;
}) {
  const duplicateLesson = lessons.find((item) => item.id === duplicateLessonId) ?? null;
  const duplicateSubjectId = duplicateLesson?.subjectId
    ?? (duplicateLesson?.subjectName
      ? subjects.find((item) => item.name === duplicateLesson.subjectName)?.id
      : undefined);
  const initialSubjectIsValid = Boolean(initialSubjectId && subjects.some((subject) => subject.id === initialSubjectId));
  const fallbackSubjectId = initialSubjectIsValid ? initialSubjectId : (duplicateSubjectId ?? subjects[0]?.id);
  const [subjectId, setSubjectId] = useState(String(fallbackSubjectId ?? subjects[0]?.id ?? ''));
  const filteredModules = useMemo(() => modules.filter((module) => module.subjectId === subjectId), [modules, subjectId]);
  const initialModule = initialModuleId ? modules.find((item) => item.id === initialModuleId) : null;
  const duplicateModule = duplicateLesson?.moduleId
    ? modules.find((item) => item.id === duplicateLesson.moduleId)
    : modules.find((item) => item.title === duplicateLesson?.moduleTitle);
  const fallbackModuleId = (initialModule && initialModule.subjectId === subjectId ? initialModule.id : undefined)
    ?? (duplicateModule && duplicateModule.subjectId === subjectId ? duplicateModule.id : undefined)
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
  const [localizationNotesText, setLocalizationNotesText] = useState(asArray<string>((duplicateLesson?.localization as Record<string, unknown> | null)?.notes).join('\n'));
  const [assessmentTitle, setAssessmentTitle] = useState(String(duplicateLesson?.lessonAssessment?.title ?? ''));
  const [assessmentKind, setAssessmentKind] = useState(String(duplicateLesson?.lessonAssessment?.kind ?? 'observational'));
  const [assessmentItemsText, setAssessmentItemsText] = useState(asArray<{ prompt?: string; evidence?: string }>(duplicateLesson?.lessonAssessment?.items).map((item) => `${item.prompt ?? ''}|${item.evidence ?? 'teacher-check'}`).join('\n'));
  const [activityDrafts, setActivityDrafts] = useState(buildDraftsFromLesson(duplicateLesson));

  const activeModule = filteredModules.find((item) => item.id === moduleId) ?? filteredModules[0] ?? modules[0];
  const dependencyBlockers = useMemo(() => ([
    subjects.length > 0 ? null : 'Load subject data first so the lesson can be attached to a real curriculum lane.',
    modules.length > 0 ? null : 'Load module data first so Lesson Studio does not create a floating orphan lesson.',
    filteredModules.length > 0 ? null : 'The selected subject has no modules yet. Create or restore a module before authoring a lesson here.',
  ].filter(Boolean) as string[]), [subjects.length, modules.length, filteredModules.length]);

  const learningObjectives = useMemo(() => learningObjectivesText.split('\n').map((item) => item.trim()).filter(Boolean), [learningObjectivesText]);
  const localization = useMemo(() => ({ locale: 'en-NG', supportLanguage, supportLanguageLabel, notes: localizationNotesText.split('\n').map((item) => item.trim()).filter(Boolean) }), [supportLanguage, supportLanguageLabel, localizationNotesText]);
  const lessonAssessment = useMemo(() => ({
    ...(duplicateLesson?.lessonAssessment && typeof duplicateLesson.lessonAssessment === 'object' ? duplicateLesson.lessonAssessment : {}),
    title: assessmentTitle,
    kind: assessmentKind,
    items: assessmentItemsText.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [prompt, evidence = 'teacher-check'] = line.split('|').map((part) => part.trim());
      return { id: `assessment-item-${index + 1}`, prompt, evidence };
    }),
  }), [duplicateLesson?.lessonAssessment, assessmentTitle, assessmentKind, assessmentItemsText]);
  const activitySteps = useMemo(() => activityDrafts.map((draft, index) => ({
    id: draft.id || `activity-${index + 1}`,
    order: index + 1,
    type: draft.type,
    title: draft.title,
    prompt: draft.prompt || draft.title,
    durationMinutes: Number(draft.durationMinutes) || 0,
    detail: draft.detail,
    evidence: draft.evidence,
    expectedAnswers: draft.expectedAnswers.split(',').map((item) => item.trim()).filter(Boolean),
    tags: draft.tags.split(',').map((item) => item.trim()).filter(Boolean),
    facilitatorNotes: draft.facilitatorNotes.split('\n').map((item) => item.trim()).filter(Boolean),
    choices: parseActivityChoices(draft.choiceLines),
    media: parseActivityMedia(draft.mediaLines),
  })), [activityDrafts]);
  const totalActivityMinutes = useMemo(() => activitySteps.reduce((sum, step) => sum + (step.durationMinutes || 0), 0), [activitySteps]);
  const durationGap = (Number(durationMinutes) || 0) - totalActivityMinutes;
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
  ].filter(Boolean) as string[]), [title, durationMinutes, learningObjectives.length, lessonAssessment.items.length, activitySteps.length, durationGap, activeModule?.status, status]);
  const publishIntent = status === 'approved' || status === 'published';
  const blockSubmit = dependencyBlockers.length > 0 || (publishIntent && readinessBlockers.length > 0);

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
    setLocalizationNotesText(template.localizationNotesText);
    setActivityDrafts(template.activities.map((activity, index) => makeActivityDraft(index, activity)));
    setDurationMinutes(String(template.activities.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0) || 8));
  };

  return (
    <form action={action} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath} />
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
            const nextModules = modules.filter((module) => module.subjectId === next);
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
                  <div key={step.id} style={{ display: 'grid', gap: 4, padding: 12, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <strong>{index + 1}. {step.title || step.prompt}</strong>
                      <span style={{ color: '#7C3AED', fontWeight: 700 }}>{step.durationMinutes || 0} min</span>
                    </div>
                    <div style={{ color: '#475569', fontSize: 14 }}>{step.detail || step.prompt || 'Add learner-facing guidance for this step.'}</div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>{typeLabelMap[step.type] ?? step.type} • Evidence: {step.evidence || 'Not set yet'}</div>
                    {step.choices && step.choices.length > 0 ? <div style={{ color: '#7C3AED', fontSize: 12, fontWeight: 700 }}>{step.choices.length} choice option{step.choices.length === 1 ? '' : 's'}</div> : null}
                    {step.media && step.media.length > 0 ? <div style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{step.media.length} media cue{step.media.length === 1 ? '' : 's'}</div> : null}
                  </div>
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
              const supportsChoices = Boolean(typeGuide.choicesLabel);
              const supportsMedia = Boolean(typeGuide.mediaLabel);

              return (
                <div key={activity.id} style={{ padding: 18, borderRadius: 18, border: '1px solid #E5E7EB', background: 'white', display: 'grid', gap: 14, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>Step {index + 1}</div>
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
                        <option value="letter_intro">Letter intro</option>
                      </select>
                    </FieldLabel>
                    <FieldLabel>
                      Minutes
                      <input value={activity.durationMinutes} onChange={(event) => updateActivity(index, { durationMinutes: event.target.value })} style={inputStyle} />
                    </FieldLabel>
                  </div>

                  <div style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Typed authoring section</div>
                      <div style={{ padding: '6px 10px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3', fontWeight: 700, fontSize: 12 }}>{typeLabelMap[activity.type] ?? activity.type}</div>
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
  );
}
