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
  const avgProgressRatio = sessions.length
    ? sessions.reduce((sum, entry) => {
      const ratio = entry.stepsTotal > 0 ? Number(entry.currentStepIndex || 0) / Number(entry.stepsTotal || 1) : 0;
      return sum + Math.max(0, Math.min(1, ratio));
    }, 0) / sessions.length
    : 0;

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
      generatedAt: new Date().toISOString(),
      cohortId,
      podId,
      mallamId,
      since,
      until,
    },
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
};
