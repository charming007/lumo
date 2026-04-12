import 'dart:math';

import 'api_client.dart';
import 'models.dart';
import 'seed_data.dart';

typedef VoiceReplay = Future<void> Function(String text, SpeakerMode mode);
typedef VoiceReplayStop = Future<void> Function();

class LumoAppState {
  LumoAppState({LumoApiClient? apiClient})
      : _apiClient = apiClient ?? LumoApiClient();

  final LumoApiClient _apiClient;
  VoiceReplay? voiceReplay;
  VoiceReplayStop? voiceReplayStop;

  LearnerProfile? currentLearner;
  LearningModule? selectedModule;
  LessonSessionState? activeSession;
  SpeakerMode speakerMode = SpeakerMode.guiding;
  RegistrationDraft registrationDraft = const RegistrationDraft();
  RegistrationContext registrationContext = const RegistrationContext();

  final List<SyncEvent> pendingSyncEvents = [];
  final List<LearnerProfile> learners = List.of(learnerProfilesSeed);
  final List<LearningModule> modules = List.of(learningModules);
  final List<LessonCardModel> assignedLessons = List.of(assignedLessonsSeed);
  final List<LearnerAssignmentPack> assignmentPacks = [];

  bool isBootstrapping = false;
  bool isRegisteringLearner = false;
  bool isSyncingEvents = false;
  bool usingFallbackData = true;
  String? backendError;
  DateTime? lastSyncedAt;
  DateTime? backendGeneratedAt;
  DateTime? lastSyncAttemptAt;
  String? backendContractVersion;
  int backendAssignmentCount = 0;
  int lastSyncAcceptedCount = 0;
  int lastSyncIgnoredCount = 0;
  String? lastSyncError;

  String get backendBaseUrl => _apiClient.baseUrl;

  void attachVoiceReplay(VoiceReplay replay, {VoiceReplayStop? onStop}) {
    voiceReplay = replay;
    voiceReplayStop = onStop;
  }

  Future<void> stopVoiceReplay() async {
    await voiceReplayStop?.call();
  }

  Future<void> replayVisiblePrompt(
    String prompt, {
    SpeakerMode mode = SpeakerMode.guiding,
  }) async {
    final trimmed = prompt.trim();
    if (trimmed.isEmpty) return;
    await voiceReplay?.call(trimmed, mode);
  }

  SyncEvent? get latestSyncEvent =>
      pendingSyncEvents.isEmpty ? null : pendingSyncEvents.last;

  bool get hasLiveBackendConnection =>
      !usingFallbackData && lastSyncedAt != null && backendError == null;

  String get pendingSyncSummary {
    final latest = latestSyncEvent;
    if (latest == null) return 'No pending sync events.';
    final learnerCode =
        latest.payload['learnerCode']?.toString() ?? 'Unknown learner';
    return '${latest.type.replaceAll('_', ' ')} pending for $learnerCode';
  }

  String get backendStatusLabel {
    if (isBootstrapping) return 'Connecting to backend…';
    if (isSyncingEvents) return 'Syncing learner activity…';
    if (backendError != null && usingFallbackData) {
      return 'Offline seed fallback';
    }
    if (hasLiveBackendConnection) return 'Live backend connected';
    if (backendError != null) return 'Backend needs attention';
    return 'Backend not loaded';
  }

  String get backendStatusDetail {
    if (isBootstrapping) {
      return 'Loading live learner bootstrap, lessons, and registration targets from $backendBaseUrl';
    }
    if (isSyncingEvents) {
      return 'Posting ${pendingSyncEvents.length} queued event(s) to $backendBaseUrl and waiting for the learner-app sync response.';
    }
    if (backendError != null && usingFallbackData) {
      return 'Using local fallback because the backend could not be reached: $backendError';
    }
    if (hasLiveBackendConnection) {
      final queueLabel = pendingSyncEvents.isEmpty
          ? 'No pending sync events.'
          : '${pendingSyncEvents.length} event(s) still queued.';
      final generatedLabel = backendGeneratedAt == null
          ? 'Bootstrap generation time unavailable.'
          : 'Backend snapshot generated at ${_formatTime(backendGeneratedAt!)}.';
      final syncLabel = lastSyncAttemptAt == null
          ? 'No sync attempt yet.'
          : lastSyncError == null
              ? 'Last sync pushed $lastSyncAcceptedCount accepted / $lastSyncIgnoredCount ignored at ${_formatTime(lastSyncAttemptAt!)}.'
              : 'Last sync attempt failed at ${_formatTime(lastSyncAttemptAt!)}: $lastSyncError';
      return 'Learners, lessons, and registration targets were fetched from $backendBaseUrl at ${_formatTime(lastSyncedAt!)}. $generatedLabel $queueLabel $syncLabel';
    }
    if (backendError != null) {
      return 'The app reached $backendBaseUrl before, but the latest backend action failed: $backendError';
    }
    return 'Waiting for first backend sync.';
  }

  Future<void> bootstrap() async {
    if (isBootstrapping) return;
    isBootstrapping = true;
    backendError = null;

    try {
      final data = await _apiClient.fetchBootstrap();
      learners
        ..clear()
        ..addAll(data.learners.isEmpty ? learnerProfilesSeed : data.learners);

      final mergedModules = <LearningModule>[
        ...data.modules,
        ...learningModules.where(
          (seed) => !data.modules.any((item) => item.id == seed.id),
        ),
      ];
      modules
        ..clear()
        ..addAll(mergedModules);

      assignedLessons
        ..clear()
        ..addAll(data.lessons.isEmpty ? assignedLessonsSeed : data.lessons);

      registrationContext = data.registrationContext;
      assignmentPacks
        ..clear()
        ..addAll(data.assignmentPacks);
      usingFallbackData = false;
      lastSyncedAt = DateTime.now();
      backendGeneratedAt = data.generatedAt == null
          ? null
          : DateTime.tryParse(data.generatedAt!);
      backendContractVersion = data.contractVersion;
      backendAssignmentCount = data.assignmentCount;
      lastSyncError = null;

      await _hydrateModuleBundles(mergedModules);

      if (learners.isNotEmpty) {
        final existingLearnerId = currentLearner?.id;
        currentLearner = existingLearnerId == null
            ? suggestedLearnerForHome
            : learners.firstWhere(
                (item) => item.id == existingLearnerId,
                orElse: () => suggestedLearnerForHome ?? learners.first,
              );
      }
      if (selectedModule != null && modules.isNotEmpty) {
        selectedModule = modules.firstWhere(
          (item) => item.id == selectedModule!.id,
          orElse: () => modules.first,
        );
      }
    } catch (error) {
      usingFallbackData = true;
      backendError = error.toString().replaceFirst('Exception: ', '');
    } finally {
      isBootstrapping = false;
    }
  }

  Future<void> _hydrateModuleBundles(List<LearningModule> sourceModules) async {
    if (usingFallbackData || sourceModules.isEmpty) return;

    final hydratedModules = <LearningModule>[];
    final hydratedLessons = <LessonCardModel>[];

    for (final module in sourceModules) {
      try {
        final bundle = await _apiClient.fetchModuleBundle(module.id);
        hydratedModules.add(bundle.module);
        if (bundle.lessons.isNotEmpty) {
          hydratedLessons.addAll(bundle.lessons);
        }
      } catch (_) {
        hydratedModules.add(module);
      }
    }

    modules
      ..clear()
      ..addAll(hydratedModules);

    if (hydratedLessons.isNotEmpty) {
      final fallbackByModule = <String, List<LessonCardModel>>{};
      for (final lesson in assignedLessonsSeed) {
        fallbackByModule.putIfAbsent(lesson.moduleId, () => []).add(lesson);
      }

      final liveModuleIds =
          hydratedLessons.map((item) => item.moduleId).toSet();
      final mergedLessons = <LessonCardModel>[
        ...hydratedLessons,
        ...fallbackByModule.entries
            .where((entry) => !liveModuleIds.contains(entry.key))
            .expand((entry) => entry.value),
      ];

      assignedLessons
        ..clear()
        ..addAll(mergedLessons);
    }
  }

  LearnerProfile? get suggestedLearnerForHome {
    if (currentLearner != null) return currentLearner;
    if (learners.isEmpty) return null;

    for (final pack in assignmentPacks) {
      for (final learnerId in pack.eligibleLearnerIds) {
        for (final learner in learners) {
          if (learner.id == learnerId) return learner;
        }
      }
    }

    return learners.first;
  }

  void selectLearner(LearnerProfile learner) {
    currentLearner = learner;
  }

  void selectModule(LearningModule module) {
    selectedModule = module;
  }

  List<LessonCardModel> lessonsForSelectedModule() {
    final module = selectedModule;
    if (module == null) return assignedLessons;
    final filtered = assignedLessons
        .where((lesson) => lesson.moduleId == module.id)
        .toList();
    return filtered.isEmpty ? assignedLessons : filtered;
  }

  List<LessonCardModel> lessonsForLearner(LearnerProfile? learner) {
    if (learner == null) return assignedLessons;

    final preferredModuleIds = _preferredModuleIdsForLearner(learner);
    final backendAssigned = backendAssignedLessonsForLearner(learner);
    final backendLessonIds = backendAssigned.map((item) => item.id).toSet();
    final rankedFallback = List<LessonCardModel>.from(assignedLessons)
      ..sort((left, right) {
        final leftRank = preferredModuleIds.indexOf(left.moduleId);
        final rightRank = preferredModuleIds.indexOf(right.moduleId);
        final normalizedLeft =
            leftRank == -1 ? preferredModuleIds.length : leftRank;
        final normalizedRight =
            rightRank == -1 ? preferredModuleIds.length : rightRank;
        if (normalizedLeft != normalizedRight) {
          return normalizedLeft.compareTo(normalizedRight);
        }
        return left.title.compareTo(right.title);
      });

    return [
      ...backendAssigned,
      ...rankedFallback
          .where((lesson) => !backendLessonIds.contains(lesson.id)),
    ];
  }

  List<LessonCardModel> backendAssignedLessonsForLearner(
    LearnerProfile? learner,
  ) {
    if (learner == null || assignmentPacks.isEmpty) return const [];

    final eligibleAssignments = assignmentPacks.where(
      (pack) => pack.eligibleLearnerIds.contains(learner.id),
    );

    final lessonsById = {
      for (final lesson in assignedLessons) lesson.id: lesson
    };
    final ordered = <LessonCardModel>[];
    final seen = <String>{};

    for (final pack in eligibleAssignments) {
      final lesson = lessonsById[pack.lessonId];
      if (lesson == null || seen.contains(lesson.id)) continue;
      ordered.add(lesson);
      seen.add(lesson.id);
    }

    return ordered;
  }

  LearnerAssignmentPack? nextAssignmentPackForLearner(LearnerProfile? learner) {
    if (learner == null) return null;
    for (final pack in assignmentPacks) {
      if (pack.eligibleLearnerIds.contains(learner.id)) return pack;
    }
    return null;
  }

  String backendRoutingSummaryForLearner(LearnerProfile learner) {
    final pack = nextAssignmentPackForLearner(learner);
    if (pack == null) {
      final recommended = recommendedModuleLabelForLearner(learner);
      return 'No live assignment pack yet. Fall back to $recommended.';
    }

    final due = pack.dueDate == null || pack.dueDate!.trim().isEmpty
        ? 'No due date'
        : 'Due ${pack.dueDate!.split('T').first}';
    final mallam = pack.mallamName ?? 'Mallam pending';
    final cohort = pack.cohortName ?? learner.cohort;
    final assessment = pack.assessmentTitle == null
        ? 'No assessment gate'
        : 'Assessment: ${pack.assessmentTitle}';
    return '$cohort • $mallam • $due • $assessment';
  }

  List<LessonCardModel> lessonsForLearnerAndModule(
    LearnerProfile? learner,
    String moduleId,
  ) {
    final matches = lessonsForLearner(learner)
        .where((lesson) => lesson.moduleId == moduleId)
        .toList();
    return matches;
  }

  LessonCardModel? nextAssignedLessonForLearner(LearnerProfile? learner) {
    final rankedLessons = lessonsForLearner(learner);
    if (rankedLessons.isEmpty) return null;
    return rankedLessons.first;
  }

  int assignedLessonCountForModule({
    required LearningModule module,
    LearnerProfile? learner,
  }) {
    final matches = lessonsForLearnerAndModule(learner, module.id);
    return matches.isEmpty
        ? assignedLessons.where((lesson) => lesson.moduleId == module.id).length
        : matches.length;
  }

  LessonCardModel? get recommendedLesson {
    final learner = currentLearner;
    if (learner != null) {
      return nextAssignedLessonForLearner(learner) ??
          (assignedLessons.isNotEmpty ? assignedLessons.first : null);
    }

    final lessonPool = lessonsForSelectedModule();
    if (lessonPool.isNotEmpty) return lessonPool.first;
    return assignedLessons.isNotEmpty ? assignedLessons.first : null;
  }

  LearningModule get recommendedModuleForDraft {
    if (registrationDraft.readinessLabel == 'Voice-first beginner') {
      return modules.firstWhere(
        (module) => module.id == 'english',
        orElse: () => modules.first,
      );
    }
    if (registrationDraft.readinessLabel == 'Ready for guided practice') {
      return modules.firstWhere(
        (module) => module.id == 'math',
        orElse: () => modules.first,
      );
    }
    return modules.firstWhere(
      (module) => module.id == 'story',
      orElse: () => modules.first,
    );
  }

  void updateDraft(RegistrationDraft draft) {
    registrationDraft = draft;
  }

  RegistrationTarget? get registrationTargetForDraft {
    if (!registrationContext.isReady) return null;
    return registrationContext.resolveTargetForCohortName(
      registrationDraft.cohort,
    );
  }

  String get registrationTargetSummary {
    final target = registrationTargetForDraft;
    if (target == null) return registrationContext.summary;
    return '${target.cohort.name} • ${target.mallam.name}';
  }

  Future<LearnerProfile> registerLearner() async {
    if (usingFallbackData) {
      final learner = _registerLearnerLocally();
      backendError ??=
          'Registration stayed local because the learner-app backend was unavailable.';
      return learner;
    }

    isRegisteringLearner = true;
    try {
      final learner = await _apiClient.registerLearner(
        draft: registrationDraft,
        registrationTarget: registrationTargetForDraft,
      );
      learners.insert(0, learner);
      currentLearner = learner;
      lastSyncedAt = DateTime.now();
      lastSyncAttemptAt = lastSyncedAt;
      lastSyncAcceptedCount = 1;
      lastSyncIgnoredCount = 0;
      lastSyncError = null;
      backendError = null;
      registrationDraft = const RegistrationDraft();
      return learner;
    } finally {
      isRegisteringLearner = false;
    }
  }

  LearnerProfile _registerLearnerLocally() {
    final learner = LearnerProfile(
      id: 'student-${learners.length + 1}',
      name: registrationDraft.name.trim(),
      age: int.parse(registrationDraft.age.trim()),
      cohort: registrationDraft.cohort.trim().isEmpty
          ? 'Fallback cohort'
          : registrationDraft.cohort.trim(),
      streakDays: 0,
      guardianName: registrationDraft.guardianName.trim(),
      preferredLanguage: registrationDraft.preferredLanguage,
      readinessLabel: registrationDraft.readinessLabel,
      village: registrationDraft.village.trim(),
      guardianPhone: registrationDraft.guardianPhone.trim(),
      sex: registrationDraft.sex,
      baselineLevel: registrationDraft.baselineLevel,
      consentCaptured: registrationDraft.consentCaptured,
      learnerCode: registrationDraft.learnerCode,
      caregiverRelationship: registrationDraft.caregiverRelationship,
      supportPlan: registrationDraft.supportPlan.trim(),
      lastLessonSummary:
          'Profile created locally. Backend registration pending.',
      lastAttendance: 'Registered today',
      attendanceBand: 'New learner',
      enrollmentStatus: 'Needs backend sync',
    );

    learners.insert(0, learner);
    currentLearner = learner;
    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: 'learner_registered_local_fallback',
        payload: {
          ...registrationDraft.backendPayloadPreview,
          'learnerId': learner.id,
          'capturedAt': DateTime.now().toIso8601String(),
        },
      ),
    );
    registrationDraft = const RegistrationDraft();
    return learner;
  }

  void startLesson(LessonCardModel lesson) {
    final openingStep = lesson.steps.first;
    final now = DateTime.now();
    final sessionId = 'session-${now.millisecondsSinceEpoch}';
    activeSession = LessonSessionState(
      sessionId: sessionId,
      lesson: lesson,
      completionState: LessonCompletionState.inProgress,
      speakerMode: openingStep.speakerMode,
      startedAt: now,
      lastUpdatedAt: now,
      automationStatus:
          'Mallam is opening the lesson and preparing the first voice prompt.',
      transcript: [
        SessionTurn(
          speaker: 'Mallam',
          text: personalizePrompt(openingStep.coachPrompt),
          timestamp: now,
        ),
      ],
    );
    speakerMode = activeSession!.speakerMode;
    _queueSessionEvent(
      type: 'lesson_session_started',
      session: activeSession!,
      extra: {
        'lessonId': lesson.id,
        'moduleId': lesson.moduleId,
        'stepId': openingStep.id,
        'stepTitle': openingStep.title,
      },
    );
  }

  ResponseOutcome submitLearnerResponse(String response) {
    final session = activeSession;
    if (session == null) return const ResponseOutcome.ignored();

    final trimmed = response.trim();
    if (trimmed.isEmpty) return const ResponseOutcome.ignored();

    final evaluation = evaluateLearnerResponse(trimmed);
    final step = session.currentStep;
    final nextAttempts = session.attemptsThisStep + 1;
    final review = evaluation.review;
    final supportType = review == ResponseReview.needsSupport
        ? (nextAttempts >= 2 ? 'Model answer played' : 'Hint given')
        : 'Learner answered independently';
    final automationStatus = review == ResponseReview.onTrack
        ? 'Mallam accepted the answer and is ready to continue.'
        : nextAttempts >= 2
            ? 'Mallam is modeling the correct answer and keeping the learner on this step.'
            : 'Mallam is replaying the prompt with a hint so the learner can try again.';

    activeSession = session.copyWith(
      latestLearnerResponse: trimmed,
      latestReview: review,
      attemptsThisStep: nextAttempts,
      totalResponses: session.totalResponses + 1,
      speakerMode: review == ResponseReview.needsSupport
          ? SpeakerMode.guiding
          : SpeakerMode.affirming,
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: currentLearner?.name ?? 'Learner',
          text: trimmed,
          review: review,
          timestamp: DateTime.now(),
        ),
      ],
      lastSupportType: supportType,
      automationStatus: automationStatus,
    );
    speakerMode = review == ResponseReview.needsSupport
        ? SpeakerMode.guiding
        : SpeakerMode.affirming;
    _queueSessionEvent(
      type: 'learner_response_captured',
      session: activeSession!,
      extra: {
        'stepId': step.id,
        'stepTitle': step.title,
        'response': trimmed,
        'review': review.name,
        'attemptNumber': nextAttempts,
        'similarityScore': evaluation.similarityScore,
        'usedAlias': evaluation.usedAlias,
      },
    );
    return ResponseOutcome(
      review: review,
      attemptNumber: nextAttempts,
      accepted: review == ResponseReview.onTrack,
      usedAlias: evaluation.usedAlias,
      similarityScore: evaluation.similarityScore,
      supportType: supportType,
      automationStatus: automationStatus,
    );
  }

  ResponseEvaluation evaluateLearnerResponse(String response) {
    final session = activeSession;
    if (session == null) {
      return const ResponseEvaluation(
        review: ResponseReview.pending,
        similarityScore: 0,
      );
    }

    final step = session.currentStep;
    final normalizedResponse = _normalizeForComparison(response);
    final expected = personalizeExpectedResponse(step.expectedResponse);
    final normalizedExpected = _normalizeForComparison(expected);
    final aliases = step.acceptableResponses
        .map(personalizeExpectedResponse)
        .map(_normalizeForComparison)
        .where((item) => item.isNotEmpty)
        .toList();

    final allTargets = <String>{normalizedExpected, ...aliases}
        .where((item) => item.isNotEmpty)
        .toList();

    final exactOrContains = allTargets.any(
      (target) =>
          target == normalizedResponse ||
          target.contains(normalizedResponse) ||
          normalizedResponse.contains(target),
    );
    if (exactOrContains) {
      return ResponseEvaluation(
        review: ResponseReview.onTrack,
        similarityScore: 1,
        usedAlias: aliases.contains(normalizedResponse),
      );
    }

    final similarity = allTargets.isEmpty
        ? 0.0
        : allTargets
            .map((target) => _tokenSimilarity(normalizedResponse, target))
            .reduce(max);
    final wordCount = normalizedResponse.isEmpty
        ? 0
        : normalizedResponse.split(' ').where((word) => word.isNotEmpty).length;
    final isLenientPass = wordCount >= 3 && similarity >= 0.72;

    return ResponseEvaluation(
      review:
          isLenientPass ? ResponseReview.onTrack : ResponseReview.needsSupport,
      similarityScore: similarity,
      usedAlias: false,
    );
  }

  String buildCoachSupportPrompt({
    required String supportType,
    required LessonStep step,
  }) {
    final learnerName = currentLearner?.name ?? 'the learner';
    final expected = personalizeExpectedResponse(step.expectedResponse);
    final prompt = personalizePrompt(step.coachPrompt);

    switch (supportType) {
      case 'hint':
        return 'Try again, $learnerName. Listen carefully: $prompt Hint: the answer should sound like $expected';
      case 'model':
        return 'Let us say it together, $learnerName. $expected';
      default:
        return prompt;
    }
  }

  String _normalizeForComparison(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  double _tokenSimilarity(String left, String right) {
    final leftTokens = left.split(' ').where((item) => item.isNotEmpty).toSet();
    final rightTokens =
        right.split(' ').where((item) => item.isNotEmpty).toSet();
    if (leftTokens.isEmpty || rightTokens.isEmpty) return 0;
    final overlap = leftTokens.intersection(rightTokens).length;
    final union = leftTokens.union(rightTokens).length;
    return union == 0 ? 0 : overlap / union;
  }

  void useCoachSupport(String supportType) {
    final session = activeSession;
    if (session == null) return;

    final step = session.currentStep;
    final learnerName = currentLearner?.name ?? 'the learner';
    late final String text;
    late final SpeakerMode nextMode;
    late final String label;

    switch (supportType) {
      case 'hint':
        text = buildCoachSupportPrompt(supportType: 'hint', step: step);
        nextMode = SpeakerMode.guiding;
        label = 'Hint given';
        break;
      case 'model':
        text = buildCoachSupportPrompt(supportType: 'model', step: step);
        nextMode = SpeakerMode.affirming;
        label = 'Model answer played';
        break;
      case 'slow':
        text =
            'Slow repeat for $learnerName: ${personalizePrompt(step.coachPrompt)}';
        nextMode = SpeakerMode.guiding;
        label = 'Slow repeat';
        break;
      case 'wait':
        text =
            'Mallam gives $learnerName a quiet pause before the next attempt.';
        nextMode = SpeakerMode.waiting;
        label = 'Think time';
        break;
      case 'translate':
        text =
            'Support note: restate the prompt in the learner’s stronger language, then return to the target answer.';
        nextMode = SpeakerMode.guiding;
        label = 'Translation support';
        break;
      default:
        text = personalizePrompt(step.coachPrompt);
        nextMode = SpeakerMode.guiding;
        label = 'Prompt replay';
        break;
    }

    activeSession = session.copyWith(
      speakerMode: nextMode,
      supportActionsUsed: session.supportActionsUsed + 1,
      lastSupportType: label,
      automationStatus: 'Mallam action: $label.',
      transcript: [
        ...session.transcript,
        SessionTurn(speaker: 'Mallam', text: text, timestamp: DateTime.now()),
      ],
    );
    speakerMode = nextMode;
    _queueSessionEvent(
      type: 'coach_support_used',
      session: activeSession!,
      extra: {
        'stepId': step.id,
        'stepTitle': step.title,
        'supportType': supportType,
        'label': label,
      },
    );
  }

  void addObservation(String observation) {
    final session = activeSession;
    if (session == null) return;
    if (session.facilitatorObservations.contains(observation)) return;
    activeSession = session.copyWith(
      facilitatorObservations: [
        ...session.facilitatorObservations,
        observation,
      ],
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: 'Facilitator',
          text: observation,
          timestamp: DateTime.now(),
        ),
      ],
    );
  }

  void attachLearnerAudioCapture({
    required String path,
    required Duration duration,
  }) {
    final session = activeSession;
    if (session == null) return;

    final seconds = duration.inSeconds <= 0 ? 1 : duration.inSeconds;
    activeSession = session.copyWith(
      audioInputMode: 'Shared mic on tablet',
      totalAudioCaptures: session.totalAudioCaptures + 1,
      latestLearnerAudioPath: path,
      latestLearnerAudioDuration: duration,
      lastSupportType: 'Learner voice captured',
      automationStatus:
          'Learner voice captured. Mallam is checking the answer.',
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: currentLearner?.name ?? 'Learner',
          text: 'Voice captured locally (${seconds}s)',
          timestamp: DateTime.now(),
        ),
      ],
    );
    _queueSessionEvent(
      type: 'learner_audio_captured',
      session: activeSession!,
      extra: {
        'stepId': session.currentStep.id,
        'stepTitle': session.currentStep.title,
        'audioPath': path,
        'durationSeconds': seconds,
      },
    );
  }

  void setAudioInputMode(String mode) {
    final session = activeSession;
    if (session == null) return;
    activeSession = session.copyWith(audioInputMode: mode);
  }

  void setSpeakerOutputMode(String mode) {
    final session = activeSession;
    if (session == null) return;
    activeSession = session.copyWith(speakerOutputMode: mode);
  }

  bool advanceLessonStep() {
    final session = activeSession;
    if (session == null) return false;

    if (session.isLastStep) {
      activeSession = session.copyWith(
        completionState: LessonCompletionState.complete,
        speakerMode: SpeakerMode.affirming,
        lastSupportType: 'Lesson completed',
      );
      _queueSessionEvent(
        type: 'lesson_step_completed',
        session: activeSession!,
        extra: {
          'stepId': session.currentStep.id,
          'stepTitle': session.currentStep.title,
          'isLastStep': true,
        },
      );
      speakerMode = SpeakerMode.affirming;
      return true;
    }

    final nextStepIndex = session.stepIndex + 1;
    final nextStep = session.lesson.steps[nextStepIndex];
    activeSession = session.copyWith(
      stepIndex: nextStepIndex,
      speakerMode: nextStep.speakerMode,
      latestReview: ResponseReview.pending,
      attemptsThisStep: 0,
      lastSupportType: 'Prompt replay',
      automationStatus:
          'Mallam moved to the next step and is preparing the next prompt.',
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: 'Mallam',
          text: personalizePrompt(nextStep.coachPrompt),
          timestamp: DateTime.now(),
        ),
      ],
      clearLatestLearnerResponse: true,
      clearLatestLearnerAudio: true,
    );
    speakerMode = nextStep.speakerMode;
    _queueSessionEvent(
      type: 'lesson_step_advanced',
      session: activeSession!,
      extra: {
        'stepId': nextStep.id,
        'stepTitle': nextStep.title,
        'stepIndex': nextStepIndex + 1,
        'stepsTotal': session.lesson.steps.length,
      },
    );
    return false;
  }

  List<String> suggestedResponsesForCurrentStep() {
    final step = activeSession?.currentStep;
    if (step == null) return const [];
    final expected = personalizeExpectedResponse(step.expectedResponse);

    switch (step.type) {
      case LessonStepType.intro:
        return [
          expected,
          'Wa alaikum salam',
          'My name is ${currentLearner?.name ?? 'Aisha'}',
        ];
      case LessonStepType.prompt:
        return [expected, 'I know the answer', 'Please repeat'];
      case LessonStepType.practice:
        return [expected, 'Let me try again', 'Can you help me'];
      case LessonStepType.reflection:
        return [expected, 'Yes, I am ready', 'I feel confident'];
      case LessonStepType.celebration:
        return [expected, 'I did it', 'Let us continue'];
    }
  }

  Future<void> replayCoachPrompt() async {
    final session = activeSession;
    if (session == null) {
      speakerMode = SpeakerMode.guiding;
      return;
    }

    final prompt = personalizePrompt(session.currentStep.coachPrompt);
    activeSession = session.copyWith(
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: 'Mallam',
          text: prompt,
          timestamp: DateTime.now(),
        ),
      ],
      lastSupportType: 'Prompt replay',
      automationStatus:
          'Mallam replayed the prompt and is waiting for the learner response.',
    );
    speakerMode = SpeakerMode.guiding;
    await replayVisiblePrompt(prompt, mode: SpeakerMode.guiding);
  }

  Future<void> completeLesson(LessonCardModel lesson) async {
    final learner = currentLearner;
    final session = activeSession;
    if (learner == null || session == null) return;

    final existingRewards = learner.rewards;
    final updatedLearner = learner.copyWith(
      streakDays: learner.streakDays + 1,
      enrollmentStatus: 'Active in lessons',
      lastLessonSummary:
          '${lesson.title}: ${session.totalResponses} responses captured, ${session.supportActionsUsed} support actions, ${session.facilitatorObservations.isEmpty ? 'no facilitator flags' : session.facilitatorObservations.join(', ')}.',
      lastAttendance: 'Completed ${lesson.subject} today',
      rewards: existingRewards == null
          ? null
          : RewardSnapshot(
              learnerId: existingRewards.learnerId,
              totalXp: existingRewards.totalXp + 12,
              points: existingRewards.points + 12,
              level: existingRewards.level,
              levelLabel: existingRewards.levelLabel,
              nextLevel: existingRewards.nextLevel,
              nextLevelLabel: existingRewards.nextLevelLabel,
              xpIntoLevel: existingRewards.xpIntoLevel + 12,
              xpForNextLevel: existingRewards.xpForNextLevel > 12
                  ? existingRewards.xpForNextLevel - 12
                  : 0,
              progressToNextLevel: existingRewards.progressToNextLevel,
              badgesUnlocked: existingRewards.badgesUnlocked,
              badges: existingRewards.badges,
            ),
    );

    final learnerIndex = learners.indexWhere((item) => item.id == learner.id);
    if (learnerIndex != -1) {
      learners[learnerIndex] = updatedLearner;
    }
    currentLearner = updatedLearner;

    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: 'lesson_completed',
        payload:
            session.syncPayloadPreview(learnerCode: updatedLearner.learnerCode),
      ),
    );

    await syncPendingEvents();
  }

  Future<void> syncPendingEvents() async {
    if (usingFallbackData || pendingSyncEvents.isEmpty || isSyncingEvents) {
      return;
    }

    final snapshot = List<SyncEvent>.from(pendingSyncEvents);
    isSyncingEvents = true;
    lastSyncAttemptAt = DateTime.now();
    try {
      final result = await _apiClient.syncEvents(snapshot);
      pendingSyncEvents.removeRange(0, snapshot.length);
      lastSyncedAt = result.syncedAt ?? DateTime.now();
      lastSyncAcceptedCount = result.accepted;
      lastSyncIgnoredCount = result.ignored;
      lastSyncError = null;
      backendError = null;
      _applyRewardSnapshotsFromSync(result.raw);
    } catch (error) {
      final message = error.toString().replaceFirst('Exception: ', '');
      lastSyncError = message;
      backendError = message;
    } finally {
      isSyncingEvents = false;
    }
  }

  String get syncQueueLabel {
    if (pendingSyncEvents.isEmpty) return 'Queue empty';
    if (isSyncingEvents) return 'Syncing ${pendingSyncEvents.length} event(s)';
    return '${pendingSyncEvents.length} event(s) waiting';
  }

  String get backendSnapshotLabel {
    final generatedAt = backendGeneratedAt;
    final contract = backendContractVersion ?? 'contract unknown';
    if (generatedAt == null) return contract;
    return '$contract • snapshot ${_formatTime(generatedAt)}';
  }

  String get lastSyncSummaryLabel {
    if (lastSyncAttemptAt == null) return 'No sync attempt yet';
    if (lastSyncError != null) {
      return 'Last sync failed at ${_formatTime(lastSyncAttemptAt!)}';
    }
    return 'Last sync ${_formatTime(lastSyncAttemptAt!)} • '
        '$lastSyncAcceptedCount accepted / $lastSyncIgnoredCount ignored';
  }

  String assignedLessonSummaryForLearner(LearnerProfile? learner) {
    final lessons = lessonsForLearner(learner);
    if (lessons.isEmpty) return 'No assigned lessons yet.';
    final nextLesson = lessons.first;
    return '${lessons.length} assigned lesson(s) • start with ${nextLesson.title}';
  }

  LearningModule recommendedModuleForLearner(LearnerProfile learner) {
    final backendModuleId = learner.backendRecommendedModuleId;
    final backendModule = modules.cast<LearningModule?>().firstWhere(
          (item) => item?.id == backendModuleId,
          orElse: () => null,
        );
    if (backendModule != null) return backendModule;

    final nextPack = nextAssignmentPackForLearner(learner);
    if (nextPack != null) {
      final assignedModule = modules.cast<LearningModule?>().firstWhere(
            (item) => item?.id == nextPack.moduleId,
            orElse: () => null,
          );
      if (assignedModule != null) return assignedModule;
    }

    final preferredModuleIds = _preferredModuleIdsForLearner(learner);
    final preferredModuleId =
        preferredModuleIds.isEmpty ? null : preferredModuleIds.first;
    return modules.cast<LearningModule?>().firstWhere(
              (item) => item?.id == preferredModuleId,
              orElse: () => modules.isEmpty ? null : modules.first,
            ) ??
        learningModules.first;
  }

  String recommendedModuleLabelForLearner(LearnerProfile learner) {
    return recommendedModuleForLearner(learner).title;
  }

  List<String> _preferredModuleIdsForLearner(LearnerProfile learner) {
    switch (learner.readinessLabel) {
      case 'Confident responder':
        return const ['story', 'life-skills', 'english', 'math'];
      case 'Ready for guided practice':
        return const ['math', 'english', 'life-skills', 'story'];
      case 'Voice-first beginner':
      default:
        return const ['english', 'life-skills', 'math', 'story'];
    }
  }

  String personalizePrompt(String text) {
    final learner = currentLearner;
    if (learner == null) return text;
    return text
        .replaceAll('Aisha', learner.name)
        .replaceAll('Abdullahi', learner.name);
  }

  String personalizeExpectedResponse(String text) {
    final learner = currentLearner;
    if (learner == null) return text;
    return text
        .replaceAll('____', learner.name)
        .replaceAll('Aisha', learner.name)
        .replaceAll('Abdullahi', learner.name);
  }

  void _applyRewardSnapshotsFromSync(Map<String, dynamic> raw) {
    final results = raw['results'];
    if (results is! List) return;

    for (final item in results.whereType<Map>()) {
      final rewardsJson = item['rewards'];
      final learnerId =
          rewardsJson is Map ? rewardsJson['learnerId']?.toString() : null;
      if (learnerId == null || rewardsJson is! Map) continue;

      final snapshot =
          RewardSnapshot.fromJson(Map<String, dynamic>.from(rewardsJson));
      final learnerIndex =
          learners.indexWhere((entry) => entry.id == learnerId);
      if (learnerIndex != -1) {
        learners[learnerIndex] =
            learners[learnerIndex].copyWith(rewards: snapshot);
      }
      if (currentLearner?.id == learnerId) {
        currentLearner = currentLearner!.copyWith(rewards: snapshot);
      }
    }
  }

  void _queueSessionEvent({
    required String type,
    required LessonSessionState session,
    Map<String, dynamic> extra = const {},
  }) {
    final learnerCode = currentLearner?.learnerCode;
    if (learnerCode == null || learnerCode.trim().isEmpty) return;

    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: type,
        payload: {
          'sessionId': session.sessionId,
          'learnerCode': learnerCode,
          'lessonId': session.lesson.id,
          'moduleId': session.lesson.moduleId,
          'stepIndex': session.stepIndex + 1,
          'stepsTotal': session.lesson.steps.length,
          'completionState': session.completionState.name,
          'automationStatus': session.automationStatus,
          'capturedAt': DateTime.now().toIso8601String(),
          ...extra,
        },
      ),
    );
  }

  String _formatTime(DateTime value) {
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

class ResponseEvaluation {
  final ResponseReview review;
  final double similarityScore;
  final bool usedAlias;

  const ResponseEvaluation({
    required this.review,
    required this.similarityScore,
    this.usedAlias = false,
  });
}

class ResponseOutcome {
  final ResponseReview review;
  final int attemptNumber;
  final bool accepted;
  final bool usedAlias;
  final double similarityScore;
  final String supportType;
  final String automationStatus;

  const ResponseOutcome({
    required this.review,
    required this.attemptNumber,
    required this.accepted,
    required this.usedAlias,
    required this.similarityScore,
    required this.supportType,
    required this.automationStatus,
  });

  const ResponseOutcome.ignored()
      : review = ResponseReview.pending,
        attemptNumber = 0,
        accepted = false,
        usedAlias = false,
        similarityScore = 0,
        supportType = 'Ignored',
        automationStatus = 'No learner response was captured.';
}
