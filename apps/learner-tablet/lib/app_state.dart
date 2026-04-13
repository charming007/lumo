// ignore_for_file: unused_element

import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'models.dart';
import 'seed_data.dart';

typedef VoiceReplay = Future<void> Function(String text, SpeakerMode mode);
typedef VoiceReplayStop = Future<void> Function();

const bool kEnableSeedDemoContent =
    bool.fromEnvironment('LUMO_ENABLE_SEED_DEMO_CONTENT');
const String _kPersistenceStorageKey = 'lumo_learner_tablet_state_v1';
const String _kPersistenceSchemaVersion = '2026-04-13-runtime-persist';

class LumoAppState {
  LumoAppState({LumoApiClient? apiClient})
      : _apiClient = apiClient ?? LumoApiClient();

  final LumoApiClient _apiClient;
  VoiceReplay? voiceReplay;
  VoiceReplayStop? voiceReplayStop;
  Timer? _syncRetryTimer;
  Timer? _persistenceDebounce;

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
  bool restoredFromPersistence = false;
  String? persistenceError;
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

  Future<void> restorePersistedState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kPersistenceStorageKey);
      if (raw == null || raw.trim().isEmpty) return;

      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      final snapshot = Map<String, dynamic>.from(decoded);
      if (snapshot['schemaVersion']?.toString() != _kPersistenceSchemaVersion) {
        persistenceError =
            'Saved tablet state uses an older schema and was skipped safely.';
        return;
      }

      final restoredLearners = (snapshot['learners'] as List?)
              ?.whereType<Map>()
              .map((item) => _decodeLearner(Map<String, dynamic>.from(item)))
              .toList() ??
          const <LearnerProfile>[];
      final restoredModules = (snapshot['modules'] as List?)
              ?.whereType<Map>()
              .map((item) => _decodeModule(Map<String, dynamic>.from(item)))
              .toList() ??
          const <LearningModule>[];
      final restoredLessons = (snapshot['assignedLessons'] as List?)
              ?.whereType<Map>()
              .map((item) => _decodeLesson(Map<String, dynamic>.from(item)))
              .toList() ??
          const <LessonCardModel>[];
      final restoredAssignmentPacks = (snapshot['assignmentPacks'] as List?)
              ?.whereType<Map>()
              .map((item) => LearnerAssignmentPack.fromJson(
                  Map<String, dynamic>.from(item)))
              .toList() ??
          const <LearnerAssignmentPack>[];

      learners
        ..clear()
        ..addAll(
            restoredLearners.isEmpty ? learnerProfilesSeed : restoredLearners);
      modules
        ..clear()
        ..addAll(
          _dedupeModules(
            _sanitizeModules(
              restoredModules.isEmpty ? learningModules : restoredModules,
            ),
          ),
        );
      assignedLessons
        ..clear()
        ..addAll(
          _sanitizeLessons(
            restoredLessons.isEmpty ? assignedLessonsSeed : restoredLessons,
          ),
        );
      assignmentPacks
        ..clear()
        ..addAll(restoredAssignmentPacks);
      pendingSyncEvents
        ..clear()
        ..addAll((snapshot['pendingSyncEvents'] as List?)
                ?.whereType<Map>()
                .map((item) {
              final map = Map<String, dynamic>.from(item);
              return SyncEvent(
                id: map['id']?.toString() ?? 'sync-event',
                type: map['type']?.toString() ?? 'unknown',
                payload: map['payload'] is Map
                    ? Map<String, dynamic>.from(map['payload'])
                    : const <String, dynamic>{},
              );
            }).toList() ??
            const <SyncEvent>[]);

      recentRuntimeSessionsByLearnerId
        ..clear()
        ..addAll(
            ((snapshot['recentRuntimeSessionsByLearnerId'] as Map?) ?? const {})
                .map((key, value) {
          final sessions = (value as List?)
                  ?.whereType<Map>()
                  .map((item) => BackendLessonSession.fromJson(
                      Map<String, dynamic>.from(item)))
                  .toList() ??
              const <BackendLessonSession>[];
          return MapEntry(key.toString(), sessions);
        }));

      registrationDraft =
          _decodeRegistrationDraft(snapshot['registrationDraft']);
      registrationContext =
          _decodeRegistrationContext(snapshot['registrationContext']);
      usingFallbackData = snapshot['usingFallbackData'] != false;
      backendError = _readNullableString(snapshot['backendError']);
      lastSyncedAt = _parseDate(snapshot['lastSyncedAt']);
      backendGeneratedAt = _parseDate(snapshot['backendGeneratedAt']);
      lastSyncAttemptAt = _parseDate(snapshot['lastSyncAttemptAt']);
      backendContractVersion =
          _readNullableString(snapshot['backendContractVersion']);
      backendAssignmentCount = _asInt(snapshot['backendAssignmentCount']) ?? 0;
      lastSyncAcceptedCount = _asInt(snapshot['lastSyncAcceptedCount']) ?? 0;
      lastSyncIgnoredCount = _asInt(snapshot['lastSyncIgnoredCount']) ?? 0;
      lastSyncError = _readNullableString(snapshot['lastSyncError']);
      learnerRuntimeError =
          _readNullableString(snapshot['learnerRuntimeError']);

      final learnerId = _readNullableString(snapshot['currentLearnerId']);
      currentLearner =
          learners.where((item) => item.id == learnerId).firstOrNull;
      final moduleId = _readNullableString(snapshot['selectedModuleId']);
      selectedModule = modules.where((item) => item.id == moduleId).firstOrNull;
      final activeSessionRaw = snapshot['activeSession'];
      activeSession = _decodeActiveSession(activeSessionRaw);
      speakerMode = _decodeSpeakerMode(snapshot['speakerMode']);
      restoredFromPersistence = true;
      persistenceError = null;
    } catch (error) {
      persistenceError = 'Unable to restore saved tablet state: $error';
    }
  }

  void persistStateSoon() {
    _persistenceDebounce?.cancel();
    _persistenceDebounce = Timer(
      const Duration(milliseconds: 400),
      () => unawaited(_persistStateNow()),
    );
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
        _sanitizeModules(
          kEnableSeedDemoContent && data.modules.isEmpty
              ? [
                  ...data.modules,
                  ...learningModules.where(
                    (seed) => !data.modules.any((item) => item.id == seed.id),
                  ),
                ]
              : data.modules,
        ),
      );
      modules
        ..clear()
        ..addAll(mergedModules);

      assignedLessons
        ..clear()
        ..addAll(
          _sanitizeLessons(
            data.lessons.isEmpty && kEnableSeedDemoContent
                ? assignedLessonsSeed
                : data.lessons,
          ),
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
      persistStateSoon();
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
      ..addAll(_dedupeModules(_sanitizeModules(hydratedModules)));

    if (hydratedLessons.isNotEmpty) {
      assignedLessons
        ..clear()
        ..addAll(_sanitizeLessons(hydratedLessons));
    }
  }

  List<LearningModule> _sanitizeModules(List<LearningModule> source) {
    return source.where((module) {
      final id = module.id.trim();
      final title = module.title.trim();
      return id.isNotEmpty &&
          title.isNotEmpty &&
          !_isDeprecatedDemoModule(moduleId: id, title: title);
    }).toList();
  }

  List<LessonCardModel> _sanitizeLessons(List<LessonCardModel> source) {
    return source
        .where(
          (lesson) => !_isDeprecatedDemoModule(
            moduleId: lesson.moduleId,
            title: lesson.title,
            subject: lesson.subject,
            readinessFocus: lesson.readinessFocus,
          ),
        )
        .toList();
  }

  bool _isDeprecatedDemoModule({
    required String moduleId,
    String? title,
    String? subject,
    String? readinessFocus,
  }) {
    final normalizedId = moduleId.trim().toLowerCase();
    final normalizedTitle = title?.trim().toLowerCase() ?? '';
    final normalizedSubject = subject?.trim().toLowerCase() ?? '';
    final normalizedReadiness = readinessFocus?.trim().toLowerCase() ?? '';

    return normalizedId == 'story' ||
        normalizedTitle == 'story time' ||
        normalizedSubject == 'story time' ||
        normalizedReadiness == 'listen and retell' ||
        normalizedReadiness == 'listen & retell';
  }

  List<LearningModule> _dedupeModules(List<LearningModule> source) {
    final byKey = <String, LearningModule>{};

    for (final module in source) {
      final normalizedId = module.id.trim().toLowerCase();
      final normalizedTitle = module.title.trim().toLowerCase();
      final normalizedBadge = module.badge.trim().toLowerCase();
      final key = normalizedId.isNotEmpty ? normalizedId : normalizedTitle;
      final existing = byKey[key];

      if (existing == null) {
        byKey[key] = module;
        continue;
      }

      final currentLessonCount = _readModuleLessonCount(existing.badge);
      final candidateLessonCount = _readModuleLessonCount(normalizedBadge);
      final candidateLooksLive = normalizedBadge.contains('lesson');
      final existingLooksLive = existing.badge.toLowerCase().contains('lesson');
      final shouldReplace = candidateLessonCount > currentLessonCount ||
          (candidateLessonCount == currentLessonCount &&
              candidateLooksLive &&
              !existingLooksLive) ||
          (candidateLessonCount == currentLessonCount &&
              normalizedTitle.length > existing.title.trim().length);

      if (shouldReplace) {
        byKey[key] = module;
      }
    }

    return byKey.values.toList();
  }

  int _readModuleLessonCount(String badge) {
    final match = RegExp(r'(\d+)').firstMatch(badge);
    return int.tryParse(match?.group(1) ?? '') ?? 0;
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
    persistStateSoon();
    unawaited(refreshLearnerRuntimeSessions(learner));
  }

  void selectModule(LearningModule module) {
    selectedModule = module;
    persistStateSoon();
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
    final liveModuleIds = modules.map((item) => item.id).toSet();
    final matches = lessonsForLearner(learner)
        .where(
          (lesson) =>
              lesson.moduleId == moduleId &&
              liveModuleIds.contains(lesson.moduleId),
        )
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

    if (learner == null || assignedLessons.isEmpty) return null;
    final recommendedModule = recommendedModuleForLearner(learner);
    final moduleFallback = assignedLessons.cast<LessonCardModel?>().firstWhere(
          (lesson) =>
              lesson != null &&
              lesson.moduleId == recommendedModule.id &&
              lesson.id != excludingLessonId,
          orElse: () => assignedLessons.cast<LessonCardModel?>().firstWhere(
                (lesson) => lesson?.id != excludingLessonId,
                orElse: () => null,
              ),
        );
    return moduleFallback;
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
    if (modules.isEmpty) {
      return const LearningModule(
        id: 'pending-module',
        title: 'Subject sync pending',
        description:
            'Live subject routing has not loaded yet. Finish registration now and open the learner once lessons sync.',
        voicePrompt:
            'Finish registration first. Subject routing will appear after sync.',
        readinessGoal: 'Wait for backend lesson sync',
        badge: 'Sync pending',
      );
    }

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
    persistStateSoon();
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
      persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
    _attemptSyncSoon();
  }

  void setAudioInputMode(String mode) {
    final session = activeSession;
    if (session == null) return;
    activeSession = session.copyWith(audioInputMode: mode);
    persistStateSoon();
  }

  void setSpeakerOutputMode(String mode) {
    final session = activeSession;
    if (session == null) return;
    activeSession = session.copyWith(speakerOutputMode: mode);
    persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
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
      return 'Live mode: backend, transcript help, and lesson sync are available.';
    }
    return 'Degraded mode: ${flags.join(' • ')}. Keep teaching from cached lessons, save learner audio locally, and sync the queue when the connection returns.';
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
      actions.add(
          'Protect the offline queue, avoid duplicate taps, and retry sync when the signal returns.');
    }
    if (lastSyncError != null && lastSyncError!.trim().isNotEmpty) {
      actions.add(
          'Stay in audio-first mode until backend sync recovers so no learner evidence gets lost.');
    }
    if (!speechAvailable) {
      actions.add(
          'Capture audio even without transcript help, then review or type the answer before advancing.');
    }
    if (transcriptMisses >= 2) {
      actions.add(
          'Use Repeat mode and model answers so the learner can keep moving hands-free even when STT is flaky.');
    }
    if (transcriptMisses >= 3) {
      actions.add(
          'Pause full auto-advance, confirm the last answer manually, and reopen the mic for the next safe turn.');
    }
    if (actions.isEmpty) {
      actions.add('No degraded-mode action needed right now.');
    }
    return actions;
  }

  bool shouldOfferHandsFreeResume({
    required bool speechAvailable,
    required int transcriptMisses,
    bool autoPaused = false,
    bool hasDraftResponse = false,
  }) {
    if (autoPaused) return true;
    if (transcriptMisses >= 2) return true;
    return hasDraftResponse && !speechAvailable;
  }

  String handsFreeRecoverySummary({
    required bool speechAvailable,
    required int transcriptMisses,
    bool autoPaused = false,
    bool hasDraftResponse = false,
  }) {
    if (autoPaused && speechAvailable) {
      return 'Hands-free mode was paused after repeated transcript misses. Transcript help looks ready again, so you can deliberately resume the Mallam → learner loop.';
    }
    if (autoPaused) {
      return 'Hands-free mode was paused after repeated transcript misses. Resume when you are ready; Lumo will keep saving audio even if transcript help is still down.';
    }
    if (transcriptMisses >= 3) {
      return 'Transcript help missed $transcriptMisses takes in a row, so keep the session in audio-first mode until you confirm the answer and resume safely.';
    }
    if (transcriptMisses >= 2) {
      return 'Transcript help is getting shaky. Repeat mode and a deliberate hands-free restart will keep Mallam aligned with the learner.';
    }
    if (hasDraftResponse && !speechAvailable) {
      return 'A response is already drafted. Submit it, then resume the hands-free loop when the mic is stable enough.';
    }
    return 'Hands-free mode is healthy.';
  }

  String rewardCelebrationHeadlineForLearner(LearnerProfile learner) {
    final rewards = learner.rewards;
    if (rewards == null) return 'Nice work, ${learner.name}!';
    final unlocked = rewards.badges.where((badge) => badge.earned).toList();
    if (unlocked.isNotEmpty) {
      final latestBadge = unlocked.last.title;
      if (rewards.nextLevelLabel == null) {
        return '${learner.name} reached the top celebration band and unlocked $latestBadge!';
      }
      return '${learner.name} is now a ${rewards.levelLabel} with $latestBadge!';
    }
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
        : unlocked.length == 1
            ? 'Unlocked ${unlocked.first.title}.'
            : 'Unlocked ${unlocked.length} badges so far: ${unlocked.take(2).map((badge) => badge.title).join(' and ')}${unlocked.length > 2 ? ' +' : ''}.';
    final nextLine = rewards.nextLevelLabel == null
        ? 'Every new lesson now grows confidence, points, and streaks.'
        : '${rewards.xpForNextLevel} XP until ${rewards.nextLevelLabel}.';
    return '$badgeLine $nextLine';
  }

  List<RewardRedemptionOption> rewardRedemptionOptionsForLearner(
    LearnerProfile learner,
  ) {
    final points = learner.rewards?.points ?? learner.totalXp;
    final options = <RewardRedemptionOption>[
      const RewardRedemptionOption(
        id: 'sticker-time',
        title: 'Sticker time',
        description: 'Pick a bright sticker or stamp for today\'s work.',
        cost: 40,
        icon: '🌟',
        celebrationCue:
            'Let the learner choose a sticker immediately after the lesson.',
        category: 'quick win',
      ),
      const RewardRedemptionOption(
        id: 'line-leader',
        title: 'Line leader turn',
        description: 'Lead the line or classroom transition for one round.',
        cost: 55,
        icon: '🚶',
        celebrationCue:
            'Use this when the child needs a visible confidence boost.',
        category: 'classroom privilege',
      ),
      const RewardRedemptionOption(
        id: 'song-choice',
        title: 'Choose the song',
        description: 'You pick the next celebration song or chant.',
        cost: 75,
        icon: '🎵',
        celebrationCue:
            'Offer two song choices so the learner feels the win quickly.',
        category: 'voice & joy',
      ),
      const RewardRedemptionOption(
        id: 'story-choice',
        title: 'Choose story time',
        description: 'Pick the next short story or picture prompt.',
        cost: 120,
        icon: '📚',
        celebrationCue: 'Best redeemed right before the next reading block.',
        category: 'learning treat',
      ),
      const RewardRedemptionOption(
        id: 'helper-badge',
        title: 'Class helper badge',
        description: 'Wear the helper badge for the next activity.',
        cost: 180,
        icon: '🏅',
        celebrationCue: 'Pair this with a real helper job so it feels earned.',
        category: 'recognition',
      ),
      const RewardRedemptionOption(
        id: 'mallam-assistant',
        title: 'Mallam assistant',
        description: 'Help Mallam start the next lesson or hand out materials.',
        cost: 220,
        icon: '🎤',
        celebrationCue:
            'Use for confident learners who are ready to model routines.',
        category: 'leadership',
      ),
    ];

    return options
        .map(
          (option) => option.copyWith(
            unlocked: points >= option.cost,
            shortfall: max(0, option.cost - points),
          ),
        )
        .toList();
  }

  RewardRedemptionOption? featuredRewardForLearner(LearnerProfile learner) {
    final options = rewardRedemptionOptionsForLearner(learner);
    final unlocked = options.where((item) => item.unlocked).toList();
    if (unlocked.isNotEmpty) {
      unlocked.sort((left, right) => left.cost.compareTo(right.cost));
      return unlocked.first;
    }

    final locked = options.where((item) => !item.unlocked).toList();
    if (locked.isEmpty) return null;
    locked.sort((left, right) => left.shortfall.compareTo(right.shortfall));
    return locked.first;
  }

  List<RewardRedemptionOption> nearlyUnlockedRewardsForLearner(
    LearnerProfile learner,
  ) {
    final options = rewardRedemptionOptionsForLearner(learner)
        .where((item) => !item.unlocked)
        .toList();
    options.sort((left, right) => left.shortfall.compareTo(right.shortfall));
    return options.take(2).toList();
  }

  String rewardRedemptionSummaryForLearner(LearnerProfile learner) {
    final options = rewardRedemptionOptionsForLearner(learner);
    final unlocked = options.where((item) => item.unlocked).toList();
    final featured = featuredRewardForLearner(learner);
    if (featured == null) {
      return 'Reward planner is waiting for the next point update.';
    }
    if (unlocked.isEmpty) {
      return '${featured.shortfall} more points unlock ${featured.title.toLowerCase()}. Keep the next reward close and concrete.';
    }
    if (unlocked.length == options.length) {
      return 'All reward choices are unlocked. Let the child pick a favourite now, then save the rest for later.';
    }
    return '${unlocked.length} reward choice(s) are ready now. Featured next: ${featured.title.toLowerCase()}.';
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
      persistStateSoon();
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
    persistStateSoon();
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
    persistStateSoon();
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

    persistStateSoon();
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
            (session.supportActionsUsed == 0 ? 3 : 0) +
            (session.totalAudioCaptures > 0 ? 2 : 0) +
            ((usingFallbackData || pendingSyncEvents.isNotEmpty) ? 2 : 0))
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
        'story-scout',
        'Story Scout',
        'Complete 3 lessons and unlock a longer celebration path.',
        'menu_book',
        'lesson',
        3
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
      (
        'hands-free-hero',
        'Hands-Free Hero',
        'Complete a response loop with learner audio captured and no extra support.',
        'smart_toy',
        'automation',
        1
      ),
      (
        'signal-keeper',
        'Signal Keeper',
        'Finish a lesson safely while offline or waiting for sync recovery.',
        'cloud_off',
        'resilience',
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
        'story-scout' => completedLessons,
        'streak-spark' => updatedStreakDays,
        'xp-climber' => totalXp,
        'independent-echo' => session.supportActionsUsed == 0 ? 1 : 0,
        'hands-free-hero' =>
          session.supportActionsUsed == 0 && session.totalAudioCaptures > 0
              ? 1
              : 0,
        'signal-keeper' => usingFallbackData ||
                pendingSyncEvents.isNotEmpty ||
                (lastSyncError != null && lastSyncError!.trim().isNotEmpty)
            ? 1
            : 0,
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
      persistStateSoon();
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
      persistStateSoon();
    } catch (error) {
      learnerRuntimeError = error.toString().replaceFirst('Exception: ', '');
      persistStateSoon();
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
      persistStateSoon();
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

  Map<String, dynamic> _buildPersistenceSnapshot() {
    return {
      'learners': learners.map(_encodeLearner).toList(),
      'modules': modules.map(_encodeModule).toList(),
      'assignedLessons': assignedLessons.map(_encodeLesson).toList(),
      'assignmentPacks': assignmentPacks.map(_encodeAssignmentPack).toList(),
      'registrationDraft': _encodeRegistrationDraft(registrationDraft),
      'registrationContext': _encodeRegistrationContext(registrationContext),
      'pendingSyncEvents': pendingSyncEvents.map(_encodeSyncEvent).toList(),
      'recentRuntimeSessions': recentRuntimeSessionsByLearnerId.map(
        (key, value) =>
            MapEntry(key, value.map(_encodeBackendLessonSession).toList()),
      ),
      'currentLearnerId': currentLearner?.id,
      'selectedModuleId': selectedModule?.id,
      'activeSession':
          activeSession == null ? null : _encodeLessonSession(activeSession!),
      'speakerMode': speakerMode.name,
      'usingFallbackData': usingFallbackData,
      'backendError': backendError,
      'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      'backendGeneratedAt': backendGeneratedAt?.toIso8601String(),
      'lastSyncAttemptAt': lastSyncAttemptAt?.toIso8601String(),
      'backendContractVersion': backendContractVersion,
      'backendAssignmentCount': backendAssignmentCount,
      'lastSyncAcceptedCount': lastSyncAcceptedCount,
      'lastSyncIgnoredCount': lastSyncIgnoredCount,
      'lastSyncError': lastSyncError,
      'learnerRuntimeError': learnerRuntimeError,
    };
  }

  List<LearnerProfile> _decodeLearners(Object? raw) {
    return (raw as List?)
            ?.whereType<Map>()
            .map((item) => _decodeLearner(Map<String, dynamic>.from(item)))
            .toList() ??
        const <LearnerProfile>[];
  }

  List<LearningModule> _decodeModules(Object? raw) {
    return (raw as List?)
            ?.whereType<Map>()
            .map((item) => _decodeModule(Map<String, dynamic>.from(item)))
            .toList() ??
        const <LearningModule>[];
  }

  List<LessonCardModel> _decodeLessons(Object? raw) {
    return (raw as List?)
            ?.whereType<Map>()
            .map((item) => _decodeLesson(Map<String, dynamic>.from(item)))
            .toList() ??
        const <LessonCardModel>[];
  }

  List<LearnerAssignmentPack> _decodeAssignmentPacks(Object? raw) {
    return (raw as List?)
            ?.whereType<Map>()
            .map((item) =>
                LearnerAssignmentPack.fromJson(Map<String, dynamic>.from(item)))
            .toList() ??
        const <LearnerAssignmentPack>[];
  }

  List<SyncEvent> _decodeSyncEvents(Object? raw) {
    return (raw as List?)
            ?.whereType<Map>()
            .map((item) => SyncEvent(
                  id: item['id']?.toString() ?? 'sync-event',
                  type: item['type']?.toString() ?? 'unknown',
                  payload: item['payload'] is Map
                      ? Map<String, dynamic>.from(item['payload'])
                      : const {},
                ))
            .toList() ??
        const <SyncEvent>[];
  }

  Map<String, List<BackendLessonSession>> _decodeRecentRuntimeSessions(
      Object? raw) {
    final output = <String, List<BackendLessonSession>>{};
    if (raw is! Map) return output;
    for (final entry in raw.entries) {
      output[entry.key.toString()] = (entry.value as List?)
              ?.whereType<Map>()
              .map((item) => BackendLessonSession.fromJson(
                  Map<String, dynamic>.from(item)))
              .toList() ??
          const <BackendLessonSession>[];
    }
    return output;
  }

  LessonSessionState? _decodeActiveSession(Object? raw) {
    if (raw is! Map) return null;
    final lessonId = raw['lessonId']?.toString();
    final lesson = assignedLessons.cast<LessonCardModel?>().firstWhere(
          (item) => item?.id == lessonId,
          orElse: () => null,
        );
    if (lesson == null) return null;

    final transcript = (raw['transcript'] as List?)
            ?.whereType<Map>()
            .map(
              (item) => SessionTurn(
                speaker: item['speaker']?.toString() ?? 'Speaker',
                text: item['text']?.toString() ?? '',
                review: ResponseReview.values.firstWhere(
                  (value) => value.name == item['review']?.toString(),
                  orElse: () => ResponseReview.pending,
                ),
                timestamp: _parseDate(item['timestamp']) ?? DateTime.now(),
              ),
            )
            .toList() ??
        const <SessionTurn>[];

    return LessonSessionState(
      sessionId: raw['sessionId']?.toString() ?? 'session-restored',
      lesson: lesson,
      stepIndex: _asInt(raw['stepIndex']) ?? 0,
      completionState: LessonCompletionState.values.firstWhere(
        (value) => value.name == raw['completionState']?.toString(),
        orElse: () => LessonCompletionState.inProgress,
      ),
      speakerMode: _decodeSpeakerMode(raw['speakerMode']),
      latestLearnerResponse: _readNullableString(raw['latestLearnerResponse']),
      latestReview: ResponseReview.values.firstWhere(
        (value) => value.name == raw['latestReview']?.toString(),
        orElse: () => ResponseReview.pending,
      ),
      supportActionsUsed: _asInt(raw['supportActionsUsed']) ?? 0,
      attemptsThisStep: _asInt(raw['attemptsThisStep']) ?? 0,
      facilitatorObservations: (raw['facilitatorObservations'] as List?)
              ?.map((item) => item.toString())
              .toList() ??
          const <String>[],
      transcript: transcript,
      startedAt: _parseDate(raw['startedAt']) ?? DateTime.now(),
      audioInputMode:
          raw['audioInputMode']?.toString() ?? 'Facilitator typed capture',
      speakerOutputMode:
          raw['speakerOutputMode']?.toString() ?? 'Tablet speaker',
      totalResponses: _asInt(raw['totalResponses']) ?? 0,
      totalAudioCaptures: _asInt(raw['totalAudioCaptures']) ?? 0,
      latestLearnerAudioPath:
          _readNullableString(raw['latestLearnerAudioPath']),
      latestLearnerAudioDuration:
          _asInt(raw['latestLearnerAudioDurationSeconds']) == null
              ? null
              : Duration(
                  seconds: _asInt(raw['latestLearnerAudioDurationSeconds'])!),
      lastSupportType: raw['lastSupportType']?.toString() ?? 'Prompt replay',
      automationStatus:
          raw['automationStatus']?.toString() ?? 'Mallam is ready to begin.',
      practiceMode: PracticeMode.values.firstWhere(
        (value) => value.name == raw['practiceMode']?.toString(),
        orElse: () => PracticeMode.standard,
      ),
      lastUpdatedAt: _parseDate(raw['lastUpdatedAt']) ?? DateTime.now(),
    );
  }

  Map<String, dynamic> _encodeLearner(LearnerProfile learner) => {
        'id': learner.id,
        'name': learner.name,
        'age': learner.age,
        'cohort': learner.cohort,
        'streakDays': learner.streakDays,
        'guardianName': learner.guardianName,
        'preferredLanguage': learner.preferredLanguage,
        'readinessLabel': learner.readinessLabel,
        'village': learner.village,
        'guardianPhone': learner.guardianPhone,
        'sex': learner.sex,
        'baselineLevel': learner.baselineLevel,
        'consentCaptured': learner.consentCaptured,
        'learnerCode': learner.learnerCode,
        'caregiverRelationship': learner.caregiverRelationship,
        'enrollmentStatus': learner.enrollmentStatus,
        'attendanceBand': learner.attendanceBand,
        'supportPlan': learner.supportPlan,
        'lastLessonSummary': learner.lastLessonSummary,
        'lastAttendance': learner.lastAttendance,
        'backendRecommendedModuleId': learner.backendRecommendedModuleId,
        'rewards': learner.rewards == null
            ? null
            : _encodeRewardSnapshot(learner.rewards!),
      };

  LearnerProfile _decodeLearner(Map<String, dynamic> raw) => LearnerProfile(
        id: raw['id']?.toString() ?? 'student-unknown',
        name: raw['name']?.toString() ?? 'Learner',
        age: _asInt(raw['age']) ?? 0,
        cohort: raw['cohort']?.toString() ?? 'Cohort',
        streakDays: _asInt(raw['streakDays']) ?? 0,
        guardianName: raw['guardianName']?.toString() ?? 'Guardian',
        preferredLanguage: raw['preferredLanguage']?.toString() ?? 'Hausa',
        readinessLabel:
            raw['readinessLabel']?.toString() ?? 'Voice-first beginner',
        village: raw['village']?.toString() ?? 'Village pending',
        guardianPhone: raw['guardianPhone']?.toString() ?? '',
        sex: raw['sex']?.toString() ?? 'Boy',
        baselineLevel: raw['baselineLevel']?.toString() ?? 'No prior exposure',
        consentCaptured: raw['consentCaptured'] == true,
        learnerCode: raw['learnerCode']?.toString() ?? '',
        caregiverRelationship:
            raw['caregiverRelationship']?.toString() ?? 'Guardian',
        enrollmentStatus: raw['enrollmentStatus']?.toString() ?? 'Active',
        attendanceBand:
            raw['attendanceBand']?.toString() ?? 'Stable attendance',
        supportPlan: raw['supportPlan']?.toString() ??
            'Short prompts and praise after every answer.',
        lastLessonSummary:
            raw['lastLessonSummary']?.toString() ?? 'No lesson captured yet.',
        lastAttendance: raw['lastAttendance']?.toString() ?? 'Checked in today',
        backendRecommendedModuleId:
            _readNullableString(raw['backendRecommendedModuleId']),
        rewards: raw['rewards'] is Map
            ? _decodeRewardSnapshot(Map<String, dynamic>.from(raw['rewards']))
            : null,
      );

  Map<String, dynamic> _encodeRewardSnapshot(RewardSnapshot reward) => {
        'learnerId': reward.learnerId,
        'totalXp': reward.totalXp,
        'points': reward.points,
        'level': reward.level,
        'levelLabel': reward.levelLabel,
        'nextLevel': reward.nextLevel,
        'nextLevelLabel': reward.nextLevelLabel,
        'xpIntoLevel': reward.xpIntoLevel,
        'xpForNextLevel': reward.xpForNextLevel,
        'progressToNextLevel': reward.progressToNextLevel,
        'badgesUnlocked': reward.badgesUnlocked,
        'badges': reward.badges
            .map((badge) => {
                  'id': badge.id,
                  'title': badge.title,
                  'description': badge.description,
                  'icon': badge.icon,
                  'category': badge.category,
                  'earned': badge.earned,
                  'progress': badge.progress,
                  'target': badge.target,
                })
            .toList(),
      };

  RewardSnapshot _decodeRewardSnapshot(Map<String, dynamic> raw) =>
      RewardSnapshot(
        learnerId: raw['learnerId']?.toString() ?? '',
        totalXp: _asInt(raw['totalXp']) ?? 0,
        points: _asInt(raw['points']) ?? 0,
        level: _asInt(raw['level']) ?? 1,
        levelLabel: raw['levelLabel']?.toString() ?? 'Starter',
        nextLevel: _asInt(raw['nextLevel']),
        nextLevelLabel: _readNullableString(raw['nextLevelLabel']),
        xpIntoLevel: _asInt(raw['xpIntoLevel']) ?? 0,
        xpForNextLevel: _asInt(raw['xpForNextLevel']) ?? 0,
        progressToNextLevel:
            double.tryParse(raw['progressToNextLevel']?.toString() ?? '') ?? 0,
        badgesUnlocked: _asInt(raw['badgesUnlocked']) ?? 0,
        badges: (raw['badges'] as List?)?.whereType<Map>().map((item) {
              final badge = Map<String, dynamic>.from(item);
              return RewardBadge(
                id: badge['id']?.toString() ?? 'badge-unknown',
                title: badge['title']?.toString() ?? 'Badge',
                description: badge['description']?.toString() ?? '',
                icon: badge['icon']?.toString() ?? 'military_tech',
                category: badge['category']?.toString() ?? 'milestone',
                earned: badge['earned'] == true,
                progress: _asInt(badge['progress']) ?? 0,
                target: _asInt(badge['target']) ?? 1,
              );
            }).toList() ??
            const <RewardBadge>[],
      );

  Map<String, dynamic> _encodeModule(LearningModule module) => {
        'id': module.id,
        'title': module.title,
        'description': module.description,
        'voicePrompt': module.voicePrompt,
        'readinessGoal': module.readinessGoal,
        'badge': module.badge,
      };

  LearningModule _decodeModule(Map<String, dynamic> raw) => LearningModule(
        id: raw['id']?.toString() ?? 'module',
        title: raw['title']?.toString() ?? 'Learning module',
        description: raw['description']?.toString() ?? '',
        voicePrompt: raw['voicePrompt']?.toString() ?? '',
        readinessGoal: raw['readinessGoal']?.toString() ?? '',
        badge: raw['badge']?.toString() ?? '',
      );

  Map<String, dynamic> _encodeLesson(LessonCardModel lesson) => {
        'id': lesson.id,
        'moduleId': lesson.moduleId,
        'title': lesson.title,
        'subject': lesson.subject,
        'durationMinutes': lesson.durationMinutes,
        'status': lesson.status,
        'mascotName': lesson.mascotName,
        'readinessFocus': lesson.readinessFocus,
        'scenario': lesson.scenario,
        'activitySteps': lesson.steps
            .map((step) => {
                  'id': step.id,
                  'type': step.type.name,
                  'title': step.title,
                  'instruction': step.instruction,
                  'expectedResponse': step.expectedResponse,
                  'acceptableResponses': step.acceptableResponses,
                  'coachPrompt': step.coachPrompt,
                  'facilitatorTip': step.facilitatorTip,
                  'realWorldCheck': step.realWorldCheck,
                  'speakerMode': step.speakerMode.name,
                  if (step.activity != null)
                    'activity': {
                      'type': step.activity!.type.name,
                      'prompt': step.activity!.prompt,
                      'focusText': step.activity!.focusText,
                      'supportText': step.activity!.supportText,
                      'choices': step.activity!.choiceItems.isEmpty
                          ? step.activity!.choices
                          : step.activity!.choiceItems
                              .map((choice) => {
                                    'id': choice.id,
                                    'label': choice.label,
                                    'isCorrect': choice.isCorrect,
                                    'media': choice.mediaKind == null &&
                                            choice.mediaValue == null
                                        ? null
                                        : {
                                            'kind': choice.mediaKind,
                                            'value': choice.mediaValue,
                                          },
                                  })
                              .toList(),
                      'choiceEmoji': step.activity!.choiceEmoji,
                      'targetResponse': step.activity!.targetResponse,
                      'expectedAnswers': step.activity!.expectedAnswers,
                      'successFeedback': step.activity!.successFeedback,
                      'retryFeedback': step.activity!.retryFeedback,
                      'media': step.activity!.mediaKind == null &&
                              step.activity!.mediaValue == null
                          ? null
                          : {
                              'kind': step.activity!.mediaKind,
                              'value': step.activity!.mediaValue,
                            },
                    },
                })
            .toList(),
      };

  LessonCardModel _decodeLesson(Map<String, dynamic> raw) =>
      LessonCardModel.fromBackend(raw);

  Map<String, dynamic> _encodeAssignmentPack(LearnerAssignmentPack pack) => {
        'assignmentId': pack.assignmentId,
        'lessonPack': {
          'lessonId': pack.lessonId,
          'moduleKey': pack.moduleId,
          'curriculumModuleId': pack.curriculumModuleId,
          'lessonTitle': pack.lessonTitle,
        },
        'cohortName': pack.cohortName,
        'mallamName': pack.mallamName,
        'dueDate': pack.dueDate,
        'assessment': pack.assessmentTitle == null
            ? null
            : {'title': pack.assessmentTitle},
        'eligibleLearners':
            pack.eligibleLearnerIds.map((id) => {'id': id}).toList(),
      };

  Map<String, dynamic> _encodeRegistrationDraft(RegistrationDraft draft) => {
        'name': draft.name,
        'age': draft.age,
        'cohort': draft.cohort,
        'guardianName': draft.guardianName,
        'preferredLanguage': draft.preferredLanguage,
        'readinessLabel': draft.readinessLabel,
        'village': draft.village,
        'guardianPhone': draft.guardianPhone,
        'sex': draft.sex,
        'baselineLevel': draft.baselineLevel,
        'consentCaptured': draft.consentCaptured,
        'caregiverRelationship': draft.caregiverRelationship,
        'supportPlan': draft.supportPlan,
        'mallamId': draft.mallamId,
      };

  RegistrationDraft _decodeRegistrationDraft(Object? raw) {
    if (raw is! Map) return const RegistrationDraft();
    return RegistrationDraft(
      name: raw['name']?.toString() ?? '',
      age: raw['age']?.toString() ?? '',
      cohort: raw['cohort']?.toString() ?? '',
      guardianName: raw['guardianName']?.toString() ?? '',
      preferredLanguage: raw['preferredLanguage']?.toString() ?? 'Hausa',
      readinessLabel:
          raw['readinessLabel']?.toString() ?? 'Voice-first beginner',
      village: raw['village']?.toString() ?? '',
      guardianPhone: raw['guardianPhone']?.toString() ?? '',
      sex: raw['sex']?.toString() ?? 'Boy',
      baselineLevel: raw['baselineLevel']?.toString() ?? 'No prior exposure',
      consentCaptured: raw['consentCaptured'] == true,
      caregiverRelationship:
          raw['caregiverRelationship']?.toString() ?? 'Mother',
      supportPlan: raw['supportPlan']?.toString() ??
          'Use short prompts and repeat once when needed.',
      mallamId: raw['mallamId']?.toString() ?? '',
    );
  }

  Map<String, dynamic> _encodeRegistrationContext(
          RegistrationContext context) =>
      {
        'cohorts': context.cohorts
            .map((cohort) => {
                  'id': cohort.id,
                  'name': cohort.name,
                  'podId': cohort.podId,
                })
            .toList(),
        'mallams': context.mallams
            .map((mallam) => {
                  'id': mallam.id,
                  'displayName': mallam.name,
                  'podIds': mallam.podIds,
                })
            .toList(),
        'defaultTarget': context.defaultTarget == null
            ? null
            : {
                'cohortId': context.defaultTarget!.cohort.id,
                'mallamId': context.defaultTarget!.mallam.id,
              },
      };

  RegistrationContext _decodeRegistrationContext(Object? raw) {
    if (raw is! Map) return const RegistrationContext();
    return RegistrationContext.fromJson(Map<String, dynamic>.from(raw));
  }

  Map<String, dynamic> _encodeSyncEvent(SyncEvent event) => {
        'id': event.id,
        'type': event.type,
        'payload': event.payload,
      };

  Map<String, dynamic> _encodeBackendLessonSession(
          BackendLessonSession session) =>
      {
        'id': session.id,
        'sessionId': session.sessionId,
        'studentId': session.studentId,
        'learnerCode': session.learnerCode,
        'lessonId': session.lessonId,
        'lessonTitle': session.lessonTitle,
        'moduleId': session.moduleId,
        'moduleTitle': session.moduleTitle,
        'status': session.status,
        'completionState': session.completionState,
        'automationStatus': session.automationStatus,
        'currentStepIndex': session.currentStepIndex,
        'stepsTotal': session.stepsTotal,
        'responsesCaptured': session.responsesCaptured,
        'supportActionsUsed': session.supportActionsUsed,
        'audioCaptures': session.audioCaptures,
        'facilitatorObservations': session.facilitatorObservations,
        'latestReview': session.latestReview,
        'startedAt': session.startedAt?.toIso8601String(),
        'lastActivityAt': session.lastActivityAt?.toIso8601String(),
        'completedAt': session.completedAt?.toIso8601String(),
      };

  Map<String, dynamic> _encodeLessonSession(LessonSessionState session) => {
        'sessionId': session.sessionId,
        'lessonId': session.lesson.id,
        'stepIndex': session.stepIndex,
        'completionState': session.completionState.name,
        'speakerMode': session.speakerMode.name,
        'latestLearnerResponse': session.latestLearnerResponse,
        'latestReview': session.latestReview.name,
        'supportActionsUsed': session.supportActionsUsed,
        'attemptsThisStep': session.attemptsThisStep,
        'facilitatorObservations': session.facilitatorObservations,
        'transcript': session.transcript
            .map((turn) => {
                  'speaker': turn.speaker,
                  'text': turn.text,
                  'review': turn.review.name,
                  'timestamp': turn.timestamp.toIso8601String(),
                })
            .toList(),
        'startedAt': session.startedAt.toIso8601String(),
        'audioInputMode': session.audioInputMode,
        'speakerOutputMode': session.speakerOutputMode,
        'totalResponses': session.totalResponses,
        'totalAudioCaptures': session.totalAudioCaptures,
        'latestLearnerAudioPath': session.latestLearnerAudioPath,
        'latestLearnerAudioDurationSeconds':
            session.latestLearnerAudioDuration?.inSeconds,
        'lastSupportType': session.lastSupportType,
        'automationStatus': session.automationStatus,
        'practiceMode': session.practiceMode.name,
        'lastUpdatedAt': session.lastUpdatedAt.toIso8601String(),
      };

  SpeakerMode _decodeSpeakerMode(Object? raw) {
    return SpeakerMode.values.firstWhere(
      (value) => value.name == raw?.toString(),
      orElse: () => SpeakerMode.guiding,
    );
  }

  int? _asInt(Object? raw) {
    if (raw is int) return raw;
    return int.tryParse(raw?.toString() ?? '');
  }

  Future<void> _persistStateNow() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final snapshot = <String, dynamic>{
        'schemaVersion': _kPersistenceSchemaVersion,
        'savedAt': DateTime.now().toIso8601String(),
        'currentLearnerId': currentLearner?.id,
        'selectedModuleId': selectedModule?.id,
        'speakerMode': speakerMode.name,
        'usingFallbackData': usingFallbackData,
        'backendError': backendError,
        'lastSyncedAt': lastSyncedAt?.toIso8601String(),
        'backendGeneratedAt': backendGeneratedAt?.toIso8601String(),
        'lastSyncAttemptAt': lastSyncAttemptAt?.toIso8601String(),
        'backendContractVersion': backendContractVersion,
        'backendAssignmentCount': backendAssignmentCount,
        'lastSyncAcceptedCount': lastSyncAcceptedCount,
        'lastSyncIgnoredCount': lastSyncIgnoredCount,
        'lastSyncError': lastSyncError,
        'learnerRuntimeError': learnerRuntimeError,
        'registrationDraft': _encodeRegistrationDraft(registrationDraft),
        'registrationContext': _encodeRegistrationContext(registrationContext),
        'learners': learners.map(_encodeLearner).toList(),
        'modules': modules.map(_encodeModule).toList(),
        'assignedLessons': assignedLessons.map(_encodeLesson).toList(),
        'assignmentPacks': assignmentPacks.map(_encodeAssignmentPack).toList(),
        'pendingSyncEvents': pendingSyncEvents.map(_encodeSyncEvent).toList(),
        'recentRuntimeSessionsByLearnerId':
            recentRuntimeSessionsByLearnerId.map(
          (key, value) => MapEntry(
            key,
            value.map(_encodeBackendLessonSession).toList(),
          ),
        ),
        'activeSession':
            activeSession == null ? null : _encodeLessonSession(activeSession!),
      };
      await prefs.setString(_kPersistenceStorageKey, jsonEncode(snapshot));
      persistenceError = null;
    } catch (error) {
      persistenceError = 'Unable to save tablet state locally: $error';
    }
  }

  DateTime? _parseDate(Object? raw) {
    final value = raw?.toString();
    if (value == null || value.trim().isEmpty) return null;
    return DateTime.tryParse(value);
  }

  String? _readNullableString(Object? raw) {
    final value = raw?.toString();
    if (value == null || value.trim().isEmpty || value == 'null') return null;
    return value;
  }

  void dispose() {
    _syncRetryTimer?.cancel();
    _persistenceDebounce?.cancel();
    unawaited(_persistStateNow());
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

class RewardRedemptionOption {
  final String id;
  final String title;
  final String description;
  final int cost;
  final String icon;
  final String category;
  final String celebrationCue;
  final bool unlocked;
  final int shortfall;

  const RewardRedemptionOption({
    required this.id,
    required this.title,
    required this.description,
    required this.cost,
    required this.icon,
    this.category = 'reward',
    this.celebrationCue = '',
    this.unlocked = false,
    this.shortfall = 0,
  });

  RewardRedemptionOption copyWith({
    bool? unlocked,
    int? shortfall,
  }) {
    return RewardRedemptionOption(
      id: id,
      title: title,
      description: description,
      cost: cost,
      icon: icon,
      category: category,
      celebrationCue: celebrationCue,
      unlocked: unlocked ?? this.unlocked,
      shortfall: shortfall ?? this.shortfall,
    );
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
