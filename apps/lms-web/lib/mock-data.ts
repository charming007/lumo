import type {
  AssetRuntimeReport,
  Assignment,
  Assessment,
  AttendanceRecord,
  Center,
  Cohort,
  ConfigAudit,
  CurriculumModule,
  DashboardInsight,
  DashboardSummary,
  DeviceRegistration,
  Lesson,
  LessonAsset,
  LocalGovernment,
  Mallam,
  MallamDetail,
  MetaResponse,
  NgoSummary,
  OperationsReport,
  Pod,
  ProgressRecord,
  ReportsOverview,
  RewardRequestQueue,
  RewardSnapshot,
  RewardsReport,
  State,
  StorageBackupList,
  StorageIntegrityReport,
  StorageStatus,
  Strand,
  Student,
  StudentDetail,
  Subject,
  WorkboardItem,
} from './types';

const now = new Date('2026-06-27T09:30:00.000Z');
const iso = (offsetDays: number, hour = 9) => {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

const states: State[] = [
  { id: 'state-kd', code: 'KD', name: 'Kaduna', countryCode: 'NG', order: 1, status: 'active' },
  { id: 'state-kn', code: 'KN', name: 'Kano', countryCode: 'NG', order: 2, status: 'active' },
  { id: 'state-jg', code: 'JG', name: 'Jigawa', countryCode: 'NG', order: 3, status: 'active' },
];

const localGovernments: LocalGovernment[] = [
  { id: 'lga-zaria', stateId: 'state-kd', code: 'ZAR', name: 'Zaria', order: 1, status: 'active' },
  { id: 'lga-igabi', stateId: 'state-kd', code: 'IGA', name: 'Igabi', order: 2, status: 'active' },
  { id: 'lga-fagge', stateId: 'state-kn', code: 'FAG', name: 'Fagge', order: 1, status: 'active' },
  { id: 'lga-dutse', stateId: 'state-jg', code: 'DUT', name: 'Dutse', order: 1, status: 'active' },
];

const centers: Center[] = [
  { id: 'center-zaria', name: 'Zaria Field Hub', region: 'Kaduna North', stateId: 'state-kd', localGovernmentId: 'lga-zaria', deliveryModel: 'community pod' },
  { id: 'center-igabi', name: 'Igabi Learning Hub', region: 'Kaduna Central', stateId: 'state-kd', localGovernmentId: 'lga-igabi', deliveryModel: 'tablet rotation' },
  { id: 'center-fagge', name: 'Fagge Partner School', region: 'Kano Metro', stateId: 'state-kn', localGovernmentId: 'lga-fagge', deliveryModel: 'after-school pod' },
];

const mallams: Mallam[] = [
  {
    id: 'mallam-aisha',
    displayName: 'Aisha Bello',
    name: 'Aisha Bello',
    learnerCount: 28,
    region: 'Kaduna North',
    status: 'active',
    certificationLevel: 'Lead facilitator',
    role: 'Mallama',
    languages: ['Hausa', 'English'],
    podIds: ['pod-zaria-a', 'pod-zaria-b'],
    podLabels: ['Zaria A', 'Zaria B'],
    centerId: 'center-zaria',
    centerName: 'Zaria Field Hub',
    stateId: 'state-kd',
    stateName: 'Kaduna',
    localGovernmentId: 'lga-zaria',
    localGovernmentName: 'Zaria',
  },
  {
    id: 'mallam-musa',
    displayName: 'Musa Ibrahim',
    name: 'Musa Ibrahim',
    learnerCount: 22,
    region: 'Kaduna Central',
    status: 'active',
    certificationLevel: 'Certified',
    role: 'Mallam',
    languages: ['Hausa'],
    podIds: ['pod-igabi-a'],
    podLabels: ['Igabi A'],
    centerId: 'center-igabi',
    centerName: 'Igabi Learning Hub',
    stateId: 'state-kd',
    stateName: 'Kaduna',
    localGovernmentId: 'lga-igabi',
    localGovernmentName: 'Igabi',
  },
  {
    id: 'mallam-zainab',
    displayName: 'Zainab Sani',
    name: 'Zainab Sani',
    learnerCount: 18,
    region: 'Kano Metro',
    status: 'training',
    certificationLevel: 'In coaching',
    role: 'Mallama',
    languages: ['Hausa', 'English'],
    podIds: ['pod-fagge-a'],
    podLabels: ['Fagge A'],
    centerId: 'center-fagge',
    centerName: 'Fagge Partner School',
    stateId: 'state-kn',
    stateName: 'Kano',
    localGovernmentId: 'lga-fagge',
    localGovernmentName: 'Fagge',
  },
];

const pods: Pod[] = [
  { id: 'pod-zaria-a', centerId: 'center-zaria', stateId: 'state-kd', localGovernmentId: 'lga-zaria', label: 'Zaria A', type: 'Girls literacy pod', status: 'active', region: 'Kaduna North', centerName: 'Zaria Field Hub', connectivity: 'offline-first sync', learnersActive: 18, capacity: 22, mallamIds: ['mallam-aisha'], mallamNames: ['Aisha Bello'] },
  { id: 'pod-zaria-b', centerId: 'center-zaria', stateId: 'state-kd', localGovernmentId: 'lga-zaria', label: 'Zaria B', type: 'Mixed tablet pod', status: 'active', region: 'Kaduna North', centerName: 'Zaria Field Hub', connectivity: 'daily sync', learnersActive: 10, capacity: 18, mallamIds: ['mallam-aisha'], mallamNames: ['Aisha Bello'] },
  { id: 'pod-igabi-a', centerId: 'center-igabi', stateId: 'state-kd', localGovernmentId: 'lga-igabi', label: 'Igabi A', type: 'Foundational English', status: 'active', region: 'Kaduna Central', centerName: 'Igabi Learning Hub', connectivity: 'weekly sync', learnersActive: 22, capacity: 24, mallamIds: ['mallam-musa'], mallamNames: ['Musa Ibrahim'] },
  { id: 'pod-fagge-a', centerId: 'center-fagge', stateId: 'state-kn', localGovernmentId: 'lga-fagge', label: 'Fagge A', type: 'After-school pod', status: 'watch', region: 'Kano Metro', centerName: 'Fagge Partner School', connectivity: 'shared tablet kit', learnersActive: 18, capacity: 20, mallamIds: ['mallam-zainab'], mallamNames: ['Zainab Sani'] },
];

const subjects: Subject[] = [
  { id: 'subject-english', name: 'English', icon: 'Aa', order: 1, status: 'active' },
  { id: 'subject-literacy', name: 'Foundational Literacy', icon: 'Book', order: 2, status: 'active' },
  { id: 'subject-numeracy', name: 'Numeracy', icon: '123', order: 3, status: 'active' },
];

const strands: Strand[] = [
  { id: 'strand-vocabulary', subjectId: 'subject-english', subjectName: 'English', name: 'Vocabulary', order: 1, status: 'active' },
  { id: 'strand-reading', subjectId: 'subject-literacy', subjectName: 'Foundational Literacy', name: 'Reading fluency', order: 1, status: 'active' },
  { id: 'strand-counting', subjectId: 'subject-numeracy', subjectName: 'Numeracy', name: 'Counting and comparison', order: 1, status: 'active' },
];

const modules: CurriculumModule[] = [
  { id: 'module-english-1', subjectId: 'subject-english', subjectName: 'English', strandId: 'strand-vocabulary', strandName: 'Vocabulary', level: 'Foundations', title: 'Everyday classroom English', lessonCount: 8, status: 'published' },
  { id: 'module-reading-1', subjectId: 'subject-literacy', subjectName: 'Foundational Literacy', strandId: 'strand-reading', strandName: 'Reading fluency', level: 'Foundations', title: 'Sound and word recognition', lessonCount: 6, status: 'review' },
  { id: 'module-numeracy-1', subjectId: 'subject-numeracy', subjectName: 'Numeracy', strandId: 'strand-counting', strandName: 'Counting and comparison', level: 'Level 1', title: 'Numbers in daily life', lessonCount: 5, status: 'draft' },
];

const lessons: Lesson[] = [
  { id: 'lesson-greetings', title: 'Greetings and classroom routines', subjectId: 'subject-english', moduleId: 'module-english-1', subjectName: 'English', moduleTitle: 'Everyday classroom English', durationMinutes: 18, mode: 'guided', status: 'published', activityCount: 5, activityTypes: ['listen', 'repeat', 'match'], learningObjectives: ['Use morning greetings', 'Respond to simple classroom prompts'] },
  { id: 'lesson-objects', title: 'Names of common objects', subjectId: 'subject-english', moduleId: 'module-english-1', subjectName: 'English', moduleTitle: 'Everyday classroom English', durationMinutes: 22, mode: 'tablet', status: 'published', activityCount: 6, activityTypes: ['flashcard', 'audio', 'choice'] },
  { id: 'lesson-sounds', title: 'Initial sounds and picture cues', subjectId: 'subject-literacy', moduleId: 'module-reading-1', subjectName: 'Foundational Literacy', moduleTitle: 'Sound and word recognition', durationMinutes: 20, mode: 'guided', status: 'review', activityCount: 4, activityTypes: ['sound', 'trace', 'choice'] },
  { id: 'lesson-counting', title: 'Count objects up to 20', subjectId: 'subject-numeracy', moduleId: 'module-numeracy-1', subjectName: 'Numeracy', moduleTitle: 'Numbers in daily life', durationMinutes: 16, mode: 'tablet', status: 'draft', activityCount: 3, activityTypes: ['count', 'drag'] },
];

const assessments: Assessment[] = [
  { id: 'assessment-english-gate', subjectId: 'subject-english', moduleId: 'module-english-1', title: 'Classroom English check', kind: 'oral check', trigger: 'module_complete', triggerLabel: 'After module', progressionGate: 'required', passingScore: 70, subjectName: 'English', moduleTitle: 'Everyday classroom English', status: 'published' },
  { id: 'assessment-reading-gate', subjectId: 'subject-literacy', moduleId: 'module-reading-1', title: 'Sound recognition gate', kind: 'facilitator observation', trigger: 'manual', triggerLabel: 'Mallam launches', progressionGate: 'required', passingScore: 65, subjectName: 'Foundational Literacy', moduleTitle: 'Sound and word recognition', status: 'review' },
  { id: 'assessment-numeracy-draft', subjectId: 'subject-numeracy', moduleId: 'module-numeracy-1', title: 'Counting readiness check', kind: 'tablet quiz', trigger: 'module_complete', triggerLabel: 'After module', progressionGate: 'optional', passingScore: 60, subjectName: 'Numeracy', moduleTitle: 'Numbers in daily life', status: 'draft' },
];

const cohorts: Cohort[] = [
  { id: 'cohort-zaria-girls', name: 'Zaria Girls A', centerId: 'center-zaria', podId: 'pod-zaria-a', ageRange: '8-11', deliveryWindow: 'Morning' },
  { id: 'cohort-igabi-foundation', name: 'Igabi Foundations', centerId: 'center-igabi', podId: 'pod-igabi-a', ageRange: '7-10', deliveryWindow: 'Afternoon' },
  { id: 'cohort-fagge-after', name: 'Fagge After School', centerId: 'center-fagge', podId: 'pod-fagge-a', ageRange: '9-12', deliveryWindow: 'Evening' },
];

const rewardFor = (learnerId: string, learnerName: string, totalXp: number): RewardSnapshot => ({
  learnerId,
  learnerName,
  totalXp,
  points: Math.round(totalXp / 4),
  level: totalXp > 900 ? 5 : totalXp > 650 ? 4 : 3,
  levelLabel: totalXp > 900 ? 'Confident Reader' : 'Steady Builder',
  nextLevel: 6,
  nextLevelLabel: 'Independent Learner',
  nextLevelXp: 1200,
  xpIntoLevel: totalXp % 300,
  xpForNextLevel: 300,
  progressToNextLevel: Math.min(1, (totalXp % 300) / 300),
  badgesUnlocked: totalXp > 800 ? 7 : 5,
  badges: [
    { id: 'badge-streak', title: '7 day streak', description: 'Practiced through the week', icon: 'spark', category: 'consistency', earned: true, progress: 7, target: 7 },
    { id: 'badge-helper', title: 'Peer helper', description: 'Supported a classmate', icon: 'heart', category: 'community', earned: totalXp > 800, progress: totalXp > 800 ? 1 : 0, target: 1 },
  ],
  recentTransactions: [
    { id: `${learnerId}-xp-1`, studentId: learnerId, lessonId: 'lesson-greetings', moduleId: 'module-english-1', subjectId: 'subject-english', kind: 'lesson_completed', xpDelta: 25, label: 'Completed greetings lesson', createdAt: iso(-1, 10) },
  ],
});

const students: Student[] = [
  { id: 'student-amina', name: 'Amina Yusuf', age: 9, gender: 'female', level: 'Foundations', stage: 'Ready to progress', attendanceRate: 0.94, guardianName: 'Hauwa Yusuf', deviceAccess: 'shared tablet', cohortId: 'cohort-zaria-girls', cohortName: 'Zaria Girls A', podId: 'pod-zaria-a', podLabel: 'Zaria A', mallamId: 'mallam-aisha', mallamName: 'Aisha Bello', stateId: 'state-kd', stateName: 'Kaduna', localGovernmentId: 'lga-zaria', localGovernmentName: 'Zaria', rewards: rewardFor('student-amina', 'Amina Yusuf', 980) },
  { id: 'student-sadiq', name: 'Sadiq Musa', age: 10, gender: 'male', level: 'Foundations', stage: 'Needs support', attendanceRate: 0.72, guardianName: 'Musa Garba', deviceAccess: 'pod tablet', cohortId: 'cohort-igabi-foundation', cohortName: 'Igabi Foundations', podId: 'pod-igabi-a', podLabel: 'Igabi A', mallamId: 'mallam-musa', mallamName: 'Musa Ibrahim', stateId: 'state-kd', stateName: 'Kaduna', localGovernmentId: 'lga-igabi', localGovernmentName: 'Igabi', rewards: rewardFor('student-sadiq', 'Sadiq Musa', 640) },
  { id: 'student-ladi', name: 'Ladi Abdullahi', age: 8, gender: 'female', level: 'Level 1', stage: 'On track', attendanceRate: 0.88, guardianName: 'Abdullahi Bala', deviceAccess: 'shared tablet', cohortId: 'cohort-fagge-after', cohortName: 'Fagge After School', podId: 'pod-fagge-a', podLabel: 'Fagge A', mallamId: 'mallam-zainab', mallamName: 'Zainab Sani', stateId: 'state-kn', stateName: 'Kano', localGovernmentId: 'lga-fagge', localGovernmentName: 'Fagge', rewards: rewardFor('student-ladi', 'Ladi Abdullahi', 760) },
];

const progress: ProgressRecord[] = [
  { id: 'progress-amina-english', studentId: 'student-amina', studentName: 'Amina Yusuf', subjectId: 'subject-english', subjectName: 'English', mastery: 0.86, lessonsCompleted: 7, progressionStatus: 'ready', moduleId: 'module-english-1', moduleTitle: 'Everyday classroom English', recommendedNextModuleId: 'module-reading-1', recommendedNextModuleTitle: 'Sound and word recognition', lastActiveAt: iso(-1, 11) },
  { id: 'progress-sadiq-reading', studentId: 'student-sadiq', studentName: 'Sadiq Musa', subjectId: 'subject-literacy', subjectName: 'Foundational Literacy', mastery: 0.48, lessonsCompleted: 3, progressionStatus: 'watch', moduleId: 'module-reading-1', moduleTitle: 'Sound and word recognition', recommendedNextModuleId: 'module-reading-1', recommendedNextModuleTitle: 'Repeat sound recognition practice', lastActiveAt: iso(-3, 15) },
  { id: 'progress-ladi-numeracy', studentId: 'student-ladi', studentName: 'Ladi Abdullahi', subjectId: 'subject-numeracy', subjectName: 'Numeracy', mastery: 0.71, lessonsCompleted: 4, progressionStatus: 'on-track', moduleId: 'module-numeracy-1', moduleTitle: 'Numbers in daily life', recommendedNextModuleId: 'module-numeracy-1', recommendedNextModuleTitle: 'Counting readiness check', lastActiveAt: iso(-2, 12) },
];

const assignments: Assignment[] = [
  { id: 'assignment-english-zaria', lessonTitle: 'Greetings and classroom routines', cohortName: 'Zaria Girls A', teacherName: 'Aisha Bello', dueDate: iso(2), status: 'active', assignedAt: iso(-2), podLabel: 'Zaria A', assessmentTitle: 'Classroom English check' },
  { id: 'assignment-reading-igabi', lessonTitle: 'Initial sounds and picture cues', cohortName: 'Igabi Foundations', teacherName: 'Musa Ibrahim', dueDate: iso(0), status: 'active', assignedAt: iso(-4), podLabel: 'Igabi A', assessmentTitle: 'Sound recognition gate' },
  { id: 'assignment-counting-fagge', lessonTitle: 'Count objects up to 20', cohortName: 'Fagge After School', teacherName: 'Zainab Sani', dueDate: iso(5), status: 'draft', assignedAt: iso(-1), podLabel: 'Fagge A', assessmentTitle: 'Counting readiness check' },
];

const attendance: AttendanceRecord[] = [
  { id: 'attendance-amina', studentName: 'Amina Yusuf', date: iso(0), status: 'present' },
  { id: 'attendance-sadiq', studentName: 'Sadiq Musa', date: iso(0), status: 'late' },
  { id: 'attendance-ladi', studentName: 'Ladi Abdullahi', date: iso(0), status: 'present' },
];

const devices: DeviceRegistration[] = [
  { id: 'device-zaria-a', tabletName: 'Zaria Kit 01', podId: 'pod-zaria-a', podLabel: 'Zaria A', centerId: 'center-zaria', centerName: 'Zaria Field Hub', stateId: 'state-kd', stateName: 'Kaduna', localGovernmentId: 'lga-zaria', localGovernmentName: 'Zaria', assignedMallamId: 'mallam-aisha', assignedMallamName: 'Aisha Bello', deviceIdentifier: 'LUMO-ZAR-A01', serialNumber: 'LMT-001-26', platform: 'Android', appVersion: '1.4.2', status: 'active', lastSeenAt: iso(0, 8), registeredAt: iso(-40) },
  { id: 'device-igabi-a', tabletName: 'Igabi Kit 01', podId: 'pod-igabi-a', podLabel: 'Igabi A', centerId: 'center-igabi', centerName: 'Igabi Learning Hub', stateId: 'state-kd', stateName: 'Kaduna', localGovernmentId: 'lga-igabi', localGovernmentName: 'Igabi', assignedMallamId: 'mallam-musa', assignedMallamName: 'Musa Ibrahim', deviceIdentifier: 'LUMO-IGA-A01', serialNumber: 'LMT-014-26', platform: 'Android', appVersion: '1.4.1', status: 'active', lastSeenAt: iso(-1, 13), registeredAt: iso(-35) },
  { id: 'device-fagge-a', tabletName: 'Fagge Repair Kit', podId: 'pod-fagge-a', podLabel: 'Fagge A', centerId: 'center-fagge', centerName: 'Fagge Partner School', stateId: 'state-kn', stateName: 'Kano', localGovernmentId: 'lga-fagge', localGovernmentName: 'Fagge', assignedMallamId: 'mallam-zainab', assignedMallamName: 'Zainab Sani', deviceIdentifier: 'LUMO-FAG-A02', serialNumber: 'LMT-021-26', platform: 'Android', appVersion: '1.3.9', status: 'repair', lastSeenAt: iso(-6, 16), registeredAt: iso(-52) },
];

const workboard: WorkboardItem[] = [
  { id: 'work-amina', studentId: 'student-amina', studentName: 'Amina Yusuf', cohortName: 'Zaria Girls A', mallamName: 'Aisha Bello', podLabel: 'Zaria A', attendanceRate: 0.94, mastery: 0.86, progressionStatus: 'ready', focus: 'Promote after oral check', recommendedNextModuleTitle: 'Sound and word recognition', totalXp: 980, level: 5, levelLabel: 'Confident Reader', badgesUnlocked: 7 },
  { id: 'work-sadiq', studentId: 'student-sadiq', studentName: 'Sadiq Musa', cohortName: 'Igabi Foundations', mallamName: 'Musa Ibrahim', podLabel: 'Igabi A', attendanceRate: 0.72, mastery: 0.48, progressionStatus: 'watch', focus: 'Repeat initial sound practice', recommendedNextModuleTitle: 'Repeat sound recognition practice', totalXp: 640, level: 3, levelLabel: 'Steady Builder', badgesUnlocked: 4 },
  { id: 'work-ladi', studentId: 'student-ladi', studentName: 'Ladi Abdullahi', cohortName: 'Fagge After School', mallamName: 'Zainab Sani', podLabel: 'Fagge A', attendanceRate: 0.88, mastery: 0.71, progressionStatus: 'on-track', focus: 'Keep weekly tablet rotation', recommendedNextModuleTitle: 'Counting readiness check', totalXp: 760, level: 4, levelLabel: 'Steady Builder', badgesUnlocked: 5 },
];

const lessonAssets: LessonAsset[] = [
  { id: 'asset-greetings-audio', kind: 'audio', title: 'Greeting phrases audio pack', description: 'English/Hausa classroom greeting prompts.', tags: ['english', 'audio'], subjectId: 'subject-english', subjectName: 'English', moduleId: 'module-english-1', moduleTitle: 'Everyday classroom English', lessonId: 'lesson-greetings', lessonTitle: 'Greetings and classroom routines', mimeType: 'audio/mpeg', fileName: 'greetings.mp3', sizeBytes: 2400000, status: 'ready', source: 'demo', createdBy: 'Curriculum Ops', createdAt: iso(-14), updatedAt: iso(-3) },
  { id: 'asset-sounds-card', kind: 'image', title: 'Sound picture card set', description: 'Illustrated cards for initial sound practice.', tags: ['literacy', 'picture-cards'], subjectId: 'subject-literacy', subjectName: 'Foundational Literacy', moduleId: 'module-reading-1', moduleTitle: 'Sound and word recognition', lessonId: 'lesson-sounds', lessonTitle: 'Initial sounds and picture cues', mimeType: 'image/png', fileName: 'sounds.png', sizeBytes: 860000, status: 'ready', source: 'demo', createdBy: 'English Studio', createdAt: iso(-10), updatedAt: iso(-2) },
];

const rewardRequests: RewardRequestQueue = {
  items: [
    { id: 'reward-request-amina', studentId: 'student-amina', rewardTitle: 'Story card pack', xpCost: 120, status: 'pending', learnerName: 'Amina Yusuf', ageDays: 1, requestedVia: 'tablet', createdAt: iso(-1), updatedAt: iso(-1) },
    { id: 'reward-request-ladi', studentId: 'student-ladi', rewardTitle: 'Facilitator praise badge', xpCost: 80, status: 'approved', learnerName: 'Ladi Abdullahi', ageDays: 2, requestedVia: 'mallam', createdAt: iso(-2), updatedAt: iso(-1) },
  ],
  summary: { total: 2, pending: 1, approved: 1, fulfilled: 0, rejected: 0, cancelled: 0, expired: 0, attentionCount: 2, urgentCount: 0, averageAgeDays: 1.5 },
  meta: { count: 2, returned: 2 },
};

const rewardReport: RewardsReport = {
  scope: { limit: 20, learnerCount: students.length } as RewardsReport['scope'] & { limit: number },
  summary: {
    learners: students.length,
    transactionCount: 14,
    totalXpAwarded: students.reduce((sum, student) => sum + (student.rewards?.totalXp ?? 0), 0),
    totalXpRedeemed: 200,
    requestCount: rewardRequests.summary.total,
    correctionCount: 0,
    revocationCount: 0,
    fulfillmentRate: 0.72,
    requestStatusCounts: {
      pending: rewardRequests.summary.pending,
      approved: rewardRequests.summary.approved,
      fulfilled: rewardRequests.summary.fulfilled,
    },
  },
  dailyXpTrend: [
    { date: iso(-4).slice(0, 10), xpAwarded: 180, xpRedeemed: 0, transactions: 3 },
    { date: iso(-3).slice(0, 10), xpAwarded: 220, xpRedeemed: 80, transactions: 4 },
    { date: iso(-2).slice(0, 10), xpAwarded: 160, xpRedeemed: 0, transactions: 2 },
    { date: iso(-1).slice(0, 10), xpAwarded: 260, xpRedeemed: 120, transactions: 5 },
  ],
  rewardDemand: [
    { rewardItemId: 'reward-story-cards', rewardTitle: 'Story card pack', requests: 1, fulfilled: 0, pending: 1 },
    { rewardItemId: 'reward-praise-badge', rewardTitle: 'Facilitator praise badge', requests: 1, fulfilled: 0, pending: 0 },
  ],
  recentTransactions: [
    { id: 'txn-amina-lesson', learnerName: 'Amina Yusuf', xp: 40, type: 'earned', createdAt: iso(-1, 10) },
    { id: 'txn-ladi-redeem', learnerName: 'Ladi Abdullahi', xp: -80, type: 'redeemed', createdAt: iso(-1, 14) },
  ],
  recentRequests: rewardRequests.items,
  recentAdjustments: [],
  learnerBreakdown: students.map((student, index) => ({
    learnerId: student.id,
    learnerName: student.name,
    totalXp: student.rewards?.totalXp ?? 0,
    badgesUnlocked: student.rewards?.badgesUnlocked ?? 0,
    transactions: 4 + index,
    xpAwarded: student.rewards?.totalXp ?? 0,
    xpRedeemed: index === 2 ? 80 : 0,
    requests: rewardRequests.items.filter((request) => request.studentId === student.id).length,
    pendingRequests: rewardRequests.items.filter((request) => request.studentId === student.id && request.status === 'pending').length,
  })),
  leaderboard: students
    .map((student) => student.rewards)
    .filter((reward): reward is RewardSnapshot => Boolean(reward)),
};

function studentDetail(id: string): StudentDetail {
  const student = students.find((item) => item.id === id) ?? students[0];
  return {
    ...student,
    progress: progress.filter((item) => item.studentId === student.id),
    attendance: attendance.filter((item) => item.studentName === student.name),
    observations: [
      { id: `${student.id}-obs-1`, studentName: student.name, teacherName: student.mallamName, note: 'Responds well to audio prompts and peer repetition.', competencyTag: 'listening', supportLevel: student.stage === 'Needs support' ? 'targeted' : 'light', createdAt: iso(-2) },
    ],
    assignments: assignments.filter((item) => item.cohortName === student.cohortName),
    summary: {
      attendanceRate: student.attendanceRate,
      presentDays: Math.round(student.attendanceRate * 20),
      attendanceSessions: 20,
      activeAssignments: assignments.filter((item) => item.cohortName === student.cohortName && item.status === 'active').length,
      latestProgressionStatus: progress.find((item) => item.studentId === student.id)?.progressionStatus ?? 'on-track',
      latestMastery: progress.find((item) => item.studentId === student.id)?.mastery ?? null,
      focusSubject: progress.find((item) => item.studentId === student.id)?.subjectName ?? null,
      recommendedNextModuleTitle: progress.find((item) => item.studentId === student.id)?.recommendedNextModuleTitle ?? null,
      lastActiveAt: progress.find((item) => item.studentId === student.id)?.lastActiveAt ?? null,
      latestObservationAt: iso(-2),
    },
    recommendedActions: student.stage === 'Needs support'
      ? ['Schedule a facilitator check-in before the next module.', 'Repeat the current sound recognition activity with audio support.']
      : ['Confirm assessment gate outcome.', 'Prepare the next module assignment.'],
  };
}

function mallamDetail(id: string): MallamDetail {
  const mallam = mallams.find((item) => item.id === id) ?? mallams[0];
  const roster = students.filter((student) => student.mallamId === mallam.id);
  const mallamAssignments = assignments.filter((assignment) => assignment.teacherName === mallam.displayName);
  return {
    ...mallam,
    roster,
    assignments: mallamAssignments,
    summary: {
      rosterCount: roster.length,
      activeAssignments: mallamAssignments.filter((assignment) => assignment.status === 'active').length,
      averageAttendance: roster.length ? roster.reduce((sum, student) => sum + student.attendanceRate, 0) / roster.length : 0,
      readinessCount: roster.filter((student) => student.stage === 'Ready to progress').length,
      watchCount: roster.filter((student) => student.stage === 'Needs support').length,
      podCoverage: mallam.podLabels.length,
    },
    recommendedActions: ['Review learners marked watch before Friday sync.', 'Confirm tablet handoff after the next pod session.'],
  };
}

const assetRuntime: AssetRuntimeReport = {
  checkedAt: iso(0),
  summary: {
    readiness: 'ready',
    headline: 'Content assets are ready for demo operations',
    operatorAction: 'Review two reusable assets before publishing the next English pack.',
    registryHealthy: true,
    assetCount: lessonAssets.length,
    readyCount: lessonAssets.length,
    archivedCount: 0,
    managedCount: lessonAssets.length,
    missingManagedCount: 0,
    skippedRecordCount: 0,
    lessonsWithIssues: 0,
    unresolvedReferenceCount: 0,
    legacyReferenceCount: 0,
    brokenManagedReferenceCount: 0,
    orphanedAssetCount: 0,
  },
  uploads: { ready: true, root: '/demo/uploads', publicBaseValid: true, persistentRisk: false, recommendations: ['Keep audio prompts short for low-bandwidth sync.'] },
  registry: { totalRecords: lessonAssets.length, usableRecords: lessonAssets.length, skippedRecords: 0, issueCount: 0, topIssues: [], orphanedAssets: [] },
  routeEvidence: { ready: true, mountedCount: 4, expectedCount: 4, checks: [] },
  nextActions: ['Attach the picture card set to the reading fluency review lesson.'],
};

function normalizePath(path: string) {
  return path.split('?')[0] ?? path;
}

export function getMockJson(path: string): unknown {
  const cleanPath = normalizePath(path);

  if (cleanPath.startsWith('/api/v1/students/') && cleanPath.endsWith('/rewards')) {
    const id = cleanPath.split('/')[4] ?? '';
    return students.find((student) => student.id === id)?.rewards ?? rewardFor(id, 'Demo learner', 520);
  }
  if (cleanPath.startsWith('/api/v1/students/')) return studentDetail(cleanPath.split('/').at(-1) ?? '');
  if (cleanPath.startsWith('/api/v1/mallams/')) return mallamDetail(cleanPath.split('/').at(-1) ?? '');
  if (cleanPath.startsWith('/api/v1/lessons/')) return lessons.find((lesson) => lesson.id === cleanPath.split('/').at(-1)) ?? lessons[0];

  const reportsOverview: ReportsOverview = {
    totalStudents: students.length,
    totalTeachers: mallams.length,
    totalCenters: centers.length,
    totalAssignments: assignments.length,
    presentToday: attendance.filter((item) => item.status === 'present').length,
    averageAttendance: 0.85,
    averageMastery: 0.68,
    readinessCount: progress.filter((item) => item.progressionStatus === 'ready').length,
    watchCount: progress.filter((item) => item.progressionStatus === 'watch').length,
    onTrackCount: progress.filter((item) => item.progressionStatus === 'on-track').length,
    assignmentsDueThisWeek: assignments.length,
    activePods: pods.filter((pod) => pod.status === 'active').length,
    podsNeedingAttention: pods.filter((pod) => pod.status !== 'active').length,
  };

  const map: Record<string, unknown> = {
    '/api/v1/meta': { actor: { role: 'admin', name: 'Lumo Demo Admin' }, mode: 'demo', seedSummary: { students: students.length, mallams: mallams.length, pods: pods.length }, store: { mode: 'mock', persistent: false, hasDatabaseUrl: false, driver: 'demo' } } satisfies MetaResponse,
    '/api/v1/dashboard/summary': { activeLearners: students.length, lessonsCompleted: 128, centers: centers.length, syncSuccessRate: 0.94, mallams: mallams.length, activePods: pods.filter((pod) => pod.status === 'active').length, activeAssignments: assignments.filter((assignment) => assignment.status === 'active').length, assessmentsLive: assessments.filter((assessment) => assessment.status !== 'draft').length, learnersReadyToProgress: progress.filter((item) => item.progressionStatus === 'ready').length } satisfies DashboardSummary,
    '/api/v1/dashboard/insights': [
      { priority: 'High', headline: 'Igabi A needs support rotation', detail: 'Sadiq is below mastery target and should repeat sound recognition with mallam support.', metric: '48% mastery' },
      { priority: 'Ready', headline: 'Zaria A can promote one learner', detail: 'Amina has completed the English module and is ready for oral gate confirmation.', metric: '86% mastery' },
      { priority: 'Ops', headline: 'Fagge tablet needs repair follow-up', detail: 'One tablet has not synced in six days and is marked repair.', metric: '1 repair device' },
    ] satisfies DashboardInsight[],
    '/api/v1/dashboard/workboard': workboard,
    '/api/v1/students': students,
    '/api/v1/mallams': mallams,
    '/api/v1/attendance': attendance,
    '/api/v1/assignments': assignments,
    '/api/v1/curriculum/modules': modules,
    '/api/v1/curriculum/canvas': {
      root: {
        id: 'canvas-root',
        nodeType: 'root',
        title: 'Lumo curriculum',
        children: subjects.map((subject) => ({
          id: subject.id,
          nodeType: 'subject',
          name: subject.name,
          icon: subject.icon ?? null,
          status: subject.status ?? 'active',
          order: subject.order ?? null,
          children: strands.filter((strand) => strand.subjectId === subject.id).map((strand) => ({
            id: strand.id,
            nodeType: 'strand',
            subjectId: subject.id,
            subjectName: subject.name,
            name: strand.name,
            status: strand.status ?? 'active',
            order: strand.order ?? null,
            children: modules.filter((module) => module.subjectId === subject.id && module.strandId === strand.id).map((module) => ({
              id: module.id,
              nodeType: 'module',
              subjectId: subject.id,
              subjectName: subject.name,
              strandId: strand.id,
              strandName: strand.name,
              title: module.title,
              level: module.level,
              status: module.status,
              lessonCount: module.lessonCount,
              children: [
                ...lessons.filter((lesson) => lesson.moduleId === module.id).map((lesson) => ({
                  id: lesson.id,
                  nodeType: 'lesson',
                  subjectId: subject.id,
                  subjectName: subject.name,
                  strandId: strand.id,
                  strandName: strand.name,
                  moduleId: module.id,
                  moduleTitle: module.title,
                  title: lesson.title,
                  status: lesson.status,
                  durationMinutes: lesson.durationMinutes,
                  mode: lesson.mode,
                  activityCount: lesson.activityCount ?? null,
                })),
                ...assessments.filter((assessment) => assessment.moduleId === module.id).map((assessment) => ({
                  id: assessment.id,
                  nodeType: 'assessment',
                  subjectId: subject.id,
                  subjectName: subject.name,
                  strandId: strand.id,
                  strandName: strand.name,
                  moduleId: module.id,
                  moduleTitle: module.title,
                  title: assessment.title,
                  status: assessment.status,
                  kind: assessment.kind,
                  trigger: assessment.trigger,
                  triggerLabel: assessment.triggerLabel,
                  progressionGate: assessment.progressionGate,
                  passingScore: assessment.passingScore,
                })),
              ],
            })),
          })),
        })),
      },
      meta: {
        subjectCount: subjects.length,
        strandCount: strands.length,
        moduleCount: modules.length,
        lessonCount: lessons.length,
        assessmentCount: assessments.length,
        generatedAt: iso(0),
      },
    },
    '/api/v1/assessments': assessments,
    '/api/v1/pods': pods,
    '/api/v1/device-registrations': devices,
    '/api/v1/progress': progress,
    '/api/v1/reports/overview': reportsOverview,
    '/api/v1/lessons': lessons,
    '/api/v1/subjects': subjects,
    '/api/v1/strands': strands,
    '/api/v1/cohorts': cohorts,
    '/api/v1/centers': centers,
    '/api/v1/states': states,
    '/api/v1/local-governments': localGovernments,
    '/api/v1/rewards/catalog': {
      xpRules: { lesson_completed: 25, assessment_passed: 40, attendance_present: 5 },
      levels: [
        { level: 1, label: 'Getting Started', minXp: 0 },
        { level: 3, label: 'Steady Builder', minXp: 500 },
        { level: 5, label: 'Confident Reader', minXp: 900 },
      ],
      badges: [
        { id: 'badge-streak', title: '7 day streak', description: 'Practiced through the week', icon: 'spark', category: 'consistency', target: 7 },
        { id: 'badge-helper', title: 'Peer helper', description: 'Supported a classmate', icon: 'heart', category: 'community', target: 1 },
      ],
    },
    '/api/v1/rewards/leaderboard': students.map((student) => student.rewards),
    '/api/v1/rewards/requests': rewardRequests,
    '/api/v1/reports/rewards': rewardReport,
    '/api/v1/reports/ngo-summary': { scope: { learnerCount: students.length }, totals: { learners: students.length, centers: centers.length, pods: pods.length, mallams: mallams.length, activeAssignments: 2, lessonsCompleted: 128, completedSessions: 184, attendanceAverage: 0.85, averageMastery: 0.68, totalXpAwarded: 2380 }, progression: { ready: 1, watch: 1, onTrack: 1 }, subjectBreakdown: subjects.map((subject) => ({ subjectId: subject.id, subjectName: subject.name, learnerCount: students.length, averageMastery: 0.68, lessonsCompleted: 42 })), mallamSnapshots: mallams, topLearners: students.map((student) => student.rewards).filter(Boolean) },
    '/api/v1/admin/storage/status': { mode: 'mock', persistent: false, path: '/demo/lumo', exists: true, updatedAt: iso(0), sizeBytes: 480000 } satisfies StorageStatus,
    '/api/v1/admin/config/audit': { checkedAt: iso(0), storage: { mode: 'mock', persistent: false, driver: 'demo' }, assetUploads: { root: '/demo/uploads', ready: true }, apiBaseUrl: 'mock://lumo-demo', errors: [], warnings: ['Demo data is active because the live API is unavailable.'], summary: { ready: true, errorCount: 0, warningCount: 1 } } satisfies ConfigAudit,
    '/api/v1/admin/assets/runtime': assetRuntime,
    '/api/v1/admin/storage/integrity': { checkedAt: iso(0), summary: { studentCount: students.length, runtimeSessionCount: 184, rewardRequestCount: rewardRequests.items.length, rewardTransactionCount: 3, issueCount: 0 }, issues: [] } satisfies StorageIntegrityReport,
    '/api/v1/admin/storage/backups': { items: [{ path: '/demo/backups/lumo-demo.json', updatedAt: iso(-1), sizeBytes: 480000 }], status: { mode: 'mock', persistent: false } } satisfies StorageBackupList,
    '/api/v1/reports/operations': { scope: { limit: 20 }, summary: { learnersInScope: students.length, runtimeCompletionRate: 0.82, runtimeAbandonedSessions: 6, progressionReady: 1, progressionWatch: 1, rewardPendingRequests: 1, rewardFulfillmentRate: 0.72, rewardBacklogUrgent: 0, activeProgressionOverrides: 0, sessionRepairs: 0, integrityIssueCount: 0 }, runtime: {}, progression: {}, rewards: {}, integrity: {}, hotlist: { watchLearners: workboard.filter((item) => item.progressionStatus === 'watch'), readyLearners: workboard.filter((item) => item.progressionStatus === 'ready'), runtimeLearners: [], rewardQueue: rewardRequests.items }, recent: { sessions: [], events: [], overrides: [], rewardAdjustments: [], rewardRequests: rewardRequests.items, integrityIssues: [] } } satisfies OperationsReport,
    '/api/v1/assets': lessonAssets,
  };

  if (cleanPath in map) {
    return map[cleanPath];
  }

  return undefined;
}
