const repository = require('./repository');

const XP_RULES = {
  lessonCompleted: 12,
  onTrackBonus: 3,
  observationCaptured: 2,
  independentCompletionBonus: 2,
};

const LEVEL_THRESHOLDS = [
  { level: 1, label: 'Starter', minXp: 0 },
  { level: 2, label: 'Explorer', minXp: 40 },
  { level: 3, label: 'Builder', minXp: 90 },
  { level: 4, label: 'Navigator', minXp: 150 },
  { level: 5, label: 'Shining Star', minXp: 230 },
];

const REWARD_STORE_ITEMS = [
  {
    id: 'story-time',
    title: 'Story Time Pick',
    description: 'Choose the next short story or listening activity.',
    xpCost: 30,
    kind: 'experience',
    icon: 'menu_book',
  },
  {
    id: 'sticker-badge',
    title: 'Sticker Reward',
    description: 'Pick a bright sticker or stamp right after the lesson.',
    xpCost: 40,
    kind: 'sticker',
    icon: 'stars',
  },
  {
    id: 'helper-star',
    title: 'Helper Star',
    description: 'Celebrate teamwork with a helper star moment in class.',
    xpCost: 45,
    kind: 'recognition',
    icon: 'star',
  },
  {
    id: 'line-leader',
    title: 'Line Leader Turn',
    description: 'Lead one classroom transition or line-up.',
    xpCost: 55,
    kind: 'privilege',
    icon: 'directions_walk',
  },
  {
    id: 'math-champion-sticker',
    title: 'Math Champion Sticker',
    description: 'Unlock a printed or digital sticker for numeracy effort.',
    xpCost: 60,
    kind: 'sticker',
    icon: 'calculate',
  },
  {
    id: 'song-choice',
    title: 'Celebration Song Pick',
    description: 'Choose the next song, chant, or clap routine.',
    xpCost: 75,
    kind: 'experience',
    icon: 'music_note',
  },
  {
    id: 'mallam-helper',
    title: 'Mallam Helper',
    description: 'Assist with handing out cards or opening the next activity.',
    xpCost: 90,
    kind: 'leadership',
    icon: 'record_voice_over',
  },
];

const BADGE_DEFINITIONS = [
  {
    id: 'first-lesson',
    title: 'First Light',
    description: 'Complete the first guided lesson.',
    icon: 'wb_sunny',
    category: 'milestone',
  },
  {
    id: 'five-lessons',
    title: 'Practice Streak',
    description: 'Complete five lessons.',
    icon: 'local_fire_department',
    category: 'consistency',
  },
  {
    id: 'reading-starter',
    title: 'Reading Spark',
    description: 'Complete the first reading or phonics module lesson.',
    icon: 'auto_stories',
    category: 'subject',
  },
  {
    id: 'math-mover',
    title: 'Math Mover',
    description: 'Complete a numeracy lesson with an on-track review.',
    icon: 'calculate',
    category: 'subject',
  },
];

function listRewardTransactions() {
  return repository.listRewardTransactions();
}

function listRewardAdjustments() {
  return repository.listRewardAdjustments();
}

function getLevelForXp(totalXp) {
  const safeXp = Number(totalXp || 0);
  let current = LEVEL_THRESHOLDS[0];

  for (const threshold of LEVEL_THRESHOLDS) {
    if (safeXp >= threshold.minXp) {
      current = threshold;
    }
  }

  const currentIndex = LEVEL_THRESHOLDS.findIndex((item) => item.level === current.level);
  const next = currentIndex >= 0 ? LEVEL_THRESHOLDS[currentIndex + 1] || null : null;
  const span = next ? next.minXp - current.minXp : 0;
  const xpIntoLevel = safeXp - current.minXp;
  const progressToNextLevel = !next || span <= 0 ? 1 : Math.max(0, Math.min(1, xpIntoLevel / span));

  return {
    currentLevel: current.level,
    currentLevelLabel: current.label,
    nextLevel: next?.level ?? null,
    nextLevelLabel: next?.label ?? null,
    nextLevelXp: next?.minXp ?? null,
    xpIntoLevel,
    xpForNextLevel: next ? Math.max(0, next.minXp - safeXp) : 0,
    progressToNextLevel,
  };
}

function buildBadgeProgress(studentId) {
  const progressEntries = repository.listProgress().filter((item) => item.studentId === studentId);
  const completedLessons = progressEntries.reduce((sum, item) => sum + Number(item.lessonsCompleted || 0), 0);
  const observationCount = repository.listObservations().filter((item) => item.studentId === studentId).length;
  const subjectIds = new Set(progressEntries.map((item) => item.subjectId).filter(Boolean));
  const earnedBadgeIds = new Set(
    repository
      .listRewardTransactions()
      .filter((item) => item.studentId === studentId && item.kind === 'badge_awarded' && item.badgeId)
      .map((item) => item.badgeId),
  );

  return BADGE_DEFINITIONS.map((badge) => {
    let progress = 0;
    let target = 1;

    switch (badge.id) {
      case 'first-lesson':
        progress = completedLessons;
        target = 1;
        break;
      case 'five-lessons':
        progress = completedLessons;
        target = 5;
        break;
      case 'reading-starter':
        progress = subjectIds.has('english') ? 1 : 0;
        target = 1;
        break;
      case 'math-mover':
        progress = subjectIds.has('math') ? 1 : 0;
        target = 1;
        break;
      default:
        progress = observationCount;
        target = 1;
    }

    return {
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      progress,
      target,
    };
  });
}

function buildLearnerRewards(studentId) {
  const student = repository.findStudentById(studentId);
  if (!student) return null;

  const transactions = repository.listRewardTransactions().filter((item) => item.studentId === studentId);
  const totalXp = transactions.reduce((sum, item) => sum + Number(item.xpDelta || 0), 0);
  const badgeProgress = buildBadgeProgress(studentId);
  const earnedBadges = badgeProgress.filter((item) => item.earned);
  const recentTransactions = transactions
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
  const level = getLevelForXp(totalXp);

  return {
    learnerId: studentId,
    totalXp,
    points: totalXp,
    level: level.currentLevel,
    levelLabel: level.currentLevelLabel,
    nextLevel: level.nextLevel,
    nextLevelLabel: level.nextLevelLabel,
    nextLevelXp: level.nextLevelXp,
    xpIntoLevel: level.xpIntoLevel,
    xpForNextLevel: level.xpForNextLevel,
    progressToNextLevel: level.progressToNextLevel,
    badgesUnlocked: earnedBadges.length,
    badges: badgeProgress,
    recentTransactions,
  };
}

function maybeAwardBadge({ studentId, badgeId, metadata = {} }) {
  const existing = repository
    .listRewardTransactions()
    .find((item) => item.studentId === studentId && item.kind === 'badge_awarded' && item.badgeId === badgeId);

  if (existing) {
    return null;
  }

  const badge = BADGE_DEFINITIONS.find((item) => item.id === badgeId);
  if (!badge) {
    return null;
  }

  return repository.createRewardTransaction({
    studentId,
    kind: 'badge_awarded',
    xpDelta: 0,
    badgeId,
    label: badge.title,
    metadata,
  });
}

function awardLessonCompletion({ studentId, lessonId, moduleId, subjectId, review, supportActionsUsed, observationsCount }) {
  const xpDelta = XP_RULES.lessonCompleted
    + (review === 'onTrack' ? XP_RULES.onTrackBonus : 0)
    + (!supportActionsUsed ? XP_RULES.independentCompletionBonus : 0)
    + (Number(observationsCount || 0) > 0 ? XP_RULES.observationCaptured : 0);

  const transaction = repository.createRewardTransaction({
    studentId,
    lessonId,
    moduleId,
    subjectId,
    kind: 'lesson_completed',
    xpDelta,
    label: 'Lesson completed',
    metadata: {
      review: review || null,
      supportActionsUsed: Number(supportActionsUsed || 0),
      observationsCount: Number(observationsCount || 0),
    },
  });

  const badgeAwards = [];
  const snapshotBeforeBadges = buildLearnerRewards(studentId);
  const totalCompletedLessons = repository
    .listProgress()
    .filter((item) => item.studentId === studentId)
    .reduce((sum, item) => sum + Number(item.lessonsCompleted || 0), 0);

  if (totalCompletedLessons >= 1) {
    const firstLesson = maybeAwardBadge({ studentId, badgeId: 'first-lesson', metadata: { lessonId } });
    if (firstLesson) badgeAwards.push(firstLesson);
  }

  if (totalCompletedLessons >= 5) {
    const streakBadge = maybeAwardBadge({ studentId, badgeId: 'five-lessons', metadata: { lessonId } });
    if (streakBadge) badgeAwards.push(streakBadge);
  }

  if (subjectId === 'english') {
    const readingBadge = maybeAwardBadge({ studentId, badgeId: 'reading-starter', metadata: { lessonId, moduleId } });
    if (readingBadge) badgeAwards.push(readingBadge);
  }

  if (subjectId === 'math' && review === 'onTrack') {
    const mathBadge = maybeAwardBadge({ studentId, badgeId: 'math-mover', metadata: { lessonId, moduleId } });
    if (mathBadge) badgeAwards.push(mathBadge);
  }

  return {
    transaction,
    badgeAwards,
    snapshot: buildLearnerRewards(studentId),
    delta: {
      xpDelta,
      awardedBadgeIds: badgeAwards.map((item) => item.badgeId),
      levelBefore: snapshotBeforeBadges?.level ?? null,
      levelAfter: buildLearnerRewards(studentId)?.level ?? null,
    },
  };
}

function buildScopedStudentSet({ cohortId = null, podId = null, mallamId = null } = {}) {
  return repository
    .listStudents()
    .filter((student) => (!cohortId || student.cohortId === cohortId) && (!podId || student.podId === podId) && (!mallamId || student.mallamId === mallamId));
}

function buildRewardHistory(studentId, { kind = null, limit = 20 } = {}) {
  const student = repository.findStudentById(studentId);
  if (!student) return null;

  const items = repository
    .listRewardTransactions()
    .filter((item) => item.studentId === studentId && (!kind || item.kind === kind))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.max(1, Math.min(Number(limit || 20), 100)));

  return {
    learnerId: studentId,
    kind,
    count: items.length,
    items,
  };
}

function buildScopedLeaderboard({ cohortId = null, podId = null, mallamId = null, limit = 10 } = {}) {
  return buildScopedStudentSet({ cohortId, podId, mallamId })
    .map((student) => {
      const snapshot = buildLearnerRewards(student.id);
      return {
        learnerId: student.id,
        learnerName: student.name,
        cohortId: student.cohortId,
        podId: student.podId,
        mallamId: student.mallamId,
        ...snapshot,
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp || b.badgesUnlocked - a.badgesUnlocked || a.learnerName.localeCompare(b.learnerName))
    .slice(0, Math.max(1, Math.min(Number(limit || 10), 100)));
}

function buildRewardsCatalog() {
  return {
    xpRules: XP_RULES,
    levels: LEVEL_THRESHOLDS,
    badges: BADGE_DEFINITIONS,
    storeItems: REWARD_STORE_ITEMS,
  };
}

function buildLearnerRewardHub(studentId) {
  const snapshot = buildLearnerRewards(studentId);
  if (!snapshot) return null;

  const availableRewards = REWARD_STORE_ITEMS.map((item) => ({
    ...item,
    affordable: snapshot.totalXp >= item.xpCost,
    xpShortfall: Math.max(0, item.xpCost - snapshot.totalXp),
  }));
  const recentRequests = repository.listRewardRedemptionRequests()
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 10);
  const pendingRequests = recentRequests.filter((item) => ['pending', 'approved'].includes(item.status));

  return {
    learnerId: studentId,
    snapshot,
    summary: {
      affordableRewardCount: availableRewards.filter((item) => item.affordable).length,
      pendingRequestCount: pendingRequests.length,
      fulfilledRequestCount: recentRequests.filter((item) => item.status === 'fulfilled').length,
    },
    availableRewards,
    recentRequests,
    pendingRequests,
    featuredReward: availableRewards
      .slice()
      .sort((a, b) => (a.affordable === b.affordable ? a.xpCost - b.xpCost : a.affordable ? -1 : 1))[0] || null,
    nextUnlock: availableRewards
      .filter((item) => item.xpShortfall > 0)
      .sort((a, b) => a.xpShortfall - b.xpShortfall)[0] || null,
  };
}

function awardManualReward({ studentId, xpDelta, badgeId = null, label, metadata = {} }) {
  const transaction = repository.createRewardTransaction({
    studentId,
    kind: badgeId ? 'manual_badge' : 'manual',
    xpDelta: Number(xpDelta || 0),
    badgeId,
    label: label || (badgeId ? 'Manual badge award' : 'Manual reward update'),
    metadata,
  });

  const badgeAward = badgeId ? maybeAwardBadge({ studentId, badgeId, metadata }) : null;

  return {
    transaction,
    badgeAward,
    snapshot: buildLearnerRewards(studentId),
  };
}

function buildLeaderboard(limit = 10) {
  return repository
    .listStudents()
    .map((student) => {
      const snapshot = buildLearnerRewards(student.id);
      return {
        learnerId: student.id,
        learnerName: student.name,
        cohortId: student.cohortId,
        ...snapshot,
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp || b.badgesUnlocked - a.badgesUnlocked || a.learnerName.localeCompare(b.learnerName))
    .slice(0, limit);
}

function getRewardStoreItem(itemId) {
  return REWARD_STORE_ITEMS.find((item) => item.id === itemId) || null;
}

function listRewardRedemptionRequests() {
  return repository.listRewardRedemptionRequests();
}

function ensureRewardRequest(requestId) {
  const existing = repository.findRewardRedemptionRequestById(requestId);
  if (!existing) {
    const error = new Error('Reward request not found');
    error.statusCode = 404;
    throw error;
  }
  return existing;
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getRewardRequestAgeDays(request, now = new Date()) {
  const createdAt = toDate(request?.createdAt);
  if (!createdAt) return null;
  return Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
}

function getRewardRequestLifecycleHours(request) {
  const createdAt = toDate(request?.createdAt);
  if (!createdAt) return { approvalHours: null, fulfillmentHours: null };

  const approvedAt = toDate(request?.approvedAt);
  const fulfilledAt = toDate(request?.fulfilledAt);

  return {
    approvalHours: approvedAt ? Math.max(0, (approvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null,
    fulfillmentHours: fulfilledAt ? Math.max(0, (fulfilledAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)) : null,
  };
}

function summarizeRewardRequestQueue(items) {
  const now = new Date();
  const summary = {
    total: items.length,
    pending: 0,
    approved: 0,
    fulfilled: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
    open: 0,
    staleOpen: 0,
    ageBuckets: { under7d: 0, between7dAnd14d: 0, between14dAnd30d: 0, over30d: 0 },
    avgOpenAgeDays: 0,
    oldestOpenAgeDays: 0,
  };

  let openAgeTotal = 0;
  let openAgeCount = 0;

  items.forEach((item) => {
    summary[item.status] = Number(summary[item.status] || 0) + 1;
    if (['pending', 'approved'].includes(item.status)) {
      summary.open += 1;
      const ageDays = getRewardRequestAgeDays(item, now);
      if (ageDays !== null) {
        openAgeTotal += ageDays;
        openAgeCount += 1;
        summary.oldestOpenAgeDays = Math.max(summary.oldestOpenAgeDays, ageDays);
        if (ageDays >= 14) summary.staleOpen += 1;
        if (ageDays < 7) summary.ageBuckets.under7d += 1;
        else if (ageDays < 14) summary.ageBuckets.between7dAnd14d += 1;
        else if (ageDays < 30) summary.ageBuckets.between14dAnd30d += 1;
        else summary.ageBuckets.over30d += 1;
      }
    }
  });

  summary.avgOpenAgeDays = openAgeCount ? openAgeTotal / openAgeCount : 0;
  return summary;
}

function buildRewardRequestHistory(studentId, { status = null, limit = 20 } = {}) {
  const student = repository.findStudentById(studentId);
  if (!student) return null;

  const items = repository.listRewardRedemptionRequests()
    .filter((item) => item.studentId === studentId && (!status || item.status === status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.max(1, Math.min(Number(limit || 20), 100)))
    .map((item) => ({
      ...item,
      ageDays: getRewardRequestAgeDays(item),
      lifecycle: getRewardRequestLifecycleHours(item),
    }));

  return { learnerId: studentId, status, count: items.length, queue: summarizeRewardRequestQueue(items), items };
}

function buildRewardRedemptionQueue({ cohortId = null, podId = null, mallamId = null, learnerId = null, status = null, limit = 50 } = {}) {
  const students = learnerId
    ? buildScopedStudentSet({ cohortId, podId, mallamId }).filter((student) => student.id === learnerId)
    : buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));

  const allMatchingItems = repository.listRewardRedemptionRequests()
    .filter((item) => (!studentIds.size || studentIds.has(item.studentId)) && (!status || item.status === status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const items = allMatchingItems
    .slice(0, Math.max(1, Math.min(Number(limit || 50), 100)))
    .map((item) => ({
      ...item,
      learnerName: repository.findStudentById(item.studentId)?.name || 'Unknown learner',
      ageDays: getRewardRequestAgeDays(item),
      lifecycle: getRewardRequestLifecycleHours(item),
    }));

  return {
    items,
    summary: summarizeRewardRequestQueue(allMatchingItems),
    meta: { cohortId, podId, mallamId, learnerId, status, count: allMatchingItems.length, returned: items.length },
  };
}

function createRewardRedemptionRequest({ studentId, rewardItemId, learnerNote, requestedBy, requestedVia, clientRequestId, metadata } = {}) {
  const student = repository.findStudentById(studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const item = getRewardStoreItem(rewardItemId);
  if (!item) {
    const error = new Error('Reward item not found');
    error.statusCode = 404;
    throw error;
  }

  const snapshot = buildLearnerRewards(studentId);
  if ((snapshot?.totalXp || 0) < Number(item.xpCost || 0)) {
    const error = new Error('Not enough XP for this reward');
    error.statusCode = 409;
    throw error;
  }

  if (clientRequestId) {
    const duplicate = repository.listRewardRedemptionRequests().find((entry) => entry.clientRequestId && entry.clientRequestId === clientRequestId);
    if (duplicate) {
      return { request: duplicate, snapshot: buildLearnerRewards(studentId) };
    }
  }

  const existingPending = repository.listRewardRedemptionRequests().find((entry) => entry.studentId === studentId && entry.rewardItemId === rewardItemId && ['pending', 'approved'].includes(entry.status));
  if (existingPending) {
    const error = new Error('A pending reward request for this item already exists');
    error.statusCode = 409;
    throw error;
  }

  const request = repository.createRewardRedemptionRequest({
    studentId,
    rewardItemId,
    rewardTitle: item.title,
    xpCost: item.xpCost,
    learnerNote: learnerNote || '',
    requestedBy: requestedBy || studentId,
    requestedVia: requestedVia || 'learner-app',
    clientRequestId: clientRequestId || null,
    metadata: {
      rewardKind: item.kind,
      rewardIcon: item.icon,
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
    },
  });

  return { request, snapshot: buildLearnerRewards(studentId) };
}

function approveRewardRedemptionRequest(requestId, { actorName, actorRole, adminNote } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (existing.status !== 'pending') {
    const error = new Error('Only pending requests can be approved');
    error.statusCode = 409;
    throw error;
  }

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: actorName || 'Unknown actor',
    adminNote: adminNote !== undefined ? adminNote : existing.adminNote,
    metadata: { ...(existing.metadata || {}), approvedByRole: actorRole || 'admin' },
  });

  return { request: updated, snapshot: buildLearnerRewards(updated.studentId) };
}

function rejectRewardRedemptionRequest(requestId, { actorName, actorRole, reason, adminNote } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (!['pending', 'approved'].includes(existing.status)) {
    const error = new Error('Only pending or approved requests can be rejected');
    error.statusCode = 409;
    throw error;
  }

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectedBy: actorName || 'Unknown actor',
    adminNote: adminNote !== undefined ? adminNote : existing.adminNote,
    metadata: { ...(existing.metadata || {}), rejectionReason: reason || 'admin_rejected', rejectedByRole: actorRole || 'admin' },
  });

  return { request: updated, snapshot: buildLearnerRewards(updated.studentId) };
}

function cancelRewardRedemptionRequest(requestId, { actorName, actorRole, reason } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (existing.status !== 'pending') {
    const error = new Error('Only pending requests can be cancelled');
    error.statusCode = 409;
    throw error;
  }

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelledBy: actorName || existing.studentId || 'Unknown actor',
    metadata: { ...(existing.metadata || {}), cancellationReason: reason || 'cancelled', cancelledByRole: actorRole || 'learner' },
  });

  return { request: updated, snapshot: buildLearnerRewards(updated.studentId) };
}


function reopenRewardRedemptionRequest(requestId, { actorName, actorRole, reason, adminNote } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (!['rejected', 'cancelled'].includes(existing.status)) {
    const error = new Error('Only rejected or cancelled requests can be reopened');
    error.statusCode = 409;
    throw error;
  }

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'pending',
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    fulfilledAt: null,
    fulfilledBy: null,
    transactionId: null,
    adminNote: adminNote !== undefined ? adminNote : existing.adminNote,
    metadata: {
      ...(existing.metadata || {}),
      reopenedAt: new Date().toISOString(),
      reopenedBy: actorName || 'Unknown actor',
      reopenedByRole: actorRole || 'admin',
      reopenReason: reason || 'admin_reopened',
    },
  });

  return { request: updated, snapshot: buildLearnerRewards(updated.studentId) };
}

function requeueRewardRedemptionRequest(requestId, { actorName, actorRole, reason, adminNote } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (existing.status !== 'approved') {
    const error = new Error('Only approved requests can be re-queued');
    error.statusCode = 409;
    throw error;
  }

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'pending',
    approvedAt: null,
    approvedBy: null,
    adminNote: adminNote !== undefined ? adminNote : existing.adminNote,
    metadata: {
      ...(existing.metadata || {}),
      requeuedAt: new Date().toISOString(),
      requeuedBy: actorName || 'Unknown actor',
      requeuedByRole: actorRole || 'admin',
      requeueReason: reason || 'needs_follow_up',
    },
  });

  return { request: updated, snapshot: buildLearnerRewards(updated.studentId) };
}

function buildRewardRequestDetail(requestId) {
  const request = repository.findRewardRedemptionRequestById(requestId);
  if (!request) return null;

  const learner = repository.findStudentById(request.studentId);
  const snapshot = buildLearnerRewards(request.studentId);
  const item = getRewardStoreItem(request.rewardItemId);
  const transaction = request.transactionId ? repository.findRewardTransactionById(request.transactionId) : null;
  const adjustments = repository.listRewardAdjustments()
    .filter((entry) => entry.studentId === request.studentId && (entry.transactionId === request.transactionId || entry.after?.metadata?.rewardRequestId === request.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    request,
    learner: learner ? {
      id: learner.id,
      name: learner.name,
      cohortId: learner.cohortId,
      podId: learner.podId,
      mallamId: learner.mallamId,
    } : null,
    item,
    snapshot,
    transaction,
    adjustments,
    affordability: item && snapshot ? {
      currentXp: snapshot.totalXp,
      xpCost: request.xpCost || item.xpCost,
      affordableNow: snapshot.totalXp >= Number(request.xpCost || item.xpCost || 0),
      xpShortfall: Math.max(0, Number(request.xpCost || item.xpCost || 0) - snapshot.totalXp),
    } : null,
  };
}

function buildRewardFulfillmentReport({ cohortId = null, podId = null, mallamId = null, learnerId = null, since = null, until = null, limit = 20 } = {}) {
  const students = learnerId
    ? buildScopedStudentSet({ cohortId, podId, mallamId }).filter((student) => student.id === learnerId)
    : buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const sinceDate = since ? new Date(since) : null;
  const untilDate = until ? new Date(until) : null;
  const inRange = (value) => {
    const current = value ? new Date(value) : null;
    if (!current || Number.isNaN(current.getTime())) return true;
    if (sinceDate && current < sinceDate) return false;
    if (untilDate && current > untilDate) return false;
    return true;
  };

  const requests = repository.listRewardRedemptionRequests()
    .filter((entry) => studentIds.has(entry.studentId) && inRange(entry.updatedAt || entry.createdAt));
  const now = Date.now();
  const backlog = { fresh: 0, attention: 0, urgent: 0 };
  const statusCounts = { pending: 0, approved: 0, fulfilled: 0, rejected: 0, cancelled: 0, expired: 0 };
  const turnaroundHours = [];
  const queueByItem = new Map();

  requests.forEach((entry) => {
    statusCounts[entry.status] = Number(statusCounts[entry.status] || 0) + 1;
    const createdAt = new Date(entry.createdAt || entry.updatedAt || Date.now()).getTime();
    const ageHours = Math.max(0, (now - createdAt) / (1000 * 60 * 60));
    if (['pending', 'approved'].includes(entry.status)) {
      if (ageHours >= 72) backlog.urgent += 1;
      else if (ageHours >= 24) backlog.attention += 1;
      else backlog.fresh += 1;
    }
    if (entry.fulfilledAt) {
      turnaroundHours.push(Math.max(0, (new Date(entry.fulfilledAt).getTime() - createdAt) / (1000 * 60 * 60)));
    }

    const key = entry.rewardItemId || 'unknown';
    const current = queueByItem.get(key) || { rewardItemId: key, rewardTitle: entry.rewardTitle || key, pending: 0, approved: 0, fulfilled: 0, total: 0 };
    current.total += 1;
    if (entry.status === 'pending') current.pending += 1;
    if (entry.status === 'approved') current.approved += 1;
    if (entry.status === 'fulfilled') current.fulfilled += 1;
    queueByItem.set(key, current);
  });

  return {
    scope: { cohortId, podId, mallamId, learnerId, since, until, learnerCount: students.length },
    summary: {
      requestCount: requests.length,
      pendingOrApproved: statusCounts.pending + statusCounts.approved,
      fulfillmentRate: requests.length ? statusCounts.fulfilled / requests.length : 0,
      averageFulfillmentHours: turnaroundHours.length ? turnaroundHours.reduce((sum, value) => sum + value, 0) / turnaroundHours.length : null,
      backlog,
      statusCounts,
    },
    queueByItem: Array.from(queueByItem.values()).sort((a, b) => (b.pending + b.approved) - (a.pending + a.approved) || b.total - a.total),
    recentRequests: requests.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, Math.max(1, Math.min(Number(limit || 20), 100))),
  };
}

function expireRewardRedemptionRequest(requestId, { actorName, actorRole, reason, adminNote, metadata } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (!['pending', 'approved'].includes(existing.status)) {
    const error = new Error('Only pending or approved requests can be expired');
    error.statusCode = 409;
    throw error;
  }

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'expired',
    rejectedAt: new Date().toISOString(),
    rejectedBy: actorName || 'Unknown actor',
    adminNote: adminNote !== undefined ? adminNote : existing.adminNote,
    metadata: {
      ...(existing.metadata || {}),
      expiryReason: reason || 'stale_request',
      expiredByRole: actorRole || 'admin',
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
    },
  });

  return { request: updated, snapshot: buildLearnerRewards(updated.studentId) };
}

function expireStaleRewardRedemptionRequests({ olderThanDays = 14, includeApproved = true, limit = 100, actorName, actorRole, reason, adminNote } = {}) {
  const threshold = Number(olderThanDays || 14);
  if (!Number.isFinite(threshold) || threshold < 0) {
    const error = new Error('Invalid olderThanDays');
    error.statusCode = 400;
    throw error;
  }

  const statuses = includeApproved ? ['pending', 'approved'] : ['pending'];
  const candidates = repository.listRewardRedemptionRequests()
    .filter((item) => statuses.includes(item.status))
    .filter((item) => {
      const ageDays = getRewardRequestAgeDays(item);
      return ageDays !== null && ageDays >= threshold;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, Math.max(1, Math.min(Number(limit || 100), 500)));

  const items = candidates.map((item) => expireRewardRedemptionRequest(item.id, {
    actorName,
    actorRole,
    reason: reason || 'stale_request',
    adminNote,
    metadata: { autoExpired: true, staleThresholdDays: threshold },
  }).request);

  return {
    thresholdDays: threshold,
    includeApproved,
    count: items.length,
    items,
    queue: buildRewardRedemptionQueue({ limit: 20 }),
  };
}

function fulfillRewardRedemptionRequest(requestId, { actorName, actorRole, adminNote, metadata } = {}) {
  const existing = ensureRewardRequest(requestId);
  if (existing.status !== 'approved') {
    const error = new Error('Only approved requests can be fulfilled');
    error.statusCode = 409;
    throw error;
  }

  if (existing.transactionId) {
    return { request: existing, transaction: repository.findRewardTransactionById(existing.transactionId), snapshot: buildLearnerRewards(existing.studentId) };
  }

  const item = getRewardStoreItem(existing.rewardItemId);
  if (!item) {
    const error = new Error('Reward item not found');
    error.statusCode = 404;
    throw error;
  }

  const snapshot = buildLearnerRewards(existing.studentId);
  if ((snapshot?.totalXp || 0) < Number(existing.xpCost || item.xpCost || 0)) {
    const error = new Error('Learner no longer has enough XP to fulfill this request');
    error.statusCode = 409;
    throw error;
  }

  const transaction = repository.createRewardTransaction({
    studentId: existing.studentId,
    kind: 'redemption',
    xpDelta: Number(existing.xpCost || item.xpCost || 0) * -1,
    label: `Redeemed ${item.title}`,
    metadata: {
      rewardItemId: item.id,
      rewardRequestId: existing.id,
      rewardKind: item.kind,
      fulfilledBy: actorName || 'Unknown actor',
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
    },
  });

  const updated = repository.updateRewardRedemptionRequest(requestId, {
    status: 'fulfilled',
    fulfilledAt: new Date().toISOString(),
    fulfilledBy: actorName || 'Unknown actor',
    transactionId: transaction.id,
    adminNote: adminNote !== undefined ? adminNote : existing.adminNote,
    metadata: { ...(existing.metadata || {}), fulfilledByRole: actorRole || 'admin', transactionId: transaction.id },
  });

  return { request: updated, transaction, snapshot: buildLearnerRewards(updated.studentId) };
}

function buildRewardOpsSummary({ cohortId = null, podId = null, mallamId = null } = {}) {
  const fulfillment = buildRewardFulfillmentReport({ cohortId, podId, mallamId, limit: 10 });
  const students = buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const transactions = repository.listRewardTransactions().filter((item) => studentIds.has(item.studentId));
  const adjustments = repository.listRewardAdjustments().filter((item) => studentIds.has(item.studentId));
  const requests = repository.listRewardRedemptionRequests().filter((item) => studentIds.has(item.studentId));

  return {
    learnerCount: students.length,
    transactionCount: transactions.length,
    totalXpAwarded: transactions.reduce((sum, item) => sum + Number(item.xpDelta || 0), 0),
    totalXpRedeemed: transactions.filter((item) => item.kind === 'redemption').reduce((sum, item) => sum + Math.abs(Number(item.xpDelta || 0)), 0),
    correctionCount: adjustments.filter((item) => item.action === 'corrected').length,
    revocationCount: adjustments.filter((item) => item.action === 'revoked').length,
    rewardRequestCount: requests.length,
    pendingRequestCount: requests.filter((item) => item.status === 'pending').length,
    approvedRequestCount: requests.filter((item) => item.status === 'approved').length,
    fulfilledRequestCount: requests.filter((item) => item.status === 'fulfilled').length,
    rejectedRequestCount: requests.filter((item) => item.status === 'rejected').length,
    cancelledRequestCount: requests.filter((item) => item.status === 'cancelled').length,
    requestBacklogFresh: fulfillment.summary.backlog.fresh,
    requestBacklogAttention: fulfillment.summary.backlog.attention,
    requestBacklogUrgent: fulfillment.summary.backlog.urgent,
    averageFulfillmentHours: fulfillment.summary.averageFulfillmentHours,
    lastAdjustedAt: adjustments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt ?? null,
    lastRequestAt: requests.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0]?.updatedAt ?? requests.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt ?? null,
  };
}

function correctRewardTransaction(transactionId, { xpDelta, label, reason, note, actorName, actorRole, metadata } = {}) {
  const existing = repository.findRewardTransactionById(transactionId);
  if (!existing) {
    const error = new Error('Reward transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const nextXpDelta = Number(xpDelta);
  if (!Number.isFinite(nextXpDelta)) {
    const error = new Error('Invalid xpDelta');
    error.statusCode = 400;
    throw error;
  }

  const correctionDelta = nextXpDelta - Number(existing.xpDelta || 0);
  const correction = repository.createRewardTransaction({
    studentId: existing.studentId,
    lessonId: existing.lessonId || null,
    moduleId: existing.moduleId || null,
    subjectId: existing.subjectId || null,
    kind: 'correction',
    xpDelta: correctionDelta,
    badgeId: existing.badgeId || null,
    label: label || `Correction for ${existing.label || existing.id}`,
    metadata: {
      ...((metadata && typeof metadata === 'object') ? metadata : {}),
      sourceTransactionId: existing.id,
      sourceKind: existing.kind,
      correctedToXpDelta: nextXpDelta,
      reason: reason || 'manual_correction',
    },
  });

  const adjustment = repository.createRewardAdjustment({
    transactionId: existing.id,
    studentId: existing.studentId,
    action: 'corrected',
    reason: reason || 'manual_correction',
    note: note || '',
    actorName,
    actorRole,
    before: existing,
    after: correction,
  });

  return {
    source: existing,
    correction,
    adjustment,
    snapshot: buildLearnerRewards(existing.studentId),
  };
}

function revokeRewardTransaction(transactionId, { reason, note, actorName, actorRole, metadata } = {}) {
  const existing = repository.findRewardTransactionById(transactionId);
  if (!existing) {
    const error = new Error('Reward transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const alreadyRevoked = repository
    .listRewardAdjustments()
    .some((item) => item.transactionId === existing.id && item.action === 'revoked');

  if (alreadyRevoked) {
    const error = new Error('Reward transaction already revoked');
    error.statusCode = 409;
    throw error;
  }

  const reversal = repository.createRewardTransaction({
    studentId: existing.studentId,
    lessonId: existing.lessonId || null,
    moduleId: existing.moduleId || null,
    subjectId: existing.subjectId || null,
    kind: 'revocation',
    xpDelta: Number(existing.xpDelta || 0) * -1,
    badgeId: existing.badgeId || null,
    label: `Revocation for ${existing.label || existing.id}`,
    metadata: {
      ...((metadata && typeof metadata === 'object') ? metadata : {}),
      sourceTransactionId: existing.id,
      sourceKind: existing.kind,
      reason: reason || 'manual_revocation',
    },
  });

  const adjustment = repository.createRewardAdjustment({
    transactionId: existing.id,
    studentId: existing.studentId,
    action: 'revoked',
    reason: reason || 'manual_revocation',
    note: note || '',
    actorName,
    actorRole,
    before: existing,
    after: reversal,
  });

  return {
    source: existing,
    reversal,
    adjustment,
    snapshot: buildLearnerRewards(existing.studentId),
  };
}

module.exports = {
  XP_RULES,
  BADGE_DEFINITIONS,
  LEVEL_THRESHOLDS,
  REWARD_STORE_ITEMS,
  buildRewardsCatalog,
  buildLearnerRewardHub,
  buildLearnerRewards,
  buildLeaderboard,
  buildRewardHistory,
  buildScopedLeaderboard,
  buildRewardOpsSummary,
  listRewardTransactions,
  listRewardAdjustments,
  listRewardRedemptionRequests,
  buildRewardRequestHistory,
  buildRewardRedemptionQueue,
  buildRewardRequestDetail,
  buildRewardFulfillmentReport,
  createRewardRedemptionRequest,
  approveRewardRedemptionRequest,
  rejectRewardRedemptionRequest,
  cancelRewardRedemptionRequest,
  reopenRewardRedemptionRequest,
  requeueRewardRedemptionRequest,
  expireRewardRedemptionRequest,
  expireStaleRewardRedemptionRequests,
  fulfillRewardRedemptionRequest,
  getRewardRequestAgeDays,
  getRewardRequestLifecycleHours,
  getRewardStoreItem,
  awardLessonCompletion,
  awardManualReward,
  correctRewardTransaction,
  revokeRewardTransaction,
};