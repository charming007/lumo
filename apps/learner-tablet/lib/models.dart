enum SpeakerMode { idle, guiding, listening, affirming, waiting }

enum LessonStepType { intro, prompt, practice, reflection, celebration }

enum LessonActivityType {
  letterIntro,
  listenRepeat,
  imageChoice,
  speakAnswer,
  wordBuild,
  tapChoice,
  listenAnswer,
  oralQuiz,
}

enum LessonCompletionState { ready, inProgress, complete }

enum ResponseReview { pending, onTrack, needsSupport }

enum PracticeMode { standard, repeatAfterMe, independentCheck }

class LessonActivityMedia {
  final String kind;
  final List<String> values;

  const LessonActivityMedia({
    required this.kind,
    this.values = const [],
  });

  String? get firstValue => values.isEmpty ? null : values.first;

  factory LessonActivityMedia.fromBackend(Map<String, dynamic> json) {
    final rawValue = json['value'];
    final values = rawValue is List
        ? rawValue
            .map((item) => item.toString().trim())
            .where((item) => item.isNotEmpty)
            .toList()
        : [rawValue?.toString().trim() ?? '']
            .where((item) => item.isNotEmpty)
            .toList();

    return LessonActivityMedia(
      kind: json['kind']?.toString().trim().isNotEmpty == true
          ? json['kind'].toString().trim()
          : 'image',
      values: values,
    );
  }
}

class LessonActivityChoice {
  final String id;
  final String label;
  final bool isCorrect;
  final List<LessonActivityMedia> mediaItems;

  const LessonActivityChoice({
    required this.id,
    required this.label,
    this.isCorrect = false,
    this.mediaItems = const [],
  });

  String? get mediaKind => mediaItems.isEmpty ? null : mediaItems.first.kind;
  String? get mediaValue =>
      mediaItems.isEmpty ? null : mediaItems.first.firstValue;

  factory LessonActivityChoice.fromBackend(Map<String, dynamic> json) {
    final media = json['media'];
    final mediaItems = media is List
        ? media
            .whereType<Map>()
            .map((item) => LessonActivityMedia.fromBackend(
                Map<String, dynamic>.from(item)))
            .toList()
        : media is Map
            ? [
                LessonActivityMedia.fromBackend(
                    Map<String, dynamic>.from(media))
              ]
            : const <LessonActivityMedia>[];
    final rawCorrectness = json['correctness']?.toString().trim().toLowerCase();
    final isCorrect = json['isCorrect'] == true ||
        json['correct'] == true ||
        rawCorrectness == 'correct' ||
        rawCorrectness == 'true' ||
        rawCorrectness == 'yes' ||
        rawCorrectness == '1';
    return LessonActivityChoice(
      id: json['id']?.toString() ?? json['label']?.toString() ?? 'choice',
      label: json['label']?.toString() ?? 'Choice',
      isCorrect: isCorrect,
      mediaItems: mediaItems,
    );
  }
}

class LessonActivity {
  final LessonActivityType type;
  final String prompt;
  final String? focusText;
  final String? supportText;
  final List<String> choices;
  final List<String> choiceEmoji;
  final String? targetResponse;
  final List<String> expectedAnswers;
  final String? successFeedback;
  final String? retryFeedback;
  final List<LessonActivityMedia> mediaItems;
  final List<LessonActivityChoice> choiceItems;

  const LessonActivity({
    required this.type,
    required this.prompt,
    this.focusText,
    this.supportText,
    this.choices = const [],
    this.choiceEmoji = const [],
    this.targetResponse,
    this.expectedAnswers = const [],
    this.successFeedback,
    this.retryFeedback,
    this.mediaItems = const [],
    this.choiceItems = const [],
  });

  String? get mediaKind => mediaItems.isEmpty ? null : mediaItems.first.kind;
  String? get mediaValue =>
      mediaItems.isEmpty ? null : mediaItems.first.firstValue;
}

class RewardBadge {
  final String id;
  final String title;
  final String description;
  final String icon;
  final String category;
  final bool earned;
  final int progress;
  final int target;

  const RewardBadge({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.category,
    required this.earned,
    required this.progress,
    required this.target,
  });

  factory RewardBadge.fromJson(Map<String, dynamic> json) {
    return RewardBadge(
      id: json['id']?.toString() ?? 'badge-unknown',
      title: json['title']?.toString() ?? 'Badge',
      description: json['description']?.toString() ?? '',
      icon: json['icon']?.toString() ?? 'military_tech',
      category: json['category']?.toString() ?? 'milestone',
      earned: json['earned'] == true,
      progress: _asInt(json['progress']) ?? 0,
      target: _asInt(json['target']) ?? 1,
    );
  }
}

class RewardSnapshot {
  final String learnerId;
  final int totalXp;
  final int points;
  final int level;
  final String levelLabel;
  final int? nextLevel;
  final String? nextLevelLabel;
  final int xpIntoLevel;
  final int xpForNextLevel;
  final double progressToNextLevel;
  final int badgesUnlocked;
  final List<RewardBadge> badges;

  const RewardSnapshot({
    required this.learnerId,
    required this.totalXp,
    required this.points,
    required this.level,
    required this.levelLabel,
    this.nextLevel,
    this.nextLevelLabel,
    required this.xpIntoLevel,
    required this.xpForNextLevel,
    required this.progressToNextLevel,
    required this.badgesUnlocked,
    this.badges = const [],
  });

  factory RewardSnapshot.fromJson(Map<String, dynamic> json) {
    final badges = (json['badges'] as List?)
            ?.whereType<Map>()
            .map(
                (item) => RewardBadge.fromJson(Map<String, dynamic>.from(item)))
            .toList() ??
        const <RewardBadge>[];

    return RewardSnapshot(
      learnerId: json['learnerId']?.toString() ?? '',
      totalXp: _asInt(json['totalXp']) ?? 0,
      points: _asInt(json['points']) ?? _asInt(json['totalXp']) ?? 0,
      level: _asInt(json['level']) ?? 1,
      levelLabel: json['levelLabel']?.toString() ?? 'Starter',
      nextLevel: _asInt(json['nextLevel']),
      nextLevelLabel: json['nextLevelLabel']?.toString(),
      xpIntoLevel: _asInt(json['xpIntoLevel']) ?? 0,
      xpForNextLevel: _asInt(json['xpForNextLevel']) ?? 0,
      progressToNextLevel:
          double.tryParse(json['progressToNextLevel']?.toString() ?? '') ?? 0,
      badgesUnlocked: _asInt(json['badgesUnlocked']) ?? 0,
      badges: badges,
    );
  }
}

class LearnerProfile {
  final String id;
  final String name;
  final int age;
  final String cohort;
  final String? cohortId;
  final String? podId;
  final String? podLabel;
  final String? mallamId;
  final String? mallamName;
  final int streakDays;
  final String guardianName;
  final String preferredLanguage;
  final String readinessLabel;
  final String village;
  final String guardianPhone;
  final String sex;
  final String baselineLevel;
  final bool consentCaptured;
  final String learnerCode;
  final String caregiverRelationship;
  final String enrollmentStatus;
  final String attendanceBand;
  final String supportPlan;
  final String? profilePhotoBase64;
  final String lastLessonSummary;
  final String lastAttendance;
  final String? backendRecommendedModuleId;
  final RewardSnapshot? rewards;

  const LearnerProfile({
    required this.id,
    required this.name,
    required this.age,
    required this.cohort,
    this.cohortId,
    this.podId,
    this.podLabel,
    this.mallamId,
    this.mallamName,
    required this.streakDays,
    required this.guardianName,
    required this.preferredLanguage,
    required this.readinessLabel,
    required this.village,
    required this.guardianPhone,
    required this.sex,
    required this.baselineLevel,
    required this.consentCaptured,
    required this.learnerCode,
    this.caregiverRelationship = 'Guardian',
    this.enrollmentStatus = 'Active',
    this.attendanceBand = 'Stable attendance',
    this.supportPlan = 'Short prompts and praise after every answer.',
    this.profilePhotoBase64,
    this.lastLessonSummary = 'No lesson captured yet.',
    this.lastAttendance = 'Checked in today',
    this.backendRecommendedModuleId,
    this.rewards,
  });

  factory LearnerProfile.fromBackend(Map<String, dynamic> json) {
    final gender = (json['gender'] ?? 'unspecified').toString();
    final level = (json['level'] ?? 'beginner').toString();
    final podLabel = json['podLabel']?.toString();
    final cohortName = json['cohortName']?.toString();
    final name = json['name']?.toString() ?? 'Learner';
    final age = _asInt(json['age']) ?? 0;

    final rewardsJson = json['rewards'];

    return LearnerProfile(
      id: json['id']?.toString() ?? 'student-unknown',
      name: name,
      age: age,
      cohort: cohortName ?? 'Backend cohort',
      cohortId: json['cohortId']?.toString(),
      podId: json['podId']?.toString(),
      podLabel: podLabel,
      mallamId: json['mallamId']?.toString(),
      mallamName: json['mallamName']?.toString(),
      streakDays: _estimateStreak(json['attendanceRate']),
      guardianName: json['guardianName']?.toString() ?? 'Guardian pending',
      preferredLanguage: 'Hausa + English',
      readinessLabel: _readinessFromLevel(level),
      village: podLabel ?? 'Pod assigned',
      guardianPhone: 'Pending capture',
      sex: _sexFromGender(gender),
      baselineLevel: _baselineFromLevel(level),
      consentCaptured: true,
      learnerCode: _buildLearnerCode(name: name, cohort: cohortName, age: age),
      caregiverRelationship: 'Guardian',
      enrollmentStatus: 'Active in backend',
      attendanceBand: _attendanceBand(json['attendanceRate']),
      supportPlan: _supportPlan(level),
      profilePhotoBase64: null,
      lastLessonSummary:
          'Live backend profile loaded${podLabel == null ? '.' : ' from $podLabel.'}',
      lastAttendance: _attendanceStatus(json['attendanceRate']),
      backendRecommendedModuleId: json['recommendedModuleId']?.toString(),
      rewards: rewardsJson is Map
          ? RewardSnapshot.fromJson(Map<String, dynamic>.from(rewardsJson))
          : null,
    );
  }

  int get totalXp => rewards?.totalXp ?? (streakDays * 25 + 100);

  int get estimatedTotalMinutes => streakDays * 12 + 18;

  LearnerProfile copyWith({
    String? id,
    String? name,
    int? age,
    String? cohort,
    String? cohortId,
    String? podId,
    String? podLabel,
    String? mallamId,
    String? mallamName,
    int? streakDays,
    String? guardianName,
    String? preferredLanguage,
    String? readinessLabel,
    String? village,
    String? guardianPhone,
    String? sex,
    String? baselineLevel,
    bool? consentCaptured,
    String? learnerCode,
    String? caregiverRelationship,
    String? enrollmentStatus,
    String? attendanceBand,
    String? supportPlan,
    String? profilePhotoBase64,
    String? lastLessonSummary,
    String? lastAttendance,
    String? backendRecommendedModuleId,
    RewardSnapshot? rewards,
  }) {
    return LearnerProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      age: age ?? this.age,
      cohort: cohort ?? this.cohort,
      cohortId: cohortId ?? this.cohortId,
      podId: podId ?? this.podId,
      podLabel: podLabel ?? this.podLabel,
      mallamId: mallamId ?? this.mallamId,
      mallamName: mallamName ?? this.mallamName,
      streakDays: streakDays ?? this.streakDays,
      guardianName: guardianName ?? this.guardianName,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      readinessLabel: readinessLabel ?? this.readinessLabel,
      village: village ?? this.village,
      guardianPhone: guardianPhone ?? this.guardianPhone,
      sex: sex ?? this.sex,
      baselineLevel: baselineLevel ?? this.baselineLevel,
      consentCaptured: consentCaptured ?? this.consentCaptured,
      learnerCode: learnerCode ?? this.learnerCode,
      caregiverRelationship:
          caregiverRelationship ?? this.caregiverRelationship,
      enrollmentStatus: enrollmentStatus ?? this.enrollmentStatus,
      attendanceBand: attendanceBand ?? this.attendanceBand,
      supportPlan: supportPlan ?? this.supportPlan,
      profilePhotoBase64: profilePhotoBase64 ?? this.profilePhotoBase64,
      lastLessonSummary: lastLessonSummary ?? this.lastLessonSummary,
      lastAttendance: lastAttendance ?? this.lastAttendance,
      backendRecommendedModuleId:
          backendRecommendedModuleId ?? this.backendRecommendedModuleId,
      rewards: rewards ?? this.rewards,
    );
  }
}

class RegistrationDraft {
  final String name;
  final String age;
  final String cohort;
  final String guardianName;
  final String preferredLanguage;
  final String readinessLabel;
  final String village;
  final String guardianPhone;
  final String sex;
  final String baselineLevel;
  final bool consentCaptured;
  final String caregiverRelationship;
  final String supportPlan;
  final String? profilePhotoBase64;
  final String mallamId;

  const RegistrationDraft({
    this.name = '',
    this.age = '',
    this.cohort = '',
    this.guardianName = '',
    this.preferredLanguage = 'Hausa',
    this.readinessLabel = 'Voice-first beginner',
    this.village = '',
    this.guardianPhone = '',
    this.sex = 'Boy',
    this.baselineLevel = 'No prior exposure',
    this.consentCaptured = false,
    this.caregiverRelationship = 'Mother',
    this.supportPlan = 'Use short prompts and repeat once when needed.',
    this.profilePhotoBase64,
    this.mallamId = '',
  });

  RegistrationDraft copyWith({
    String? name,
    String? age,
    String? cohort,
    String? guardianName,
    String? preferredLanguage,
    String? readinessLabel,
    String? village,
    String? guardianPhone,
    String? sex,
    String? baselineLevel,
    bool? consentCaptured,
    String? caregiverRelationship,
    String? supportPlan,
    String? profilePhotoBase64,
    String? mallamId,
  }) {
    return RegistrationDraft(
      name: name ?? this.name,
      age: age ?? this.age,
      cohort: cohort ?? this.cohort,
      guardianName: guardianName ?? this.guardianName,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      readinessLabel: readinessLabel ?? this.readinessLabel,
      village: village ?? this.village,
      guardianPhone: guardianPhone ?? this.guardianPhone,
      sex: sex ?? this.sex,
      baselineLevel: baselineLevel ?? this.baselineLevel,
      consentCaptured: consentCaptured ?? this.consentCaptured,
      caregiverRelationship:
          caregiverRelationship ?? this.caregiverRelationship,
      supportPlan: supportPlan ?? this.supportPlan,
      profilePhotoBase64: profilePhotoBase64 ?? this.profilePhotoBase64,
      mallamId: mallamId ?? this.mallamId,
    );
  }

  bool get isValid =>
      name.trim().isNotEmpty &&
      int.tryParse(age.trim()) != null &&
      guardianName.trim().isNotEmpty &&
      village.trim().isNotEmpty &&
      guardianPhone.trim().length >= 7 &&
      supportPlan.trim().length >= 12 &&
      consentCaptured;

  int get completionScore {
    var score = 0;
    if (name.trim().isNotEmpty) score += 10;
    if (int.tryParse(age.trim()) != null) score += 10;
    if (cohort.trim().isNotEmpty) score += 10;
    if (guardianName.trim().isNotEmpty) score += 10;
    if (village.trim().isNotEmpty) score += 10;
    if (guardianPhone.trim().length >= 7) score += 10;
    if (caregiverRelationship.trim().isNotEmpty) score += 10;
    if (baselineLevel.trim().isNotEmpty) score += 10;
    if (supportPlan.trim().length >= 12) score += 10;
    if (consentCaptured) score += 10;
    return score;
  }

  String get learnerCode {
    final cleanedName = name.trim().isEmpty
        ? 'NEW'
        : name.trim().replaceAll(RegExp(r'[^A-Za-z]'), '').toUpperCase();
    final prefix = cleanedName.isEmpty
        ? 'NEW'
        : cleanedName.substring(0, cleanedName.length.clamp(0, 3));
    final cohortCode = cohort.trim().isEmpty
        ? 'GEN'
        : cohort
            .trim()
            .split(' ')
            .map((part) => part.isEmpty ? '' : part[0])
            .join()
            .toUpperCase();
    final ageCode = age.trim().isEmpty ? '00' : age.trim().padLeft(2, '0');
    return '${prefix.padRight(3, 'X')}-${cohortCode.padRight(2, 'G')}$ageCode';
  }

  String get placementSummary {
    final ageValue = int.tryParse(age.trim());
    if (readinessLabel == 'Voice-first beginner') {
      return ageValue != null && ageValue <= 8
          ? 'Start with guided greetings, one-word checks, and slow repetition.'
          : 'Start with voice-led prompts before any independent speaking task.';
    }
    if (readinessLabel == 'Ready for guided practice') {
      return 'Use short practice loops, one hint maximum, then check recall.';
    }
    return 'Move quickly into retell tasks and independent spoken answers.';
  }

  String get riskFlag {
    final ageValue = int.tryParse(age.trim());
    if (ageValue != null &&
        ageValue >= 12 &&
        readinessLabel == 'Voice-first beginner') {
      return 'Needs closer placement review';
    }
    if (guardianPhone.trim().length < 10) {
      return 'Phone number should be verified';
    }
    return 'No blocker for pilot';
  }

  List<String> get missingFields {
    final items = <String>[];
    if (name.trim().isEmpty) items.add('Learner name');
    if (int.tryParse(age.trim()) == null) items.add('Valid age');
    if (cohort.trim().isEmpty) items.add('Assigned cohort');
    if (guardianName.trim().isEmpty) items.add('Guardian name');
    if (village.trim().isEmpty) items.add('Village');
    if (guardianPhone.trim().length < 7) items.add('Guardian phone');
    if (supportPlan.trim().length < 12) items.add('Support plan');
    if (!consentCaptured) items.add('Consent');
    return items;
  }

  String get backendGender => sex == 'Girl' ? 'female' : 'male';

  String get backendLevel {
    switch (readinessLabel) {
      case 'Confident responder':
        return 'confident';
      case 'Ready for guided practice':
        return 'emerging';
      case 'Voice-first beginner':
      default:
        return 'beginner';
    }
  }

  String get backendStage {
    switch (backendLevel) {
      case 'confident':
        return 'bridge';
      case 'emerging':
        return 'foundation-b';
      case 'beginner':
      default:
        return 'foundation-a';
    }
  }

  Map<String, dynamic> get backendPayloadPreview => {
        'learnerCode': learnerCode,
        'fullName': name.trim(),
        'age': int.tryParse(age.trim()),
        'sex': sex,
        'cohort':
            cohort.trim().isEmpty ? 'Assigned from backend' : cohort.trim(),
        'village': village.trim(),
        'guardian': {
          'name': guardianName.trim(),
          'relationship': caregiverRelationship,
          'phone': guardianPhone.trim(),
        },
        'placement': {
          'preferredLanguage': preferredLanguage,
          'readinessLabel': readinessLabel,
          'baselineLevel': baselineLevel,
          'supportPlan': supportPlan.trim(),
          'riskFlag': riskFlag,
        },
        'consentCaptured': consentCaptured,
        'syncStatus': 'posts_to_backend',
      };
}

class LumoModuleBundle {
  final LearningModule module;
  final List<LessonCardModel> lessons;

  const LumoModuleBundle({
    required this.module,
    this.lessons = const [],
  });
}

class BackendLessonSession {
  final String id;
  final String sessionId;
  final String studentId;
  final String? learnerCode;
  final String? lessonId;
  final String? lessonTitle;
  final String? moduleId;
  final String? moduleTitle;
  final String status;
  final String completionState;
  final String automationStatus;
  final int currentStepIndex;
  final int stepsTotal;
  final int responsesCaptured;
  final int supportActionsUsed;
  final int audioCaptures;
  final int facilitatorObservations;
  final String? latestReview;
  final DateTime? startedAt;
  final DateTime? lastActivityAt;
  final DateTime? completedAt;

  const BackendLessonSession({
    required this.id,
    required this.sessionId,
    required this.studentId,
    this.learnerCode,
    this.lessonId,
    this.lessonTitle,
    this.moduleId,
    this.moduleTitle,
    required this.status,
    required this.completionState,
    required this.automationStatus,
    required this.currentStepIndex,
    required this.stepsTotal,
    required this.responsesCaptured,
    required this.supportActionsUsed,
    required this.audioCaptures,
    required this.facilitatorObservations,
    this.latestReview,
    this.startedAt,
    this.lastActivityAt,
    this.completedAt,
  });

  factory BackendLessonSession.fromJson(Map<String, dynamic> json) {
    return BackendLessonSession(
      id: json['id']?.toString() ??
          json['sessionId']?.toString() ??
          'runtime-session',
      sessionId: json['sessionId']?.toString() ??
          json['id']?.toString() ??
          'runtime-session',
      studentId: json['studentId']?.toString() ?? '',
      learnerCode: json['learnerCode']?.toString(),
      lessonId: json['lessonId']?.toString(),
      lessonTitle: json['lessonTitle']?.toString(),
      moduleId: json['moduleId']?.toString(),
      moduleTitle: json['moduleTitle']?.toString(),
      status: json['status']?.toString() ?? 'in_progress',
      completionState: json['completionState']?.toString() ?? 'inProgress',
      automationStatus: json['automationStatus']?.toString() ?? 'guided',
      currentStepIndex: _asInt(json['currentStepIndex']) ?? 0,
      stepsTotal: _asInt(json['stepsTotal']) ?? 0,
      responsesCaptured: _asInt(json['responsesCaptured']) ?? 0,
      supportActionsUsed: _asInt(json['supportActionsUsed']) ?? 0,
      audioCaptures: _asInt(json['audioCaptures']) ?? 0,
      facilitatorObservations: _asInt(json['facilitatorObservations']) ?? 0,
      latestReview: json['latestReview']?.toString(),
      startedAt: DateTime.tryParse(json['startedAt']?.toString() ?? ''),
      lastActivityAt:
          DateTime.tryParse(json['lastActivityAt']?.toString() ?? ''),
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? ''),
    );
  }

  double get progressRatio {
    if (stepsTotal <= 0) return 0;
    final ratio = currentStepIndex / stepsTotal;
    if (ratio < 0) return 0;
    if (ratio > 1) return 1;
    return ratio;
  }

  String get statusLabel {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'abandoned':
        return 'Abandoned';
      default:
        return 'In progress';
    }
  }

  String get progressLabel {
    if (stepsTotal <= 0) return 'Step tracking pending';
    final stepNumber = currentStepIndex <= 0 ? 1 : currentStepIndex;
    return 'Step $stepNumber of $stepsTotal';
  }
}

class LearnerAssignmentPack {
  final String assignmentId;
  final String lessonId;
  final String moduleId;
  final String? curriculumModuleId;
  final String lessonTitle;
  final String? cohortName;
  final String? mallamName;
  final String? dueDate;
  final String? assessmentTitle;
  final List<String> eligibleLearnerIds;

  const LearnerAssignmentPack({
    required this.assignmentId,
    required this.lessonId,
    required this.moduleId,
    this.curriculumModuleId,
    required this.lessonTitle,
    this.cohortName,
    this.mallamName,
    this.dueDate,
    this.assessmentTitle,
    this.eligibleLearnerIds = const [],
  });

  factory LearnerAssignmentPack.fromJson(Map<String, dynamic> json) {
    final lessonPack = json['lessonPack'];
    final assessment = json['assessment'];
    final eligibleLearners = (json['eligibleLearners'] as List?)
            ?.whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList() ??
        const <Map<String, dynamic>>[];

    return LearnerAssignmentPack(
      assignmentId: json['assignmentId']?.toString() ?? 'assignment-unknown',
      lessonId: lessonPack is Map
          ? lessonPack['lessonId']?.toString() ?? 'lesson-unknown'
          : 'lesson-unknown',
      moduleId: lessonPack is Map
          ? lessonPack['moduleKey']?.toString() ??
              lessonPack['subjectId']?.toString() ??
              'english'
          : 'english',
      curriculumModuleId: lessonPack is Map
          ? lessonPack['curriculumModuleId']?.toString()
          : null,
      lessonTitle: lessonPack is Map
          ? lessonPack['lessonTitle']?.toString() ?? 'Assigned lesson'
          : 'Assigned lesson',
      cohortName: json['cohortName']?.toString(),
      mallamName: json['mallamName']?.toString(),
      dueDate: json['dueDate']?.toString(),
      assessmentTitle:
          assessment is Map ? assessment['title']?.toString() : null,
      eligibleLearnerIds: eligibleLearners
          .map((item) => item['id']?.toString())
          .whereType<String>()
          .toList(),
    );
  }
}

class LearningModule {
  final String id;
  final String title;
  final String description;
  final String voicePrompt;
  final String readinessGoal;
  final String badge;
  final String status;

  const LearningModule({
    required this.id,
    required this.title,
    required this.description,
    required this.voicePrompt,
    required this.readinessGoal,
    required this.badge,
    this.status = 'published',
  });

  factory LearningModule.fromBackend(Map<String, dynamic> json) {
    final subjectId = json['subjectId']?.toString().trim();
    final moduleId = json['id']?.toString().trim();
    final resolvedModuleId = moduleId != null && moduleId.isNotEmpty
        ? moduleId
        : subjectId != null && subjectId.isNotEmpty
            ? subjectId
            : 'module';
    final resolvedSubjectId = subjectId != null && subjectId.isNotEmpty
        ? subjectId
        : resolvedModuleId;
    final subjectName = json['subjectName']?.toString().trim();
    final title = json['title']?.toString().trim();
    final level = json['level']?.toString() ?? 'beginner';
    final badge = json['badge']?.toString().trim();

    final moduleTitle = title != null && title.isNotEmpty
        ? title
        : subjectName != null && subjectName.isNotEmpty
            ? subjectName
            : 'Learning module';
    final description = json['description']?.toString().trim();
    final voicePrompt = json['voicePrompt']?.toString().trim();
    final readinessGoal = json['readinessGoal']?.toString().trim();

    return LearningModule(
      id: resolvedModuleId,
      title: moduleTitle,
      description: description != null && description.isNotEmpty
          ? description
          : 'Live ${moduleTitle.toLowerCase()} path for ${subjectName?.toLowerCase() ?? 'learning'} learners.',
      voicePrompt: voicePrompt != null && voicePrompt.isNotEmpty
          ? voicePrompt
          : 'We are opening $moduleTitle. Follow Mallam one step at a time.',
      readinessGoal: readinessGoal != null && readinessGoal.isNotEmpty
          ? readinessGoal
          : _moduleGoal(level, resolvedSubjectId),
      badge: badge != null && badge.isNotEmpty ? badge : 'Live backend',
      status: json['status']?.toString() ??
          json['releaseStatus']?.toString() ??
          'published',
    );
  }
}

class LessonStep {
  final String id;
  final LessonStepType type;
  final String title;
  final String instruction;
  final String expectedResponse;
  final List<String> acceptableResponses;
  final String coachPrompt;
  final String facilitatorTip;
  final String realWorldCheck;
  final SpeakerMode speakerMode;
  final LessonActivity? activity;

  const LessonStep({
    required this.id,
    required this.type,
    required this.title,
    required this.instruction,
    required this.expectedResponse,
    this.acceptableResponses = const [],
    required this.coachPrompt,
    required this.facilitatorTip,
    required this.realWorldCheck,
    required this.speakerMode,
    this.activity,
  });
}

class LessonCardModel {
  final String id;
  final String moduleId;
  final String title;
  final String subject;
  final int durationMinutes;
  final String status;
  final String mascotName;
  final String readinessFocus;
  final String scenario;
  final List<LessonStep> steps;

  const LessonCardModel({
    required this.id,
    required this.moduleId,
    required this.title,
    required this.subject,
    required this.durationMinutes,
    required this.status,
    required this.mascotName,
    required this.readinessFocus,
    required this.scenario,
    required this.steps,
  });

  bool get isAssignmentPlaceholder => id.startsWith('assignment-placeholder:');

  factory LessonCardModel.fromBackend(Map<String, dynamic> json) {
    final moduleId = json['moduleId']?.toString() ?? 'english';
    final title = json['title']?.toString() ?? 'Guided lesson';
    final subject = json['subject']?.toString() ?? 'Learning';
    final activitySteps = _readBackendActivitySteps(json);

    return LessonCardModel(
      id: json['id']?.toString() ?? 'lesson-unknown',
      moduleId: moduleId,
      title: title,
      subject: subject,
      durationMinutes: _asInt(json['durationMinutes']) ?? 8,
      status: json['status']?.toString() ?? 'published',
      mascotName: json['mascotName']?.toString() ?? 'Mallam',
      readinessFocus:
          json['readinessFocus']?.toString() ?? 'Guided voice practice',
      scenario:
          json['scenario']?.toString() ?? 'Guided $subject session for $title.',
      steps: activitySteps,
    );
  }
}

class SessionTurn {
  final String speaker;
  final String text;
  final ResponseReview review;
  final DateTime timestamp;

  const SessionTurn({
    required this.speaker,
    required this.text,
    this.review = ResponseReview.pending,
    required this.timestamp,
  });
}

class LessonSessionState {
  final String sessionId;
  final LessonCardModel lesson;
  final int stepIndex;
  final LessonCompletionState completionState;
  final SpeakerMode speakerMode;
  final String? latestLearnerResponse;
  final ResponseReview latestReview;
  final int supportActionsUsed;
  final int attemptsThisStep;
  final List<String> facilitatorObservations;
  final List<SessionTurn> transcript;
  final DateTime startedAt;
  final String audioInputMode;
  final String speakerOutputMode;
  final int totalResponses;
  final int totalAudioCaptures;
  final String? latestLearnerAudioPath;
  final Duration? latestLearnerAudioDuration;
  final String lastSupportType;
  final String automationStatus;
  final PracticeMode practiceMode;
  final DateTime lastUpdatedAt;

  const LessonSessionState({
    required this.sessionId,
    required this.lesson,
    this.stepIndex = 0,
    this.completionState = LessonCompletionState.ready,
    this.speakerMode = SpeakerMode.guiding,
    this.latestLearnerResponse,
    this.latestReview = ResponseReview.pending,
    this.supportActionsUsed = 0,
    this.attemptsThisStep = 0,
    this.facilitatorObservations = const [],
    this.transcript = const [],
    required this.startedAt,
    this.audioInputMode = 'Facilitator typed capture',
    this.speakerOutputMode = 'Tablet speaker',
    this.totalResponses = 0,
    this.totalAudioCaptures = 0,
    this.latestLearnerAudioPath,
    this.latestLearnerAudioDuration,
    this.lastSupportType = 'Prompt replay',
    this.automationStatus = 'Mallam is ready to begin.',
    this.practiceMode = PracticeMode.standard,
    DateTime? lastUpdatedAt,
  }) : lastUpdatedAt = lastUpdatedAt ?? startedAt;

  LessonStep get currentStep => lesson.steps[stepIndex];

  bool get isLastStep => stepIndex >= lesson.steps.length - 1;

  bool get hasResponse =>
      latestLearnerResponse != null && latestLearnerResponse!.trim().isNotEmpty;

  bool get hasLearnerInput =>
      hasResponse ||
      (latestLearnerAudioPath != null &&
          latestLearnerAudioPath!.trim().isNotEmpty);

  double get progress =>
      lesson.steps.isEmpty ? 0 : (stepIndex + 1) / lesson.steps.length;

  int get elapsedMinutes {
    final diff = DateTime.now().difference(startedAt).inMinutes;
    return diff <= 0 ? 1 : diff;
  }

  Map<String, dynamic> syncPayloadPreview({required String learnerCode}) => {
        'sessionId': sessionId,
        'learnerCode': learnerCode,
        'lessonId': lesson.id,
        'moduleId': lesson.moduleId,
        'stepIndex': stepIndex + 1,
        'stepsTotal': lesson.steps.length,
        'completionState': completionState.name,
        'latestResponse': latestLearnerResponse,
        'review': latestReview.name,
        'supportActionsUsed': supportActionsUsed,
        'lastSupportType': lastSupportType,
        'audioInputMode': audioInputMode,
        'speakerOutputMode': speakerOutputMode,
        'practiceMode': practiceMode.name,
        'totalAudioCaptures': totalAudioCaptures,
        'latestLearnerAudioPath': latestLearnerAudioPath,
        'latestLearnerAudioDurationSeconds':
            latestLearnerAudioDuration?.inSeconds,
        'observations': facilitatorObservations,
        'transcriptTurns': transcript.length,
        'startedAt': startedAt.toIso8601String(),
        'updatedAt': lastUpdatedAt.toIso8601String(),
        'durationMinutes': elapsedMinutes,
        'syncStatus': 'queued_offline',
      };

  LessonSessionState copyWith({
    String? sessionId,
    LessonCardModel? lesson,
    int? stepIndex,
    LessonCompletionState? completionState,
    SpeakerMode? speakerMode,
    String? latestLearnerResponse,
    ResponseReview? latestReview,
    int? supportActionsUsed,
    int? attemptsThisStep,
    List<String>? facilitatorObservations,
    List<SessionTurn>? transcript,
    DateTime? startedAt,
    String? audioInputMode,
    String? speakerOutputMode,
    int? totalResponses,
    int? totalAudioCaptures,
    String? latestLearnerAudioPath,
    Duration? latestLearnerAudioDuration,
    String? lastSupportType,
    String? automationStatus,
    PracticeMode? practiceMode,
    DateTime? lastUpdatedAt,
    bool clearLatestLearnerResponse = false,
    bool clearLatestLearnerAudio = false,
  }) {
    return LessonSessionState(
      sessionId: sessionId ?? this.sessionId,
      lesson: lesson ?? this.lesson,
      stepIndex: stepIndex ?? this.stepIndex,
      completionState: completionState ?? this.completionState,
      speakerMode: speakerMode ?? this.speakerMode,
      latestLearnerResponse: clearLatestLearnerResponse
          ? null
          : (latestLearnerResponse ?? this.latestLearnerResponse),
      latestReview: latestReview ?? this.latestReview,
      supportActionsUsed: supportActionsUsed ?? this.supportActionsUsed,
      attemptsThisStep: attemptsThisStep ?? this.attemptsThisStep,
      facilitatorObservations:
          facilitatorObservations ?? this.facilitatorObservations,
      transcript: transcript ?? this.transcript,
      startedAt: startedAt ?? this.startedAt,
      audioInputMode: audioInputMode ?? this.audioInputMode,
      speakerOutputMode: speakerOutputMode ?? this.speakerOutputMode,
      totalResponses: totalResponses ?? this.totalResponses,
      totalAudioCaptures: totalAudioCaptures ?? this.totalAudioCaptures,
      latestLearnerAudioPath: clearLatestLearnerAudio
          ? null
          : (latestLearnerAudioPath ?? this.latestLearnerAudioPath),
      latestLearnerAudioDuration: clearLatestLearnerAudio
          ? null
          : (latestLearnerAudioDuration ?? this.latestLearnerAudioDuration),
      lastSupportType: lastSupportType ?? this.lastSupportType,
      automationStatus: automationStatus ?? this.automationStatus,
      practiceMode: practiceMode ?? this.practiceMode,
      lastUpdatedAt: lastUpdatedAt ?? DateTime.now(),
    );
  }
}

class SyncEvent {
  final String id;
  final String type;
  final Map<String, dynamic> payload;

  const SyncEvent({
    required this.id,
    required this.type,
    required this.payload,
  });
}

class BackendCohort {
  final String id;
  final String name;
  final String podId;

  const BackendCohort({
    required this.id,
    required this.name,
    required this.podId,
  });

  factory BackendCohort.fromJson(Map<String, dynamic> json) {
    return BackendCohort(
      id: json['id']?.toString() ?? 'cohort-unknown',
      name: json['name']?.toString() ?? 'Backend cohort',
      podId: json['podId']?.toString() ?? '',
    );
  }
}

class BackendMallam {
  final String id;
  final String name;
  final List<String> podIds;

  const BackendMallam({
    required this.id,
    required this.name,
    required this.podIds,
  });

  factory BackendMallam.fromJson(Map<String, dynamic> json) {
    final podIds =
        (json['podIds'] as List?)?.map((item) => item.toString()).toList() ??
            const <String>[];

    return BackendMallam(
      id: json['id']?.toString() ?? 'mallam-unknown',
      name: (json['displayName'] ?? json['name'] ?? 'Mallam').toString(),
      podIds: podIds,
    );
  }
}

class RegistrationContext {
  final List<BackendCohort> cohorts;
  final List<BackendMallam> mallams;
  final RegistrationTarget? defaultTarget;
  final TabletRegistration? tabletRegistration;

  const RegistrationContext({
    this.cohorts = const [],
    this.mallams = const [],
    this.defaultTarget,
    this.tabletRegistration,
  });

  BackendCohort? findCohortByName(String? cohortName) {
    final normalized = cohortName?.trim().toLowerCase();
    if (normalized == null || normalized.isEmpty) return null;
    for (final cohort in cohorts) {
      if (cohort.name.trim().toLowerCase() == normalized) {
        return cohort;
      }
    }
    return null;
  }

  RegistrationTarget? resolveTargetForCohortName(
    String? cohortName, {
    String? preferredMallamId,
  }) {
    final cohort = findCohortByName(cohortName);
    if (cohort == null) {
      return defaultTarget ??
          (isReady
              ? resolveTarget(preferredMallamId: preferredMallamId)
              : null);
    }

    final preferredMallam = findMallamById(preferredMallamId);
    final mallam = preferredMallam ??
        mallams.firstWhere(
          (item) => item.podIds.contains(cohort.podId),
          orElse: () => defaultTarget?.mallam ?? mallams.first,
        );
    return RegistrationTarget(cohort: cohort, mallam: mallam);
  }

  factory RegistrationContext.fromJson(Map<String, dynamic> json) {
    final cohorts = (json['cohorts'] as List?)
            ?.whereType<Map>()
            .map((item) =>
                BackendCohort.fromJson(Map<String, dynamic>.from(item)))
            .toList() ??
        const <BackendCohort>[];
    final mallams = (json['mallams'] as List?)
            ?.whereType<Map>()
            .map((item) =>
                BackendMallam.fromJson(Map<String, dynamic>.from(item)))
            .toList() ??
        const <BackendMallam>[];
    final defaultTargetJson = json['defaultTarget'];

    RegistrationTarget? defaultTarget;
    if (defaultTargetJson is Map) {
      final targetMap = Map<String, dynamic>.from(defaultTargetJson);
      final cohortId = targetMap['cohortId']?.toString();
      final mallamId = targetMap['mallamId']?.toString();
      final cohort = cohorts.cast<BackendCohort?>().firstWhere(
            (item) => item?.id == cohortId,
            orElse: () => null,
          );
      final mallam = mallams.cast<BackendMallam?>().firstWhere(
            (item) => item?.id == mallamId,
            orElse: () => null,
          );
      if (cohort != null && mallam != null) {
        defaultTarget = RegistrationTarget(cohort: cohort, mallam: mallam);
      }
    }

    return RegistrationContext(
      cohorts: cohorts,
      mallams: mallams,
      defaultTarget: defaultTarget,
      tabletRegistration: json['tabletRegistration'] is Map
          ? TabletRegistration.fromJson(
              Map<String, dynamic>.from(json['tabletRegistration'] as Map),
            )
          : null,
    );
  }

  BackendMallam? findMallamById(String? mallamId) {
    final normalized = mallamId?.trim().toLowerCase();
    if (normalized == null || normalized.isEmpty) return null;
    for (final mallam in mallams) {
      if (mallam.id.trim().toLowerCase() == normalized) return mallam;
    }
    return null;
  }

  bool get isReady => cohorts.isNotEmpty && mallams.isNotEmpty;

  String get summary {
    if (tabletRegistration != null) {
      final pod = tabletRegistration!.podLabel ?? tabletRegistration!.podId ?? 'Pod';
      final mallam = tabletRegistration!.mallamName;
      if (mallam != null && mallam.isNotEmpty) return '$pod • $mallam';
      return pod;
    }
    if (!isReady) return 'Backend assignment mapping not loaded yet.';
    final target = resolveTarget();
    return '${target.cohort.name} • ${target.mallam.name}';
  }

  RegistrationTarget resolveTarget({String? preferredMallamId}) {
    if (defaultTarget != null &&
        (preferredMallamId == null || preferredMallamId.trim().isEmpty)) {
      return defaultTarget!;
    }
    if (cohorts.isEmpty || mallams.isEmpty) {
      throw StateError('Registration context is not ready.');
    }

    final cohort = defaultTarget?.cohort ?? cohorts.first;
    final preferredMallam = findMallamById(preferredMallamId);
    final mallam = preferredMallam ??
        mallams.firstWhere(
          (item) => item.podIds.contains(cohort.podId),
          orElse: () => defaultTarget?.mallam ?? mallams.first,
        );

    return RegistrationTarget(cohort: cohort, mallam: mallam);
  }
}

class RegistrationTarget {
  final BackendCohort cohort;
  final BackendMallam mallam;

  const RegistrationTarget({required this.cohort, required this.mallam});
}

class TabletRegistration {
  final String id;
  final String? deviceIdentifier;
  final String? podId;
  final String? podLabel;
  final String? mallamId;
  final String? mallamName;

  const TabletRegistration({
    required this.id,
    this.deviceIdentifier,
    this.podId,
    this.podLabel,
    this.mallamId,
    this.mallamName,
  });

  factory TabletRegistration.fromJson(Map<String, dynamic> json) {
    return TabletRegistration(
      id: json['id']?.toString() ?? 'tablet-registration',
      deviceIdentifier: json['deviceIdentifier']?.toString(),
      podId: json['podId']?.toString(),
      podLabel: json['podLabel']?.toString(),
      mallamId: json['mallamId']?.toString(),
      mallamName: json['mallamName']?.toString(),
    );
  }
}

int? _asInt(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  return int.tryParse(value.toString());
}

int _estimateStreak(Object? attendanceRate) {
  final rate = double.tryParse(attendanceRate?.toString() ?? '') ?? 0;
  if (rate >= 0.9) return 5;
  if (rate >= 0.8) return 3;
  return 1;
}

String _readinessFromLevel(String level) {
  switch (level) {
    case 'confident':
      return 'Confident responder';
    case 'emerging':
      return 'Ready for guided practice';
    case 'beginner':
    default:
      return 'Voice-first beginner';
  }
}

String _sexFromGender(String gender) {
  switch (gender) {
    case 'female':
      return 'Girl';
    case 'male':
      return 'Boy';
    default:
      return 'Unspecified';
  }
}

String _baselineFromLevel(String level) {
  switch (level) {
    case 'confident':
      return 'Answers with short sentences';
    case 'emerging':
      return 'Can repeat with support';
    case 'beginner':
    default:
      return 'No prior exposure';
  }
}

String _attendanceBand(Object? attendanceRate) {
  final rate = double.tryParse(attendanceRate?.toString() ?? '') ?? 0;
  if (rate >= 0.9) return 'Stable attendance';
  if (rate >= 0.8) return 'Strong attendance';
  return 'Needs follow-up';
}

String _attendanceStatus(Object? attendanceRate) {
  final rate = double.tryParse(attendanceRate?.toString() ?? '') ?? 0;
  if (rate >= 0.9) return 'Present consistently';
  if (rate >= 0.8) return 'Present most sessions';
  return 'Attendance needs follow-up';
}

String _supportPlan(String level) {
  switch (level) {
    case 'confident':
      return 'Move fast into retell tasks and short independent answers.';
    case 'emerging':
      return 'Use one hint, then ask for a complete spoken answer.';
    case 'beginner':
    default:
      return 'Use short prompts, repeat slowly once, then praise effort.';
  }
}

String _buildLearnerCode({
  required String name,
  required String? cohort,
  required int age,
}) {
  final cleanName = name.replaceAll(RegExp(r'[^A-Za-z]'), '').toUpperCase();
  final prefix = (cleanName.isEmpty ? 'LRN' : cleanName)
      .substring(0, (cleanName.isEmpty ? 3 : cleanName.length).clamp(0, 3));
  final cohortCode = (cohort ?? 'GEN')
      .split(' ')
      .where((item) => item.isNotEmpty)
      .map((item) => item[0])
      .join()
      .toUpperCase();
  return '${prefix.padRight(3, 'X')}-${cohortCode.padRight(2, 'G')}${age.toString().padLeft(2, '0')}';
}

String _moduleGoal(String level, String subjectId) {
  if (subjectId == 'math') return 'Ready for counting and comparison checks';
  if (subjectId == 'life-skills') return 'Ready for habit-building routines';
  return level == 'emerging'
      ? 'Ready for guided spoken practice'
      : 'Ready for simple spoken responses';
}

List<LessonStep> _readBackendActivitySteps(Map<String, dynamic> json) {
  final rawSteps = (json['activitySteps'] as List?) ??
      (json['activities'] as List?) ??
      (json['steps'] as List?);
  if (rawSteps == null) return const [];

  final items = rawSteps
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();

  items.sort((left, right) {
    final leftOrder = _asInt(left['order']) ?? 0;
    final rightOrder = _asInt(right['order']) ?? 0;
    return leftOrder.compareTo(rightOrder);
  });

  return items.map(_lessonStepFromBackend).toList();
}

LessonStep _lessonStepFromBackend(Map<String, dynamic> json) {
  final typeValue = json['type']?.toString() ?? 'listen_repeat';
  final activityType = _lessonActivityTypeFromBackend(typeValue);
  final expectedAnswers = (json['expectedAnswers'] as List?)
          ?.map((item) => item.toString())
          .where((item) => item.trim().isNotEmpty)
          .toList() ??
      const <String>[];
  final choices = (json['choices'] as List?)
          ?.whereType<Map>()
          .map((item) => LessonActivityChoice.fromBackend(
                Map<String, dynamic>.from(item),
              ))
          .toList() ??
      const <LessonActivityChoice>[];
  final mediaItems = (json['media'] as List?)
          ?.whereType<Map>()
          .map((item) => LessonActivityMedia.fromBackend(
                Map<String, dynamic>.from(item),
              ))
          .toList() ??
      const <LessonActivityMedia>[];
  final prompt = json['prompt']?.toString() ?? 'Follow Mallam and answer.';
  final expectedResponse = expectedAnswers.isEmpty
      ? choices
          .firstWhere(
            (item) => item.isCorrect,
            orElse: () => choices.isEmpty
                ? const LessonActivityChoice(id: 'answer', label: 'I am ready')
                : choices.first,
          )
          .label
      : expectedAnswers.first;
  final hint = json['hint']?.toString();
  final successFeedback = json['successFeedback']?.toString();
  final retryFeedback = json['retryFeedback']?.toString();
  final focusMedia = mediaItems.cast<LessonActivityMedia?>().firstWhere(
        (item) =>
            item?.kind == 'text' ||
            item?.kind == 'prompt-card' ||
            item?.kind == 'letter-card',
        orElse: () => mediaItems.isEmpty ? null : mediaItems.first,
      );
  final focusText = focusMedia?.firstValue;
  final supportText = hint ?? successFeedback ?? retryFeedback;

  return LessonStep(
    id: json['id']?.toString() ?? typeValue,
    type: _lessonStepTypeForActivity(activityType),
    title: _titleForBackendActivity(typeValue),
    instruction: prompt,
    expectedResponse: expectedResponse,
    acceptableResponses: expectedAnswers.skip(1).toList(),
    coachPrompt: prompt,
    facilitatorTip:
        hint ?? 'Use the backend lesson cue and keep the learner moving.',
    realWorldCheck: successFeedback ??
        'Check whether the learner completed the backend activity clearly.',
    speakerMode: _speakerModeForActivity(activityType),
    activity: LessonActivity(
      type: activityType,
      prompt: prompt,
      focusText: focusText,
      supportText: supportText,
      choices: choices.map((item) => item.label).toList(),
      choiceEmoji: choices.map((item) => _emojiForChoice(item)).toList(),
      targetResponse: expectedResponse,
      expectedAnswers: expectedAnswers,
      successFeedback: successFeedback,
      retryFeedback: retryFeedback,
      mediaItems: mediaItems,
      choiceItems: choices,
    ),
  );
}

LessonActivityType _lessonActivityTypeFromBackend(String value) {
  switch (value) {
    case 'letter_intro':
      return LessonActivityType.letterIntro;
    case 'image_choice':
      return LessonActivityType.imageChoice;
    case 'speak_answer':
      return LessonActivityType.speakAnswer;
    case 'word_build':
      return LessonActivityType.wordBuild;
    case 'tap_choice':
      return LessonActivityType.tapChoice;
    case 'listen_answer':
      return LessonActivityType.listenAnswer;
    case 'oral_quiz':
      return LessonActivityType.oralQuiz;
    case 'listen_repeat':
    default:
      return LessonActivityType.listenRepeat;
  }
}

LessonStepType _lessonStepTypeForActivity(LessonActivityType type) {
  switch (type) {
    case LessonActivityType.letterIntro:
    case LessonActivityType.listenRepeat:
      return LessonStepType.intro;
    case LessonActivityType.imageChoice:
    case LessonActivityType.wordBuild:
    case LessonActivityType.tapChoice:
    case LessonActivityType.listenAnswer:
      return LessonStepType.practice;
    case LessonActivityType.speakAnswer:
    case LessonActivityType.oralQuiz:
      return LessonStepType.reflection;
  }
}

SpeakerMode _speakerModeForActivity(LessonActivityType type) {
  switch (type) {
    case LessonActivityType.letterIntro:
    case LessonActivityType.listenRepeat:
      return SpeakerMode.guiding;
    case LessonActivityType.imageChoice:
    case LessonActivityType.wordBuild:
    case LessonActivityType.tapChoice:
    case LessonActivityType.listenAnswer:
    case LessonActivityType.speakAnswer:
    case LessonActivityType.oralQuiz:
      return SpeakerMode.listening;
  }
}

String _titleForBackendActivity(String value) {
  return value
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

String _emojiForChoice(LessonActivityChoice choice) {
  if (choice.mediaKind == 'image') return '🖼️';
  if (choice.mediaKind == 'audio') return '🔊';
  return choice.isCorrect ? '✅' : '🔹';
}
