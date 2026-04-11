'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

async function apiWrite(path: string, method: string, payload?: Record<string, unknown>, role = 'admin') {
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
    throw new Error(`Failed request: ${path}`);
  }
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
  const payload = {
    subjectId: String(formData.get('subjectId') || ''),
    moduleId: String(formData.get('moduleId') || ''),
    title: String(formData.get('title') || ''),
    durationMinutes: Number(formData.get('durationMinutes') || 0),
    mode: String(formData.get('mode') || 'guided'),
    status: String(formData.get('status') || 'draft'),
  };

  await apiWrite('/api/v1/lessons', 'POST', payload);
  revalidatePath('/content');
  redirect('/content?message=Lesson%20created%20with%20updated%20metadata%20context');
}

export async function updateLessonAction(formData: FormData) {
  const lessonId = String(formData.get('lessonId') || '');
  const payload = {
    status: String(formData.get('status') || ''),
    mode: String(formData.get('mode') || ''),
    durationMinutes: Number(formData.get('durationMinutes') || 0),
  };

  await apiWrite(`/api/v1/lessons/${lessonId}`, 'PATCH', payload);
  revalidatePath('/content');
  redirect('/content?message=Lesson%20changes%20saved');
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
  const payload = {
    mastery: Number(formData.get('mastery') || 0),
    lessonsCompleted: Number(formData.get('lessonsCompleted') || 0),
    progressionStatus: String(formData.get('progressionStatus') || 'on-track'),
    recommendedNextModuleId: String(formData.get('recommendedNextModuleId') || ''),
  };

  await apiWrite(`/api/v1/progress/${progressId}`, 'PATCH', payload, 'teacher');
  revalidatePath('/progress');
  revalidatePath('/students');
  redirect('/progress?message=Progress%20record%20updated');
}
