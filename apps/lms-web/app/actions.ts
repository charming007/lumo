'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';

import { API_BASE } from '../lib/config';

async function apiWrite<T = void>(path: string, method: string, payload?: Record<string, unknown>, role = 'admin') {
  const headers: Record<string, string> = {
    'x-lumo-role': role,
    'x-lumo-user': role === 'teacher' ? 'Teacher Demo' : 'Pilot Admin',
  };

  if (payload) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
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
  const returnPath = String(formData.get('returnPath') || `/students/${studentId}`);
  const mallamId = String(formData.get('mallamId') || 'unassigned');
  const resolvedMallamId = mallamId === 'unassigned' ? null : mallamId;

  await updateStudentMallamAssignment(studentId, resolvedMallamId);
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath(returnPath);
  redirect(`${returnPath}?message=${resolvedMallamId ? 'Mallam%20assignment%20saved' : 'Mallam%20assignment%20cleared'}`);
}

export async function assignLearnerToMallamAction(formData: FormData) {
  const mallamId = String(formData.get('mallamId') || '');
  const studentId = String(formData.get('studentId') || '');
  const returnPath = String(formData.get('returnPath') || `/mallams/${mallamId}`);

  await updateStudentMallamAssignment(studentId, mallamId || null);
  revalidatePath('/');
  revalidatePath('/students');
  revalidatePath('/mallams');
  revalidatePath(returnPath);
  redirect(`${returnPath}?message=Learner%20assignment%20saved`);
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
  const payload = {
    id: String(formData.get('id') || ''),
    name: String(formData.get('name') || ''),
    icon: String(formData.get('icon') || 'menu_book'),
    order: Number(formData.get('order') || 0),
    initialStrandName: String(formData.get('initialStrandName') || ''),
  };

  await apiWrite('/api/v1/subjects', 'POST', payload);
  revalidatePath('/content');
  redirect('/content?message=Subject%20created%20and%20added%20to%20the%20library');
}

export async function updateSubjectAction(formData: FormData) {
  const subjectId = String(formData.get('subjectId') || '');
  const payload = {
    name: String(formData.get('name') || ''),
    icon: String(formData.get('icon') || ''),
    order: Number(formData.get('order') || 0),
  };

  await apiWrite(`/api/v1/subjects/${subjectId}`, 'PATCH', payload);
  revalidatePath('/content');
  redirect('/content?message=Subject%20changes%20saved');
}

export async function deleteSubjectAction(formData: FormData) {
  const subjectId = String(formData.get('subjectId') || '');

  await apiWrite(`/api/v1/subjects/${subjectId}`, 'DELETE');
  revalidatePath('/content');
  redirect('/content?message=Subject%20removed%20from%20the%20library');
}

export async function createStrandAction(formData: FormData) {
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    name: String(formData.get('name') || ''),
    order: Number(formData.get('order') || 0),
  };

  await apiWrite('/api/v1/strands', 'POST', payload);
  revalidatePath('/content');
  redirect('/content?message=Strand%20created%20and%20ready%20for%20module%20planning');
}

export async function updateStrandAction(formData: FormData) {
  const strandId = String(formData.get('strandId') || '');
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    name: String(formData.get('name') || ''),
    order: Number(formData.get('order') || 0),
  };

  await apiWrite(`/api/v1/strands/${strandId}`, 'PATCH', payload);
  revalidatePath('/content');
  redirect('/content?message=Strand%20changes%20saved');
}

export async function deleteStrandAction(formData: FormData) {
  const strandId = String(formData.get('strandId') || '');

  await apiWrite(`/api/v1/strands/${strandId}`, 'DELETE');
  revalidatePath('/content');
  redirect('/content?message=Strand%20removed%20from%20the%20library');
}

export async function createModuleAction(formData: FormData) {
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
  redirect('/content?message=Module%20created%20and%20added%20to%20the%20publishing%20board');
}

export async function updateModuleAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');
  const payload = {
    status: String(formData.get('status') || ''),
    lessonCount: Number(formData.get('lessonCount') || 0),
    level: String(formData.get('level') || ''),
  };

  await apiWrite(`/api/v1/curriculum/modules/${moduleId}`, 'PATCH', payload);
  revalidatePath('/content');
  redirect('/content?message=Module%20changes%20saved');
}

export async function createLessonAction(formData: FormData) {
  const returnPath = String(formData.get('returnPath') || '/content');
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    moduleId: String(formData.get('moduleId') || ''),
    title: String(formData.get('title') || ''),
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

  const lesson = await apiWrite<{ id: string; title?: string; moduleId?: string; subjectId?: string }>('/api/v1/lessons', 'POST', payload);
  revalidatePath('/content');
  revalidatePath('/english');
  revalidatePath(`/content/lessons/${lesson.id}`);

  const lessonTitle = lesson.title ?? payload.title;
  const moduleId = lesson.moduleId ?? payload.moduleId;
  const subjectId = lesson.subjectId ?? payload.subjectId;
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
  const returnPath = String(formData.get('returnPath') || '/content');
  const payload = {
    subjectId: String(formData.get('subjectId') || '') || undefined,
    moduleId: String(formData.get('moduleId') || '') || undefined,
    title: String(formData.get('title') || '') || undefined,
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
  redirect(`${returnPath}?message=Lesson%20authoring%20pack%20saved`);
}

export async function createAssessmentAction(formData: FormData) {
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
  revalidatePath('/content');
  redirect('/content?message=Assessment%20created%20and%20linked%20to%20a%20release%20gate');
}

export async function updateAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') || '');
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
  redirect('/content?message=Assessment%20changes%20saved');
}

export async function deleteModuleAction(formData: FormData) {
  const moduleId = String(formData.get('moduleId') || '');

  await apiWrite(`/api/v1/curriculum/modules/${moduleId}`, 'DELETE');
  revalidatePath('/content');
  redirect('/content?message=Module%20removed%20from%20the%20library');
}

export async function deleteLessonAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'DELETE');
  revalidatePath('/content');
  redirect('/content?message=Lesson%20removed%20from%20the%20library');
}

export async function deleteAssessmentAction(formData: FormData) {
  const assessmentId = String(formData.get('assessmentId') || '');

  await apiWrite(`/api/v1/assessments/${assessmentId}`, 'DELETE');
  revalidatePath('/content');
  redirect('/content?message=Assessment%20gate%20removed');
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

export async function checkpointStorageAction(formData: FormData) {
  const label = String(formData.get('label') || '').trim() || 'manual-checkpoint';
  await apiWrite('/api/v1/admin/storage/checkpoint', 'POST', { label }, 'admin');
  revalidatePath('/settings');
  redirect('/settings?message=Storage%20checkpoint%20created');
}

export async function repairStorageIntegrityAction() {
  await apiWrite('/api/v1/admin/storage/repair-integrity', 'POST', { apply: true }, 'admin');
  revalidatePath('/settings');
  redirect('/settings?message=Storage%20integrity%20repair%20applied');
}
