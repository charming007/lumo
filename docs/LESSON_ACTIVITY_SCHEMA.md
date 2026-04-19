# Lumo Lesson Activity Schema

_Last updated: 2026-04-19_

This document defines the **current canonical lesson-step schema** for the Lumo LMS authoring flow and the learner-tablet runtime.

It is grounded in the fields currently exposed in the LMS lesson editor:

- `title`
- `type`
- `durationMinutes` / minutes
- `prompt` ("learner prompt")
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `choices`
- `media`

It also reflects the current learner runtime mapping in `apps/learner-tablet/lib/models.dart`.

---

## 1) Canonical step shape

Each lesson step in `activitySteps` should use this payload shape:

```ts
{
  id: string;
  order?: number;
  type: LessonActivityType;
  title?: string;
  prompt: string;
  durationMinutes?: number;
  detail?: string;
  evidence?: string;
  expectedAnswers?: string[];
  media?: Array<{
    kind?: string;
    value?: string | string[] | null;
  }>;
  choices?: Array<{
    id: string;
    label: string;
    isCorrect?: boolean;
    media?: {
      kind?: string;
      value?: string | string[] | null;
    } | null;
  }>;
  tags?: string[];
  facilitatorNotes?: string[];
}
```

### Field intent

- `id`: stable authoring/runtime identifier for the step.
- `order`: sequence position; runtime sorts by it.
- `type`: one of the supported lesson activity types below.
- `title`: author-facing step label; runtime can derive a label if absent.
- `prompt`: primary learner-facing or coach-spoken instruction. This is the most important field.
- `durationMinutes`: intended step length.
- `detail`: richer authoring context, scripting detail, or delivery note.
- `evidence`: what success looks like observationally or in learner output.
- `expectedAnswers`: accepted target responses, ordered with the preferred answer first.
- `media`: step-level cue payloads such as image/audio/text focus.
- `choices`: structured options for any recognition/selection task.
- `tags`: authoring/filter metadata, not core runtime logic.
- `facilitatorNotes`: operational notes for teacher/facilitator delivery.

---

## 2) Cross-type validation rules

These rules should be enforced for every step regardless of type.

### Required for all step types

- `id` must be non-empty within the lesson.
- `type` must be one of:
  - `listen_repeat`
  - `speak_answer`
  - `word_build`
  - `image_choice`
  - `oral_quiz`
  - `listen_answer`
  - `tap_choice`
  - `letter_intro`
- `prompt` must be non-empty.
- `durationMinutes`, if provided, must be a positive integer.

### Recommended for all step types

- `title` should be present for LMS readability.
- `evidence` should be present so the step has a real observable outcome.
- `expectedAnswers[0]` should hold the preferred or default target response, because the learner runtime falls back to the first expected answer when available.
- `order` should be contiguous and unique within a lesson.

### Shared normalization rules

- `expectedAnswers`, `tags`, and `facilitatorNotes` should be trimmed and empty items removed.
- `choices[].id` must be unique within a step.
- `choices[].label` must be non-empty.
- `media[].kind` should be explicit (`image`, `audio`, `text`, etc.) rather than implied.
- If `media[].value` is an array, empty items should be stripped.

### Runtime fallback behavior to account for

The learner runtime currently:

- defaults unknown or missing `type` to `listen_repeat`
- derives `title` from `type` if absent
- uses `prompt` as the main instruction and coach prompt
- uses the **first** `expectedAnswers` entry as the primary target response
- if `expectedAnswers` is empty, falls back to:
  - first correct choice label
  - else first choice label
  - else `"I am ready"`
- only reads the **first** item in `media` for `focusText`, `mediaKind`, and `mediaValue`

That means authoring should not rely on multiple media entries for current tablet behavior.

---

## 3) Activity type matrix

## `listen_repeat`

**Purpose**
- Model language, phrase rhythm, pronunciation, or sentence frames for repetition.

**Required fields**
- `id`
- `type = "listen_repeat"`
- `prompt`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Should usually be absent**
- `choices`

**Validation rules**
- `choices` should be empty.
- `expectedAnswers` should contain the exact repeat target, with the preferred spoken form first.
- If `media` is used, the first media item should represent the focus cue to repeat from.

**Expected runtime behavior**
- Learner runtime maps this to:
  - `LessonActivityType.listenRepeat`
  - `LessonStepType.intro`
  - `SpeakerMode.guiding`
- Tablet presents the prompt as guided modelling.
- Target response is the first `expectedAnswers` item when present.
- Best for imitation, call-and-response, and opening scaffolds.

---

## `speak_answer`

**Purpose**
- Elicit an open spoken learner response, usually a full sentence or short constructed answer.

**Required fields**
- `id`
- `type = "speak_answer"`
- `prompt`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Should usually be absent**
- `choices`

**Validation rules**
- `expectedAnswers` should include the preferred answer first and alternate acceptable answers after that.
- If no `expectedAnswers` are given, runtime degrades badly into choice fallback or a generic default, so open-response steps should normally have at least one expected answer.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.speakAnswer`
  - `LessonStepType.reflection`
  - `SpeakerMode.listening`
- Runtime treats it as a speaking turn with the app listening for a response.
- Use for sentence production, explanation, recall in words, and exit responses.

---

## `word_build`

**Purpose**
- Move from units to a constructed word or spoken blend; also usable for guided assembly tasks.

**Required fields**
- `id`
- `type = "word_build"`
- `prompt`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Optional depending on implementation style**
- `choices`

**Validation rules**
- At least one of `expectedAnswers`, `choices`, or `media` should carry the target build cue.
- If choices are supplied, at least one should be marked `isCorrect = true`.
- If the step is really a spoken blend, prefer `expectedAnswers`; if it is really a selection task, consider whether `tap_choice` or `image_choice` would be cleaner.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.wordBuild`
  - `LessonStepType.practice`
  - `SpeakerMode.listening`
- Runtime treats it as a practice step.
- Good for phonics blending, word assembly, and scaffolded productive practice.

---

## `image_choice`

**Purpose**
- Ask the learner to select the correct image or picture-linked option.

**Required fields**
- `id`
- `type = "image_choice"`
- `prompt`
- `choices`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Validation rules**
- `choices.length` should be at least 2.
- At least 1 choice should have `isCorrect = true`.
- Each choice should have a non-empty `label`.
- Each choice should preferably include `media.kind = image` and a valid image payload when the task is truly image-based.
- `expectedAnswers` may mirror correct labels but is not enough by itself to make this an image-choice experience.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.imageChoice`
  - `LessonStepType.practice`
  - `SpeakerMode.listening`
- Runtime exposes choice labels and derives emojis from choice media where possible.
- If `expectedAnswers` is empty, runtime will use the first correct choice label as the default target response.

---

## `oral_quiz`

**Purpose**
- Deliver a direct oral check, recall question, or quick assessment prompt.

**Required fields**
- `id`
- `type = "oral_quiz"`
- `prompt`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`
- `choices`

**Validation rules**
- At least one of `expectedAnswers` or `choices` should be present.
- If `choices` are used, at least one should be correct.
- `evidence` should state what counts as passing the oral check.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.oralQuiz`
  - `LessonStepType.reflection`
  - `SpeakerMode.listening`
- Runtime treats it as a response/checkpoint step.
- Best for direct recall, who/what/where questions, and short mastery checks.

---

## `listen_answer`

**Purpose**
- Present a listening task where the learner hears content and then answers or acts on it.

**Required fields**
- `id`
- `type = "listen_answer"`
- `prompt`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Optional depending on task**
- `choices`

**Validation rules**
- At least one of `media`, `detail`, or `expectedAnswers` should carry the listened content or recall target.
- If the learner must select from options after listening, `choices` may be present.
- If this is really pure teacher storytelling with later recall, keep the step focused on listening and follow it with `oral_quiz` or `speak_answer`.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.listenAnswer`
  - `LessonStepType.practice`
  - `SpeakerMode.listening`
- Runtime shows the prompt and optional first media cue as support/focus text.
- Works for short story listening, instruction-following, and auditory comprehension setup.

---

## `tap_choice`

**Purpose**
- Present a generic tap/select interaction that is not specifically image-based.

**Required fields**
- `id`
- `type = "tap_choice"`
- `prompt`
- `choices`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Validation rules**
- `choices.length` should be at least 2.
- At least 1 choice should have `isCorrect = true`.
- Use this when the response is tap-based but not semantically image-first.
- If all choices are image objects, `image_choice` is clearer and should be preferred.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.tapChoice`
  - `LessonStepType.practice`
  - `SpeakerMode.listening`
- Runtime treats it like a selectable-practice step.
- Suitable for text options, symbol taps, or simple multiple-choice interactions.

---

## `letter_intro`

**Purpose**
- Introduce a target letter or symbol with its sound and a first anchor example.

**Required fields**
- `id`
- `type = "letter_intro"`
- `prompt`

**Optional but strongly expected**
- `title`
- `durationMinutes`
- `detail`
- `evidence`
- `expectedAnswers`
- `tags`
- `facilitatorNotes`
- `media`

**Should usually be absent**
- `choices`

**Validation rules**
- `expectedAnswers[0]` should usually be the letter, sound, or canonical intro phrase.
- `media[0]` should preferably carry the visual focus cue for the letter if media is used.
- Keep the prompt short and model-first.

**Expected runtime behavior**
- Maps to:
  - `LessonActivityType.letterIntro`
  - `LessonStepType.intro`
  - `SpeakerMode.guiding`
- Tablet treats this as a guided introduction step.
- Best used at the start of phonics or symbol-recognition sequences.

---

## 4) What the LMS should enforce vs what the runtime currently does

### LMS authoring should enforce

- type-specific required fields
- one correct choice for choice-based activities
- non-empty `expectedAnswers` for open spoken-response activities
- media/choice consistency with the selected type
- single-step IDs unique within a lesson
- positive durations

### Learner runtime currently assumes

- the first media item is the meaningful one
- the first expected answer is the best target response
- missing open-response answers can fall back to choices or a generic default
- type drives step kind and speaker mode as follows:

| Type | Runtime activity | Step type | Speaker mode |
| --- | --- | --- | --- |
| `letter_intro` | `letterIntro` | `intro` | `guiding` |
| `listen_repeat` | `listenRepeat` | `intro` | `guiding` |
| `image_choice` | `imageChoice` | `practice` | `listening` |
| `word_build` | `wordBuild` | `practice` | `listening` |
| `tap_choice` | `tapChoice` | `practice` | `listening` |
| `listen_answer` | `listenAnswer` | `practice` | `listening` |
| `speak_answer` | `speakAnswer` | `reflection` | `listening` |
| `oral_quiz` | `oralQuiz` | `reflection` | `listening` |

---

## 5) Practical authoring defaults by type

If the LMS later adds type-aware forms, these should be the default field sets.

### Intro / modelling types
- `letter_intro`
- `listen_repeat`

Show prominently:
- title
- prompt
- minutes
- expected answers
- media cues
- facilitator notes
- detail
- evidence

Hide or de-emphasize:
- choices

### Open response / assessment types
- `speak_answer`
- `oral_quiz`
- `listen_answer`

Show prominently:
- title
- prompt
- minutes
- expected answers
- evidence
- facilitator notes
- detail
- media cues

Show choices only when intentionally used.

### Selection types
- `image_choice`
- `tap_choice`

Show prominently:
- title
- prompt
- minutes
- choices
- evidence
- expected answers
- media cues
- facilitator notes
- detail

Require at least one correct choice.

### Constructive practice type
- `word_build`

Show prominently:
- title
- prompt
- minutes
- expected answers
- evidence
- media cues
- facilitator notes
- detail
- optional choices

---

## 6) Current gaps / known limitations

1. The LMS editor is still mostly generic; it does not yet enforce type-specific required fields.
2. The learner runtime only consumes the first media item, so multi-cue authoring is not fully honored yet.
3. `detail`, `evidence`, `tags`, and `facilitatorNotes` are valuable in LMS authoring but are only partially reflected in the current learner runtime.
4. `tap_choice` exists in both LMS and learner runtime mappings, but current LMS presets use it less than other types, so it needs explicit QA coverage.
5. `listen_answer` can currently represent multiple listening-task shapes; if product wants clearer semantics later, it may need to split into more specific subtypes.

---

## 7) Source of truth in code today

- LMS shape: `apps/lms-web/lib/types.ts`
- LMS authoring UI: `apps/lms-web/components/lesson-create-form.tsx`
- LMS editor UI: `apps/lms-web/components/lesson-editor-form.tsx`
- English quick authoring presets: `apps/lms-web/components/english-studio-authoring-form.tsx`
- Learner runtime mapping: `apps/learner-tablet/lib/models.dart`

This doc is the implementation-ready contract those surfaces should follow until a shared typed schema package exists.
