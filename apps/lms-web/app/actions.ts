'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';

import { API_BASE } from '../lib/config';

function buildApiHeaders(role = 'admin', includeJson = false) {
  const headers: Record<string, string> = {
    'x-lumo-role': role,
    'x-lumo-user': role === 'teacher' ? 'Teacher Demo' : 'Pilot Admin',
  };

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
  const payload = {
    name: String(formData.get('name') || ''),
    age: Number(formData.get('age') || 0),
    gender: String(formData.get('gender') || 'unspecified'),
    cohortId: String(formData.get('cohortId') || ''),
    podId: String(formData.get('podId') || ''),
    mallamId: String(formData.get('mallamId') || ''),
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
  const payload = {
    name: String(formData.get('name') || ''),
    cohortId: String(formData.get('cohortId') || ''),
    podId: String(formData.get('podId') || ''),
    mallamId: String(formData.get('mallamId') || ''),
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
  const mallamId = String(formData.get('mallamId') || 'unassigned');
  const resolvedMallamId = mallamId === 'unassigned' ? null : mallamId;

  await updateStudentMallamAssignment(studentId, resolvedMallamId);
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: resolvedMallamId ? 'Mallam assignment saved' : 'Mallam assignment cleared',
  }));
}

export async function assignLearnerToMallamAction(formData: FormData) {
  const mallamId = String(formData.get('mallamId') || '');
  const studentId = String(formData.get('studentId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), `/mallams/${mallamId}`);

  await updateStudentMallamAssignment(studentId, mallamId || null);
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Learner assignment saved',
  }));
}

export async function createMallamAction(formData: FormData) {
  const podIdsRaw = String(formData.get('podIds') || '');
  const payload = {
    name: String(formData.get('name') || ''),
    displayName: String(formData.get('displayName') || ''),
    centerId: String(formData.get('centerId') || ''),
    role: String(formData.get('role') || 'mallam-lead'),
    status: String(formData.get('status') || 'active'),
    learnerCount: Number(formData.get('learnerCount') || 0),
    certificationLevel: String(formData.get('certificationLevel') || 'Level 1'),
    podIds: podIdsRaw.split(',').map((item) => item.trim()).filter(Boolean),
    languages: String(formData.get('languages') || 'Hausa, English').split(',').map((item) => item.trim()).filter(Boolean),
  };

  await apiWrite('/api/v1/mallams', 'POST', payload);
  revalidatePath('/');
  revalidatePath('/mallams');
  redirect('/mallams?message=Mallam%20created%20and%20ready%20for%20deployment');
}

export async function updateMallamAction(formData: FormData) {
  const mallamId = String(formData.get('mallamId') || '');
  const podIdsRaw = String(formData.get('podIds') || '');
  const payload = {
    name: String(formData.get('name') || ''),
    displayName: String(formData.get('displayName') || ''),
    centerId: String(formData.get('centerId') || ''),
    role: String(formData.get('role') || ''),
    status: String(formData.get('status') || ''),
    learnerCount: Number(formData.get('learnerCount') || 0),
    certificationLevel: String(formData.get('certificationLevel') || ''),
    podIds: podIdsRaw.split(',').map((item) => item.trim()).filter(Boolean),
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
    id: String(formData.get('id') || ''),
    name: String(formData.get('name') || ''),
    icon: String(formData.get('icon') || 'menu_book'),
    order: Number(formData.get('order') || 0),
    initialStrandName: String(formData.get('initialStrandName') || ''),
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
  const payload = {
    name: String(formData.get('name') || ''),
    icon: String(formData.get('icon') || ''),
    order: Number(formData.get('order') || 0),
  };

  await apiWrite(`/api/v1/subjects/${subjectId}`, 'PATCH', payload);
  revalidatePath('/content');
  revalidatePath(returnPath);
  redirect(appendSearchParams(returnPath, {
    message: 'Subject changes saved',
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
  revalidatePath('/english');
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
  revalidatePath('/english');
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

  await apiWrite('/api/v1/assets', 'POST', payload);
  revalidatePath('/content/assets');
  redirect(appendSearchParams(returnPath, { message: 'Asset registered in library' }));
}

export async function uploadLessonAssetAction(formData: FormData) {
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(appendSearchParams(returnPath, { message: 'Pick a file before uploading' }));
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const payload = {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    base64: bytes.toString('base64'),
    kind: String(formData.get('kind') || 'image'),
    title: String(formData.get('title') || file.name.replace(/\.[^.]+$/, '')),
    description: String(formData.get('description') || ''),
    subjectId: String(formData.get('subjectId') || '') || null,
    moduleId: String(formData.get('moduleId') || '') || null,
    lessonId: String(formData.get('lessonId') || '') || null,
    tags: String(formData.get('tags') || '').split(',').map((item) => item.trim()).filter(Boolean),
  };

  await apiWrite('/api/v1/assets/upload', 'POST', payload);
  revalidatePath('/content/assets');
  redirect(appendSearchParams(returnPath, { message: 'Asset uploaded and registered' }));
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

  await apiWrite(`/api/v1/assets/${assetId}`, 'PATCH', payload);
  revalidatePath('/content/assets');
  redirect(appendSearchParams(returnPath, { message: 'Asset details saved' }));
}

export async function archiveLessonAssetAction(formData: FormData) {
  const assetId = String(formData.get('assetId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');
  const nextStatus = String(formData.get('status') || 'archived');

  await apiWrite(`/api/v1/assets/${assetId}`, 'PATCH', { status: nextStatus });
  revalidatePath('/content/assets');
  redirect(appendSearchParams(returnPath, { message: nextStatus === 'archived' ? 'Asset archived' : 'Asset restored to ready' }));
}

export async function deleteLessonAssetAction(formData: FormData) {
  const assetId = String(formData.get('assetId') || '');
  const returnPath = sanitizeReturnPath(String(formData.get('returnPath') || ''), '/content/assets');

  await apiWrite(`/api/v1/assets/${assetId}`, 'DELETE', undefined, 'admin', {
    'x-lumo-confirm-action': 'asset-delete',
    'idempotency-key': `asset-delete-${assetId}`,
  });
  revalidatePath('/content/assets');
  redirect(appendSearchParams(returnPath, { message: 'Asset permanently deleted' }));
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

  await apiWrite(`/api/v1/curriculum/modules/${moduleId}`, 'PATCH', {
    title,
    status,
    level,
    lessonCount,
  });
  revalidatePath('/canvas');
  revalidatePath('/content');
  redirect(appendSearchParams(returnPath, {
    message: 'Module quick edit saved',
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
  revalidatePath('/english');
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
  revalidatePath('/english');
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
          actorName: 'Pilot Admin',
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
      awardedBy: 'Pilot Admin',
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
        adjustedBy: 'Pilot Admin',
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
        revokedBy: 'Pilot Admin',
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
        fulfilledBy: 'Pilot Admin',
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
        expiredBy: 'Pilot Admin',
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
