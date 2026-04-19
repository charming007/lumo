export type LessonStepTypeGuidance = {
  summary: string;
  checklist: string[];
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
        summary: 'Picture-based discrimination. The editor should force a visible image payload and enough options to make the choice meaningful.',
        checklist: ['Add at least 2 choices', 'Mark at least 1 correct choice', 'Attach image media cues to the choices or step'],
      };
    case 'tap_choice':
      return {
        summary: 'Fast recognition tap task. Keep labels short, use clean distractors, and make the correct tap unambiguous.',
        checklist: ['Add at least 2 tap targets', 'Mark the correct answer clearly', 'Use concise option labels learners can scan fast'],
      };
    case 'listen_repeat':
      return {
        summary: 'Audio-first imitation. Authors should define what learners hear, what they repeat, and what counts as success.',
        checklist: ['Provide an audio/script cue', 'Set a repeat-focused evidence target', 'Add expected spoken output'],
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

  switch (activity.type) {
    case 'image_choice':
      if (choiceCount < 2) warnings.push('Image choice needs at least 2 options or it is not a choice task.');
      if (mediaCount === 0 && !activity.choiceLines.includes('|image|')) warnings.push('Image choice should reference image media in the step or option lines.');
      break;
    case 'tap_choice':
      if (choiceCount < 2) warnings.push('Tap choice needs multiple tap targets.');
      if (!activity.choiceLines.toLowerCase().includes('correct')) warnings.push('Tap choice should mark at least one correct option.');
      break;
    case 'listen_repeat':
      if (mediaCount === 0) warnings.push('Listen repeat is stronger with an audio/media cue instead of text alone.');
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
