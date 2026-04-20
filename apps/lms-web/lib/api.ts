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
  NgoSummary,
  Pod,
  ProgressRecord,
  ReportsOverview,
  RewardSnapshot,
  RewardRequestQueue,
  RewardsReport,
  OperationsReport,
  StorageBackupList,
  Student,
  StudentDetail,
  StorageIntegrityReport,
  StorageStatus,
  ConfigAudit,
  AssetRuntimeReport,
  Strand,
  Subject,
  WorkboardItem,
  LessonAsset,
} from './types';

import { API_BASE } from './config';
import type { RewardCatalog } from './rewards';
import type { CurriculumCanvasApiTree } from './curriculum-canvas';

export class ApiRequestError extends Error {
  status: number;
  path: string;

  constructor(path: string, status: number) {
    super(`Request failed (${status}): ${path}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
  }
}

export class ApiRequestTimeoutError extends Error {
  path: string;
  timeoutMs: number;

  constructor(path: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms: ${path}`);
    this.name = 'ApiRequestTimeoutError';
    this.path = path;
    this.timeoutMs = timeoutMs;
  }
}

const API_REQUEST_TIMEOUT_MS = 8000;

async function getJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      headers: {
        'x-lumo-role': 'admin',
        'x-lumo-user': 'Pilot Admin',
      },
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new ApiRequestError(path, response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApiRequestTimeoutError(path, API_REQUEST_TIMEOUT_MS);
    }

    throw error;
  }
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

export function fetchCurriculumCanvasTree() {
  return getJson<CurriculumCanvasApiTree>('/api/v1/curriculum/canvas');
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

export function fetchRewardRequests(limit = 20, params?: { cohortId?: string; podId?: string; mallamId?: string; status?: string }) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (params?.cohortId) query.set('cohortId', params.cohortId);
  if (params?.podId) query.set('podId', params.podId);
  if (params?.mallamId) query.set('mallamId', params.mallamId);
  if (params?.status) query.set('status', params.status);
  return getJson<RewardRequestQueue>(`/api/v1/rewards/requests?${query.toString()}`);
}

export function fetchRewardsReport(limit = 20, params?: { cohortId?: string; podId?: string; mallamId?: string; learnerId?: string; since?: string; until?: string }) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (params?.cohortId) query.set('cohortId', params.cohortId);
  if (params?.podId) query.set('podId', params.podId);
  if (params?.mallamId) query.set('mallamId', params.mallamId);
  if (params?.learnerId) query.set('learnerId', params.learnerId);
  if (params?.since) query.set('since', params.since);
  if (params?.until) query.set('until', params.until);
  return getJson<RewardsReport>(`/api/v1/reports/rewards?${query.toString()}`);
}

export function fetchNgoSummary(params?: { cohortId?: string; podId?: string; mallamId?: string; since?: string; until?: string }) {
  const query = new URLSearchParams();
  if (params?.cohortId) query.set('cohortId', params.cohortId);
  if (params?.podId) query.set('podId', params.podId);
  if (params?.mallamId) query.set('mallamId', params.mallamId);
  if (params?.since) query.set('since', params.since);
  if (params?.until) query.set('until', params.until);
  return getJson<NgoSummary>(`/api/v1/reports/ngo-summary${query.size ? `?${query.toString()}` : ''}`);
}

export function fetchStorageStatus() {
  return getJson<StorageStatus>('/api/v1/admin/storage/status');
}

export function fetchConfigAudit() {
  return getJson<ConfigAudit>('/api/v1/admin/config/audit');
}

export function fetchAssetRuntime(limit = 20) {
  return getJson<AssetRuntimeReport>(`/api/v1/admin/assets/runtime?limit=${limit}`);
}

export function fetchStorageIntegrity() {
  return getJson<StorageIntegrityReport>('/api/v1/admin/storage/integrity');
}

export function fetchStorageBackups(limit = 20) {
  return getJson<StorageBackupList>(`/api/v1/admin/storage/backups?limit=${limit}`);
}

export function fetchOperationsReport(limit = 20, params?: { cohortId?: string; podId?: string; mallamId?: string; learnerId?: string; since?: string; until?: string }) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (params?.cohortId) query.set('cohortId', params.cohortId);
  if (params?.podId) query.set('podId', params.podId);
  if (params?.mallamId) query.set('mallamId', params.mallamId);
  if (params?.learnerId) query.set('learnerId', params.learnerId);
  if (params?.since) query.set('since', params.since);
  if (params?.until) query.set('until', params.until);
  return getJson<OperationsReport>(`/api/v1/reports/operations?${query.toString()}`);
}


export function fetchLessonAssets(params?: { q?: string; subjectId?: string; moduleId?: string; lessonId?: string; kind?: string; status?: string; tag?: string; includeArchived?: string }) {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.subjectId) query.set('subjectId', params.subjectId);
  if (params?.moduleId) query.set('moduleId', params.moduleId);
  if (params?.lessonId) query.set('lessonId', params.lessonId);
  if (params?.kind) query.set('kind', params.kind);
  if (params?.status) query.set('status', params.status);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.includeArchived) query.set('includeArchived', params.includeArchived);
  return getJson<LessonAsset[]>(`/api/v1/assets${query.size ? `?${query.toString()}` : ''}`);
}
