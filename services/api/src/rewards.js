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
    id: 'helper-star',
    title: 'Helper Star',
    description: 'Celebrate teamwork with a helper star moment in class.',
    xpCost: 45,
    kind: 'recognition',
    icon: 'star',
  },
  {
    id: 'math-champion-sticker',
    title: 'Math Champion Sticker',
    description: 'Unlock a printed or digital sticker for numeracy effort.',
    xpCost: 60,
    kind: 'sticker',
    icon: 'calculate',
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

  return {
    learnerId: studentId,
    snapshot,
    availableRewards,
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

function buildRewardRequestHistory(studentId, { status = null, limit = 20 } = {}) {
  const student = repository.findStudentById(studentId);
  if (!student) return null;

  const items = repository.listRewardRedemptionRequests()
    .filter((item) => item.studentId === studentId && (!status || item.status === status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.max(1, Math.min(Number(limit || 20), 100)));

  return { learnerId: studentId, status, count: items.length, items };
}

function buildRewardRedemptionQueue({ cohortId = null, podId = null, mallamId = null, learnerId = null, status = null, limit = 50 } = {}) {
  const students = learnerId
    ? buildScopedStudentSet({ cohortId, podId, mallamId }).filter((student) => student.id === learnerId)
    : buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));

  const items = repository.listRewardRedemptionRequests()
    .filter((item) => (!studentIds.size || studentIds.has(item.studentId)) && (!status || item.status === status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.max(1, Math.min(Number(limit || 50), 100)))
    .map((item) => ({
      ...item,
      learnerName: repository.findStudentById(item.studentId)?.name || 'Unknown learner',
    }));

  return {
    items,
    meta: { cohortId, podId, mallamId, learnerId, status, count: items.length },
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
  createRewardRedemptionRequest,
  approveRewardRedemptionRequest,
  rejectRewardRedemptionRequest,
  cancelRewardRedemptionRequest,
  fulfillRewardRedemptionRequest,
  getRewardStoreItem,
  awardLessonCompletion,
  awardManualReward,
  correctRewardTransaction,
  revokeRewardTransaction,
};