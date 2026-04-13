export type DashboardSummary = {
  activeLearners: number;
  lessonsCompleted: number;
  centers: number;
  syncSuccessRate: number;
  mallams: number;
  activePods: number;
  activeAssignments: number;
  assessmentsLive: number;
  learnersReadyToProgress: number;
};

export type DashboardInsight = {
  priority: string;
  headline: string;
  detail: string;
  metric: string;
};

export type RewardBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  progress: number;
  target: number;
};

export type RewardTransaction = {
  id: string;
  studentId?: string;
  lessonId?: string | null;
  moduleId?: string | null;
  subjectId?: string | null;
  kind: string;
  xpDelta: number;
  badgeId?: string | null;
  label?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RewardSnapshot = {
  learnerId: string;
  learnerName?: string;
  cohortId?: string;
  totalXp: number;
  points: number;
  level: number;
  levelLabel: string;
  nextLevel?: number | null;
  nextLevelLabel?: string | null;
  nextLevelXp?: number | null;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressToNextLevel: number;
  badgesUnlocked: number;
  badges: RewardBadge[];
  recentTransactions: RewardTransaction[];
};

export type RewardRequestQueueItem = {
  id: string;
  studentId: string;
  rewardItemId?: string | null;
  rewardTitle: string;
  xpCost: number;
  status: string;
  learnerNote?: string | null;
  adminNote?: string | null;
  requestedVia?: string | null;
  requestedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  fulfilledAt?: string | null;
  learnerName?: string | null;
  ageDays?: number | null;
  lifecycle?: {
    createdToApprovedHours?: number | null;
    createdToFulfilledHours?: number | null;
    approvedToFulfilledHours?: number | null;
  } | null;
  metadata?: Record<string, unknown> | null;
};

export type RewardRequestQueue = {
  items: RewardRequestQueueItem[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    fulfilled: number;
    rejected: number;
    cancelled: number;
    expired: number;
    attentionCount: number;
    urgentCount: number;
    averageAgeDays: number;
  };
  meta: {
    cohortId?: string | null;
    podId?: string | null;
    mallamId?: string | null;
    learnerId?: string | null;
    status?: string | null;
    count: number;
    returned: number;
  };
};

export type WorkboardItem = {
  id: string;
  studentName: string;
  cohortName: string | null;
  mallamName: string | null;
  podLabel: string | null;
  attendanceRate: number;
  mastery: number;
  progressionStatus: string;
  focus: string;
  recommendedNextModuleTitle?: string | null;
  totalXp: number;
  level: number;
  levelLabel: string;
  badgesUnlocked: number;
};

export type Assignment = {
  id: string;
  lessonTitle: string;
  cohortName: string;
  teacherName: string;
  dueDate: string;
  status: string;
  podLabel?: string | null;
  assessmentTitle?: string | null;
};

export type Student = {
  id: string;
  name: string;
  age: number;
  gender?: string;
  level: string;
  stage: string;
  attendanceRate: number;
  guardianName?: string;
  deviceAccess?: string;
  cohortId?: string;
  podId?: string;
  mallamId?: string;
  cohortName?: string | null;
  podLabel?: string | null;
  mallamName?: string | null;
  rewards?: RewardSnapshot | null;
};

export type Mallam = {
  id: string;
  displayName: string;
  name: string;
  learnerCount: number;
  region: string;
  status: string;
  certificationLevel: string;
  role: string;
  languages?: string[];
  podIds?: string[];
  podLabels: string[];
  centerId?: string;
  centerName?: string | null;
};

export type Subject = {
  id: string;
  name: string;
  icon?: string;
  order?: number;
};

export type Strand = {
  id: string;
  subjectId: string;
  subjectName: string;
  name: string;
  order: number;
};

export type Cohort = {
  id: string;
  name: string;
  centerId: string;
  podId: string;
  ageRange: string;
  deliveryWindow: string;
};

export type Center = {
  id: string;
  name: string;
  region: string;
};

export type CurriculumModule = {
  id: string;
  subjectId?: string | null;
  subjectName: string;
  level: string;
  title: string;
  lessonCount: number;
  status: string;
  strandName: string;
};

export type LessonActivityMedia = {
  kind?: string;
  value?: string | string[] | null;
};

export type LessonActivityChoice = {
  id: string;
  label: string;
  isCorrect?: boolean;
  media?: LessonActivityMedia | null;
};

export type LessonActivityStep = {
  id: string;
  type: string;
  prompt: string;
  order?: number;
  title?: string;
  durationMinutes?: number;
  detail?: string;
  evidence?: string;
  expectedAnswers?: string[];
  media?: LessonActivityMedia[];
  choices?: LessonActivityChoice[];
  tags?: string[];
  facilitatorNotes?: string[];
};

export type LessonAssessmentItem = {
  id: string;
  prompt: string;
  evidence?: string;
  choices?: Array<Record<string, unknown>>;
};

export type Lesson = {
  id: string;
  title: string;
  subjectId?: string | null;
  moduleId?: string | null;
  subjectName?: string | null;
  moduleTitle?: string | null;
  durationMinutes: number;
  mode: string;
  status: string;
  targetAgeRange?: string | null;
  voicePersona?: string | null;
  learningObjectives?: string[];
  localization?: Record<string, unknown> | null;
  lessonAssessment?: {
    title?: string;
    kind?: string;
    items?: LessonAssessmentItem[];
    [key: string]: unknown;
  } | null;
  activityCount?: number;
  activityTypes?: string[];
  activitySteps?: LessonActivityStep[];
  activities?: LessonActivityStep[];
};

export type Assessment = {
  id: string;
  subjectId?: string | null;
  moduleId?: string | null;
  title: string;
  kind: string;
  trigger: string;
  triggerLabel: string;
  progressionGate: string;
  passingScore: number;
  subjectName: string;
  moduleTitle: string;
  status: string;
};

export type Pod = {
  id: string;
  label: string;
  type: string;
  status: string;
  region: string;
  centerName: string;
  connectivity: string;
  learnersActive: number;
  capacity?: number;
  mallamNames?: string[];
};

export type AttendanceRecord = {
  id: string;
  studentName: string;
  date: string;
  status: string;
};

export type ProgressOverride = {
  status?: string | null;
  reason?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  updatedAt?: string | null;
};

export type ProgressRecord = {
  id: string;
  studentId?: string;
  studentName: string;
  subjectId?: string;
  subjectName: string;
  mastery: number;
  lessonsCompleted: number;
  progressionStatus: string;
  moduleId?: string | null;
  moduleTitle?: string | null;
  recommendedNextModuleId?: string | null;
  recommendedNextModuleTitle?: string | null;
  lastActiveAt?: string | null;
  override?: ProgressOverride | null;
};

export type ObservationRecord = {
  id: string;
  studentName?: string | null;
  teacherName?: string | null;
  note: string;
  competencyTag?: string | null;
  supportLevel: string;
  createdAt: string;
};

export type StudentDetail = Student & {
  gender?: string;
  guardianName?: string;
  deviceAccess?: string;
  progress: ProgressRecord[];
  attendance: AttendanceRecord[];
  observations: ObservationRecord[];
  assignments: Assignment[];
  summary: {
    attendanceRate: number;
    presentDays: number;
    attendanceSessions: number;
    activeAssignments: number;
    latestProgressionStatus: string;
    latestMastery: number | null;
    focusSubject: string | null;
    recommendedNextModuleTitle: string | null;
    lastActiveAt: string | null;
    latestObservationAt: string | null;
  };
  recommendedActions: string[];
  rewards?: RewardSnapshot | null;
};

export type MallamDetail = Mallam & {
  roster: Student[];
  assignments: Assignment[];
  summary: {
    rosterCount: number;
    activeAssignments: number;
    averageAttendance: number;
    readinessCount: number;
    watchCount: number;
    podCoverage: number;
  };
  recommendedActions: string[];
};

export type ReportsOverview = {
  totalStudents: number;
  totalTeachers: number;
  totalCenters: number;
  totalAssignments: number;
  presentToday: number;
  averageAttendance: number;
  averageMastery: number;
  readinessCount: number;
  watchCount: number;
  onTrackCount: number;
  assignmentsDueThisWeek: number;
  activePods: number;
  podsNeedingAttention: number;
};

export type MetaResponse = {
  actor: {
    role: string;
    name: string;
  };
  mode: string;
  seedSummary: Record<string, number>;
  store?: {
    mode?: string;
    persistent?: boolean;
    hasDatabaseUrl?: boolean;
    driver?: string;
  };
};

export type StorageStatus = {
  mode?: 'file' | 'postgres' | string;
  persistent?: boolean;
  path?: string | null;
  exists?: boolean;
  updatedAt?: string | null;
  sizeBytes?: number;
  backupFile?: string | null;
  backupUpdatedAt?: string | null;
  backups?: Array<{ path: string; updatedAt?: string | null; sizeBytes?: number }>;
  db?: {
    mode?: string;
    persistent?: boolean;
    hasDatabaseUrl?: boolean;
    driver?: string;
  };
};

export type StorageIntegrityReport = {
  checkedAt: string;
  summary: {
    students?: number;
    sessions?: number;
    rewardRequests?: number;
    studentCount?: number;
    runtimeSessionCount?: number;
    rewardRequestCount?: number;
    rewardTransactionCount?: number;
    issueCount: number;
  };
  issues: Array<{ type: string; id: string; entity?: string }>;
};

export type StorageBackupList = {
  items: Array<{ path: string; updatedAt?: string | null; sizeBytes?: number }>;
  status?: StorageStatus | null;
};

export type OperationsReport = {
  scope: {
    cohortId?: string | null;
    podId?: string | null;
    mallamId?: string | null;
    subjectId?: string | null;
    learnerId?: string | null;
    since?: string | null;
    until?: string | null;
    limit?: number;
  };
  summary: {
    learnersInScope: number;
    runtimeCompletionRate: number;
    runtimeAbandonedSessions: number;
    progressionReady: number;
    progressionWatch: number;
    rewardPendingRequests: number;
    rewardFulfillmentRate: number;
    integrityIssueCount: number;
  };
  runtime: Record<string, unknown>;
  progression: Record<string, unknown>;
  rewards: Record<string, unknown>;
  integrity: Record<string, unknown>;
  hotlist: {
    watchLearners: WorkboardItem[];
    readyLearners: WorkboardItem[];
    runtimeLearners: Array<Record<string, unknown>>;
    rewardQueue: Array<Record<string, unknown>>;
  };
  recent: {
    sessions: Array<Record<string, unknown>>;
    events: Array<Record<string, unknown>>;
    overrides: Array<Record<string, unknown>>;
    rewardAdjustments: Array<Record<string, unknown>>;
    integrityIssues: Array<{ type: string; id: string; entity?: string }>;
  };
};

export type StorageRepairResult = {
  checkedAt: string;
  apply: boolean;
  issueCount: number;
  fixes: Array<{ collection: string; removed: number; ids: string[] }>;
  report: StorageIntegrityReport;
};

export type RewardsReport = {
  scope: {
    cohortId?: string | null;
    podId?: string | null;
    mallamId?: string | null;
    learnerId?: string | null;
    since?: string | null;
    until?: string | null;
    learnerCount: number;
  };
  summary: {
    learners: number;
    transactionCount: number;
    totalXpAwarded: number;
    totalXpRedeemed: number;
    requestCount: number;
    correctionCount: number;
    revocationCount: number;
    fulfillmentRate: number;
    requestStatusCounts: Record<string, number>;
  };
  dailyXpTrend: Array<{ date: string; xpAwarded: number; xpRedeemed: number; transactions: number }>;
  rewardDemand: Array<{ rewardItemId: string; rewardTitle: string; requests: number; fulfilled: number; pending: number }>;
  recentTransactions: Array<Record<string, unknown>>;
  recentRequests: Array<Record<string, unknown>>;
  recentAdjustments: Array<Record<string, unknown>>;
  learnerBreakdown: Array<{
    learnerId: string;
    learnerName: string;
    totalXp: number;
    badgesUnlocked: number;
    transactions: number;
    xpAwarded: number;
    xpRedeemed: number;
    requests: number;
    pendingRequests: number;
  }>;
  leaderboard: RewardSnapshot[];
};
