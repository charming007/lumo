import type {
  Assignment,
  Assessment,
  AttendanceRecord,
  Center,
  Cohort,
  CurriculumModule,
  LocalGovernment,
  DashboardInsight,
  DashboardSummary,
  DeviceRegistration,
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
  State,
  Strand,
  Subject,
  WorkboardItem,
  LessonAsset,
} from './types';

import { API_BASE } from './config';
import type { RewardCatalog } from './rewards';
import type { CurriculumCanvasApiTree } from './curriculum-canvas';

function getAdminApiKey() {
  return String(process.env.LUMO_ADMIN_API_KEY || '').trim();
}

function assertProtectedApiKeyConfigured(role = 'admin') {
  if (role !== 'admin' && role !== 'teacher' && role !== 'facilitator') {
    return;
  }

  if (getAdminApiKey()) {
    return;
  }

  if (['production', 'staging'].includes(String(process.env.NODE_ENV || '').toLowerCase())) {
    throw new Error('LMS is missing LUMO_ADMIN_API_KEY, so it cannot authenticate to protected API endpoints. Add the same admin key to the LMS deployment env and redeploy.');
  }
}

function buildApiHeaders(role = 'admin') {
  const headers: Record<string, string> = {
    'x-lumo-role': role,
    'x-lumo-user': role === 'teacher' ? 'Teacher Demo' : 'Pilot Admin',
  };
  assertProtectedApiKeyConfigured(role);
  const adminApiKey = getAdminApiKey();

  if (adminApiKey) {
    headers['x-lumo-api-key'] = adminApiKey;
  }

  return headers;
}

type ApiResponseDiagnostic = {
  apiBase: string;
  requestUrl: string;
  contentType: string | null;
  bodySnippet: string | null;
  looksLikeHtml: boolean;
  routeMismatchLikely: boolean;
  backendMessage: string | null;
};

function snippet(value: string, maxLength = 180) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}…`;
}

async function buildResponseDiagnostic(response: Response, requestUrl: string): Promise<ApiResponseDiagnostic> {
  const contentType = response.headers.get('content-type');
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();
  const bodySnippet = trimmedBody ? snippet(trimmedBody) : null;
  const looksLikeHtml = /text\/html|application\/xhtml\+xml/i.test(contentType || '') || /^<!doctype html/i.test(trimmedBody) || /^<html/i.test(trimmedBody);

  let backendMessage: string | null = null;
  if (trimmedBody && !looksLikeHtml) {
    try {
      const decoded = JSON.parse(trimmedBody) as { message?: unknown };
      if (typeof decoded?.message === 'string' && decoded.message.trim()) {
        backendMessage = decoded.message.trim();
      }
    } catch {
      // ignore non-JSON bodies here; the snippet is still useful evidence.
    }
  }

  const routeMismatchLikely = response.status === 404 && (looksLikeHtml || /Cannot (GET|POST|PATCH|DELETE|PUT|OPTIONS)\b/i.test(trimmedBody));

  return {
    apiBase: API_BASE,
    requestUrl,
    contentType,
    bodySnippet,
    looksLikeHtml,
    routeMismatchLikely,
    backendMessage,
  };
}

export class ApiRequestError extends Error {
  status: number;
  path: string;
  diagnostic: ApiResponseDiagnostic;

  constructor(path: string, status: number, diagnostic: ApiResponseDiagnostic) {
    const routeHint = diagnostic.routeMismatchLikely
      ? ` Route mismatch likely: ${diagnostic.requestUrl} answered ${status}${diagnostic.looksLikeHtml ? ' with HTML' : ''}.`
      : '';
    const backendHint = diagnostic.backendMessage
      ? ` Backend said: ${diagnostic.backendMessage}.`
      : diagnostic.bodySnippet
        ? ` Response evidence: ${diagnostic.bodySnippet}`
        : '';
    super(`Request failed (${status}): ${path}. API base: ${diagnostic.apiBase}.${routeHint}${backendHint}`.trim());
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
    this.diagnostic = diagnostic;
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
  const requestUrl = `${API_BASE}${path}`;

  try {
    const response = await fetch(requestUrl, {
      cache: 'no-store',
      headers: buildApiHeaders(),
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const diagnostic = await buildResponseDiagnostic(response, requestUrl);
      throw new ApiRequestError(path, response.status, diagnostic);
    }

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();
    const trimmedBody = rawBody.trim();
    const looksLikeHtml = /text\/html|application\/xhtml\+xml/i.test(contentType) || /^<!doctype html/i.test(trimmedBody) || /^<html/i.test(trimmedBody);

    if (looksLikeHtml) {
      throw new ApiRequestError(path, response.status, {
        apiBase: API_BASE,
        requestUrl,
        contentType: contentType || null,
        bodySnippet: trimmedBody ? snippet(trimmedBody) : null,
        looksLikeHtml: true,
        routeMismatchLikely: true,
        backendMessage: null,
      });
    }

    return JSON.parse(rawBody) as T;
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

export function fetchDeviceRegistrations(params?: { podId?: string; mallamId?: string }) {
  const query = new URLSearchParams();
  if (params?.podId) query.set('podId', params.podId);
  if (params?.mallamId) query.set('mallamId', params.mallamId);
  return getJson<DeviceRegistration[]>(`/api/v1/device-registrations${query.size ? `?${query.toString()}` : ''}`);
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

export function fetchStates() {
  return getJson<State[]>('/api/v1/states');
}

export function fetchLocalGovernments() {
  return getJson<LocalGovernment[]>('/api/v1/local-governments');
}

export function fetchStudentRewards(id: string) {
  return getJson<RewardSnapshot>(`/api/v1/students/${id}/rewards`);
}

export function fetchRewardsCatalog() {
  return getJson<RewardCatalog>('/api/v1/rewards/catalog');
}

export function fetchRewardsLeaderboard(limit = 10, params?: { cohortId?: string; podId?: string; mallamId?: string }) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (params?.cohortId) query.set('cohortId', params.cohortId);
  if (params?.podId) query.set('podId', params.podId);
  if (params?.mallamId) query.set('mallamId', params.mallamId);
  return getJson<RewardSnapshot[]>(`/api/v1/rewards/leaderboard?${query.toString()}`);
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
