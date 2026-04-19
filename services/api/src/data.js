const path = require('path');
const { createStorageEngine } = require('./storage-engine');

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
      id: 'student-1', cohortId: 'cohort-1', podId: 'pod-1', mallamId: 'teacher-1', name: 'Abdullahi', age: 8, gender: 'male', level: 'beginner', stage: 'foundation-a', attendanceRate: 0.92, guardianName: 'Mariya Abdullahi', deviceAccess: 'shared-tablet',
    },
    {
      id: 'student-2', cohortId: 'cohort-1', podId: 'pod-1', mallamId: 'teacher-1', name: 'Aisha', age: 9, gender: 'female', level: 'beginner', stage: 'foundation-a', attendanceRate: 0.88, guardianName: 'Bala Aisha', deviceAccess: 'shared-tablet',
    },
    {
      id: 'student-3', cohortId: 'cohort-2', podId: 'pod-1', mallamId: 'teacher-1', name: 'Usman', age: 11, gender: 'male', level: 'emerging', stage: 'foundation-b', attendanceRate: 0.81, guardianName: 'Rabi Usman', deviceAccess: 'shared-tablet',
    },
    {
      id: 'student-4', cohortId: 'cohort-3', podId: 'pod-2', mallamId: 'teacher-2', name: 'Zainab', age: 12, gender: 'female', level: 'emerging', stage: 'bridge', attendanceRate: 0.95, guardianName: 'Sani Zainab', deviceAccess: 'shared-tablet',
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
  lessons: [],
  lessonAssets: [],
  assessments: [],
  assignments: [],
  attendance: [],
  observations: [],
  progress: [],
  syncEvents: [],
  lessonSessions: [],
  sessionEventLog: [],
  rewardTransactions: [
    { id: 'reward-1', studentId: 'student-1', kind: 'lesson_completed', xpDelta: 24, label: 'Early practice boost', createdAt: '2026-04-09T09:30:00Z' },
    { id: 'reward-2', studentId: 'student-1', kind: 'badge_awarded', badgeId: 'first-lesson', xpDelta: 0, label: 'First Light', createdAt: '2026-04-09T09:31:00Z' },
    { id: 'reward-3', studentId: 'student-3', kind: 'lesson_completed', xpDelta: 15, label: 'Math momentum', createdAt: '2026-04-08T13:10:00Z' },
  ],
  rewardAdjustments: [],
  rewardRedemptionRequests: [],
  progressionOverrides: [],
  sessionRepairs: [],
  storageOperations: [],
};

// Preserve existing rich seeded lists from prior file by loading a snapshot if present.
// The file-backed snapshot remains the source of truth once created.
const data = { ...seed };
const storage = createStorageEngine({ filePath: DATA_FILE });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hydrate() {
  const parsed = storage.read(seed);
  Object.keys(seed).forEach((key) => {
    data[key] = Array.isArray(parsed[key]) ? parsed[key] : clone(seed[key]);
  });
}

function persist() {
  const snapshot = {};
  Object.keys(seed).forEach((key) => {
    snapshot[key] = data[key];
  });
  storage.write(snapshot);
}

hydrate();

data.persist = persist;
data.reload = hydrate;
data.storage = storage;
data.__meta = {
  file: DATA_FILE,
  storageKind: storage.kind,
  storageNote: storage.note || null,
};

module.exports = data;
