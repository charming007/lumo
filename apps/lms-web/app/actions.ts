'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';

import { API_BASE } from '../lib/config';
import { getModuleReleaseState } from '../lib/module-release';
import { buildSubjectMutationPayload } from '../lib/subject-lifecycle';

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

function buildApiHeaders(role = 'admin', includeJson = false) {
  const headers: Record<string, string> = {
    'x-lumo-role': role,
    'x-lumo-user': role === 'teacher' ? 'Teacher Demo' : 'Lumo Admin',
  };
  assertProtectedApiKeyConfigured(role);
  const adminApiKey = getAdminApiKey();

  if (adminApiKey) {
    headers['x-lumo-api-key'] = adminApiKey;
  }

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function apiRead<T>(path: string, role = 'admin') {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: buildApiHeaders(role),
  });

  if (!response.ok) {
    let detail = `Failed request: ${path}`;
    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
        detail = data.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) detail = text.trim();
      } catch {}
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

async function apiWrite<T = void>(path: string, method: string, payload?: Record<string, unknown>, role = 'admin', extraHeaders?: Record<string, string>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...buildApiHeaders(role, Boolean(payload)),
      ...(extraHeaders || {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    let detail = `Failed request: ${path}`;
    try {
      const data = await response.json();
      if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
        detail = data.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) detail = text.trim();
      } catch {}
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function sanitizeReturnPath(path?: string, fallback = '/content') {
  if (!path || !path.startsWith('/')) return fallback;
  if (path.startsWith('//')) return fallback;
  return path;
}

function appendSearchParams(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  return `${path}${path.includes('?') ? '&' : '?'}${searchParams.toString()}`;
}

function rethrowRedirectError(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

const LMS_ASSET_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const LMS_ASSET_KIND_UPLOAD_ALLOWLIST: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  illustration: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac'],
  'prompt-card': ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  'story-card': ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  'trace-card': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'letter-card': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  tile: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'word-card': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  hint: ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  transcript: ['text/plain', 'application/pdf'],
};

function describeActionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return fallback;
}

async function runAssetLibraryAction<T>({
  execute,
  returnPath,
  successMessage,
  failurePrefix,
}: {
  execute: () => Promise<T>;
  returnPath: string;
  successMessage: string;
  failurePrefix: string;
}) {
  try {
    await execute();
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, {
      message: `${failurePrefix}: ${describeActionError(error, 'asset operation could not be completed')}`,
    }));
  }

  revalidatePath('/content/assets');
  redirect(appendSearchParams(returnPath, { message: successMessage }));
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const rawValue = formData.get(key);

  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

type UploadLikeFile = {
  name: string;
  size: number;
  type?: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isUploadLikeFile(value: unknown): value is UploadLikeFile {
  if (!value || typeof value === 'string' || typeof value !== 'object') {
    return false;
  }

  return typeof (value as UploadLikeFile).name === 'string'
    && typeof (value as UploadLikeFile).size === 'number'
    && typeof (value as UploadLikeFile).arrayBuffer === 'function';
}

function normalizeCsvField(formData: FormData, key: string) {
  return String(formData.get(key) || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function buildAssetUploadFallbackPath(returnPath: string, options: {
  message: string;
  draftTitle?: string;
  draftDescription?: string;
  draftKind?: string;
  draftTags?: string[];
  subjectId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  suggestedMode?: 'register';
}) {
  const params = new URLSearchParams({ message: options.message });

  if (options.suggestedMode) params.set('assetMode', options.suggestedMode);
  if (options.draftTitle) params.set('draftTitle', options.draftTitle);
  if (options.draftDescription) params.set('draftDescription', options.draftDescription);
  if (options.draftKind) params.set('draftKind', options.draftKind);
  if (options.draftTags?.length) params.set('draftTags', options.draftTags.join(', '));
  if (options.subjectId) params.set('subjectId', options.subjectId);
  if (options.moduleId) params.set('moduleId', options.moduleId);
  if (options.lessonId) params.set('lessonId', options.lessonId);

  return appendSearchParams(returnPath, Object.fromEntries(params.entries()));
}

function isStorageAvailabilityError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('eacces')
    || normalized.includes('enospc')
    || normalized.includes('erofs')
    || normalized.includes('read-only file system')
    || normalized.includes('permission denied')
    || normalized.includes('no space left')
    || normalized.includes('failed to persist')
    || normalized.includes('failed to write');
}

async function resolvePodOwnership(podId: string | null | undefined) {
  if (!podId) {
    return { podId: null, primaryMallamId: null };
  }

  try {
    const pods = await apiRead<Array<{ id: string; mallamIds?: string[] | null; primaryMallamId?: string | null }>>('/api/v1/pods', 'admin');
    const pod = pods.find((item) => item.id === podId) || null;
    return {
      podId: pod?.id || podId,
      primaryMallamId: pod?.primaryMallamId || pod?.mallamIds?.[0] || null,
    };
  } catch {
    return { podId, primaryMallamId: null };
  }
}

async function resolvePrimaryMallamIdForPod(podId: string | null | undefined) {
  const ownership = await resolvePodOwnership(podId);
  return ownership.primaryMallamId;
}

async function resolvePrimaryPodIdForMallam(mallamId: string | null | undefined) {
  if (!mallamId) return null;

  try {
    const mallams = await apiRead<Array<{ id: string; primaryPodId?: string | null; podIds?: string[] | null }>>('/api/v1/mallams', 'admin');
    const mallam = mallams.find((item) => item.id === mallamId) || null;
    return mallam?.primaryPodId || mallam?.podIds?.[0] || null;
  } catch {
    return null;
  }
}

async function updateStudentMallamAssignment(studentId: string, mallamId: string | null) {
  // Keep roster ownership writes on the stable student PATCH route.
  // The specialized mallam assignment endpoints are easier to miss in older deployments and were the source of 404s.
  return apiWrite(`/api/v1/students/${studentId}`, 'PATCH', { mallamId }, 'admin');
}

export async function createAssignmentAction(formData: FormData) {
  const payload = {
    cohortId: String(formData.get('cohortId') || ''),
    lessonId: String(formData.get('lessonId') || ''),
    assignedBy: String(formData.get('assignedBy') || ''),
    dueDate: String(formData.get('dueDate') || ''),
    assessmentId: String(formData.get('assessmentId') || ''),
    status: String(formData.get('status') || 'active'),
  };

  await apiWrite('/api/v1/assignments', 'POST', payload);
  revalidatePath('/');
  revalidatePath('/assignments');
  revalidatePath('/students');
  revalidatePath('/mallams');
  redirect('/assignments?message=Assignment%20created%20and%20linked%20to%20delivery%20ops');
}

export async function updateAssignmentAction(formData: FormData) {
  const assignmentId = String(formData.get('assignmentId') || '');
  const payload = {
    cohortId: String(formData.get('cohortId') || ''),
    assignedBy: String(formData.get('assignedBy') || ''),
    dueDate: String(formData.get('dueDate') || ''),
    status: String(formData.get('status') || ''),
  };

  await apiWrite(`/api/v1/assignments/${assignmentId}`, 'PATCH', payload);
  revalidatePath('/assignments');
  revalidatePath('/students');
  revalidatePath('/mallams');
  redirect('/assignments?message=Assignment%20updated%20for%20the%20next%20delivery%20window');
}

export async function createObservationAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');
  const teacherId = String(formData.get('teacherId') || '');
  const payload = {
    studentId,
    teacherId,
    note: String(formData.get('note') || ''),
    competencyTag: String(formData.get('competencyTag') || ''),
    supportLevel: String(formData.get('supportLevel') || 'guided'),
  };

  await apiWrite('/api/v1/observations', 'POST', payload, 'teacher');
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}?message=Observation%20saved%20for%20this%20learner`);
}

export async function createStudentAction(formData: FormData) {
  const cohortId = String(formData.get('cohortId') || '').trim();
  const podId = String(formData.get('podId') || '').trim();
  const mallamId = await resolvePrimaryMallamIdForPod(podId);

  if (!podId) {
    redirect('/students?message=Learner%20creation%20failed%3A%20select%20a%20pod%20first');
  }

  const payload = {
    name: String(formData.get('name') || ''),
    age: Number(formData.get('age') || 0),
    gender: String(formData.get('gender') || 'unspecified'),
    cohortId,
    podId,
    mallamId,
    level: String(formData.get('level') || 'beginner'),
    stage: String(formData.get('stage') || 'foundation-a'),
    attendanceRate: Number(formData.get('attendanceRate') || 0.85),
    guardianName: String(formData.get('guardianName') || ''),
    deviceAccess: String(formData.get('deviceAccess') || 'shared-tablet'),
  };

  await apiWrite('/api/v1/students', 'POST', payload);
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  redirect('/students?message=Learner%20created%20and%20added%20to%20the%20roster');
}

export async function updateStudentAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');
  const podId = String(formData.get('podId') || '').trim();
  const payload = {
    name: String(formData.get('name') || ''),
    cohortId: String(formData.get('cohortId') || '').trim(),
    podId,
    mallamId: await resolvePrimaryMallamIdForPod(podId),
    level: String(formData.get('level') || ''),
    stage: String(formData.get('stage') || ''),
    attendanceRate: Number(formData.get('attendanceRate') || 0),
    guardianName: String(formData.get('guardianName') || ''),
    deviceAccess: String(formData.get('deviceAccess') || ''),
  };

  await apiWrite(`/api/v1/students/${studentId}`, 'PATCH', payload);
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath(`/students/${studentId}`);
  redirect('/students?message=Learner%20updated');
}

export async function deleteStudentAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');

  await apiWrite(`/api/v1/students/${studentId}`, 'DELETE');
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  redirect('/students?message=Learner%20removed%20from%20the%20roster');
}

export async function assignLearnerMallamAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), `/students/${studentId}`);
  const podId = String(formData.get('podId') || '').trim();
  const mallamId = await resolvePrimaryMallamIdForPod(podId);

  if (!podId) {
    redirect(appendSearchParams(returnPath, {
      message: 'Learner routing failed: select a pod first',
    }));
  }

  await apiWrite(`/api/v1/students/${studentId}`, 'PATCH', { podId, mallamId }, 'admin');
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath('/pods');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: mallamId ? 'Learner moved and primary mallam derived from pod' : 'Learner moved, but the selected pod still needs a primary mallam',
  }));
}

export async function assignLearnerToMallamAction(formData: FormData) {
  const mallamId = String(formData.get('mallamId') || '').trim();
  const studentId = String(formData.get('studentId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), `/mallams/${mallamId}`);

  if (!mallamId) {
    redirect(appendSearchParams(returnPath, {
      message: 'Learner move failed: missing mallam id',
    }));
  }

  const targetPodId = await resolvePrimaryPodIdForMallam(mallamId);
  if (!targetPodId) {
    redirect(appendSearchParams(returnPath, {
      message: 'Learner move failed: this mallam has no primary pod yet',
    }));
  }

  const ownership = await resolvePodOwnership(targetPodId);
  await apiWrite(`/api/v1/students/${studentId}`, 'PATCH', {
    podId: ownership.podId,
    mallamId: ownership.primaryMallamId,
  }, 'admin');
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath('/pods');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: ownership.primaryMallamId
      ? 'Learner moved and primary mallam derived from pod'
      : 'Learner moved, but this mallam still needs a primary pod owner',
  }));
}

export async function createMallamAction(formData: FormData) {
  const podIds = Array.from(formData.getAll('podIds')).map((item) => String(item || '').trim()).filter(Boolean);
  const payload = {
    name: String(formData.get('name') || ''),
    displayName: String(formData.get('displayName') || ''),
    centerId: String(formData.get('centerId') || ''),
    stateId: String(formData.get('stateId') || ''),
    localGovernmentId: String(formData.get('localGovernmentId') || ''),
    role: String(formData.get('role') || 'mallam-lead'),
    status: String(formData.get('status') || 'active'),
    learnerCount: Number(formData.get('learnerCount') || 0),
    certificationLevel: String(formData.get('certificationLevel') || 'Level 1'),
    podIds,
    primaryPodId: podIds[0] || '',
    languages: String(formData.get('languages') || 'Hausa, English').split(',').map((item) => item.trim()).filter(Boolean),
  };

  await apiWrite('/api/v1/mallams', 'POST', payload);
  revalidatePath('/');
  revalidatePath('/mallams');
  redirect('/mallams?message=Mallam%20created%20and%20ready%20for%20deployment');
}

export async function updateMallamAction(formData: FormData) {
  const mallamId = String(formData.get('mallamId') || '');
  const podIds = Array.from(formData.getAll('podIds')).map((item) => String(item || '').trim()).filter(Boolean);
  const payload = {
    name: String(formData.get('name') || ''),
    displayName: String(formData.get('displayName') || ''),
    centerId: String(formData.get('centerId') || ''),
    stateId: String(formData.get('stateId') || ''),
    localGovernmentId: String(formData.get('localGovernmentId') || ''),
    role: String(formData.get('role') || ''),
    status: String(formData.get('status') || ''),
    learnerCount: Number(formData.get('learnerCount') || 0),
    certificationLevel: String(formData.get('certificationLevel') || ''),
    podIds,
    primaryPodId: podIds[0] || '',
    languages: String(formData.get('languages') || '').split(',').map((item) => item.trim()).filter(Boolean),
  };

  await apiWrite(`/api/v1/mallams/${mallamId}`, 'PATCH', payload);
  revalidatePath('/');
  revalidatePath('/mallams');
  revalidatePath(`/mallams/${mallamId}`);
  redirect('/mallams?message=Mallam%20updated');
}

export async function deleteMallamAction(formData: FormData) {
  const mallamId = String(formData.get('mallamId') || '');

  await apiWrite(`/api/v1/mallams/${mallamId}`, 'DELETE');
  revalidatePath('/');
  revalidatePath('/mallams');
  revalidatePath('/students');
  redirect('/mallams?message=Mallam%20removed%20from%20deployment');
}

export async function createSubjectAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    ...buildSubjectMutationPayload(formData, { includeId: true, includeInitialStrandName: true }),
    icon: String(formData.get('icon') || 'menu_book'),
  };

  await apiWrite('/api/v1/subjects', 'POST', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Subject created and added to the library',
  }));
}

export async function updateSubjectAction(formData: FormData) {
  const subjectId = String(formData.get('subjectId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = buildSubjectMutationPayload(formData);

  await apiWrite(`/api/v1/subjects/${subjectId}`, 'PATCH', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Subject changes saved',
  }));
}

export async function quickUpdateSubjectStatusAction(formData: FormData) {
  const subjectId = String(formData.get('subjectId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const status = String(formData.get('status') || 'draft');

  await apiWrite(`/api/v1/subjects/${subjectId}`, 'PATCH', { status });
  revalidatePath('/content');
  revalidatePath('/canvas');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: `Subject moved to ${status}`,
  }));
}

export async function deleteSubjectAction(formData: FormData) {
  const subjectId = String(formData.get('subjectId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');

  await apiWrite(`/api/v1/subjects/${subjectId}`, 'DELETE');
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Subject removed from the library',
  }));
}

export async function createStrandAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    name: String(formData.get('name') || ''),
    order: Number(formData.get('order') || 0),
    status: String(formData.get('status') || 'draft'),
  };

  await apiWrite('/api/v1/strands', 'POST', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Strand created and ready for module planning',
  }));
}

export async function updateStrandAction(formData: FormData) {
  const strandId = String(formData.get('strandId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    name: String(formData.get('name') || ''),
    order: Number(formData.get('order') || 0),
    status: String(formData.get('status') || 'draft'),
  };

  await apiWrite(`/api/v1/strands/${strandId}`, 'PATCH', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Strand changes saved',
  }));
}

export async function deleteStrandAction(formData: FormData) {
  const strandId = String(formData.get('strandId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');

  await apiWrite(`/api/v1/strands/${strandId}`, 'DELETE');
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Strand removed from the library',
  }));
}

export async function createModuleAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    strandId: String(formData.get('strandId') || ''),
    title: String(formData.get('title') || ''),
    level: String(formData.get('level') || 'beginner'),
    lessonCount: Number(formData.get('lessonCount') || 0),
    order: Number(formData.get('order') || 0),
    status: String(formData.get('status') || 'draft'),
  };

  await apiWrite('/api/v1/curriculum/modules', 'POST', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Module created and added to the publishing board',
  }));
}

export async function updateModuleAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    title: String(formData.get('title') || '').trim(),
    status: String(formData.get('status') || ''),
    lessonCount: Number(formData.get('lessonCount') || 0),
    level: String(formData.get('level') || ''),
  };

  await apiWrite(`/api/v1/curriculum/modules/${moduleId}`, 'PATCH', payload);
  revalidatePath('/');
  revalidatePath('/content');
  revalidatePath('/canvas');
  redirect(appendSearchParams(returnPath, {
    message: 'Module changes saved',
  }));
}

export async function createLessonAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const openEditorAfterCreate = String(formData.get('openEditorAfterCreate') || '') === '1';
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    moduleId: String(formData.get('moduleId') || ''),
    title: String(formData.get('title') || ''),
    order: Number(formData.get('order') || 0) || undefined,
    durationMinutes: Number(formData.get('durationMinutes') || 0),
    mode: String(formData.get('mode') || 'guided'),
    status: String(formData.get('status') || 'draft'),
    targetAgeRange: String(formData.get('targetAgeRange') || '') || null,
    voicePersona: String(formData.get('voicePersona') || '') || null,
    learningObjectives: parseJsonField<string[]>(formData, 'learningObjectives', []),
    localization: parseJsonField<Record<string, unknown> | null>(formData, 'localization', null),
    lessonAssessment: parseJsonField<Record<string, unknown> | null>(formData, 'lessonAssessment', null),
    activitySteps: parseJsonField<Array<Record<string, unknown>>>(formData, 'activitySteps', []),
  };

  if (!payload.subjectId || !payload.moduleId) {
    const errorParams = new URLSearchParams({
      message: 'Pick a valid subject and module before creating a lesson.',
    });
    redirect(`${returnPath}?${errorParams.toString()}`);
  }

  const lesson = await apiWrite<{ id: string; title?: string; moduleId?: string; subjectId?: string }>('/api/v1/lessons', 'POST', payload);
  revalidatePath('/content');
  revalidatePath(`/content/lessons/${lesson.id}`);

  const lessonTitle = lesson.title ?? payload.title;
  const moduleId = lesson.moduleId ?? payload.moduleId;
  const subjectId = lesson.subjectId ?? payload.subjectId;
  if (openEditorAfterCreate) {
    const editorParams = new URLSearchParams({
      from: returnPath,
      message: 'Lesson shell created. Now finish the real authoring pack.',
    });

    redirect(`/content/lessons/${lesson.id}?${editorParams.toString()}`);
  }

  const successParams = new URLSearchParams({
    createdLessonId: lesson.id,
    createdLessonTitle: lessonTitle,
    moduleId,
    subjectId,
    from: returnPath,
    message: 'Lesson created. Pick your next move below.',
  });

  redirect(`/content/lessons/new?${successParams.toString()}`);
}

export async function updateLessonAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    subjectId: String(formData.get('subjectId') || '') || undefined,
    moduleId: String(formData.get('moduleId') || '') || undefined,
    title: String(formData.get('title') || '') || undefined,
    order: Number(formData.get('order') || 0) || undefined,
    status: String(formData.get('status') || ''),
    mode: String(formData.get('mode') || ''),
    durationMinutes: Number(formData.get('durationMinutes') || 0),
    targetAgeRange: String(formData.get('targetAgeRange') || '') || null,
    voicePersona: String(formData.get('voicePersona') || '') || null,
    learningObjectives: parseJsonField<string[]>(formData, 'learningObjectives', []),
    localization: parseJsonField<Record<string, unknown> | null>(formData, 'localization', null),
    lessonAssessment: parseJsonField<Record<string, unknown> | null>(formData, 'lessonAssessment', null),
    activitySteps: parseJsonField<Array<Record<string, unknown>>>(formData, 'activitySteps', []),
  };

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'PATCH', payload);
  revalidatePath('/content');
  revalidatePath(`/content/lessons/${lessonId}`);
  redirect(appendSearchParams(returnPath, {
    message: 'Lesson authoring pack saved',
  }));
}



export async function registerLessonAssetAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');
  const payload = {
    kind: String(formData.get('kind') || 'image'),
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || ''),
    subjectId: String(formData.get('subjectId') || '') || null,
    moduleId: String(formData.get('moduleId') || '') || null,
    lessonId: String(formData.get('lessonId') || '') || null,
    tags: String(formData.get('tags') || '').split(',').map((item) => item.trim()).filter(Boolean),
    fileUrl: String(formData.get('fileUrl') || '') || null,
    storagePath: String(formData.get('storagePath') || '') || null,
    source: 'manual',
    status: 'ready',
  };

  await runAssetLibraryAction({
    execute: () => apiWrite('/api/v1/assets', 'POST', payload),
    returnPath,
    successMessage: 'Asset registered in library',
    failurePrefix: 'Asset registration failed',
  });
}

export async function uploadLessonAssetAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');
  const file = formData.get('file');
  const normalizedKind = String(formData.get('kind') || 'image');
  const subjectId = String(formData.get('subjectId') || '') || null;
  const moduleId = String(formData.get('moduleId') || '') || null;
  const lessonId = String(formData.get('lessonId') || '') || null;
  const draftDescription = String(formData.get('description') || '');
  const draftTags = normalizeCsvField(formData, 'tags');

  try {
    if (!isUploadLikeFile(file) || file.size === 0) {
      redirect(buildAssetUploadFallbackPath(returnPath, {
        message: 'Pick a real file before uploading. If storage is unavailable, use Register external asset instead.',
        draftDescription,
        draftKind: normalizedKind,
        draftTags,
        subjectId,
        moduleId,
        lessonId,
        suggestedMode: 'register',
      }));
    }

    const normalizedMimeType = String(file.type || 'application/octet-stream').toLowerCase();
    const allowedMimeTypes = LMS_ASSET_KIND_UPLOAD_ALLOWLIST[normalizedKind] || [];
    const draftTitle = String(formData.get('title') || file.name.replace(/\.[^.]+$/, ''));

    if (file.size > LMS_ASSET_UPLOAD_MAX_BYTES) {
      redirect(buildAssetUploadFallbackPath(returnPath, {
        message: `Upload failed: file exceeds ${Math.round(LMS_ASSET_UPLOAD_MAX_BYTES / (1024 * 1024))} MB limit`,
        draftTitle,
        draftDescription,
        draftKind: normalizedKind,
        draftTags,
        subjectId,
        moduleId,
        lessonId,
        suggestedMode: 'register',
      }));
    }

    if (allowedMimeTypes.length && !allowedMimeTypes.includes(normalizedMimeType)) {
      redirect(buildAssetUploadFallbackPath(returnPath, {
        message: `Upload failed: ${normalizedKind} does not accept ${normalizedMimeType || 'this file type'}`,
        draftTitle,
        draftDescription,
        draftKind: normalizedKind,
        draftTags,
        subjectId,
        moduleId,
        lessonId,
        suggestedMode: 'register',
      }));
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const payload = {
      fileName: file.name,
      contentType: normalizedMimeType,
      base64: bytes.toString('base64'),
      kind: normalizedKind,
      title: draftTitle,
      description: draftDescription,
      subjectId,
      moduleId,
      lessonId,
      tags: draftTags,
    };

    await runAssetLibraryAction({
      execute: () => apiWrite('/api/v1/assets/upload', 'POST', payload),
      returnPath,
      successMessage: 'Asset uploaded and registered',
      failurePrefix: 'Upload failed',
    });
  } catch (error) {
    rethrowRedirectError(error);
    const message = describeActionError(error, 'asset upload could not be completed');
    redirect(buildAssetUploadFallbackPath(returnPath, {
      message: isStorageAvailabilityError(message)
        ? `Upload storage is unavailable right now: ${message}. Use Register external asset below with a CDN/runtime URL while storage is repaired.`
        : `Upload failed: ${message}`,
      draftTitle: isUploadLikeFile(file) ? String(formData.get('title') || file.name.replace(/\.[^.]+$/, '')) : String(formData.get('title') || ''),
      draftDescription,
      draftKind: normalizedKind,
      draftTags,
      subjectId,
      moduleId,
      lessonId,
      suggestedMode: 'register',
    }));
  }
}

export async function updateLessonAssetAction(formData: FormData) {
  const assetId = String(formData.get('assetId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');
  const payload = {
    kind: String(formData.get('kind') || 'image'),
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || ''),
    subjectId: String(formData.get('subjectId') || '') || null,
    moduleId: String(formData.get('moduleId') || '') || null,
    lessonId: String(formData.get('lessonId') || '') || null,
    tags: String(formData.get('tags') || '').split(',').map((item) => item.trim()).filter(Boolean),
    fileUrl: String(formData.get('fileUrl') || '') || null,
    storagePath: String(formData.get('storagePath') || '') || null,
    status: String(formData.get('status') || 'ready'),
  };

  await runAssetLibraryAction({
    execute: () => apiWrite(`/api/v1/assets/${assetId}`, 'PATCH', payload),
    returnPath,
    successMessage: 'Asset details saved',
    failurePrefix: 'Asset update failed',
  });
}

export async function archiveLessonAssetAction(formData: FormData) {
  const assetId = String(formData.get('assetId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');
  const nextStatus = String(formData.get('status') || 'archived');

  await runAssetLibraryAction({
    execute: () => apiWrite(`/api/v1/assets/${assetId}`, 'PATCH', { status: nextStatus }),
    returnPath,
    successMessage: nextStatus === 'archived' ? 'Asset archived' : 'Asset restored to ready',
    failurePrefix: nextStatus === 'archived' ? 'Asset archive failed' : 'Asset restore failed',
  });
}

export async function deleteLessonAssetAction(formData: FormData) {
  const assetId = String(formData.get('assetId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');

  await runAssetLibraryAction({
    execute: () => apiWrite(`/api/v1/assets/${assetId}`, 'DELETE', undefined, 'admin', {
      'x-lumo-confirm-action': 'asset-delete',
      'idempotency-key': `asset-delete-${assetId}`,
    }),
    returnPath,
    successMessage: 'Asset permanently deleted',
    failurePrefix: 'Asset deletion failed',
  });
}

export async function createAssessmentAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    moduleId: String(formData.get('moduleId') || ''),
    title: String(formData.get('title') || ''),
    kind: String(formData.get('kind') || 'automatic'),
    trigger: String(formData.get('trigger') || 'module-complete'),
    triggerLabel: String(formData.get('triggerLabel') || ''),
    progressionGate: String(formData.get('progressionGate') || 'foundation-a'),
    passingScore: Number(formData.get('passingScore') || 0.6),
    status: String(formData.get('status') || 'draft'),
  };

  await apiWrite('/api/v1/assessments', 'POST', payload);
  revalidatePath('/');
  revalidatePath('/content');
  redirect(appendSearchParams(returnPath, {
    message: 'Assessment created and linked to a release gate',
  }));
}

export async function quickUpdateLessonStatusAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');
  const status = String(formData.get('status') || 'draft');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'PATCH', { status });
  revalidatePath('/canvas');
  revalidatePath('/content');
  revalidatePath(`/content/lessons/${lessonId}`);
  redirect(appendSearchParams(returnPath, {
    message: `Lesson moved to ${status}`,
  }));
}

export async function quickUpdateCanvasModuleAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');
  const title = String(formData.get('title') || '').trim();
  const status = String(formData.get('status') || 'draft');
  const level = String(formData.get('level') || '').trim();
  const lessonCount = Math.max(Number(formData.get('lessonCount') || 0), 0);

  try {
    if (!['draft', 'review', 'published'].includes(status)) {
      redirect(appendSearchParams(returnPath, {
        message: `Module update blocked: unsupported module status “${status}”.`,
      }));
    }

    if (status === 'review' || status === 'published') {
      const [modules, lessons, assessments, subjects] = await Promise.all([
        apiRead<Array<Record<string, unknown>>>('/api/v1/curriculum/modules'),
        apiRead<Array<Record<string, unknown>>>('/api/v1/lessons'),
        apiRead<Array<Record<string, unknown>>>('/api/v1/assessments'),
        apiRead<Array<Record<string, unknown>>>('/api/v1/subjects'),
      ]);

      const module = modules.find((item) => item.id === moduleId) as any;
      if (!module) {
        redirect(appendSearchParams(returnPath, {
          message: 'Module update blocked: the selected module no longer exists.',
        }));
      }

      const releaseState = getModuleReleaseState({
        module: {
          ...module,
          title: title || String(module.title || ''),
          level: level || String(module.level || ''),
          lessonCount,
          status,
        } as any,
        lessons: lessons as any,
        assessments: assessments as any,
        subjects: subjects as any,
      });

      const blockers = status === 'published'
        ? releaseState.publishBlockers
        : releaseState.reviewBlockers;

      if (blockers.length) {
        redirect(appendSearchParams(returnPath, {
          message: `Module update blocked: ${blockers.join(' ')}`,
        }));
      }
    }

    await apiWrite(`/api/v1/curriculum/modules/${moduleId}`, 'PATCH', {
      title,
      status,
      level,
      lessonCount,
    });
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, {
      message: `Module update failed: ${describeActionError(error, 'module quick edit could not be completed')}`,
    }));
  }

  revalidatePath('/canvas');
  revalidatePath('/content');
  redirect(appendSearchParams(returnPath, {
    message: status === 'published'
      ? 'Module published'
      : status === 'review'
        ? 'Module moved to review'
        : 'Module quick edit saved',
  }));
}

export async function bulkUpdateCanvasModuleLessonsAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');
  const subjectId = String(formData.get('subjectId') || '');
  const moduleTitle = String(formData.get('moduleTitle') || 'this module').trim() || 'this module';
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');
  const targetStatus = String(formData.get('status') || 'review');
  const lessonIds = Array.from(formData.getAll('lessonIds')).map((value) => String(value || '')).filter(Boolean);

  await Promise.all(lessonIds.map((lessonId) => apiWrite(`/api/v1/lessons/${lessonId}`, 'PATCH', { status: targetStatus })));

  revalidatePath('/canvas');
  revalidatePath('/content');
  redirect(appendSearchParams(returnPath, {
    message: lessonIds.length
      ? `${lessonIds.length} ${moduleTitle} lesson${lessonIds.length === 1 ? '' : 's'} moved to ${targetStatus}`
      : `No lessons were available to move in ${moduleTitle}`,
  }));
}

export async function createCanvasModuleLessonShellsAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');
  const subjectId = String(formData.get('subjectId') || '');
  const moduleTitle = String(formData.get('moduleTitle') || 'this module').trim() || 'this module';
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');
  const missingCount = Math.max(Number(formData.get('missingCount') || 0), 0);
  const startIndex = Math.max(Number(formData.get('startIndex') || 0), 0);
  const titles = Array.from(formData.getAll('titles')).map((value) => String(value || '').trim()).filter(Boolean);
  const orders = Array.from(formData.getAll('orders')).map((value) => Number(value || 0)).filter((value) => value > 0);

  if (!moduleId || !subjectId || missingCount <= 0 || titles.length === 0) {
    redirect(appendSearchParams(returnPath, {
      message: `No missing lesson shells were created for ${moduleTitle}`,
    }));
  }

  const shellTitles = titles.slice(0, missingCount);

  await Promise.all(shellTitles.map((title, index) => apiWrite('/api/v1/lessons', 'POST', {
    subjectId,
    moduleId,
    title,
    order: orders[index] ?? (startIndex + index + 1),
    durationMinutes: 20,
    mode: 'guided',
    status: 'draft',
    targetAgeRange: null,
    voicePersona: null,
    learningObjectives: [
      `Complete module sequence slot ${startIndex + index + 1} for ${moduleTitle}`,
    ],
    localization: null,
    lessonAssessment: null,
    activitySteps: [],
  })));

  revalidatePath('/canvas');
  revalidatePath('/content');
  redirect(appendSearchParams(returnPath, {
    message: `${shellTitles.length} draft lesson shell${shellTitles.length === 1 ? '' : 's'} created for ${moduleTitle}`,
  }));
}

export async function quickUpdateCanvasLessonAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');
  const title = String(formData.get('title') || '').trim();
  const status = String(formData.get('status') || 'draft');
  const mode = String(formData.get('mode') || 'guided');
  const order = Number(formData.get('order') || 0) || undefined;
  const durationMinutes = Number(formData.get('durationMinutes') || 0);

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'PATCH', {
    title,
    status,
    mode,
    order,
    durationMinutes,
  });
  revalidatePath('/canvas');
  revalidatePath('/content');
  revalidatePath(`/content/lessons/${lessonId}`);
  redirect(appendSearchParams(returnPath, {
    message: 'Lesson quick edit saved',
  }));
}

export async function quickLinkCanvasLessonAssessmentAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');
  const assessmentId = String(formData.get('assessmentId') || '').trim();
  const assessmentTitle = String(formData.get('assessmentTitle') || '').trim();
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');

  const lesson = await apiRead<{
    lessonAssessment?: { [key: string]: unknown; title?: string | null; assessmentId?: string | null; items?: Array<Record<string, unknown>> } | null;
  }>(`/api/v1/lessons/${lessonId}`);

  const nextLessonAssessment = lesson.lessonAssessment && typeof lesson.lessonAssessment === 'object'
    ? { ...lesson.lessonAssessment }
    : {};

  if (assessmentId && assessmentTitle) {
    nextLessonAssessment.title = assessmentTitle;
    nextLessonAssessment.assessmentId = assessmentId;
  } else {
    delete nextLessonAssessment.title;
    delete nextLessonAssessment.assessmentId;
  }

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'PATCH', {
    lessonAssessment: nextLessonAssessment,
  });

  revalidatePath('/canvas');
  revalidatePath('/content');
  revalidatePath(`/content/lessons/${lessonId}`);
  redirect(appendSearchParams(returnPath, {
    message: assessmentId && assessmentTitle ? 'Lesson gate link saved from canvas' : 'Lesson gate link cleared from canvas',
  }));
}

export async function quickUpdateAssessmentStatusAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') || '');
  const status = String(formData.get('status') || 'draft');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');

  await apiWrite(`/api/v1/assessments/${assessmentId}`, 'PATCH', { status });
  revalidatePath('/canvas');
  revalidatePath('/content');
  redirect(appendSearchParams(returnPath, {
    message: `Assessment moved to ${status}`,
  }));
}

export async function quickUpdateCanvasAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');
  const title = String(formData.get('title') || '').trim();
  const status = String(formData.get('status') || 'draft');
  const triggerLabel = String(formData.get('triggerLabel') || '').trim();
  const progressionGate = String(formData.get('progressionGate') || '').trim();
  const passingScore = Number(formData.get('passingScore') || 0);

  await apiWrite(`/api/v1/assessments/${assessmentId}`, 'PATCH', {
    title,
    status,
    triggerLabel,
    progressionGate,
    passingScore,
  });
  revalidatePath('/canvas');
  revalidatePath('/content');
  revalidatePath('/assessments');
  redirect(appendSearchParams(returnPath, {
    message: 'Assessment quick edit saved',
  }));
}

export async function createCanvasAssessmentQuickAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/canvas');
  const subjectId = String(formData.get('subjectId') || '');
  const moduleId = String(formData.get('moduleId') || '');
  const moduleTitle = String(formData.get('moduleTitle') || 'this module').trim() || 'this module';

  await apiWrite('/api/v1/assessments', 'POST', {
    subjectId,
    moduleId,
    title: `${moduleTitle} progression check`,
    kind: 'manual',
    trigger: 'module-complete',
    triggerLabel: 'After module completion',
    progressionGate: 'foundation-a',
    passingScore: 0.6,
    status: 'draft',
  });
  revalidatePath('/canvas');
  revalidatePath('/content');
  revalidatePath('/assessments');
  redirect(appendSearchParams(returnPath, {
    message: 'Draft assessment gate created from canvas',
  }));
}

export async function updateAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');
  const payload = {
    title: String(formData.get('title') || ''),
    kind: String(formData.get('kind') || ''),
    trigger: String(formData.get('trigger') || ''),
    triggerLabel: String(formData.get('triggerLabel') || ''),
    progressionGate: String(formData.get('progressionGate') || ''),
    passingScore: Number(formData.get('passingScore') || 0),
    status: String(formData.get('status') || ''),
  };

  await apiWrite(`/api/v1/assessments/${assessmentId}`, 'PATCH', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Assessment changes saved',
  }));
}

export async function deleteModuleAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');

  await apiWrite(`/api/v1/curriculum/modules/${moduleId}`, 'DELETE');
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Module removed from the library',
  }));
}

export async function deleteLessonAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'DELETE');
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Lesson removed from the library',
  }));
}

export async function deleteAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content');

  await apiWrite(`/api/v1/assessments/${assessmentId}`, 'DELETE');
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Assessment gate removed',
  }));
}

export async function createAttendanceAction(formData: FormData) {
  const payload = {
    studentId: String(formData.get('studentId') || ''),
    date: String(formData.get('date') || ''),
    status: String(formData.get('status') || 'present'),
  };

  await apiWrite('/api/v1/attendance', 'POST', payload, 'teacher');
  revalidatePath('/attendance');
  revalidatePath('/students');
  redirect('/attendance?message=Attendance%20captured%20for%20the%20selected%20learner');
}

export async function createProgressAction(formData: FormData) {
  const payload = {
    studentId: String(formData.get('studentId') || ''),
    subjectId: String(formData.get('subjectId') || ''),
    moduleId: String(formData.get('moduleId') || ''),
    mastery: Number(formData.get('mastery') || 0),
    lessonsCompleted: Number(formData.get('lessonsCompleted') || 0),
    progressionStatus: String(formData.get('progressionStatus') || 'on-track'),
    recommendedNextModuleId: String(formData.get('recommendedNextModuleId') || ''),
  };

  await apiWrite('/api/v1/progress', 'POST', payload, 'teacher');
  revalidatePath('/progress');
  revalidatePath('/students');
  redirect('/progress?message=Progress%20snapshot%20recorded');
}

export async function updateProgressAction(formData: FormData) {
  const progressId = String(formData.get('progressId') || '');
  const progressionStatus = String(formData.get('progressionStatus') || 'on-track');
  const overrideReason = String(formData.get('overrideReason') || '').trim();
  const payload = {
    mastery: Number(formData.get('mastery') || 0),
    lessonsCompleted: Number(formData.get('lessonsCompleted') || 0),
    progressionStatus,
    recommendedNextModuleId: String(formData.get('recommendedNextModuleId') || ''),
    override: overrideReason
      ? {
          status: progressionStatus,
          reason: overrideReason,
          actorName: 'Lumo Admin',
          actorRole: 'admin',
        }
      : null,
  };

  await apiWrite(`/api/v1/progress/${progressId}`, 'PATCH', payload, 'admin');
  revalidatePath('/progress');
  revalidatePath('/students');
  redirect(`/progress?message=${overrideReason ? 'Progression%20override%20saved' : 'Progress%20record%20updated'}`);
}

export async function awardStudentRewardAction(formData: FormData) {
  const studentId = String(formData.get('studentId') || '');
  const xpDelta = Number(formData.get('xpDelta') || 0);
  const badgeId = String(formData.get('badgeId') || '').trim();
  const label = String(formData.get('label') || '').trim();
  const payload = {
    xpDelta,
    badgeId: badgeId || null,
    label: label || null,
    metadata: {
      source: 'lms-web-admin',
      awardedBy: 'Lumo Admin',
    },
  };

  await apiWrite(`/api/v1/students/${studentId}/rewards`, 'POST', payload, 'admin');
  revalidatePath('/rewards');
  revalidatePath('/students');
  redirect('/rewards?message=Reward%20adjustment%20saved');
}

export async function correctRewardTransactionAction(formData: FormData) {
  const transactionId = String(formData.get('transactionId') || '').trim();
  const xpDelta = Number(formData.get('xpDelta') || 0);
  const label = String(formData.get('label') || '').trim();
  const reason = String(formData.get('reason') || '').trim() || 'manual_correction';
  const note = String(formData.get('note') || '').trim();

  if (!transactionId) {
    redirect(`/rewards?message=${encodeMessage('Correction failed: missing transaction id')}`);
  }

  try {
    await apiWrite(`/api/v1/rewards/transactions/${transactionId}/correct`, 'POST', {
      xpDelta,
      label: label || null,
      reason,
      note,
      metadata: {
        source: 'lms-web-admin',
        adjustedBy: 'Lumo Admin',
      },
    }, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    const message = error instanceof Error ? error.message : 'Reward correction failed';
    redirect(`/rewards?message=${encodeMessage(`Correction failed: ${message}`)}`);
  }

  revalidatePath('/rewards');
  revalidatePath('/students');
  redirect('/rewards?message=Reward%20transaction%20corrected');
}

export async function revokeRewardTransactionAction(formData: FormData) {
  const transactionId = String(formData.get('transactionId') || '').trim();
  const reason = String(formData.get('reason') || '').trim() || 'manual_revocation';
  const note = String(formData.get('note') || '').trim();

  if (!transactionId) {
    redirect(`/rewards?message=${encodeMessage('Revocation failed: missing transaction id')}`);
  }

  try {
    await apiWrite(`/api/v1/rewards/transactions/${transactionId}/revoke`, 'POST', {
      reason,
      note,
      metadata: {
        source: 'lms-web-admin',
        revokedBy: 'Lumo Admin',
      },
    }, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    const message = error instanceof Error ? error.message : 'Reward revocation failed';
    redirect(`/rewards?message=${encodeMessage(`Revocation failed: ${message}`)}`);
  }

  revalidatePath('/rewards');
  revalidatePath('/students');
  redirect('/rewards?message=Reward%20transaction%20revoked');
}

async function runRewardRequestAction({
  requestId,
  path,
  successMessage,
  failureLabel,
  payload,
}: {
  requestId: string;
  path: string;
  successMessage: string;
  failureLabel: string;
  payload?: Record<string, unknown>;
}) {
  if (!requestId) {
    redirect(`/rewards?message=${encodeMessage(`${failureLabel}: missing reward request id`)}`);
  }

  try {
    await apiWrite(path, 'POST', payload, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    const message = error instanceof Error ? error.message : failureLabel;
    redirect(`/rewards?message=${encodeMessage(`${failureLabel}: ${message}`)}`);
  }

  revalidatePath('/rewards');
  revalidatePath('/reports');
  revalidatePath('/students');
  redirect(`/rewards?message=${encodeMessage(successMessage)}`);
}

export async function approveRewardRequestAction(formData: FormData) {
  const requestId = String(formData.get('requestId') || '').trim();
  const adminNote = String(formData.get('adminNote') || '').trim();

  await runRewardRequestAction({
    requestId,
    path: `/api/v1/rewards/requests/${requestId}/approve`,
    successMessage: 'Reward request approved',
    failureLabel: 'Reward approval failed',
    payload: { adminNote: adminNote || null },
  });
}

export async function fulfillRewardRequestAction(formData: FormData) {
  const requestId = String(formData.get('requestId') || '').trim();
  const adminNote = String(formData.get('adminNote') || '').trim();

  await runRewardRequestAction({
    requestId,
    path: `/api/v1/rewards/requests/${requestId}/fulfill`,
    successMessage: 'Reward request fulfilled',
    failureLabel: 'Reward fulfillment failed',
    payload: {
      adminNote: adminNote || null,
      metadata: {
        source: 'lms-web-admin',
        fulfilledBy: 'Lumo Admin',
      },
    },
  });
}

export async function requeueRewardRequestAction(formData: FormData) {
  const requestId = String(formData.get('requestId') || '').trim();
  const adminNote = String(formData.get('adminNote') || '').trim();
  const reason = String(formData.get('reason') || '').trim() || 'needs_follow_up';

  await runRewardRequestAction({
    requestId,
    path: `/api/v1/rewards/requests/${requestId}/requeue`,
    successMessage: 'Reward request moved back to pending',
    failureLabel: 'Reward requeue failed',
    payload: { adminNote: adminNote || null, reason },
  });
}

export async function expireRewardRequestAction(formData: FormData) {
  const requestId = String(formData.get('requestId') || '').trim();
  const adminNote = String(formData.get('adminNote') || '').trim();
  const reason = String(formData.get('reason') || '').trim() || 'stale_request';

  await runRewardRequestAction({
    requestId,
    path: `/api/v1/rewards/requests/${requestId}/expire`,
    successMessage: 'Reward request expired',
    failureLabel: 'Reward expiry failed',
    payload: {
      adminNote: adminNote || null,
      reason,
      metadata: {
        source: 'lms-web-admin',
        expiredBy: 'Lumo Admin',
      },
    },
  });
}

export async function expireStaleRewardRequestsAction(formData: FormData) {
  const olderThanDays = Number(formData.get('olderThanDays') || 14);
  const limit = Number(formData.get('limit') || 100);
  const includeApproved = String(formData.get('includeApproved') || 'yes') === 'yes';
  const adminNote = String(formData.get('adminNote') || '').trim();

  try {
    await apiWrite('/api/v1/admin/rewards/requests/expire-stale', 'POST', {
      olderThanDays,
      limit,
      includeApproved,
      reason: 'stale_request',
      adminNote: adminNote || null,
    }, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    const message = error instanceof Error ? error.message : 'Bulk expiry failed';
    redirect(`/rewards?message=${encodeMessage(`Bulk expiry failed: ${message}`)}`);
  }

  revalidatePath('/rewards');
  revalidatePath('/reports');
  revalidatePath('/students');
  redirect('/rewards?message=Stale%20reward%20requests%20expired');
}

export async function createPodAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/pods');
  const primaryMallamId = String(formData.get('mallamId') || '').trim();

  if (!primaryMallamId) {
    redirect(appendSearchParams(returnPath, {
      message: 'Pod creation failed: every pod needs one primary mallam',
    }));
  }

  const payload = {
    centerId: String(formData.get('centerId') || '').trim() || null,
    stateId: String(formData.get('stateId') || '').trim(),
    localGovernmentId: String(formData.get('localGovernmentId') || '').trim(),
    podName: String(formData.get('podName') || '').trim(),
    label: String(formData.get('label') || '').trim(),
    type: String(formData.get('type') || 'community-pod').trim(),
    status: String(formData.get('status') || 'active').trim(),
    capacity: Number(formData.get('capacity') || 0),
    learnersActive: Number(formData.get('learnersActive') || 0),
    connectivity: String(formData.get('connectivity') || 'offline-first').trim(),
    mallamIds: primaryMallamId ? [primaryMallamId] : [],
    primaryMallamId: primaryMallamId || null,
  };

  if (!payload.stateId || !payload.localGovernmentId || !payload.podName) {
    redirect(appendSearchParams(returnPath, {
      message: 'Pod creation failed: state, local government, and pod short name are required',
    }));
  }

  try {
    await apiWrite('/api/v1/pods', 'POST', payload, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, {
      message: `Pod creation failed: ${describeActionError(error, 'pod could not be created')}`,
    }));
  }

  revalidatePath('/pods');
  revalidatePath('/mallams');
  redirect(appendSearchParams(returnPath, {
    message: 'Pod created and ready for device and mallam assignment',
  }));
}

export async function updatePodAction(formData: FormData) {
  const podId = String(formData.get('podId') || '').trim();
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/pods');

  if (!podId) {
    redirect(appendSearchParams(returnPath, { message: 'Pod update failed: missing pod id' }));
  }

  const primaryMallamId = String(formData.get('mallamId') || '').trim();
  const payload = {
    centerId: String(formData.get('centerId') || '').trim() || null,
    stateId: String(formData.get('stateId') || '').trim() || null,
    localGovernmentId: String(formData.get('localGovernmentId') || '').trim() || null,
    podName: String(formData.get('podName') || '').trim() || undefined,
    label: String(formData.get('label') || '').trim() || undefined,
    type: String(formData.get('type') || '').trim() || undefined,
    status: String(formData.get('status') || '').trim() || undefined,
    capacity: formData.get('capacity') === null ? undefined : Number(formData.get('capacity') || 0),
    learnersActive: formData.get('learnersActive') === null ? undefined : Number(formData.get('learnersActive') || 0),
    connectivity: String(formData.get('connectivity') || '').trim() || undefined,
    mallamIds: primaryMallamId ? [primaryMallamId] : [],
    primaryMallamId: primaryMallamId || null,
  };

  try {
    await apiWrite(`/api/v1/pods/${podId}`, 'PATCH', payload, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, { message: `Pod update failed: ${describeActionError(error, 'pod could not be updated')}` }));
  }

  revalidatePath('/pods');
  revalidatePath('/mallams');
  revalidatePath('/devices');
  redirect(appendSearchParams(returnPath, { message: 'Pod updated' }));
}

export async function deletePodAction(formData: FormData) {
  const podId = String(formData.get('podId') || '').trim();
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/pods');

  if (!podId) {
    redirect(appendSearchParams(returnPath, { message: 'Pod delete failed: missing pod id' }));
  }

  try {
    await apiWrite(`/api/v1/pods/${podId}`, 'DELETE', undefined, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, { message: `Pod delete failed: ${describeActionError(error, 'pod could not be deleted')}` }));
  }

  revalidatePath('/pods');
  revalidatePath('/mallams');
  revalidatePath('/devices');
  redirect(appendSearchParams(returnPath, { message: 'Pod deleted' }));
}

export async function createDeviceRegistrationAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/devices');
  const podId = String(formData.get('podId') || '').trim();

  if (!podId) {
    redirect(appendSearchParams(returnPath, { message: 'Device registration failed: select a pod first' }));
  }

  const payload = {
    podId,
    deviceIdentifier: String(formData.get('deviceIdentifier') || '').trim(),
    serialNumber: String(formData.get('serialNumber') || '').trim() || null,
    platform: String(formData.get('platform') || 'android').trim(),
    appVersion: String(formData.get('appVersion') || '').trim() || null,
    status: String(formData.get('status') || 'active').trim(),
  };

  try {
    await apiWrite('/api/v1/device-registrations', 'POST', payload, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, { message: `Device registration failed: ${describeActionError(error, 'device could not be registered')}` }));
  }

  revalidatePath('/devices');
  revalidatePath('/pods');
  redirect(appendSearchParams(returnPath, { message: 'Tablet registered' }));
}

export async function deleteDeviceRegistrationAction(formData: FormData) {
  const registrationId = String(formData.get('registrationId') || '').trim();
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/devices');

  if (!registrationId) {
    redirect(appendSearchParams(returnPath, { message: 'Device delete failed: missing registration id' }));
  }

  try {
    await apiWrite(`/api/v1/device-registrations/${registrationId}`, 'DELETE', undefined, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, { message: `Device delete failed: ${describeActionError(error, 'device registration could not be removed')}` }));
  }

  revalidatePath('/devices');
  revalidatePath('/pods');
  redirect(appendSearchParams(returnPath, { message: 'Tablet registration removed' }));
}

export async function updateDeviceRegistrationAction(formData: FormData) {
  const registrationId = String(formData.get('registrationId') || '').trim();
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/pods');
  const podIdValue = String(formData.get('podId') || '').trim();
  const status = String(formData.get('status') || '').trim();
  const appVersion = String(formData.get('appVersion') || '').trim();

  if (!registrationId) {
    redirect(appendSearchParams(returnPath, {
      message: 'Device update failed: missing registration id',
    }));
  }

  if (!podIdValue) {
    redirect(appendSearchParams(returnPath, {
      message: 'Device update failed: every active tablet should stay attached to a pod',
    }));
  }

  try {
    await apiWrite(`/api/v1/device-registrations/${registrationId}`, 'PATCH', {
      podId: podIdValue,
      status: status || undefined,
      appVersion: appVersion || null,
    }, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    redirect(appendSearchParams(returnPath, {
      message: `Device update failed: ${describeActionError(error, 'device registration could not be updated')}`,
    }));
  }

  revalidatePath('/pods');
  revalidatePath('/devices');
  revalidatePath('/settings');
  redirect(appendSearchParams(returnPath, {
    message: 'Device registration updated',
  }));
}

export async function checkpointStorageAction(formData: FormData) {
  const label = String(formData.get('label') || '').trim() || 'manual-checkpoint';
  await apiWrite('/api/v1/admin/storage/checkpoint', 'POST', { label }, 'admin');
  revalidatePath('/settings');
  redirect('/settings?message=Storage%20checkpoint%20created');
}

export async function deleteStorageBackupAction(formData: FormData) {
  const backupPath = String(formData.get('backupPath') || '').trim();

  if (!backupPath) {
    redirect('/settings?message=Backup%20deletion%20failed%3A%20missing%20backup%20path');
  }

  try {
    await apiWrite('/api/v1/admin/storage/backups', 'DELETE', { backupPath }, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    const message = error instanceof Error ? error.message : 'Backup deletion failed';
    redirect(`/settings?message=${encodeMessage(`Backup deletion failed: ${message}`)}`);
  }

  revalidatePath('/settings');
  redirect('/settings?message=Storage%20backup%20deleted');
}

export async function restoreStorageBackupAction(formData: FormData) {
  const backupPath = String(formData.get('backupPath') || '').trim();

  if (!backupPath) {
    redirect('/settings?message=Backup%20restore%20failed%3A%20missing%20backup%20path');
  }

  try {
    await apiWrite('/api/v1/admin/storage/restore', 'POST', { backupPath }, 'admin');
  } catch (error) {
    rethrowRedirectError(error);
    const message = error instanceof Error ? error.message : 'Backup restore failed';
    redirect(`/settings?message=${encodeMessage(`Backup restore failed: ${message}`)}`);
  }

  revalidatePath('/settings');
  redirect('/settings?message=Storage%20backup%20restored');
}

export async function repairStorageIntegrityAction() {
  await apiWrite('/api/v1/admin/storage/repair-integrity', 'POST', { apply: true }, 'admin');
  revalidatePath('/settings');
  redirect('/settings?message=Storage%20integrity%20repair%20applied');
}
