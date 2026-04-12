const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.LUMO_DATA_FILE
  ? path.resolve(process.env.LUMO_DATA_FILE)
  : path.resolve(__dirname, '..', 'data', 'store.json');

const seed = {
  organizations: [
    { id: 'org-1', name: 'Lumo Pilot Program', country: 'Nigeria', timezone: 'Africa/Lagos' },
  ],
  centers: [
    { id: 'center-1', organizationId: 'org-1', name: 'Kano Learning Center A', region: 'Kano', deliveryModel: 'community-hub' },
    { id: 'center-2', organizationId: 'org-1', name: 'Kaduna Learning Center B', region: 'Kaduna', deliveryModel: 'community-hub' },
  ],
  pods: [
    {
      id: 'pod-1',
      centerId: 'center-1',
      code: 'KANO-01',
      label: 'Kano Pod 01',
      type: 'solar-container',
      status: 'active',
      capacity: 36,
      learnersActive: 32,
      connectivity: 'sync-daily',
      mallamIds: ['teacher-1'],
    },
    {
      id: 'pod-2',
      centerId: 'center-2',
      code: 'KAD-01',
      label: 'Kaduna Pod 01',
      type: 'classroom-kit',
      status: 'pilot',
      capacity: 28,
      learnersActive: 19,
      connectivity: 'offline-first',
      mallamIds: ['teacher-2'],
    },
  ],
  cohorts: [
    { id: 'cohort-1', centerId: 'center-1', podId: 'pod-1', name: 'Morning Cohort', ageRange: '8-10', deliveryWindow: '08:00-10:00' },
    { id: 'cohort-2', centerId: 'center-1', podId: 'pod-1', name: 'Afternoon Cohort', ageRange: '10-12', deliveryWindow: '13:00-15:00' },
    { id: 'cohort-3', centerId: 'center-2', podId: 'pod-2', name: 'Bridge Cohort', ageRange: '9-11', deliveryWindow: '09:00-11:00' },
  ],
  teachers: [
    {
      id: 'teacher-1',
      centerId: 'center-1',
      podIds: ['pod-1'],
      name: 'Amina Yusuf',
      displayName: 'Mallama Amina Yusuf',
      role: 'mallam-lead',
      status: 'active',
      languages: ['Hausa', 'English'],
      learnerCount: 34,
      certificationLevel: 'Level 2',
    },
    {
      id: 'teacher-2',
      centerId: 'center-2',
      podIds: ['pod-2'],
      name: 'Musa Ibrahim',
      displayName: 'Mallam Musa Ibrahim',
      role: 'facilitator',
      status: 'training',
      languages: ['Hausa', 'English', 'Fulfulde'],
      learnerCount: 19,
      certificationLevel: 'Level 1',
    },
  ],
  students: [
    {
      id: 'student-1',
      cohortId: 'cohort-1',
      podId: 'pod-1',
      mallamId: 'teacher-1',
      name: 'Abdullahi',
      age: 8,
      gender: 'male',
      level: 'beginner',
      stage: 'foundation-a',
      attendanceRate: 0.92,
      guardianName: 'Mariya Abdullahi',
      deviceAccess: 'shared-tablet',
    },
    {
      id: 'student-2',
      cohortId: 'cohort-1',
      podId: 'pod-1',
      mallamId: 'teacher-1',
      name: 'Aisha',
      age: 9,
      gender: 'female',
      level: 'beginner',
      stage: 'foundation-a',
      attendanceRate: 0.88,
      guardianName: 'Bala Aisha',
      deviceAccess: 'shared-tablet',
    },
    {
      id: 'student-3',
      cohortId: 'cohort-2',
      podId: 'pod-1',
      mallamId: 'teacher-1',
      name: 'Usman',
      age: 11,
      gender: 'male',
      level: 'emerging',
      stage: 'foundation-b',
      attendanceRate: 0.81,
      guardianName: 'Rabi Usman',
      deviceAccess: 'shared-tablet',
    },
    {
      id: 'student-4',
      cohortId: 'cohort-3',
      podId: 'pod-2',
      mallamId: 'teacher-2',
      name: 'Zainab',
      age: 12,
      gender: 'female',
      level: 'emerging',
      stage: 'bridge',
      attendanceRate: 0.95,
      guardianName: 'Sani Zainab',
      deviceAccess: 'shared-tablet',
    },
  ],
  subjects: [
    { id: 'english', name: 'Foundational English', icon: 'record_voice_over', order: 1 },
    { id: 'math', name: 'Basic Numeracy', icon: 'calculate', order: 2 },
    { id: 'life-skills', name: 'Life Skills', icon: 'favorite', order: 3 },
  ],
  strands: [
    { id: 'strand-1', subjectId: 'english', name: 'Listening & Speaking', order: 1 },
    { id: 'strand-4', subjectId: 'english', name: 'Phonics & Word Building', order: 2 },
    { id: 'strand-2', subjectId: 'math', name: 'Number Sense', order: 1 },
    { id: 'strand-5', subjectId: 'math', name: 'Operations & Problem Solving', order: 2 },
    { id: 'strand-3', subjectId: 'life-skills', name: 'Health & Hygiene', order: 1 },
  ],
  modules: [
    { id: 'module-1', strandId: 'strand-1', level: 'beginner', title: 'Greetings & Identity', lessonCount: 4, order: 1, status: 'published' },
    { id: 'module-4', strandId: 'strand-1', level: 'emerging', title: 'Daily Conversation', lessonCount: 4, order: 2, status: 'review' },
    { id: 'module-5', strandId: 'strand-4', level: 'beginner', title: 'Letter Sounds & First Words', lessonCount: 4, order: 1, status: 'published' },
    { id: 'module-6', strandId: 'strand-4', level: 'emerging', title: 'Blending & Reading Short Sentences', lessonCount: 4, order: 2, status: 'draft' },
    { id: 'module-2', strandId: 'strand-2', level: 'beginner', title: 'Counting & Quantity', lessonCount: 4, order: 1, status: 'published' },
    { id: 'module-7', strandId: 'strand-2', level: 'emerging', title: 'Place Value to 100', lessonCount: 4, order: 2, status: 'published' },
    { id: 'module-8', strandId: 'strand-5', level: 'beginner', title: 'Addition & Subtraction Stories', lessonCount: 4, order: 1, status: 'review' },
    { id: 'module-3', strandId: 'strand-3', level: 'beginner', title: 'Healthy Habits', lessonCount: 3, order: 1, status: 'published' },
  ],
  lessons: [
    {
      id: 'lesson-1',
      subjectId: 'english',
      moduleId: 'module-1',
      title: 'Greetings and Introductions',
      durationMinutes: 8,
      mode: 'guided',
      status: 'approved',
      targetAgeRange: '8-10',
      voicePersona: 'friendly-guide-a',
      learningObjectives: ['Respond to common greetings', 'Introduce yourself in a full sentence'],
      activitySteps: [
        {
          id: 'lesson-1-step-1',
          type: 'listen_repeat',
          prompt: 'Hello. My name is Lumo.',
          expectedAnswers: ['Hello', 'My name is'],
          successFeedback: 'Nice. Say it again with confidence.',
          retryFeedback: 'Try again. Start with hello.',
        },
        {
          id: 'lesson-1-step-2',
          type: 'speak_answer',
          prompt: 'What is your name?',
          hint: 'Say: My name is...',
          expectedAnswers: ['My name is'],
          successFeedback: 'Great job. You introduced yourself.',
          retryFeedback: 'Let\'s try one more time. Say: My name is...',
        },
      ],
    },
    { id: 'lesson-5', subjectId: 'english', moduleId: 'module-1', title: 'My Name and Your Name', durationMinutes: 9, mode: 'guided', status: 'approved' },
    { id: 'lesson-6', subjectId: 'english', moduleId: 'module-1', title: 'People at Home and School', durationMinutes: 10, mode: 'guided', status: 'published' },
    { id: 'lesson-7', subjectId: 'english', moduleId: 'module-1', title: 'Speaking in Full Sentences', durationMinutes: 10, mode: 'guided', status: 'published' },
    { id: 'lesson-4', subjectId: 'english', moduleId: 'module-4', title: 'Daily Vocabulary Practice', durationMinutes: 9, mode: 'guided', status: 'draft' },
    { id: 'lesson-8', subjectId: 'english', moduleId: 'module-4', title: 'Asking for Help Politely', durationMinutes: 8, mode: 'guided', status: 'review' },
    { id: 'lesson-9', subjectId: 'english', moduleId: 'module-4', title: 'Talking About Feelings', durationMinutes: 9, mode: 'guided', status: 'review' },
    { id: 'lesson-10', subjectId: 'english', moduleId: 'module-4', title: 'School Day Conversations', durationMinutes: 10, mode: 'guided', status: 'draft' },
    {
      id: 'lesson-11',
      subjectId: 'english',
      moduleId: 'module-5',
      title: 'Letter Sounds A to M',
      durationMinutes: 5,
      mode: 'guided',
      status: 'approved',
      targetAgeRange: '6-9',
      voicePersona: 'phonic-coach-a',
      learningObjectives: ['Recognize the target letter sound', 'Match the sound to a familiar picture'],
      localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'ha'],
        translations: {
          en: {
            title: 'Letter Sounds A to M',
            coachIntro: 'Let us learn the letter sound and match it to a picture.',
          },
          ha: {
            title: 'Sautin Haruffa A zuwa M',
            coachIntro: 'Mu koyi sautin harafin sannan mu hada shi da hoto.',
          },
        },
      },
      lessonAssessment: {
        id: 'lesson-11-check',
        title: 'Quick Letter Sound Check',
        completionMode: 'end-of-lesson',
        passingScore: 0.67,
        items: [
          {
            id: 'lesson-11-check-1',
            prompt: 'Point to the picture that starts with A.',
            promptTranslations: { ha: 'Nuna hoton da yake farawa da A.' },
            skill: 'object-word-match',
            choices: ['apple', 'ball', 'sun'],
            correctChoice: 'apple',
          },
          {
            id: 'lesson-11-check-2',
            prompt: 'Say the sound for A.',
            promptTranslations: { ha: 'Fadi sautin harafin A.' },
            skill: 'phonics',
            expectedAnswers: ['/a/', 'a'],
          },
        ],
      },
      activitySteps: [
        {
          id: 'lesson-11-step-1',
          type: 'letter_intro',
          prompt: 'This is the letter A. It says /a/.',
          promptTranslations: { ha: 'Wannan harafin A ne. Yana fadin /a/.' },
          hint: 'Open your mouth wide and say /a/.',
          hintTranslations: { ha: 'Bude baki sosai ka ce /a/.' },
          media: [{ kind: 'letter-card', value: 'A' }],
          successFeedback: 'Good. A says /a/.',
        },
        {
          id: 'lesson-11-step-2',
          type: 'image_choice',
          prompt: 'Tap the picture that starts with /a/.',
          choices: [
            { id: 'apple', label: 'Apple', media: { kind: 'image', value: 'apple' }, isCorrect: true },
            { id: 'ball', label: 'Ball', media: { kind: 'image', value: 'ball' } },
            { id: 'sun', label: 'Sun', media: { kind: 'image', value: 'sun' } },
          ],
          successFeedback: 'Yes. Apple starts with /a/.',
          retryFeedback: 'Listen again. Which word starts with /a/?',
        },
        {
          id: 'lesson-11-step-3',
          type: 'speak_answer',
          prompt: 'Say the sound for A.',
          expectedAnswers: ['/a/', 'a'],
          successFeedback: 'Strong voice. That is the A sound.',
        },
      ],
    },
    {
      id: 'lesson-12',
      subjectId: 'english',
      moduleId: 'module-5',
      title: 'Letter Sounds N to Z',
      durationMinutes: 5,
      mode: 'guided',
      status: 'approved',
      targetAgeRange: '6-9',
      voicePersona: 'phonic-coach-a',
      learningObjectives: ['Recognize later alphabet sounds', 'Say the matching sound aloud'],
      localization: {
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'ha'],
        translations: { en: { title: 'Letter Sounds N to Z' }, ha: { title: 'Sautin Haruffa N zuwa Z' } },
      },
      lessonAssessment: {
        id: 'lesson-12-check',
        title: 'Quick Alphabet Sound Check',
        completionMode: 'end-of-lesson',
        passingScore: 0.67,
        items: [
          {
            id: 'lesson-12-check-1',
            prompt: 'Tap the picture that starts with N.',
            promptTranslations: { ha: 'Danna hoton da yake farawa da N.' },
            skill: 'object-word-match',
            choices: ['net', 'goat', 'cup'],
            correctChoice: 'net',
          },
          {
            id: 'lesson-12-check-2',
            prompt: 'Say the sound for N.',
            promptTranslations: { ha: 'Fadi sautin harafin N.' },
            skill: 'phonics',
            expectedAnswers: ['/n/', 'n'],
          },
        ],
      },
      activitySteps: [
        { id: 'lesson-12-step-1', type: 'letter_intro', prompt: 'This is the letter N. It says /n/.', media: [{ kind: 'letter-card', value: 'N' }], successFeedback: 'Good. N says /n/.' },
        {
          id: 'lesson-12-step-2',
          type: 'image_choice',
          prompt: 'Tap the picture that starts with /n/.',
          choices: [
            { id: 'net', label: 'Net', media: { kind: 'image', value: 'net' }, isCorrect: true },
            { id: 'goat', label: 'Goat', media: { kind: 'image', value: 'goat' } },
            { id: 'cup', label: 'Cup', media: { kind: 'image', value: 'cup' } },
          ],
          successFeedback: 'Correct. Net starts with /n/.',
        },
        { id: 'lesson-12-step-3', type: 'speak_answer', prompt: 'Say the sound for N.', expectedAnswers: ['/n/', 'n'], successFeedback: 'Excellent. Keep that sound clear.' },
      ],
    },
    {
      id: 'lesson-13',
      subjectId: 'english',
      moduleId: 'module-5',
      title: 'Building CVC Words',
      durationMinutes: 5,
      mode: 'practice',
      status: 'published',
      targetAgeRange: '7-10',
      voicePersona: 'phonic-coach-b',
      learningObjectives: ['Blend three sounds into a short word', 'Say the completed CVC word aloud'],
      localization: { defaultLanguage: 'en', supportedLanguages: ['en', 'ha'], translations: { en: { title: 'Building CVC Words' }, ha: { title: 'Gina Kalmomin CVC' } } },
      lessonAssessment: {
        id: 'lesson-13-check',
        title: 'Quick CVC Check',
        completionMode: 'end-of-lesson',
        passingScore: 0.67,
        items: [
          { id: 'lesson-13-check-1', prompt: 'Build the word c-a-t.', promptTranslations: { ha: 'Gina kalmar c-a-t.' }, skill: 'cvc-build', expectedAnswers: ['cat'] },
          { id: 'lesson-13-check-2', prompt: 'Choose the picture for cat.', promptTranslations: { ha: 'Zabi hoton kalmar cat.' }, skill: 'object-word-match', choices: ['cat', 'cap', 'bus'], correctChoice: 'cat' },
        ],
      },
      activitySteps: [
        { id: 'lesson-13-step-1', type: 'word_build', prompt: 'Put the sounds together: c - a - t.', media: [{ kind: 'letter-tiles', value: ['c', 'a', 't'] }], expectedAnswers: ['cat'], successFeedback: 'Yes. c-a-t makes cat.' },
        { id: 'lesson-13-step-2', type: 'image_choice', prompt: 'Tap the picture for cat.', choices: [{ id: 'cat', label: 'Cat', media: { kind: 'image', value: 'cat' }, isCorrect: true }, { id: 'cap', label: 'Cap', media: { kind: 'image', value: 'cap' } }, { id: 'bus', label: 'Bus', media: { kind: 'image', value: 'bus' } }] },
        { id: 'lesson-13-step-3', type: 'speak_answer', prompt: 'Say the word cat.', expectedAnswers: ['cat'], successFeedback: 'Good reading. You said cat.' },
      ],
    },
    {
      id: 'lesson-14',
      subjectId: 'english',
      moduleId: 'module-5',
      title: 'Read and Match First Words',
      durationMinutes: 5,
      mode: 'practice',
      status: 'published',
      targetAgeRange: '7-10',
      voicePersona: 'reading-guide-a',
      learningObjectives: ['Read a short word', 'Match a spoken word to the correct image'],
      localization: { defaultLanguage: 'en', supportedLanguages: ['en', 'ha'], translations: { en: { title: 'Read and Match First Words' }, ha: { title: 'Karanta ka Hada Kalmomin Farko' } } },
      lessonAssessment: {
        id: 'lesson-14-check',
        title: 'Quick Read and Match Check',
        completionMode: 'end-of-lesson',
        passingScore: 0.67,
        items: [
          { id: 'lesson-14-check-1', prompt: 'Read the word sun.', promptTranslations: { ha: 'Karanta kalmar sun.' }, skill: 'word-reading', expectedAnswers: ['sun'] },
          { id: 'lesson-14-check-2', prompt: 'Tap the picture for sun.', promptTranslations: { ha: 'Danna hoton kalmar sun.' }, skill: 'object-word-match', choices: ['sun', 'mat', 'hen'], correctChoice: 'sun' },
        ],
      },
      activitySteps: [
        { id: 'lesson-14-step-1', type: 'listen_repeat', prompt: 'Read this word: sun.', expectedAnswers: ['sun'], media: [{ kind: 'word-card', value: 'sun' }] },
        { id: 'lesson-14-step-2', type: 'image_choice', prompt: 'Tap the picture for sun.', choices: [{ id: 'sun', label: 'Sun', media: { kind: 'image', value: 'sun' }, isCorrect: true }, { id: 'mat', label: 'Mat', media: { kind: 'image', value: 'mat' } }, { id: 'hen', label: 'Hen', media: { kind: 'image', value: 'hen' } }] },
      ],
    },
    { id: 'lesson-15', subjectId: 'english', moduleId: 'module-6', title: 'Blend Sounds Into Short Words', durationMinutes: 10, mode: 'practice', status: 'draft' },
    { id: 'lesson-16', subjectId: 'english', moduleId: 'module-6', title: 'Read Short Sentences Aloud', durationMinutes: 11, mode: 'practice', status: 'draft' },
    { id: 'lesson-2', subjectId: 'math', moduleId: 'module-2', title: 'Counting from 1 to 10', durationMinutes: 7, mode: 'guided', status: 'approved' },
    { id: 'lesson-17', subjectId: 'math', moduleId: 'module-2', title: 'Matching Numbers to Objects', durationMinutes: 8, mode: 'guided', status: 'approved' },
    { id: 'lesson-18', subjectId: 'math', moduleId: 'module-2', title: 'Comparing More and Less', durationMinutes: 9, mode: 'practice', status: 'published' },
    { id: 'lesson-19', subjectId: 'math', moduleId: 'module-2', title: 'Count Forward and Backward', durationMinutes: 8, mode: 'practice', status: 'published' },
    { id: 'lesson-20', subjectId: 'math', moduleId: 'module-7', title: 'Tens and Ones with Bundles', durationMinutes: 10, mode: 'guided', status: 'approved' },
    { id: 'lesson-21', subjectId: 'math', moduleId: 'module-7', title: 'Build Numbers to 50', durationMinutes: 10, mode: 'guided', status: 'approved' },
    { id: 'lesson-22', subjectId: 'math', moduleId: 'module-7', title: 'Read and Write Numbers to 100', durationMinutes: 11, mode: 'practice', status: 'published' },
    { id: 'lesson-23', subjectId: 'math', moduleId: 'module-7', title: 'Compare Two-Digit Numbers', durationMinutes: 11, mode: 'practice', status: 'published' },
    { id: 'lesson-24', subjectId: 'math', moduleId: 'module-8', title: 'Add Within 10 Using Objects', durationMinutes: 10, mode: 'guided', status: 'review' },
    { id: 'lesson-25', subjectId: 'math', moduleId: 'module-8', title: 'Subtract Within 10 Using Stories', durationMinutes: 10, mode: 'guided', status: 'review' },
    { id: 'lesson-3', subjectId: 'life-skills', moduleId: 'module-3', title: 'Handwashing Basics', durationMinutes: 6, mode: 'guided', status: 'approved' },
    { id: 'lesson-26', subjectId: 'life-skills', moduleId: 'module-3', title: 'Clean Water and Safe Cups', durationMinutes: 7, mode: 'guided', status: 'approved' },
    { id: 'lesson-27', subjectId: 'life-skills', moduleId: 'module-3', title: 'Daily Routines for Health', durationMinutes: 8, mode: 'practice', status: 'published' },
  ],
  assessments: [
    { id: 'assessment-1', moduleId: 'module-1', subjectId: 'english', title: 'English Beginner Test 1', kind: 'automatic', trigger: 'module-complete', triggerLabel: 'After Greetings & Identity', progressionGate: 'foundation-a', passingScore: 0.65, status: 'active' },
    { id: 'assessment-2', moduleId: 'module-2', subjectId: 'math', title: 'Math Counting Check', kind: 'automatic', trigger: 'lesson-cluster', triggerLabel: 'After counting lessons', progressionGate: 'foundation-a', passingScore: 0.6, status: 'active' },
    { id: 'assessment-3', moduleId: 'module-3', subjectId: 'life-skills', title: 'Life Skills Oral Review', kind: 'manual', trigger: 'mallam-review', triggerLabel: 'Mallam triggered', progressionGate: 'foundation-b', passingScore: 0.7, status: 'active' },
    {
      id: 'assessment-4', moduleId: 'module-5', subjectId: 'english', title: 'Phonics Fluency Check', kind: 'automatic', trigger: 'module-complete', triggerLabel: 'After Letter Sounds & First Words', progressionGate: 'foundation-b', passingScore: 0.7, status: 'active',
      items: [
        { id: 'assessment-4-item-1', prompt: 'Match the sound /a/ to the correct picture.', promptTranslations: { ha: 'Hada sautin /a/ da hoton da ya dace.' }, skill: 'object-word-match', choices: ['apple', 'ball', 'sun'], correctChoice: 'apple' },
        { id: 'assessment-4-item-2', prompt: 'Say the sound for N.', promptTranslations: { ha: 'Fadi sautin harafin N.' }, skill: 'phonics', expectedAnswers: ['/n/', 'n'] },
        { id: 'assessment-4-item-3', prompt: 'Build the word c-a-t.', promptTranslations: { ha: 'Gina kalmar c-a-t.' }, skill: 'cvc-build', expectedAnswers: ['cat'] },
        { id: 'assessment-4-item-4', prompt: 'Tap the picture for sun.', promptTranslations: { ha: 'Danna hoton kalmar sun.' }, skill: 'word-reading', choices: ['sun', 'mat', 'hen'], correctChoice: 'sun' },
      ],
    },
    { id: 'assessment-5', moduleId: 'module-7', subjectId: 'math', title: 'Place Value Exit Ticket', kind: 'automatic', trigger: 'module-complete', triggerLabel: 'After Place Value to 100', progressionGate: 'bridge', passingScore: 0.68, status: 'active' },
    { id: 'assessment-6', moduleId: 'module-8', subjectId: 'math', title: 'Word Problem Oral Check', kind: 'manual', trigger: 'mallam-review', triggerLabel: 'After addition/subtraction stories', progressionGate: 'bridge', passingScore: 0.7, status: 'draft' },
  ],
  assignments: [
    { id: 'assignment-1', cohortId: 'cohort-1', lessonId: 'lesson-1', assignedBy: 'teacher-1', dueDate: '2026-04-12', status: 'active', podId: 'pod-1', assessmentId: 'assessment-1', assignedAt: '2026-04-09T08:00:00Z' },
    { id: 'assignment-2', cohortId: 'cohort-1', lessonId: 'lesson-11', assignedBy: 'teacher-1', dueDate: '2026-04-13', status: 'active', podId: 'pod-1', assessmentId: 'assessment-4', assignedAt: '2026-04-09T08:10:00Z' },
    { id: 'assignment-3', cohortId: 'cohort-3', lessonId: 'lesson-20', assignedBy: 'teacher-2', dueDate: '2026-04-14', status: 'active', podId: 'pod-2', assessmentId: 'assessment-5', assignedAt: '2026-04-09T08:20:00Z' },
    { id: 'assignment-4', cohortId: 'cohort-2', lessonId: 'lesson-24', assignedBy: 'teacher-1', dueDate: '2026-04-16', status: 'scheduled', podId: 'pod-1', assessmentId: 'assessment-6', assignedAt: '2026-04-10T09:00:00Z' },
    { id: 'assignment-5', cohortId: 'cohort-3', lessonId: 'lesson-27', assignedBy: 'teacher-2', dueDate: '2026-04-15', status: 'active', podId: 'pod-2', assessmentId: 'assessment-3', assignedAt: '2026-04-10T10:30:00Z' },
  ],
  attendance: [
    { id: 'attendance-1', studentId: 'student-1', date: '2026-04-09', status: 'present' },
    { id: 'attendance-2', studentId: 'student-2', date: '2026-04-09', status: 'present' },
    { id: 'attendance-3', studentId: 'student-3', date: '2026-04-09', status: 'absent' },
    { id: 'attendance-4', studentId: 'student-4', date: '2026-04-09', status: 'present' },
  ],
  observations: [
    { id: 'obs-1', studentId: 'student-1', teacherId: 'teacher-1', note: 'Responds confidently to spoken greetings.', competencyTag: 'listening-speaking', supportLevel: 'independent', createdAt: '2026-04-09T10:00:00Z' },
    { id: 'obs-2', studentId: 'student-3', teacherId: 'teacher-2', note: 'Needs repetition support for counting exercises.', competencyTag: 'number-sense', supportLevel: 'guided', createdAt: '2026-04-09T11:00:00Z' },
    { id: 'obs-3', studentId: 'student-4', teacherId: 'teacher-2', note: 'Can explain tens and ones clearly with counters.', competencyTag: 'place-value', supportLevel: 'independent', createdAt: '2026-04-10T09:45:00Z' },
  ],
  progress: [
    { id: 'progress-1', studentId: 'student-1', subjectId: 'english', moduleId: 'module-1', assessmentId: 'assessment-1', mastery: 0.61, lessonsCompleted: 6, progressionStatus: 'on-track', recommendedNextModuleId: 'module-5', lastActiveAt: '2026-04-09T09:30:00Z' },
    { id: 'progress-2', studentId: 'student-2', subjectId: 'english', moduleId: 'module-5', assessmentId: 'assessment-4', mastery: 0.54, lessonsCompleted: 4, progressionStatus: 'watch', recommendedNextModuleId: 'module-5', lastActiveAt: '2026-04-09T09:35:00Z' },
    { id: 'progress-3', studentId: 'student-3', subjectId: 'math', moduleId: 'module-2', assessmentId: 'assessment-2', mastery: 0.72, lessonsCompleted: 5, progressionStatus: 'ready', recommendedNextModuleId: 'module-7', lastActiveAt: '2026-04-08T13:10:00Z' },
    { id: 'progress-4', studentId: 'student-4', subjectId: 'math', moduleId: 'module-7', assessmentId: 'assessment-5', mastery: 0.79, lessonsCompleted: 8, progressionStatus: 'ready', recommendedNextModuleId: 'module-8', lastActiveAt: '2026-04-09T12:15:00Z' },
  ],
  syncEvents: [],
  lessonSessions: [],
  sessionEventLog: [],
  rewardTransactions: [
    { id: 'reward-1', studentId: 'student-1', kind: 'lesson_completed', xpDelta: 24, label: 'Early practice boost', createdAt: '2026-04-09T09:30:00Z' },
    { id: 'reward-2', studentId: 'student-1', kind: 'badge_awarded', badgeId: 'first-lesson', xpDelta: 0, label: 'First Light', createdAt: '2026-04-09T09:31:00Z' },
    { id: 'reward-3', studentId: 'student-3', kind: 'lesson_completed', xpDelta: 15, label: 'Math momentum', createdAt: '2026-04-08T13:10:00Z' },
  ],
};

const data = { ...seed };

function ensureDir() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hydrate() {
  ensureDir();

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }

  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  Object.keys(seed).forEach((key) => {
    data[key] = Array.isArray(parsed[key]) ? parsed[key] : clone(seed[key]);
  });
}

function persist() {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

hydrate();

data.persist = persist;
data.__meta = {
  file: DATA_FILE,
};

module.exports = data;
