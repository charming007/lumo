const repository = require('./repository');
const rewards = require('./rewards');

function formatAttendanceBand(rate) {
  if (rate >= 0.9) return 'Stable attendance';
  if (rate >= 0.8) return 'Needs occasional follow-up';
  return 'Attendance needs support';
}

function formatReadinessLabel(level) {
  if (level === 'beginner') return 'Voice-first beginner';
  if (level === 'emerging') return 'Ready for guided practice';
  return 'Confident responder';
}

function buildLearnerCode(student, cohort) {
  const cleanedName = (student.name || 'NEW').replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = (cleanedName || 'NEW').slice(0, 3).padEnd(3, 'X');
  const cohortCode = (cohort?.name || 'General Cohort')
    .split(' ')
    .map((part) => (part ? part[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 2)
    .padEnd(2, 'G');
  const ageCode = String(student.age || 0).padStart(2, '0');
  return `${prefix}-${cohortCode}${ageCode}`;
}

function buildLessonActivitySteps(entry) {
  const steps = entry.activitySteps ?? entry.activities ?? [];

  return steps.map((step, index) => ({
    ...step,
    order: step.order !== undefined ? Number(step.order) : index + 1,
    media: Array.isArray(step.media) ? step.media : [],
    choices: Array.isArray(step.choices) ? step.choices : [],
    expectedAnswers: Array.isArray(step.expectedAnswers) ? step.expectedAnswers : [],
    tags: Array.isArray(step.tags) ? step.tags : [],
  }));
}

function buildLessonAssessment(entry) {
  if (!entry.lessonAssessment || typeof entry.lessonAssessment !== 'object') {
    return null;
  }

  return {
    ...entry.lessonAssessment,
    items: Array.isArray(entry.lessonAssessment.items) ? entry.lessonAssessment.items : [],
  };
}

function buildModuleAssessment(module) {
  if (!module) {
    return null;
  }

  const assessment = repository
    .listAssessments()
    .find((item) => item.moduleId === module.id && item.status === 'active');

  if (!assessment) {
    return null;
  }

  return {
    ...presentAssessment(assessment),
    items: Array.isArray(assessment.items) ? assessment.items : [],
  };
}

function buildLessonContract(entry) {
  const activitySteps = buildLessonActivitySteps(entry);

  return {
    id: entry.id,
    subject: entry.subjectId,
    title: entry.title,
    mode: entry.mode,
    targetAgeRange: entry.targetAgeRange ?? null,
    voicePersona: entry.voicePersona ?? null,
    durationMinutes: entry.durationMinutes ?? null,
    learningObjectives: Array.isArray(entry.learningObjectives) ? entry.learningObjectives : [],
    localization: entry.localization && typeof entry.localization === 'object' ? entry.localization : null,
    lessonAssessment: buildLessonAssessment(entry),
    activitySteps,
    activities: activitySteps,
    activityCount: activitySteps.length,
  };
}

function presentPod(pod) {
  const center = repository.findCenterById(pod.centerId);
  const state = pod.stateId ? repository.findStateById(pod.stateId) : center?.stateId ? repository.findStateById(center.stateId) : null;
  const localGovernment = pod.localGovernmentId
    ? repository.findLocalGovernmentById(pod.localGovernmentId)
    : center?.localGovernmentId
      ? repository.findLocalGovernmentById(center.localGovernmentId)
      : null;
  const mallams = repository
    .listTeachers()
    .filter((teacher) => (pod.mallamIds || []).includes(teacher.id))
    .map((teacher) => teacher.displayName || teacher.name);

  return {
    ...pod,
    centerName: center?.name ?? null,
    region: center?.region ?? null,
    stateId: pod.stateId || center?.stateId || null,
    stateName: state?.name ?? null,
    localGovernmentId: pod.localGovernmentId || center?.localGovernmentId || null,
    localGovernmentName: localGovernment?.name ?? null,
    mallamNames: mallams,
  };
}

function presentMallam(teacher) {
  const center = repository.findCenterById(teacher.centerId);
  const podIds = Array.isArray(teacher.podIds) ? teacher.podIds : [];
  const primaryPodId = teacher.primaryPodId || podIds[0] || null;
  const primaryPod = primaryPodId ? repository.findPodById(primaryPodId) : null;
  const resolvedStateId = primaryPod?.stateId || center?.stateId || teacher.stateId || null;
  const resolvedLocalGovernmentId = primaryPod?.localGovernmentId || center?.localGovernmentId || teacher.localGovernmentId || null;
  const resolvedStateName = primaryPod?.stateName || (resolvedStateId ? repository.findStateById(resolvedStateId)?.name ?? null : null);
  const resolvedLocalGovernmentName = primaryPod?.localGovernmentName || (resolvedLocalGovernmentId ? repository.findLocalGovernmentById(resolvedLocalGovernmentId)?.name ?? null : null);
  const podLabels = repository
    .listPods()
    .filter((pod) => podIds.includes(pod.id))
    .map((pod) => pod.label);

  return {
    ...teacher,
    podIds,
    primaryPodId,
    primaryPodLabel: primaryPod?.label ?? null,
    centerName: center?.name ?? null,
    region: center?.region ?? resolvedStateName ?? null,
    stateId: resolvedStateId,
    stateName: resolvedStateName,
    localGovernmentId: resolvedLocalGovernmentId,
    localGovernmentName: resolvedLocalGovernmentName,
    podLabels,
  };
}

function presentRewardSnapshot(studentId) {
  return rewards.buildLearnerRewards(studentId);
}

function resolveStudentPod(student, cohort = null) {
  return repository.findPodById(student.podId)
    || (cohort?.podId ? repository.findPodById(cohort.podId) : null)
    || null;
}

function presentStudent(student) {
  const cohort = repository.findCohortById(student.cohortId);
  const mallam = repository.findTeacherById(student.mallamId);
  const pod = resolveStudentPod(student, cohort, mallam);
  const podPrimaryMallam = repository.findTeacherById((pod?.mallamIds || [])[0] || null);

  return {
    ...student,
    podId: student.podId ?? pod?.id ?? null,
    cohortName: cohort?.name ?? null,
    podLabel: pod?.label ?? null,
    stateId: pod?.stateId ?? null,
    stateName: pod?.stateId ? repository.findStateById(pod.stateId)?.name ?? null : null,
    localGovernmentId: pod?.localGovernmentId ?? null,
    localGovernmentName: pod?.localGovernmentId ? repository.findLocalGovernmentById(pod.localGovernmentId)?.name ?? null : null,
    mallamId: student.mallamId ?? podPrimaryMallam?.id ?? null,
    mallamName: mallam?.displayName ?? mallam?.name ?? podPrimaryMallam?.displayName ?? podPrimaryMallam?.name ?? null,
    rewards: presentRewardSnapshot(student.id),
  };
}

function presentLearnerProfile(student) {
  const cohort = repository.findCohortById(student.cohortId);
  const mallam = repository.findTeacherById(student.mallamId);
  const pod = resolveStudentPod(student, cohort, mallam);
  const podPrimaryMallam = repository.findTeacherById((pod?.mallamIds || [])[0] || null);
  const progressEntries = repository.listProgress().filter((entry) => entry.studentId === student.id);
  const attendanceEntries = repository
    .listAttendance()
    .filter((entry) => entry.studentId === student.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestProgress = progressEntries.slice().sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))[0];
  const latestAttendance = attendanceEntries[0];
  const recommendedModule = latestProgress?.recommendedNextModuleId
    ? repository.findModuleById(latestProgress.recommendedNextModuleId)
    : null;

  const rewardSnapshot = presentRewardSnapshot(student.id);

  return {
    id: student.id,
    name: student.name,
    age: student.age,
    cohort: cohort?.name ?? 'Unassigned cohort',
    cohortId: cohort?.id ?? student.cohortId ?? null,
    podId: student.podId ?? null,
    podLabel: pod?.label ?? null,
    mallamId: student.mallamId ?? podPrimaryMallam?.id ?? null,
    mallamName: mallam?.displayName ?? mallam?.name ?? podPrimaryMallam?.displayName ?? podPrimaryMallam?.name ?? null,
    streakDays: latestProgress?.lessonsCompleted ?? 0,
    guardianName: student.guardianName || 'Unknown guardian',
    preferredLanguage: student.preferredLanguage || 'Hausa',
    readinessLabel: formatReadinessLabel(student.level),
    village: student.village || pod?.label || 'Unknown village',
    guardianPhone: student.guardianPhone || '',
    sex: student.gender === 'male' ? 'Boy' : student.gender === 'female' ? 'Girl' : 'Unspecified',
    baselineLevel: student.stage,
    consentCaptured: true,
    learnerCode: buildLearnerCode(student, cohort),
    caregiverRelationship: student.caregiverRelationship || 'Guardian',
    enrollmentStatus: latestProgress ? 'Active in lessons' : 'Needs first lesson',
    attendanceBand: formatAttendanceBand(student.attendanceRate || 0),
    supportPlan:
      student.supportPlan ||
      (latestProgress?.progressionStatus === 'watch'
        ? 'Use short prompts and one hint before replaying the answer.'
        : 'Use short prompts and praise after each spoken answer.'),
    lastLessonSummary: latestProgress
      ? `${latestProgress.lessonsCompleted} lessons completed in ${repository.findSubjectById(latestProgress.subjectId)?.name ?? 'recent work'}.`
      : 'Profile created. Awaiting first lesson capture.',
    lastAttendance: latestAttendance ? `${latestAttendance.status} on ${latestAttendance.date}` : 'No attendance recorded yet',
    recommendedModuleId: recommendedModule?.id ?? null,
    rewards: rewardSnapshot,
  };
}

function presentStrand(strand) {
  const subject = repository.findSubjectById(strand.subjectId);

  return {
    ...strand,
    subjectName: subject?.name ?? null,
  };
}

function presentCurriculumModule(module) {
  const strand = repository.findStrandById(module.strandId);
  const subject = strand ? repository.findSubjectById(strand.subjectId) : null;

  return {
    ...module,
    strandName: strand?.name ?? null,
    subjectId: subject?.id ?? null,
    subjectName: subject?.name ?? null,
  };
}

function presentLearnerModule(module) {
  const curriculum = presentCurriculumModule(module);
  const assignedLessonIds = new Set(
    repository
      .listAssignments()
      .filter((assignment) => ['active', 'scheduled'].includes(assignment.status))
      .map((assignment) => assignment.lessonId)
      .filter(Boolean),
  );
  const visibleLessons = repository
    .listLessons()
    .filter(
      (lesson) =>
        lesson.moduleId === module.id &&
        (['approved', 'published'].includes(lesson.status) || assignedLessonIds.has(lesson.id)),
    );

  return {
    id: curriculum.id,
    curriculumModuleId: curriculum.id,
    title: curriculum.title,
    description: `${curriculum.title} • ${curriculum.subjectName ?? 'Learning'} • ${curriculum.level} learners.`,
    voicePrompt: `Open ${curriculum.title} and guide the learner one spoken step at a time.`,
    readinessGoal: `Ready for ${curriculum.title.toLowerCase()} practice`,
    badge: `${visibleLessons.length} lesson${visibleLessons.length === 1 ? '' : 's'}`,
    subjectId: curriculum.subjectId,
    subjectName: curriculum.subjectName,
    level: curriculum.level,
    status: curriculum.status,
    lessonCount: visibleLessons.length,
    moduleAssessment: buildModuleAssessment(module),
  };
}

function presentLearnerLesson(entry) {
  const subject = repository.findSubjectById(entry.subjectId);
  const module = entry.moduleId ? repository.findModuleById(entry.moduleId) : null;
  const curriculum = module ? presentCurriculumModule(module) : null;
  const activeAssignments = repository
    .listAssignments()
    .filter((assignment) => assignment.lessonId === entry.id && ['active', 'scheduled'].includes(assignment.status));
  const contract = buildLessonContract(entry);
  const learnerModuleId = module?.id ?? entry.moduleId ?? entry.subjectId;

  return {
    id: entry.id,
    moduleId: learnerModuleId,
    curriculumModuleId: module?.id ?? null,
    title: entry.title,
    subject: subject?.name ?? entry.subjectId,
    durationMinutes: entry.durationMinutes,
    status: entry.status,
    mascotName: 'Mallam',
    readinessFocus: module ? `${module.title} • ${module.level}` : 'Guided voice practice',
    scenario: `Guided ${subject?.name ?? 'learning'} session for ${module?.title ?? 'current module'}.`,
    activityCount: contract.activityCount,
    activityTypes: contract.activitySteps.map((step) => step.type),
    activitySteps: contract.activitySteps,
    activities: contract.activities,
    localization: contract.localization,
    lessonAssessment: contract.lessonAssessment,
    moduleAssessment: buildModuleAssessment(module),
    lessonPack: {
      lessonId: entry.id,
      lessonTitle: entry.title,
      subjectId: entry.subjectId,
      subjectName: subject?.name ?? entry.subjectId,
      curriculumModuleId: module?.id ?? null,
      moduleKey: learnerModuleId,
      moduleTitle: module?.title ?? null,
      strandName: curriculum?.strandName ?? null,
      deliveryMode: entry.mode,
      durationMinutes: entry.durationMinutes,
      assignmentCount: activeAssignments.length,
      assignmentIds: activeAssignments.map((assignment) => assignment.id),
      voicePersona: contract.voicePersona,
      learningObjectives: contract.learningObjectives,
      targetAgeRange: contract.targetAgeRange,
      localization: contract.localization,
      lessonAssessment: contract.lessonAssessment,
      moduleAssessment: buildModuleAssessment(module),
      activityCount: contract.activityCount,
      activityTypes: contract.activitySteps.map((step) => step.type),
      activitySteps: contract.activitySteps,
      activities: contract.activities,
    },
  };
}

function presentAssessment(assessment) {
  const subject = repository.findSubjectById(assessment.subjectId);
  const module = repository.findModuleById(assessment.moduleId);

  return {
    ...assessment,
    subjectName: subject?.name ?? null,
    moduleTitle: module?.title ?? null,
    items: Array.isArray(assessment.items) ? assessment.items : [],
  };
}

function presentAssignment(assignment) {
  const cohort = repository.findCohortById(assignment.cohortId);
  const lesson = repository.findLessonById(assignment.lessonId);
  const teacher = repository.findTeacherById(assignment.assignedBy);
  const pod = assignment.podId ? repository.findPodById(assignment.podId) : null;
  const assessment = assignment.assessmentId ? repository.findAssessmentById(assignment.assessmentId) : null;
  const subject = lesson ? repository.findSubjectById(lesson.subjectId) : null;
  const module = lesson?.moduleId ? repository.findModuleById(lesson.moduleId) : null;
  const curriculum = module ? presentCurriculumModule(module) : null;
  const contract = lesson ? buildLessonContract(lesson) : null;

  return {
    ...assignment,
    cohortName: cohort?.name ?? null,
    lessonTitle: lesson?.title ?? null,
    teacherName: teacher?.displayName ?? teacher?.name ?? null,
    podLabel: pod?.label ?? null,
    assessmentTitle: assessment?.title ?? null,
    learnerPayload: {
      assignmentId: assignment.id,
      status: assignment.status,
      dueDate: assignment.dueDate,
      assignedAt: assignment.assignedAt ?? null,
      target: {
        cohortId: cohort?.id ?? null,
        cohortName: cohort?.name ?? null,
        podId: pod?.id ?? cohort?.podId ?? null,
        podLabel: pod?.label ?? null,
      },
      facilitator: {
        mallamId: teacher?.id ?? null,
        mallamName: teacher?.displayName ?? teacher?.name ?? null,
      },
      lessonPack: {
        lessonId: lesson?.id ?? null,
        lessonTitle: lesson?.title ?? null,
        durationMinutes: lesson?.durationMinutes ?? null,
        deliveryMode: lesson?.mode ?? null,
        subjectId: subject?.id ?? lesson?.subjectId ?? null,
        subjectName: subject?.name ?? null,
        curriculumModuleId: module?.id ?? null,
        moduleKey: module?.id ?? lesson?.moduleId ?? subject?.id ?? lesson?.subjectId ?? null,
        moduleTitle: module?.title ?? null,
        level: module?.level ?? null,
        strandName: curriculum?.strandName ?? null,
        voicePersona: contract?.voicePersona ?? null,
        learningObjectives: contract?.learningObjectives ?? [],
        targetAgeRange: contract?.targetAgeRange ?? null,
        localization: contract?.localization ?? null,
        lessonAssessment: contract?.lessonAssessment ?? null,
        moduleAssessment: buildModuleAssessment(module),
        activityCount: contract?.activityCount ?? 0,
        activityTypes: contract?.activitySteps.map((step) => step.type) ?? [],
        activitySteps: contract?.activitySteps ?? [],
        activities: contract?.activities ?? [],
      },
      assessment: assessment
        ? {
            assessmentId: assessment.id,
            title: assessment.title,
            kind: assessment.kind,
            trigger: assessment.trigger,
            triggerLabel: assessment.triggerLabel,
            progressionGate: assessment.progressionGate,
            passingScore: assessment.passingScore,
          }
        : null,
    },
  };
}

function presentLearnerAssignmentPack(assignment) {
  const base = presentAssignment(assignment);
  const targetPodId = base.learnerPayload.target.podId;
  const cohortId = base.learnerPayload.target.cohortId;
  const eligibleLearners = repository
    .listStudents()
    .filter((student) => {
      if (cohortId && student.cohortId === cohortId) return true;
      if (targetPodId && student.podId === targetPodId) return true;
      return false;
    })
    .map((student) => presentLearnerProfile(student));

  return {
    assignmentId: base.id,
    status: base.status,
    dueDate: base.dueDate,
    cohortId,
    cohortName: base.cohortName,
    podId: base.learnerPayload.target.podId,
    podLabel: base.podLabel,
    mallamId: base.assignedBy,
    mallamName: base.teacherName,
    lessonPack: base.learnerPayload.lessonPack,
    assessment: base.learnerPayload.assessment,
    eligibleLearners,
  };
}

function presentProgress(entry) {
  const student = repository.findStudentById(entry.studentId);
  const subject = repository.findSubjectById(entry.subjectId);
  const module = entry.moduleId ? repository.findModuleById(entry.moduleId) : null;
  const recommendedModule = entry.recommendedNextModuleId
    ? repository.findModuleById(entry.recommendedNextModuleId)
    : null;

  return {
    ...entry,
    studentName: student?.name ?? null,
    subjectName: subject?.name ?? null,
    moduleTitle: module?.title ?? null,
    recommendedNextModuleTitle: recommendedModule?.title ?? null,
  };
}

function presentAttendance(entry) {
  const student = repository.findStudentById(entry.studentId);

  return {
    ...entry,
    studentName: student?.name ?? null,
  };
}

function presentObservation(entry) {
  const student = repository.findStudentById(entry.studentId);
  const teacher = repository.findTeacherById(entry.teacherId);

  return {
    ...entry,
    studentName: student?.name ?? null,
    teacherName: teacher?.displayName ?? teacher?.name ?? null,
  };
}



function presentDeviceRegistration(entry) {
  const pod = entry.podId ? repository.findPodById(entry.podId) : null;
  const center = entry.centerId ? repository.findCenterById(entry.centerId) : pod?.centerId ? repository.findCenterById(pod.centerId) : null;
  const state = entry.stateId ? repository.findStateById(entry.stateId) : pod?.stateId ? repository.findStateById(pod.stateId) : center?.stateId ? repository.findStateById(center.stateId) : null;
  const localGovernment = entry.localGovernmentId
    ? repository.findLocalGovernmentById(entry.localGovernmentId)
    : pod?.localGovernmentId
      ? repository.findLocalGovernmentById(pod.localGovernmentId)
      : center?.localGovernmentId
        ? repository.findLocalGovernmentById(center.localGovernmentId)
        : null;
  const resolvedAssignedMallamId = entry.assignedMallamId || (pod?.mallamIds || [])[0] || null;
  const mallam = resolvedAssignedMallamId ? repository.findTeacherById(resolvedAssignedMallamId) : null;

  return {
    ...entry,
    centerId: entry.centerId || pod?.centerId || null,
    centerName: center?.name ?? null,
    podLabel: pod?.label ?? null,
    stateId: entry.stateId || pod?.stateId || center?.stateId || null,
    stateName: state?.name ?? null,
    localGovernmentId: entry.localGovernmentId || pod?.localGovernmentId || center?.localGovernmentId || null,
    localGovernmentName: localGovernment?.name ?? null,
    assignedMallamId: resolvedAssignedMallamId,
    assignedMallamName: mallam?.displayName ?? mallam?.name ?? null,
  };
}

function presentLessonAsset(entry) {
  const subject = entry.subjectId ? repository.findSubjectById(entry.subjectId) : null;
  const module = entry.moduleId ? repository.findModuleById(entry.moduleId) : null;
  const lesson = entry.lessonId ? repository.findLessonById(entry.lessonId) : null;

  return {
    ...entry,
    subjectName: subject?.name ?? null,
    moduleTitle: module?.title ?? null,
    lessonTitle: lesson?.title ?? null,
  };
}

function presentLesson(entry) {
  const subject = repository.findSubjectById(entry.subjectId);
  const module = entry.moduleId ? repository.findModuleById(entry.moduleId) : null;
  const contract = buildLessonContract(entry);

  return {
    ...entry,
    subjectName: subject?.name ?? null,
    moduleTitle: module?.title ?? null,
    targetAgeRange: contract.targetAgeRange,
    voicePersona: contract.voicePersona,
    learningObjectives: contract.learningObjectives,
    localization: contract.localization,
    lessonAssessment: contract.lessonAssessment,
    activityCount: contract.activityCount,
    activityTypes: contract.activitySteps.map((step) => step.type),
    activitySteps: contract.activitySteps,
    activities: contract.activities,
  };
}

function presentLessonSession(entry) {
  const student = entry.studentId ? repository.findStudentById(entry.studentId) : null;
  const lesson = entry.lessonId ? repository.findLessonById(entry.lessonId) : null;
  const module = entry.moduleId ? repository.findModuleById(entry.moduleId) : null;

  return {
    ...entry,
    studentName: student?.name ?? null,
    lessonTitle: lesson?.title ?? null,
    moduleTitle: module?.title ?? null,
    progressRatio: entry.stepsTotal > 0 ? Math.max(0, Math.min(1, Number(entry.currentStepIndex || 0) / Number(entry.stepsTotal))) : 0,
  };
}

module.exports = {
  presentPod,
  presentMallam,
  presentStudent,
  presentLearnerProfile,
  presentStrand,
  presentCurriculumModule,
  presentLearnerModule,
  presentLearnerLesson,
  presentAssessment,
  presentAssignment,
  presentLearnerAssignmentPack,
  presentProgress,
  presentAttendance,
  presentObservation,
  presentDeviceRegistration,
  presentLessonAsset,
  presentLesson,
  presentLessonSession,
};
