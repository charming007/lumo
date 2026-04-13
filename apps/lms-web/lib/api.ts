import type {
  Assignment,
  Assessment,
  AttendanceRecord,
  Center,
  Cohort,
  CurriculumModule,
  DashboardInsight,
  DashboardSummary,
  Lesson,
  Mallam,
  MallamDetail,
  MetaResponse,
  Pod,
  ProgressRecord,
  ReportsOverview,
  RewardSnapshot,
  RewardsReport,
  OperationsReport,
  StorageBackupList,
  Student,
  StudentDetail,
  StorageIntegrityReport,
  StorageStatus,
  Strand,
  Subject,
  WorkboardItem,
} from './types';

import { API_BASE } from './config';
import type { RewardCatalog } from './rewards';

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: {
      'x-lumo-role': 'admin',
      'x-lumo-user': 'Pilot Admin',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }

  return response.json();
}

export function fetchMeta() {
  return getJson<MetaResponse>('/api/v1/meta');
}

export function fetchDashboardSummary() {
  return getJson<DashboardSummary>('/api/v1/dashboard/summary');
}

export function fetchDashboardInsights() {
  return getJson<DashboardInsight[]>('/api/v1/dashboard/insights');
}

export function fetchWorkboard() {
  return getJson<WorkboardItem[]>('/api/v1/dashboard/workboard');
}

export function fetchStudents() {
  return getJson<Student[]>('/api/v1/students');
}

export function fetchStudent(id: string) {
  return getJson<StudentDetail>(`/api/v1/students/${id}`);
}

export function fetchMallams() {
  return getJson<Mallam[]>('/api/v1/mallams');
}

export function fetchMallam(id: string) {
  return getJson<MallamDetail>(`/api/v1/mallams/${id}`);
}

export function fetchAttendance() {
  return getJson<AttendanceRecord[]>('/api/v1/attendance');
}

export function fetchAssignments() {
  return getJson<Assignment[]>('/api/v1/assignments');
}

export function fetchCurriculumModules() {
  return getJson<CurriculumModule[]>('/api/v1/curriculum/modules');
}

export function fetchAssessments() {
  return getJson<Assessment[]>('/api/v1/assessments');
}

export function fetchPods() {
  return getJson<Pod[]>('/api/v1/pods');
}

export function fetchProgress() {
  return getJson<ProgressRecord[]>('/api/v1/progress');
}

export function fetchReportsOverview() {
  return getJson<ReportsOverview>('/api/v1/reports/overview');
}

export function fetchLessons() {
  return getJson<Lesson[]>('/api/v1/lessons');
}

export function fetchLesson(id: string) {
  return getJson<Lesson>(`/api/v1/lessons/${id}`);
}

export function fetchSubjects() {
  return getJson<Subject[]>('/api/v1/subjects');
}

export function fetchStrands() {
  return getJson<Strand[]>('/api/v1/strands');
}

export function fetchCohorts() {
  return getJson<Cohort[]>('/api/v1/cohorts');
}

export function fetchCenters() {
  return getJson<Center[]>('/api/v1/centers');
}

export function fetchStudentRewards(id: string) {
  return getJson<RewardSnapshot>(`/api/v1/students/${id}/rewards`);
}

export function fetchRewardsCatalog() {
  return getJson<RewardCatalog>('/api/v1/rewards/catalog');
}

export function fetchRewardsLeaderboard(limit = 10) {
  return getJson<RewardSnapshot[]>(`/api/v1/rewards/leaderboard?limit=${limit}`);
}

export function fetchRewardsReport(limit = 20) {
  return getJson<RewardsReport>(`/api/v1/reports/rewards?limit=${limit}`);
}

export function fetchStorageStatus() {
  return getJson<StorageStatus>('/api/v1/admin/storage/status');
}

export function fetchStorageIntegrity() {
  return getJson<StorageIntegrityReport>('/api/v1/admin/storage/integrity');
}

export function fetchStorageBackups(limit = 20) {
  return getJson<StorageBackupList>(`/api/v1/admin/storage/backups?limit=${limit}`);
}

export function fetchOperationsReport(limit = 20) {
  return getJson<OperationsReport>(`/api/v1/reports/operations?limit=${limit}`);
}
