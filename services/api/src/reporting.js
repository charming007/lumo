const repository = require('./repository');
const presenters = require('./presenters');

function buildOverviewReport() {
  const attendance = repository.listAttendance();
  const progress = repository.listProgress();
  const assignments = repository.listAssignments();
  const pods = repository.listPods();
  const presentToday = attendance.filter((item) => item.status === 'present').length;
  const averageMastery = progress.length
    ? progress.reduce((sum, item) => sum + item.mastery, 0) / progress.length
    : 0;
  const averageAttendance = repository.listStudents().length
    ? repository.listStudents().reduce((sum, item) => sum + item.attendanceRate, 0) / repository.listStudents().length
    : 0;

  return {
    totalStudents: repository.listStudents().length,
    totalTeachers: repository.listTeachers().length,
    totalCenters: repository.listCenters().length,
    totalAssignments: assignments.length,
    presentToday,
    averageAttendance,
    averageMastery,
    readinessCount: progress.filter((item) => item.progressionStatus === 'ready').length,
    watchCount: progress.filter((item) => item.progressionStatus === 'watch').length,
    onTrackCount: progress.filter((item) => item.progressionStatus === 'on-track').length,
    assignmentsDueThisWeek: assignments.filter((item) => item.status === 'active').length,
    activePods: pods.filter((item) => ['active', 'pilot'].includes(item.status)).length,
    podsNeedingAttention: pods.filter((item) => item.connectivity !== 'sync-daily').length,
  };
}

function buildDashboardInsights() {
  const workboard = buildWorkboard();
  const readyCount = workboard.filter((item) => item.progressionStatus === 'ready').length;
  const watchCount = workboard.filter((item) => item.progressionStatus === 'watch').length;
  const lowAttendance = workboard.filter((item) => item.attendanceRate < 0.85).length;

  return [
    {
      priority: 'Scale what is working',
      headline: `${readyCount} learners are ready for the next module gate`,
      detail: 'Schedule mallam-led progression checks and publish the next content block before momentum drops.',
      metric: `${readyCount} ready`,
    },
    {
      priority: 'Intervene this week',
      headline: `${watchCount} learners need coaching support`,
      detail: 'These learners are active but need tighter follow-up on numeracy and oral practice to stay on track.',
      metric: `${watchCount} watchlist`,
    },
    {
      priority: 'Protect attendance',
      headline: `${lowAttendance} learners are below the attendance comfort zone`,
      detail: 'Use guardian follow-up and pod-level scheduling review to reduce preventable drop-off.',
      metric: `${lowAttendance} below 85%`,
    },
  ];
}

function buildWorkboard() {
  return repository.listProgress().map((entry) => {
    const student = presenters.presentStudent(repository.findStudentById(entry.studentId));
    const subject = repository.findSubjectById(entry.subjectId);
    const recommended = entry.recommendedNextModuleId
      ? repository.findModuleById(entry.recommendedNextModuleId)
      : null;

    return {
      id: entry.id,
      studentName: student?.name ?? 'Unknown learner',
      cohortName: student?.cohortName ?? null,
      mallamName: student?.mallamName ?? null,
      podLabel: student?.podLabel ?? null,
      attendanceRate: student?.attendanceRate ?? 0,
      mastery: entry.mastery,
      progressionStatus: entry.progressionStatus,
      focus: subject?.name ?? 'Learning support',
      recommendedNextModuleTitle: recommended?.title ?? null,
    };
  });
}

function buildStudentProfile(studentId) {
  const student = repository.findStudentById(studentId);

  if (!student) {
    return null;
  }

  const presentedStudent = presenters.presentStudent(student);
  const progress = repository
    .listProgress()
    .filter((item) => item.studentId === studentId)
    .map(presenters.presentProgress);
  const attendance = repository
    .listAttendance()
    .filter((item) => item.studentId === studentId)
    .map(presenters.presentAttendance)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const observations = repository
    .listObservations()
    .filter((item) => item.studentId === studentId)
    .map(presenters.presentObservation)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const activeAssignments = repository
    .listAssignments()
    .filter((assignment) => assignment.status === 'active' && assignment.cohortId === student.cohortId)
    .map(presenters.presentAssignment)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

  const latestProgress = [...progress].sort((a, b) => (a.lastActiveAt < b.lastActiveAt ? 1 : -1))[0] || null;
  const latestObservation = observations[0] || null;
  const presentDays = attendance.filter((item) => item.status === 'present').length;
  const attendanceRate = attendance.length ? presentDays / attendance.length : presentedStudent.attendanceRate ?? 0;

  const recommendedActions = [];

  if (presentedStudent.attendanceRate < 0.85) {
    recommendedActions.push('Call guardian and confirm the next two attendance windows before the learner slips further.');
  }

  if (latestProgress?.progressionStatus === 'watch') {
    recommendedActions.push(`Schedule a mallam coaching block for ${latestProgress.subjectName ?? 'core learning'} before the next assessment gate.`);
  }

  if (latestProgress?.progressionStatus === 'ready') {
    recommendedActions.push(`Prepare progression review for ${latestProgress.recommendedNextModuleTitle ?? 'the next module'} and unlock the next content pack.`);
  }

  if (latestObservation?.supportLevel === 'guided') {
    recommendedActions.push('Keep guided practice visible in the next pod session and capture another observation after reteaching.');
  }

  if (!recommendedActions.length) {
    recommendedActions.push('Maintain current pace and capture one fresh observation this week to confirm steady progress.');
  }

  return {
    ...presentedStudent,
    progress,
    attendance,
    observations,
    assignments: activeAssignments,
    summary: {
      attendanceRate,
      presentDays,
      attendanceSessions: attendance.length,
      activeAssignments: activeAssignments.length,
      latestProgressionStatus: latestProgress?.progressionStatus ?? 'unknown',
      latestMastery: latestProgress?.mastery ?? null,
      focusSubject: latestProgress?.subjectName ?? null,
      recommendedNextModuleTitle: latestProgress?.recommendedNextModuleTitle ?? null,
      lastActiveAt: latestProgress?.lastActiveAt ?? null,
      latestObservationAt: latestObservation?.createdAt ?? null,
    },
    recommendedActions,
  };
}

function buildMallamProfile(mallamId) {
  const teacher = repository.findTeacherById(mallamId);

  if (!teacher) {
    return null;
  }

  const mallam = presenters.presentMallam(teacher);
  const roster = repository
    .listStudents()
    .filter((student) => student.mallamId === mallamId)
    .map(presenters.presentStudent);
  const assignments = repository
    .listAssignments()
    .filter((assignment) => assignment.assignedBy === mallamId)
    .map(presenters.presentAssignment)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));
  const rosterProgress = repository
    .listProgress()
    .filter((entry) => roster.some((student) => student.id === entry.studentId));

  const averageAttendance = roster.length
    ? roster.reduce((sum, item) => sum + item.attendanceRate, 0) / roster.length
    : 0;

  const summary = {
    rosterCount: roster.length,
    activeAssignments: assignments.filter((assignment) => assignment.status === 'active').length,
    averageAttendance,
    readinessCount: rosterProgress.filter((entry) => entry.progressionStatus === 'ready').length,
    watchCount: rosterProgress.filter((entry) => entry.progressionStatus === 'watch').length,
    podCoverage: mallam.podLabels.length,
  };

  const recommendedActions = [];

  if (summary.watchCount > 0) {
    recommendedActions.push(`Coach ${summary.watchCount} learner(s) on the watchlist before the next progression review.`);
  }

  if (summary.averageAttendance < 0.85) {
    recommendedActions.push('Review the roster attendance pattern and coordinate guardian follow-up on preventable absence.');
  }

  if (summary.activeAssignments === 0) {
    recommendedActions.push('No active assignments are owned here right now — publish or reassign a live delivery block.');
  }

  if (summary.rosterCount < teacher.learnerCount) {
    recommendedActions.push('Displayed roster is lighter than the declared learner load. Reconcile ownership and pod mapping.');
  }

  if (!recommendedActions.length) {
    recommendedActions.push('Deployment looks stable. Keep one fresh observation and one progression check visible this week.');
  }

  return {
    ...mallam,
    roster,
    assignments,
    summary,
    recommendedActions,
  };
}

module.exports = {
  buildOverviewReport,
  buildDashboardInsights,
  buildWorkboard,
  buildStudentProfile,
  buildMallamProfile,
};
