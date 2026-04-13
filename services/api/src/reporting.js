const repository = require('./repository');
const presenters = require('./presenters');
const rewards = require('./rewards');

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inRange(value, { since = null, until = null } = {}) {
  const current = parseDate(value);
  if (!current) return true;
  if (since && current < since) return false;
  if (until && current > until) return false;
  return true;
}

function buildScopedStudentSet({ cohortId = null, podId = null, mallamId = null } = {}) {
  return repository.listStudents().filter((student) => (!cohortId || student.cohortId === cohortId) && (!podId || student.podId === podId) && (!mallamId || student.mallamId === mallamId));
}

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
    const rewardSnapshot = rewards.buildLearnerRewards(entry.studentId);

    return {
      id: entry.id,
      studentId: entry.studentId,
      cohortId: student?.cohortId ?? null,
      podId: student?.podId ?? null,
      mallamId: student?.mallamId ?? null,
      studentName: student?.name ?? 'Unknown learner',
      cohortName: student?.cohortName ?? null,
      mallamName: student?.mallamName ?? null,
      podLabel: student?.podLabel ?? null,
      attendanceRate: student?.attendanceRate ?? 0,
      mastery: entry.mastery,
      progressionStatus: entry.progressionStatus,
      focus: subject?.name ?? 'Learning support',
      recommendedNextModuleTitle: recommended?.title ?? null,
      totalXp: rewardSnapshot?.totalXp ?? 0,
      level: rewardSnapshot?.level ?? 1,
      levelLabel: rewardSnapshot?.levelLabel ?? 'Starter',
      badgesUnlocked: rewardSnapshot?.badgesUnlocked ?? 0,
    };
  });
}

function buildRecentLearnerSessions(studentId, limit = 10) {
  return repository
    .listLessonSessions()
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
    .slice(0, limit)
    .map(presenters.presentLessonSession);
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
  const sessions = buildRecentLearnerSessions(studentId);

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
    recentSessions: sessions,
    summary: {
      attendanceRate,
      presentDays,
      attendanceSessions: attendance.length,
      activeAssignments: activeAssignments.length,
      recentSessions: sessions.length,
      latestProgressionStatus: latestProgress?.progressionStatus ?? 'unknown',
      latestMastery: latestProgress?.mastery ?? null,
      focusSubject: latestProgress?.subjectName ?? null,
      recommendedNextModuleTitle: latestProgress?.recommendedNextModuleTitle ?? null,
      lastActiveAt: latestProgress?.lastActiveAt ?? null,
      latestObservationAt: latestObservation?.createdAt ?? null,
    },
    recommendedActions,
    rewards: rewards.buildLearnerRewards(studentId),
  };
}

function buildMallamSummary(mallamId) {
  const profile = buildMallamProfile(mallamId);

  if (!profile) {
    return null;
  }

  const rewardSummary = rewards.buildRewardOpsSummary({ mallamId });
  const runtimeSummary = buildRuntimeAnalytics({ mallamId, limit: 5 }).summary;
  const progressionRollup = buildProgressionRollup({ mallamId });

  return {
    mallam: {
      id: profile.id,
      name: profile.displayName || profile.name,
      centerName: profile.centerName,
      podLabels: profile.podLabels,
    },
    summary: profile.summary,
    rewards: rewardSummary,
    runtime: runtimeSummary,
    progression: progressionRollup.progression,
    topLearners: rewards.buildScopedLeaderboard({ mallamId, limit: 5 }),
    recommendedActions: profile.recommendedActions,
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

function buildRuntimeAnalytics({ learnerId = null, lessonId = null, cohortId = null, podId = null, mallamId = null, since = null, until = null, limit = 50 } = {}) {
  const scopedStudents = buildScopedStudentSet({ cohortId, podId, mallamId });
  const scopedStudentIds = new Set(scopedStudents.map((student) => student.id));
  const sinceDate = parseDate(since);
  const untilDate = parseDate(until);
  const sessions = repository
    .listLessonSessions()
    .filter((entry) => (!learnerId || entry.studentId === learnerId) && (!lessonId || entry.lessonId === lessonId) && (!scopedStudentIds.size || scopedStudentIds.has(entry.studentId)) && inRange(entry.lastActivityAt, { since: sinceDate, until: untilDate }))
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
  const sessionEvents = repository
    .listSessionEventLog()
    .filter((entry) => (!learnerId || entry.studentId === learnerId) && (!lessonId || entry.lessonId === lessonId) && (!scopedStudentIds.size || scopedStudentIds.has(entry.studentId)) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const completed = sessions.filter((entry) => entry.status === 'completed').length;
  const inProgress = sessions.filter((entry) => entry.status === 'in_progress').length;
  const abandoned = sessions.filter((entry) => entry.status === 'abandoned').length;
  const totalResponses = sessions.reduce((sum, entry) => sum + Number(entry.responsesCaptured || 0), 0);
  const totalSupport = sessions.reduce((sum, entry) => sum + Number(entry.supportActionsUsed || 0), 0);
  const totalAudioCaptures = sessions.reduce((sum, entry) => sum + Number(entry.audioCaptures || 0), 0);
  const avgProgressRatio = sessions.length
    ? sessions.reduce((sum, entry) => {
      const ratio = entry.stepsTotal > 0 ? Number(entry.currentStepIndex || 0) / Number(entry.stepsTotal || 1) : 0;
      return sum + Math.max(0, Math.min(1, ratio));
    }, 0) / sessions.length
    : 0;
  const eventTypeCounts = sessionEvents.reduce((acc, entry) => {
    const key = entry.type || 'unknown';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const automationSummary = sessions.reduce((acc, entry) => {
    const key = entry.automationStatus || 'unknown';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const learnerBreakdown = Array.from(new Set(sessions.map((entry) => entry.studentId).filter(Boolean))).map((studentId) => {
    const studentSessions = sessions.filter((entry) => entry.studentId === studentId);
    const student = repository.findStudentById(studentId);
    return {
      learnerId: studentId,
      learnerName: student?.name || 'Unknown learner',
      sessions: studentSessions.length,
      completedSessions: studentSessions.filter((entry) => entry.status === 'completed').length,
      totalResponses: studentSessions.reduce((sum, entry) => sum + Number(entry.responsesCaptured || 0), 0),
      totalSupportActions: studentSessions.reduce((sum, entry) => sum + Number(entry.supportActionsUsed || 0), 0),
      lastActivityAt: studentSessions.slice().sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))[0]?.lastActivityAt ?? null,
    };
  }).sort((a, b) => b.sessions - a.sessions || b.completedSessions - a.completedSessions);

  return {
    summary: {
      learnerId,
      lessonId,
      totalSessions: sessions.length,
      completedSessions: completed,
      inProgressSessions: inProgress,
      abandonedSessions: abandoned,
      completionRate: sessions.length ? completed / sessions.length : 0,
      averageProgressRatio: avgProgressRatio,
      totalResponses,
      totalSupportActions: totalSupport,
      totalAudioCaptures,
      distinctLearners: new Set(sessions.map((entry) => entry.studentId).filter(Boolean)).size,
      generatedAt: new Date().toISOString(),
      cohortId,
      podId,
      mallamId,
      since,
      until,
    },
    automationSummary,
    eventTypeCounts,
    learnerBreakdown: learnerBreakdown.slice(0, limit),
    recentSessions: sessions.slice(0, limit).map(presenters.presentLessonSession),
    recentEvents: sessionEvents.slice(0, limit),
  };
}

function buildNgoSummary({ cohortId = null, podId = null, mallamId = null, since = null, until = null } = {}) {
  const scopedStudents = buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(scopedStudents.map((student) => student.id));
  const sinceDate = parseDate(since);
  const untilDate = parseDate(until);
  const progressEntries = repository
    .listProgress()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.lastActiveAt, { since: sinceDate, until: untilDate }));
  const sessions = repository
    .listLessonSessions()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.lastActivityAt, { since: sinceDate, until: untilDate }));
  const assignments = repository
    .listAssignments()
    .filter((entry) => (!cohortId || entry.cohortId === cohortId) && (!podId || entry.podId === podId));
  const teachers = repository
    .listTeachers()
    .filter((teacher) => !mallamId || teacher.id === mallamId);
  const attendanceAverage = scopedStudents.length
    ? scopedStudents.reduce((sum, student) => sum + Number(student.attendanceRate || 0), 0) / scopedStudents.length
    : 0;
  const subjectBreakdown = repository.listSubjects().map((subject) => {
    const subjectProgress = progressEntries.filter((entry) => entry.subjectId === subject.id);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      learnerCount: new Set(subjectProgress.map((entry) => entry.studentId)).size,
      averageMastery: subjectProgress.length ? subjectProgress.reduce((sum, entry) => sum + Number(entry.mastery || 0), 0) / subjectProgress.length : 0,
      lessonsCompleted: subjectProgress.reduce((sum, entry) => sum + Number(entry.lessonsCompleted || 0), 0),
    };
  });

  return {
    scope: { cohortId, podId, mallamId, since, until, learnerCount: scopedStudents.length },
    totals: {
      learners: scopedStudents.length,
      centers: new Set(scopedStudents.map((student) => repository.findCohortById(student.cohortId)?.centerId).filter(Boolean)).size,
      pods: new Set(scopedStudents.map((student) => student.podId).filter(Boolean)).size,
      mallams: new Set(scopedStudents.map((student) => student.mallamId).filter(Boolean)).size,
      activeAssignments: assignments.filter((item) => item.status === 'active').length,
      lessonsCompleted: progressEntries.reduce((sum, entry) => sum + Number(entry.lessonsCompleted || 0), 0),
      completedSessions: sessions.filter((entry) => entry.status === 'completed').length,
      attendanceAverage,
      averageMastery: progressEntries.length ? progressEntries.reduce((sum, entry) => sum + Number(entry.mastery || 0), 0) / progressEntries.length : 0,
      totalXpAwarded: repository.listRewardTransactions().filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate })).reduce((sum, entry) => sum + Number(entry.xpDelta || 0), 0),
    },
    progression: {
      ready: progressEntries.filter((entry) => entry.progressionStatus === 'ready').length,
      watch: progressEntries.filter((entry) => entry.progressionStatus === 'watch').length,
      onTrack: progressEntries.filter((entry) => entry.progressionStatus === 'on-track').length,
    },
    rewardOps: {
      ...rewards.buildRewardOpsSummary({ cohortId, podId, mallamId }),
      recentQueue: rewards.buildRewardRedemptionQueue({ cohortId, podId, mallamId, limit: 10 }).items,
    },
    subjectBreakdown,
    mallamSnapshots: teachers.map((teacher) => buildMallamSummary(teacher.id)).filter(Boolean),
    topLearners: rewards.buildScopedLeaderboard({ cohortId, podId, mallamId, limit: 10 }),
  };
}

function buildEngagementReport({ cohortId = null, podId = null, mallamId = null, learnerId = null, since = null, until = null } = {}) {
  const students = learnerId
    ? buildScopedStudentSet({ cohortId, podId, mallamId }).filter((student) => student.id === learnerId)
    : buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const sinceDate = parseDate(since);
  const untilDate = parseDate(until);
  const sessions = repository
    .listLessonSessions()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.lastActivityAt, { since: sinceDate, until: untilDate }));
  const events = repository
    .listSessionEventLog()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));
  const rewardsTx = repository
    .listRewardTransactions()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));
  const rewardRequests = repository
    .listRewardRedemptionRequests()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));
  const progressEntries = repository
    .listProgress()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.lastActiveAt, { since: sinceDate, until: untilDate }));
  const observations = repository
    .listObservations()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));

  const byDayMap = new Map();
  const eventTypeCounts = {};
  const reviewBreakdown = { onTrack: 0, needsSupport: 0, unknown: 0 };

  sessions.forEach((session) => {
    const day = String(session.lastActivityAt || '').slice(0, 10) || 'unknown';
    const row = byDayMap.get(day) || { date: day, sessions: 0, completedSessions: 0, xpAwarded: 0, supportActionsUsed: 0, responsesCaptured: 0, rewardRequests: 0, rewardFulfilled: 0 };
    row.sessions += 1;
    row.completedSessions += session.status === 'completed' ? 1 : 0;
    row.supportActionsUsed += Number(session.supportActionsUsed || 0);
    row.responsesCaptured += Number(session.responsesCaptured || 0);
    byDayMap.set(day, row);

    if (session.latestReview === 'onTrack') reviewBreakdown.onTrack += 1;
    else if (session.latestReview === 'needsSupport') reviewBreakdown.needsSupport += 1;
    else reviewBreakdown.unknown += 1;
  });

  rewardsTx.forEach((transaction) => {
    const day = String(transaction.createdAt || '').slice(0, 10) || 'unknown';
    const row = byDayMap.get(day) || { date: day, sessions: 0, completedSessions: 0, xpAwarded: 0, supportActionsUsed: 0, responsesCaptured: 0, rewardRequests: 0, rewardFulfilled: 0 };
    row.xpAwarded += Number(transaction.xpDelta || 0);
    byDayMap.set(day, row);
  });

  rewardRequests.forEach((request) => {
    const day = String(request.updatedAt || request.createdAt || '').slice(0, 10) || 'unknown';
    const row = byDayMap.get(day) || { date: day, sessions: 0, completedSessions: 0, xpAwarded: 0, supportActionsUsed: 0, responsesCaptured: 0, rewardRequests: 0, rewardFulfilled: 0 };
    row.rewardRequests += 1;
    row.rewardFulfilled += request.status === 'fulfilled' ? 1 : 0;
    byDayMap.set(day, row);
  });

  events.forEach((event) => {
    const type = event.type || 'unknown';
    eventTypeCounts[type] = Number(eventTypeCounts[type] || 0) + 1;
  });

  const learnerBreakdown = students.map((student) => {
    const learnerSessions = sessions.filter((entry) => entry.studentId === student.id);
    const learnerRewards = rewards.buildLearnerRewards(student.id);
    const learnerProgress = progressEntries.filter((entry) => entry.studentId === student.id);
    const latestProgress = learnerProgress.slice().sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))[0] || null;

    return {
      learnerId: student.id,
      learnerName: student.name,
      cohortId: student.cohortId,
      podId: student.podId,
      mallamId: student.mallamId,
      sessions: learnerSessions.length,
      completedSessions: learnerSessions.filter((entry) => entry.status === 'completed').length,
      averageProgressRatio: learnerSessions.length
        ? learnerSessions.reduce((sum, entry) => sum + (entry.stepsTotal > 0 ? Number(entry.currentStepIndex || 0) / Number(entry.stepsTotal || 1) : 0), 0) / learnerSessions.length
        : 0,
      totalXp: learnerRewards?.totalXp ?? 0,
      badgesUnlocked: learnerRewards?.badgesUnlocked ?? 0,
      progressionStatus: latestProgress?.progressionStatus ?? 'unknown',
      mastery: latestProgress?.mastery ?? null,
      observationsCount: observations.filter((entry) => entry.studentId === student.id).length,
    };
  }).sort((a, b) => b.sessions - a.sessions || b.totalXp - a.totalXp || a.learnerName.localeCompare(b.learnerName));

  const subjectBreakdown = repository.listSubjects().map((subject) => {
    const subjectProgress = progressEntries.filter((entry) => entry.subjectId === subject.id);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      learners: new Set(subjectProgress.map((entry) => entry.studentId)).size,
      averageMastery: subjectProgress.length ? subjectProgress.reduce((sum, entry) => sum + Number(entry.mastery || 0), 0) / subjectProgress.length : 0,
      lessonsCompleted: subjectProgress.reduce((sum, entry) => sum + Number(entry.lessonsCompleted || 0), 0),
    };
  });
  const podBreakdown = Array.from(new Set(students.map((student) => student.podId).filter(Boolean))).map((currentPodId) => {
    const podStudents = students.filter((student) => student.podId === currentPodId);
    const podStudentIds = new Set(podStudents.map((student) => student.id));
    const podSessions = sessions.filter((entry) => podStudentIds.has(entry.studentId));
    return {
      podId: currentPodId,
      podLabel: repository.findPodById(currentPodId)?.label || currentPodId,
      learners: podStudents.length,
      sessions: podSessions.length,
      completedSessions: podSessions.filter((entry) => entry.status === 'completed').length,
      totalXpAwarded: rewardsTx.filter((entry) => podStudentIds.has(entry.studentId)).reduce((sum, entry) => sum + Number(entry.xpDelta || 0), 0),
    };
  }).sort((a, b) => b.sessions - a.sessions || b.totalXpAwarded - a.totalXpAwarded);

  return {
    scope: { cohortId, podId, mallamId, learnerId, since, until, learnerCount: students.length },
    totals: {
      learners: students.length,
      sessions: sessions.length,
      completedSessions: sessions.filter((entry) => entry.status === 'completed').length,
      abandonedSessions: sessions.filter((entry) => entry.status === 'abandoned').length,
      totalResponses: sessions.reduce((sum, entry) => sum + Number(entry.responsesCaptured || 0), 0),
      totalSupportActions: sessions.reduce((sum, entry) => sum + Number(entry.supportActionsUsed || 0), 0),
      totalXpAwarded: rewardsTx.reduce((sum, entry) => sum + Number(entry.xpDelta || 0), 0),
      observationsCaptured: observations.length,
      activeProgressRecords: progressEntries.length,
      rewardRequests: rewardRequests.length,
      rewardFulfilled: rewardRequests.filter((entry) => entry.status === 'fulfilled').length,
      rewardPending: rewardRequests.filter((entry) => entry.status === 'pending').length,
      rewardApproved: rewardRequests.filter((entry) => entry.status === 'approved').length,
      totalXpRedeemed: rewardsTx.filter((entry) => entry.kind === 'redemption').reduce((sum, entry) => sum + Math.abs(Number(entry.xpDelta || 0)), 0),
    },
    reviewBreakdown,
    rewardRequestBreakdown: {
      pending: rewardRequests.filter((entry) => entry.status === 'pending').length,
      approved: rewardRequests.filter((entry) => entry.status === 'approved').length,
      fulfilled: rewardRequests.filter((entry) => entry.status === 'fulfilled').length,
      rejected: rewardRequests.filter((entry) => entry.status === 'rejected').length,
      cancelled: rewardRequests.filter((entry) => entry.status === 'cancelled').length,
    },
    eventTypeCounts,
    subjectBreakdown,
    podBreakdown,
    dailyTrend: Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    learnerBreakdown: learnerBreakdown.slice(0, 50),
    topLearners: rewards.buildScopedLeaderboard({ cohortId, podId, mallamId, limit: 10 }).filter((entry) => !learnerId || entry.learnerId === learnerId),
  };
}

function buildProgressionRollup({ cohortId = null, podId = null, mallamId = null, subjectId = null, since = null, until = null } = {}) {
  const students = buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const sinceDate = parseDate(since);
  const untilDate = parseDate(until);
  const progressEntries = repository
    .listProgress()
    .filter((entry) => studentIds.has(entry.studentId) && (!subjectId || entry.subjectId === subjectId) && inRange(entry.lastActiveAt, { since: sinceDate, until: untilDate }));
  const runtimeSummary = buildRuntimeAnalytics({ cohortId, podId, mallamId, since, until, limit: 10 }).summary;
  const rewardsLeaderboard = rewards
    .buildScopedLeaderboard({ cohortId, podId, limit: 10 })
    .filter((entry) => !studentIds.size || studentIds.has(entry.learnerId));
  const overrides = repository
    .listProgressionOverrides()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));

  return {
    scope: { cohortId, podId, mallamId, subjectId, since, until, learnerCount: students.length },
    progression: {
      ready: progressEntries.filter((entry) => entry.progressionStatus === 'ready').length,
      watch: progressEntries.filter((entry) => entry.progressionStatus === 'watch').length,
      onTrack: progressEntries.filter((entry) => entry.progressionStatus === 'on-track').length,
      averageMastery: progressEntries.length ? progressEntries.reduce((sum, entry) => sum + Number(entry.mastery || 0), 0) / progressEntries.length : 0,
      totalLessonsCompleted: progressEntries.reduce((sum, entry) => sum + Number(entry.lessonsCompleted || 0), 0),
      overridesApplied: overrides.filter((entry) => entry.action === 'override').length,
      overridesRevoked: overrides.filter((entry) => entry.action === 'revoked').length,
    },
    runtime: runtimeSummary,
    rewards: {
      leaderboard: rewardsLeaderboard,
      totalXpAwarded: repository.listRewardTransactions().filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate })).reduce((sum, entry) => sum + Number(entry.xpDelta || 0), 0),
    },
    overrides: overrides.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20),
  };
}

function buildAdminControlsReport({ cohortId = null, podId = null, mallamId = null, learnerId = null, since = null, until = null, limit = 20 } = {}) {
  const students = learnerId
    ? buildScopedStudentSet({ cohortId, podId, mallamId }).filter((student) => student.id === learnerId)
    : buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const sinceDate = parseDate(since);
  const untilDate = parseDate(until);
  const overrides = repository
    .listProgressionOverrides()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sessionRepairs = repository
    .listSessionRepairs()
    .filter((entry) => studentIds.has(entry.learnerId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const overrideReasonCounts = overrides.reduce((acc, entry) => {
    const key = entry.reason || 'unspecified';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const repairReasonCounts = sessionRepairs.reduce((acc, entry) => {
    const key = entry.reason || 'unspecified';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const repairActionCounts = sessionRepairs.reduce((acc, entry) => {
    const key = entry.patch?.action || entry.patch?.status || 'manual_patch';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const actorCounts = [...overrides, ...sessionRepairs].reduce((acc, entry) => {
    const key = entry.actorName || 'Unknown actor';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const touchedLearnerIds = new Set([...overrides.map((entry) => entry.studentId), ...sessionRepairs.map((entry) => entry.learnerId)].filter(Boolean));

  return {
    scope: { cohortId, podId, mallamId, learnerId, since, until, learnerCount: students.length, limit },
    summary: {
      learnersInScope: students.length,
      touchedLearners: touchedLearnerIds.size,
      progressionOverrides: overrides.length,
      activeOverrides: overrides.filter((entry) => !entry.revokedAt && entry.action !== 'revoked').length,
      revokedOverrides: overrides.filter((entry) => entry.revokedAt || entry.action === 'revoked').length,
      sessionRepairs: sessionRepairs.length,
      abandonRepairs: repairActionCounts.abandon || 0,
      reopenRepairs: repairActionCounts.reopen || 0,
      completedRepairs: repairActionCounts.completed || 0,
      revertedRepairs: repairActionCounts['revert-repair'] || 0,
      patchedSessions: repairActionCounts.manual_patch || 0,
    },
    overrideReasons: Object.entries(overrideReasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    repairReasons: Object.entries(repairReasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    repairActions: Object.entries(repairActionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action)),
    actors: Object.entries(actorCounts)
      .map(([actorName, changes]) => ({ actorName, changes }))
      .sort((a, b) => b.changes - a.changes || a.actorName.localeCompare(b.actorName)),
    recent: {
      overrides: overrides.slice(0, Math.max(1, Math.min(Number(limit || 20), 100))),
      sessionRepairs: sessionRepairs.slice(0, Math.max(1, Math.min(Number(limit || 20), 100))),
    },
  };
}


function buildProgressionOverrideDetail(overrideId) {
  const override = repository.findProgressionOverrideById(overrideId);

  if (!override) {
    return null;
  }

  const learner = override.studentId ? presenters.presentStudent(repository.findStudentById(override.studentId)) : null;
  const progress = override.progressId ? presenters.presentProgress(repository.findProgressById(override.progressId)) : null;
  const relatedOverrides = repository
    .listProgressionOverrides()
    .filter((entry) => entry.studentId === override.studentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recommendedModule = override.nextRecommendedNextModuleId
    ? presenters.presentCurriculumModule(repository.findModuleById(override.nextRecommendedNextModuleId))
    : null;
  const previousModule = override.previousRecommendedNextModuleId
    ? presenters.presentCurriculumModule(repository.findModuleById(override.previousRecommendedNextModuleId))
    : null;

  return {
    override,
    learner,
    currentProgress: progress,
    related: {
      overrides: relatedOverrides.slice(0, 20),
    },
    diff: {
      action: override.action || 'override',
      statusChanged: (override.previousStatus || null) !== (override.nextStatus || null),
      moduleChanged: (override.previousRecommendedNextModuleId || null) !== (override.nextRecommendedNextModuleId || null),
      isRevoked: Boolean(override.revokedAt || override.action === 'revoked'),
    },
    targets: {
      previousModule,
      nextModule: recommendedModule,
    },
    reapplyPreview: {
      progressId: override.progressId || null,
      progressionStatus: override.nextStatus || null,
      recommendedNextModuleId: override.nextRecommendedNextModuleId || null,
    },
    revertPreview: {
      progressId: override.progressId || null,
      progressionStatus: override.previousStatus || null,
      recommendedNextModuleId: override.previousRecommendedNextModuleId || null,
    },
  };
}

function buildSessionRepairDetail(repairId) {
  const repair = repository.findSessionRepairById(repairId);

  if (!repair) {
    return null;
  }

  const learner = repair.learnerId ? presenters.presentStudent(repository.findStudentById(repair.learnerId)) : null;
  const session = repair.sessionId ? presenters.presentLessonSession(repository.findLessonSessionBySessionId(repair.sessionId)) : null;
  const events = repository
    .listSessionEventLog()
    .filter((entry) => entry.sessionId === repair.sessionId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const priorRepairs = repository
    .listSessionRepairs()
    .filter((entry) => entry.sessionId === repair.sessionId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const beforeProgress = repair.before && Number(repair.before.stepsTotal || 0) > 0
    ? Math.max(0, Math.min(1, Number(repair.before.currentStepIndex || 0) / Number(repair.before.stepsTotal || 1)))
    : 0;
  const afterProgress = repair.after && Number(repair.after.stepsTotal || 0) > 0
    ? Math.max(0, Math.min(1, Number(repair.after.currentStepIndex || 0) / Number(repair.after.stepsTotal || 1)))
    : 0;

  return {
    repair,
    learner,
    currentSession: session,
    related: {
      events: events.slice(0, 20),
      repairs: priorRepairs.slice(0, 20),
    },
    diff: {
      action: repair.patch?.action || repair.patch?.status || 'manual_patch',
      statusChanged: (repair.before?.status || null) !== (repair.after?.status || null),
      completionStateChanged: (repair.before?.completionState || null) !== (repair.after?.completionState || null),
      lessonChanged: (repair.before?.lessonId || null) !== (repair.after?.lessonId || null),
      moduleChanged: (repair.before?.moduleId || null) !== (repair.after?.moduleId || null),
      progressRatioDelta: afterProgress - beforeProgress,
      responsesDelta: Number(repair.after?.responsesCaptured || 0) - Number(repair.before?.responsesCaptured || 0),
      supportActionsDelta: Number(repair.after?.supportActionsUsed || 0) - Number(repair.before?.supportActionsUsed || 0),
      audioCapturesDelta: Number(repair.after?.audioCaptures || 0) - Number(repair.before?.audioCaptures || 0),
    },
    revertPreview: repair.before
      ? {
          sessionId: repair.before.sessionId || repair.sessionId,
          status: repair.before.status || null,
          completionState: repair.before.completionState || null,
          currentStepIndex: Number(repair.before.currentStepIndex || 0),
          stepsTotal: Number(repair.before.stepsTotal || 0),
          lastActivityAt: repair.before.lastActivityAt || null,
        }
      : null,
  };
}

function buildStorageOperationsReport({ limit = 20, kind = null, actorName = null } = {}) {
  const store = require('./store');
  const operations = store
    .listStorageOperations()
    .filter((entry) => (!kind || entry.kind === kind) && (!actorName || entry.actorName === actorName))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const kindCounts = operations.reduce((acc, entry) => {
    const key = entry.kind || 'unknown';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const actorCounts = operations.reduce((acc, entry) => {
    const key = entry.actorName || 'Unknown actor';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const statusCounts = operations.reduce((acc, entry) => {
    const key = entry.status || 'unknown';
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    scope: { limit, kind, actorName },
    summary: {
      totalOperations: operations.length,
      uniqueActors: Object.keys(actorCounts).length,
      lastOperationAt: operations[0]?.createdAt ?? null,
      latestKind: operations[0]?.kind ?? null,
      latestBackupPath: operations.find((entry) => entry.backupPath)?.backupPath ?? null,
      statusCounts,
    },
    kinds: Object.entries(kindCounts)
      .map(([currentKind, count]) => ({ kind: currentKind, count }))
      .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
    actors: Object.entries(actorCounts)
      .map(([currentActorName, count]) => ({ actorName: currentActorName, count }))
      .sort((a, b) => b.count - a.count || a.actorName.localeCompare(b.actorName)),
    recent: operations.slice(0, Math.max(1, Math.min(Number(limit || 20), 100))),
  };
}

function buildStorageReport({ limit = 10 } = {}) {
  const store = require('./store');
  const status = store.getStorageStatus() || null;
  const integrity = store.getStorageIntegrityReport();
  const snapshot = store.exportStorageSnapshot();
  const backups = store.listStorageBackups(Math.max(1, Math.min(Number(limit || 10), 100)));
  const operations = buildStorageOperationsReport({ limit: Math.min(Number(limit || 10), 50) });

  return {
    summary: {
      mode: snapshot.mode,
      storageKind: status?.kind || snapshot.mode,
      persistent: Boolean(status?.db?.persistent),
      hasDatabaseUrl: Boolean(status?.db?.hasDatabaseUrl),
      driver: status?.db?.driver || null,
      backupCount: backups.length,
      integrityIssueCount: integrity.summary.issueCount,
      collectionCount: Object.keys(snapshot.collectionCounts || {}).length,
      recordCount: Object.values(snapshot.collectionCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0),
      rewardRequestCount: snapshot.collectionCounts?.rewardRedemptionRequests || 0,
      sessionRepairCount: snapshot.collectionCounts?.sessionRepairs || 0,
      progressionOverrideCount: snapshot.collectionCounts?.progressionOverrides || 0,
      syncEventCount: snapshot.collectionCounts?.syncEvents || 0,
      storageOperationCount: snapshot.collectionCounts?.storageOperations || 0,
      updatedAt: status?.updatedAt || snapshot.exportedAt,
      lastOperationAt: operations.summary.lastOperationAt,
    },
    status,
    integrity: {
      summary: integrity.summary,
      issuesByType: integrity.issues.reduce((acc, issue) => {
        acc[issue.type] = Number(acc[issue.type] || 0) + 1;
        return acc;
      }, {}),
      recentIssues: integrity.issues.slice(0, Math.max(1, Math.min(Number(limit || 10), 100))),
    },
    collections: snapshot.collectionCounts,
    backups,
    operations,
  };
}

function buildOperationsReport({ cohortId = null, podId = null, mallamId = null, subjectId = null, learnerId = null, since = null, until = null, limit = 20 } = {}) {
  const runtime = buildRuntimeAnalytics({ learnerId, cohortId, podId, mallamId, since, until, limit });
  const progression = buildProgressionRollup({ cohortId, podId, mallamId, subjectId, since, until });
  const rewardsReport = buildRewardsReport({ cohortId, podId, mallamId, learnerId, since, until, limit });
  const fulfillment = rewards.buildRewardFulfillmentReport({ cohortId, podId, mallamId, learnerId, since, until, limit });
  const adminControls = buildAdminControlsReport({ cohortId, podId, mallamId, learnerId, since, until, limit });
  const storage = buildStorageReport({ limit: Math.min(Number(limit || 20), 20) });
  const integrity = require('./store').getStorageIntegrityReport();
  const storageOps = buildStorageOperationsReport({ limit: Math.min(Number(limit || 20), 20) });
  const workboard = buildWorkboard()
    .filter((item) => (!cohortId || item.cohortId === cohortId) && (!podId || item.podId === podId) && (!mallamId || item.mallamId === mallamId))
    .slice(0, Math.max(1, Math.min(Number(limit || 20), 100)));
  const stalledRuntimeLearners = runtime.learnerBreakdown
    .filter((item) => item.sessions > 0 && item.completedSessions === 0)
    .slice(0, 10);
  const highSupportLearners = runtime.learnerBreakdown
    .filter((item) => Number(item.totalSupportActions || 0) > 0)
    .sort((a, b) => Number(b.totalSupportActions || 0) - Number(a.totalSupportActions || 0))
    .slice(0, 10);

  return {
    scope: { cohortId, podId, mallamId, subjectId, learnerId, since, until, limit },
    summary: {
      learnersInScope: runtime.summary.distinctLearners || rewardsReport.summary.learners,
      runtimeCompletionRate: runtime.summary.completionRate,
      runtimeAbandonedSessions: runtime.summary.abandonedSessions,
      progressionReady: progression.progression.ready,
      progressionWatch: progression.progression.watch,
      rewardPendingRequests: rewardsReport.summary.requestStatusCounts.pending || 0,
      rewardFulfillmentRate: rewardsReport.summary.fulfillmentRate,
      rewardBacklogUrgent: fulfillment.summary.backlog.urgent,
      activeProgressionOverrides: adminControls.summary.activeOverrides,
      sessionRepairs: adminControls.summary.sessionRepairs,
      integrityIssueCount: integrity.summary.issueCount,
      storageOperations: storageOps.summary.totalOperations,
      lastStorageOperationAt: storageOps.summary.lastOperationAt,
    },
    runtime: {
      summary: runtime.summary,
      automationSummary: runtime.automationSummary,
      eventTypeCounts: runtime.eventTypeCounts,
      stalledLearners: stalledRuntimeLearners,
      highSupportLearners,
    },
    progression: {
      summary: progression.progression,
      rewards: progression.rewards,
    },
    rewards: {
      summary: rewardsReport.summary,
      fulfillment: fulfillment.summary,
      demand: rewardsReport.rewardDemand.slice(0, 10),
    },
    integrity: {
      summary: integrity.summary,
      issuesByType: integrity.issues.reduce((acc, issue) => {
        acc[issue.type] = Number(acc[issue.type] || 0) + 1;
        return acc;
      }, {}),
    },
    storage: {
      summary: storage.summary,
      integrity: storage.integrity,
      collections: storage.collections,
      backups: storage.backups,
      status: storage.status,
      operations: storage.operations,
    },
    adminControls: {
      summary: adminControls.summary,
      overrideReasons: adminControls.overrideReasons,
      repairReasons: adminControls.repairReasons,
      repairActions: adminControls.repairActions,
      actors: adminControls.actors,
    },
    hotlist: {
      watchLearners: workboard.filter((item) => item.progressionStatus === 'watch').slice(0, 10),
      readyLearners: workboard.filter((item) => item.progressionStatus === 'ready').slice(0, 10),
      runtimeLearners: runtime.learnerBreakdown.slice(0, 10),
      stalledRuntimeLearners,
      highSupportLearners,
      rewardQueue: rewardsReport.recentRequests.filter((item) => ['pending', 'approved'].includes(item.status)).slice(0, 10),
      repairedSessions: adminControls.recent.sessionRepairs.slice(0, 10),
    },
    recent: {
      sessions: runtime.recentSessions.slice(0, 10),
      events: runtime.recentEvents.slice(0, 10),
      overrides: progression.overrides.slice(0, 10),
      sessionRepairs: adminControls.recent.sessionRepairs.slice(0, 10),
      rewardAdjustments: rewardsReport.recentAdjustments.slice(0, 10),
      rewardRequests: fulfillment.recentRequests.slice(0, 10),
      integrityIssues: integrity.issues.slice(0, 10),
    },
  };
}

function buildRewardsReport({ cohortId = null, podId = null, mallamId = null, learnerId = null, since = null, until = null, limit = 20 } = {}) {
  const students = learnerId
    ? buildScopedStudentSet({ cohortId, podId, mallamId }).filter((student) => student.id === learnerId)
    : buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const sinceDate = parseDate(since);
  const untilDate = parseDate(until);
  const transactions = repository
    .listRewardTransactions()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));
  const requests = repository
    .listRewardRedemptionRequests()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.updatedAt || entry.createdAt, { since: sinceDate, until: untilDate }));
  const adjustments = repository
    .listRewardAdjustments()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.createdAt, { since: sinceDate, until: untilDate }));

  const requestStatusCounts = {
    pending: requests.filter((entry) => entry.status === 'pending').length,
    approved: requests.filter((entry) => entry.status === 'approved').length,
    fulfilled: requests.filter((entry) => entry.status === 'fulfilled').length,
    rejected: requests.filter((entry) => entry.status === 'rejected').length,
    cancelled: requests.filter((entry) => entry.status === 'cancelled').length,
    expired: requests.filter((entry) => entry.status === 'expired').length,
  };
  const queueHealth = rewards.buildRewardRedemptionQueue({ cohortId, podId, mallamId, learnerId, status: null, limit });
  const integrity = rewards.buildRewardRequestIntegrityReport({ cohortId, podId, mallamId, learnerId, limit: 200 });
  const lifecycle = requests.reduce((acc, entry) => {
    const current = rewards.getRewardRequestLifecycleHours(entry);
    if (current.approvalHours !== null) {
      acc.approvalHours.push(current.approvalHours);
    }
    if (current.fulfillmentHours !== null) {
      acc.fulfillmentHours.push(current.fulfillmentHours);
    }
    const ageDays = rewards.getRewardRequestAgeDays(entry);
    if (['pending', 'approved'].includes(entry.status) && ageDays !== null) {
      acc.openAgeDays.push(ageDays);
    }
    return acc;
  }, { approvalHours: [], fulfillmentHours: [], openAgeDays: [] });

  const xpByDay = new Map();
  transactions.forEach((entry) => {
    const day = String(entry.createdAt || '').slice(0, 10) || 'unknown';
    const row = xpByDay.get(day) || { date: day, xpAwarded: 0, xpRedeemed: 0, transactions: 0 };
    row.transactions += 1;
    if (Number(entry.xpDelta || 0) >= 0) {
      row.xpAwarded += Number(entry.xpDelta || 0);
    } else {
      row.xpRedeemed += Math.abs(Number(entry.xpDelta || 0));
    }
    xpByDay.set(day, row);
  });

  const rewardDemand = requests.reduce((acc, entry) => {
    const key = entry.rewardItemId || 'unknown';
    const current = acc.get(key) || { rewardItemId: key, rewardTitle: entry.rewardTitle || key, requests: 0, fulfilled: 0, pending: 0 };
    current.requests += 1;
    current.fulfilled += entry.status === 'fulfilled' ? 1 : 0;
    current.pending += ['pending', 'approved'].includes(entry.status) ? 1 : 0;
    acc.set(key, current);
    return acc;
  }, new Map());

  const learnerBreakdown = students.map((student) => {
    const snapshot = rewards.buildLearnerRewards(student.id);
    const learnerTransactions = transactions.filter((entry) => entry.studentId === student.id);
    const learnerRequests = requests.filter((entry) => entry.studentId === student.id);
    return {
      learnerId: student.id,
      learnerName: student.name,
      totalXp: snapshot?.totalXp ?? 0,
      badgesUnlocked: snapshot?.badgesUnlocked ?? 0,
      transactions: learnerTransactions.length,
      xpAwarded: learnerTransactions.filter((entry) => Number(entry.xpDelta || 0) >= 0).reduce((sum, entry) => sum + Number(entry.xpDelta || 0), 0),
      xpRedeemed: learnerTransactions.filter((entry) => Number(entry.xpDelta || 0) < 0).reduce((sum, entry) => sum + Math.abs(Number(entry.xpDelta || 0)), 0),
      requests: learnerRequests.length,
      pendingRequests: learnerRequests.filter((entry) => ['pending', 'approved'].includes(entry.status)).length,
    };
  }).sort((a, b) => b.totalXp - a.totalXp || b.requests - a.requests || a.learnerName.localeCompare(b.learnerName));

  return {
    scope: { cohortId, podId, mallamId, learnerId, since, until, learnerCount: students.length },
    summary: {
      learners: students.length,
      transactionCount: transactions.length,
      totalXpAwarded: transactions.filter((entry) => Number(entry.xpDelta || 0) >= 0).reduce((sum, entry) => sum + Number(entry.xpDelta || 0), 0),
      totalXpRedeemed: transactions.filter((entry) => Number(entry.xpDelta || 0) < 0).reduce((sum, entry) => sum + Math.abs(Number(entry.xpDelta || 0)), 0),
      requestCount: requests.length,
      correctionCount: adjustments.filter((entry) => entry.action === 'corrected').length,
      revocationCount: adjustments.filter((entry) => entry.action === 'revoked').length,
      fulfillmentRate: requests.length ? requestStatusCounts.fulfilled / requests.length : 0,
      averageApprovalHours: lifecycle.approvalHours.length ? lifecycle.approvalHours.reduce((sum, value) => sum + value, 0) / lifecycle.approvalHours.length : null,
      averageFulfillmentHours: lifecycle.fulfillmentHours.length ? lifecycle.fulfillmentHours.reduce((sum, value) => sum + value, 0) / lifecycle.fulfillmentHours.length : null,
      averageOpenRequestAgeDays: lifecycle.openAgeDays.length ? lifecycle.openAgeDays.reduce((sum, value) => sum + value, 0) / lifecycle.openAgeDays.length : 0,
      staleOpenRequestCount: queueHealth.summary.staleOpen,
      rewardIntegrityIssueCount: integrity.summary.issueCount,
      requestStatusCounts,
    },
    queueHealth: queueHealth.summary,
    integrity: integrity.summary,
    dailyXpTrend: Array.from(xpByDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    rewardDemand: Array.from(rewardDemand.values()).sort((a, b) => b.requests - a.requests || a.rewardTitle.localeCompare(b.rewardTitle)),
    recentTransactions: transactions.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit),
    recentRequests: requests.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, limit),
    recentAdjustments: adjustments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit),
    learnerBreakdown: learnerBreakdown.slice(0, Math.max(1, Math.min(Number(limit || 20), 100))),
    leaderboard: rewards.buildScopedLeaderboard({ cohortId, podId, mallamId, limit }),
  };
}

module.exports = {
  buildOverviewReport,
  buildDashboardInsights,
  buildWorkboard,
  buildStudentProfile,
  buildMallamProfile,
  buildMallamSummary,
  buildNgoSummary,
  buildRuntimeAnalytics,
  buildEngagementReport,
  buildProgressionRollup,
  buildAdminControlsReport,
  buildProgressionOverrideDetail,
  buildSessionRepairDetail,
  buildStorageOperationsReport,
  buildStorageReport,
  buildOperationsReport,
  buildRewardsReport,
};
