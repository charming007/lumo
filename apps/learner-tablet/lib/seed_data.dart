import 'models.dart';

const learnerProfilesSeed = [
  LearnerProfile(
    id: 'student-1',
    name: 'Abdullahi',
    age: 8,
    cohort: 'Morning Cohort',
    streakDays: 5,
    guardianName: 'Hajiya Rabi',
    preferredLanguage: 'Hausa',
    readinessLabel: 'Voice-first beginner',
    village: 'Rigasa',
    guardianPhone: '08031234567',
    sex: 'Boy',
    baselineLevel: 'Can greet, needs prompt support',
    consentCaptured: true,
    learnerCode: 'ABD-MC08',
    caregiverRelationship: 'Mother',
    enrollmentStatus: 'Active',
    attendanceBand: 'Stable attendance',
    supportPlan: 'Use short prompts, repeat slowly once, then praise effort.',
    lastLessonSummary:
        'Completed greetings after one replay, then answered independently on the second try.',
    lastAttendance: 'Present this morning',
  ),
  LearnerProfile(
    id: 'student-2',
    name: 'Aisha',
    age: 9,
    cohort: 'Morning Cohort',
    streakDays: 3,
    guardianName: 'Malam Musa',
    preferredLanguage: 'Hausa + English',
    readinessLabel: 'Confident responder',
    village: 'Kawo',
    guardianPhone: '08039876543',
    sex: 'Girl',
    baselineLevel: 'Answers in short full sentences',
    consentCaptured: true,
    learnerCode: 'AIS-MC09',
    caregiverRelationship: 'Uncle',
    enrollmentStatus: 'Active',
    attendanceBand: 'Strong attendance',
    supportPlan: 'Move quickly to independent answers and short retells.',
    lastLessonSummary:
        'Retold the hygiene routine independently and asked to continue with the next story.',
    lastAttendance: 'Present yesterday',
  ),
  LearnerProfile(
    id: 'student-3',
    name: 'Usman',
    age: 11,
    cohort: 'Afternoon Cohort',
    streakDays: 7,
    guardianName: 'Hajiya Zainab',
    preferredLanguage: 'English',
    readinessLabel: 'Ready for guided practice',
    village: 'Sabon Gari',
    guardianPhone: '08035557788',
    sex: 'Boy',
    baselineLevel: 'Follows spoken instructions with one hint',
    consentCaptured: true,
    learnerCode: 'USM-AC11',
    caregiverRelationship: 'Aunt',
    enrollmentStatus: 'Active',
    attendanceBand: 'Needs occasional follow-up',
    supportPlan: 'Use one hint max, then ask for a full spoken answer.',
    lastLessonSummary:
        'Counted market oranges aloud, corrected one number, and finished with clear speech.',
    lastAttendance: 'Present this afternoon',
  ),
];

const learningModules = [
  LearningModule(
    id: 'english',
    title: 'English',
    description: 'Speak, listen, and build confidence in everyday English.',
    voicePrompt:
        'We will greet, repeat, and answer one step at a time using clear spoken English.',
    readinessGoal: 'Ready for simple spoken responses',
    badge: 'Voice lesson',
  ),
  LearningModule(
    id: 'math',
    title: 'Basic Mathematics',
    description: 'Count, compare, and solve simple number tasks.',
    voicePrompt:
        'Listen, count aloud, and answer with the next number or a short sentence.',
    readinessGoal: 'Ready for counting and comparison checks',
    badge: 'Count & answer',
  ),
  LearningModule(
    id: 'life-skills',
    title: 'Life Skills',
    description: 'Learn hygiene, safety, and healthy daily habits.',
    voicePrompt:
        'We learn by hearing, repeating, and connecting each habit to real home routines.',
    readinessGoal: 'Ready for habit-building routines',
    badge: 'Daily habit',
  ),
];

const assignedLessonsSeed = [
  LessonCardModel(
    id: 'lesson-1',
    moduleId: 'english',
    title: 'Greetings at the learning circle',
    subject: 'English',
    durationMinutes: 8,
    status: 'Assigned',
    mascotName: 'Mallam',
    readinessFocus: 'Hear a prompt and answer with a full sentence',
    scenario: 'The learner has just joined the circle and is meeting Mallam.',
    steps: [
      LessonStep(
        id: 'eng-1',
        type: LessonStepType.intro,
        title: 'Meet the letter A',
        instruction:
            'Mallam introduces the letter A, says its sound, and links it to a familiar word.',
        expectedResponse: 'A',
        acceptableResponses: [
          'Letter A',
          'A for ant',
          'a',
        ],
        coachPrompt: 'Look. This is A. Say A with me. A is for ant.',
        facilitatorTip:
            'Tap the letter card once, then let the learner repeat before adding the word.',
        realWorldCheck:
            'The learner can notice and repeat one focus letter before moving into choices.',
        speakerMode: SpeakerMode.guiding,
        activity: LessonActivity(
          type: LessonActivityType.letterIntro,
          prompt: 'Listen, then say the letter.',
          focusText: 'A',
          supportText: 'A is for ant',
          targetResponse: 'A',
        ),
      ),
      LessonStep(
        id: 'eng-2',
        type: LessonStepType.practice,
        title: 'Choose the ant picture',
        instruction:
            'The learner looks at simple picture choices and taps the one that matches the prompt.',
        expectedResponse: 'ant',
        acceptableResponses: ['the ant', 'ant picture'],
        coachPrompt: 'Find the ant. Tap the ant picture.',
        facilitatorTip:
            'Say the word once, then wait. Avoid pointing unless the learner is stuck.',
        realWorldCheck:
            'This checks whether the learner can connect the heard word to a visual choice.',
        speakerMode: SpeakerMode.listening,
        activity: LessonActivity(
          type: LessonActivityType.imageChoice,
          prompt: 'Tap the right picture.',
          focusText: 'ant',
          supportText: 'Listen: ant',
          choices: ['ant', 'ball', 'sun'],
          choiceEmoji: ['🐜', '⚽', '☀️'],
          targetResponse: 'ant',
        ),
      ),
      LessonStep(
        id: 'eng-3',
        type: LessonStepType.reflection,
        title: 'Say the full answer',
        instruction:
            'The learner says a short spoken sentence using the new word with a clear voice.',
        expectedResponse: 'A is for ant.',
        acceptableResponses: ['A for ant', 'It is ant', 'A is ant'],
        coachPrompt: 'Now say the full answer with me: A is for ant.',
        facilitatorTip:
            'Accept a close spoken match if the learner says the target words in order.',
        realWorldCheck:
            'This is the first tiny bridge from recognition into spoken production.',
        speakerMode: SpeakerMode.affirming,
        activity: LessonActivity(
          type: LessonActivityType.speakAnswer,
          prompt: 'Say it after Mallam.',
          focusText: 'A is for ant.',
          supportText: 'Use your clear English voice.',
          targetResponse: 'A is for ant.',
        ),
      ),
    ],
  ),
  LessonCardModel(
    id: 'lesson-2',
    moduleId: 'math',
    title: 'Counting oranges at the market',
    subject: 'Math',
    durationMinutes: 7,
    status: 'Assigned',
    mascotName: 'Mallam',
    readinessFocus: 'Track simple number order by listening and repeating',
    scenario:
        'The learner is helping count oranges into a small tray at the market.',
    steps: [
      LessonStep(
        id: 'math-1',
        type: LessonStepType.intro,
        title: 'Count together',
        instruction:
            'Mallam counts the first five oranges and invites the learner to join.',
        expectedResponse: '1, 2, 3, 4, 5',
        acceptableResponses: ['1 2 3 4 5', 'one two three four five'],
        coachPrompt:
            'Let’s count the oranges together: one, two, three, four, five.',
        facilitatorTip:
            'Tap five fingers on the table if the learner needs visual rhythm.',
        realWorldCheck:
            'The learner should match spoken counting with real objects nearby.',
        speakerMode: SpeakerMode.guiding,
      ),
      LessonStep(
        id: 'math-2',
        type: LessonStepType.prompt,
        title: 'Say the next number',
        instruction:
            'The learner listens to a number line and gives the missing next number.',
        expectedResponse: '6',
        acceptableResponses: ['six'],
        coachPrompt: 'One, two, three, four, five... what comes next?',
        facilitatorTip:
            'Hold up the next finger quietly before giving a verbal hint.',
        realWorldCheck:
            'If they answer quickly, they are ready for short counting checks in class routines.',
        speakerMode: SpeakerMode.listening,
      ),
      LessonStep(
        id: 'math-3',
        type: LessonStepType.celebration,
        title: 'Celebrate progress',
        instruction:
            'The learner says a complete confidence sentence about counting.',
        expectedResponse: 'I can count to ten.',
        acceptableResponses: ['I can count to 10', 'I can count'],
        coachPrompt: 'Now say it proudly: I can count to ten.',
        facilitatorTip:
            'Use a thumbs-up first so the learner shifts from guessing into celebration.',
        realWorldCheck:
            'This phrase is useful before moving them into longer number sequences.',
        speakerMode: SpeakerMode.affirming,
      ),
    ],
  ),
  LessonCardModel(
    id: 'lesson-3',
    moduleId: 'life-skills',
    title: 'Handwashing before food',
    subject: 'Life Skills',
    durationMinutes: 6,
    status: 'Assigned',
    mascotName: 'Mallam',
    readinessFocus: 'Follow spoken hygiene steps in sequence',
    scenario:
        'The learner is getting ready to eat after play and needs the routine in order.',
    steps: [
      LessonStep(
        id: 'life-1',
        type: LessonStepType.intro,
        title: 'When do we wash?',
        instruction:
            'Mallam ties handwashing to eating time and using the toilet.',
        expectedResponse: 'Before eating and after toilet.',
        acceptableResponses: [
          'Before eating and after using the toilet',
          'Before eating and after toilet',
        ],
        coachPrompt:
            'We wash our hands before eating and after using the toilet. Say it with me.',
        facilitatorTip:
            'Gesture toward food or the washing area to connect the words to a real routine.',
        realWorldCheck:
            'The learner should link the routine to two moments in the day.',
        speakerMode: SpeakerMode.guiding,
      ),
      LessonStep(
        id: 'life-2',
        type: LessonStepType.practice,
        title: 'Repeat the routine',
        instruction:
            'The learner repeats the handwashing steps in the correct order.',
        expectedResponse: 'Water, soap, rub, rinse, dry.',
        acceptableResponses: [
          'Water soap rub rinse dry',
          'Soap, rub, rinse, dry'
        ],
        coachPrompt: 'Say the steps with me: water, soap, rub, rinse, dry.',
        facilitatorTip:
            'Mime each action once instead of interrupting with too many words.',
        realWorldCheck:
            'A correct sequence suggests they can follow the same routine at the tap.',
        speakerMode: SpeakerMode.listening,
      ),
      LessonStep(
        id: 'life-3',
        type: LessonStepType.reflection,
        title: 'Personal promise',
        instruction:
            'The learner finishes with a simple personal commitment sentence.',
        expectedResponse: 'I will wash my hands every day.',
        acceptableResponses: ['I will wash my hands', 'I will wash every day'],
        coachPrompt: 'Now say: I will wash my hands every day.',
        facilitatorTip:
            'Pause after “I will” so the learner owns the final promise.',
        realWorldCheck:
            'This makes the routine feel personal instead of just repeated words.',
        speakerMode: SpeakerMode.waiting,
      ),
    ],
  ),
];
