const data = require('./data');

function commit(value) {
  data.persist();
  return value;
}

function cloneActivitySteps(input = []) {
  return (input || []).map((step, index) => ({
    order: step.order !== undefined ? Number(step.order) : index + 1,
    ...step,
    media: Array.isArray(step.media) ? step.media.map((item) => ({ ...item })) : [],
    choices: Array.isArray(step.choices) ? step.choices.map((item) => ({ ...item })) : [],
    expectedAnswers: Array.isArray(step.expectedAnswers) ? [...step.expectedAnswers] : [],
    tags: Array.isArray(step.tags) ? [...step.tags] : [],
  }));
}

function normalizeLessonActivities(input = {}) {
  return cloneActivitySteps(input.activitySteps ?? input.activities ?? []);
}


function recalculateModuleLessonCount(moduleId) {
  if (!moduleId) return null;
  const module = findModuleById(moduleId);
  if (!module) return null;

  module.lessonCount = data.lessons.filter((item) => item.moduleId === moduleId).length;
  return module;
}

function recalculateAllModuleLessonCounts() {
  data.modules.forEach((module) => {
    module.lessonCount = data.lessons.filter((item) => item.moduleId === module.id).length;
  });
}

function ensureOrderWithinSiblings(items, parentKey = null, parentValue = null) {
  const siblings = items
    .filter((item) => (parentKey ? item[parentKey] === parentValue : true))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.id).localeCompare(String(b.id)));

  siblings.forEach((item, index) => {
    item.order = index + 1;
  });

  return siblings;
}

function reorderCollection({ collection, ids, parentKey = null, parentValue = null }) {
  const idSet = new Set(ids);
  const siblings = collection.filter((item) => (parentKey ? item[parentKey] === parentValue : true));
  const existingIds = siblings.map((item) => item.id);

  if (existingIds.length !== ids.length || ids.some((id) => !existingIds.includes(id))) {
    const error = new Error('Reorder payload must include every sibling exactly once');
    error.statusCode = 400;
    throw error;
  }

  ids.forEach((id, index) => {
    const target = siblings.find((item) => item.id === id);
    target.order = index + 1;
  });

  siblings.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return siblings;
}

function listCenters() {
  return data.centers;
}

function findCenterById(id) {
  return data.centers.find((item) => item.id === id) || null;
}

function listStates() {
  return data.states || [];
}

function findStateById(id) {
  return listStates().find((item) => item.id === id) || null;
}

function createState(input) {
  const record = {
    id: input.id || `state-${listStates().length + 1}`,
    code: input.code || null,
    name: input.name,
    countryCode: input.countryCode || 'NG',
    order: Number(input.order || listStates().length + 1),
    status: input.status || 'active',
  };

  data.states.push(record);
  return commit(record);
}

function updateState(id, input) {
  const record = findStateById(id);
  if (!record) return null;

  Object.assign(record, {
    code: input.code ?? record.code,
    name: input.name ?? record.name,
    countryCode: input.countryCode ?? record.countryCode,
    order: input.order !== undefined ? Number(input.order) : record.order,
    status: input.status ?? record.status,
  });

  return commit(record);
}

function listLocalGovernments() {
  return data.localGovernments || [];
}

function findLocalGovernmentById(id) {
  return listLocalGovernments().find((item) => item.id === id) || null;
}

function createLocalGovernment(input) {
  const record = {
    id: input.id || `lga-${listLocalGovernments().length + 1}`,
    stateId: input.stateId,
    code: input.code || null,
    name: input.name,
    order: Number(input.order || listLocalGovernments().filter((item) => item.stateId === input.stateId).length + 1),
    status: input.status || 'active',
  };

  data.localGovernments.push(record);
  return commit(record);
}

function updateLocalGovernment(id, input) {
  const record = findLocalGovernmentById(id);
  if (!record) return null;

  Object.assign(record, {
    stateId: input.stateId ?? record.stateId,
    code: input.code ?? record.code,
    name: input.name ?? record.name,
    order: input.order !== undefined ? Number(input.order) : record.order,
    status: input.status ?? record.status,
  });

  return commit(record);
}

function listPods() {
  return data.pods;
}

function findPodById(id) {
  return data.pods.find((item) => item.id === id) || null;
}

function deletePod(id) {
  const pod = findPodById(id);
  if (!pod) return null;

  const linkedDevices = (data.deviceRegistrations || []).filter((item) => item.podId === id);
  if (linkedDevices.length) {
    const error = new Error('Pod still has registered tablets. Reassign or remove those devices first.');
    error.statusCode = 409;
    throw error;
  }

  const linkedTeachers = (data.teachers || []).filter((item) => Array.isArray(item.podIds) && item.podIds.includes(id));
  if (linkedTeachers.length) {
    const error = new Error('Pod is still assigned to one or more mallams. Clear pod coverage before deleting it.');
    error.statusCode = 409;
    throw error;
  }

  const linkedStudents = (data.students || []).filter((item) => item.podId === id);
  if (linkedStudents.length) {
    const error = new Error('Pod still has learners assigned. Reassign those learners before deleting it.');
    error.statusCode = 409;
    throw error;
  }

  const linkedCohorts = (data.cohorts || []).filter((item) => item.podId === id);
  if (linkedCohorts.length) {
    const error = new Error('Pod still anchors one or more cohorts. Move those cohorts first.');
    error.statusCode = 409;
    throw error;
  }

  data.pods = data.pods.filter((item) => item.id !== id);
  return commit(pod);
}

function createPod(input) {
  const matchingMallam = Array.isArray(input.mallamIds) && input.mallamIds.length
    ? findTeacherById(input.mallamIds[0])
    : null;
  const derivedCenter = input.centerId
    ? findCenterById(input.centerId)
    : matchingMallam?.centerId
      ? findCenterById(matchingMallam.centerId)
      : (data.centers || []).find((item) => item.stateId === input.stateId && item.localGovernmentId === input.localGovernmentId) || null;

  const pod = {
    id: input.id || `pod-${data.pods.length + 1}`,
    centerId: input.centerId || derivedCenter?.id || null,
    stateId: input.stateId || derivedCenter?.stateId || null,
    localGovernmentId: input.localGovernmentId || derivedCenter?.localGovernmentId || null,
    code: input.code || null,
    label: input.label,
    type: input.type || 'community-pod',
    status: input.status || 'active',
    capacity: Number(input.capacity || 0),
    learnersActive: Number(input.learnersActive || 0),
    connectivity: input.connectivity || 'offline-first',
    mallamIds: Array.isArray(input.mallamIds) ? [...input.mallamIds] : [],
  };

  data.pods.push(pod);
  return commit(pod);
}

function updatePod(id, input) {
  const pod = findPodById(id);
  if (!pod) return null;

  Object.assign(pod, {
    centerId: input.centerId ?? pod.centerId,
    stateId: input.stateId ?? pod.stateId,
    localGovernmentId: input.localGovernmentId ?? pod.localGovernmentId,
    code: input.code ?? pod.code,
    label: input.label ?? pod.label,
    type: input.type ?? pod.type,
    status: input.status ?? pod.status,
    capacity: input.capacity !== undefined ? Number(input.capacity) : pod.capacity,
    learnersActive: input.learnersActive !== undefined ? Number(input.learnersActive) : pod.learnersActive,
    connectivity: input.connectivity ?? pod.connectivity,
    mallamIds: input.mallamIds ?? pod.mallamIds,
  });

  return commit(pod);
}

function listCohorts() {
  return data.cohorts;
}

function findCohortById(id) {
  return data.cohorts.find((item) => item.id === id) || null;
}

function listTeachers() {
  return data.teachers;
}

function findTeacherById(id) {
  return data.teachers.find((item) => item.id === id) || null;
}

function createTeacher(input) {
  const normalizedPodIds = Array.isArray(input.podIds)
    ? [...input.podIds]
    : input.primaryPodId
      ? [input.primaryPodId]
      : input.podId
        ? [input.podId]
        : [];

  const teacher = {
    id: `teacher-${data.teachers.length + 1}`,
    centerId: input.centerId,
    podIds: normalizedPodIds,
    primaryPodId: input.primaryPodId || input.podId || normalizedPodIds[0] || null,
    name: input.name,
    displayName: input.displayName || input.name,
    role: input.role || 'mallam-lead',
    status: input.status || 'active',
    languages: input.languages || ['Hausa', 'English'],
    learnerCount: Number(input.learnerCount || 0),
    certificationLevel: input.certificationLevel || 'Level 1',
  };

  data.teachers.push(teacher);
  return commit(teacher);
}

function updateTeacher(id, input) {
  const teacher = findTeacherById(id);

  if (!teacher) {
    return null;
  }

  const nextPodIds = input.podIds ?? (input.primaryPodId ? [input.primaryPodId] : input.podId ? [input.podId] : teacher.podIds);

  Object.assign(teacher, {
    centerId: input.centerId ?? teacher.centerId,
    podIds: nextPodIds,
    primaryPodId: input.primaryPodId ?? input.podId ?? nextPodIds?.[0] ?? teacher.primaryPodId ?? null,
    name: input.name ?? teacher.name,
    displayName: input.displayName ?? teacher.displayName,
    role: input.role ?? teacher.role,
    status: input.status ?? teacher.status,
    languages: input.languages ?? teacher.languages,
    learnerCount: input.learnerCount !== undefined ? Number(input.learnerCount) : teacher.learnerCount,
    certificationLevel: input.certificationLevel ?? teacher.certificationLevel,
  });

  return commit(teacher);
}

function deleteTeacher(id) {
  const index = data.teachers.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [teacher] = data.teachers.splice(index, 1);

  data.students.forEach((student) => {
    if (student.mallamId === id) {
      student.mallamId = null;
    }
  });

  data.assignments = data.assignments.filter((assignment) => assignment.assignedBy !== id);
  data.observations = data.observations.filter((observation) => observation.teacherId !== id);

  return commit(teacher);
}

function listStudents() {
  return data.students;
}

function findStudentById(id) {
  return data.students.find((item) => item.id === id) || null;
}

function createStudent(input) {
  const student = {
    id: `student-${data.students.length + 1}`,
    cohortId: input.cohortId,
    podId: input.podId,
    mallamId: input.mallamId,
    name: input.name,
    age: Number(input.age),
    gender: input.gender || 'unspecified',
    level: input.level || 'beginner',
    stage: input.stage || 'foundation-a',
    attendanceRate: input.attendanceRate !== undefined ? Number(input.attendanceRate) : 0.85,
    guardianName: input.guardianName || '',
    guardianPhone: input.guardianPhone || '',
    caregiverRelationship: input.caregiverRelationship || 'Guardian',
    preferredLanguage: input.preferredLanguage || 'Hausa',
    consentCaptured: input.consentCaptured !== undefined ? Boolean(input.consentCaptured) : true,
    supportPlan: input.supportPlan || '',
    village: input.village || '',
    deviceAccess: input.deviceAccess || 'shared-tablet',
  };

  data.students.push(student);
  return commit(student);
}

function updateStudent(id, input) {
  const student = findStudentById(id);

  if (!student) {
    return null;
  }

  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  Object.assign(student, {
    cohortId: has('cohortId') ? input.cohortId : student.cohortId,
    podId: has('podId') ? input.podId : student.podId,
    mallamId: has('mallamId') ? input.mallamId : student.mallamId,
    name: input.name ?? student.name,
    age: input.age !== undefined ? Number(input.age) : student.age,
    gender: input.gender ?? student.gender,
    level: input.level ?? student.level,
    stage: input.stage ?? student.stage,
    attendanceRate: input.attendanceRate !== undefined ? Number(input.attendanceRate) : student.attendanceRate,
    guardianName: input.guardianName ?? student.guardianName,
    guardianPhone: input.guardianPhone ?? student.guardianPhone,
    caregiverRelationship: input.caregiverRelationship ?? student.caregiverRelationship,
    preferredLanguage: input.preferredLanguage ?? student.preferredLanguage,
    consentCaptured: input.consentCaptured !== undefined ? Boolean(input.consentCaptured) : student.consentCaptured,
    supportPlan: input.supportPlan ?? student.supportPlan,
    village: input.village ?? student.village,
    deviceAccess: input.deviceAccess ?? student.deviceAccess,
  });

  return commit(student);
}

function deleteStudent(id) {
  const index = data.students.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [student] = data.students.splice(index, 1);

  data.attendance = data.attendance.filter((record) => record.studentId !== id);
  data.progress = data.progress.filter((record) => record.studentId !== id);
  data.observations = data.observations.filter((record) => record.studentId !== id);
  data.assignments = data.assignments.filter((assignment) => assignment.studentId !== id);
  data.syncEvents = data.syncEvents.filter((event) => event.learnerId !== id);

  return commit(student);
}

function listSubjects() {
  return data.subjects;
}

function findSubjectById(id) {
  return data.subjects.find((item) => item.id === id) || null;
}

function createSubject(input) {
  const subject = {
    id: input.id,
    name: input.name,
    icon: input.icon || 'menu_book',
    order: Number(input.order || data.subjects.length + 1),
    status: input.status || 'draft',
  };

  data.subjects.push(subject);

  if (input.initialStrandName) {
    data.strands.push({
      id: `strand-${data.strands.length + 1}`,
      subjectId: subject.id,
      name: input.initialStrandName,
      order: 1,
      status: subject.status || 'draft',
    });
  }

  return commit(subject);
}

function updateSubject(id, input) {
  const subject = findSubjectById(id);

  if (!subject) {
    return null;
  }

  Object.assign(subject, {
    name: input.name ?? subject.name,
    icon: input.icon ?? subject.icon,
    order: input.order !== undefined ? Number(input.order) : subject.order,
    status: input.status ?? subject.status ?? 'draft',
  });

  return commit(subject);
}

function deleteSubject(id) {
  const index = data.subjects.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [subject] = data.subjects.splice(index, 1);
  const strandIds = data.strands.filter((item) => item.subjectId === id).map((item) => item.id);
  const moduleIds = data.modules.filter((item) => strandIds.includes(item.strandId)).map((item) => item.id);
  const lessonIds = data.lessons.filter((item) => item.subjectId === id || moduleIds.includes(item.moduleId)).map((item) => item.id);
  const assessmentIds = data.assessments.filter((item) => item.subjectId === id || moduleIds.includes(item.moduleId)).map((item) => item.id);

  data.strands = data.strands.filter((item) => item.subjectId !== id);
  data.modules = data.modules.filter((item) => !moduleIds.includes(item.id));
  data.lessons = data.lessons.filter((item) => item.subjectId !== id && !moduleIds.includes(item.moduleId));
  data.assessments = data.assessments.filter((item) => item.subjectId !== id && !moduleIds.includes(item.moduleId));
  data.assignments = data.assignments.filter((assignment) => !lessonIds.includes(assignment.lessonId) && !assessmentIds.includes(assignment.assessmentId));
  data.progress.forEach((record) => {
    if (record.subjectId === id) record.subjectId = null;
    if (record.moduleId && moduleIds.includes(record.moduleId)) record.moduleId = null;
    if (record.recommendedNextModuleId && moduleIds.includes(record.recommendedNextModuleId)) record.recommendedNextModuleId = null;
  });

  return commit(subject);
}

function listStrands() {
  return data.strands;
}

function findStrandById(id) {
  return data.strands.find((item) => item.id === id) || null;
}

function createStrand(input) {
  const strand = {
    id: `strand-${data.strands.length + 1}`,
    subjectId: input.subjectId,
    name: input.name,
    order: Number(input.order || data.strands.filter((item) => item.subjectId === input.subjectId).length + 1),
    status: input.status || 'draft',
  };

  data.strands.push(strand);
  return commit(strand);
}

function updateStrand(id, input) {
  const strand = findStrandById(id);

  if (!strand) {
    return null;
  }

  Object.assign(strand, {
    subjectId: input.subjectId ?? strand.subjectId,
    name: input.name ?? strand.name,
    order: input.order !== undefined ? Number(input.order) : strand.order,
    status: input.status ?? strand.status ?? 'draft',
  });

  return commit(strand);
}

function deleteStrand(id) {
  const index = data.strands.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [strand] = data.strands.splice(index, 1);
  const moduleIds = data.modules.filter((item) => item.strandId === id).map((item) => item.id);
  const lessonIds = data.lessons.filter((item) => moduleIds.includes(item.moduleId)).map((item) => item.id);
  const assessmentIds = data.assessments.filter((item) => moduleIds.includes(item.moduleId)).map((item) => item.id);

  data.modules = data.modules.filter((item) => item.strandId !== id);
  data.lessons = data.lessons.filter((item) => !moduleIds.includes(item.moduleId));
  data.assessments = data.assessments.filter((item) => !moduleIds.includes(item.moduleId));
  data.assignments = data.assignments.filter((assignment) => !lessonIds.includes(assignment.lessonId) && !assessmentIds.includes(assignment.assessmentId));
  data.progress.forEach((record) => {
    if (record.moduleId && moduleIds.includes(record.moduleId)) record.moduleId = null;
    if (record.recommendedNextModuleId && moduleIds.includes(record.recommendedNextModuleId)) record.recommendedNextModuleId = null;
  });

  return commit(strand);
}

function listModules() {
  return data.modules;
}

function findModuleById(id) {
  return data.modules.find((item) => item.id === id) || null;
}

function createModule(input) {
  const module = {
    id: `module-${data.modules.length + 1}`,
    strandId: input.strandId,
    level: input.level,
    title: input.title,
    lessonCount: Number(input.lessonCount || 0),
    order: Number(input.order || data.modules.length + 1),
    status: input.status || 'draft',
  };

  data.modules.push(module);
  ensureOrderWithinSiblings(data.modules, 'strandId', module.strandId);
  return commit(module);
}

function updateModule(id, input) {
  const module = findModuleById(id);

  if (!module) {
    return null;
  }

  const previousStrandId = module.strandId;

  Object.assign(module, {
    strandId: input.strandId ?? module.strandId,
    level: input.level ?? module.level,
    title: input.title ?? module.title,
    lessonCount: input.lessonCount !== undefined ? Number(input.lessonCount) : module.lessonCount,
    order: input.order !== undefined ? Number(input.order) : module.order,
    status: input.status ?? module.status,
  });

  ensureOrderWithinSiblings(data.modules, 'strandId', module.strandId);
  if (previousStrandId !== module.strandId) {
    ensureOrderWithinSiblings(data.modules, 'strandId', previousStrandId);
  }

  return commit(module);
}

function deleteModule(id) {
  const index = data.modules.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [module] = data.modules.splice(index, 1);
  const lessonIds = data.lessons.filter((lesson) => lesson.moduleId === id).map((lesson) => lesson.id);
  const assessmentIds = data.assessments.filter((assessment) => assessment.moduleId === id).map((assessment) => assessment.id);

  data.lessons = data.lessons.filter((lesson) => lesson.moduleId !== id);
  data.assessments = data.assessments.filter((assessment) => assessment.moduleId !== id);
  data.assignments = data.assignments.filter((assignment) => !lessonIds.includes(assignment.lessonId) && !assessmentIds.includes(assignment.assessmentId));
  data.progress.forEach((record) => {
    if (record.moduleId === id) record.moduleId = null;
    if (record.recommendedNextModuleId === id) record.recommendedNextModuleId = null;
  });

  return commit(module);
}

function listLessons() {
  return data.lessons;
}

function findLessonById(id) {
  return data.lessons.find((item) => item.id === id) || null;
}

function createLesson(input) {
  const lesson = {
    id: `lesson-${data.lessons.length + 1}`,
    subjectId: input.subjectId,
    moduleId: input.moduleId,
    title: input.title,
    durationMinutes: Number(input.durationMinutes || 0),
    mode: input.mode || 'guided',
    status: input.status || 'draft',
    order: Number(input.order || data.lessons.filter((item) => item.moduleId === input.moduleId).length + 1),
    targetAgeRange: input.targetAgeRange || null,
    voicePersona: input.voicePersona || null,
    learningObjectives: Array.isArray(input.learningObjectives) ? [...input.learningObjectives] : [],
    localization: input.localization && typeof input.localization === 'object' ? { ...input.localization } : null,
    lessonAssessment: input.lessonAssessment && typeof input.lessonAssessment === 'object'
      ? { ...input.lessonAssessment, items: Array.isArray(input.lessonAssessment.items) ? input.lessonAssessment.items.map((item) => ({ ...item })) : [] }
      : null,
    activitySteps: normalizeLessonActivities(input),
  };

  data.lessons.push(lesson);
  ensureOrderWithinSiblings(data.lessons, 'moduleId', lesson.moduleId);
  recalculateModuleLessonCount(lesson.moduleId);
  return commit(lesson);
}

function updateLesson(id, input) {
  const lesson = findLessonById(id);

  if (!lesson) {
    return null;
  }

  const previousModuleId = lesson.moduleId;

  Object.assign(lesson, {
    subjectId: input.subjectId ?? lesson.subjectId,
    moduleId: input.moduleId ?? lesson.moduleId,
    title: input.title ?? lesson.title,
    durationMinutes: input.durationMinutes !== undefined ? Number(input.durationMinutes) : lesson.durationMinutes,
    mode: input.mode ?? lesson.mode,
    status: input.status ?? lesson.status,
    order: input.order !== undefined ? Number(input.order) : lesson.order,
    targetAgeRange: input.targetAgeRange ?? lesson.targetAgeRange ?? null,
    voicePersona: input.voicePersona ?? lesson.voicePersona ?? null,
    learningObjectives: input.learningObjectives ?? lesson.learningObjectives ?? [],
    localization: input.localization !== undefined
      ? (input.localization && typeof input.localization === 'object' ? { ...input.localization } : null)
      : lesson.localization ?? null,
    lessonAssessment: input.lessonAssessment !== undefined
      ? (input.lessonAssessment && typeof input.lessonAssessment === 'object'
        ? {
            ...input.lessonAssessment,
            items: Array.isArray(input.lessonAssessment.items)
              ? input.lessonAssessment.items.map((item) => ({ ...item }))
              : [],
          }
        : null)
      : lesson.lessonAssessment ?? null,
    activitySteps: input.activitySteps !== undefined || input.activities !== undefined
      ? normalizeLessonActivities(input)
      : lesson.activitySteps ?? normalizeLessonActivities(lesson),
  });

  ensureOrderWithinSiblings(data.lessons, 'moduleId', lesson.moduleId);
  if (previousModuleId !== lesson.moduleId) {
    ensureOrderWithinSiblings(data.lessons, 'moduleId', previousModuleId);
    recalculateModuleLessonCount(previousModuleId);
  }
  recalculateModuleLessonCount(lesson.moduleId);

  return commit(lesson);
}

function deleteLesson(id) {
  const index = data.lessons.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [lesson] = data.lessons.splice(index, 1);
  data.assignments = data.assignments.filter((assignment) => assignment.lessonId !== id);
  ensureOrderWithinSiblings(data.lessons, 'moduleId', lesson.moduleId);
  recalculateModuleLessonCount(lesson.moduleId);

  return commit(lesson);
}

function listAssessments() {
  return data.assessments;
}

function findAssessmentById(id) {
  return data.assessments.find((item) => item.id === id) || null;
}

function createAssessment(input) {
  const assessment = {
    id: `assessment-${data.assessments.length + 1}`,
    moduleId: input.moduleId,
    subjectId: input.subjectId,
    title: input.title,
    kind: input.kind || 'automatic',
    trigger: input.trigger || 'module-complete',
    triggerLabel: input.triggerLabel || 'After module completion',
    progressionGate: input.progressionGate || 'foundation-a',
    passingScore: Number(input.passingScore || 0.6),
    status: input.status || 'draft',
    order: Number(input.order || data.assessments.filter((item) => item.moduleId === input.moduleId).length + 1),
    items: Array.isArray(input.items) ? input.items.map((item) => ({ ...item })) : [],
  };

  data.assessments.push(assessment);
  ensureOrderWithinSiblings(data.assessments, 'moduleId', assessment.moduleId);
  return commit(assessment);
}

function updateAssessment(id, input) {
  const assessment = findAssessmentById(id);

  if (!assessment) {
    return null;
  }

  const previousModuleId = assessment.moduleId;

  Object.assign(assessment, {
    moduleId: input.moduleId ?? assessment.moduleId,
    subjectId: input.subjectId ?? assessment.subjectId,
    title: input.title ?? assessment.title,
    kind: input.kind ?? assessment.kind,
    trigger: input.trigger ?? assessment.trigger,
    triggerLabel: input.triggerLabel ?? assessment.triggerLabel,
    progressionGate: input.progressionGate ?? assessment.progressionGate,
    passingScore: input.passingScore !== undefined ? Number(input.passingScore) : assessment.passingScore,
    status: input.status ?? assessment.status,
    order: input.order !== undefined ? Number(input.order) : assessment.order,
    items: input.items !== undefined
      ? (Array.isArray(input.items) ? input.items.map((item) => ({ ...item })) : [])
      : assessment.items ?? [],
  });

  ensureOrderWithinSiblings(data.assessments, 'moduleId', assessment.moduleId);
  if (previousModuleId !== assessment.moduleId) {
    ensureOrderWithinSiblings(data.assessments, 'moduleId', previousModuleId);
  }

  return commit(assessment);
}

function deleteAssessment(id) {
  const index = data.assessments.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [assessment] = data.assessments.splice(index, 1);
  data.assignments.forEach((assignment) => {
    if (assignment.assessmentId === id) {
      assignment.assessmentId = null;
    }
  });
  ensureOrderWithinSiblings(data.assessments, 'moduleId', assessment.moduleId);

  return commit(assessment);
}

function listAssignments() {
  return data.assignments;
}

function findAssignmentById(id) {
  return data.assignments.find((item) => item.id === id) || null;
}

function createAssignment(input) {
  const assignment = {
    id: `assignment-${data.assignments.length + 1}`,
    cohortId: input.cohortId,
    lessonId: input.lessonId,
    assignedBy: input.assignedBy,
    dueDate: input.dueDate,
    status: input.status || 'active',
    podId: input.podId || findCohortById(input.cohortId)?.podId || null,
    assessmentId: input.assessmentId || null,
    assignedAt: input.assignedAt || new Date().toISOString(),
  };

  data.assignments.push(assignment);
  return commit(assignment);
}

function updateAssignment(id, input) {
  const assignment = findAssignmentById(id);

  if (!assignment) {
    return null;
  }

  const nextCohortId = input.cohortId ?? assignment.cohortId;

  Object.assign(assignment, {
    cohortId: nextCohortId,
    lessonId: input.lessonId ?? assignment.lessonId,
    assignedBy: input.assignedBy ?? assignment.assignedBy,
    dueDate: input.dueDate ?? assignment.dueDate,
    status: input.status ?? assignment.status,
    podId: input.podId ?? findCohortById(nextCohortId)?.podId ?? assignment.podId,
    assessmentId: input.assessmentId ?? assignment.assessmentId,
    assignedAt: input.assignedAt ?? assignment.assignedAt,
  });

  return commit(assignment);
}

function listAttendance() {
  return data.attendance;
}

function createAttendance(input) {
  const record = {
    id: `attendance-${data.attendance.length + 1}`,
    studentId: input.studentId,
    date: input.date,
    status: input.status,
  };

  data.attendance.push(record);
  return commit(record);
}

function listProgress() {
  return data.progress;
}

function findProgressById(id) {
  return data.progress.find((item) => item.id === id) || null;
}

function createProgress(input) {
  const record = {
    id: `progress-${data.progress.length + 1}`,
    studentId: input.studentId,
    subjectId: input.subjectId,
    moduleId: input.moduleId,
    mastery: Number(input.mastery || 0),
    lessonsCompleted: Number(input.lessonsCompleted || 0),
    progressionStatus: input.progressionStatus || 'on-track',
    recommendedNextModuleId: input.recommendedNextModuleId || input.moduleId || null,
    override: input.override && typeof input.override === 'object'
      ? {
          status: input.override.status ?? null,
          reason: input.override.reason ?? null,
          actorName: input.override.actorName ?? null,
          actorRole: input.override.actorRole ?? null,
          updatedAt: input.override.updatedAt ?? new Date().toISOString(),
        }
      : null,
    lastActiveAt: new Date().toISOString(),
  };

  data.progress.push(record);
  return commit(record);
}

function updateProgress(id, input) {
  const record = findProgressById(id);

  if (!record) {
    return null;
  }

  Object.assign(record, {
    subjectId: input.subjectId ?? record.subjectId,
    moduleId: input.moduleId ?? record.moduleId,
    mastery: input.mastery !== undefined ? Number(input.mastery) : record.mastery,
    lessonsCompleted: input.lessonsCompleted !== undefined ? Number(input.lessonsCompleted) : record.lessonsCompleted,
    progressionStatus: input.progressionStatus ?? record.progressionStatus,
    recommendedNextModuleId: input.recommendedNextModuleId ?? record.recommendedNextModuleId,
    override: input.override === null
      ? null
      : input.override && typeof input.override === 'object'
        ? {
            status: input.override.status ?? input.progressionStatus ?? record.progressionStatus,
            reason: input.override.reason ?? record.override?.reason ?? null,
            actorName: input.override.actorName ?? record.override?.actorName ?? null,
            actorRole: input.override.actorRole ?? record.override?.actorRole ?? null,
            updatedAt: input.override.updatedAt ?? new Date().toISOString(),
          }
        : record.override ?? null,
    lastActiveAt: new Date().toISOString(),
  });

  return commit(record);
}

function upsertProgress(input) {
  const existing = data.progress.find(
    (item) => item.studentId === input.studentId && item.subjectId === input.subjectId,
  );

  if (!existing) {
    return createProgress(input);
  }

  return updateProgress(existing.id, {
    ...input,
    lessonsCompleted: Math.max(Number(existing.lessonsCompleted || 0), Number(input.lessonsCompleted || 0)),
    mastery: input.mastery !== undefined ? Number(input.mastery) : existing.mastery,
  });
}

function listObservations() {
  return data.observations;
}

function createObservation(input) {
  const record = {
    id: `obs-${data.observations.length + 1}`,
    studentId: input.studentId,
    teacherId: input.teacherId,
    note: input.note,
    competencyTag: input.competencyTag || null,
    supportLevel: input.supportLevel || 'guided',
    createdAt: new Date().toISOString(),
  };

  data.observations.push(record);
  return commit(record);
}

function listSyncEvents() {
  return data.syncEvents;
}

function findSyncEventByClientId(clientId) {
  if (!clientId) return null;
  return data.syncEvents.find((item) => item.clientId === clientId) || null;
}

function createSyncEvent(input) {
  const record = {
    id: `sync-${data.syncEvents.length + 1}`,
    clientId: input.clientId || null,
    batchId: input.batchId || null,
    type: input.type || 'unknown',
    learnerId: input.learnerId || null,
    status: input.status || 'accepted',
    payloadHash: input.payloadHash || null,
    receivedAt: input.receivedAt || new Date().toISOString(),
    appliedAt: input.appliedAt || new Date().toISOString(),
    result: input.result || null,
  };

  data.syncEvents.push(record);
  return commit(record);
}

function listLessonSessions() {
  return data.lessonSessions;
}

function findLessonSessionBySessionId(sessionId) {
  if (!sessionId) return null;
  return data.lessonSessions.find((item) => item.sessionId === sessionId) || null;
}

function upsertLessonSession(input) {
  const existing = findLessonSessionBySessionId(input.sessionId);

  if (!existing) {
    const record = {
      id: `runtime-session-${data.lessonSessions.length + 1}`,
      sessionId: input.sessionId,
      studentId: input.studentId,
      learnerCode: input.learnerCode || null,
      lessonId: input.lessonId || null,
      moduleId: input.moduleId || null,
      status: input.status || 'in_progress',
      completionState: input.completionState || 'inProgress',
      automationStatus: input.automationStatus || 'guided',
      currentStepIndex: Number(input.currentStepIndex || 0),
      stepsTotal: Number(input.stepsTotal || 0),
      responsesCaptured: Number(input.responsesCaptured || 0),
      supportActionsUsed: Number(input.supportActionsUsed || 0),
      audioCaptures: Number(input.audioCaptures || 0),
      facilitatorObservations: Number(input.facilitatorObservations || 0),
      latestReview: input.latestReview || null,
      lastEventType: input.lastEventType || null,
      startedAt: input.startedAt || new Date().toISOString(),
      lastActivityAt: input.lastActivityAt || input.startedAt || new Date().toISOString(),
      completedAt: input.completedAt || null,
    };

    data.lessonSessions.push(record);
    return commit(record);
  }

  Object.assign(existing, {
    studentId: input.studentId ?? existing.studentId,
    learnerCode: input.learnerCode ?? existing.learnerCode,
    lessonId: input.lessonId ?? existing.lessonId,
    moduleId: input.moduleId ?? existing.moduleId,
    status: input.status ?? existing.status,
    completionState: input.completionState ?? existing.completionState,
    automationStatus: input.automationStatus ?? existing.automationStatus,
    currentStepIndex: input.currentStepIndex !== undefined ? Number(input.currentStepIndex) : existing.currentStepIndex,
    stepsTotal: input.stepsTotal !== undefined ? Number(input.stepsTotal) : existing.stepsTotal,
    responsesCaptured: input.responsesCaptured !== undefined ? Number(input.responsesCaptured) : existing.responsesCaptured,
    supportActionsUsed: input.supportActionsUsed !== undefined ? Number(input.supportActionsUsed) : existing.supportActionsUsed,
    audioCaptures: input.audioCaptures !== undefined ? Number(input.audioCaptures) : existing.audioCaptures,
    facilitatorObservations: input.facilitatorObservations !== undefined ? Number(input.facilitatorObservations) : existing.facilitatorObservations,
    latestReview: input.latestReview !== undefined ? input.latestReview : existing.latestReview,
    lastEventType: input.lastEventType ?? existing.lastEventType,
    startedAt: input.startedAt ?? existing.startedAt,
    lastActivityAt: input.lastActivityAt ?? existing.lastActivityAt,
    completedAt: input.completedAt !== undefined ? input.completedAt : existing.completedAt,
  });

  return commit(existing);
}

function listSessionEventLog() {
  return data.sessionEventLog;
}

function createSessionEventLog(input) {
  const record = {
    id: `runtime-event-${data.sessionEventLog.length + 1}`,
    sessionId: input.sessionId,
    studentId: input.studentId || null,
    lessonId: input.lessonId || null,
    moduleId: input.moduleId || null,
    type: input.type || 'unknown',
    payload: input.payload && typeof input.payload === 'object' ? { ...input.payload } : null,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  data.sessionEventLog.push(record);
  return commit(record);
}

function listRewardTransactions() {
  return data.rewardTransactions;
}

function findRewardTransactionById(id) {
  return data.rewardTransactions.find((item) => item.id === id) || null;
}

function listRewardAdjustments() {
  return data.rewardAdjustments;
}

function createRewardAdjustment(input) {
  const record = {
    id: `reward-adjustment-${data.rewardAdjustments.length + 1}`,
    transactionId: input.transactionId,
    studentId: input.studentId,
    action: input.action || 'corrected',
    reason: input.reason || '',
    note: input.note || '',
    actorName: input.actorName || 'Unknown actor',
    actorRole: input.actorRole || 'admin',
    before: input.before && typeof input.before === 'object' ? { ...input.before } : null,
    after: input.after && typeof input.after === 'object' ? { ...input.after } : null,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  data.rewardAdjustments.push(record);
  return commit(record);
}


function listRewardRedemptionRequests() {
  return data.rewardRedemptionRequests;
}

function findRewardRedemptionRequestById(id) {
  return data.rewardRedemptionRequests.find((item) => item.id === id) || null;
}

function createRewardRedemptionRequest(input) {
  const record = {
    id: `reward-request-${data.rewardRedemptionRequests.length + 1}`,
    studentId: input.studentId,
    rewardItemId: input.rewardItemId,
    rewardTitle: input.rewardTitle || null,
    xpCost: Number(input.xpCost || 0),
    status: input.status || 'pending',
    learnerNote: input.learnerNote || '',
    adminNote: input.adminNote || '',
    requestedBy: input.requestedBy || input.studentId || null,
    requestedVia: input.requestedVia || 'learner-app',
    clientRequestId: input.clientRequestId || null,
    approvedAt: input.approvedAt || null,
    approvedBy: input.approvedBy || null,
    rejectedAt: input.rejectedAt || null,
    rejectedBy: input.rejectedBy || null,
    fulfilledAt: input.fulfilledAt || null,
    fulfilledBy: input.fulfilledBy || null,
    cancelledAt: input.cancelledAt || null,
    cancelledBy: input.cancelledBy || null,
    transactionId: input.transactionId || null,
    metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };

  data.rewardRedemptionRequests.push(record);
  return commit(record);
}

function updateRewardRedemptionRequest(id, input) {
  const record = findRewardRedemptionRequestById(id);
  if (!record) return null;

  Object.assign(record, {
    rewardTitle: input.rewardTitle ?? record.rewardTitle,
    xpCost: input.xpCost !== undefined ? Number(input.xpCost) : record.xpCost,
    status: input.status ?? record.status,
    learnerNote: input.learnerNote !== undefined ? input.learnerNote : record.learnerNote,
    adminNote: input.adminNote !== undefined ? input.adminNote : record.adminNote,
    requestedBy: input.requestedBy ?? record.requestedBy,
    requestedVia: input.requestedVia ?? record.requestedVia,
    clientRequestId: input.clientRequestId ?? record.clientRequestId,
    approvedAt: input.approvedAt !== undefined ? input.approvedAt : record.approvedAt,
    approvedBy: input.approvedBy !== undefined ? input.approvedBy : record.approvedBy,
    rejectedAt: input.rejectedAt !== undefined ? input.rejectedAt : record.rejectedAt,
    rejectedBy: input.rejectedBy !== undefined ? input.rejectedBy : record.rejectedBy,
    fulfilledAt: input.fulfilledAt !== undefined ? input.fulfilledAt : record.fulfilledAt,
    fulfilledBy: input.fulfilledBy !== undefined ? input.fulfilledBy : record.fulfilledBy,
    cancelledAt: input.cancelledAt !== undefined ? input.cancelledAt : record.cancelledAt,
    cancelledBy: input.cancelledBy !== undefined ? input.cancelledBy : record.cancelledBy,
    transactionId: input.transactionId !== undefined ? input.transactionId : record.transactionId,
    metadata: input.metadata !== undefined
      ? (input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : null)
      : record.metadata,
    updatedAt: input.updatedAt || new Date().toISOString(),
  });

  return commit(record);
}

function listProgressionOverrides() {
  return data.progressionOverrides;
}

function findProgressionOverrideById(id) {
  if (!id) return null;
  return data.progressionOverrides.find((item) => item.id === id) || null;
}

function createProgressionOverride(input) {
  const record = {
    id: `progression-override-${data.progressionOverrides.length + 1}`,
    studentId: input.studentId,
    progressId: input.progressId || null,
    action: input.action || 'override',
    previousStatus: input.previousStatus || null,
    nextStatus: input.nextStatus || null,
    previousRecommendedNextModuleId: input.previousRecommendedNextModuleId || null,
    nextRecommendedNextModuleId: input.nextRecommendedNextModuleId || null,
    reason: input.reason || '',
    note: input.note || '',
    actorName: input.actorName || 'Unknown actor',
    actorRole: input.actorRole || 'admin',
    createdAt: input.createdAt || new Date().toISOString(),
    revokedAt: input.revokedAt || null,
    revokedBy: input.revokedBy || null,
  };

  data.progressionOverrides.push(record);
  return commit(record);
}

function updateProgressionOverride(id, input) {
  const record = data.progressionOverrides.find((item) => item.id === id) || null;
  if (!record) return null;

  Object.assign(record, {
    action: input.action ?? record.action,
    nextStatus: input.nextStatus ?? record.nextStatus,
    nextRecommendedNextModuleId: input.nextRecommendedNextModuleId ?? record.nextRecommendedNextModuleId,
    reason: input.reason ?? record.reason,
    note: input.note ?? record.note,
    revokedAt: input.revokedAt !== undefined ? input.revokedAt : record.revokedAt,
    revokedBy: input.revokedBy !== undefined ? input.revokedBy : record.revokedBy,
  });

  return commit(record);
}

function listSessionRepairs() {
  return data.sessionRepairs;
}

function findSessionRepairById(id) {
  if (!id) return null;
  return data.sessionRepairs.find((item) => item.id === id) || null;
}

function createSessionRepair(input) {
  const record = {
    id: `session-repair-${data.sessionRepairs.length + 1}`,
    sessionId: input.sessionId,
    learnerId: input.learnerId || null,
    actorName: input.actorName || 'Unknown actor',
    actorRole: input.actorRole || 'admin',
    reason: input.reason || '',
    patch: input.patch && typeof input.patch === 'object' ? { ...input.patch } : {},
    before: input.before && typeof input.before === 'object' ? { ...input.before } : null,
    after: input.after && typeof input.after === 'object' ? { ...input.after } : null,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  data.sessionRepairs.push(record);
  return commit(record);
}

function listStorageOperations() {
  return data.storageOperations;
}

function findStorageOperationById(id) {
  if (!id) return null;
  return data.storageOperations.find((item) => item.id === id) || null;
}

function createStorageOperation(input) {
  const record = {
    id: `storage-operation-${data.storageOperations.length + 1}`,
    kind: input.kind || 'unknown',
    status: input.status || 'succeeded',
    actorName: input.actorName || 'Unknown actor',
    actorRole: input.actorRole || 'admin',
    label: input.label || null,
    backupPath: input.backupPath || null,
    apply: input.apply === undefined ? null : Boolean(input.apply),
    merge: input.merge === undefined ? null : Boolean(input.merge),
    createCheckpoint: input.createCheckpoint === undefined ? null : Boolean(input.createCheckpoint),
    summary: input.summary && typeof input.summary === 'object' ? { ...input.summary } : null,
    metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : null,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  data.storageOperations.push(record);
  return commit(record);
}

function createRewardTransaction(input) {
  const record = {
    id: `reward-${data.rewardTransactions.length + 1}`,
    studentId: input.studentId,
    lessonId: input.lessonId || null,
    moduleId: input.moduleId || null,
    subjectId: input.subjectId || null,
    kind: input.kind || 'manual',
    xpDelta: Number(input.xpDelta || 0),
    badgeId: input.badgeId || null,
    label: input.label || 'Reward update',
    metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : null,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  data.rewardTransactions.push(record);
  return commit(record);
}


function listCurriculumNodeChildren(nodeType, nodeId) {
  if (nodeType === 'root') {
    return listSubjects().slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }
  if (nodeType === 'subject') {
    return listStrands().filter((item) => item.subjectId === nodeId).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }
  if (nodeType === 'strand') {
    return listModules().filter((item) => item.strandId === nodeId).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }
  if (nodeType === 'module') {
    const lessons = listLessons().filter((item) => item.moduleId === nodeId).map((item) => ({ ...item, nodeType: 'lesson' }));
    const assessments = listAssessments().filter((item) => item.moduleId === nodeId).map((item) => ({ ...item, nodeType: 'assessment' }));
    return [...lessons, ...assessments].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || '')));
  }
  return [];
}

function reorderCurriculumNodes({ parentType, parentId = null, nodeType, orderedIds }) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    const error = new Error('orderedIds must be a non-empty array');
    error.statusCode = 400;
    throw error;
  }

  if (nodeType === 'subject' && parentType === 'root') {
    reorderCollection({ collection: data.subjects, ids: orderedIds });
    return commit(listSubjects().slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
  }

  if (nodeType === 'strand' && parentType === 'subject') {
    reorderCollection({ collection: data.strands, ids: orderedIds, parentKey: 'subjectId', parentValue: parentId });
    return commit(listStrands().filter((item) => item.subjectId === parentId).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
  }

  if (nodeType === 'module' && parentType === 'strand') {
    reorderCollection({ collection: data.modules, ids: orderedIds, parentKey: 'strandId', parentValue: parentId });
    return commit(listModules().filter((item) => item.strandId === parentId).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
  }

  if (nodeType === 'lesson' && parentType === 'module') {
    reorderCollection({ collection: data.lessons, ids: orderedIds, parentKey: 'moduleId', parentValue: parentId });
    return commit(listLessons().filter((item) => item.moduleId === parentId).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
  }

  if (nodeType === 'assessment' && parentType === 'module') {
    reorderCollection({ collection: data.assessments, ids: orderedIds, parentKey: 'moduleId', parentValue: parentId });
    return commit(listAssessments().filter((item) => item.moduleId === parentId).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
  }

  const error = new Error(`Unsupported curriculum reorder: ${parentType} -> ${nodeType}`);
  error.statusCode = 400;
  throw error;
}



function listDeviceRegistrations() {
  return data.deviceRegistrations || [];
}

function findDeviceRegistrationById(id) {
  return listDeviceRegistrations().find((item) => item.id === id) || null;
}

function findDeviceRegistrationByIdentifier(deviceIdentifier) {
  if (!deviceIdentifier) return null;
  return listDeviceRegistrations().find((item) => item.deviceIdentifier === deviceIdentifier) || null;
}

function findDeviceRegistrationByIdentifier(deviceIdentifier) {
  if (!deviceIdentifier) return null;
  const normalized = String(deviceIdentifier).trim().toLowerCase();
  if (!normalized) return null;
  return listDeviceRegistrations().find((item) => String(item.deviceIdentifier || '').trim().toLowerCase() === normalized) || null;
}

function createDeviceRegistration(input) {
  const pod = input.podId ? findPodById(input.podId) : null;
  const center = input.centerId ? findCenterById(input.centerId) : pod ? findCenterById(pod.centerId) : null;
  const record = {
    id: input.id || `device-${listDeviceRegistrations().length + 1}`,
    podId: input.podId,
    stateId: input.stateId || pod?.stateId || center?.stateId || null,
    localGovernmentId: input.localGovernmentId || pod?.localGovernmentId || center?.localGovernmentId || null,
    centerId: input.centerId || pod?.centerId || null,
    assignedMallamId: input.assignedMallamId || null,
    deviceIdentifier: input.deviceIdentifier,
    serialNumber: input.serialNumber || null,
    platform: input.platform || 'android',
    appVersion: input.appVersion || null,
    status: input.status || 'active',
    metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : null,
    lastSeenAt: input.lastSeenAt || null,
    registeredAt: input.registeredAt || new Date().toISOString(),
  };

  data.deviceRegistrations.push(record);
  return commit(record);
}

function deleteDeviceRegistration(id) {
  const record = findDeviceRegistrationById(id);
  if (!record) return null;

  data.deviceRegistrations = data.deviceRegistrations.filter((item) => item.id !== id);
  return commit(record);
}

function updateDeviceRegistration(id, input) {
  const record = findDeviceRegistrationById(id);
  if (!record) return null;

  const nextPodId = input.podId ?? record.podId;
  const pod = nextPodId ? findPodById(nextPodId) : null;
  const center = (input.centerId ?? record.centerId) ? findCenterById(input.centerId ?? record.centerId) : pod ? findCenterById(pod.centerId) : null;

  Object.assign(record, {
    podId: nextPodId,
    stateId: input.stateId ?? pod?.stateId ?? center?.stateId ?? record.stateId,
    localGovernmentId: input.localGovernmentId ?? pod?.localGovernmentId ?? center?.localGovernmentId ?? record.localGovernmentId,
    centerId: input.centerId ?? pod?.centerId ?? record.centerId,
    assignedMallamId: input.assignedMallamId ?? record.assignedMallamId,
    deviceIdentifier: input.deviceIdentifier ?? record.deviceIdentifier,
    serialNumber: input.serialNumber !== undefined ? input.serialNumber : record.serialNumber,
    platform: input.platform ?? record.platform,
    appVersion: input.appVersion !== undefined ? input.appVersion : record.appVersion,
    status: input.status ?? record.status,
    metadata: input.metadata !== undefined ? (input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : null) : record.metadata,
    lastSeenAt: input.lastSeenAt !== undefined ? input.lastSeenAt : record.lastSeenAt,
    registeredAt: input.registeredAt ?? record.registeredAt,
  });

  return commit(record);
}

function listLessonAssets() {
  return data.lessonAssets;
}

function findLessonAssetById(id) {
  return data.lessonAssets.find((item) => item.id === id) || null;
}

function createLessonAsset(input) {
  const asset = {
    id: input.id || `asset-${data.lessonAssets.length + 1}`,
    kind: input.kind || 'image',
    title: input.title || input.originalFileName || input.fileName || 'Untitled asset',
    description: input.description || '',
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
    subjectId: input.subjectId || null,
    moduleId: input.moduleId || null,
    lessonId: input.lessonId || null,
    mimeType: input.mimeType || null,
    fileName: input.fileName || null,
    originalFileName: input.originalFileName || null,
    sizeBytes: input.sizeBytes !== undefined ? Number(input.sizeBytes) : null,
    storagePath: input.storagePath || null,
    fileUrl: input.fileUrl || null,
    status: input.status || 'ready',
    createdBy: input.createdBy || 'Unknown actor',
    source: input.source || 'upload',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };

  data.lessonAssets.push(asset);
  return commit(asset);
}

function updateLessonAsset(id, input) {
  const asset = findLessonAssetById(id);
  if (!asset) return null;

  Object.assign(asset, {
    kind: input.kind ?? asset.kind,
    title: input.title ?? asset.title,
    description: input.description ?? asset.description,
    tags: input.tags !== undefined ? (Array.isArray(input.tags) ? [...input.tags] : []) : asset.tags,
    subjectId: input.subjectId !== undefined ? input.subjectId : asset.subjectId,
    moduleId: input.moduleId !== undefined ? input.moduleId : asset.moduleId,
    lessonId: input.lessonId !== undefined ? input.lessonId : asset.lessonId,
    mimeType: input.mimeType ?? asset.mimeType,
    fileName: input.fileName ?? asset.fileName,
    originalFileName: input.originalFileName ?? asset.originalFileName,
    sizeBytes: input.sizeBytes !== undefined ? Number(input.sizeBytes) : asset.sizeBytes,
    storagePath: input.storagePath ?? asset.storagePath,
    fileUrl: input.fileUrl ?? asset.fileUrl,
    status: input.status ?? asset.status,
    source: input.source ?? asset.source,
    updatedAt: input.updatedAt || new Date().toISOString(),
  });

  return commit(asset);
}

function deleteLessonAsset(id) {
  const index = data.lessonAssets.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const [asset] = data.lessonAssets.splice(index, 1);
  return commit(asset);
}

module.exports = {
  listCenters,
  findCenterById,
  listStates,
  findStateById,
  createState,
  updateState,
  listLocalGovernments,
  findLocalGovernmentById,
  createLocalGovernment,
  updateLocalGovernment,
  listPods,
  findPodById,
  createPod,
  updatePod,
  deletePod,
  listCohorts,
  findCohortById,
  listTeachers,
  findTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  listStudents,
  findStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  listSubjects,
  findSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  listStrands,
  findStrandById,
  createStrand,
  updateStrand,
  deleteStrand,
  listModules,
  findModuleById,
  createModule,
  updateModule,
  deleteModule,
  listLessons,
  findLessonById,
  listDeviceRegistrations,
  findDeviceRegistrationById,
  findDeviceRegistrationByIdentifier,
  createDeviceRegistration,
  updateDeviceRegistration,
  deleteDeviceRegistration,
  listLessonAssets,
  findLessonAssetById,
  createLesson,
  updateLesson,
  createLessonAsset,
  updateLessonAsset,
  deleteLessonAsset,
  deleteLesson,
  listAssessments,
  findAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  listAssignments,
  findAssignmentById,
  createAssignment,
  updateAssignment,
  listAttendance,
  createAttendance,
  listProgress,
  findProgressById,
  createProgress,
  updateProgress,
  upsertProgress,
  listObservations,
  createObservation,
  listSyncEvents,
  findSyncEventByClientId,
  createSyncEvent,
  listLessonSessions,
  findLessonSessionBySessionId,
  upsertLessonSession,
  listSessionEventLog,
  createSessionEventLog,
  listRewardTransactions,
  findRewardTransactionById,
  listRewardAdjustments,
  createRewardAdjustment,
  createRewardTransaction,
  listRewardRedemptionRequests,
  findRewardRedemptionRequestById,
  createRewardRedemptionRequest,
  updateRewardRedemptionRequest,
  listCurriculumNodeChildren,
  reorderCurriculumNodes,
  listProgressionOverrides,
  findProgressionOverrideById,
  createProgressionOverride,
  updateProgressionOverride,
  listSessionRepairs,
  findSessionRepairById,
  createSessionRepair,
  listStorageOperations,
  findStorageOperationById,
  createStorageOperation,
  recalculateModuleLessonCount,
  recalculateAllModuleLessonCounts,
};
