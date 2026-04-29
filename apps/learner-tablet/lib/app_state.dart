// ignore_for_file: unused_element

import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'bundled_content.dart';
import 'dialogue.dart';
import 'models.dart';
import 'seed_data.dart';

typedef VoiceReplay = Future<void> Function(String text, SpeakerMode mode);
typedef VoiceReplayStop = Future<void> Function();

const bool kEnableSeedDemoContent =
    bool.fromEnvironment('LUMO_ENABLE_SEED_DEMO_CONTENT');
const bool kReleaseBuild = bool.fromEnvironment('dart.vm.product');
const String kConfiguredDeviceIdentifier =
    String.fromEnvironment('LUMO_DEVICE_IDENTIFIER');
const String _kPersistenceStorageKey = 'lumo_learner_tablet_state_v1';
const String _kPersistenceSchemaVersion = '2026-04-13-runtime-persist';
const Duration _kTrustedOfflineSnapshotMaxAge = Duration(hours: 24);
const Duration _kOperatorSyncStaleThreshold = Duration(minutes: 30);
const Duration _kOperatorRosterStaleThreshold = Duration(hours: 6);

bool isLearnerVisibleLessonStatus(String status,
    {required bool usingFallbackData}) {
  final normalizedStatus = status.trim().toLowerCase();
  if (normalizedStatus.isEmpty) return true;
  if (normalizedStatus == 'published' ||
      normalizedStatus == 'live' ||
      normalizedStatus == 'assigned' ||
      normalizedStatus == 'bundled') {
    return true;
  }
  return usingFallbackData && normalizedStatus == 'offline';
}

enum ContentOrigin {
  liveBackend,
  localCache,
  bundledOfflinePack,
  seedDemoFallback,
}

extension ContentOriginX on ContentOrigin {
  String get label {
    switch (this) {
      case ContentOrigin.liveBackend:
        return 'Live backend';
      case ContentOrigin.localCache:
        return 'Local cache';
      case ContentOrigin.bundledOfflinePack:
        return 'Bundled pack';
      case ContentOrigin.seedDemoFallback:
        return 'Seed demo';
    }
  }

  String get detail {
    switch (this) {
      case ContentOrigin.liveBackend:
        return 'Fetched from the live learner backend in this session.';
      case ContentOrigin.localCache:
        return 'Recovered from state already cached on this device.';
      case ContentOrigin.bundledOfflinePack:
        return 'Loaded from the offline pack bundled inside the learner app.';
      case ContentOrigin.seedDemoFallback:
        return 'Loaded from built-in demo seed content.';
    }
  }
}

class ContentSourceStatus {
  final ContentOrigin origin;
  final String scopeLabel;
  final String detail;

  const ContentSourceStatus({
    required this.origin,
    required this.scopeLabel,
    required this.detail,
  });

  String get label => origin.label;
}

class LumoAppState {
  LumoAppState({
    LumoApiClient? apiClient,
    BundledContentLoader? bundledContentLoader,
    bool includeSeedDemoContent = kEnableSeedDemoContent,
    String? configuredDeviceIdentifier = kConfiguredDeviceIdentifier,
  })  : _apiClient = apiClient ?? LumoApiClient(),
        _bundledContentLoader =
            bundledContentLoader ?? const BundledContentLoader(),
        _includeSeedDemoContent = includeSeedDemoContent,
        _configuredDeviceIdentifier =
            _normalizeDeviceIdentifier(configuredDeviceIdentifier) {
    _apiClient.deviceIdentifier = _configuredDeviceIdentifier;
    tabletDeviceIdentifier = _configuredDeviceIdentifier;
    _primeInitialContentOrigins();
  }

  final LumoApiClient _apiClient;
  final BundledContentLoader _bundledContentLoader;
  final bool _includeSeedDemoContent;
  final String? _configuredDeviceIdentifier;
  VoiceReplay? voiceReplay;
  VoiceReplayStop? voiceReplayStop;
  Timer? _syncRetryTimer;
  Timer? _persistenceDebounce;
  final Set<VoidCallback> _listeners = <VoidCallback>{};

  LearnerProfile? currentLearner;
  LearningModule? selectedModule;
  LessonSessionState? activeSession;
  SpeakerMode speakerMode = SpeakerMode.guiding;
  RegistrationDraft registrationDraft = const RegistrationDraft();
  RegistrationContext registrationContext = const RegistrationContext();
  String? tabletDeviceIdentifier;
  Map<String, dynamic>? pendingRecoveredSessionSnapshot;

  final List<SyncEvent> pendingSyncEvents = [];
  late final List<LearnerProfile> learners = List.of(
    _includeSeedDemoContent ? learnerProfilesSeed : const <LearnerProfile>[],
  );
  late final List<LearningModule> modules = List.of(
    _includeSeedDemoContent ? learningModules : const <LearningModule>[],
  );
  late final List<LessonCardModel> assignedLessons = List.of(
    _includeSeedDemoContent ? assignedLessonsSeed : const <LessonCardModel>[],
  );
  final List<LearnerAssignmentPack> assignmentPacks = [];
  final Map<String, List<BackendLessonSession>>
      recentRuntimeSessionsByLearnerId = {};
  final Map<String, List<RewardRedemptionRecord>>
      rewardRedemptionHistoryByLearnerId = {};
  final Map<String, ContentOrigin> _moduleContentOrigins = {};
  final Map<String, ContentOrigin> _lessonContentOrigins = {};

  bool isBootstrapping = false;
  bool isRegisteringLearner = false;
  bool isSyncingEvents = false;
  bool usingFallbackData = true;
  bool acknowledgedOfflineFallbackRisk = false;
  bool restoredFromPersistence = false;
  String? deploymentBlockerReason;
  String? persistenceError;
  String? backendError;
  DateTime? lastSyncedAt;
  DateTime? backendGeneratedAt;
  DateTime? lastSyncAttemptAt;
  DateTime? snapshotSavedAt;
  String? snapshotSourceBaseUrl;
  String? snapshotContractVersion;
  bool snapshotTrustedFromLiveBootstrap = false;
  String? backendContractVersion;
  int backendAssignmentCount = 0;
  int lastSyncAcceptedCount = 0;
  int lastSyncIgnoredCount = 0;
  int lastSyncDuplicateCount = 0;
  int lastSyncResultCount = 0;
  List<String> lastSyncWarnings = const [];
  String? lastSyncError;
  String? learnerRuntimeError;

  String get backendBaseUrl => _apiClient.baseUrl;
  String? get stableDeviceIdentifier => tabletDeviceIdentifier;

  static String? _normalizeDeviceIdentifier(String? raw) {
    final trimmed = raw?.trim();
    if (trimmed == null || trimmed.isEmpty) return null;
    return trimmed;
  }

  void attachVoiceReplay(VoiceReplay replay, {VoiceReplayStop? onStop}) {
    voiceReplay = replay;
    voiceReplayStop = onStop;
  }

  void addListener(VoidCallback listener) {
    _listeners.add(listener);
  }

  void removeListener(VoidCallback listener) {
    _listeners.remove(listener);
  }

  void _notifyListeners() {
    for (final listener in List<VoidCallback>.from(_listeners)) {
      listener();
    }
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

  bool get hasOfflineSnapshotPayload =>
      learners.isNotEmpty && modules.isNotEmpty && assignedLessons.isNotEmpty;

  String? get offlineSnapshotTrustProblem {
    if (!hasOfflineSnapshotPayload) {
      return 'This device has no locally cached learner roster, module pack, and assignment set yet.';
    }
    if (!snapshotTrustedFromLiveBootstrap || lastSyncedAt == null) {
      return 'Cached learner data exists, but it was never confirmed by a successful live bootstrap on this device.';
    }
    if (snapshotSourceBaseUrl == null ||
        snapshotSourceBaseUrl != backendBaseUrl) {
      return 'Cached learner data came from a different backend target, so this roster cannot be trusted for the current deployment.';
    }
    if (snapshotSavedAt == null) {
      return 'Cached learner data is missing its saved timestamp, so freshness cannot be proven.';
    }

    final age = DateTime.now().difference(snapshotSavedAt!).abs();
    if (age > _kTrustedOfflineSnapshotMaxAge) {
      return 'Cached learner data is ${_formatDuration(age)} old, which is beyond the 24-hour trust window for release use.';
    }
    if (snapshotContractVersion != null &&
        backendContractVersion != null &&
        snapshotContractVersion != backendContractVersion) {
      return 'Cached learner data was saved against $snapshotContractVersion, but this app is expecting $backendContractVersion.';
    }
    return null;
  }

  bool get hasUsableOfflineSnapshot =>
      hasOfflineSnapshotPayload && offlineSnapshotTrustProblem == null;

  bool get shouldBlockProductionDeployment =>
      kReleaseBuild &&
      deploymentBlockerReason != null &&
      !hasUsableOfflineSnapshot &&
      usingFallbackData;

  String? _liveBootstrapRuntimeBlockerReason(LumoBootstrap data) {
    if (_includeSeedDemoContent) return null;

    final hasLearnerVisibleLessons = data.lessons.any(
      (lesson) => isLearnerVisibleLessonStatus(
        lesson.status,
        usingFallbackData: false,
      ),
    );
    final hasLiveAssignments = data.assignmentPacks.isNotEmpty;
    final hasVisibleCurriculumShell =
        data.modules.isNotEmpty || data.learners.isNotEmpty;

    if (!hasLearnerVisibleLessons &&
        !hasLiveAssignments &&
        hasVisibleCurriculumShell) {
      return 'Production bootstrap returned the learner roster and curriculum shell, but zero learner-visible lessons and zero assignments. That tablet would open into a dead-end learner experience.';
    }

    final scopedRegistration = data.registrationContext.tabletRegistration;
    if (scopedRegistration == null) {
      final hasRegistrationRouting = data.registrationContext.isReady ||
          data.registrationContext.defaultTarget != null;
      final explicitUnregisteredBootstrap = _apiClient.runtimeType
          .toString()
          .contains('UnregisteredTabletBootstrapApiClient');
      if (!kReleaseBuild &&
          !hasRegistrationRouting &&
          !explicitUnregisteredBootstrap) {
        return null;
      }
      final requestedIdentifier = tabletDeviceIdentifier?.trim();
      final identifierDetail = requestedIdentifier == null ||
              requestedIdentifier.isEmpty
          ? 'This tablet has no provisioned device identifier yet.'
          : 'Backend did not recognize device identifier "$requestedIdentifier".';
      return 'Production bootstrap did not return a tablet registration for this device. $identifierDetail The LMS device registry and the learner tablet identifier are out of contract, so the tablet cannot trust the live roster or pod scope yet.';
    }

    return null;
  }

  String get pendingSyncSummary {
    final latest = latestSyncEvent;
    if (latest == null) return 'No pending sync events.';
    final learnerCode =
        latest.payload['learnerCode']?.toString() ?? 'Unknown learner';
    return '${latest.type.replaceAll('_', ' ')} pending for $learnerCode';
  }

  Future<void> allowLimitedOfflineRecoveryMode() async {
    if (kReleaseBuild && !hasUsableOfflineSnapshot) {
      acknowledgedOfflineFallbackRisk = false;
      deploymentBlockerReason ??= offlineSnapshotTrustProblem ??
          backendError ??
          'Learner bootstrap could not reach the production backend.';
      persistStateSoon();
      return;
    }

    acknowledgedOfflineFallbackRisk = true;
    deploymentBlockerReason = null;
    usingFallbackData = true;
    _restoreGuaranteedOfflineFallbackIfNeeded();
    persistStateSoon();
  }

  void _primeInitialContentOrigins() {
    final seedOrigin = _includeSeedDemoContent
        ? ContentOrigin.seedDemoFallback
        : ContentOrigin.localCache;
    _setModuleOrigins(modules, seedOrigin);
    _setLessonOrigins(assignedLessons, seedOrigin);
  }

  void _setModuleOrigins(
    Iterable<LearningModule> modules,
    ContentOrigin origin,
  ) {
    for (final module in modules) {
      final key = module.id.trim();
      if (key.isEmpty) continue;
      _moduleContentOrigins[key] = origin;
    }
  }

  void _setLessonOrigins(
    Iterable<LessonCardModel> lessons,
    ContentOrigin origin,
  ) {
    for (final lesson in lessons) {
      final key = lesson.id.trim();
      if (key.isEmpty) continue;
      _lessonContentOrigins[key] = origin;
    }
  }

  ContentOrigin lessonOriginFor(LessonCardModel lesson) {
    return _lessonContentOrigins[lesson.id.trim()] ??
        (_isBundledFundamentalsLesson(lesson)
            ? ContentOrigin.bundledOfflinePack
            : usingFallbackData && restoredFromPersistence
                ? ContentOrigin.localCache
                : ContentOrigin.seedDemoFallback);
  }

  ContentOrigin moduleOriginFor(LearningModule module) {
    return _moduleContentOrigins[module.id.trim()] ??
        (restoredFromPersistence && usingFallbackData
            ? ContentOrigin.localCache
            : module.badge.toLowerCase().contains('bundled')
                ? ContentOrigin.bundledOfflinePack
                : ContentOrigin.seedDemoFallback);
  }

  ContentSourceStatus sourceStatusForLesson(LessonCardModel lesson) {
    final origin = lessonOriginFor(lesson);
    return ContentSourceStatus(
      origin: origin,
      scopeLabel: lesson.title,
      detail:
          '${origin.detail} ${lesson.steps.length} step(s) are available for this lesson on the tablet.',
    );
  }

  ContentSourceStatus sourceStatusForModule(LearningModule module) {
    final origin = moduleOriginFor(module);
    return ContentSourceStatus(
      origin: origin,
      scopeLabel: module.title,
      detail:
          '${origin.detail} This module currently opens from the ${origin.label.toLowerCase()} path.',
    );
  }

  bool get hasBundledOfflinePack {
    final hasBundledLessons = assignedLessons.any(_isBundledFundamentalsLesson);
    if (hasBundledLessons) return true;
    if (_moduleContentOrigins.values.any((origin) =>
        origin == ContentOrigin.bundledOfflinePack ||
        origin == ContentOrigin.seedDemoFallback)) {
      return true;
    }
    if (_lessonContentOrigins.values.any((origin) =>
        origin == ContentOrigin.bundledOfflinePack ||
        origin == ContentOrigin.seedDemoFallback)) {
      return true;
    }
    return modules.any((module) {
      final badge = module.badge.trim().toLowerCase();
      return badge.contains('bundled') || badge.contains('offline');
    });
  }

  bool get isOperatorSyncStale {
    if (pendingSyncEvents.isEmpty) return false;
    if (isSyncingEvents) return false;
    if (lastSyncError != null && lastSyncError!.trim().isNotEmpty) return true;
    if (lastSyncAttemptAt == null) return true;
    return DateTime.now().difference(lastSyncAttemptAt!).abs() >
        _kOperatorSyncStaleThreshold;
  }

  bool get isOperatorRosterStale {
    if (lastSyncedAt == null) return false;
    return DateTime.now().difference(lastSyncedAt!).abs() >
        _kOperatorRosterStaleThreshold;
  }

  bool get hasAssignmentPayloadGaps =>
      assignedLessons.any((lesson) => lesson.isAssignmentPlaceholder);

  Set<ContentOrigin> get visibleCurriculumOrigins => assignedLessons
      .map(lessonOriginFor)
      .where((origin) => origin != ContentOrigin.seedDemoFallback)
      .toSet();

  bool get hasIntentionalBundledFundamentalsSupplement {
    if (usingFallbackData) return false;
    final origins = visibleCurriculumOrigins;
    if (!origins.contains(ContentOrigin.liveBackend) ||
        !origins.contains(ContentOrigin.bundledOfflinePack)) {
      return false;
    }

    return assignedLessons
        .where(
          (lesson) =>
              lessonOriginFor(lesson) == ContentOrigin.bundledOfflinePack,
        )
        .every(_isBundledFundamentalsLesson);
  }

  bool get curriculumHasMixedOrigins {
    final origins = visibleCurriculumOrigins;
    if (hasIntentionalBundledFundamentalsSupplement) return false;
    if (origins.length > 1) return true;
    return !usingFallbackData &&
        origins.isNotEmpty &&
        origins.single != ContentOrigin.liveBackend;
  }

  String get operatorSourceLabel {
    if (!usingFallbackData && lastSyncedAt != null) {
      return 'Backend link live';
    }
    if (backendError != null) {
      return 'Backend unavailable';
    }
    if (isBootstrapping) return 'Checking backend';
    if (usingFallbackData) {
      return 'Backend offline';
    }
    return 'Connection unknown';
  }

  String get curriculumSourceLabel {
    if (hasAssignmentPayloadGaps) {
      return 'Assignments incomplete';
    }
    if (usingFallbackData && hasBundledOfflinePack) {
      return 'Offline pack curriculum';
    }
    if (usingFallbackData && hasOfflineSnapshotPayload) {
      return 'Cached curriculum';
    }

    final origins = visibleCurriculumOrigins;
    if (!usingFallbackData && origins.isNotEmpty) {
      if ((origins.length == 1 &&
              origins.single == ContentOrigin.liveBackend) ||
          hasIntentionalBundledFundamentalsSupplement) {
        return 'Curriculum live';
      }
      return 'Curriculum mixed';
    }

    if (backendError != null && assignedLessons.isEmpty) {
      return 'Curriculum unavailable';
    }
    if (assignedLessons.isNotEmpty) {
      return 'Curriculum local';
    }
    return 'Curriculum unknown';
  }

  String? get curriculumTruthWarning {
    if (hasAssignmentPayloadGaps) {
      return 'Some live assignments reached the tablet before the full lesson payload, so routing may be right while lesson content is still incomplete.';
    }
    if (!usingFallbackData && curriculumHasMixedOrigins) {
      return 'Backend connectivity is healthy, but the visible curriculum still mixes live lessons with cached or bundled content.';
    }
    if (hasIntentionalBundledFundamentalsSupplement) {
      return null;
    }
    if (usingFallbackData && hasOfflineSnapshotPayload) {
      return 'The tablet is teaching from local cached curriculum, not a fresh live backend fetch.';
    }
    if (usingFallbackData && hasBundledOfflinePack) {
      return 'The visible curriculum is coming from the offline pack, not the current backend publication state.';
    }
    return null;
  }

  String get operatorHealthLabel {
    if (isBootstrapping) return 'Checking backend';
    if (isSyncingEvents) return 'Sync in progress';
    if (backendError != null &&
        usingFallbackData &&
        !hasOfflineSnapshotPayload) {
      return 'Backend unavailable';
    }
    if (isOperatorSyncStale || isOperatorRosterStale) {
      return 'Sync stale';
    }
    if (!usingFallbackData && lastSyncedAt != null && backendError == null) {
      return 'Backend healthy';
    }
    if (backendError != null) return 'Backend unavailable';
    return 'Health unknown';
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
      if (raw == null || raw.trim().isEmpty) {
        await ensureStableDeviceIdentifier();
        return;
      }

      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      final snapshot = Map<String, dynamic>.from(decoded);
      final persistedDeviceIdentifier =
          _readNullableString(snapshot['tabletDeviceIdentifier']);
      final effectiveDeviceIdentifier =
          _configuredDeviceIdentifier ?? persistedDeviceIdentifier;
      if (snapshot['schemaVersion']?.toString() != _kPersistenceSchemaVersion) {
        if (effectiveDeviceIdentifier != null) {
          tabletDeviceIdentifier = effectiveDeviceIdentifier;
          _apiClient.deviceIdentifier = effectiveDeviceIdentifier;
        } else {
          await ensureStableDeviceIdentifier();
        }
        persistenceError =
            'Saved tablet state uses an older schema and was skipped safely.';
        return;
      }

      tabletDeviceIdentifier = effectiveDeviceIdentifier;
      _apiClient.deviceIdentifier = effectiveDeviceIdentifier;

      var restoredRegistrationContext =
          _decodeRegistrationContext(snapshot['registrationContext']);
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

      final restoredScopedLearners = _normalizeLearnersToRegistrationContext(
        _learnersWithinTabletPodScope(
          restoredLearners.isEmpty && _includeSeedDemoContent
              ? learnerProfilesSeed
              : restoredLearners,
          registrationContext: restoredRegistrationContext,
        ),
        registrationContext: restoredRegistrationContext,
      );
      restoredRegistrationContext = _normalizeRegistrationContextPodLabel(
        restoredRegistrationContext,
        restoredScopedLearners,
      );

      learners
        ..clear()
        ..addAll(restoredScopedLearners);
      modules
        ..clear()
        ..addAll(
          _dedupeModules(
            _sanitizeModules(
              restoredModules.isEmpty && _includeSeedDemoContent
                  ? learningModules
                  : restoredModules,
            ),
          ),
        );
      _moduleContentOrigins
        ..clear()
        ..addAll(((snapshot['moduleContentOrigins'] as Map?) ?? const {})
            .map((key, value) => MapEntry(
                  key.toString(),
                  ContentOrigin.values.firstWhere(
                    (item) => item.name == value?.toString(),
                    orElse: () => ContentOrigin.localCache,
                  ),
                )));
      if (_moduleContentOrigins.isEmpty) {
        _setModuleOrigins(
          modules,
          restoredModules.isEmpty && _includeSeedDemoContent
              ? ContentOrigin.seedDemoFallback
              : ContentOrigin.localCache,
        );
      }
      assignedLessons
        ..clear()
        ..addAll(
          _sanitizeLessons(
            restoredLessons.isEmpty && _includeSeedDemoContent
                ? assignedLessonsSeed
                : restoredLessons,
          ),
        );
      _lessonContentOrigins
        ..clear()
        ..addAll(((snapshot['lessonContentOrigins'] as Map?) ?? const {})
            .map((key, value) => MapEntry(
                  key.toString(),
                  ContentOrigin.values.firstWhere(
                    (item) => item.name == value?.toString(),
                    orElse: () => ContentOrigin.localCache,
                  ),
                )));
      if (_lessonContentOrigins.isEmpty) {
        _setLessonOrigins(
          assignedLessons,
          restoredLessons.isEmpty && _includeSeedDemoContent
              ? ContentOrigin.seedDemoFallback
              : ContentOrigin.localCache,
        );
      }
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

      final persistedRecentRuntimeSessions =
          (snapshot['recentRuntimeSessionsByLearnerId'] as Map?) ??
              (snapshot['recentRuntimeSessions'] as Map?) ??
              const {};
      recentRuntimeSessionsByLearnerId
        ..clear()
        ..addAll(persistedRecentRuntimeSessions.map((key, value) {
          final sessions = (value as List?)
                  ?.whereType<Map>()
                  .map((item) => BackendLessonSession.fromJson(
                      Map<String, dynamic>.from(item)))
                  .toList() ??
              const <BackendLessonSession>[];
          return MapEntry(key.toString(), sessions);
        }));

      final persistedRewardHistory =
          (snapshot['rewardRedemptionHistoryByLearnerId'] as Map?) ?? const {};
      rewardRedemptionHistoryByLearnerId
        ..clear()
        ..addAll(persistedRewardHistory.map((key, value) {
          final history = (value as List?)
                  ?.whereType<Map>()
                  .map((item) => RewardRedemptionRecord.fromJson(
                      Map<String, dynamic>.from(item)))
                  .toList() ??
              const <RewardRedemptionRecord>[];
          return MapEntry(key.toString(), history);
        }));

      registrationDraft =
          _decodeRegistrationDraft(snapshot['registrationDraft']);
      registrationContext = restoredRegistrationContext;
      learners.retainWhere(learnerMatchesTabletPod);
      usingFallbackData = snapshot['usingFallbackData'] != false;
      acknowledgedOfflineFallbackRisk =
          !kReleaseBuild && snapshot['acknowledgedOfflineFallbackRisk'] == true;
      backendError = _readNullableString(snapshot['backendError']);
      lastSyncedAt = _parseDate(snapshot['lastSyncedAt']);
      backendGeneratedAt = _parseDate(snapshot['backendGeneratedAt']);
      lastSyncAttemptAt = _parseDate(snapshot['lastSyncAttemptAt']);
      snapshotSavedAt = _parseDate(snapshot['savedAt']);
      snapshotSourceBaseUrl = _readNullableString(snapshot['sourceBaseUrl']);
      snapshotContractVersion =
          _readNullableString(snapshot['snapshotContractVersion']);
      snapshotTrustedFromLiveBootstrap =
          snapshot['snapshotTrustedFromLiveBootstrap'] == true;
      backendContractVersion =
          _readNullableString(snapshot['backendContractVersion']);
      backendAssignmentCount = _asInt(snapshot['backendAssignmentCount']) ?? 0;
      lastSyncAcceptedCount = _asInt(snapshot['lastSyncAcceptedCount']) ?? 0;
      lastSyncIgnoredCount = _asInt(snapshot['lastSyncIgnoredCount']) ?? 0;
      lastSyncDuplicateCount = _asInt(snapshot['lastSyncDuplicateCount']) ?? 0;
      lastSyncResultCount = _asInt(snapshot['lastSyncResultCount']) ?? 0;
      lastSyncWarnings = (snapshot['lastSyncWarnings'] as List?)
              ?.map((item) => item.toString())
              .where((item) => item.trim().isNotEmpty)
              .toList() ??
          const <String>[];
      lastSyncError = _readNullableString(snapshot['lastSyncError']);
      learnerRuntimeError =
          _readNullableString(snapshot['learnerRuntimeError']);
      snapshotSavedAt =
          _parseDate(snapshot['snapshotSavedAt']) ?? snapshotSavedAt;

      final activeSessionRaw = snapshot['activeSession'];
      final learnerId = _readNullableString(snapshot['currentLearnerId']) ??
          (activeSessionRaw is Map
              ? _readNullableString(activeSessionRaw['currentLearnerId'])
              : null);
      currentLearner =
          learners.where((item) => item.id == learnerId).firstOrNull;
      final moduleId = _readNullableString(snapshot['selectedModuleId']);
      selectedModule = modules.where((item) => item.id == moduleId).firstOrNull;
      activeSession = _decodeActiveSession(activeSessionRaw);
      pendingRecoveredSessionSnapshot =
          activeSession == null && activeSessionRaw is Map
              ? Map<String, dynamic>.from(activeSessionRaw)
              : null;
      speakerMode = _decodeSpeakerMode(snapshot['speakerMode']);
      deploymentBlockerReason =
          hasUsableOfflineSnapshot ? null : offlineSnapshotTrustProblem;
      restoredFromPersistence = true;
      await ensureStableDeviceIdentifier();
      persistenceError = null;
    } catch (error) {
      persistenceError = 'Unable to restore saved tablet state: $error';
    }
  }

  void persistStateSoon() {
    _notifyListeners();
    _persistenceDebounce?.cancel();
    _persistenceDebounce = Timer(
      const Duration(milliseconds: 400),
      () => unawaited(_persistStateNow()),
    );
  }

  Future<void> flushPersistence() async {
    _persistenceDebounce?.cancel();
    await _persistStateNow();
  }

  Future<void> bootstrap() async {
    await ensureStableDeviceIdentifier();
    if (isBootstrapping) return;
    isBootstrapping = true;
    backendError = null;

    final invalidProductionBaseUrlReason =
        kReleaseBuild ? _apiClient.invalidProductionBaseUrlReason : null;
    if (invalidProductionBaseUrlReason != null) {
      usingFallbackData = true;
      backendError = invalidProductionBaseUrlReason;
      deploymentBlockerReason = invalidProductionBaseUrlReason;
      isBootstrapping = false;
      persistStateSoon();
      return;
    }

    try {
      final data = await _apiClient.fetchBootstrap();
      registrationContext = data.registrationContext;
      final existingLearnersById = {
        for (final learner in learners) learner.id: learner,
      };
      final existingLearnersByCode = {
        for (final learner in learners)
          if (learner.learnerCode.trim().isNotEmpty)
            learner.learnerCode: learner,
      };
      final bootstrapLearners = _normalizeLearnersToRegistrationContext(
        _learnersWithinTabletPodScope(
          data.learners.isEmpty && _includeSeedDemoContent
              ? learnerProfilesSeed
              : data.learners,
          registrationContext: registrationContext,
        ),
        registrationContext: registrationContext,
      );
      registrationContext = _normalizeRegistrationContextPodLabel(
        registrationContext,
        bootstrapLearners,
      );
      learners
        ..clear()
        ..addAll(
          bootstrapLearners
              .map(
                (learner) => _mergeLearnerProfile(
                  existingLearner: existingLearnersById[learner.id] ??
                      existingLearnersByCode[learner.learnerCode],
                  incomingLearner: learner,
                ),
              )
              .toList(growable: false),
        );

      final mergedModules = _dedupeModules(
        _sanitizeModules(
          _includeSeedDemoContent && data.modules.isEmpty
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
      _moduleContentOrigins.clear();
      _setModuleOrigins(
        mergedModules,
        data.modules.isEmpty && _includeSeedDemoContent
            ? ContentOrigin.seedDemoFallback
            : ContentOrigin.liveBackend,
      );

      assignedLessons
        ..clear()
        ..addAll(
          _sanitizeLessons(
            data.lessons.isEmpty && _includeSeedDemoContent
                ? assignedLessonsSeed
                : data.lessons,
          ),
        );
      _lessonContentOrigins.clear();
      _setLessonOrigins(
        assignedLessons,
        data.lessons.isEmpty && _includeSeedDemoContent
            ? ContentOrigin.seedDemoFallback
            : ContentOrigin.liveBackend,
      );

      assignmentPacks
        ..clear()
        ..addAll(data.assignmentPacks);
      final liveBootstrapRuntimeBlocker =
          _liveBootstrapRuntimeBlockerReason(data);
      usingFallbackData = liveBootstrapRuntimeBlocker != null;
      acknowledgedOfflineFallbackRisk = false;
      deploymentBlockerReason = liveBootstrapRuntimeBlocker;
      backendError = liveBootstrapRuntimeBlocker;
      lastSyncedAt = DateTime.now();
      lastSyncAttemptAt = lastSyncedAt;
      snapshotSavedAt = lastSyncedAt;
      snapshotSourceBaseUrl = backendBaseUrl;
      snapshotContractVersion = data.contractVersion;
      snapshotTrustedFromLiveBootstrap = true;
      backendGeneratedAt = data.generatedAt == null
          ? null
          : DateTime.tryParse(data.generatedAt!);
      backendContractVersion = data.contractVersion;
      backendAssignmentCount = data.assignmentCount;
      lastSyncError = null;

      await _hydrateModuleBundles(mergedModules);
      await _mergeBundledOfflineContent();

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
      _recoverPendingSessionAfterRefresh();
    } catch (error) {
      usingFallbackData = true;
      backendError = error.toString().replaceFirst('Exception: ', '');
      final needsProductionBlocker = kReleaseBuild &&
          !_includeSeedDemoContent &&
          !hasUsableOfflineSnapshot;
      deploymentBlockerReason = needsProductionBlocker
          ? [
              backendError,
              offlineSnapshotTrustProblem,
            ].whereType<String>().join(' ')
          : null;
      if (!needsProductionBlocker) {
        _restoreGuaranteedOfflineFallbackIfNeeded();
        await _mergeBundledOfflineContent();
      }
    } finally {
      isBootstrapping = false;
      persistStateSoon();
    }
  }

  void _restoreGuaranteedOfflineFallbackIfNeeded() {
    final hasOfflinePath =
        learners.isNotEmpty && modules.isNotEmpty && assignedLessons.isNotEmpty;
    if (hasOfflinePath) return;

    if (learners.isEmpty && !_hasTabletPodScope()) {
      learners
        ..clear()
        ..addAll(learnerProfilesSeed);
    }

    if (modules.isEmpty) {
      modules
        ..clear()
        ..addAll(_dedupeModules(_sanitizeModules(learningModules)));
      _setModuleOrigins(modules, ContentOrigin.seedDemoFallback);
    }

    if (assignedLessons.isEmpty) {
      assignedLessons
        ..clear()
        ..addAll(_sanitizeLessons(assignedLessonsSeed));
      _setLessonOrigins(assignedLessons, ContentOrigin.seedDemoFallback);
    }

    selectedModule ??= modules.isNotEmpty ? modules.first : null;
    currentLearner ??= suggestedLearnerForHome;
  }

  Future<void> _mergeBundledOfflineContent() async {
    try {
      final bundled = await _bundledContentLoader.load();
      if (bundled.isEmpty) return;

      final existingModules = List<LearningModule>.from(modules);
      modules
        ..clear()
        ..addAll(
          _dedupeModules(
            _sanitizeModules([
              ...existingModules,
              ...bundled.modules,
            ]),
          ),
        );
      for (final module in bundled.modules) {
        final key = module.id.trim();
        if (key.isEmpty) continue;
        final existingOrigin = _moduleContentOrigins[key];
        if (existingOrigin == null ||
            existingOrigin != ContentOrigin.liveBackend) {
          _moduleContentOrigins[key] = ContentOrigin.bundledOfflinePack;
        }
      }

      final mergedLessonMap = <String, LessonCardModel>{
        for (final lesson in assignedLessons) lesson.id.trim(): lesson,
      };
      for (final lesson in bundled.lessons) {
        final key = lesson.id.trim();
        final existing = mergedLessonMap[key];
        if (existing == null || _shouldPreferBundledLesson(lesson, existing)) {
          mergedLessonMap[key] = lesson;
          _lessonContentOrigins[key] = ContentOrigin.bundledOfflinePack;
        }
      }

      assignedLessons
        ..clear()
        ..addAll(
          _sanitizeLessons(mergedLessonMap.values.toList()),
        );
    } catch (_) {
      // Bundled starter content is optional. If it fails, the tablet should keep going.
    }
  }

  Future<void> _hydrateModuleBundles(List<LearningModule> sourceModules) async {
    if (usingFallbackData || sourceModules.isEmpty) return;

    final hydratedModules = <LearningModule>[];
    final baselineLessons =
        _sanitizeLessons(List<LessonCardModel>.from(assignedLessons));
    final lessonsByModule = <String, List<LessonCardModel>>{};

    for (final lesson in baselineLessons) {
      final moduleId = lesson.moduleId.trim();
      if (moduleId.isEmpty) continue;
      lessonsByModule
          .putIfAbsent(moduleId, () => <LessonCardModel>[])
          .add(lesson);
    }

    for (final module in sourceModules) {
      try {
        final bundle = await _apiClient.fetchModuleBundle(module.id);
        hydratedModules.add(bundle.module);
        _moduleContentOrigins[bundle.module.id.trim()] =
            ContentOrigin.liveBackend;
        final hydratedLessons = _sanitizeLessons(bundle.lessons);
        final preservedBaselineLessons = List<LessonCardModel>.from(
          lessonsByModule[bundle.module.id] ??
              lessonsByModule[module.id] ??
              const <LessonCardModel>[],
        );
        final mergedLessons = _mergeHydratedLessons(
          hydratedLessons: hydratedLessons,
          baselineLessons: preservedBaselineLessons,
        );
        lessonsByModule[bundle.module.id] = mergedLessons;
        final hydratedLessonIds = hydratedLessons
            .map((lesson) => lesson.id.trim())
            .where((id) => id.isNotEmpty)
            .toSet();
        for (final lesson in mergedLessons) {
          final key = lesson.id.trim();
          if (key.isEmpty) continue;
          if (hydratedLessonIds.contains(key) &&
              !_isBundledFundamentalsLesson(lesson)) {
            _lessonContentOrigins[key] = ContentOrigin.liveBackend;
          }
        }
      } catch (_) {
        hydratedModules.add(module);
      }
    }

    modules
      ..clear()
      ..addAll(_dedupeModules(_sanitizeModules(hydratedModules)));

    assignedLessons
      ..clear()
      ..addAll(
        _sanitizeLessons(
          lessonsByModule.values.expand((lessons) => lessons).toList(),
        ),
      );
  }

  List<LearningModule> _sanitizeModules(List<LearningModule> source) {
    return source.where((module) {
      final id = module.id.trim();
      final title = module.title.trim();
      return id.isNotEmpty &&
          title.isNotEmpty &&
          !_isDeprecatedDemoModule(moduleId: id, title: title) &&
          _isLearnerVisibleModule(module);
    }).toList();
  }

  List<LessonCardModel> _mergeHydratedLessons({
    required List<LessonCardModel> hydratedLessons,
    required List<LessonCardModel> baselineLessons,
  }) {
    if (hydratedLessons.isEmpty) {
      return baselineLessons;
    }

    final baselineById = {
      for (final lesson in baselineLessons) lesson.id.trim(): lesson,
    };
    final mergedHydrated = hydratedLessons.map((lesson) {
      final baselineMatch = baselineById[lesson.id.trim()];
      if (baselineMatch != null &&
          _shouldPreferBundledLesson(baselineMatch, lesson)) {
        return baselineMatch;
      }
      return lesson;
    }).toList();

    if (hydratedLessons.length >= baselineLessons.length) {
      return mergedHydrated;
    }

    final hydratedIds =
        mergedHydrated.map((lesson) => lesson.id.trim()).toSet();
    final preservedBaseline = baselineLessons
        .where((lesson) => !hydratedIds.contains(lesson.id.trim()))
        .toList();

    return [
      ...preservedBaseline.reversed,
      ...mergedHydrated,
    ];
  }

  List<LessonCardModel> _sanitizeLessons(List<LessonCardModel> source) {
    return source
        .where(
          (lesson) =>
              lesson.steps.isNotEmpty &&
              !_isDeprecatedDemoModule(
                moduleId: lesson.moduleId,
                title: lesson.title,
                subject: lesson.subject,
                readinessFocus: lesson.readinessFocus,
              ) &&
              _isLearnerVisibleLesson(lesson),
        )
        .toList();
  }

  bool _isLearnerVisibleModule(LearningModule module) {
    final normalizedStatus = module.status.trim().toLowerCase();
    if (normalizedStatus.isEmpty) return true;
    if (_looksBlockedPublicationState(normalizedStatus)) {
      return _moduleLooksBundledOffline(module);
    }
    return true;
  }

  bool _isLearnerVisibleLesson(LessonCardModel lesson) {
    if (_isBundledFundamentalsLesson(lesson)) return true;
    final normalizedStatus = lesson.status.trim().toLowerCase();
    if (normalizedStatus.isEmpty) return true;
    return !_looksBlockedPublicationState(normalizedStatus);
  }

  bool _looksBlockedPublicationState(String status) {
    return status == 'draft' ||
        status == 'review' ||
        status == 'approved' ||
        status == 'unpublished' ||
        status == 'archived' ||
        status == 'retired' ||
        status == 'deleted' ||
        status == 'hidden';
  }

  bool _moduleLooksBundledOffline(LearningModule module) {
    final normalizedId = module.id.trim().toLowerCase();
    final normalizedTitle = module.title.trim().toLowerCase();
    final normalizedBadge = module.badge.trim().toLowerCase();
    final normalizedStatus = module.status.trim().toLowerCase();
    return normalizedId.startsWith('fundamentals-') ||
        normalizedId.startsWith('lumo-fundamentals') ||
        normalizedTitle.contains('fundamentals') ||
        normalizedBadge.contains('bundled') ||
        normalizedBadge.contains('offline') ||
        normalizedStatus.contains('bundled');
  }

  bool _shouldPreferBundledLesson(
    LessonCardModel candidate,
    LessonCardModel existing,
  ) {
    if (!_isBundledFundamentalsLesson(candidate)) return false;
    if (_isBundledFundamentalsLesson(existing)) {
      return candidate.steps.length >= existing.steps.length;
    }
    return true;
  }

  bool _isBundledFundamentalsLesson(LessonCardModel lesson) {
    final normalizedId = lesson.id.trim().toLowerCase();
    final normalizedModuleId = lesson.moduleId.trim().toLowerCase();
    final normalizedSubject = lesson.subject.trim().toLowerCase();
    final normalizedStatus = lesson.status.trim().toLowerCase();
    return normalizedId.startsWith('fundamentals-') ||
        normalizedId.startsWith('lf-') ||
        normalizedModuleId.startsWith('fundamentals-') ||
        normalizedModuleId.startsWith('lumo-fundamentals') ||
        normalizedSubject.contains('fundamentals') ||
        normalizedStatus.contains('bundled');
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

  String? get tabletPodId => _tabletPodIdFor(registrationContext);

  bool _hasTabletPodScope({RegistrationContext? registrationContext}) {
    final podId =
        _tabletPodIdFor(registrationContext ?? this.registrationContext);
    return podId != null && podId.isNotEmpty;
  }

  String? _tabletPodIdFor(RegistrationContext registrationContext) {
    String? normalize(String? value) {
      final trimmed = value?.trim();
      return trimmed == null || trimmed.isEmpty ? null : trimmed;
    }

    final scopedCohortPodIds = registrationContext.cohorts
        .map((cohort) => normalize(cohort.podId))
        .whereType<String>()
        .toSet();
    final tabletRegistrationPodId =
        normalize(registrationContext.tabletRegistration?.podId);
    final defaultTargetPodId =
        normalize(registrationContext.defaultTarget?.cohort.podId);

    if (tabletRegistrationPodId != null &&
        (scopedCohortPodIds.isEmpty ||
            scopedCohortPodIds.contains(tabletRegistrationPodId))) {
      return tabletRegistrationPodId;
    }

    if (defaultTargetPodId != null &&
        (scopedCohortPodIds.isEmpty ||
            scopedCohortPodIds.contains(defaultTargetPodId))) {
      return defaultTargetPodId;
    }

    if (scopedCohortPodIds.length == 1) {
      return scopedCohortPodIds.first;
    }

    return tabletRegistrationPodId ?? defaultTargetPodId;
  }

  List<LearnerProfile> _learnersWithinTabletPodScope(
    Iterable<LearnerProfile> source, {
    RegistrationContext? registrationContext,
  }) {
    final scopedRegistrationContext =
        registrationContext ?? this.registrationContext;
    final podId = _tabletPodIdFor(scopedRegistrationContext);
    if (podId == null || podId.isEmpty) {
      return source.toList(growable: false);
    }
    final canonicalPodLabel = _tabletPodLabelFor(
      scopedRegistrationContext,
      source: source,
    );
    return source
        .where((learner) => learner.podId?.trim() == podId)
        .map((learner) {
      final resolvedPodLabel = canonicalPodLabel ?? learner.podLabel;
      final villageLooksPodScoped = learner.village.trim().isEmpty ||
          learner.village.trim() == learner.podLabel?.trim();
      return learner.copyWith(
        podId: podId,
        podLabel: resolvedPodLabel,
        village: villageLooksPodScoped
            ? (resolvedPodLabel ?? learner.village)
            : learner.village,
      );
    }).toList(growable: false);
  }

  String? _canonicalTabletPodLabelFromLearners(
    Iterable<LearnerProfile> source,
    RegistrationContext registrationContext,
  ) {
    final podId = _tabletPodIdFor(registrationContext)?.trim();
    if (podId == null || podId.isEmpty) return null;
    final labels = source
        .where((learner) => learner.podId?.trim() == podId)
        .map((learner) => learner.podLabel?.trim())
        .whereType<String>()
        .where((label) => label.isNotEmpty)
        .toSet();
    if (labels.length == 1) {
      return labels.first;
    }
    return null;
  }

  RegistrationContext _normalizeRegistrationContextPodLabel(
    RegistrationContext registrationContext,
    Iterable<LearnerProfile> source,
  ) {
    final tabletRegistration = registrationContext.tabletRegistration;
    if (tabletRegistration == null) return registrationContext;

    final canonicalPodLabel =
        _canonicalTabletPodLabelFromLearners(source, registrationContext);
    final currentPodLabel = tabletRegistration.podLabel?.trim();
    if (canonicalPodLabel == null || canonicalPodLabel == currentPodLabel) {
      return registrationContext;
    }

    return RegistrationContext(
      cohorts: registrationContext.cohorts,
      mallams: registrationContext.mallams,
      defaultTarget: registrationContext.defaultTarget,
      tabletRegistration: TabletRegistration(
        id: tabletRegistration.id,
        deviceIdentifier: tabletRegistration.deviceIdentifier,
        podId: tabletRegistration.podId,
        podLabel: canonicalPodLabel,
        mallamId: tabletRegistration.mallamId,
        mallamName: tabletRegistration.mallamName,
      ),
    );
  }

  String? _tabletPodLabelFor(
    RegistrationContext registrationContext, {
    Iterable<LearnerProfile>? source,
  }) {
    final canonicalPodId = _tabletPodIdFor(registrationContext)?.trim();
    final tabletRegistration = registrationContext.tabletRegistration;
    final registrationPodId = tabletRegistration?.podId?.trim();
    final registrationLabel = tabletRegistration?.podLabel?.trim();
    final canonicalLearnerPodLabel = _canonicalTabletPodLabelFromLearners(
      source ?? learners,
      registrationContext,
    );

    if (registrationLabel != null && registrationLabel.isNotEmpty) {
      String normalizeToken(String value) =>
          value.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '');

      final scopedPodId = canonicalPodId ?? registrationPodId;
      final registrationPodMatchesScope =
          canonicalPodId == null ||
          canonicalPodId.isEmpty ||
          registrationPodId == null ||
          registrationPodId.isEmpty ||
          registrationPodId == canonicalPodId;
      final registrationLooksCanonical = scopedPodId != null &&
          scopedPodId.isNotEmpty &&
          normalizeToken(registrationLabel) == normalizeToken(scopedPodId);

      if (!registrationPodMatchesScope || registrationLooksCanonical) {
        return registrationLabel;
      }
      if (canonicalLearnerPodLabel != null &&
          canonicalLearnerPodLabel.isNotEmpty) {
        return canonicalLearnerPodLabel;
      }
      return registrationLabel;
    }

    if (canonicalLearnerPodLabel != null &&
        canonicalLearnerPodLabel.isNotEmpty) {
      return canonicalLearnerPodLabel;
    }

    if (canonicalPodId == null || canonicalPodId.isEmpty) return null;
    return canonicalPodId;
  }

  List<LearnerProfile> _normalizeLearnersToRegistrationContext(
    Iterable<LearnerProfile> source, {
    RegistrationContext? registrationContext,
  }) {
    final scopedRegistrationContext =
        registrationContext ?? this.registrationContext;
    final canonicalPodId = _tabletPodIdFor(scopedRegistrationContext);
    final canonicalPodLabel = _tabletPodLabelFor(
      scopedRegistrationContext,
      source: source,
    );
    if ((canonicalPodId == null || canonicalPodId.isEmpty) &&
        (canonicalPodLabel == null || canonicalPodLabel.isEmpty)) {
      return source.toList(growable: false);
    }

    return source
        .map(
          (learner) => learner.copyWith(
            podId: canonicalPodId ?? learner.podId,
            podLabel: canonicalPodLabel ?? learner.podLabel,
          ),
        )
        .toList(growable: false);
  }

  String? get tabletPodLabel => _tabletPodLabelFor(registrationContext);

  bool learnerMatchesTabletPod(LearnerProfile learner) {
    final podId = tabletPodId?.trim();
    if (podId == null || podId.isEmpty) return true;
    final learnerPodId = learner.podId?.trim();
    if (learnerPodId == null || learnerPodId.isEmpty) return false;
    return learnerPodId == podId;
  }

  bool learnerCanOpenLesson(LearnerProfile learner, LessonCardModel lesson) {
    if (lessonCompletedTodayForLearner(learner, lesson)) {
      return false;
    }
    if (lesson.isAssignmentPlaceholder) {
      return learnerMatchesTabletPod(learner);
    }
    if (!_isPublishedLearnerLesson(lesson)) return false;
    if (!learnerMatchesTabletPod(learner)) return false;

    final resumable = resumableLessonForLearner(learner);
    if (resumable?.id == lesson.id) return true;

    final backendAssigned = backendAssignedLessonsForLearner(learner)
        .where((item) => !item.isAssignmentPlaceholder)
        .toList(growable: false);
    if (backendAssigned.any((item) => item.id == lesson.id)) {
      return true;
    }

    final learnerLessons = lessonsForLearner(learner)
        .where((item) => !item.isAssignmentPlaceholder)
        .toList(growable: false);
    return learnerLessons.any((item) => item.id == lesson.id);
  }

  List<LearnerProfile> availableLearnersForLesson(LessonCardModel lesson) {
    final available = learners
        .where((learner) => learnerCanOpenLesson(learner, lesson))
        .toList(growable: false);
    available.sort((left, right) {
      final leftResumable = resumableLessonForLearner(left)?.id == lesson.id;
      final rightResumable = resumableLessonForLearner(right)?.id == lesson.id;
      if (leftResumable != rightResumable) {
        return leftResumable ? -1 : 1;
      }

      final leftAssigned = backendAssignedLessonsForLearner(left)
          .any((item) => item.id == lesson.id);
      final rightAssigned = backendAssignedLessonsForLearner(right)
          .any((item) => item.id == lesson.id);
      if (leftAssigned != rightAssigned) {
        return leftAssigned ? -1 : 1;
      }

      final leftCurrent = currentLearner?.id == left.id;
      final rightCurrent = currentLearner?.id == right.id;
      if (leftCurrent != rightCurrent) {
        return leftCurrent ? -1 : 1;
      }

      return left.name.compareTo(right.name);
    });
    return available;
  }

  BackendLessonSession? resumableSessionForLearnerAndLesson(
    LearnerProfile learner,
    LessonCardModel lesson,
  ) {
    final session = resumableRuntimeSessionForLearner(learner);
    if (session == null) return null;
    return session.lessonId == lesson.id ? session : null;
  }

  BackendLessonSession? completedSessionForLearnerAndLesson(
    LearnerProfile learner,
    LessonCardModel lesson,
  ) {
    final sessions = recentRuntimeSessionsForLearner(learner);
    for (final session in sessions) {
      if (session.lessonId != lesson.id) continue;
      final normalizedStatus = session.status.trim().toLowerCase();
      final normalizedCompletion = session.completionState.trim().toLowerCase();
      final completed = normalizedStatus == 'completed' ||
          normalizedCompletion == 'completed' ||
          normalizedCompletion == 'complete';
      if (completed) return session;
    }
    return null;
  }

  BackendLessonSession? terminalRuntimeSessionForLearnerAndLesson(
    LearnerProfile learner,
    LessonCardModel lesson,
  ) {
    final sessions = recentRuntimeSessionsForLearner(learner);
    for (final session in sessions) {
      if (session.lessonId != lesson.id) continue;
      final normalizedStatus = session.status.trim().toLowerCase();
      final normalizedCompletion = session.completionState.trim().toLowerCase();
      final isTerminal = normalizedStatus == 'completed' ||
          normalizedStatus == 'absent' ||
          normalizedStatus == 'skipped' ||
          normalizedCompletion == 'completed' ||
          normalizedCompletion == 'complete' ||
          normalizedCompletion == 'absent' ||
          normalizedCompletion == 'skipped' ||
          normalizedCompletion == 'skip';
      if (isTerminal) return session;
    }
    return null;
  }

  bool lessonCompletedTodayForLearner(
    LearnerProfile learner,
    LessonCardModel lesson,
  ) {
    final session = completedSessionForLearnerAndLesson(learner, lesson);
    if (session == null) return false;
    final activityAt =
        session.completedAt ?? session.lastActivityAt ?? session.startedAt;
    if (activityAt == null) return false;
    final now = DateTime.now();
    return activityAt.year == now.year &&
        activityAt.month == now.month &&
        activityAt.day == now.day;
  }

  Future<void> markLearnerAbsentForLesson(
    LearnerProfile learner,
    LessonCardModel lesson,
  ) async {
    _projectTerminalRuntimeSession(
      learner: learner,
      lesson: lesson,
      status: 'absent',
      completionState: 'absent',
      automationStatus: 'Learner marked absent on this tablet.',
    );

    final updatedLearner = learner.copyWith(
      lastAttendance: 'Absent for ${lesson.subject} today',
      lastLessonSummary:
          'Marked absent before ${lesson.title} started on the shared tablet.',
      attendanceBand: 'Needs follow-up',
    );
    _replaceLearner(updatedLearner);
    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: 'learner_marked_absent',
        payload: {
          'studentId': updatedLearner.id,
          'learnerCode': updatedLearner.learnerCode,
          'lessonId': lesson.id,
          'lessonTitle': lesson.title,
          'moduleId': lesson.moduleId,
          'capturedAt': DateTime.now().toIso8601String(),
        },
      ),
    );
    persistStateSoon();
    await syncPendingEvents();
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

  bool _isPublishedLearnerLesson(LessonCardModel lesson) {
    if (lesson.isAssignmentPlaceholder) return false;
    return isLearnerVisibleLessonStatus(
      lesson.status,
      usingFallbackData: usingFallbackData,
    );
  }

  String _normalizeSubjectKey(String value) {
    final normalized = value.trim().toLowerCase();
    if (normalized.isEmpty) return 'subject';
    return normalized.replaceAll(RegExp(r'[^a-z0-9]+'), '-');
  }

  String _subjectTitleForLesson(LessonCardModel lesson) {
    final directSubject = lesson.subject.trim();
    if (directSubject.isNotEmpty) return directSubject;

    final moduleTitle = modules
        .cast<LearningModule?>()
        .firstWhere(
          (module) => module?.id == lesson.moduleId,
          orElse: () => null,
        )
        ?.title
        .trim();
    if (moduleTitle != null && moduleTitle.isNotEmpty) {
      return moduleTitle;
    }

    return 'Learning';
  }

  LearningModule _buildLearnerFacingSubject({
    required String key,
    required String title,
    required List<LessonCardModel> lessons,
  }) {
    final lessonModuleIds = lessons
        .map((lesson) => lesson.moduleId.trim())
        .where((moduleId) => moduleId.isNotEmpty)
        .toSet();
    final matchingModule = modules.cast<LearningModule?>().firstWhere(
      (module) {
        if (module == null) return false;
        return lessonModuleIds.contains(module.id) ||
            _normalizeSubjectKey(module.title) == key ||
            _normalizeSubjectKey(module.id) == key;
      },
      orElse: () => null,
    );
    final lessonCount = lessons.length;
    return LearningModule(
      id: key,
      title: title,
      description: matchingModule?.description ??
          'Open $title to see the published learner lessons for this subject.',
      voicePrompt: matchingModule?.voicePrompt ??
          'We are opening $title. Choose a lesson, then choose the learner.',
      readinessGoal: matchingModule?.readinessGoal ??
          'Published lessons ready for learner launch',
      badge: '$lessonCount lesson${lessonCount == 1 ? '' : 's'}',
    );
  }

  List<LessonCardModel> _registeredContextLessonPool() {
    if (!_hasTabletPodScope()) {
      return assignedLessons;
    }

    final scopedLearners = learners.where(learnerMatchesTabletPod).toList(
          growable: false,
        );
    if (scopedLearners.isEmpty) {
      return const <LessonCardModel>[];
    }

    final orderedLessons = <LessonCardModel>[];
    final seenLessonIds = <String>{};

    void addLesson(LessonCardModel? lesson) {
      if (lesson == null) return;
      final key = lesson.id.trim();
      if (key.isEmpty || seenLessonIds.contains(key)) return;
      orderedLessons.add(lesson);
      seenLessonIds.add(key);
    }

    for (final learner in scopedLearners) {
      for (final lesson in backendAssignedLessonsForLearner(learner)) {
        addLesson(lesson);
      }
      addLesson(resumableLessonForLearner(learner));
    }
    if (orderedLessons.isNotEmpty) {
      return orderedLessons;
    }

    for (final learner in scopedLearners) {
      final backendModuleId = learner.backendRecommendedModuleId?.trim();
      if (backendModuleId == null || backendModuleId.isEmpty) continue;
      for (final lesson in assignedLessons) {
        if (lesson.moduleId.trim() == backendModuleId) {
          addLesson(lesson);
        }
      }
    }
    if (orderedLessons.isNotEmpty) {
      return orderedLessons;
    }

    if (usingFallbackData) {
      for (final learner in scopedLearners) {
        for (final lesson in lessonsForLearner(learner)) {
          addLesson(lesson);
        }
      }
    }

    return orderedLessons;
  }

  List<LearningModule> learnerFacingSubjects({LearnerProfile? learner}) {
    final lessonPool = learner == null
        ? _registeredContextLessonPool()
        : lessonsForLearner(learner);
    final groupedLessons = <String, List<LessonCardModel>>{};
    final subjectTitles = <String, String>{};

    for (final lesson in lessonPool) {
      if (!_isPublishedLearnerLesson(lesson)) continue;
      final subjectTitle = _subjectTitleForLesson(lesson);
      final key = _normalizeSubjectKey(subjectTitle);
      groupedLessons.putIfAbsent(key, () => <LessonCardModel>[]).add(lesson);
      subjectTitles.putIfAbsent(key, () => subjectTitle);
    }

    final subjects = groupedLessons.entries
        .map(
          (entry) => _buildLearnerFacingSubject(
            key: entry.key,
            title: subjectTitles[entry.key] ?? 'Learning',
            lessons: entry.value,
          ),
        )
        .toList(growable: false)
      ..sort((left, right) => left.title.compareTo(right.title));

    return subjects;
  }

  List<LessonCardModel> lessonsForLearnerAndSubject(
    LearnerProfile? learner,
    String subjectId,
  ) {
    final normalizedSubjectId = _normalizeSubjectKey(subjectId);
    final lessonPool = learner == null
        ? _registeredContextLessonPool()
        : lessonsForLearner(learner);
    return lessonPool.where((lesson) {
      if (!_isPublishedLearnerLesson(lesson)) return false;
      return _normalizeSubjectKey(_subjectTitleForLesson(lesson)) ==
          normalizedSubjectId;
    }).toList(growable: false);
  }

  LearningModule? primaryModuleForSubject({
    LearnerProfile? learner,
    required String subjectId,
  }) {
    final lessons = lessonsForLearnerAndSubject(learner, subjectId);
    if (lessons.isEmpty) return null;

    final moduleIdsByPopularity = <String, int>{};
    for (final lesson in lessons) {
      final moduleId = lesson.moduleId.trim();
      if (moduleId.isEmpty) continue;
      moduleIdsByPopularity[moduleId] =
          (moduleIdsByPopularity[moduleId] ?? 0) + 1;
    }

    final rankedModuleIds = moduleIdsByPopularity.entries.toList()
      ..sort((left, right) {
        final countCompare = right.value.compareTo(left.value);
        if (countCompare != 0) return countCompare;
        return left.key.compareTo(right.key);
      });

    for (final candidate in rankedModuleIds) {
      final match = modules.cast<LearningModule?>().firstWhere(
            (module) => module?.id == candidate.key,
            orElse: () => null,
          );
      if (match != null) return match;
    }

    return modules.cast<LearningModule?>().firstWhere(
          (module) =>
              module != null &&
              _normalizeSubjectKey(module.title) ==
                  _normalizeSubjectKey(subjectId),
          orElse: () => null,
        );
  }

  Set<String> _moduleKeyVariants(LearningModule module) {
    String normalize(String value) => value.trim().toLowerCase();

    final variants = <String>{
      normalize(module.id),
      normalize(module.title),
    };

    for (final lesson in assignedLessons) {
      if (normalize(lesson.moduleId) == normalize(module.id)) {
        variants.add(normalize(lesson.subject));
      }
    }

    variants.removeWhere((value) => value.isEmpty);
    return variants;
  }

  bool _lessonMatchesModule({
    required LessonCardModel lesson,
    required LearningModule module,
  }) {
    final variants = _moduleKeyVariants(module);
    return variants.contains(lesson.moduleId.trim().toLowerCase()) ||
        variants.contains(lesson.subject.trim().toLowerCase());
  }

  List<LessonCardModel> lessonsForSelectedModule() {
    final module = selectedModule;
    if (module == null) return assignedLessons;
    final filtered = assignedLessons
        .where((lesson) => _lessonMatchesModule(lesson: lesson, module: module))
        .toList();
    return filtered.isEmpty ? assignedLessons : filtered;
  }

  List<LessonCardModel> lessonsForLearner(LearnerProfile? learner) {
    if (learner == null) return assignedLessons;

    final preferredModuleIds = _preferredModuleIdsForLearner(learner);
    final backendAssigned = backendAssignedLessonsForLearner(learner);
    if (!usingFallbackData && backendAssigned.isNotEmpty) {
      return backendAssigned;
    }

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
      final lesson =
          lessonsById[pack.lessonId] ?? _findLessonForAssignmentPack(pack);
      final resolvedLesson = lesson ?? _buildAssignmentPlaceholderLesson(pack);
      if (seen.contains(resolvedLesson.id)) continue;
      ordered.add(resolvedLesson);
      seen.add(resolvedLesson.id);
    }

    return ordered;
  }

  LessonCardModel? _findLessonForAssignmentPack(LearnerAssignmentPack pack) {
    final normalizedLessonTitle = pack.lessonTitle.trim().toLowerCase();
    final preferredModuleIds = {
      pack.curriculumModuleId?.trim(),
      pack.moduleId.trim(),
    }.whereType<String>().where((value) => value.isNotEmpty).toSet();

    for (final lesson in assignedLessons) {
      if (lesson.id == pack.lessonId) return lesson;
    }

    for (final lesson in assignedLessons) {
      final lessonTitle = lesson.title.trim().toLowerCase();
      if (normalizedLessonTitle.isEmpty ||
          lessonTitle != normalizedLessonTitle) {
        continue;
      }
      if (preferredModuleIds.isEmpty ||
          preferredModuleIds.contains(lesson.moduleId.trim())) {
        return lesson;
      }
    }

    return null;
  }

  LessonCardModel _buildAssignmentPlaceholderLesson(
    LearnerAssignmentPack pack,
  ) {
    final moduleId = (pack.curriculumModuleId?.trim().isNotEmpty ?? false)
        ? pack.curriculumModuleId!.trim()
        : pack.moduleId.trim().isNotEmpty
            ? pack.moduleId.trim()
            : 'pending-module';
    final dueLabel = pack.dueDate == null || pack.dueDate!.trim().isEmpty
        ? 'No due date yet.'
        : 'Due ${pack.dueDate!.split('T').first}.';
    final facilitatorLabel = pack.mallamName?.trim().isNotEmpty == true
        ? pack.mallamName!.trim()
        : 'Mallam pending';

    return LessonCardModel(
      id: 'assignment-placeholder:${pack.assignmentId}',
      moduleId: moduleId,
      title: pack.lessonTitle,
      subject: 'Live assignment',
      durationMinutes: 10,
      status: 'assigned',
      mascotName: 'Mallam',
      readinessFocus:
          'Assignment payload reached the tablet before lesson content.',
      scenario:
          '$facilitatorLabel assigned this lesson from the backend, but the full lesson body has not synced to this tablet yet. $dueLabel Refresh the learner app bootstrap or publish the linked lesson so facilitators can open the real runtime safely.',
      steps: const [
        LessonStep(
          id: 'assignment-placeholder-step',
          type: LessonStepType.intro,
          title: 'Lesson sync pending',
          instruction:
              'This live assignment is visible, but the real lesson payload has not synced to the tablet yet.',
          expectedResponse:
              'Refresh the tablet sync before starting this lesson.',
          coachPrompt:
              'Keep the assignment visible so the facilitator knows routing is correct, then refresh sync to load the full lesson.',
          facilitatorTip:
              'Do not start runtime on a placeholder lesson. Refresh assignments or publish the linked lesson payload first.',
          realWorldCheck:
              'The learner should only start once the full lesson steps appear on this device.',
          speakerMode: SpeakerMode.guiding,
        ),
      ],
    );
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
    final normalizedSubjectId = moduleId.trim().toLowerCase();
    final matchedModule = modules.cast<LearningModule?>().firstWhere(
          (module) => module?.id.trim().toLowerCase() == normalizedSubjectId,
          orElse: () => null,
        );

    return lessonsForLearner(learner).where((lesson) {
      final lessonSubject = lesson.subject.trim().toLowerCase();
      final lessonModuleId = lesson.moduleId.trim().toLowerCase();
      if (matchedModule != null) {
        final moduleTitle = matchedModule.title.trim().toLowerCase();
        return _lessonMatchesModule(lesson: lesson, module: matchedModule) ||
            (moduleTitle.isNotEmpty &&
                lessonSubject.isNotEmpty &&
                (moduleTitle.contains(lessonSubject) ||
                    lessonSubject.contains(moduleTitle)));
      }

      return lessonModuleId == normalizedSubjectId ||
          lessonSubject == normalizedSubjectId;
    }).toList();
  }

  LessonCardModel? nextAssignedLessonForLearner(
    LearnerProfile? learner, {
    String? excludingLessonId,
  }) {
    final resumableLesson = resumableLessonForLearner(learner);
    if (resumableLesson != null && resumableLesson.id != excludingLessonId) {
      return resumableLesson;
    }

    bool isAllowed(LessonCardModel lesson) {
      if (lesson.id == excludingLessonId) return false;
      if (learner == null) return true;
      return learnerCanOpenLesson(learner, lesson);
    }

    final rankedLessons = lessonsForLearner(learner).where(isAllowed).toList();
    if (rankedLessons.isNotEmpty) return rankedLessons.first;

    if (learner == null || assignedLessons.isEmpty) return null;
    final recommendedModule = recommendedModuleForLearner(learner);
    final moduleFallback = assignedLessons.cast<LessonCardModel?>().firstWhere(
          (lesson) =>
              lesson != null &&
              lesson.moduleId == recommendedModule.id &&
              isAllowed(lesson),
          orElse: () => assignedLessons.cast<LessonCardModel?>().firstWhere(
                (lesson) => lesson != null && isAllowed(lesson),
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

    if (_isBundledFundamentalsLesson(nextLesson)) {
      return 'Next up: ${nextLesson.title} • continue the offline Meet Mallam onboarding pack.';
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
    if (target != null) {
      return '${target.cohort.name} • ${target.mallam.name}';
    }

    final canonicalPodLabel = tabletPodLabel?.trim();
    final tabletRegistration = registrationContext.tabletRegistration;
    final mallamName = tabletRegistration?.mallamName?.trim();
    if (canonicalPodLabel != null && canonicalPodLabel.isNotEmpty) {
      if (mallamName != null && mallamName.isNotEmpty) {
        return '$canonicalPodLabel • $mallamName';
      }
      return canonicalPodLabel;
    }

    return registrationContext.summary;
  }

  String? get registrationBlockerReason {
    if (isBootstrapping) {
      return 'Learner registration stays blocked until the tablet finishes the live production bootstrap.';
    }
    if (usingFallbackData) {
      final detail = backendError?.trim();
      if (detail != null && detail.isNotEmpty) {
        return 'Learner registration cannot continue while the tablet is offline or using fallback data. $detail';
      }
      return 'Learner registration cannot continue while the tablet is offline or using fallback data.';
    }
    return null;
  }

  bool get canRegisterLearner =>
      registrationBlockerReason == null && !isRegisteringLearner;

  Future<LearnerProfile> registerLearner() async {
    await ensureStableDeviceIdentifier();
    final blocker = registrationBlockerReason;
    if (blocker != null) {
      backendError ??= blocker;
      lastSyncError = blocker;
      lastSyncAttemptAt = DateTime.now();
      throw StateError(blocker);
    }

    isRegisteringLearner = true;
    try {
      final learner = await _apiClient.registerLearner(
        draft: registrationDraft,
        registrationTarget: registrationTargetForDraft,
        overrideDeviceIdentifier: tabletDeviceIdentifier,
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
    } catch (error) {
      usingFallbackData = true;
      final message = error.toString().replaceFirst('Exception: ', '');
      backendError =
          'Backend registration failed, so learner intake stays blocked until the live backend recovers. $message';
      lastSyncError = message;
      lastSyncAttemptAt = DateTime.now();
      persistStateSoon();
      throw StateError(backendError!);
    } finally {
      isRegisteringLearner = false;
    }
  }

  LearnerProfile _registerLearnerLocally() {
    final tabletRegistration = registrationContext.tabletRegistration;
    final registrationTarget = registrationContext.defaultTarget;
    final scopedPodId =
        tabletRegistration?.podId ?? registrationTarget?.cohort.podId;
    final scopedPodLabel = tabletRegistration?.podLabel ??
        tabletRegistration?.podId ??
        registrationTarget?.cohort.podId;
    final scopedMallamId =
        tabletRegistration?.mallamId ?? registrationTarget?.mallam.id;
    final scopedMallamName =
        tabletRegistration?.mallamName ?? registrationTarget?.mallam.name;
    final scopedCohortId = registrationTarget?.cohort.id;
    final learner = LearnerProfile(
      id: 'student-${learners.length + 1}',
      name: registrationDraft.name.trim(),
      age: int.parse(registrationDraft.age.trim()),
      cohort: registrationDraft.cohort.trim().isEmpty
          ? (registrationTarget?.cohort.name ?? 'Fallback cohort')
          : registrationDraft.cohort.trim(),
      cohortId: scopedCohortId,
      podId: scopedPodId,
      podLabel: scopedPodLabel,
      mallamId: scopedMallamId,
      mallamName: scopedMallamName,
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
      profilePhotoBase64: registrationDraft.profilePhotoBase64,
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
    if (lesson.isAssignmentPlaceholder) {
      throw StateError(
        'Cannot open lesson ${lesson.id} because the real lesson payload has not synced to this tablet yet.',
      );
    }

    if (lesson.steps.isEmpty) {
      throw StateError(
        'Cannot open lesson ${lesson.id} because it has no activity steps.',
      );
    }

    if (resumeFrom != null) {
      if (currentLearner?.id != resumeFrom.studentId) {
        final resumeLearnerIndex = learners.indexWhere(
          (item) => item.id == resumeFrom.studentId,
        );
        if (resumeLearnerIndex == -1) {
          throw StateError(
            'Cannot resume lesson for learner ${resumeFrom.studentId} because that learner is not available on this tablet.',
          );
        }
        currentLearner = learners[resumeLearnerIndex];
      }
    }

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
    final openingStatus = _offlineOnboardingStatus(
      lesson: lesson,
      step: openingStep,
      isResuming: isResuming,
      resumeFrom: resumeFrom,
    );

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
      automationStatus: openingStatus,
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
        ? LearnerDialogue.successStatus(
            independent: practiceMode == PracticeMode.independentCheck,
            repeated: practiceMode == PracticeMode.repeatAfterMe,
          )
        : LearnerDialogue.retryStatus(
            attemptNumber: nextAttempts,
            repeatAfterMe: practiceMode == PracticeMode.repeatAfterMe,
          );

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

    final activity = step.activity;
    if (activity != null &&
        (activity.type == LessonActivityType.imageChoice ||
            activity.type == LessonActivityType.tapChoice) &&
        activity.choiceItems.isNotEmpty) {
      final matchedChoice = activity.choiceItems.where((choice) {
        final normalizedLabel = _normalizeForComparison(choice.label);
        return normalizedLabel.isNotEmpty &&
            normalizedLabel == normalizedResponse;
      }).toList();
      if (matchedChoice.isNotEmpty) {
        return ResponseEvaluation(
          review: matchedChoice.first.isCorrect
              ? ResponseReview.onTrack
              : ResponseReview.needsSupport,
          similarityScore: matchedChoice.first.isCorrect ? 1 : 0,
          usedAlias: false,
        );
      }
    }

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
              (_containsContiguousTokenPhrase(target, normalizedResponse) ||
                  _containsContiguousTokenPhrase(
                    normalizedResponse,
                    target,
                  ))),
    );
    if (exactOrContains) {
      return ResponseEvaluation(
        review: ResponseReview.onTrack,
        similarityScore: 1,
        usedAlias: aliases.contains(normalizedResponse),
      );
    }

    final responseTokens = _comparisonTokens(normalizedResponse);
    final responseWordCount = normalizedResponse.isEmpty
        ? 0
        : normalizedResponse.split(' ').where((word) => word.isNotEmpty).length;
    final responseHasEnoughSignal =
        responseTokens.isNotEmpty || responseWordCount > 0;

    double bestSimilarity = 0;
    double bestCoverage = 0;
    double bestOrderedCoverage = 0;
    var matchedAlias = false;

    for (final target in allTargets) {
      final targetTokens = _comparisonTokens(target);
      final similarity = _tokenSimilarity(normalizedResponse, target);
      final coverage = _tokenCoverage(responseTokens, targetTokens);
      final orderedCoverage =
          _orderedTokenCoverage(responseTokens, targetTokens);

      if (coverage > bestCoverage ||
          (coverage == bestCoverage && orderedCoverage > bestOrderedCoverage) ||
          (coverage == bestCoverage &&
              orderedCoverage == bestOrderedCoverage &&
              similarity > bestSimilarity)) {
        bestCoverage = coverage;
        bestOrderedCoverage = orderedCoverage;
        bestSimilarity = similarity;
        matchedAlias = aliases.contains(target);
      }
    }

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

    final activityType = activity?.type;
    final acceptByCoverage = responseHasEnoughSignal &&
        _passesCoverageGate(
          practiceMode: practiceMode,
          activityType: activityType,
          responseWordCount: responseWordCount,
          coverage: bestCoverage,
          orderedCoverage: bestOrderedCoverage,
        );
    final passedBySimilarity = responseWordCount >= requiredWords &&
        bestSimilarity >= requiredSimilarity;

    return ResponseEvaluation(
      review: (acceptByCoverage || passedBySimilarity)
          ? ResponseReview.onTrack
          : ResponseReview.needsSupport,
      similarityScore: max(bestSimilarity, bestCoverage),
      usedAlias: matchedAlias,
    );
  }

  String buildCoachSupportPrompt({
    required String supportType,
    required LessonStep step,
  }) {
    final learnerName = currentLearner?.name ?? 'my friend';
    final expected = personalizeExpectedResponse(step.expectedResponse);
    final prompt = personalizePrompt(step.coachPrompt);

    return LearnerDialogue.supportPrompt(
      supportType: supportType,
      learnerName: learnerName,
      prompt: prompt,
      expected: expected,
    );
  }

  String _normalizeForComparison(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  List<String> _comparisonTokens(String text) {
    const ignoredTokens = <String>{
      'a',
      'an',
      'the',
      'is',
      'are',
      'am',
      'i',
      'it',
      'to',
      'for',
      'of',
      'my',
      'your',
      'me',
    };
    final tokens = text.split(' ').where((item) => item.isNotEmpty).toList();
    final meaningful = tokens
        .where((item) => item.length > 1 && !ignoredTokens.contains(item))
        .toList();
    return meaningful.isNotEmpty ? meaningful : tokens;
  }

  bool _containsContiguousTokenPhrase(String container, String candidate) {
    final containerTokens = _comparisonTokens(container);
    final candidateTokens = _comparisonTokens(candidate);
    if (containerTokens.isEmpty || candidateTokens.isEmpty) return false;
    if (candidateTokens.length > containerTokens.length) return false;
    if (candidateTokens.length < 2 &&
        candidateTokens.length != containerTokens.length) {
      return false;
    }

    for (var start = 0;
        start <= containerTokens.length - candidateTokens.length;
        start += 1) {
      var matches = true;
      for (var offset = 0; offset < candidateTokens.length; offset += 1) {
        if (containerTokens[start + offset] != candidateTokens[offset]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }
    return false;
  }

  double _tokenCoverage(
      List<String> responseTokens, List<String> targetTokens) {
    if (responseTokens.isEmpty || targetTokens.isEmpty) return 0;
    final responseSet = responseTokens.toSet();
    final targetSet = targetTokens.toSet();
    final overlap = responseSet.intersection(targetSet).length;
    return targetSet.isEmpty ? 0 : overlap / targetSet.length;
  }

  double _orderedTokenCoverage(
    List<String> responseTokens,
    List<String> targetTokens,
  ) {
    if (responseTokens.isEmpty || targetTokens.isEmpty) return 0;
    var responseIndex = 0;
    var matched = 0;
    for (final token in targetTokens) {
      while (responseIndex < responseTokens.length &&
          responseTokens[responseIndex] != token) {
        responseIndex += 1;
      }
      if (responseIndex >= responseTokens.length) {
        break;
      }
      matched += 1;
      responseIndex += 1;
    }
    return targetTokens.isEmpty ? 0 : matched / targetTokens.length;
  }

  bool _passesCoverageGate({
    required PracticeMode practiceMode,
    required LessonActivityType? activityType,
    required int responseWordCount,
    required double coverage,
    required double orderedCoverage,
  }) {
    switch (activityType) {
      case LessonActivityType.listenRepeat:
        return responseWordCount >= 1 && orderedCoverage >= 0.9;
      case LessonActivityType.listenAnswer:
      case LessonActivityType.speakAnswer:
      case LessonActivityType.oralQuiz:
        if (practiceMode == PracticeMode.repeatAfterMe) {
          return responseWordCount >= 1 && orderedCoverage >= 0.85;
        }
        return responseWordCount >= 1 && coverage >= 0.7;
      default:
        if (practiceMode == PracticeMode.repeatAfterMe) {
          return responseWordCount >= 1 && orderedCoverage >= 0.9;
        }
        return false;
    }
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
        text = LearnerDialogue.supportPrompt(
          supportType: 'slow',
          learnerName: learnerName,
          prompt: personalizePrompt(step.coachPrompt),
          expected: personalizeExpectedResponse(step.expectedResponse),
        );
        nextMode = SpeakerMode.guiding;
        label = 'Slow repeat';
        break;
      case 'wait':
        text = LearnerDialogue.supportPrompt(
          supportType: 'wait',
          learnerName: learnerName,
          prompt: personalizePrompt(step.coachPrompt),
          expected: personalizeExpectedResponse(step.expectedResponse),
        );
        nextMode = SpeakerMode.waiting;
        label = 'Think time';
        break;
      case 'translate':
        text = LearnerDialogue.supportPrompt(
          supportType: 'translate',
          learnerName: learnerName,
          prompt: personalizePrompt(step.coachPrompt),
          expected: personalizeExpectedResponse(step.expectedResponse),
        );
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
      automationStatus: LearnerDialogue.supportStatus(supportType),
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

  void acceptLatestLearnerAudioManually({
    String? note,
    bool asOnTrack = true,
  }) {
    final session = activeSession;
    if (session == null) return;

    final hasSavedAudio = session.latestLearnerAudioPath != null &&
        session.latestLearnerAudioPath!.trim().isNotEmpty;
    if (!hasSavedAudio) return;

    final review =
        asOnTrack ? ResponseReview.onTrack : ResponseReview.needsSupport;
    final learnerName = currentLearner?.name ?? 'Learner';
    final evidenceNote = (note == null || note.trim().isEmpty)
        ? 'Facilitator confirmed the saved learner voice response.'
        : note.trim();
    final nextSupportType = asOnTrack
        ? 'Saved learner audio accepted'
        : 'Saved learner audio reviewed';
    final nextAutomationStatus = asOnTrack
        ? 'Facilitator accepted the saved learner voice response and can continue the lesson.'
        : 'Facilitator reviewed the saved learner voice response and will keep supporting this step manually.';

    activeSession = session.copyWith(
      latestReview: review,
      speakerMode: asOnTrack ? SpeakerMode.affirming : SpeakerMode.guiding,
      lastSupportType: nextSupportType,
      automationStatus: nextAutomationStatus,
      transcript: [
        ...session.transcript,
        SessionTurn(
          speaker: 'Facilitator',
          text: '$learnerName audio review: $evidenceNote',
          review: review,
          timestamp: DateTime.now(),
        ),
      ],
    );
    speakerMode = asOnTrack ? SpeakerMode.affirming : SpeakerMode.guiding;
    _queueSessionEvent(
      type: 'learner_audio_manually_accepted',
      session: activeSession!,
      extra: {
        'stepId': session.currentStep.id,
        'stepTitle': session.currentStep.title,
        'review': review.name,
        'note': evidenceNote,
        'audioPath': session.latestLearnerAudioPath,
        'audioDurationSeconds': session.latestLearnerAudioDuration?.inSeconds,
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

  void updateCurrentStepLearnerDraft(
    String response, {
    String? automationStatus,
  }) {
    final session = activeSession;
    if (session == null) return;

    final trimmed = response.trim();
    final existingDraft = session.latestLearnerResponse ?? '';
    if (trimmed.isEmpty && existingDraft.trim().isEmpty) return;
    if (trimmed == existingDraft.trim()) return;

    activeSession = session.copyWith(
      latestLearnerResponse: trimmed.isEmpty ? null : response,
      latestReview: ResponseReview.pending,
      automationStatus: automationStatus ?? session.automationStatus,
      clearLatestLearnerResponse: trimmed.isEmpty,
    );
    persistStateSoon();
  }

  void clearCurrentStepLearnerEvidence({String? automationStatus}) {
    final session = activeSession;
    if (session == null) return;

    final hasDraftResponse =
        session.latestLearnerResponse?.trim().isNotEmpty ?? false;
    final hasSavedAudio =
        session.latestLearnerAudioPath?.trim().isNotEmpty ?? false;
    if (!hasDraftResponse && !hasSavedAudio) return;

    activeSession = session.copyWith(
      latestReview: ResponseReview.pending,
      automationStatus: automationStatus ??
          'Previous learner evidence was cleared for a fresh take.',
      clearLatestLearnerResponse: true,
      clearLatestLearnerAudio: true,
    );
    persistStateSoon();
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
    final points = spendableRewardPointsForLearner(learner);
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

  List<RewardRedemptionRecord> rewardRedemptionHistoryForLearner(
    LearnerProfile? learner,
  ) {
    if (learner == null) return const [];
    return rewardRedemptionHistoryByLearnerId[learner.id] ?? const [];
  }

  RewardRedemptionRecord? latestRewardRedemptionForLearner(
    LearnerProfile? learner,
  ) {
    final history = rewardRedemptionHistoryForLearner(learner);
    return history.isEmpty ? null : history.first;
  }

  int spendableRewardPointsForLearner(LearnerProfile learner) {
    final earned = learner.rewards?.points ?? learner.totalXp;
    final spent = rewardRedemptionHistoryForLearner(learner)
        .where((entry) => entry.status != 'voided')
        .fold<int>(0, (sum, entry) => sum + entry.cost);
    return max(0, earned - spent);
  }

  bool canRedeemRewardForLearner(
    LearnerProfile learner,
    RewardRedemptionOption option,
  ) {
    return spendableRewardPointsForLearner(learner) >= option.cost;
  }

  RewardRedemptionOption rewardOptionStateForLearner(
    LearnerProfile learner,
    RewardRedemptionOption option,
  ) {
    final spendable = spendableRewardPointsForLearner(learner);
    return option.copyWith(
      unlocked: spendable >= option.cost,
      shortfall: max(0, option.cost - spendable),
    );
  }

  RewardRedemptionRecord redeemRewardForLearner({
    required LearnerProfile learner,
    required RewardRedemptionOption option,
    String? note,
  }) {
    final resolved = rewardOptionStateForLearner(learner, option);
    if (!resolved.unlocked) {
      throw StateError(
        '${learner.name} needs ${resolved.shortfall} more point(s) before redeeming ${resolved.title}.',
      );
    }

    final record = RewardRedemptionRecord(
      id: 'reward-${DateTime.now().millisecondsSinceEpoch}',
      learnerId: learner.id,
      optionId: resolved.id,
      title: resolved.title,
      icon: resolved.icon,
      category: resolved.category,
      cost: resolved.cost,
      celebrationCue: resolved.celebrationCue,
      note: note?.trim().isEmpty ?? true ? null : note!.trim(),
      redeemedAt: DateTime.now(),
      pointsRemaining: spendableRewardPointsForLearner(learner) - resolved.cost,
      status: 'redeemed',
    );

    final updatedHistory = [
      record,
      ...rewardRedemptionHistoryForLearner(learner),
    ];
    rewardRedemptionHistoryByLearnerId[learner.id] = updatedHistory;

    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: 'learner_reward_redeemed',
        payload: {
          'learnerId': learner.id,
          'learnerCode': learner.learnerCode,
          'rewardId': record.id,
          'optionId': resolved.id,
          'title': resolved.title,
          'category': resolved.category,
          'cost': resolved.cost,
          'celebrationCue': resolved.celebrationCue,
          'note': record.note,
          'redeemedAt': record.redeemedAt.toIso8601String(),
          'pointsRemaining': record.pointsRemaining,
          'status': record.status,
        },
      ),
    );
    persistStateSoon();
    _attemptSyncSoon();
    return record;
  }

  String rewardRedemptionSummaryForLearner(LearnerProfile learner) {
    final options = rewardRedemptionOptionsForLearner(learner);
    final spendable = spendableRewardPointsForLearner(learner);
    final history = rewardRedemptionHistoryForLearner(learner);
    final unlocked = options.where((item) => item.unlocked).toList();
    final featured = featuredRewardForLearner(learner);
    if (featured == null) {
      return 'Reward planner is waiting for the next point update.';
    }
    if (history.isNotEmpty) {
      final latest = history.first;
      return '${history.length} redemption(s) logged. $spendable point(s) still available after ${latest.title.toLowerCase()}. ';
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
      automationStatus: _isBundledFundamentalsLesson(session.lesson)
          ? 'Offline onboarding continues with ${nextStep.title.toLowerCase()}. Mallam is ready with the next guided prompt.'
          : 'Mallam moved to the next step and is preparing the next prompt.',
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

    final completedSession = session.copyWith(
      completionState: LessonCompletionState.complete,
      automationStatus:
          'Lesson completed. Rewards and learner progress have been saved on this tablet.',
      lastUpdatedAt: DateTime.now(),
    );
    activeSession = completedSession;

    final updatedLearner = learner.copyWith(
      streakDays: learner.streakDays + 1,
      enrollmentStatus: 'Active in lessons',
      lastLessonSummary:
          '${lesson.title}: ${session.totalResponses} responses captured, ${session.supportActionsUsed} support actions, ${session.facilitatorObservations.isEmpty ? 'no facilitator flags' : session.facilitatorObservations.join(', ')}.',
      lastAttendance: 'Completed ${lesson.subject} today',
      rewards: _buildUpdatedRewardSnapshot(learner, completedSession),
    );

    _replaceLearner(updatedLearner);
    _projectCompletedRuntimeSession(updatedLearner, completedSession);

    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: 'lesson_completed',
        payload: completedSession.syncPayloadPreview(
          learnerCode: updatedLearner.learnerCode,
          studentId: updatedLearner.id,
        ),
      ),
    );

    persistStateSoon();
    await flushPersistence();
    await syncPendingEvents();
    await refreshLearnerRewards(updatedLearner);
    await refreshLearnerRuntimeSessions(updatedLearner);
  }

  void _replaceLearner(LearnerProfile learner) {
    final learnerIndex = learners.indexWhere((item) => item.id == learner.id);
    if (learnerIndex != -1) {
      learners[learnerIndex] = learner;
    }
    if (currentLearner?.id == learner.id) {
      currentLearner = learner;
    }
    _notifyListeners();
  }

  void _projectCompletedRuntimeSession(
    LearnerProfile learner,
    LessonSessionState session,
  ) {
    _projectTerminalRuntimeSession(
      learner: learner,
      lesson: session.lesson,
      sessionId: session.sessionId,
      status: 'completed',
      completionState: 'completed',
      automationStatus: 'Lesson completed on this tablet.',
      currentStepIndex: session.lesson.steps.length,
      stepsTotal: session.lesson.steps.length,
      responsesCaptured: session.totalResponses,
      supportActionsUsed: session.supportActionsUsed,
      audioCaptures: session.totalAudioCaptures,
      facilitatorObservations: session.facilitatorObservations.length,
      latestReview: session.latestReview.name,
      startedAt: session.startedAt,
      lastActivityAt: session.lastUpdatedAt,
      completedAt: session.lastUpdatedAt,
    );
  }

  void _projectTerminalRuntimeSession({
    required LearnerProfile learner,
    required LessonCardModel lesson,
    required String status,
    required String completionState,
    required String automationStatus,
    String? sessionId,
    int currentStepIndex = 0,
    int? stepsTotal,
    int responsesCaptured = 0,
    int supportActionsUsed = 0,
    int audioCaptures = 0,
    int facilitatorObservations = 0,
    String? latestReview,
    DateTime? startedAt,
    DateTime? lastActivityAt,
    DateTime? completedAt,
  }) {
    final existing = recentRuntimeSessionsByLearnerId[learner.id] ?? const [];
    final now = DateTime.now();
    final resolvedSessionId = sessionId ??
        '$status-${lesson.id}-${DateTime.now().millisecondsSinceEpoch}';
    final activityAt = lastActivityAt ?? completedAt ?? now;
    final terminalAt = completedAt ?? activityAt;
    final projected = BackendLessonSession(
      id: resolvedSessionId,
      sessionId: resolvedSessionId,
      studentId: learner.id,
      learnerCode: learner.learnerCode,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      moduleId: lesson.moduleId,
      moduleTitle: lesson.subject,
      status: status,
      completionState: completionState,
      automationStatus: automationStatus,
      currentStepIndex: currentStepIndex,
      stepsTotal: stepsTotal ?? lesson.steps.length,
      responsesCaptured: responsesCaptured,
      supportActionsUsed: supportActionsUsed,
      audioCaptures: audioCaptures,
      facilitatorObservations: facilitatorObservations,
      latestReview: latestReview,
      startedAt: startedAt ?? activityAt,
      lastActivityAt: activityAt,
      completedAt: terminalAt,
    );
    recentRuntimeSessionsByLearnerId[learner.id] =
        _mergeRuntimeSessions(existing, [projected]);
  }

  LearnerProfile _mergeLearnerProfile({
    required LearnerProfile? existingLearner,
    required LearnerProfile incomingLearner,
  }) {
    if (existingLearner == null) return incomingLearner;
    return incomingLearner.copyWith(
      rewards: incomingLearner.rewards == null
          ? existingLearner.rewards
          : _mergeRewardSnapshot(
              existingLearner.rewards, incomingLearner.rewards!),
    );
  }

  RewardSnapshot _mergeRewardSnapshot(
    RewardSnapshot? local,
    RewardSnapshot incoming,
  ) {
    if (local == null) return incoming;
    final backendClearlyAhead = incoming.totalXp > local.totalXp ||
        incoming.points > local.points ||
        incoming.level > local.level ||
        incoming.badgesUnlocked > local.badgesUnlocked;
    final backendClearlyBehind = incoming.totalXp < local.totalXp &&
        incoming.points < local.points &&
        incoming.level <= local.level &&
        incoming.badgesUnlocked <= local.badgesUnlocked;
    if (backendClearlyAhead || !backendClearlyBehind) {
      return incoming;
    }

    return RewardSnapshot(
      learnerId:
          incoming.learnerId.isNotEmpty ? incoming.learnerId : local.learnerId,
      totalXp: local.totalXp,
      points: max(local.points, incoming.points),
      level: max(local.level, incoming.level),
      levelLabel: local.level >= incoming.level
          ? local.levelLabel
          : incoming.levelLabel,
      nextLevel: local.nextLevel ?? incoming.nextLevel,
      nextLevelLabel: local.nextLevelLabel ?? incoming.nextLevelLabel,
      xpIntoLevel: local.xpIntoLevel,
      xpForNextLevel: local.xpForNextLevel,
      progressToNextLevel:
          max(local.progressToNextLevel, incoming.progressToNextLevel),
      badgesUnlocked: max(local.badgesUnlocked, incoming.badgesUnlocked),
      badges: local.badges.isNotEmpty ? local.badges : incoming.badges,
    );
  }

  List<BackendLessonSession> _mergeRuntimeSessions(
    List<BackendLessonSession> existing,
    List<BackendLessonSession> incoming,
  ) {
    final merged = <String, BackendLessonSession>{};
    for (final session in [...existing, ...incoming]) {
      final key =
          session.sessionId.trim().isEmpty ? session.id : session.sessionId;
      final prior = merged[key];
      merged[key] =
          prior == null ? session : _preferRuntimeSession(prior, session);
    }

    final sessions = merged.values.toList(growable: false)
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
    return sessions;
  }

  BackendLessonSession _preferRuntimeSession(
    BackendLessonSession current,
    BackendLessonSession candidate,
  ) {
    final currentCompleted = current.status == 'completed';
    final candidateCompleted = candidate.status == 'completed';
    if (currentCompleted != candidateCompleted) {
      return currentCompleted ? current : candidate;
    }

    final currentTime =
        current.lastActivityAt ?? current.completedAt ?? current.startedAt;
    final candidateTime = candidate.lastActivityAt ??
        candidate.completedAt ??
        candidate.startedAt;
    if (currentTime != null &&
        candidateTime != null &&
        candidateTime.isAfter(currentTime)) {
      return candidate;
    }
    if (currentTime != null &&
        candidateTime != null &&
        currentTime.isAfter(candidateTime)) {
      return current;
    }

    if (candidate.currentStepIndex > current.currentStepIndex) {
      return candidate;
    }
    if (current.currentStepIndex > candidate.currentStepIndex) {
      return current;
    }

    if (candidate.responsesCaptured >= current.responsesCaptured) {
      return candidate;
    }
    return current;
  }

  RewardSnapshot _buildUpdatedRewardSnapshot(
    LearnerProfile learner,
    LessonSessionState session,
  ) {
    final existingRewards = learner.rewards;
    final baseTotalXp = existingRewards?.totalXp ?? 0;
    final basePoints = existingRewards?.points ?? 0;
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
      snapshotSavedAt = lastSyncedAt;
      snapshotSourceBaseUrl = backendBaseUrl;
      snapshotTrustedFromLiveBootstrap = true;
      lastSyncAcceptedCount = result.accepted;
      lastSyncIgnoredCount = result.ignored;
      lastSyncDuplicateCount = _asInt(result.raw['duplicates']) ?? 0;
      lastSyncResultCount =
          (result.raw['results'] as List?)?.length ?? snapshot.length;
      lastSyncWarnings = _buildSyncWarnings(result.raw);
      backendContractVersion =
          result.raw['contractVersion']?.toString() ?? backendContractVersion;
      snapshotContractVersion = backendContractVersion;
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
      lastSyncWarnings = const <String>[];
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

  String get rosterFreshnessLabel {
    final trustProblem = offlineSnapshotTrustProblem;
    if (lastSyncedAt == null) {
      if (usingFallbackData && trustProblem != null) {
        return 'Offline roster blocked from trust';
      }
      return usingFallbackData
          ? 'Roster running from offline seed fallback'
          : 'Roster not synced yet';
    }

    final freshness = _formatRelativeTime(lastSyncedAt!);
    if (usingFallbackData && trustProblem != null) {
      return 'Roster last synced $freshness • offline fallback active • trust blocked';
    }
    if (usingFallbackData) {
      return 'Roster last synced $freshness • offline fallback active';
    }
    return 'Roster last synced $freshness';
  }

  String get trustedSyncHeadline {
    final trustProblem = offlineSnapshotTrustProblem;
    if (lastSyncedAt == null) {
      if (usingFallbackData && trustProblem != null) {
        return 'No trusted live sync on this tablet';
      }
      return usingFallbackData
          ? 'No live sync on this tablet yet'
          : 'Waiting for the first live sync';
    }

    final freshness = _formatRelativeTime(lastSyncedAt!);
    final syncedAt = _formatTime(lastSyncedAt!);
    if (usingFallbackData && trustProblem != null) {
      return 'Last trusted sync $freshness at $syncedAt • trust blocked';
    }
    if (usingFallbackData) {
      return 'Last trusted sync $freshness at $syncedAt • offline fallback active';
    }
    return 'Last trusted sync $freshness at $syncedAt';
  }

  String get rosterFreshnessDetail {
    final trustProblem = offlineSnapshotTrustProblem;
    if (lastSyncedAt == null) {
      if (usingFallbackData && trustProblem != null) {
        return '$trustProblem Reconnect to $backendBaseUrl and refresh the learner bootstrap before trusting this tablet for live delivery.';
      }
      return usingFallbackData
          ? 'This tablet is teaching from cached learners and lessons until the backend comes back.'
          : 'This tablet has not completed its first backend roster refresh yet.';
    }

    final syncAge = _formatRelativeTime(lastSyncedAt!);
    if (usingFallbackData && trustProblem != null) {
      return 'Learners and lessons were last confirmed $syncAge, but this roster is still blocked from trust. $trustProblem Reconnect to $backendBaseUrl and refresh before trusting this tablet for live delivery.';
    }
    if (usingFallbackData) {
      return 'Learners and lessons were last confirmed $syncAge. Keep teaching, but refresh before trusting any newly assigned content.';
    }
    if (pendingSyncEvents.isNotEmpty) {
      return 'Learners and lessons were refreshed $syncAge. ${pendingSyncEvents.length} learner event(s) are still queued locally for the next sync.';
    }
    return 'Learners and lessons were refreshed $syncAge. This roster is current enough to trust for the next lesson handoff.';
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

    final assigned = assignedLessons.toList(growable: false);
    for (final lesson in assigned) {
      if (lesson.id == session.lessonId) return lesson;
    }

    final normalizedSessionTitle =
        (session.lessonTitle ?? '').trim().toLowerCase();
    if (normalizedSessionTitle.isNotEmpty) {
      final titleMatches = assigned
          .where(
            (lesson) =>
                lesson.title.trim().toLowerCase() == normalizedSessionTitle,
          )
          .toList(growable: false);
      if (titleMatches.length == 1) return titleMatches.first;
    }

    final moduleMatches = assigned
        .where((lesson) => lesson.moduleId == session.moduleId)
        .toList(growable: false);
    if (moduleMatches.length == 1) {
      return moduleMatches.first;
    }

    return null;
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

  Future<void> refreshLearnerRewards(LearnerProfile learner) async {
    if (usingFallbackData) return;
    if (learner.id.trim().isEmpty && learner.learnerCode.trim().isEmpty) return;

    try {
      final snapshot = await _apiClient.fetchLearnerRewards(
        learnerId: learner.id,
        learnerCode: learner.learnerCode,
      );
      final learnerIndex = learners.indexWhere((item) => item.id == learner.id);
      if (learnerIndex == -1) return;

      final existingLearner = learners[learnerIndex];
      final refreshedLearner = existingLearner.copyWith(
        rewards: _mergeRewardSnapshot(existingLearner.rewards, snapshot),
      );
      _replaceLearner(refreshedLearner);
      persistStateSoon();
    } catch (_) {
      // Keep the optimistic local reward state if the backend reward projection
      // is temporarily unavailable.
    }
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
      final existing = recentRuntimeSessionsByLearnerId[learner.id] ?? const [];
      recentRuntimeSessionsByLearnerId[learner.id] =
          _mergeRuntimeSessions(existing, sessions);
      learnerRuntimeError = null;
      _notifyListeners();
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
    final duplicateLabel = lastSyncDuplicateCount > 0
        ? ' / $lastSyncDuplicateCount duplicate'
        : '';
    return 'Last sync ${_formatTime(lastSyncAttemptAt!)} • '
        '$lastSyncAcceptedCount accepted / $lastSyncIgnoredCount ignored$duplicateLabel';
  }

  String get syncReceiptLabel {
    if (lastSyncAttemptAt == null) return 'Waiting for first sync receipt';
    if (lastSyncError != null) {
      return 'Sync receipt unavailable';
    }
    if (lastSyncResultCount <= 0) return 'No receipt rows returned';
    final duplicateLabel = lastSyncDuplicateCount > 0
        ? ' • $lastSyncDuplicateCount duplicate'
        : '';
    return '$lastSyncResultCount receipt row(s)$duplicateLabel';
  }

  String get syncWarningsLabel {
    if (lastSyncWarnings.isEmpty) return 'No sync warnings';
    if (lastSyncWarnings.length == 1) return lastSyncWarnings.first;
    return '${lastSyncWarnings.length} sync warnings';
  }

  bool get hasCriticalSyncTrustBlocker {
    final error = lastSyncError?.toLowerCase() ?? '';
    if (error.contains('unknown learner for sync event') ||
        error.contains('unknown learner')) {
      return true;
    }

    return lastSyncWarnings.any((warning) {
      final normalized = warning.toLowerCase();
      return normalized.contains('unsupported_event_type') ||
          normalized.contains('backend could not apply') ||
          normalized.contains('unknown learner');
    });
  }

  String? get criticalSyncTrustBlockerReason {
    final error = lastSyncError?.trim();
    if (error != null && error.isNotEmpty) {
      final normalized = error.toLowerCase();
      if (normalized.contains('unknown learner for sync event') ||
          normalized.contains('unknown learner')) {
        return 'Runtime sync is blocked because the backend rejected at least one learner event as unknown. Do not trust queued progress until that learner record is reconciled.';
      }
    }

    for (final warning in lastSyncWarnings) {
      final normalized = warning.toLowerCase();
      if (normalized.contains('unsupported_event_type')) {
        return 'Runtime sync receipts show unsupported learner events. That means the tablet captured activity the backend does not currently honor, so pilot trust is broken until the contract is fixed.';
      }
      if (normalized.contains('backend could not apply')) {
        return 'Runtime sync receipts show learner events the backend could not apply. Keep teaching if needed, but do not treat backend progress as trustworthy until ops clears the bad receipt.';
      }
      if (normalized.contains('unknown learner')) {
        return 'Runtime sync receipts show an unknown learner mismatch. Reconcile the learner record before trusting new backend progress from this tablet.';
      }
    }

    return null;
  }

  String get runtimeSyncFeedbackLabel {
    if (isSyncingEvents) {
      return 'Syncing ${pendingSyncEvents.length} queued learner event(s) now.';
    }
    if (lastSyncError != null && lastSyncError!.trim().isNotEmpty) {
      return 'Last runtime sync failed, so new learner evidence stays queued locally until retry succeeds.';
    }
    if (pendingSyncEvents.isNotEmpty) {
      return '${pendingSyncEvents.length} learner event(s) are safely queued on this tablet and ready for the next backend sync.';
    }
    if (lastSyncAttemptAt != null && !usingFallbackData) {
      return 'Runtime evidence is caught up with the backend right now.';
    }
    if (usingFallbackData) {
      return 'Backend fallback is active, so runtime evidence will stay local until connectivity returns.';
    }
    return 'Runtime sync is waiting for the first learner event.';
  }

  List<String> runtimeSyncActionItems() {
    final actions = <String>[];
    if (usingFallbackData) {
      actions.add(
        'Keep teaching from cached lessons. Registration, learner audio, and response events will stay on-device until the backend returns.',
      );
    }
    if (pendingSyncEvents.isNotEmpty) {
      actions.add(
        'Avoid duplicate taps while the queue drains; Lumo will replay the pending learner events safely on the next sync.',
      );
    }
    if (lastSyncError != null && lastSyncError!.trim().isNotEmpty) {
      actions.add(
        'Retry backend sync after connectivity improves, but do not stop the lesson — the learner evidence is already preserved locally.',
      );
    }
    if (lastSyncWarnings.isNotEmpty) {
      actions.add(
        'Review sync receipts for ignored or duplicate events so facilitators know whether backend state fully matched the tablet state.',
      );
    }
    if (actions.isEmpty) {
      actions.add(
        'No sync intervention needed. The tablet and backend are aligned.',
      );
    }
    return actions;
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
        const LearningModule(
          id: 'pending-module',
          title: 'Subject sync pending',
          description:
              'Live subject routing has not loaded yet. Refresh the tablet or reconnect the backend before starting a learner route.',
          voicePrompt:
              'Live subject routing is still loading. Refresh the tablet before starting this learner.',
          readinessGoal: 'Wait for backend lesson sync',
          badge: 'Sync pending',
        );
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
    final firstName = _learnerFirstName(learner);
    return text
        .replaceAll('[learner name]', learner.name)
        .replaceAll('[learner first name]', firstName)
        .replaceAll('[first name]', firstName)
        .replaceAll('____', learner.name)
        .replaceAll('Aisha', learner.name)
        .replaceAll('Abdullahi', learner.name);
  }

  String personalizeExpectedResponse(String text) {
    final learner = currentLearner;
    if (learner == null) return text;
    final firstName = _learnerFirstName(learner);
    return text
        .replaceAll('[learner name]', learner.name)
        .replaceAll('[learner first name]', firstName)
        .replaceAll('[first name]', firstName)
        .replaceAll('____', learner.name)
        .replaceAll('Aisha', learner.name)
        .replaceAll('Abdullahi', learner.name);
  }

  String _learnerFirstName(LearnerProfile learner) {
    final parts = learner.name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList(growable: false);
    return parts.isEmpty ? learner.name.trim() : parts.first;
  }

  String _offlineOnboardingStatus({
    required LessonCardModel lesson,
    required LessonStep step,
    required bool isResuming,
    BackendLessonSession? resumeFrom,
  }) {
    if (!_isBundledFundamentalsLesson(lesson)) {
      final learnerName = currentLearner?.name ?? 'the learner';
      return isResuming
          ? (resumeFrom?.automationStatus.trim().isNotEmpty == true
              ? '${resumeFrom!.automationStatus} Resume from ${resumeFrom.progressLabel.toLowerCase()}.'
              : 'Mallam is resuming ${lesson.title} with $learnerName from ${resumeFrom?.progressLabel.toLowerCase() ?? 'the saved step'}.')
          : 'Mallam is opening the lesson and preparing the first voice prompt.';
    }

    final learner = currentLearner;
    final firstName =
        learner == null ? 'my friend' : _learnerFirstName(learner);
    final stepPrompt = personalizePrompt(step.coachPrompt);
    if (isResuming) {
      final base = resumeFrom?.automationStatus.trim().isNotEmpty == true
          ? resumeFrom!.automationStatus
          : 'Offline onboarding resumed for $firstName.';
      return '$base ${step.title} is ready from ${resumeFrom?.progressLabel.toLowerCase() ?? 'the saved step'}.';
    }
    return 'Offline onboarding is ready for $firstName. ${step.title} starts now: $stepPrompt';
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
      );
      recentRuntimeSessionsByLearnerId[learnerId] =
          _mergeRuntimeSessions(existing, [session]);
    }
  }

  List<String> _buildSyncWarnings(Map<String, dynamic> raw) {
    final results = raw['results'];
    if (results is! List) return const <String>[];

    final warnings = <String>[];
    final duplicateCount = _asInt(raw['duplicates']) ?? 0;
    final ignoredCount = _asInt(raw['ignored']) ?? 0;
    if (duplicateCount > 0) {
      warnings.add(
          '$duplicateCount event(s) were already synced earlier, so the backend ignored the duplicates safely.');
    }
    if (ignoredCount > 0) {
      warnings.add(
          '$ignoredCount event(s) were ignored because the backend could not apply them.');
    }

    for (final item in results.whereType<Map>()) {
      final status = item['status']?.toString() ?? '';
      final type = item['type']?.toString() ?? 'event';
      if (status == 'ignored') {
        final reason = item['reason']?.toString() ?? 'unsupported_event_type';
        warnings.add('$type was ignored ($reason).');
      } else if (status == 'duplicate' && duplicateCount == 0) {
        warnings.add(
            '$type matched an earlier receipt, so it was not replayed twice.');
      }
    }

    return warnings.take(3).toList(growable: false);
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
        rewards: rewardSnapshot == null
            ? existingLearner.rewards
            : _mergeRewardSnapshot(existingLearner.rewards, rewardSnapshot),
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

      _replaceLearner(updatedLearner);
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
    final learner = currentLearner;
    final learnerCode = learner?.learnerCode;
    if (learnerCode == null || learnerCode.trim().isEmpty) return;

    pendingSyncEvents.add(
      SyncEvent(
        id: 'sync-${pendingSyncEvents.length + 1}',
        type: type,
        payload: {
          'sessionId': session.sessionId,
          if (learner != null && learner.id.trim().isNotEmpty)
            'studentId': learner.id,
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
      'moduleContentOrigins':
          _moduleContentOrigins.map((key, value) => MapEntry(key, value.name)),
      'lessonContentOrigins':
          _lessonContentOrigins.map((key, value) => MapEntry(key, value.name)),
      'tabletDeviceIdentifier': tabletDeviceIdentifier,
      'registrationDraft': _encodeRegistrationDraft(registrationDraft),
      'registrationContext': _encodeRegistrationContext(registrationContext),
      'pendingSyncEvents': pendingSyncEvents.map(_encodeSyncEvent).toList(),
      'recentRuntimeSessionsByLearnerId': recentRuntimeSessionsByLearnerId.map(
        (key, value) =>
            MapEntry(key, value.map(_encodeBackendLessonSession).toList()),
      ),
      'rewardRedemptionHistoryByLearnerId':
          rewardRedemptionHistoryByLearnerId.map(
        (key, value) =>
            MapEntry(key, value.map(_encodeRewardRedemptionRecord).toList()),
      ),
      'currentLearnerId': currentLearner?.id,
      'selectedModuleId': selectedModule?.id,
      'activeSession':
          activeSession == null ? null : _encodeLessonSession(activeSession!),
      'speakerMode': speakerMode.name,
      'usingFallbackData': usingFallbackData,
      'acknowledgedOfflineFallbackRisk': acknowledgedOfflineFallbackRisk,
      'backendError': backendError,
      'lastSyncedAt': lastSyncedAt?.toIso8601String(),
      'backendGeneratedAt': backendGeneratedAt?.toIso8601String(),
      'lastSyncAttemptAt': lastSyncAttemptAt?.toIso8601String(),
      'snapshotSavedAt': snapshotSavedAt?.toIso8601String(),
      'sourceBaseUrl': snapshotSourceBaseUrl,
      'snapshotContractVersion': snapshotContractVersion,
      'snapshotTrustedFromLiveBootstrap': snapshotTrustedFromLiveBootstrap,
      'backendContractVersion': backendContractVersion,
      'backendAssignmentCount': backendAssignmentCount,
      'lastSyncAcceptedCount': lastSyncAcceptedCount,
      'lastSyncIgnoredCount': lastSyncIgnoredCount,
      'lastSyncDuplicateCount': lastSyncDuplicateCount,
      'lastSyncResultCount': lastSyncResultCount,
      'lastSyncWarnings': lastSyncWarnings,
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

  Map<String, List<RewardRedemptionRecord>> _decodeRewardRedemptionHistory(
      Object? raw) {
    final output = <String, List<RewardRedemptionRecord>>{};
    if (raw is! Map) return output;
    for (final entry in raw.entries) {
      output[entry.key.toString()] = (entry.value as List?)
              ?.whereType<Map>()
              .map((item) => RewardRedemptionRecord.fromJson(
                  Map<String, dynamic>.from(item)))
              .toList() ??
          const <RewardRedemptionRecord>[];
    }
    return output;
  }

  bool get hasPendingRecoveredSession =>
      pendingRecoveredSessionSnapshot != null;

  String get pendingRecoveredSessionLabel {
    final snapshot = pendingRecoveredSessionSnapshot;
    if (snapshot == null) return 'No pending recovery.';
    final lessonTitle = snapshot['lessonTitle']?.toString();
    final lessonId = snapshot['lessonId']?.toString();
    final stepNumber = (_asInt(snapshot['stepIndex']) ?? 0) + 1;
    final progress = 'Step $stepNumber';
    final lessonLabel = lessonTitle?.trim().isNotEmpty == true
        ? lessonTitle!.trim()
        : (lessonId?.trim().isNotEmpty == true ? lessonId!.trim() : 'lesson');
    return 'Recovered $lessonLabel is waiting for lesson sync before $progress can resume.';
  }

  void _recoverPendingSessionAfterRefresh() {
    final snapshot = pendingRecoveredSessionSnapshot;
    if (snapshot == null || activeSession != null) return;
    final recovered = _decodeActiveSession(snapshot);
    if (recovered == null) return;
    activeSession = recovered;
    pendingRecoveredSessionSnapshot = null;
    final learnerId = snapshot['currentLearnerId']?.toString();
    if (learnerId != null && learnerId.trim().isNotEmpty) {
      currentLearner = learners.cast<LearnerProfile?>().firstWhere(
            (item) => item?.id == learnerId,
            orElse: () => currentLearner,
          );
    }
  }

  LessonCardModel? _resolvePersistedSessionLesson(Map<String, dynamic> raw) {
    final assigned = assignedLessons.toList(growable: false);
    if (assigned.isEmpty) return null;

    final lessonId = _readNullableString(raw['lessonId']);
    if (lessonId != null) {
      final exactMatch = assigned.cast<LessonCardModel?>().firstWhere(
            (item) => item?.id == lessonId,
            orElse: () => null,
          );
      if (exactMatch != null) return exactMatch;
    }

    final normalizedTitle =
        _readNullableString(raw['lessonTitle'])?.trim().toLowerCase() ?? '';
    final normalizedModuleId =
        _readNullableString(raw['moduleId'])?.trim().toLowerCase() ?? '';
    final persistedStepCount =
        (raw['transcript'] as List?)?.whereType<Map>().length ?? 0;

    if (normalizedTitle.isNotEmpty) {
      final titleMatches = assigned.where((lesson) {
        final lessonTitle = lesson.title.trim().toLowerCase();
        final lessonModuleId = lesson.moduleId.trim().toLowerCase();
        final moduleMatches =
            normalizedModuleId.isEmpty || lessonModuleId == normalizedModuleId;
        return lessonTitle == normalizedTitle && moduleMatches;
      }).toList(growable: false);
      if (titleMatches.length == 1) return titleMatches.first;
      if (titleMatches.length > 1 && persistedStepCount > 0) {
        final stepCountMatches = titleMatches
            .where((lesson) => lesson.steps.length >= persistedStepCount)
            .toList(growable: false);
        if (stepCountMatches.length == 1) return stepCountMatches.first;
      }
    }

    if (normalizedModuleId.isNotEmpty) {
      final moduleMatches = assigned
          .where((lesson) =>
              lesson.moduleId.trim().toLowerCase() == normalizedModuleId)
          .toList(growable: false);
      if (moduleMatches.length == 1) return moduleMatches.first;
    }

    return null;
  }

  LessonSessionState? _decodeActiveSession(Object? raw) {
    if (raw is! Map) return null;
    final lesson =
        _resolvePersistedSessionLesson(Map<String, dynamic>.from(raw));
    if (lesson == null) return null;

    final boundedStepIndex = lesson.steps.isEmpty
        ? 0
        : max(0, min(lesson.steps.length - 1, _asInt(raw['stepIndex']) ?? 0));
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
            .where((turn) => turn.text.trim().isNotEmpty)
            .toList() ??
        <SessionTurn>[];
    final openingPrompt = lesson.steps.isEmpty
        ? null
        : personalizePrompt(lesson.steps[boundedStepIndex].coachPrompt);
    if (transcript.isEmpty &&
        openingPrompt != null &&
        openingPrompt.isNotEmpty) {
      transcript.add(
        SessionTurn(
          speaker: 'Mallam',
          text: openingPrompt,
          timestamp: DateTime.now(),
        ),
      );
    }

    return LessonSessionState(
      sessionId: raw['sessionId']?.toString() ?? 'session-restored',
      lesson: lesson,
      stepIndex: boundedStepIndex,
      completionState: LessonCompletionState.values.firstWhere(
        (value) => value.name == raw['completionState']?.toString(),
        orElse: () => LessonCompletionState.inProgress,
      ),
      speakerMode: lesson.steps.isEmpty
          ? _decodeSpeakerMode(raw['speakerMode'])
          : lesson.steps[boundedStepIndex].speakerMode,
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
        'cohortId': learner.cohortId,
        'podId': learner.podId,
        'podLabel': learner.podLabel,
        'mallamId': learner.mallamId,
        'mallamName': learner.mallamName,
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
        'profilePhotoBase64': learner.profilePhotoBase64,
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
        cohortId: _readNullableString(raw['cohortId']),
        podId: _readNullableString(raw['podId']),
        podLabel: _readNullableString(raw['podLabel']),
        mallamId: _readNullableString(raw['mallamId']),
        mallamName: _readNullableString(raw['mallamName']),
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
        profilePhotoBase64: _readNullableString(raw['profilePhotoBase64']),
        lastLessonSummary:
            raw['lastLessonSummary']?.toString() ?? 'No lesson captured yet.',
        lastAttendance: raw['lastAttendance']?.toString() ?? 'Checked in today',
        backendRecommendedModuleId:
            _readNullableString(raw['backendRecommendedModuleId']),
        rewards: raw['rewards'] is Map
            ? _decodeRewardSnapshot(Map<String, dynamic>.from(raw['rewards']))
            : null,
      );

  Map<String, dynamic> _encodeRewardRedemptionRecord(
          RewardRedemptionRecord record) =>
      {
        'id': record.id,
        'learnerId': record.learnerId,
        'optionId': record.optionId,
        'title': record.title,
        'icon': record.icon,
        'category': record.category,
        'cost': record.cost,
        'celebrationCue': record.celebrationCue,
        'note': record.note,
        'redeemedAt': record.redeemedAt.toIso8601String(),
        'pointsRemaining': record.pointsRemaining,
        'status': record.status,
      };

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
        'status': module.status,
      };

  LearningModule _decodeModule(Map<String, dynamic> raw) =>
      LearningModule.fromBackend(raw);

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
                                    'media': choice.mediaItems.isEmpty
                                        ? null
                                        : choice.mediaItems
                                            .map((media) => {
                                                  'kind': media.kind,
                                                  'value':
                                                      media.values.length <= 1
                                                          ? media.firstValue
                                                          : media.values,
                                                })
                                            .toList(),
                                  })
                              .toList(),
                      'choiceEmoji': step.activity!.choiceEmoji,
                      'targetResponse': step.activity!.targetResponse,
                      'expectedAnswers': step.activity!.expectedAnswers,
                      'successFeedback': step.activity!.successFeedback,
                      'retryFeedback': step.activity!.retryFeedback,
                      'media': step.activity!.mediaItems.isEmpty
                          ? null
                          : step.activity!.mediaItems
                              .map((media) => {
                                    'kind': media.kind,
                                    'value': media.values.length <= 1
                                        ? media.firstValue
                                        : media.values,
                                  })
                              .toList(),
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
        'profilePhotoBase64': draft.profilePhotoBase64,
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
      profilePhotoBase64: _readNullableString(raw['profilePhotoBase64']),
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
        'tabletRegistration': context.tabletRegistration == null
            ? null
            : {
                'id': context.tabletRegistration!.id,
                'deviceIdentifier':
                    context.tabletRegistration!.deviceIdentifier,
                'podId': context.tabletRegistration!.podId,
                'podLabel': context.tabletRegistration!.podLabel,
                'mallamId': context.tabletRegistration!.mallamId,
                'mallamName': context.tabletRegistration!.mallamName,
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
        'lessonTitle': session.lesson.title,
        'moduleId': session.lesson.moduleId,
        'currentLearnerId': currentLearner?.id,
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
        ..._buildPersistenceSnapshot(),
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

  Future<String> ensureStableDeviceIdentifier() async {
    final configured = _configuredDeviceIdentifier;
    if (configured != null) {
      final changed = tabletDeviceIdentifier != configured;
      tabletDeviceIdentifier = configured;
      _apiClient.deviceIdentifier = configured;
      if (changed) {
        await _persistStateNow();
      }
      return configured;
    }

    final existing = tabletDeviceIdentifier?.trim();
    if (existing != null && existing.isNotEmpty) {
      _apiClient.deviceIdentifier = existing;
      return existing;
    }

    final generated = _generateStableDeviceIdentifier();
    tabletDeviceIdentifier = generated;
    _apiClient.deviceIdentifier = generated;
    await _persistStateNow();
    return generated;
  }

  String _generateStableDeviceIdentifier() {
    final random = Random.secure();
    final entropy = List<int>.generate(8, (_) => random.nextInt(256))
        .map((value) => value.toRadixString(16).padLeft(2, '0'))
        .join();
    final timestamp = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    return 'lumo-tablet-$timestamp-$entropy';
  }

  void dispose() {
    _syncRetryTimer?.cancel();
    _persistenceDebounce?.cancel();
    _listeners.clear();
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

  String _formatDuration(Duration value) {
    if (value.inMinutes < 60) return '${value.inMinutes}m';
    if (value.inHours < 24) {
      final hours = value.inHours;
      final minutes = value.inMinutes % 60;
      if (minutes == 0) return '${hours}h';
      return '${hours}h ${minutes}m';
    }
    final days = value.inDays;
    final hours = value.inHours % 24;
    if (hours == 0) return '${days}d';
    return '${days}d ${hours}h';
  }

  String _formatRelativeTime(DateTime value) {
    final delta = DateTime.now().difference(value);
    if (delta.inMinutes <= 1) return 'just now';
    if (delta.inMinutes < 60) return '${delta.inMinutes}m ago';
    if (delta.inHours < 24) {
      final hours = delta.inHours;
      final minutes = delta.inMinutes % 60;
      if (minutes == 0) return '${hours}h ago';
      return '${hours}h ${minutes}m ago';
    }
    final days = delta.inDays;
    final hours = delta.inHours % 24;
    if (hours == 0) return '${days}d ago';
    return '${days}d ${hours}h ago';
  }
}

class RewardRedemptionRecord {
  final String id;
  final String learnerId;
  final String optionId;
  final String title;
  final String icon;
  final String category;
  final int cost;
  final String celebrationCue;
  final String? note;
  final DateTime redeemedAt;
  final int pointsRemaining;
  final String status;

  const RewardRedemptionRecord({
    required this.id,
    required this.learnerId,
    required this.optionId,
    required this.title,
    required this.icon,
    required this.category,
    required this.cost,
    required this.celebrationCue,
    required this.redeemedAt,
    required this.pointsRemaining,
    this.note,
    this.status = 'redeemed',
  });

  factory RewardRedemptionRecord.fromJson(Map<String, dynamic> json) {
    int? asInt(Object? raw) =>
        raw is int ? raw : int.tryParse(raw?.toString() ?? '');
    String? nullableString(Object? raw) {
      final value = raw?.toString();
      if (value == null || value.trim().isEmpty || value == 'null') return null;
      return value;
    }

    DateTime? parseDate(Object? raw) {
      final value = raw?.toString();
      if (value == null || value.trim().isEmpty) return null;
      return DateTime.tryParse(value);
    }

    return RewardRedemptionRecord(
      id: json['id']?.toString() ?? 'reward-record',
      learnerId: json['learnerId']?.toString() ?? '',
      optionId: json['optionId']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Reward',
      icon: json['icon']?.toString() ?? '🎉',
      category: json['category']?.toString() ?? 'reward',
      cost: asInt(json['cost']) ?? 0,
      celebrationCue: json['celebrationCue']?.toString() ?? '',
      note: nullableString(json['note']),
      redeemedAt: parseDate(json['redeemedAt']) ?? DateTime.now(),
      pointsRemaining: asInt(json['pointsRemaining']) ?? 0,
      status: json['status']?.toString() ?? 'redeemed',
    );
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
