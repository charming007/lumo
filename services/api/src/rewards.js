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

function buildRewardOpsSummary({ cohortId = null, podId = null, mallamId = null } = {}) {
  const students = buildScopedStudentSet({ cohortId, podId, mallamId });
  const studentIds = new Set(students.map((student) => student.id));
  const transactions = repository.listRewardTransactions().filter((item) => studentIds.has(item.studentId));
  const adjustments = repository.listRewardAdjustments().filter((item) => studentIds.has(item.studentId));

  return {
    learnerCount: students.length,
    transactionCount: transactions.length,
    totalXpAwarded: transactions.reduce((sum, item) => sum + Number(item.xpDelta || 0), 0),
    correctionCount: adjustments.filter((item) => item.action === 'corrected').length,
    revocationCount: adjustments.filter((item) => item.action === 'revoked').length,
    lastAdjustedAt: adjustments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt ?? null,
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
  buildRewardsCatalog,
  buildLearnerRewards,
  buildLeaderboard,
  buildRewardHistory,
  buildScopedLeaderboard,
  buildRewardOpsSummary,
  listRewardTransactions,
  listRewardAdjustments,
  awardLessonCompletion,
  awardManualReward,
  correctRewardTransaction,
  revokeRewardTransaction,
};