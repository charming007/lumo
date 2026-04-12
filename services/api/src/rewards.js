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

function buildRewardsCatalog() {
  return {
    xpRules: XP_RULES,
    levels: LEVEL_THRESHOLDS,
    badges: BADGE_DEFINITIONS,
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

module.exports = {
  XP_RULES,
  BADGE_DEFINITIONS,
  LEVEL_THRESHOLDS,
  buildRewardsCatalog,
  buildLearnerRewards,
  buildLeaderboard,
  awardLessonCompletion,
};
