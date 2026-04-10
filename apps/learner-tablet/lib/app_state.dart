import 'api_client.dart';
import 'models.dart';
import 'seed_data.dart';

class LumoAppState {
  LumoAppState({LumoApiClient? apiClient})
      : _apiClient = apiClient ?? LumoApiClient();

  final LumoApiClient _apiClient;

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
        ..addAll(data.lessons.isEmpty
            ? assignedLessonsSeed
            : _mergeLessonsWithSeed(data.lessons));

      registrationContext = data.registrationContext;
      usingFallbackData = false;
      lastSyncedAt = DateTime.now();
      backendGeneratedAt = data.generatedAt == null
          ? null
          : DateTime.tryParse(data.generatedAt!);
      backendContractVersion = data.contractVersion;
      backendAssignmentCount = data.assignmentCount;
      lastSyncError = null;

      if (currentLearner != null && learners.isNotEmpty) {
        currentLearner = learners.firstWhere(
          (item) => item.id == currentLearner!.id,
          orElse: () => learners.first,
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

  LessonCardModel? get recommendedLesson {
    final learner = currentLearner;
    if (learner != null) {
      if (learner.readinessLabel == 'Voice-first beginner') {
        return assignedLessons.firstWhere(
          (lesson) => lesson.moduleId == 'english',
          orElse: () => assignedLessons.first,
        );
      }
      if (learner.readinessLabel == 'Ready for guided practice') {
        return assignedLessons.firstWhere(
          (lesson) => lesson.moduleId == 'math',
          orElse: () => assignedLessons.first,
        );
      }
      return assignedLessons.firstWhere(
        (lesson) => lesson.moduleId == 'story',
        orElse: () => assignedLessons.first,
      );
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
    activeSession = LessonSessionState(
      lesson: lesson,
      completionState: LessonCompletionState.inProgress,
      speakerMode: openingStep.speakerMode,
      startedAt: now,
      lastUpdatedAt: now,
      transcript: [
        SessionTurn(
          speaker: 'Mallam',
          text: personalizePrompt(openingStep.coachPrompt),
          timestamp: now,
        ),
      ],
    );
    speakerMode = activeSession!.speakerMode;
  }

  void submitLearnerResponse(String response) {
    final session = activeSession;
    if (session == null) return;

    final trimmed = response.trim();
    if (trimmed.isEmpty) return;

    final expected = personalizeExpectedResponse(
      session.currentStep.expectedResponse,
    ).toLowerCase();
    final normalized = trimmed.toLowerCase();
    final review =
        expected.contains(normalized) || normalized.contains(expected)
            ? ResponseReview.onTrack
            : (trimmed.split(' ').length >= 2 || trimmed.length >= 6)
                ? ResponseReview.onTrack
                : ResponseReview.needsSupport;

    activeSession = session.copyWith(
      latestLearnerResponse: trimmed,
      latestReview: review,
      attemptsThisStep: session.attemptsThisStep + 1,
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
      lastSupportType: review == ResponseReview.needsSupport
          ? 'Needs more support'
          : 'Learner answered independently',
    );
    speakerMode = review == ResponseReview.needsSupport
        ? SpeakerMode.guiding
        : SpeakerMode.affirming;
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
        text =
            'Hint for $learnerName: listen for the key answer — ${personalizeExpectedResponse(step.expectedResponse)}';
        nextMode = SpeakerMode.guiding;
        label = 'Hint given';
        break;
      case 'model':
        text =
            'Model answer: ${personalizeExpectedResponse(step.expectedResponse)}';
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
      transcript: [
        ...session.transcript,
        SessionTurn(speaker: 'Mallam', text: text, timestamp: DateTime.now()),
      ],
    );
    speakerMode = nextMode;
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
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: 'Mallam',
          text: personalizePrompt(nextStep.coachPrompt),
          timestamp: DateTime.now(),
        ),
      ],
      clearLatestLearnerResponse: true,
    );
    speakerMode = nextStep.speakerMode;
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

  void replayCoachPrompt() {
    final session = activeSession;
    if (session == null) {
      speakerMode = SpeakerMode.guiding;
      return;
    }
    activeSession = session.copyWith(
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: 'Mallam',
          text: personalizePrompt(session.currentStep.coachPrompt),
          timestamp: DateTime.now(),
        ),
      ],
      lastSupportType: 'Prompt replay',
    );
    speakerMode = SpeakerMode.guiding;
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

  List<LessonCardModel> _mergeLessonsWithSeed(
      List<LessonCardModel> liveLessons) {
    return liveLessons.map((liveLesson) {
      final seedMatch = assignedLessonsSeed.where(
        (seed) =>
            seed.id == liveLesson.id || seed.moduleId == liveLesson.moduleId,
      );

      if (seedMatch.isEmpty) return liveLesson;
      final seed = seedMatch.first;

      return LessonCardModel(
        id: liveLesson.id,
        moduleId: liveLesson.moduleId,
        title: liveLesson.title,
        subject: liveLesson.subject,
        durationMinutes: liveLesson.durationMinutes,
        status: liveLesson.status,
        mascotName: liveLesson.mascotName,
        readinessFocus: liveLesson.readinessFocus,
        scenario: liveLesson.scenario,
        steps: seed.steps,
      );
    }).toList();
  }

  String _formatTime(DateTime value) {
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}
