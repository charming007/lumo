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

export type Lesson = {
  id: string;
  title: string;
  subjectName?: string | null;
  moduleTitle?: string | null;
  durationMinutes: number;
  mode: string;
  status: string;
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

export type ProgressRecord = {
  id: string;
  studentName: string;
  subjectName: string;
  mastery: number;
  lessonsCompleted: number;
  progressionStatus: string;
  moduleTitle?: string | null;
  recommendedNextModuleTitle?: string | null;
  lastActiveAt?: string | null;
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
};
