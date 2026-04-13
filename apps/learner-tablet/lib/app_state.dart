import 'dart:async';
import 'dart:math';

import 'api_client.dart';
import 'models.dart';
import 'seed_data.dart';

typedef VoiceReplay = Future<void> Function(String text, SpeakerMode mode);
typedef VoiceReplayStop = Future<void> Function();

const bool kEnableSeedDemoContent =
    bool.fromEnvironment('LUMO_ENABLE_SEED_DEMO_CONTENT');

class LumoAppState {
  LumoAppState({LumoApiClient? apiClient})
      : _apiClient = apiClient ?? LumoApiClient();

  final LumoApiClient _apiClient;
  VoiceReplay? voiceReplay;
  VoiceReplayStop? voiceReplayStop;
  Timer? _syncRetryTimer;

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
  final Map<String, List<BackendLessonSession>>
      recentRuntimeSessionsByLearnerId = {};

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
  String? learnerRuntimeError;

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

      final mergedModules = _dedupeModules(
        kEnableSeedDemoContent && data.modules.isEmpty
            ? [
                ...data.modules,
                ...learningModules.where(
                  (seed) => !data.modules.any((item) => item.id == seed.id),
                ),
              ]
            : data.modules,
      );
      modules
        ..clear()
        ..addAll(mergedModules);

      assignedLessons
        ..clear()
        ..addAll(
          data.lessons.isEmpty && kEnableSeedDemoContent
              ? assignedLessonsSeed
              : data.lessons,
        );

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
            ? null
            : learners.cast<LearnerProfile?>().firstWhere(
                  (item) => item?.id == existingLearnerId,
                  orElse: () => null,
                );
        if (currentLearner != null) {
          unawaited(refreshLearnerRuntimeSessions(currentLearner!));
        }
      } else {
        currentLearner = null;
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
      ..addAll(_dedupeModules(hydratedModules));

    if (hydratedLessons.isNotEmpty) {
      if (kEnableSeedDemoContent) {
        final sourceModuleIds = sourceModules.map((item) => item.id).toSet();
        final fallbackByModule = <String, List<LessonCardModel>>{};
        for (final lesson in assignedLessonsSeed) {
          if (!sourceModuleIds.contains(lesson.moduleId)) continue;
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
      } else {
        assignedLessons
          ..clear()
          ..addAll(hydratedLessons);
      }
    }
  }

  List<LearningModule> _dedupeModules(List<LearningModule> source) {
    final byKey = <String, LearningModule>{};

    for (final module in source) {
      final normalizedId = module.id.trim().toLowerCase();
      final normalizedTitle = module.title.trim().toLowerCase();
      final key = normalizedId.isNotEmpty ? normalizedId : normalizedTitle;
      if (!byKey.containsKey(key)) {
        byKey[key] = module;
      }
    }

    return byKey.values.toList();
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
    unawaited(refreshLearnerRuntimeSessions(learner));
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

  LessonCardModel? nextAssignedLessonForLearner(
    LearnerProfile? learner, {
    String? excludingLessonId,
  }) {
    final resumableLesson = resumableLessonForLearner(learner);
    if (resumableLesson != null && resumableLesson.id != excludingLessonId) {
      return resumableLesson;
    }

    final rankedLessons = lessonsForLearner(learner)
        .where((lesson) => lesson.id != excludingLessonId)
        .toList();
    if (rankedLessons.isNotEmpty) return rankedLessons.first;

    if (learner == null) return null;
    final recommendedModule = recommendedModuleForLearner(learner);
    final moduleFallback = assignedLessons.firstWhere(
      (lesson) =>
          lesson.moduleId == recommendedModule.id &&
          lesson.id != excludingLessonId,
      orElse: () => assignedLessons.firstWhere(
        (lesson) => lesson.id != excludingLessonId,
        orElse: () => assignedLessons.first,
      ),
    );
    return moduleFallback.id == excludingLessonId ? null : moduleFallback;
  }

  LessonCardModel? nextLessonAfterCompletion(
    LearnerProfile? learner, {
    required String completedLessonId,
  }) {
    if (learner == null) return null;

    final resumableSession = resumableRuntimeSessionForLearner(learner);
    final resumableLesson = lessonForBackendSession(resumableSession);
    if (resumableLesson != null && resumableLesson.id != completedLessonId) {
      return resumableLesson;
    }

    final assignmentPack = nextAssignmentPackForLearner(learner);
    if (assignmentPack != null &&
        assignmentPack.lessonId != completedLessonId) {
      final assignmentLesson =
          assignedLessons.cast<LessonCardModel?>().firstWhere(
                (lesson) => lesson?.id == assignmentPack.lessonId,
                orElse: () => null,
              );
      if (assignmentLesson != null) return assignmentLesson;
    }

    final recommendedModuleId = recommendedModuleForLearner(learner).id;
    final recommendedModuleLesson =
        assignedLessons.cast<LessonCardModel?>().firstWhere(
              (lesson) =>
                  lesson != null &&
                  lesson.moduleId == recommendedModuleId &&
                  lesson.id != completedLessonId,
              orElse: () => null,
            );
    if (recommendedModuleLesson != null) return recommendedModuleLesson;

    return nextAssignedLessonForLearner(
      learner,
      excludingLessonId: completedLessonId,
    );
  }

  String nextLessonRouteSummaryForLearner(
    LearnerProfile? learner, {
    String? completedLessonId,
  }) {
    if (learner == null) return 'Choose a learner to continue.';

    final resumableSession = resumableRuntimeSessionForLearner(learner);
    final resumableLesson = resumableLessonForLearner(learner);
    if (resumableSession != null &&
        resumableLesson != null &&
        resumableLesson.id != completedLessonId) {
      return 'Resume ${resumableLesson.title} from ${resumableSession.progressLabel.toLowerCase()}.';
    }

    final nextLesson = completedLessonId == null
        ? nextAssignedLessonForLearner(learner)
        : nextLessonAfterCompletion(
            learner,
            completedLessonId: completedLessonId,
          );
    if (nextLesson == null) {
      return 'No next lesson is ready yet. Open ${recommendedModuleForLearner(learner).title} to keep going.';
    }

    final routeSource = nextAssignmentPackForLearner(learner);
    final viaLabel =
        routeSource != null && routeSource.lessonId == nextLesson.id
            ? 'from the live backend assignment'
            : 'from ${recommendedModuleForLearner(learner).title}';
    return 'Next up: ${nextLesson.title} • routed $viaLabel.';
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
      (module) => module.id == 'life-skills',
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
      preferredMallamId: registrationDraft.mallamId,
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

  void startLesson(
    LessonCardModel lesson, {
    BackendLessonSession? resumeFrom,
  }) {
    final now = DateTime.now();
    final isResuming = resumeFrom != null;
    final resumedStepIndex = isResuming
        ? max(
            0,
            min(
              lesson.steps.length - 1,
              (resumeFrom.currentStepIndex <= 0
                      ? 1
                      : resumeFrom.currentStepIndex) -
                  1,
            ),
          )
        : 0;
    final openingStep = lesson.steps[resumedStepIndex];
    final sessionId =
        resumeFrom?.sessionId ?? 'session-${now.millisecondsSinceEpoch}';
    final startedAt = resumeFrom?.startedAt ?? now;
    final learnerName = currentLearner?.name ?? 'the learner';
    final resumePrompt = isResuming
        ? 'Mallam is resuming ${lesson.title} with $learnerName from ${resumeFrom.progressLabel.toLowerCase()}.'
        : 'Mallam is opening the lesson and preparing the first voice prompt.';

    activeSession = LessonSessionState(
      sessionId: sessionId,
      lesson: lesson,
      stepIndex: resumedStepIndex,
      completionState: LessonCompletionState.inProgress,
      speakerMode: openingStep.speakerMode,
      startedAt: startedAt,
      lastUpdatedAt: now,
      totalResponses: resumeFrom?.responsesCaptured ?? 0,
      supportActionsUsed: resumeFrom?.supportActionsUsed ?? 0,
      totalAudioCaptures: resumeFrom?.audioCaptures ?? 0,
      facilitatorObservations: List<String>.filled(
        resumeFrom?.facilitatorObservations ?? 0,
        'Backend observation logged',
      ),
      automationStatus: isResuming
          ? (resumeFrom.automationStatus.trim().isEmpty
              ? resumePrompt
              : '${resumeFrom.automationStatus} Resume from ${resumeFrom.progressLabel.toLowerCase()}.')
          : resumePrompt,
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
        'resumedFromSessionId': resumeFrom?.sessionId,
        'resumedFromStepIndex': resumeFrom?.currentStepIndex,
        'resumeMode': isResuming ? 'backend-runtime-session' : 'fresh-start',
      },
    );
    _attemptSyncSoon();
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
    final practiceMode = session.practiceMode;
    final supportType = review == ResponseReview.needsSupport
        ? (practiceMode == PracticeMode.repeatAfterMe
            ? 'Repeat with Mallam'
            : nextAttempts >= 2
                ? 'Model answer played'
                : 'Hint given')
        : practiceMode == PracticeMode.independentCheck
            ? 'Learner answered independently'
            : 'Learner answered on track';
    final automationStatus = review == ResponseReview.onTrack
        ? (practiceMode == PracticeMode.repeatAfterMe
            ? 'Mallam heard a clear repeat and is ready to continue.'
            : practiceMode == PracticeMode.independentCheck
                ? 'Mallam accepted an independent answer and is ready to continue.'
                : 'Mallam accepted the answer and is ready to continue.')
        : practiceMode == PracticeMode.repeatAfterMe
            ? 'Mallam will replay the target answer and ask the learner to repeat it again.'
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
    _attemptSyncSoon();
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
    final practiceMode = session.practiceMode;
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
          (practiceMode != PracticeMode.repeatAfterMe &&
              (target.contains(normalizedResponse) ||
                  normalizedResponse.contains(target))),
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

    final requiredSimilarity = switch (practiceMode) {
      PracticeMode.repeatAfterMe => 0.88,
      PracticeMode.independentCheck => 0.65,
      PracticeMode.standard => 0.72,
    };
    final requiredWords = switch (practiceMode) {
      PracticeMode.repeatAfterMe => 1,
      PracticeMode.independentCheck => 2,
      PracticeMode.standard => 3,
    };
    final passedBySimilarity =
        wordCount >= requiredWords && similarity >= requiredSimilarity;

    return ResponseEvaluation(
      review: passedBySimilarity
          ? ResponseReview.onTrack
          : ResponseReview.needsSupport,
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
    _attemptSyncSoon();
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
    _queueSessionEvent(
      type: 'facilitator_observation_added',
      session: activeSession!,
      extra: {
        'stepId': session.currentStep.id,
        'stepTitle': session.currentStep.title,
        'observation': observation,
      },
    );
    _attemptSyncSoon();
  }

  void attachLearnerAudioCapture({
    required String path,
    required Duration duration,
    String? audioInputMode,
  }) {
    final session = activeSession;
    if (session == null) return;

    final seconds = duration.inSeconds <= 0 ? 1 : duration.inSeconds;
    activeSession = session.copyWith(
      audioInputMode: audioInputMode ?? 'Shared mic on tablet',
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
    _attemptSyncSoon();
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

  void setPracticeMode(PracticeMode mode) {
    final session = activeSession;
    if (session == null) return;
    activeSession = session.copyWith(
      practiceMode: mode,
      automationStatus: switch (mode) {
        PracticeMode.repeatAfterMe =>
          'Repeat mode is active. Mallam expects the learner to echo the target answer clearly.',
        PracticeMode.independentCheck =>
          'Independent check mode is active. Mallam expects a freer spoken answer with lighter support.',
        PracticeMode.standard =>
          'Standard practice mode is active. Mallam will guide and support as needed.',
      },
    );
  }

  Future<void> repeatCurrentStep({bool slow = false}) async {
    final session = activeSession;
    if (session == null) return;
    final prompt = personalizePrompt(session.currentStep.coachPrompt);
    final spoken = slow ? 'Slow repeat: $prompt' : prompt;
    activeSession = session.copyWith(
      speakerMode: SpeakerMode.guiding,
      lastSupportType: slow ? 'Slow repeat' : 'Prompt replay',
      automationStatus: slow
          ? 'Mallam is repeating the step slowly for practice.'
          : 'Mallam replayed the current step for another try.',
      transcript: [
        ...session.transcript,
        SessionTurn(speaker: 'Mallam', text: spoken, timestamp: DateTime.now()),
      ],
    );
    speakerMode = SpeakerMode.guiding;
    _queueSessionEvent(
      type: 'lesson_step_repeated',
      session: activeSession!,
      extra: {
        'stepId': session.currentStep.id,
        'stepTitle': session.currentStep.title,
        'slow': slow,
      },
    );
    await replayVisiblePrompt(spoken, mode: SpeakerMode.guiding);
  }

  String get degradedModeSummary {
    final flags = <String>[];
    if (usingFallbackData) flags.add('backend offline');
    if (pendingSyncEvents.isNotEmpty) {
      flags.add('${pendingSyncEvents.length} event(s) queued locally');
    }
    if (lastSyncError != null && lastSyncError!.trim().isNotEmpty) {
      flags.add('sync retry pending');
    }
    if (flags.isEmpty) {
      return 'Live mode: backend and lesson sync are available.';
    }
    return 'Degraded mode: ${flags.join(' • ')}. Keep teaching, store audio locally, and sync when the connection returns.';
  }

  List<String> degradedModeActions({
    bool speechAvailable = true,
    int transcriptMisses = 0,
  }) {
    final actions = <String>[];
    if (usingFallbackData) {
      actions.add(
          'Keep teaching from cached lessons while learner events queue locally.');
    }
    if (pendingSyncEvents.isNotEmpty) {
      actions.add('Protect the queue and retry sync when the signal returns.');
    }
    if (lastSyncError != null && lastSyncError!.trim().isNotEmpty) {
      actions.add('Stay in audio-first mode until backend sync recovers.');
    }
    if (!speechAvailable) {
      actions.add(
          'Capture audio even without transcript help, then review or type the answer.');
    }
    if (transcriptMisses >= 2) {
      actions.add(
          'Use Repeat mode and model answers so the learner can keep moving hands-free.');
    }
    if (actions.isEmpty) {
      actions.add('No degraded-mode action needed right now.');
    }
    return actions;
  }

  String rewardCelebrationHeadlineForLearner(LearnerProfile learner) {
    final rewards = learner.rewards;
    if (rewards == null) return 'Nice work, ${learner.name}!';
    if (rewards.nextLevelLabel == null) {
      return '${learner.name} reached the top celebration band!';
    }
    return '${learner.name} is now a ${rewards.levelLabel}!';
  }

  String rewardCelebrationDetailForLearner(LearnerProfile learner) {
    final rewards = learner.rewards;
    if (rewards == null) {
      return 'Lesson complete. Keep the streak alive with one more voice activity.';
    }
    final unlocked = rewards.badges.where((badge) => badge.earned).toList();
    final badgeLine = unlocked.isEmpty
        ? 'Keep going to unlock the first badge.'
        : 'Unlocked ${unlocked.length} badge${unlocked.length == 1 ? '' : 's'} so far.';
    final nextLine = rewards.nextLevelLabel == null
        ? 'Every new lesson now grows confidence, points, and streaks.'
        : '${rewards.xpForNextLevel} XP until ${rewards.nextLevelLabel}.';
    return '$badgeLine $nextLine';
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
      _attemptSyncSoon();
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
    _attemptSyncSoon();
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

    final updatedLearner = learner.copyWith(
      streakDays: learner.streakDays + 1,
      enrollmentStatus: 'Active in lessons',
      lastLessonSummary:
          '${lesson.title}: ${session.totalResponses} responses captured, ${session.supportActionsUsed} support actions, ${session.facilitatorObservations.isEmpty ? 'no facilitator flags' : session.facilitatorObservations.join(', ')}.',
      lastAttendance: 'Completed ${lesson.subject} today',
      rewards: _buildUpdatedRewardSnapshot(learner, session),
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
    await refreshLearnerRuntimeSessions(updatedLearner);
  }

  RewardSnapshot _buildUpdatedRewardSnapshot(
    LearnerProfile learner,
    LessonSessionState session,
  ) {
    final existingRewards = learner.rewards;
    final baseTotalXp = existingRewards?.totalXp ?? learner.totalXp;
    final basePoints = existingRewards?.points ?? learner.totalXp;
    final earnedXp = (12 +
            min(session.totalResponses, 4) +
            (session.supportActionsUsed == 0 ? 3 : 0))
        .toInt();
    final newTotalXp = baseTotalXp + earnedXp;
    final newPoints = basePoints + earnedXp;
    final level = _rewardLevelForXp(newTotalXp);
    final levelFloor = _xpFloorForLevel(level);
    final nextLevel = level >= _rewardLevelTitles.length ? null : level + 1;
    final nextLevelFloor =
        nextLevel == null ? null : _xpFloorForLevel(nextLevel);
    final xpIntoLevel = newTotalXp - levelFloor;
    final xpForNextLevel =
        nextLevelFloor == null ? 0 : nextLevelFloor - newTotalXp;
    final rawProgress = nextLevelFloor == null
        ? 1.0
        : xpIntoLevel / max(1, nextLevelFloor - levelFloor);
    final progressToNextLevel = rawProgress < 0
        ? 0.0
        : (rawProgress > 1 ? 1.0 : rawProgress.toDouble());

    final badges = _updatedRewardBadges(
      learner: learner,
      session: session,
      totalXp: newTotalXp,
      completedLessons:
          _estimatedCompletedLessons(learner, existingRewards) + 1,
      updatedStreakDays: learner.streakDays + 1,
      existingBadges: existingRewards?.badges ?? const <RewardBadge>[],
    );

    return RewardSnapshot(
      learnerId: existingRewards?.learnerId ?? learner.id,
      totalXp: newTotalXp,
      points: newPoints,
      level: level,
      levelLabel: _rewardLevelTitle(level),
      nextLevel: nextLevel,
      nextLevelLabel: nextLevel == null ? null : _rewardLevelTitle(nextLevel),
      xpIntoLevel: xpIntoLevel,
      xpForNextLevel: xpForNextLevel,
      progressToNextLevel: progressToNextLevel,
      badgesUnlocked: badges.where((badge) => badge.earned).length,
      badges: badges,
    );
  }

  int _estimatedCompletedLessons(
    LearnerProfile learner,
    RewardSnapshot? existingRewards,
  ) {
    if (existingRewards != null) {
      return max(1, (existingRewards.totalXp / 12).floor());
    }
    return max(0, learner.streakDays);
  }

  List<RewardBadge> _updatedRewardBadges({
    required LearnerProfile learner,
    required LessonSessionState session,
    required int totalXp,
    required int completedLessons,
    required int updatedStreakDays,
    required List<RewardBadge> existingBadges,
  }) {
    const badgeSpecs = [
      (
        'voice-starter',
        'Voice Starter',
        'First lesson completed with Mallam.',
        'record_voice_over',
        'lesson',
        1
      ),
      (
        'streak-spark',
        'Streak Spark',
        'Keep a 3-day learning streak alive.',
        'local_fire_department',
        'streak',
        3
      ),
      (
        'xp-climber',
        'XP Climber',
        'Reach 160 XP to unlock the next celebration band.',
        'rocket_launch',
        'xp',
        160
      ),
      (
        'independent-echo',
        'Independent Echo',
        'Finish a lesson without support actions.',
        'emoji_events',
        'independence',
        1
      ),
    ];
    final existingById = {for (final badge in existingBadges) badge.id: badge};
    final badges = <RewardBadge>[];

    for (final spec in badgeSpecs) {
      final id = spec.$1;
      final title = spec.$2;
      final description = spec.$3;
      final icon = spec.$4;
      final category = spec.$5;
      final target = spec.$6;
      final existing = existingById[id];
      final progress = switch (id) {
        'voice-starter' => completedLessons,
        'streak-spark' => updatedStreakDays,
        'xp-climber' => totalXp,
        'independent-echo' => session.supportActionsUsed == 0 ? 1 : 0,
        _ => 0,
      };
      badges.add(
        RewardBadge(
          id: id,
          title: title,
          description: description,
          icon: existing?.icon ?? icon,
          category: existing?.category ?? category,
          earned: existing?.earned == true || progress >= target,
          progress: min(max(progress, 0), target),
          target: target,
        ),
      );
    }

    return badges;
  }

  static const List<String> _rewardLevelTitles = [
    'Starter',
    'Rising Voice',
    'Bright Reader',
    'Story Scout',
    'Confidence Captain',
  ];

  int _rewardLevelForXp(int totalXp) {
    for (var level = _rewardLevelTitles.length; level >= 1; level--) {
      if (totalXp >= _xpFloorForLevel(level)) {
        return level;
      }
    }
    return 1;
  }

  int _xpFloorForLevel(int level) {
    if (level <= 1) return 0;
    return (level - 1) * 80;
  }

  String _rewardLevelTitle(int level) {
    final index = (level - 1).clamp(0, _rewardLevelTitles.length - 1);
    return _rewardLevelTitles[index];
  }

  Future<void> syncPendingEvents() async {
    if (usingFallbackData || pendingSyncEvents.isEmpty || isSyncingEvents) {
      return;
    }

    _syncRetryTimer?.cancel();
    final snapshot = List<SyncEvent>.from(pendingSyncEvents);
    isSyncingEvents = true;
    lastSyncAttemptAt = DateTime.now();
    try {
      final result = await _apiClient.syncEvents(snapshot);
      pendingSyncEvents.removeRange(0, snapshot.length);
      lastSyncedAt = result.syncedAt ?? DateTime.now();
      lastSyncAcceptedCount = result.accepted;
      lastSyncIgnoredCount = result.ignored;
      backendContractVersion =
          result.raw['contractVersion']?.toString() ?? backendContractVersion;
      lastSyncError = null;
      backendError = null;
      _applySyncedRuntimeSessions(result.raw);
      _applyBackendSyncResults(result.raw);
      if (pendingSyncEvents.isNotEmpty) {
        _attemptSyncSoon();
      }
    } catch (error) {
      final message = error.toString().replaceFirst('Exception: ', '');
      lastSyncError = message;
      backendError = message;
      _scheduleSyncRetry();
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

  List<BackendLessonSession> recentRuntimeSessionsForLearner(
    LearnerProfile? learner,
  ) {
    if (learner == null) return const [];
    return recentRuntimeSessionsByLearnerId[learner.id] ?? const [];
  }

  BackendLessonSession? resumableRuntimeSessionForLearner(
    LearnerProfile? learner,
  ) {
    final sessions = recentRuntimeSessionsForLearner(learner);
    for (final session in sessions) {
      if (session.status == 'in_progress') return session;
    }
    return null;
  }

  LessonCardModel? lessonForBackendSession(BackendLessonSession? session) {
    if (session == null) return null;

    final directLesson = assignedLessons.cast<LessonCardModel?>().firstWhere(
          (lesson) => lesson?.id == session.lessonId,
          orElse: () => null,
        );
    if (directLesson != null) return directLesson;

    final moduleMatch = assignedLessons.cast<LessonCardModel?>().firstWhere(
          (lesson) =>
              lesson != null &&
              (lesson.moduleId == session.moduleId ||
                  lesson.title.toLowerCase() ==
                      (session.lessonTitle ?? '').toLowerCase()),
          orElse: () => null,
        );
    return moduleMatch;
  }

  LessonCardModel? resumableLessonForLearner(LearnerProfile? learner) {
    return lessonForBackendSession(resumableRuntimeSessionForLearner(learner));
  }

  String runtimeSessionSummaryForLearner(LearnerProfile? learner) {
    final sessions = recentRuntimeSessionsForLearner(learner);
    if (sessions.isEmpty) {
      if (learnerRuntimeError != null) {
        return 'Recent runtime history could not load: $learnerRuntimeError';
      }
      return 'No backend runtime sessions have been loaded yet.';
    }

    final resumable = resumableRuntimeSessionForLearner(learner);
    final latest = resumable ?? sessions.first;
    final activityTime =
        latest.lastActivityAt ?? latest.completedAt ?? latest.startedAt;
    final activityLabel =
        activityTime == null ? 'time pending' : _formatTime(activityTime);
    final lessonLabel = latest.lessonTitle ?? 'Live lesson session';
    final resumeLabel = resumable == null ? '' : 'Resume ready • ';
    return '$resumeLabel${latest.statusLabel} • $lessonLabel • ${latest.progressLabel} • updated $activityLabel';
  }

  Future<void> refreshLearnerRuntimeSessions(
    LearnerProfile learner, {
    int limit = 5,
  }) async {
    if (usingFallbackData || learner.learnerCode.trim().isEmpty) return;

    try {
      final sessions = await _apiClient.fetchRecentSessions(
        learnerCode: learner.learnerCode,
        limit: limit,
      );
      recentRuntimeSessionsByLearnerId[learner.id] = sessions;
      learnerRuntimeError = null;
    } catch (error) {
      learnerRuntimeError = error.toString().replaceFirst('Exception: ', '');
    }
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
        return const ['life-skills', 'english', 'math'];
      case 'Ready for guided practice':
        return const ['math', 'english', 'life-skills'];
      case 'Voice-first beginner':
      default:
        return const ['english', 'life-skills', 'math'];
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

  void _applySyncedRuntimeSessions(Map<String, dynamic> raw) {
    final results = raw['results'];
    if (results is! List) return;

    for (final item in results.whereType<Map>()) {
      final sessionJson = item['session'];
      if (sessionJson is! Map) continue;

      final session = BackendLessonSession.fromJson(
        Map<String, dynamic>.from(sessionJson),
      );
      if (session.studentId.trim().isEmpty) continue;

      final learnerIndex = learners.indexWhere(
        (entry) => entry.id == session.studentId,
      );
      if (learnerIndex == -1) continue;

      final learnerId = learners[learnerIndex].id;
      final existing = List<BackendLessonSession>.from(
        recentRuntimeSessionsByLearnerId[learnerId] ?? const [],
      )..removeWhere((entry) => entry.sessionId == session.sessionId);
      recentRuntimeSessionsByLearnerId[learnerId] = [session, ...existing]
        ..sort((left, right) {
          final rightTime =
              right.lastActivityAt ?? right.completedAt ?? right.startedAt;
          final leftTime =
              left.lastActivityAt ?? left.completedAt ?? left.startedAt;
          if (leftTime == null && rightTime == null) return 0;
          if (leftTime == null) return 1;
          if (rightTime == null) return -1;
          return rightTime.compareTo(leftTime);
        });
    }
  }

  void _applyBackendSyncResults(Map<String, dynamic> raw) {
    final results = raw['results'];
    if (results is! List) return;

    for (final item in results.whereType<Map>()) {
      final rewardsJson = item['rewards'];
      final progressJson = item['progress'];
      final learnerId = _resolveLearnerIdForSyncResult(
        item: item,
        rewardsJson: rewardsJson,
        progressJson: progressJson,
      );
      if (learnerId == null) continue;

      final learnerIndex =
          learners.indexWhere((entry) => entry.id == learnerId);
      if (learnerIndex == -1) continue;

      final existingLearner = learners[learnerIndex];
      final rewardSnapshot = rewardsJson is Map
          ? RewardSnapshot.fromJson(Map<String, dynamic>.from(rewardsJson))
          : existingLearner.rewards;
      final updatedLearner = existingLearner.copyWith(
        rewards: rewardSnapshot,
        backendRecommendedModuleId:
            _readRecommendedModuleIdFromProgress(progressJson) ??
                existingLearner.backendRecommendedModuleId,
        enrollmentStatus: _readEnrollmentStatusFromProgress(progressJson) ??
            existingLearner.enrollmentStatus,
        supportPlan:
            _readSupportPlanFromProgress(progressJson, existingLearner) ??
                existingLearner.supportPlan,
        lastLessonSummary:
            _readLessonSummaryFromProgress(progressJson, existingLearner) ??
                existingLearner.lastLessonSummary,
      );

      learners[learnerIndex] = updatedLearner;
      if (currentLearner?.id == learnerId) {
        currentLearner = updatedLearner;
      }
    }
  }

  String? _resolveLearnerIdForSyncResult({
    required Map item,
    required Object? rewardsJson,
    required Object? progressJson,
  }) {
    final rewardLearnerId =
        rewardsJson is Map ? rewardsJson['learnerId']?.toString() : null;
    if (rewardLearnerId != null && rewardLearnerId.trim().isNotEmpty) {
      return rewardLearnerId;
    }

    final progressLearnerId =
        progressJson is Map ? progressJson['studentId']?.toString() : null;
    if (progressLearnerId != null && progressLearnerId.trim().isNotEmpty) {
      return progressLearnerId;
    }

    final learnerCode = item['learnerCode']?.toString();
    if (learnerCode == null || learnerCode.trim().isEmpty) return null;
    final learner = learners.cast<LearnerProfile?>().firstWhere(
          (entry) => entry?.learnerCode == learnerCode,
          orElse: () => null,
        );
    return learner?.id;
  }

  String? _readRecommendedModuleIdFromProgress(Object? progressJson) {
    if (progressJson is! Map) return null;
    final raw = progressJson['recommendedNextModuleId']?.toString();
    if (raw == null || raw.trim().isEmpty) return null;

    final directMatch = modules.cast<LearningModule?>().firstWhere(
          (module) => module?.id == raw,
          orElse: () => null,
        );
    if (directMatch != null) return directMatch.id;

    final normalized = raw.toLowerCase();
    final subjectMatch = modules.cast<LearningModule?>().firstWhere(
          (module) =>
              module != null &&
              (module.id.toLowerCase() == normalized ||
                  module.title.toLowerCase().contains(normalized)),
          orElse: () => null,
        );
    return subjectMatch?.id;
  }

  String? _readEnrollmentStatusFromProgress(Object? progressJson) {
    if (progressJson is! Map) return null;
    final progressionStatus = progressJson['progressionStatus']?.toString();
    return progressionStatus == 'watch'
        ? 'Needs guided support'
        : 'Active in lessons';
  }

  String? _readSupportPlanFromProgress(
    Object? progressJson,
    LearnerProfile learner,
  ) {
    if (progressJson is! Map) return null;
    final progressionStatus = progressJson['progressionStatus']?.toString();
    if (progressionStatus == 'watch') {
      return 'Use short prompts and one hint before replaying the answer.';
    }
    if (progressionStatus == 'on-track') {
      return 'Use short prompts and praise after each spoken answer.';
    }
    return learner.supportPlan;
  }

  String? _readLessonSummaryFromProgress(
    Object? progressJson,
    LearnerProfile learner,
  ) {
    if (progressJson is! Map) return null;
    final lessonsCompletedRaw = progressJson['lessonsCompleted'];
    final lessonsCompleted = lessonsCompletedRaw is int
        ? lessonsCompletedRaw
        : int.tryParse(lessonsCompletedRaw?.toString() ?? '');
    if (lessonsCompleted == null) return learner.lastLessonSummary;

    final moduleId = _readRecommendedModuleIdFromProgress(progressJson);
    final moduleTitle = moduleId == null
        ? null
        : modules
            .cast<LearningModule?>()
            .firstWhere(
              (module) => module?.id == moduleId,
              orElse: () => null,
            )
            ?.title;
    return moduleTitle == null
        ? '$lessonsCompleted lesson(s) completed in the live backend runtime.'
        : '$lessonsCompleted lesson(s) completed. Backend now routes ${learner.name} toward $moduleTitle.';
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
    _attemptSyncSoon();
  }

  void dispose() {
    _syncRetryTimer?.cancel();
  }

  void _scheduleSyncRetry() {
    _syncRetryTimer?.cancel();
    if (usingFallbackData || pendingSyncEvents.isEmpty) return;
    _syncRetryTimer = Timer(const Duration(seconds: 3), () {
      unawaited(syncPendingEvents());
    });
  }

  void _attemptSyncSoon() {
    if (usingFallbackData || pendingSyncEvents.isEmpty) return;
    Future.microtask(() => unawaited(syncPendingEvents()));
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
