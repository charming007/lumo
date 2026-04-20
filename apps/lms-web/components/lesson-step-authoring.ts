import {
  getLessonAssetKindLabel,
  isKnownLessonAssetKind,
  normalizeLessonAssetKind,
} from '../lib/lesson-runtime-preview';

export type LessonStepTypeGuidance = {
  summary: string;
  checklist: string[];
  learnerTemplate?: {
    label: string;
    structure: string;
    operatorTip: string;
  };
};

export type ActivityDraftLike = {
  prompt: string;
  detail: string;
  evidence: string;
  expectedAnswers: string;
  tags: string;
  facilitatorNotes: string;
  choiceLines: string;
  mediaLines: string;
  type: string;
};

export const lessonStepTypeLabelMap: Record<string, string> = {
  listen_repeat: 'Listen & repeat',
  speak_answer: 'Speak answer',
  word_build: 'Word build',
  image_choice: 'Image choice',
  oral_quiz: 'Oral quiz',
  listen_answer: 'Listen answer',
  tap_choice: 'Tap choice',
  letter_intro: 'Letter intro',
};

export const lessonStepTypeAccentMap: Record<string, { tint: string; border: string; text: string }> = {
  image_choice: { tint: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  tap_choice: { tint: '#ECFDF5', border: '#BBF7D0', text: '#166534' },
  listen_repeat: { tint: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  speak_answer: { tint: '#FDF2F8', border: '#FBCFE8', text: '#9D174D' },
  word_build: { tint: '#FEFCE8', border: '#FDE68A', text: '#854D0E' },
  letter_intro: { tint: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
  oral_quiz: { tint: '#F8FAFC', border: '#CBD5E1', text: '#334155' },
  listen_answer: { tint: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
};

export const lessonTypeFieldGuide: Record<string, {
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
    summary: 'Model the target language, define exactly what the learner repeats, and attach the cue learners hear before they echo it back.',
    promptLabel: 'Coach line learners repeat',
    promptHint: 'Write the exact model line the learner hears first, then repeats back word-for-word or chunk-by-chunk.',
    detailLabel: 'Repeat pattern / delivery move',
    detailHint: 'Spell out the rhythm: full-line echo, two chunks, gesture support, slow-fast repeat, or call-and-response.',
    expectedAnswersLabel: 'Expected repeated line(s)',
    expectedAnswersHint: 'Comma-separated acceptable repeats, chunks, or pronunciation variants the learner can say back.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'What proves the learner actually echoed the model accurately enough to move on?',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'How the adult models, replays, points, gestures, chunks, or corrects without turning this into a different task.',
    tagsHint: 'Example: modelling, repetition, pronunciation, echo-line',
    mediaLabel: 'Model cues learners hear/see (kind|value per line)',
    mediaHint: 'Usually add the actual playback or script cue here, for example audio|https://... , transcript|Say the full line once., or image|nurse-card.',
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
    summary: 'This step should read like a picture-pick template: one learner prompt, a visible set of answer cards, one correct image, and clear distractors.',
    promptLabel: 'Learner pick-the-picture prompt',
    promptHint: 'Write the exact instruction or question the learner answers by choosing one picture card.',
    detailLabel: 'What makes the pictures different',
    detailHint: 'Describe the contrast between the correct image and distractors so operators know what the learner is meant to notice.',
    expectedAnswersLabel: 'Correct image label(s) / spoken follow-up',
    expectedAnswersHint: 'List the right card label plus any short follow-up language the learner may say after choosing it.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'What proves the learner picked the right picture — correct tap, named answer, quick explanation, or both?',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'How the adult presents the card set, repeats the prompt, reveals distractors, or extends after the selection.',
    tagsHint: 'Example: picture-pick, visual-discrimination, vocabulary, comprehension',
    choicesLabel: 'Picture answer cards (id|label|correct/wrong|mediaKind|mediaValue per line)',
    choicesHint: 'Build the real learner card set here. Each row should be one visible answer card, and the correct card must be marked clearly.',
    mediaLabel: 'Shared prompt cue above the cards (kind|value per line)',
    mediaHint: 'Optional scene image or spoken instruction shown once before the learner chooses. Skip it if the answer cards already carry the full task.',
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
    summary: 'Structure this as a tap-the-right-target template: short instruction, fast-scanning options, one correct target, and clean distractors.',
    promptLabel: 'Learner tap instruction',
    promptHint: 'Write the short instruction the learner follows before tapping one target.',
    detailLabel: 'Tap logic / distractor notes',
    detailHint: 'Explain what the learner notices before tapping and how the distractors create a real decision instead of random buttons.',
    expectedAnswersLabel: 'Correct tap label(s) / spoken follow-up',
    expectedAnswersHint: 'List the correct target label plus any follow-up words the learner may say after the tap.',
    evidenceLabel: 'Evidence to capture',
    evidenceHint: 'What counts as success here: correct tap, quick recognition, no prompt, verbal confirmation, or a retry rule?',
    facilitatorLabel: 'Facilitator coaching notes',
    facilitatorHint: 'Prompting, retries, pacing, or the extension question asked after the learner taps.',
    tagsHint: 'Example: tap-target, quick-recognition, interaction, comprehension',
    choicesLabel: 'Tap targets (id|label|correct/wrong|mediaKind|mediaValue per line)',
    choicesHint: 'Create the actual tappable targets here. Keep labels short so learners can scan and choose fast. Add media only when the target itself needs it.',
    mediaLabel: 'Shared cue before the tap (kind|value per line)',
    mediaHint: 'Optional shared image, audio, or prompt card shown before the learner taps a target.',
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

export function getLessonTypeGuide(type: string) {
  return lessonTypeFieldGuide[type] ?? lessonTypeFieldGuide.speak_answer;
}

function countNonEmptyLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).length;
}

export function getLessonStepTypeGuidance(type: string): LessonStepTypeGuidance {
  switch (type) {
    case 'image_choice':
      return {
        summary: 'Picture-based discrimination. The editor should show a real learner card set, not abstract metadata pretending to be a template.',
        checklist: ['Add at least 2 picture cards', 'Mark the one correct card clearly', 'Attach image media to the cards or shared prompt cue'],
        learnerTemplate: {
          label: 'Learner sees: prompt + picture cards',
          structure: '1 prompt → 2-4 visible picture answers → learner picks 1 correct card',
          operatorTip: 'If an operator cannot point to the exact correct card in two seconds, the step is still too vague.',
        },
      };
    case 'tap_choice':
      return {
        summary: 'Fast recognition tap task. Keep the target list short, scannable, and obviously interactive.',
        checklist: ['Add at least 2 tap targets', 'Mark the correct target clearly', 'Keep target labels short enough to scan fast'],
        learnerTemplate: {
          label: 'Learner sees: instruction + tap targets',
          structure: '1 short instruction → 2-4 tappable targets → learner taps 1 correct target',
          operatorTip: 'Use this when speed and recognition matter; if the learner needs long reading time, it is probably the wrong type.',
        },
      };
    case 'listen_repeat':
      return {
        summary: 'Audio-first imitation. Make the model line, repeat pattern, and success bar painfully clear so the authoring view matches classroom reality.',
        checklist: ['Provide the model line learners hear first', 'Attach an audio/script cue', 'State the exact repeated output or chunk'],
        learnerTemplate: {
          label: 'Learner hears: model → echo',
          structure: '1 model cue plays or is read → learner repeats the same line or chunk back',
          operatorTip: 'This is not a comprehension question. If the learner is supposed to choose or explain, use a different step type.',
        },
      };
    case 'speak_answer':
      return {
        summary: 'Open spoken response. The prompt and evidence need to reward actual speaking, not generic worksheet fluff.',
        checklist: ['Use a speakable prompt', 'Define expected spoken answer(s)', 'Describe what oral evidence counts'],
      };
    case 'word_build':
      return {
        summary: 'Assembly task for sounds, letters, or words. Make the target build explicit and give the learner pieces to work with.',
        checklist: ['State the target word/build outcome', 'Provide build pieces as options or media cues', 'List the finished expected answer'],
      };
    case 'letter_intro':
      return {
        summary: 'Letter/sound introduction. The form should foreground the symbol, sound, and teaching move instead of generic prose.',
        checklist: ['Name the target letter or sound', 'Add a modelling cue or example word', 'Keep facilitator notes focused on demonstration'],
      };
    case 'listen_answer':
      return {
        summary: 'Listening comprehension step. Define what learners hear, what detail matters, and what response proves they actually processed it.',
        checklist: ['Attach a listening cue or script reference', 'State the key detail or answer you expect', 'Use facilitator notes for replay rules or emphasis'],
      };
    case 'oral_quiz':
      return {
        summary: 'Quick oral checkpoint. Keep the question crisp, the acceptable answers visible, and the success bar easy to judge live.',
        checklist: ['Write a short quiz question', 'List acceptable answer variants', 'State what counts as success or follow-up evidence'],
      };
    default:
      return {
        summary: 'General lesson step. Fill in the prompt, evidence, and support cues cleanly.',
        checklist: ['Prompt is clear', 'Evidence is explicit', 'Support cues are present when needed'],
      };
  }
}

export function getLessonStepTypeWarnings(activity: ActivityDraftLike) {
  const choiceCount = countNonEmptyLines(activity.choiceLines);
  const mediaCount = countNonEmptyLines(activity.mediaLines);
  const hasExpectedAnswers = activity.expectedAnswers.split(',').map((item) => item.trim()).filter(Boolean).length > 0;
  const hasEvidence = activity.evidence.trim().length > 0;
  const warnings: string[] = [];
  const assetKindWarnings = [activity.choiceLines, activity.mediaLines]
    .flatMap((value) => value.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split('|').map((part) => part.trim());
      const rawKind = parts.length >= 5 ? parts[3] : parts[0];
      const rawValue = parts.length >= 5 ? parts[4] : parts[1];
      const kind = normalizeLessonAssetKind(rawKind);
      const nextWarnings: string[] = [];
      if (rawKind && !isKnownLessonAssetKind(rawKind)) {
        nextWarnings.push(`${getLessonAssetKindLabel(kind)} is a non-standard asset kind. Use a known kind unless runtime explicitly supports the custom one.`);
      }
      if (rawKind && !String(rawValue ?? '').trim()) {
        nextWarnings.push(`${getLessonAssetKindLabel(kind)} asset kind is set but its value is blank.`);
      }
      return nextWarnings;
    });

  warnings.push(...assetKindWarnings);

  switch (activity.type) {
    case 'image_choice':
      if (choiceCount < 2) warnings.push('Image choice needs at least 2 options or it is not a choice task.');
      if (mediaCount === 0 && !activity.choiceLines.includes('|image|')) warnings.push('Image choice should reference image media in the step or option lines.');
      if (!activity.choiceLines.toLowerCase().includes('|image|') && !activity.mediaLines.toLowerCase().includes('image|')) warnings.push('Image choice currently reads like text-only multiple choice. Add actual image-linked assets so preview and runtime match the authoring intent.');
      break;
    case 'tap_choice':
      if (choiceCount < 2) warnings.push('Tap choice needs multiple tap targets.');
      if (!activity.choiceLines.toLowerCase().includes('correct')) warnings.push('Tap choice should mark at least one correct option.');
      break;
    case 'listen_repeat':
      if (mediaCount === 0) warnings.push('Listen repeat is stronger with an audio/media cue instead of text alone.');
      if (!activity.mediaLines.toLowerCase().includes('audio|')) warnings.push('Listen repeat should carry an explicit audio cue or script asset so the listening intent survives preview and delivery.');
      if (!hasExpectedAnswers) warnings.push('Listen repeat should define the repeated target line or phrase.');
      break;
    case 'speak_answer':
      if (!hasExpectedAnswers) warnings.push('Speak answer should include expected spoken answer patterns.');
      if (!hasEvidence) warnings.push('Speak answer should state what spoken evidence the mallam records.');
      break;
    case 'word_build':
      if (!hasExpectedAnswers) warnings.push('Word build should name the final built word or sound string.');
      if (choiceCount === 0 && mediaCount === 0) warnings.push('Word build needs source pieces in options or media cues.');
      break;
    case 'letter_intro':
      if (!activity.prompt.trim()) warnings.push('Letter intro should explicitly name the target letter or sound in the prompt.');
      if (!activity.facilitatorNotes.trim()) warnings.push('Letter intro benefits from facilitator notes for modelling and tracing.');
      break;
    case 'listen_answer':
      if (mediaCount === 0) warnings.push('Listen answer should include a listening cue, script asset, or shared media reference.');
      if (!activity.mediaLines.toLowerCase().includes('audio|')) warnings.push('Listen answer should point to an audio/script asset so the learner preview does not fake a listening task with plain text.');
      if (!hasExpectedAnswers) warnings.push('Listen answer should list the key details or acceptable responses learners give after listening.');
      if (!hasEvidence) warnings.push('Listen answer should spell out the observable listening-comprehension evidence.');
      break;
    case 'oral_quiz':
      if (!activity.prompt.trim()) warnings.push('Oral quiz should lead with the exact question the facilitator asks.');
      if (!hasExpectedAnswers) warnings.push('Oral quiz should list acceptable oral answers or variants.');
      if (!hasEvidence) warnings.push('Oral quiz should state how success is judged live.');
      break;
    default:
      break;
  }

  return warnings;
}
