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
  LearningModule(
    id: 'story',
    title: 'Story Time',
    description: 'Listen, imagine, and answer guided story questions.',
    voicePrompt:
        'Listen closely to the short story, then tell me what happened in your own words.',
    readinessGoal: 'Ready for recall and speaking confidence',
    badge: 'Listen & retell',
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
        title: 'Warm welcome',
        instruction:
            'Mallam greets first, pauses, and lets the learner answer with their name.',
        expectedResponse: 'Wa alaikum salam. My name is Abdullahi.',
        coachPrompt:
            'Assalamu alaikum. Welcome to Lumo. Please tell me your name clearly.',
        facilitatorTip:
            'Point gently to the learner’s chest if they need help understanding “my name is”.',
        realWorldCheck:
            'Use this when a new learner joins the tablet or circle.',
        speakerMode: SpeakerMode.guiding,
      ),
      LessonStep(
        id: 'eng-2',
        type: LessonStepType.practice,
        title: 'Say your name clearly',
        instruction:
            'The learner repeats their name in one full sentence and steadier voice.',
        expectedResponse: 'My name is ____.',
        coachPrompt: 'Good job. Now say the full sentence: My name is Aisha.',
        facilitatorTip:
            'Model once, then ask for a slower second try if the first answer is rushed.',
        realWorldCheck:
            'The learner should be able to introduce themselves to another child or visitor.',
        speakerMode: SpeakerMode.listening,
      ),
      LessonStep(
        id: 'eng-3',
        type: LessonStepType.reflection,
        title: 'Confidence check',
        instruction:
            'Mallam praises effort and checks if the learner is ready to continue.',
        expectedResponse: 'Yes, I am ready.',
        coachPrompt: 'Excellent speaking. Are you ready for the next question?',
        facilitatorTip:
            'If the learner is shy, nod and smile before replaying the question.',
        realWorldCheck:
            'A confident yes here usually means the learner can continue without extra settling time.',
        speakerMode: SpeakerMode.affirming,
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
        coachPrompt: 'Let us count the oranges together from one to five.',
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
        coachPrompt: 'Well done. Tell me with confidence: I can count to ten.',
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
        coachPrompt: 'Now say: I will wash my hands every day.',
        facilitatorTip:
            'Pause after “I will” so the learner owns the final promise.',
        realWorldCheck:
            'This makes the routine feel personal instead of just repeated words.',
        speakerMode: SpeakerMode.waiting,
      ),
    ],
  ),
  LessonCardModel(
    id: 'lesson-4',
    moduleId: 'story',
    title: 'Short story: Zainab and the red cup',
    subject: 'Story Time',
    durationMinutes: 9,
    status: 'Assigned',
    mascotName: 'Mallam',
    readinessFocus: 'Recall one key detail and retell with confidence',
    scenario:
        'The learner listens to a familiar home story and pulls out key details.',
    steps: [
      LessonStep(
        id: 'story-1',
        type: LessonStepType.intro,
        title: 'Listen for the object',
        instruction:
            'Mallam tells a one-line story and asks the learner to notice the object.',
        expectedResponse: 'A red cup.',
        coachPrompt:
            'Listen: Zainab carried a red cup to her mother. What did Zainab carry?',
        facilitatorTip:
            'Repeat only the final sentence if the learner misses the object.',
        realWorldCheck:
            'This checks attention to a concrete story detail, not just repetition.',
        speakerMode: SpeakerMode.guiding,
      ),
      LessonStep(
        id: 'story-2',
        type: LessonStepType.practice,
        title: 'Say who received it',
        instruction: 'The learner adds the second detail from the same story.',
        expectedResponse: 'She carried it to her mother.',
        coachPrompt: 'Good. Who did she carry it to?',
        facilitatorTip: 'If needed, offer the first word “mother...” and wait.',
        realWorldCheck:
            'A correct answer shows early retell ability, not just echoing the first noun.',
        speakerMode: SpeakerMode.listening,
      ),
      LessonStep(
        id: 'story-3',
        type: LessonStepType.celebration,
        title: 'Retell the full line',
        instruction:
            'The learner combines both details into one short retell sentence.',
        expectedResponse: 'Zainab carried a red cup to her mother.',
        coachPrompt: 'Excellent. Now tell the full story in one sentence.',
        facilitatorTip:
            'Accept a near match if the learner preserves the key meaning.',
        realWorldCheck:
            'This is the strongest signal that the learner is ready for richer story lessons.',
        speakerMode: SpeakerMode.affirming,
      ),
    ],
  ),
];
