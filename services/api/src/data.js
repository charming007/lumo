const path = require('path');
const { createStorageEngine } = require('./storage-engine');
const { NIGERIA_GEOGRAPHY } = require('./nigeria-geography');

const DATA_FILE = process.env.LUMO_DATA_FILE
  ? path.resolve(process.env.LUMO_DATA_FILE)
  : path.resolve(__dirname, '..', 'data', 'store.json');

const seed = {
  organizations: [
    { id: 'org-1', name: 'Lumo Pilot Program', country: 'Nigeria', timezone: 'Africa/Lagos' },
  ],
  centers: [
    { id: 'center-1', organizationId: 'org-1', stateId: 'state-kano', localGovernmentId: 'lga-nassarawa', name: 'Kano Learning Center A', region: 'Kano', deliveryModel: 'community-hub' },
    { id: 'center-2', organizationId: 'org-1', stateId: 'state-kaduna', localGovernmentId: 'lga-igabi', name: 'Kaduna Learning Center B', region: 'Kaduna', deliveryModel: 'community-hub' },
  ],
  states: NIGERIA_GEOGRAPHY.states,
  localGovernments: NIGERIA_GEOGRAPHY.localGovernments,
  pods: [
    {
      id: 'pod-1',
      centerId: 'center-1',
      stateId: 'state-kano',
      localGovernmentId: 'lga-nassarawa',
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
      stateId: 'state-kaduna',
      localGovernmentId: 'lga-igabi',
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
      primaryPodId: 'pod-1',
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
      primaryPodId: 'pod-2',
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
    { id: 'english', name: 'Foundational English', icon: 'record_voice_over', order: 1, status: 'published' },
    { id: 'math', name: 'Basic Numeracy', icon: 'calculate', order: 2, status: 'published' },
    { id: 'life-skills', name: 'Life Skills', icon: 'favorite', order: 3, status: 'draft' },
  ],
  strands: [
    { id: 'strand-1', subjectId: 'english', name: 'Listening & Speaking', order: 1, status: 'published' },
    { id: 'strand-4', subjectId: 'english', name: 'Phonics & Word Building', order: 2, status: 'draft' },
    { id: 'strand-2', subjectId: 'math', name: 'Number Sense', order: 1, status: 'published' },
    { id: 'strand-5', subjectId: 'math', name: 'Operations & Problem Solving', order: 2, status: 'draft' },
    { id: 'strand-3', subjectId: 'life-skills', name: 'Health & Hygiene', order: 1, status: 'draft' },
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
  deviceRegistrations: [
    {
      id: 'device-1',
      podId: 'pod-1',
      stateId: 'state-kano',
      localGovernmentId: 'lga-nassarawa',
      centerId: 'center-1',
      assignedMallamId: 'teacher-1',
      deviceIdentifier: 'lumo-tablet-kano-01',
      serialNumber: 'KANO-TAB-001',
      platform: 'android',
      appVersion: '0.1.0',
      status: 'active',
      lastSeenAt: '2026-04-10T08:00:00Z',
      registeredAt: '2026-04-09T08:00:00Z'
    }
  ],
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

function mergeSeededGeography(parsedItems, seedItems) {
  if (!Array.isArray(parsedItems)) {
    return { items: clone(seedItems), changed: true };
  }

  const makeMatcherKeys = (item) => {
    const keys = [];
    const id = String(item?.id || '').trim();
    const code = String(item?.code || '').trim();
    const name = String(item?.name || '').trim().toLowerCase();
    const stateId = String(item?.stateId || '').trim();
    if (id) keys.push(`id:${id}`);
    if (code) keys.push(`code:${code}`);
    if (stateId && name) keys.push(`state-name:${stateId}:${name}`);
    if (name) keys.push(`name:${name}`);
    return keys;
  };

  const parsedIndexesByKey = new Map();
  parsedItems.forEach((item, index) => {
    makeMatcherKeys(item).forEach((key) => {
      if (!parsedIndexesByKey.has(key)) parsedIndexesByKey.set(key, []);
      parsedIndexesByKey.get(key).push(index);
    });
  });

  const consumedIndexes = new Set();
  const merged = [];
  let changed = false;

  for (const seedItem of seedItems) {
    const matchIndex = makeMatcherKeys(seedItem)
      .flatMap((key) => parsedIndexesByKey.get(key) || [])
      .find((index) => !consumedIndexes.has(index));
    const parsed = matchIndex !== undefined ? parsedItems[matchIndex] : null;

    if (matchIndex === undefined || !parsed || typeof parsed !== 'object') {
      merged.push(clone(seedItem));
      changed = true;
      continue;
    }

    consumedIndexes.add(matchIndex);
    const next = {
      ...seedItem,
      ...parsed,
      id: seedItem.id,
      code: seedItem.code,
      stateId: seedItem.stateId ?? parsed.stateId,
    };

    if (JSON.stringify(next) !== JSON.stringify(parsed)) {
      changed = true;
    }

    merged.push(next);
  }

  parsedItems.forEach((item, index) => {
    if (!consumedIndexes.has(index)) {
      merged.push(item);
    }
  });

  return { items: merged, changed };
}

function normalizeLifecycleStatus(collectionKey, parsedItems, seedItems) {
  if (!Array.isArray(parsedItems)) {
    return { items: clone(seedItems), changed: true };
  }

  if (collectionKey === 'states' || collectionKey === 'localGovernments') {
    return mergeSeededGeography(parsedItems, seedItems);
  }

  if (!['subjects', 'strands', 'modules', 'lessons'].includes(collectionKey)) {
    return { items: parsedItems, changed: false };
  }

  const seedById = new Map((seedItems || []).map((item) => [String(item.id), item]));
  let changed = false;

  const items = parsedItems.map((item) => {
    if (!item || typeof item !== 'object' || item.status) {
      return item;
    }

    changed = true;
    const seeded = seedById.get(String(item.id || ''));
    if (seeded?.status) {
      return { ...item, status: seeded.status };
    }

    return { ...item, status: 'draft' };
  });

  return { items, changed };
}

function hydrate() {
  const parsed = storage.read(seed);
  let snapshotNeedsUpgrade = false;

  Object.keys(seed).forEach((key) => {
    const normalized = normalizeLifecycleStatus(key, parsed[key], seed[key]);
    data[key] = normalized.items;
    snapshotNeedsUpgrade = snapshotNeedsUpgrade || normalized.changed;
  });

  if (snapshotNeedsUpgrade) {
    persist();
  }
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
