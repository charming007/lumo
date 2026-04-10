const organizations = [
  { id: 'org-1', name: 'Lumo Pilot Program', country: 'Nigeria', timezone: 'Africa/Lagos' },
];

const centers = [
  { id: 'center-1', organizationId: 'org-1', name: 'Kano Learning Center A', region: 'Kano', deliveryModel: 'community-hub' },
  { id: 'center-2', organizationId: 'org-1', name: 'Kaduna Learning Center B', region: 'Kaduna', deliveryModel: 'community-hub' },
];

const pods = [
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
];

const cohorts = [
  { id: 'cohort-1', centerId: 'center-1', podId: 'pod-1', name: 'Morning Cohort', ageRange: '8-10', deliveryWindow: '08:00-10:00' },
  { id: 'cohort-2', centerId: 'center-1', podId: 'pod-1', name: 'Afternoon Cohort', ageRange: '10-12', deliveryWindow: '13:00-15:00' },
  { id: 'cohort-3', centerId: 'center-2', podId: 'pod-2', name: 'Bridge Cohort', ageRange: '9-11', deliveryWindow: '09:00-11:00' },
];

const teachers = [
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
];

const students = [
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
];

const subjects = [
  { id: 'english', name: 'Foundational English', icon: 'record_voice_over', order: 1 },
  { id: 'math', name: 'Basic Numeracy', icon: 'calculate', order: 2 },
  { id: 'life-skills', name: 'Life Skills', icon: 'favorite', order: 3 },
];

const strands = [
  { id: 'strand-1', subjectId: 'english', name: 'Listening & Speaking', order: 1 },
  { id: 'strand-2', subjectId: 'math', name: 'Number Sense', order: 1 },
  { id: 'strand-3', subjectId: 'life-skills', name: 'Health & Hygiene', order: 1 },
];

const modules = [
  { id: 'module-1', strandId: 'strand-1', level: 'beginner', title: 'Greetings & Identity', lessonCount: 12, order: 1, status: 'published' },
  { id: 'module-2', strandId: 'strand-2', level: 'beginner', title: 'Counting & Quantity', lessonCount: 10, order: 1, status: 'published' },
  { id: 'module-3', strandId: 'strand-3', level: 'beginner', title: 'Healthy Habits', lessonCount: 8, order: 1, status: 'published' },
  { id: 'module-4', strandId: 'strand-1', level: 'emerging', title: 'Daily Conversation', lessonCount: 9, order: 2, status: 'draft' },
];

const lessons = [
  { id: 'lesson-1', subjectId: 'english', moduleId: 'module-1', title: 'Greetings and Introductions', durationMinutes: 8, mode: 'guided', status: 'approved' },
  { id: 'lesson-2', subjectId: 'math', moduleId: 'module-2', title: 'Counting from 1 to 10', durationMinutes: 7, mode: 'guided', status: 'approved' },
  { id: 'lesson-3', subjectId: 'life-skills', moduleId: 'module-3', title: 'Handwashing Basics', durationMinutes: 6, mode: 'guided', status: 'approved' },
  { id: 'lesson-4', subjectId: 'english', moduleId: 'module-4', title: 'Daily Vocabulary Practice', durationMinutes: 9, mode: 'guided', status: 'draft' },
];

const assessments = [
  {
    id: 'assessment-1',
    moduleId: 'module-1',
    subjectId: 'english',
    title: 'English Beginner Test 1',
    kind: 'automatic',
    trigger: 'module-complete',
    triggerLabel: 'After Module 1',
    progressionGate: 'foundation-a',
    passingScore: 0.65,
    status: 'active',
  },
  {
    id: 'assessment-2',
    moduleId: 'module-2',
    subjectId: 'math',
    title: 'Math Counting Check',
    kind: 'automatic',
    trigger: 'lesson-cluster',
    triggerLabel: 'After counting lessons',
    progressionGate: 'foundation-a',
    passingScore: 0.6,
    status: 'active',
  },
  {
    id: 'assessment-3',
    moduleId: 'module-3',
    subjectId: 'life-skills',
    title: 'Life Skills Oral Review',
    kind: 'manual',
    trigger: 'mallam-review',
    triggerLabel: 'Mallam triggered',
    progressionGate: 'foundation-b',
    passingScore: 0.7,
    status: 'active',
  },
];

const assignments = [
  {
    id: 'assignment-1',
    cohortId: 'cohort-1',
    lessonId: 'lesson-1',
    assignedBy: 'teacher-1',
    dueDate: '2026-04-12',
    status: 'active',
    podId: 'pod-1',
    assessmentId: 'assessment-1',
    assignedAt: '2026-04-09T08:00:00Z',
  },
  {
    id: 'assignment-2',
    cohortId: 'cohort-1',
    lessonId: 'lesson-2',
    assignedBy: 'teacher-1',
    dueDate: '2026-04-13',
    status: 'active',
    podId: 'pod-1',
    assessmentId: 'assessment-2',
    assignedAt: '2026-04-09T08:10:00Z',
  },
  {
    id: 'assignment-3',
    cohortId: 'cohort-3',
    lessonId: 'lesson-3',
    assignedBy: 'teacher-2',
    dueDate: '2026-04-14',
    status: 'active',
    podId: 'pod-2',
    assessmentId: 'assessment-3',
    assignedAt: '2026-04-09T08:20:00Z',
  },
];

const attendance = [
  { id: 'attendance-1', studentId: 'student-1', date: '2026-04-09', status: 'present' },
  { id: 'attendance-2', studentId: 'student-2', date: '2026-04-09', status: 'present' },
  { id: 'attendance-3', studentId: 'student-3', date: '2026-04-09', status: 'absent' },
  { id: 'attendance-4', studentId: 'student-4', date: '2026-04-09', status: 'present' },
];

const observations = [
  {
    id: 'obs-1',
    studentId: 'student-1',
    teacherId: 'teacher-1',
    note: 'Responds confidently to spoken greetings.',
    competencyTag: 'listening-speaking',
    supportLevel: 'independent',
    createdAt: '2026-04-09T10:00:00Z',
  },
  {
    id: 'obs-2',
    studentId: 'student-3',
    teacherId: 'teacher-2',
    note: 'Needs repetition support for counting exercises.',
    competencyTag: 'number-sense',
    supportLevel: 'guided',
    createdAt: '2026-04-09T11:00:00Z',
  },
];

const progress = [
  {
    id: 'progress-1',
    studentId: 'student-1',
    subjectId: 'english',
    moduleId: 'module-1',
    assessmentId: 'assessment-1',
    mastery: 0.61,
    lessonsCompleted: 6,
    progressionStatus: 'on-track',
    recommendedNextModuleId: 'module-1',
    lastActiveAt: '2026-04-09T09:30:00Z',
  },
  {
    id: 'progress-2',
    studentId: 'student-2',
    subjectId: 'math',
    moduleId: 'module-2',
    assessmentId: 'assessment-2',
    mastery: 0.54,
    lessonsCompleted: 4,
    progressionStatus: 'watch',
    recommendedNextModuleId: 'module-2',
    lastActiveAt: '2026-04-09T09:35:00Z',
  },
  {
    id: 'progress-3',
    studentId: 'student-3',
    subjectId: 'life-skills',
    moduleId: 'module-3',
    assessmentId: 'assessment-3',
    mastery: 0.72,
    lessonsCompleted: 5,
    progressionStatus: 'ready',
    recommendedNextModuleId: 'module-3',
    lastActiveAt: '2026-04-08T13:10:00Z',
  },
  {
    id: 'progress-4',
    studentId: 'student-4',
    subjectId: 'english',
    moduleId: 'module-4',
    assessmentId: 'assessment-1',
    mastery: 0.79,
    lessonsCompleted: 8,
    progressionStatus: 'ready',
    recommendedNextModuleId: 'module-4',
    lastActiveAt: '2026-04-09T12:15:00Z',
  },
];

const syncEvents = [];

module.exports = {
  organizations,
  centers,
  pods,
  cohorts,
  teachers,
  students,
  subjects,
  strands,
  modules,
  lessons,
  assessments,
  assignments,
  attendance,
  observations,
  progress,
  syncEvents,
};