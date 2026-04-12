enum SpeakerMode { idle, guiding, listening, affirming, waiting }

enum LessonStepType { intro, prompt, practice, reflection, celebration }

enum LessonActivityType { letterIntro, imageChoice, speakAnswer }

enum LessonCompletionState { ready, inProgress, complete }

enum ResponseReview { pending, onTrack, needsSupport }

class LessonActivity {
  final LessonActivityType type;
  final String prompt;
  final String? focusText;
  final String? supportText;
  final List<String> choices;
  final List<String> choiceEmoji;
  final String? targetResponse;

  const LessonActivity({
    required this.type,
    required this.prompt,
    this.focusText,
    this.supportText,
    this.choices = const [],
    this.choiceEmoji = const [],
    this.targetResponse,
  });
}

class LearnerProfile {
  final String id;
  final String name;
  final int age;
  final String cohort;
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
  final String lastLessonSummary;
  final String lastAttendance;

  const LearnerProfile({
    required this.id,
    required this.name,
    required this.age,
    required this.cohort,
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
    this.lastLessonSummary = 'No lesson captured yet.',
    this.lastAttendance = 'Checked in today',
  });

  factory LearnerProfile.fromBackend(Map<String, dynamic> json) {
    final gender = (json['gender'] ?? 'unspecified').toString();
    final level = (json['level'] ?? 'beginner').toString();
    final podLabel = json['podLabel']?.toString();
    final cohortName = json['cohortName']?.toString();
    final name = json['name']?.toString() ?? 'Learner';
    final age = _asInt(json['age']) ?? 0;

    return LearnerProfile(
      id: json['id']?.toString() ?? 'student-unknown',
      name: name,
      age: age,
      cohort: cohortName ?? 'Backend cohort',
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
      lastLessonSummary:
          'Live backend profile loaded${podLabel == null ? '.' : ' from $podLabel.'}',
      lastAttendance: _attendanceStatus(json['attendanceRate']),
    );
  }

  LearnerProfile copyWith({
    String? id,
    String? name,
    int? age,
    String? cohort,
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
    String? lastLessonSummary,
    String? lastAttendance,
  }) {
    return LearnerProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      age: age ?? this.age,
      cohort: cohort ?? this.cohort,
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
      lastLessonSummary: lastLessonSummary ?? this.lastLessonSummary,
      lastAttendance: lastAttendance ?? this.lastAttendance,
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

class LearningModule {
  final String id;
  final String title;
  final String description;
  final String voicePrompt;
  final String readinessGoal;
  final String badge;

  const LearningModule({
    required this.id,
    required this.title,
    required this.description,
    required this.voicePrompt,
    required this.readinessGoal,
    required this.badge,
  });

  factory LearningModule.fromBackend(Map<String, dynamic> json) {
    final subjectId =
        json['subjectId']?.toString() ?? json['id']?.toString() ?? 'module';
    final subjectName = json['subjectName']?.toString();
    final title = json['title']?.toString() ?? 'Learning module';
    final level = json['level']?.toString() ?? 'beginner';

    return LearningModule(
      id: subjectId,
      title: subjectName == null ? title : '$subjectName · $title',
      description:
          'Live curriculum module from backend for ${subjectName ?? 'Lumo'} learners.',
      voicePrompt:
          'We are opening the live curriculum module "$title". Follow Mallam one step at a time.',
      readinessGoal: _moduleGoal(level, subjectId),
      badge: 'Live backend',
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

  factory LessonCardModel.fromBackend(Map<String, dynamic> json) {
    final moduleId = json['moduleId']?.toString() ?? 'english';
    final title = json['title']?.toString() ?? 'Guided lesson';
    final subject = json['subject']?.toString() ?? 'Learning';

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
      steps: _defaultLessonSteps(title: title, subject: subject),
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

  const RegistrationContext({
    this.cohorts = const [],
    this.mallams = const [],
    this.defaultTarget,
  });

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
    );
  }

  bool get isReady => cohorts.isNotEmpty && mallams.isNotEmpty;

  String get summary {
    if (!isReady) return 'Backend assignment mapping not loaded yet.';
    final target = resolveTarget();
    return '${target.cohort.name} • ${target.mallam.name}';
  }

  RegistrationTarget resolveTarget() {
    if (defaultTarget != null) return defaultTarget!;
    if (cohorts.isEmpty || mallams.isEmpty) {
      throw StateError('Registration context is not ready.');
    }

    final cohort = cohorts.first;
    final mallam = mallams.firstWhere(
      (item) => item.podIds.contains(cohort.podId),
      orElse: () => mallams.first,
    );

    return RegistrationTarget(cohort: cohort, mallam: mallam);
  }
}

class RegistrationTarget {
  final BackendCohort cohort;
  final BackendMallam mallam;

  const RegistrationTarget({required this.cohort, required this.mallam});
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

List<LessonStep> _defaultLessonSteps({
  required String title,
  required String subject,
}) {
  return [
    LessonStep(
      id: 'intro',
      type: LessonStepType.intro,
      title: 'Open the lesson',
      instruction:
          'Mallam welcomes the learner and frames the activity in one short sentence.',
      expectedResponse: 'I am ready.',
      acceptableResponses: ['Ready', 'Yes, I am ready'],
      coachPrompt: 'We are starting $title. Say: I am ready.',
      facilitatorTip:
          'Use a calm voice and make sure the learner is settled before the next prompt.',
      realWorldCheck: 'The learner shows they are ready to continue.',
      speakerMode: SpeakerMode.guiding,
    ),
    LessonStep(
      id: 'practice',
      type: LessonStepType.practice,
      title: 'Try the core response',
      instruction:
          'The learner gives one short spoken answer connected to the lesson topic.',
      expectedResponse: 'I can answer about $subject.',
      acceptableResponses: ['I can answer', 'I know $subject'],
      coachPrompt: 'Listen carefully, then say: I can answer about $subject.',
      facilitatorTip: 'If needed, model once and ask for a slower second try.',
      realWorldCheck:
          'The learner can give one clear spoken response without guessing wildly.',
      speakerMode: SpeakerMode.listening,
    ),
    LessonStep(
      id: 'close',
      type: LessonStepType.celebration,
      title: 'Close with confidence',
      instruction:
          'Mallam celebrates the attempt and checks confidence before ending.',
      expectedResponse: 'I did it.',
      acceptableResponses: ['I did it', 'I can do it'],
      coachPrompt: 'Well done. Say: I did it.',
      facilitatorTip:
          'Praise effort first, then move on while the learner still feels successful.',
      realWorldCheck:
          'The learner finishes the voice loop on a confident note.',
      speakerMode: SpeakerMode.affirming,
    ),
  ];
}
