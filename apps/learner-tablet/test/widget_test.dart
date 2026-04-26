import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';
import 'package:lumo_learner_tablet/seed_data.dart';
import 'package:lumo_learner_tablet/widgets.dart';

class _FailingApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap({
    String? overrideDeviceIdentifier,
  }) async {
    throw Exception('backend offline');
  }
}

class _DelayedApiClient extends LumoApiClient {
  _DelayedApiClient(this._completer);

  final Completer<LumoBootstrap> _completer;

  @override
  Future<LumoBootstrap> fetchBootstrap({String? overrideDeviceIdentifier}) =>
      _completer.future;

  @override
  Future<LumoModuleBundle> fetchModuleBundle(String moduleId) async {
    final module = learningModules.firstWhere(
      (item) => item.id == moduleId,
      orElse: () => learningModules.first,
    );
    return LumoModuleBundle(
      module: module,
      lessons: assignedLessonsSeed
          .where((lesson) => lesson.moduleId == moduleId)
          .toList(),
    );
  }
}

class _RewardsRefreshApiClient extends LumoApiClient {
  _RewardsRefreshApiClient(this._completer);

  final Completer<RewardSnapshot> _completer;

  @override
  Future<RewardSnapshot> fetchLearnerRewards({
    String? learnerId,
    String? learnerCode,
  }) {
    return _completer.future;
  }
}

class _PlaceholderRecoveryApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap({
    String? overrideDeviceIdentifier,
  }) async {
    return LumoBootstrap(
      learners: learnerProfilesSeed,
      modules: learningModules,
      lessons: assignedLessonsSeed,
    );
  }
}

class _SeedApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap({
    String? overrideDeviceIdentifier,
  }) async {
    return LumoBootstrap(
      learners: learnerProfilesSeed,
      modules: learningModules,
      lessons: assignedLessonsSeed,
    );
  }

  @override
  Future<LumoModuleBundle> fetchModuleBundle(String moduleId) async {
    final module = learningModules.firstWhere(
      (item) => item.id == moduleId,
      orElse: () => learningModules.first,
    );
    return LumoModuleBundle(
      module: module,
      lessons: assignedLessonsSeed
          .where((lesson) => lesson.moduleId == moduleId)
          .toList(),
    );
  }
}

class _AmbiguousPlaceholderRecoveryApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap({
    String? overrideDeviceIdentifier,
  }) async {
    final englishSeed = assignedLessonsSeed.firstWhere(
      (item) => item.moduleId == 'english',
    );

    return LumoBootstrap(
      learners: learnerProfilesSeed,
      modules: learningModules,
      lessons: [
        englishSeed,
        LessonCardModel(
          id: 'english-second-live-lesson',
          moduleId: 'english',
          title: 'Another live English lesson',
          subject: englishSeed.subject,
          durationMinutes: englishSeed.durationMinutes,
          status: englishSeed.status,
          mascotName: englishSeed.mascotName,
          readinessFocus: englishSeed.readinessFocus,
          scenario: 'Second live lesson in the same module.',
          steps: englishSeed.steps,
        ),
      ],
    );
  }
}

class _FakeBundledContentLoader extends BundledContentLoader {
  const _FakeBundledContentLoader(this.library);

  final BundledContentLibrary library;

  @override
  Future<BundledContentLibrary> load() async => library;
}

void _noop() {}

void main() {
  Future<void> pumpAppAtSize(WidgetTester tester, Size size) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(
      apiClient: _SeedApiClient(),
      bundledContentLoader: _FakeBundledContentLoader(
        BundledContentLibrary(
          modules: learningModules,
          lessons: assignedLessonsSeed,
        ),
      ),
      includeSeedDemoContent: false,
    );
    addTearDown(state.dispose);

    await tester.pumpWidget(
      LumoApp(stateOverride: state, includeSeedDemoContent: false),
    );
    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(milliseconds: 300));
  }

  Future<void> pumpForUi(
    WidgetTester tester, [
    Duration duration = const Duration(seconds: 3),
  ]) async {
    await tester.pump();
    await tester.pump(duration);
  }

  testWidgets('shows learner app shell after splash', (tester) async {
    await pumpAppAtSize(tester, const Size(1400, 1000));

    expect(find.text('Hear Mallam again'), findsOneWidget);
    expect(find.text('Register'), findsOneWidget);
    expect(find.text('Student list'), findsOneWidget);
    expect(find.text('Subjects'), findsNothing);
  });

  testWidgets('home screen shows operator source status chips at the top', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = true
      ..lastSyncedAt = DateTime.now().subtract(const Duration(hours: 8))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(hours: 2))
      ..pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(state: state, onChanged: _noop),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Offline pack curriculum'), findsOneWidget);
    expect(find.text('Sync stale'), findsOneWidget);
  });

  testWidgets(
    'home screen surfaces the last trusted sync headline prominently',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true)
        ..usingFallbackData = true
        ..lastSyncedAt = DateTime.now().subtract(
          const Duration(hours: 3, minutes: 15),
        );
      addTearDown(state.dispose);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.textContaining('Last trusted sync'), findsWidgets);
      expect(find.textContaining('offline fallback active'), findsWidgets);
    },
  );

  testWidgets(
    'home screen keeps the trust banner visible on compact tablets when pilot warnings exist',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true)
        ..usingFallbackData = true
        ..backendError = 'backend offline';
      addTearDown(state.dispose);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('No trusted live sync on this tablet'), findsOneWidget);
      expect(find.textContaining('Reconnect to'), findsOneWidget);
    },
  );

  testWidgets(
    'home subject cards stay in a single 3-card row on the learner tablet layout',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final subjectGrid = tester.widget<GridView>(find.byType(GridView).first);
      final delegate =
          subjectGrid.gridDelegate as SliverGridDelegateWithFixedCrossAxisCount;

      expect(delegate.crossAxisCount, 3);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('Math'), findsOneWidget);
      expect(find.text('Life Skills'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'home screen hides subject cards that have no learner-safe launch path on this tablet',
    (tester) async {
      tester.view.physicalSize = const Size(1600, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true)
        ..registrationContext = const RegistrationContext(
          tabletRegistration: TabletRegistration(
            id: 'tablet-1',
            podId: 'pod-locked',
            podLabel: 'Locked pod',
          ),
        );
      final mismatchedLearners = state.learners
          .map(
            (learner) =>
                learner.copyWith(podId: 'other-pod', podLabel: 'Other pod'),
          )
          .toList(growable: false);
      state.learners
        ..clear()
        ..addAll(mismatchedLearners);
      addTearDown(state.dispose);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(GridView), findsNothing);
      expect(
        find.text('No live subjects are ready on this tablet yet.'),
        findsOneWidget,
      );
      expect(find.text('Open student list'), findsOneWidget);
    },
  );

  testWidgets('home screen gives Mallam a human home summary without clutter', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.suggestedLearnerForHome;
    final learnerName = learner?.name.split(' ').first;
    final nextLesson = state.nextAssignedLessonForLearner(learner);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(state: state, onChanged: _noop),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Hear Mallam again'), findsOneWidget);
    expect(nextLesson, isNotNull);
    expect(learnerName, isNotNull);
    expect(
      find.text('Mallam is ready for ${learnerName!}\'s next step.'),
      findsNothing,
    );
    expect(find.text('What Mallam is noticing'), findsNothing);
    expect(find.text(state.suggestedLearnerForHome!.supportPlan), findsNothing);
    expect(find.text('Learner: $learnerName'), findsNothing);
    expect(
      find.text(
        'Subject: ${state.recommendedModuleForLearner(learner!).title}',
      ),
      findsNothing,
    );
    expect(find.text('Next: ${nextLesson!.title}'), findsNothing);
    expect(find.textContaining('jump straight into'), findsNothing);
    expect(find.text('AI Mallam is ready'), findsNothing);
    expect(find.text('Home guide'), findsNothing);
    expect(
      find.textContaining('Assalamu alaikum. You are on the home page.'),
      findsNothing,
    );
    expect(
      find.textContaining('Keep Mallam visible and dominant'),
      findsNothing,
    );
    expect(find.textContaining('Facilitator guidance'), findsNothing);

    state.dispose();
  });

  testWidgets(
    'holds on bootstrap loading state instead of showing an empty home screen',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final completer = Completer<LumoBootstrap>();
      final state = LumoAppState(
        apiClient: _DelayedApiClient(completer),
        includeSeedDemoContent: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LumoApp(stateOverride: state, includeSeedDemoContent: false),
        ),
      );

      await tester.pump(const Duration(seconds: 3));
      await tester.pump();

      expect(
        find.text('Loading the live learner roster before the tablet opens.'),
        findsOneWidget,
      );
      expect(find.text('Register'), findsNothing);
      expect(find.text('Student list'), findsNothing);

      state.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    },
  );

  testWidgets('splash screen stays usable on short tablet heights', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 360);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      const MaterialApp(home: SplashScreen(onFinish: _noop)),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.text('Lumo learner tablet'), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
  });

  testWidgets('module lesson screen keeps Mallam stage minimal on the left', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final module = state.modules.first;

    await tester.pumpWidget(
      MaterialApp(
        home: SubjectModulesPage(
          state: state,
          onChanged: _noop,
          module: module,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Hear Mallam again'), findsOneWidget);
    expect(find.text('Follow Mallam one lesson at a time'), findsNothing);
    expect(find.textContaining('You opened ${module.title}.'), findsNothing);
    expect(find.text('Available lessons'), findsOneWidget);
    expect(
      find.textContaining('choose which available learner'),
      findsOneWidget,
    );
    expect(find.text('Lesson journey'), findsNothing);
    expect(find.text('Lesson path'), findsNothing);
    expect(find.text('Next step'), findsNothing);

    state.dispose();
  });

  testWidgets('auto-reopens a recovered in-progress lesson after splash', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1500);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);
    state.restoredFromPersistence = true;

    await tester.pumpWidget(
      MaterialApp(
        home: SessionRecoveryGate(state: state, onChanged: () {}),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(tester.takeException(), isNull);
    expect(find.text('Back'), findsOneWidget);
    expect(find.text('Hear Mallam again'), findsWidgets);
    expect(find.text('Continue'), findsOneWidget);
    expect(find.byType(FilledButton), findsAtLeastNWidgets(2));

    state.dispose();
  });

  testWidgets(
    'reopens the completion page when a finished lesson is restored',
    (tester) async {
      tester.view.physicalSize = const Size(1600, 1500);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.activeSession = state.activeSession?.copyWith(
        completionState: LessonCompletionState.complete,
      );
      state.restoredFromPersistence = true;

      await tester.pumpWidget(
        MaterialApp(
          home: SessionRecoveryGate(state: state, onChanged: () {}),
        ),
      );
      await tester.pump();
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Go home'), findsOneWidget);
      expect(find.text('Go to next learner'), findsOneWidget);
      expect(find.textContaining('lesson'), findsWidgets);

      state.dispose();
    },
  );

  testWidgets('restores recent runtime sessions from legacy persisted key', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'lumo_learner_tablet_state_v1':
          '{"schemaVersion":"2026-04-13-runtime-persist","learners":[{"id":"student-1","name":"Amina Bello","age":9,"cohort":"Cohort A","streakDays":0,"guardianName":"Hauwa Bello","preferredLanguage":"Hausa","readinessLabel":"Voice-first beginner","village":"Kawo","guardianPhone":"","sex":"Girl","baselineLevel":"No prior exposure","consentCaptured":true,"learnerCode":"LM-001","caregiverRelationship":"Mother","enrollmentStatus":"Active","attendanceBand":"Stable attendance","supportPlan":"Short prompts and praise after every answer.","lastLessonSummary":"No lesson captured yet.","lastAttendance":"Checked in today"}],"modules":[],"assignedLessons":[],"assignmentPacks":[],"pendingSyncEvents":[],"recentRuntimeSessions":{"student-1":[{"id":"runtime-1","sessionId":"session-1","studentId":"student-1","learnerCode":"LM-001","lessonId":"lesson-1","lessonTitle":"Warm-up","moduleId":"english","moduleTitle":"English","status":"in_progress","completionState":"inProgress","automationStatus":"Resume ready","currentStepIndex":2,"stepsTotal":4,"responsesCaptured":1,"supportActionsUsed":0,"audioCaptures":0,"facilitatorObservations":0}]}}',
    });

    final state = LumoAppState(includeSeedDemoContent: false);
    await state.restorePersistedState();

    expect(state.learners.single.name, 'Amina Bello');
    expect(
      state.recentRuntimeSessionsForLearner(state.learners.single),
      hasLength(1),
    );
    expect(
      state
          .recentRuntimeSessionsForLearner(state.learners.single)
          .single
          .automationStatus,
      'Resume ready',
    );
  });

  test('bootstrap failure restores guaranteed offline lesson pack', () async {
    SharedPreferences.setMockInitialValues({});

    final state = LumoAppState(
      apiClient: _FailingApiClient(),
      bundledContentLoader: _FakeBundledContentLoader(
        BundledContentLibrary(
          modules: learningModules,
          lessons: assignedLessonsSeed,
        ),
      ),
      includeSeedDemoContent: false,
    );

    await state.bootstrap();

    expect(state.usingFallbackData, isTrue);
    expect(state.backendError, 'backend offline');
    expect(state.learners, isNotEmpty);
    expect(state.modules, isNotEmpty);
    expect(state.assignedLessons, isNotEmpty);
    expect(state.suggestedLearnerForHome, isNotNull);

    state.dispose();
  });

  test(
    'trusted offline snapshot age survives ordinary local persistence',
    () async {
      SharedPreferences.setMockInitialValues({});

      final originalSnapshotTime = DateTime.now().subtract(
        const Duration(days: 2),
      );
      final originalSyncTime = originalSnapshotTime.add(
        const Duration(minutes: 5),
      );

      final state = LumoAppState(includeSeedDemoContent: false)
        ..usingFallbackData = true
        ..snapshotTrustedFromLiveBootstrap = true
        ..backendContractVersion = 'contract-v1'
        ..snapshotContractVersion = 'contract-v1'
        ..snapshotSavedAt = originalSnapshotTime
        ..lastSyncedAt = originalSyncTime;
      state.snapshotSourceBaseUrl = state.backendBaseUrl;
      state.learners
        ..clear()
        ..addAll(learnerProfilesSeed);
      state.modules
        ..clear()
        ..addAll(learningModules);
      state.assignedLessons
        ..clear()
        ..addAll(assignedLessonsSeed);

      expect(
        state.offlineSnapshotTrustProblem,
        contains('beyond the 24-hour trust window'),
      );

      await state.flushPersistence();

      final restored = LumoAppState(includeSeedDemoContent: false);
      await restored.restorePersistedState();

      expect(
        restored.snapshotSavedAt?.toIso8601String(),
        originalSnapshotTime.toIso8601String(),
      );
      expect(
        restored.lastSyncedAt?.toIso8601String(),
        originalSyncTime.toIso8601String(),
      );
      expect(
        restored.offlineSnapshotTrustProblem,
        contains('beyond the 24-hour trust window'),
      );

      state.dispose();
      restored.dispose();
    },
  );

  testWidgets(
    'deployment blocker page stays hard-blocked until bootstrap recovers',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: false);
      addTearDown(state.dispose);
      state.learners.clear();
      state.modules.clear();
      state.assignedLessons.clear();
      state.deploymentBlockerReason = 'Bootstrap failed';
      state.usingFallbackData = true;

      await tester.pumpWidget(
        MaterialApp(
          home: LearnerDeploymentBlockerPage(
            state: state,
            onRetry: () async {},
          ),
        ),
      );

      expect(find.text('Retry production bootstrap'), findsOneWidget);
      expect(find.text('Open limited offline mode'), findsNothing);
      expect(find.text('Live backend target'), findsOneWidget);
      expect(
        find.textContaining('lumo-api-production-303a.up.railway.app'),
        findsOneWidget,
      );
      expect(
        find.textContaining('will not open demo learners just to look alive'),
        findsOneWidget,
      );
      expect(state.acknowledgedOfflineFallbackRisk, isFalse);
      expect(state.deploymentBlockerReason, 'Bootstrap failed');
      expect(state.learners, isEmpty);
      expect(state.modules, isEmpty);
      expect(state.assignedLessons, isEmpty);
    },
  );

  testWidgets('home screen stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    expect(tester.takeException(), isNull);
    expect(find.text('Hear Mallam again'), findsOneWidget);
    expect(find.text('Student list'), findsOneWidget);
    expect(find.byType(GridView), findsOneWidget);
    expect(find.byType(DetailCard), findsNothing);
    expect(find.text('English'), findsOneWidget);
    expect(find.text('Math'), findsOneWidget);
    expect(find.text('Life Skills'), findsOneWidget);
  });

  testWidgets('home screen explains when no learner-safe subjects are ready', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: false)
      ..isBootstrapping = false
      ..usingFallbackData = false;
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(state: state, onChanged: _noop),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(
      find.text('No live subjects are ready on this tablet yet.'),
      findsOneWidget,
    );
    expect(find.text('Refresh live sync'), findsOneWidget);
    expect(find.text('Open student list'), findsOneWidget);
    expect(find.byType(GridView), findsNothing);
  });

  testWidgets(
    'home screen keeps sync-pending placeholders out of the learner subject grid',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: false)
        ..isBootstrapping = false
        ..usingFallbackData = false;
      state.assignedLessons.add(
        const LessonCardModel(
          id: 'assignment-placeholder:assignment-42',
          moduleId: 'science-module',
          title: 'Count the seeds',
          subject: 'Live assignment',
          durationMinutes: 10,
          status: 'assigned',
          mascotName: 'Mallam',
          readinessFocus: 'Waiting for lesson sync',
          scenario:
              'Placeholder should not render as a learner-facing subject card.',
          steps: [
            LessonStep(
              id: 'assignment-placeholder-step',
              type: LessonStepType.intro,
              title: 'Lesson sync pending',
              instruction: 'Refresh the tablet sync before starting.',
              expectedResponse: 'Refresh the tablet sync before starting.',
              coachPrompt: 'Do not start runtime on a placeholder lesson.',
              facilitatorTip: 'Refresh sync before launch.',
              realWorldCheck:
                  'Learner waits until the real lesson content arrives.',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
      );
      addTearDown(state.dispose);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(
        find.text('No live subjects are ready on this tablet yet.'),
        findsOneWidget,
      );
      expect(find.text('Live assignment'), findsNothing);
      expect(find.byType(GridView), findsNothing);
    },
  );

  testWidgets(
    'home screen keeps all subject cards visible on short tablet heights',
    (tester) async {
      await pumpAppAtSize(tester, const Size(1280, 800));

      expect(tester.takeException(), isNull);
      expect(find.text('Hear Mallam again'), findsOneWidget);
      expect(find.byType(DetailCard), findsNothing);
      expect(find.text('English'), findsOneWidget);
      expect(find.text('Math'), findsOneWidget);
      expect(find.text('Life Skills'), findsOneWidget);
    },
  );

  testWidgets('home screen keeps the three subject cards on one tablet row', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(1280, 800));

    final subjectCards = find.byWidgetPredicate(
      (widget) => widget.runtimeType.toString() == '_SubjectCard',
    );

    expect(subjectCards, findsNWidgets(3));

    final firstCardTop = tester.getTopLeft(subjectCards.at(0)).dy;
    final secondCardTop = tester.getTopLeft(subjectCards.at(1)).dy;
    final thirdCardTop = tester.getTopLeft(subjectCards.at(2)).dy;

    expect((firstCardTop - secondCardTop).abs(), lessThan(1));
    expect((firstCardTop - thirdCardTop).abs(), lessThan(1));
  });

  testWidgets(
    'home layout density follows visible subject count instead of raw module count',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      state.modules.addAll(const [
        LearningModule(
          id: 'english-reading',
          title: 'English Reading',
          description: 'Backend alias module for English.',
          voicePrompt: 'Open English reading.',
          readinessGoal: 'Keep reading practice moving.',
          badge: 'Alias',
        ),
        LearningModule(
          id: 'english-speaking',
          title: 'English Speaking',
          description: 'Backend alias module for English.',
          voicePrompt: 'Open English speaking.',
          readinessGoal: 'Keep speaking practice moving.',
          badge: 'Alias',
        ),
      ]);
      final englishSeed = assignedLessonsSeed.firstWhere(
        (item) => item.moduleId == 'english',
      );
      state.assignedLessons.addAll([
        LessonCardModel(
          id: 'english-reading-alias-lesson',
          moduleId: 'english-reading',
          title: 'English reading alias',
          subject: 'English',
          durationMinutes: englishSeed.durationMinutes,
          status: englishSeed.status,
          mascotName: englishSeed.mascotName,
          readinessFocus: englishSeed.readinessFocus,
          scenario: 'Alias module should not force dense home layout.',
          steps: englishSeed.steps,
        ),
        LessonCardModel(
          id: 'english-speaking-alias-lesson',
          moduleId: 'english-speaking',
          title: 'English speaking alias',
          subject: 'English',
          durationMinutes: englishSeed.durationMinutes,
          status: englishSeed.status,
          mascotName: englishSeed.mascotName,
          readinessFocus: englishSeed.readinessFocus,
          scenario: 'Alias module should not force dense home layout.',
          steps: englishSeed.steps,
        ),
      ]);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final subjectCards = find.byWidgetPredicate(
        (widget) => widget.runtimeType.toString() == '_SubjectCard',
      );
      expect(subjectCards, findsNWidgets(3));

      final firstCardTop = tester.getTopLeft(subjectCards.at(0)).dy;
      final secondCardTop = tester.getTopLeft(subjectCards.at(1)).dy;
      final thirdCardTop = tester.getTopLeft(subjectCards.at(2)).dy;

      expect((firstCardTop - secondCardTop).abs(), lessThan(1));
      expect((firstCardTop - thirdCardTop).abs(), lessThan(1));

      state.dispose();
    },
  );

  testWidgets('home screen keeps the Mallam stage and subjects tightly stacked', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(1280, 800));

    final replayButtonBottom = tester
        .getBottomLeft(find.text('Hear Mallam again'))
        .dy;
    final firstSubjectTop = tester.getTopLeft(find.text('English')).dy;

    expect(
      replayButtonBottom,
      lessThan(firstSubjectTop),
      reason:
          'The replay control should still sit above the subject grid on the learner home screen.',
    );
    expect(
      firstSubjectTop - replayButtonBottom,
      lessThan(200),
      reason:
          'Short-height tablet home should stay compact instead of leaving a large dead gap between Mallam and the subject cards.',
    );
  });

  testWidgets(
    'home subject grid renders only the live subject set when live curriculum is active',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: false);
      state.usingFallbackData = false;
      state.modules
        ..clear()
        ..addAll(learningModules);
      state.assignedLessons
        ..clear()
        ..addAll(assignedLessonsSeed);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(
        find.byWidgetPredicate(
          (widget) => widget.runtimeType.toString() == '_SubjectCard',
        ),
        findsNWidgets(3),
      );
      expect(find.text('English'), findsOneWidget);
      expect(find.text('Math'), findsOneWidget);
      expect(find.text('Life Skills'), findsOneWidget);
      expect(find.text('Lumo Fundamentals'), findsNothing);

      state.dispose();
    },
  );

  testWidgets('home screen pulls subject cards upward on short layouts', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(1280, 800));

    final firstSubjectTop = tester.getTopLeft(find.text('English')).dy;

    expect(firstSubjectTop, lessThan(540));
  });

  testWidgets(
    'home subject grid becomes scrollable when live subject count exceeds one tablet view',
    (tester) async {
      tester.view.physicalSize = const Size(800, 520);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      state.modules.addAll(const [
        LearningModule(
          id: 'science',
          title: 'Science',
          description: 'Simple science lessons.',
          voicePrompt: 'Let us explore science.',
          readinessGoal: 'Observe and explain basic patterns.',
          badge: 'Observe',
        ),
        LearningModule(
          id: 'social-studies',
          title: 'Social Studies',
          description: 'Community and everyday life.',
          voicePrompt: 'Let us learn about our community.',
          readinessGoal: 'Talk about people and places.',
          badge: 'Community',
        ),
        LearningModule(
          id: 'creative-arts',
          title: 'Creative Arts',
          description: 'Art, rhythm, and expression.',
          voicePrompt: 'Let us make something together.',
          readinessGoal: 'Create and describe simple work.',
          badge: 'Create',
        ),
        LearningModule(
          id: 'science-2',
          title: 'Science Lab',
          description: 'More science lessons.',
          voicePrompt: 'Let us observe together.',
          readinessGoal: 'Notice and explain details.',
          badge: 'Lab',
        ),
        LearningModule(
          id: 'social-2',
          title: 'Community Life',
          description: 'Everyday life and places.',
          voicePrompt: 'Let us talk about places.',
          readinessGoal: 'Describe familiar routines.',
          badge: 'Places',
        ),
        LearningModule(
          id: 'arts-2',
          title: 'Creative Studio',
          description: 'More art and expression.',
          voicePrompt: 'Let us create together.',
          readinessGoal: 'Make and explain simple work.',
          badge: 'Studio',
        ),
      ]);
      final baseLesson = assignedLessonsSeed.firstWhere(
        (item) => item.moduleId == 'english',
      );
      state.assignedLessons.addAll([
        LessonCardModel(
          id: 'science-live-lesson',
          moduleId: 'science',
          title: 'Science warm-up',
          subject: 'Science',
          durationMinutes: baseLesson.durationMinutes,
          status: 'published',
          mascotName: baseLesson.mascotName,
          readinessFocus: 'Observe and explain basic patterns.',
          scenario: 'Extra live science subject for scroll coverage.',
          steps: baseLesson.steps,
        ),
        LessonCardModel(
          id: 'social-studies-live-lesson',
          moduleId: 'social-studies',
          title: 'Community helpers',
          subject: 'Social Studies',
          durationMinutes: baseLesson.durationMinutes,
          status: 'published',
          mascotName: baseLesson.mascotName,
          readinessFocus: 'Talk about people and places.',
          scenario: 'Extra live social studies subject for scroll coverage.',
          steps: baseLesson.steps,
        ),
        LessonCardModel(
          id: 'creative-arts-live-lesson',
          moduleId: 'creative-arts',
          title: 'Creative shapes',
          subject: 'Creative Arts',
          durationMinutes: baseLesson.durationMinutes,
          status: 'published',
          mascotName: baseLesson.mascotName,
          readinessFocus: 'Create and describe simple work.',
          scenario: 'Extra live creative arts subject for scroll coverage.',
          steps: baseLesson.steps,
        ),
        LessonCardModel(
          id: 'science-lab-live-lesson',
          moduleId: 'science-2',
          title: 'Science lab notes',
          subject: 'Science Lab',
          durationMinutes: baseLesson.durationMinutes,
          status: 'published',
          mascotName: baseLesson.mascotName,
          readinessFocus: 'Notice and explain details.',
          scenario: 'Extra live science lab subject for scroll coverage.',
          steps: baseLesson.steps,
        ),
        LessonCardModel(
          id: 'community-life-live-lesson',
          moduleId: 'social-2',
          title: 'Places we know',
          subject: 'Community Life',
          durationMinutes: baseLesson.durationMinutes,
          status: 'published',
          mascotName: baseLesson.mascotName,
          readinessFocus: 'Describe familiar routines.',
          scenario: 'Extra live community life subject for scroll coverage.',
          steps: baseLesson.steps,
        ),
        LessonCardModel(
          id: 'creative-studio-live-lesson',
          moduleId: 'arts-2',
          title: 'Studio practice',
          subject: 'Creative Studio',
          durationMinutes: baseLesson.durationMinutes,
          status: 'published',
          mascotName: baseLesson.mascotName,
          readinessFocus: 'Make and explain simple work.',
          scenario: 'Extra live creative studio subject for scroll coverage.',
          steps: baseLesson.steps,
        ),
      ]);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final subjectGrid = tester.widget<GridView>(find.byType(GridView).first);
      expect(subjectGrid.physics, isA<BouncingScrollPhysics>());

      final scrollable = tester.state<ScrollableState>(
        find.byType(Scrollable).first,
      );
      expect(scrollable.position.pixels, 0);

      await tester.drag(find.byType(GridView).first, const Offset(0, -300));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(scrollable.position.pixels, greaterThan(0));

      state.dispose();
    },
  );

  testWidgets('student list stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    await tester.tap(find.text('Student list'));
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('All learners'), findsOneWidget);
    expect(find.textContaining('learners'), findsWidgets);
  });

  testWidgets('student list stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Student list'));
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('All learners'), findsOneWidget);
    expect(find.text('Pick fast'), findsOneWidget);
    expect(find.textContaining('leads'), findsWidgets);
  });

  testWidgets('learner profile stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Student list'));
    await pumpForUi(tester);
    await tester.ensureVisible(find.text('Profile').first);
    await tester.tap(find.text('Profile').first);
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Back'), findsOneWidget);
    expect(find.textContaining('leaderboard'), findsWidgets);
  });

  testWidgets(
    'learner profile reads fresh XP from app state instead of a stale route snapshot',
    (tester) async {
      tester.view.physicalSize = const Size(900, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final staleLearner = state.learners.first.copyWith(
        rewards: const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 120,
          points: 120,
          level: 2,
          levelLabel: 'Rising Voice',
          nextLevel: 3,
          nextLevelLabel: 'Bright Reader',
          xpIntoLevel: 40,
          xpForNextLevel: 40,
          progressToNextLevel: 0.5,
          badgesUnlocked: 0,
        ),
      );
      state.learners[0] = staleLearner.copyWith(
        rewards: const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 160,
          points: 160,
          level: 3,
          levelLabel: 'Bright Reader',
          nextLevel: 4,
          nextLevelLabel: 'Story Scout',
          xpIntoLevel: 0,
          xpForNextLevel: 80,
          progressToNextLevel: 0,
          badgesUnlocked: 1,
        ),
      );
      state.currentLearner = state.learners.first;

      await tester.pumpWidget(
        MaterialApp(
          home: LearnerProfilePage(state: state, learner: staleLearner),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('160 XP'), findsWidgets);
      expect(find.textContaining('Bright Reader'), findsWidgets);

      state.dispose();
    },
  );

  testWidgets(
    'learner profile exposes quick lesson actions and honest lesson counts',
    (tester) async {
      tester.view.physicalSize = const Size(900, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final baseLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
      );
      state.currentLearner = learner;
      state.assignedLessons.addAll([
        LessonCardModel(
          id: 'english-profile-4',
          moduleId: module.id,
          title: 'Story sounds',
          subject: module.title,
          durationMinutes: 8,
          status: 'assigned',
          mascotName: 'Mallam',
          readinessFocus: 'Hear a new story sound.',
          scenario: 'Extra assigned lesson for profile overflow.',
          steps: baseLesson.steps,
        ),
        LessonCardModel(
          id: 'english-profile-5',
          moduleId: module.id,
          title: 'Word match',
          subject: module.title,
          durationMinutes: 8,
          status: 'assigned',
          mascotName: 'Mallam',
          readinessFocus: 'Match new words.',
          scenario: 'Another extra assigned lesson for profile overflow.',
          steps: baseLesson.steps,
        ),
      ]);

      await tester.pumpWidget(
        MaterialApp(
          navigatorObservers: [lumoRouteObserver],
          home: LearnerProfilePage(state: state, learner: learner),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('3 of 5 shown'), findsOneWidget);
      expect(find.text('Open lesson'), findsNWidgets(3));
      expect(
        find.text(
          '2 more assigned lessons still available after these quick picks.',
        ),
        findsOneWidget,
      );

      state.dispose();
    },
  );

  testWidgets(
    'learner profile can launch a lesson directly from the assigned lesson list',
    (tester) async {
      tester.view.physicalSize = const Size(900, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      state.currentLearner = learner;

      await tester.pumpWidget(
        MaterialApp(
          navigatorObservers: [lumoRouteObserver],
          home: LearnerProfilePage(state: state, learner: learner),
        ),
      );
      await pumpForUi(tester);

      await tester.dragUntilVisible(
        find.text('Open lesson').last,
        find.byType(Scrollable).first,
        const Offset(0, -250),
      );
      await tester.tap(find.text('Open lesson').last);
      await pumpForUi(tester);

      expect(find.byType(LessonLaunchSetupPage), findsOneWidget);
      expect(find.text('Select available learner'), findsOneWidget);
      expect(
        find.textContaining('${learner.name} is selected for'),
        findsNothing,
      );
      expect(find.text('Select learner to continue'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'learner profile keeps sync-pending assigned lessons blocked until refresh',
    (tester) async {
      tester.view.physicalSize = const Size(900, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final module = state.modules.firstWhere((item) => item.id == 'english');
      state.currentLearner = learner;
      state.assignedLessons
        ..clear()
        ..add(
          LessonCardModel(
            id: 'assignment-placeholder:profile-blocked',
            moduleId: module.id,
            title: 'Backend lesson still syncing',
            subject: 'Live assignment',
            durationMinutes: 10,
            status: 'assigned',
            mascotName: 'Mallam',
            readinessFocus: 'Assignment payload reached the tablet first.',
            scenario: 'Real lesson payload has not synced yet.',
            steps: const [
              LessonStep(
                id: 'assignment-placeholder-step',
                type: LessonStepType.intro,
                title: 'Lesson sync pending',
                instruction: 'Refresh sync before starting this assignment.',
                expectedResponse: 'Refresh sync first.',
                coachPrompt: 'Do not start runtime on a placeholder lesson.',
                facilitatorTip: 'Refresh assignments first.',
                realWorldCheck: 'Only start once the real lesson appears.',
                speakerMode: SpeakerMode.guiding,
              ),
            ],
          ),
        );

      await tester.pumpWidget(
        MaterialApp(
          navigatorObservers: [lumoRouteObserver],
          home: LearnerProfilePage(state: state, learner: learner),
        ),
      );
      await pumpForUi(tester);

      final refreshButton = find.widgetWithText(
        FilledButton,
        'Refresh sync before starting',
      );
      expect(refreshButton, findsOneWidget);
      expect(tester.widget<FilledButton>(refreshButton).onPressed, isNull);

      await tester.tap(refreshButton, warnIfMissed: false);
      await pumpForUi(tester);

      expect(find.byType(LessonLaunchSetupPage), findsNothing);
      expect(find.text('Select available learner'), findsNothing);

      state.dispose();
    },
  );

  testWidgets(
    'learner profile refreshes while an async reward reconciliation lands',
    (tester) async {
      tester.view.physicalSize = const Size(900, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final rewardsCompleter = Completer<RewardSnapshot>();
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: _RewardsRefreshApiClient(rewardsCompleter),
      )..usingFallbackData = false;
      final staleLearner = state.learners.first.copyWith(
        rewards: const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 120,
          points: 120,
          level: 2,
          levelLabel: 'Rising Voice',
          nextLevel: 3,
          nextLevelLabel: 'Bright Reader',
          xpIntoLevel: 40,
          xpForNextLevel: 40,
          progressToNextLevel: 0.5,
          badgesUnlocked: 0,
        ),
      );
      state.learners[0] = staleLearner;
      state.currentLearner = staleLearner;

      await tester.pumpWidget(
        MaterialApp(
          home: LearnerProfilePage(state: state, learner: staleLearner),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('120 XP'), findsWidgets);
      expect(find.textContaining('Rising Voice'), findsWidgets);

      unawaited(state.refreshLearnerRewards(staleLearner));
      await tester.pump();

      rewardsCompleter.complete(
        const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 160,
          points: 160,
          level: 3,
          levelLabel: 'Bright Reader',
          nextLevel: 4,
          nextLevelLabel: 'Story Scout',
          xpIntoLevel: 0,
          xpForNextLevel: 80,
          progressToNextLevel: 0,
          badgesUnlocked: 1,
        ),
      );
      await pumpForUi(tester);

      expect(find.text('160 XP'), findsWidgets);
      expect(find.textContaining('Bright Reader'), findsWidgets);

      state.dispose();
    },
  );

  testWidgets(
    'registration page blocks local-only learner saves while backend is offline',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true)
        ..usingFallbackData = true
        ..backendError = 'Backend registration is offline.'
        ..registrationDraft = const RegistrationDraft(
          name: 'Amina Bello',
          age: '9',
          cohort: 'Fallback cohort',
          guardianName: 'Hauwa Bello',
          village: 'Kawo',
          consentCaptured: true,
        );

      await tester.pumpWidget(
        MaterialApp(
          home: RegisterPage(state: state, onChanged: () {}),
        ),
      );
      await pumpForUi(tester);

      expect(
        find.text('Registration blocked until live backend recovers'),
        findsOneWidget,
      );
      expect(find.text('Backend required to save learner'), findsOneWidget);
      final saveButtonFinder = find.widgetWithText(
        FilledButton,
        'Backend required to save learner',
      );
      expect(saveButtonFinder, findsOneWidget);
      final button = tester.widget<FilledButton>(saveButtonFinder);
      expect(button.onPressed, isNull);

      state.dispose();
    },
  );

  testWidgets(
    'registration picks up backend routing defaults that arrive after the page opens',
    (tester) async {
      tester.view.physicalSize = const Size(900, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true)
        ..registrationDraft = const RegistrationDraft(
          name: 'Amina Bello',
          age: '9',
          guardianName: 'Hauwa Bello',
          village: 'Kawo',
          consentCaptured: true,
        )
        ..registrationContext = const RegistrationContext();

      await tester.pumpWidget(
        MaterialApp(
          home: RegisterPage(state: state, onChanged: () {}),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('Backend cohort'), findsNothing);

      const cohort = BackendCohort(
        id: 'cohort-a',
        name: 'Cohort A',
        podId: 'pod-a',
      );
      const mallam = BackendMallam(
        id: 'mallam-1',
        name: 'Mallam Musa',
        podIds: ['pod-a'],
      );
      state.registrationContext = const RegistrationContext(
        cohorts: [cohort],
        mallams: [mallam],
        defaultTarget: RegistrationTarget(cohort: cohort, mallam: mallam),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RegisterPage(state: state, onChanged: () {}),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('Backend cohort'), findsOneWidget);
      expect(find.text('Cohort A'), findsWidgets);
      expect(state.registrationDraft.cohort, 'Cohort A');
      expect(state.registrationDraft.mallamId, 'mallam-1');

      state.dispose();
    },
  );

  testWidgets('registration flow stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    await tester.tap(find.text('Register'));
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Register learner'), findsOneWidget);
    expect(find.text('Save learner'), findsOneWidget);
    expect(find.text('Identity'), findsOneWidget);
    expect(find.text('Consent'), findsOneWidget);
  });

  testWidgets('registration flow stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Register'));
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Register learner'), findsOneWidget);
    expect(find.text('Save learner'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsWidgets);
  });

  testWidgets(
    'registration success page stays usable on narrow tablet widths',
    (tester) async {
      tester.view.physicalSize = const Size(540, 960);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;

      await tester.pumpWidget(
        MaterialApp(
          home: RegistrationSuccessPage(
            state: state,
            learner: learner,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Back home'), findsOneWidget);
      expect(find.text('Start assigned lesson'), findsOneWidget);
    },
  );

  testWidgets('lesson complete page stays usable on narrow tablet widths', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(540, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonCompletePage(state: state, lesson: lesson),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Go home'), findsOneWidget);
    expect(find.text('Go to next learner'), findsOneWidget);
    expect(find.textContaining('lesson'), findsWidgets);

    state.dispose();
  });


  testWidgets('subject modules page stays usable on narrow tablet widths', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(540, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);

    await tester.pumpWidget(
      MaterialApp(
        home: SubjectModulesPage(
          state: state,
          onChanged: () {},
          module: state.modules.first,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(tester.takeException(), isNull);
    expect(find.text('Available lessons'), findsOneWidget);
    expect(
      find.textContaining('choose which available learner'),
      findsOneWidget,
    );

    final mallamGuideTopLeft = tester.getTopLeft(
      find.text('Hear Mallam again'),
    );
    final lessonChooserTopLeft = tester.getTopLeft(
      find.text('Available lessons'),
    );
    expect(
      mallamGuideTopLeft.dy,
      lessThan(lessonChooserTopLeft.dy),
      reason:
          'On stacked portrait layouts, the Mallam guidance pane should stay above the lesson chooser instead of being reversed below it.',
    );

    state.dispose();
  });

  testWidgets(
    'home replay prompt becomes learner-aware when a learner is in focus',
    (tester) async {
      tester.view.physicalSize = const Size(1600, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      state.selectLearner(learner);

      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(state: state, onChanged: _noop),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      String? replayedPrompt;
      state.voiceReplay = (text, mode) async {
        replayedPrompt = text;
      };

      await tester.tap(find.text('Hear Mallam again'));
      await pumpForUi(tester);

      final firstName = learner.name.split(' ').first;
      expect(replayedPrompt, isNotNull);
      expect(replayedPrompt, contains('Assalamu alaikum. Good'));
      expect(replayedPrompt, contains(firstName));
      expect(replayedPrompt, contains(learner.supportPlan));
      expect(replayedPrompt, isNot(contains('You are on the home page.')));

      state.dispose();
    },
  );

  testWidgets('lesson launch setup requires an explicit learner pick', (
    tester,
  ) async {
    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final module = state.modules.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonLaunchSetupPage(
          state: state,
          onChanged: () {},
          lesson: lesson,
          module: module,
        ),
      ),
    );
    await pumpForUi(tester);

    expect(
      find.textContaining('${learner.name} is selected for ${lesson.title}'),
      findsNothing,
    );
    expect(find.text('Start with ${learner.name}'), findsNothing);
    expect(find.text('Select learner to continue'), findsOneWidget);

    state.dispose();
  });

  testWidgets(
    'lesson launch setup only renders learners who can actually open the lesson',
    (tester) async {
      final state = LumoAppState(includeSeedDemoContent: true);
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
      );
      final baseLearners = List<LearnerProfile>.of(state.learners);
      state.learners
        ..clear()
        ..addAll([
          baseLearners[0].copyWith(
            id: 'student-pod-a',
            name: 'Amina Pod A',
            podId: 'pod-a',
            podLabel: 'Pod A',
            cohort: 'Pod A Cohort',
          ),
          baseLearners[1].copyWith(
            id: 'student-pod-b',
            name: 'Bashir Pod B',
            podId: 'pod-b',
            podLabel: 'Pod B',
            cohort: 'Pod B Cohort',
          ),
        ]);
      state.registrationContext = const RegistrationContext(
        tabletRegistration: TabletRegistration(
          id: 'tablet-registration-pod-a',
          deviceIdentifier: 'tablet-pod-a',
          podId: 'pod-a',
          podLabel: 'Pod A',
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
          ),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('Amina Pod A'), findsWidgets);
      expect(find.text('Bashir Pod B'), findsNothing);
      expect(find.text('Select learner to continue'), findsOneWidget);
      expect(find.text('Start with Amina Pod A'), findsNothing);
      expect(find.text('Start with Bashir Pod B'), findsNothing);

      state.dispose();
    },
  );

  testWidgets(
    'subject modules page shows all learner-facing lessons for the selected module',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final seedLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
      );
      state.selectLearner(learner);
      state.assignedLessons.add(
        LessonCardModel(
          id: 'english-extension-lesson',
          moduleId: 'english-reading',
          title: 'English extension',
          subject: module.title,
          durationMinutes: seedLesson.durationMinutes,
          status: seedLesson.status,
          mascotName: seedLesson.mascotName,
          readinessFocus: 'Keep building ${module.title}',
          scenario: 'Alternate backend module key for the same subject.',
          steps: seedLesson.steps,
        ),
      );

      expect(
        state
            .lessonsForLearnerAndModule(learner, module.id)
            .map((lesson) => lesson.id),
        containsAll([seedLesson.id, 'english-extension-lesson']),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: SubjectModulesPage(
            state: state,
            onChanged: () {},
            module: module,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text(seedLesson.title), findsOneWidget);

      await tester.dragUntilVisible(
        find.text('English extension'),
        find.byType(ListView),
        const Offset(0, -200),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('English extension'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'subject modules page still shows lessons when backend module keys drift before learner selection',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final seedLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
      );
      state.assignedLessons.add(
        LessonCardModel(
          id: 'english-home-alias-lesson',
          moduleId: 'english-reading',
          title: 'English alias lesson',
          subject: module.title,
          durationMinutes: seedLesson.durationMinutes,
          status: seedLesson.status,
          mascotName: seedLesson.mascotName,
          readinessFocus: 'Keep building ${module.title}',
          scenario:
              'Home route should still show this lesson before a learner is chosen.',
          steps: seedLesson.steps,
        ),
      );

      expect(
        state
            .lessonsForLearnerAndModule(null, module.id)
            .map((lesson) => lesson.id),
        containsAll([seedLesson.id, 'english-home-alias-lesson']),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: SubjectModulesPage(
            state: state,
            onChanged: () {},
            module: module,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text(seedLesson.title), findsOneWidget);

      await tester.dragUntilVisible(
        find.text('English alias lesson'),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('English alias lesson'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'subject modules page shows all learner-facing lessons for the selected module',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final seedLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
      );
      state.selectLearner(learner);
      state.assignedLessons.add(
        LessonCardModel(
          id: 'english-extension-lesson',
          moduleId: 'english-reading',
          title: 'English extension',
          subject: module.title,
          durationMinutes: seedLesson.durationMinutes,
          status: seedLesson.status,
          mascotName: seedLesson.mascotName,
          readinessFocus: 'Keep building ${module.title}',
          scenario: 'Alternate backend module key for the same subject.',
          steps: seedLesson.steps,
        ),
      );

      expect(
        state
            .lessonsForLearnerAndModule(learner, module.id)
            .map((lesson) => lesson.id),
        containsAll([seedLesson.id, 'english-extension-lesson']),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: SubjectModulesPage(
            state: state,
            onChanged: () {},
            module: module,
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text(seedLesson.title), findsOneWidget);
      expect(
        find.textContaining('Current learner: ${learner.name}'),
        findsNothing,
      );

      await tester.dragUntilVisible(
        find.text('English extension'),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('English extension'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'lesson launch shows completed learners as unavailable and exposes absent CTA',
    (tester) async {
      final state = LumoAppState(includeSeedDemoContent: true);
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
      );
      final completedLearner = state.learners.first;
      final availableLearner = state.learners.firstWhere(
        (item) => item.id != completedLearner.id,
      );

      state.selectLearner(completedLearner);
      state.selectModule(module);
      state.startLesson(lesson);
      await state.completeLesson(lesson);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
          ),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('Completed today'), findsWidgets);
      expect(find.text('Absent: ${completedLearner.name}'), findsNothing);

      await tester.tap(find.text(availableLearner.name).first);
      await pumpForUi(tester);

      expect(find.text('Absent: ${availableLearner.name}'), findsOneWidget);
      expect(find.text('Start with ${availableLearner.name}'), findsOneWidget);
      expect(find.byIcon(Icons.auto_awesome_rounded), findsWidgets);
      expect(find.byIcon(Icons.pets_rounded), findsWidgets);

      state.dispose();
    },
  );

  testWidgets('lesson launch setup stays usable on narrow tablet widths', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(540, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final module = state.modules.first;
    final lesson = state.assignedLessons.first;

    await tester.pumpWidget(
      MaterialApp(
        home: LessonLaunchSetupPage(
          state: state,
          onChanged: () {},
          lesson: lesson,
          module: module,
        ),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Select available learner'), findsOneWidget);
    expect(find.text('Select learner to continue'), findsOneWidget);
    expect(find.textContaining('is selected for'), findsNothing);
    expect(find.byType(SingleChildScrollView), findsWidgets);

    state.dispose();
  });

  testWidgets(
    'sync-pending placeholder lessons can refresh into a real launch flow',
    (tester) async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: _PlaceholderRecoveryApiClient(),
      )..usingFallbackData = false;
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final lesson = LessonCardModel(
        id: 'assignment-placeholder:assignment-42',
        moduleId: module.id,
        title: assignedLessonsSeed
            .firstWhere((item) => item.moduleId == module.id)
            .title,
        subject: 'Live assignment',
        durationMinutes: 10,
        status: 'assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Assignment payload reached the tablet first.',
        scenario: 'Real lesson payload has not synced yet.',
        steps: const [
          LessonStep(
            id: 'assignment-placeholder-step',
            type: LessonStepType.intro,
            title: 'Lesson sync pending',
            instruction: 'Refresh sync before starting this assignment.',
            expectedResponse: 'Refresh sync first.',
            coachPrompt: 'Do not start runtime on a placeholder lesson.',
            facilitatorTip: 'Refresh assignments first.',
            realWorldCheck: 'Only start once the real lesson appears.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
          ),
        ),
      );
      await pumpForUi(tester);

      expect(
        find.textContaining('Lesson content not available yet'),
        findsWidgets,
      );
      final refreshButton = find.widgetWithText(
        FilledButton,
        'Refresh sync before starting',
      );
      expect(refreshButton, findsOneWidget);
      expect(tester.widget<FilledButton>(refreshButton).onPressed, isNotNull);

      await tester.ensureVisible(refreshButton);
      await tester.tap(refreshButton);
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Select available learner'), findsOneWidget);
      expect(find.text('Select learner to continue'), findsOneWidget);
      expect(find.textContaining('is selected for'), findsNothing);

      state.dispose();
    },
  );

  testWidgets(
    'sync-pending placeholder refresh refuses to swap into the wrong lesson when a module has multiple lessons',
    (tester) async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: _AmbiguousPlaceholderRecoveryApiClient(),
      )..usingFallbackData = false;
      final module = state.modules.firstWhere((item) => item.id == 'english');
      final lesson = LessonCardModel(
        id: 'assignment-placeholder:assignment-99',
        moduleId: module.id,
        title: 'Backend lesson still syncing',
        subject: 'Live assignment',
        durationMinutes: 10,
        status: 'assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Assignment payload reached the tablet first.',
        scenario: 'Real lesson payload has not synced yet.',
        steps: const [
          LessonStep(
            id: 'assignment-placeholder-step',
            type: LessonStepType.intro,
            title: 'Lesson sync pending',
            instruction: 'Refresh sync before starting this assignment.',
            expectedResponse: 'Refresh sync first.',
            coachPrompt: 'Do not start runtime on a placeholder lesson.',
            facilitatorTip: 'Refresh assignments first.',
            realWorldCheck: 'Only start once the real lesson appears.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
          ),
        ),
      );
      await pumpForUi(tester);

      final refreshButton = find.widgetWithText(
        FilledButton,
        'Refresh sync before starting',
      );
      await tester.ensureVisible(refreshButton);
      await tester.tap(refreshButton);
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Refresh sync before starting'), findsOneWidget);
      expect(find.text('Select available learner'), findsOneWidget);
      expect(find.text('Select learner to continue'), findsOneWidget);
      expect(
        find.textContaining('is selected for Backend lesson still syncing.'),
        findsNothing,
      );

      state.dispose();
    },
  );

  testWidgets('lesson session stays usable on narrow tablet widths', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(540, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonSessionPage(state: state, lesson: lesson, onChanged: () {}),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(
      find.textContaining('Start listening, capture the learner voice'),
      findsOneWidget,
    );
    expect(
      find.text('Start listening + transcript').evaluate().isNotEmpty ||
          find.text('Start listening (audio first)').evaluate().isNotEmpty,
      isTrue,
    );
    expect(find.byType(SingleChildScrollView), findsWidgets);

    final mallamGuideTopLeft = tester.getTopLeft(
      find.text('Hear Mallam again').first,
    );
    final answerPanelTopLeft = tester.getTopLeft(
      find.textContaining('Start listening, capture the learner voice'),
    );
    expect(
      mallamGuideTopLeft.dy,
      lessThan(answerPanelTopLeft.dy),
      reason:
          'The live Mallam guide must remain above facilitator controls on stacked lesson-session layouts.',
    );

    state.dispose();
  });

  testWidgets(
    'lesson launch and subject module headers do not overflow on phone-width layouts',
    (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final baseModule = state.modules.first;
      final baseLesson = state.assignedLessons.first;
      final module = LearningModule(
        id: baseModule.id,
        title: baseModule.title,
        description: baseModule.description,
        voicePrompt: baseModule.voicePrompt,
        readinessGoal: baseModule.readinessGoal,
        badge: 'Very long backend badge for narrow mobile layouts',
      );
      final lesson = LessonCardModel(
        id: baseLesson.id,
        moduleId: baseLesson.moduleId,
        title: baseLesson.title,
        subject: 'Very long subject label for narrow mobile layouts',
        durationMinutes: baseLesson.durationMinutes,
        status: baseLesson.status,
        mascotName: baseLesson.mascotName,
        readinessFocus: baseLesson.readinessFocus,
        scenario: baseLesson.scenario,
        steps: baseLesson.steps,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: SubjectModulesPage(
            state: state,
            onChanged: () {},
            module: module,
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
          ),
        ),
      );
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Select available learner'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'lesson launch shows refresh recovery instead of blocked registration when roster is offline',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state =
          LumoAppState(
              apiClient: _SeedApiClient(),
              includeSeedDemoContent: false,
            )
            ..usingFallbackData = true
            ..backendError = 'Backend registration is offline.';
      final module = learningModules.first;
      final lesson = assignedLessonsSeed.firstWhere(
        (item) => item.moduleId == module.id,
        orElse: () => assignedLessonsSeed.first,
      );
      addTearDown(state.dispose);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
          ),
        ),
      );
      await pumpForUi(tester);

      expect(
        find.text('No learners available for this lesson yet'),
        findsOneWidget,
      );
      expect(find.text('Refresh live sync'), findsOneWidget);
      expect(find.text('Open student list'), findsOneWidget);
      expect(find.text('Register first learner'), findsNothing);
      expect(
        find.textContaining('registration is currently blocked'),
        findsOneWidget,
      );

      await tester.tap(find.text('Open student list'));
      await pumpForUi(tester);

      expect(find.text('All learners'), findsOneWidget);
    },
  );

  testWidgets(
    'resume launch setup locks the original learner from backend session',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final module = state.modules.first;
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == module.id,
        orElse: () => state.assignedLessons.first,
      );
      final learner = state.learners.first;
      final otherLearner = state.learners.firstWhere(
        (item) => item.id != learner.id,
      );
      final runtimeSession = BackendLessonSession(
        id: 'runtime-learner-lock',
        sessionId: 'session-lock',
        studentId: learner.id,
        learnerCode: learner.learnerCode,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleId: lesson.moduleId,
        moduleTitle: module.title,
        status: 'in_progress',
        completionState: 'inProgress',
        automationStatus: 'Resume the learner session.',
        currentStepIndex: 1,
        stepsTotal: lesson.steps.length,
        responsesCaptured: 2,
        supportActionsUsed: 0,
        audioCaptures: 0,
        facilitatorObservations: 0,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonLaunchSetupPage(
            state: state,
            onChanged: () {},
            lesson: lesson,
            module: module,
            resumeFrom: runtimeSession,
          ),
        ),
      );
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Resume learner'), findsOneWidget);
      expect(
        find.textContaining(
          '${learner.name} is locked for this resume session.',
        ),
        findsOneWidget,
      );
      expect(find.text('Resume with ${learner.name}'), findsOneWidget);

      await tester.tap(find.text(otherLearner.name).first);
      await pumpForUi(tester);

      expect(find.text('Resume with ${learner.name}'), findsOneWidget);
      expect(find.text('Start with ${otherLearner.name}'), findsNothing);

      state.dispose();
    },
  );

  testWidgets(
    'lesson session exposes saved voice playback controls during audio-only review',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.attachLearnerAudioCapture(
        path: 'https://example.com/audio/fallback-review.m4a',
        duration: const Duration(seconds: 4),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Play saved voice'), findsWidgets);
      expect(find.text('0:04 clip saved for review'), findsOneWidget);
      expect(
        find
                .text(
                  'Use the saved clip as the source of truth before Mallam continues.',
                )
                .evaluate()
                .isNotEmpty ||
            find
                .text('Quick audio check first, then confirm the text.')
                .evaluate()
                .isNotEmpty,
        isTrue,
      );
      expect(find.text('Hear Mallam again'), findsWidgets);
      expect(
        find.text('Save note + resume hands-free').evaluate().isNotEmpty ||
            find.text('Confirm transcript').evaluate().isNotEmpty,
        isTrue,
      );

      state.dispose();
    },
  );

  testWidgets(
    'lesson session rebinds transcript box from learner transcript turns when latest response is missing',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.activeSession = state.activeSession!.copyWith(
        latestLearnerResponse: null,
        clearLatestLearnerResponse: true,
        latestLearnerAudioPath: 'https://example.com/audio/captured.m4a',
        latestLearnerAudioDuration: const Duration(seconds: 3),
        transcript: [
          ...state.activeSession!.transcript,
          SessionTurn(
            speaker: learner.name,
            text: 'My name is ${learner.name.split(' ').first}',
            review: ResponseReview.pending,
            timestamp: DateTime.now(),
          ),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(
        find.text('My name is ${learner.name.split(' ').first}'),
        findsWidgets,
      );
      expect(
        find.text(
          'No transcript was captured. Listen to the saved voice note, then type the learner response here if needed.',
        ),
        findsNothing,
      );

      state.dispose();
    },
  );

  testWidgets(
    'lesson session marks draft transcripts as audio-verified review',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.attachLearnerAudioCapture(
        path: 'https://example.com/audio/fallback-draft.m4a',
        duration: const Duration(seconds: 5),
      );
      state.submitLearnerResponse('I can hear a draft transcript here');

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Play saved voice'), findsWidgets);
      expect(find.text('0:05 clip saved for review'), findsOneWidget);
      expect(find.textContaining('fallback-draft.m4a'), findsNothing);
      expect(
        find.text('Quick audio check first, then confirm the text.'),
        findsOneWidget,
      );
      expect(find.text('Confirm transcript'), findsOneWidget);
      expect(find.text('Hear Mallam again'), findsWidgets);

      state.dispose();
    },
  );

  testWidgets('spoken cue hides raw remote audio urls from learner view', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    const lesson = LessonCardModel(
      id: 'audio-cue-hidden',
      moduleId: 'english',
      title: 'Audio cue privacy',
      subject: 'English',
      durationMinutes: 5,
      status: 'Assigned',
      mascotName: 'Mallam',
      readinessFocus: 'Hide backend asset urls from learners.',
      scenario: 'Learners should see a clean cue card, not a storage url.',
      steps: [
        LessonStep(
          id: 'audio-cue-step',
          type: LessonStepType.practice,
          title: 'Listen and repeat',
          instruction: 'Listen and repeat the greeting.',
          expectedResponse: 'Good morning',
          coachPrompt: 'Say: Good morning.',
          facilitatorTip: 'The cue should stay learner-friendly.',
          realWorldCheck: 'No raw storage link shows on screen.',
          speakerMode: SpeakerMode.guiding,
          activity: LessonActivity(
            type: LessonActivityType.listenRepeat,
            prompt: 'Listen and repeat.',
            mediaItems: [
              LessonActivityMedia(
                kind: 'audio',
                values: ['https://cdn.example.com/cues/good-morning.mp3'],
              ),
            ],
          ),
        ),
      ],
    );
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonSessionPage(state: state, lesson: lesson, onChanged: () {}),
      ),
    );
    await pumpForUi(tester);

    expect(find.text('Audio cue ready'), findsOneWidget);
    expect(find.textContaining('cdn.example.com'), findsNothing);
    expect(find.textContaining('good-morning.mp3'), findsNothing);

    state.dispose();
  });

  testWidgets(
    'spoken step keeps continue locked when only saved audio exists without a confirmed answer',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.attachLearnerAudioCapture(
        path: 'https://example.com/audio/just-recorded.m4a',
        duration: const Duration(seconds: 2),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('0:02 clip saved for review'), findsOneWidget);
      expect(find.textContaining('just-recorded.m4a'), findsNothing);
      expect(
        find.text(
          'Use the saved clip as the source of truth before Mallam continues.',
        ),
        findsOneWidget,
      );
      expect(find.widgetWithText(FilledButton, 'Continue'), findsNothing);
      expect(
        find.text('Save note + resume hands-free').evaluate().isNotEmpty ||
            find.text('Save note and continue').evaluate().isNotEmpty,
        isTrue,
      );

      state.dispose();
    },
  );

  testWidgets(
    'lesson session keeps voice capture flow explicit for spoken steps',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('Start listening'), findsOneWidget);
      expect(find.text('Stop listening'), findsOneWidget);
      expect(find.text('Learner transcript'), findsOneWidget);
      expect(find.text('Learner response'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'choice lesson does not advance when the selected option is wrong',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const lesson = LessonCardModel(
        id: 'tap-choice-runtime-guardrail',
        moduleId: 'english',
        title: 'Tap choice guardrail',
        subject: 'English',
        durationMinutes: 5,
        status: 'Assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Wrong taps must stay on the same step.',
        scenario: 'UI must not advance when the learner picks the wrong card.',
        steps: [
          LessonStep(
            id: 'choice-step-1',
            type: LessonStepType.practice,
            title: 'Tap Kado',
            instruction: 'Tap Kado.',
            expectedResponse: 'Barku',
            coachPrompt: 'Tap Kado.',
            facilitatorTip: 'Only Kado is correct.',
            realWorldCheck: 'Wrong taps keep the same step open.',
            speakerMode: SpeakerMode.listening,
            activity: LessonActivity(
              type: LessonActivityType.tapChoice,
              prompt: 'Tap Kado.',
              targetResponse: 'Barku',
              choiceItems: [
                LessonActivityChoice(
                  id: 'choice-1',
                  label: 'Barku',
                  isCorrect: false,
                ),
                LessonActivityChoice(
                  id: 'choice-2',
                  label: 'Kado',
                  isCorrect: true,
                ),
              ],
            ),
          ),
          LessonStep(
            id: 'choice-step-2',
            type: LessonStepType.practice,
            title: 'Second step',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Only reachable after the right tap.',
            realWorldCheck: 'Second step stays hidden after wrong taps.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: true);
      state.assignedLessons.add(lesson);
      final learner = state.learners.first;
      state.selectLearner(learner);
      state.selectModule(
        state.modules.firstWhere((module) => module.id == lesson.moduleId),
      );
      state.startLesson(lesson);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      await tester.tap(
        find.ancestor(
          of: find.text('Barku').first,
          matching: find.byType(InkWell),
        ),
      );
      await pumpForUi(tester, const Duration(milliseconds: 300));

      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await pumpForUi(tester);

      expect(state.activeSession?.stepIndex, 0);
      expect(state.activeSession?.currentStep.id, 'choice-step-1');
      expect(state.activeSession?.latestReview, ResponseReview.needsSupport);
      expect(find.text('Second step'), findsNothing);
      expect(find.text('Continue'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'image choice lesson waits for a selection before next step unlocks',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.advanceLessonStep();

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('Selected object'), findsNothing);
      expect(find.text('Choose the matching object'), findsNothing);
      expect(find.text('No object selected yet'), findsNothing);
      expect(find.text('Pick the ant'), findsNothing);
      expect(find.byKey(const ValueKey('choice-grid')), findsOneWidget);
      expect(find.byKey(const ValueKey('choice-cta-row')), findsOneWidget);
      expect(find.text('Choose one object to continue'), findsOneWidget);

      final continueButton = find.widgetWithText(FilledButton, 'Continue');
      expect(continueButton, findsOneWidget);
      expect(tester.widget<FilledButton>(continueButton).onPressed, isNull);
      expect(find.widgetWithText(OutlinedButton, 'Back'), findsOneWidget);

      final antChoice = find.ancestor(
        of: find.text('ant').first,
        matching: find.byType(InkWell),
      );
      await tester.ensureVisible(antChoice);
      await tester.tap(antChoice);
      await pumpForUi(tester, const Duration(milliseconds: 400));

      expect(find.text('ant'), findsWidgets);
      expect(find.text('Selected'), findsOneWidget);
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('choice-cta-row'))).dy,
        greaterThan(
          tester.getBottomLeft(find.byKey(const ValueKey('choice-grid'))).dy,
        ),
      );
      expect(tester.widget<FilledButton>(continueButton).onPressed, isNotNull);

      state.dispose();
    },
  );

  testWidgets(
    'image choice lessons render all object cards as selectable choices',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const lesson = LessonCardModel(
        id: 'image-choice-grid',
        moduleId: 'english',
        title: 'Grid check',
        subject: 'English',
        durationMinutes: 5,
        status: 'Assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Check image choice layout.',
        scenario: 'Choice cards should render as a clean tablet row.',
        steps: [
          LessonStep(
            id: 'grid-step-1',
            type: LessonStepType.practice,
            title: 'Pick the ant',
            instruction: 'Tap the matching object card.',
            expectedResponse: 'zorb',
            coachPrompt: 'Tap the zorb card.',
            facilitatorTip: 'Watch whether the learner can see all choices.',
            realWorldCheck: 'All three cards stay visible and tappable.',
            speakerMode: SpeakerMode.listening,
            activity: LessonActivity(
              type: LessonActivityType.imageChoice,
              prompt: 'Tap the matching object.',
              supportText: 'All three cards should stay in one row.',
              targetResponse: 'zorb',
              choices: ['zorb', 'plin', 'mave'],
              choiceEmoji: ['🟣', '🟢', '🟠'],
            ),
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: true);
      state.assignedLessons.add(lesson);
      final learner = state.learners.first;
      state.selectLearner(learner);
      state.selectModule(
        state.modules.firstWhere((module) => module.id == lesson.moduleId),
      );
      state.startLesson(lesson);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      final zorbCard = find.ancestor(
        of: find.text('zorb'),
        matching: find.byType(InkWell),
      );
      final plinCard = find.ancestor(
        of: find.text('plin'),
        matching: find.byType(InkWell),
      );
      final maveCard = find.ancestor(
        of: find.text('mave'),
        matching: find.byType(InkWell),
      );

      expect(zorbCard, findsOneWidget);
      expect(plinCard, findsOneWidget);
      expect(maveCard, findsOneWidget);

      await tester.tap(zorbCard);
      await pumpForUi(tester, const Duration(milliseconds: 400));

      expect(find.text('Selected'), findsOneWidget);

      state.dispose();
    },
  );

  testWidgets(
    'choice lessons keep six options in two rows of three with CTA below',
    (tester) async {
      tester.view.physicalSize = const Size(1440, 1024);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const lesson = LessonCardModel(
        id: 'tap-choice-grid',
        moduleId: 'english',
        title: 'Six choice grid',
        subject: 'English',
        durationMinutes: 5,
        status: 'Assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Check six-choice layout.',
        scenario:
            'Six choice cards should stay in two rows with the CTA below.',
        steps: [
          LessonStep(
            id: 'grid-step-6',
            type: LessonStepType.practice,
            title: 'Pick mango',
            instruction: 'Tap the matching object card.',
            expectedResponse: 'mango',
            coachPrompt: 'Tap mango.',
            facilitatorTip:
                'Watch whether the learner can scan all six options.',
            realWorldCheck: 'Six cards stay visible in two rows of three.',
            speakerMode: SpeakerMode.listening,
            activity: LessonActivity(
              type: LessonActivityType.tapChoice,
              prompt: 'Tap mango.',
              targetResponse: 'mango',
              choices: ['mango', 'leaf', 'hat', 'cup', 'drum', 'book'],
            ),
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: true);
      state.assignedLessons.add(lesson);
      final learner = state.learners.first;
      state.selectLearner(learner);
      state.selectModule(
        state.modules.firstWhere((module) => module.id == lesson.moduleId),
      );
      state.startLesson(lesson);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      final topLeft = tester.getTopLeft(
        find.ancestor(of: find.text('mango'), matching: find.byType(InkWell)),
      );
      final topMiddle = tester.getTopLeft(
        find.ancestor(of: find.text('leaf'), matching: find.byType(InkWell)),
      );
      final topRight = tester.getTopLeft(
        find.ancestor(of: find.text('hat'), matching: find.byType(InkWell)),
      );
      final bottomLeft = tester.getTopLeft(
        find.ancestor(of: find.text('cup'), matching: find.byType(InkWell)),
      );
      final bottomMiddle = tester.getTopLeft(
        find.ancestor(of: find.text('drum'), matching: find.byType(InkWell)),
      );
      final bottomRight = tester.getTopLeft(
        find.ancestor(of: find.text('book'), matching: find.byType(InkWell)),
      );

      expect((topLeft.dy - topMiddle.dy).abs(), lessThan(8));
      expect((topMiddle.dy - topRight.dy).abs(), lessThan(8));
      expect((bottomLeft.dy - bottomMiddle.dy).abs(), lessThan(8));
      expect((bottomMiddle.dy - bottomRight.dy).abs(), lessThan(8));
      expect(bottomLeft.dy, greaterThan(topLeft.dy + 40));
      expect(topLeft.dx, lessThan(topMiddle.dx));
      expect(topMiddle.dx, lessThan(topRight.dx));
      expect(bottomLeft.dx, lessThan(bottomMiddle.dx));
      expect(bottomMiddle.dx, lessThan(bottomRight.dx));
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('choice-cta-row'))).dy,
        greaterThan(
          tester.getBottomLeft(find.byKey(const ValueKey('choice-grid'))).dy,
        ),
      );

      state.dispose();
    },
  );

  testWidgets(
    'listen-answer and speak-answer use the simplified spoken lesson layout',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const lesson = LessonCardModel(
        id: 'spoken-layout-parity',
        moduleId: 'english',
        title: 'Spoken layout parity',
        subject: 'English',
        durationMinutes: 5,
        status: 'Assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Keep spoken answer steps minimal.',
        scenario:
            'Listen-answer and speak-answer should match the listen-repeat shell.',
        steps: [
          LessonStep(
            id: 'spoken-step-1',
            type: LessonStepType.practice,
            title: 'Listen and answer',
            instruction: 'Hear the prompt and answer aloud.',
            expectedResponse: 'sun',
            coachPrompt: 'What do you hear?',
            facilitatorTip: 'Use the simplified spoken-step layout.',
            realWorldCheck: 'The right pane stays minimal.',
            speakerMode: SpeakerMode.listening,
            activity: LessonActivity(
              type: LessonActivityType.listenAnswer,
              prompt: 'Listen, then answer: What shines in the sky?',
              supportText: 'Say the word after you hear the clue.',
              targetResponse: 'sun',
            ),
          ),
          LessonStep(
            id: 'spoken-step-2',
            type: LessonStepType.reflection,
            title: 'Speak your answer',
            instruction: 'Answer the question in your own voice.',
            expectedResponse: 'I wash my hands.',
            coachPrompt: 'Tell Mallam what you do before eating.',
            facilitatorTip:
                'The same simplified spoken-step shell should remain.',
            realWorldCheck: 'The spoken answer screen stays minimal too.',
            speakerMode: SpeakerMode.listening,
            activity: LessonActivity(
              type: LessonActivityType.speakAnswer,
              prompt: 'What do you do before eating?',
              supportText: 'Say one short sentence.',
              targetResponse: 'I wash my hands.',
            ),
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: true);
      state.assignedLessons.add(lesson);
      final learner = state.learners.first;
      state.selectLearner(learner);
      state.selectModule(
        state.modules.firstWhere((module) => module.id == lesson.moduleId),
      );
      state.startLesson(lesson);

      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(
        find.text('Listen, then answer: What shines in the sky?'),
        findsOneWidget,
      );
      expect(find.text('Learner transcript'), findsOneWidget);
      expect(
        find.text('Session pulse • ${learner.name.split(' ').first}'),
        findsNothing,
      );
      expect(find.text('Live listen feed'), findsNothing);
      expect(
        find.text('Start listening + transcript').evaluate().isNotEmpty ||
            find.text('Start listening (audio first)').evaluate().isNotEmpty ||
            find.text('Start listening').evaluate().isNotEmpty,
        isTrue,
      );
      expect(find.text('Stop listening'), findsOneWidget);

      state.advanceLessonStep();
      await tester.pumpWidget(
        MaterialApp(
          home: LessonSessionPage(
            state: state,
            lesson: lesson,
            onChanged: () {},
          ),
        ),
      );
      await pumpForUi(tester);

      expect(find.text('What do you do before eating?'), findsOneWidget);
      expect(find.text('Learner transcript'), findsOneWidget);
      expect(
        find.textContaining('Start listening, capture the learner voice'),
        findsNothing,
      );
      expect(
        find.text('Session pulse • ${learner.name.split(' ').first}'),
        findsNothing,
      );
      expect(find.text('Live listen feed'), findsNothing);

      state.dispose();
    },
  );

  testWidgets('lesson session shows a preflight listening readiness card', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1280);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonSessionPage(state: state, lesson: lesson, onChanged: () {}),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Hear Mallam again'), findsWidgets);
    expect(find.text('Learner transcript'), findsOneWidget);
    expect(find.text('Start listening'), findsOneWidget);
    expect(
      find.textContaining('Start listening, capture the learner voice'),
      findsOneWidget,
    );
    expect(
      find.textContaining('Session pulse • ${learner.name.split(' ').first}'),
      findsOneWidget,
    );
    expect(
      find.text('Hands-free').evaluate().isNotEmpty ||
          find.text('Step by step').evaluate().isNotEmpty,
      isTrue,
    );
    expect(
      find.text('Saved voice backup attached').evaluate().isNotEmpty ||
          find.text('Transcript can drive next step').evaluate().isNotEmpty ||
          find.text('Transcript assist only').evaluate().isNotEmpty,
      isTrue,
    );
    expect(
      find.text('Start listening + transcript').evaluate().isNotEmpty ||
          find.text('Start listening (audio first)').evaluate().isNotEmpty,
      isTrue,
    );

    state.dispose();
  });

  testWidgets('lesson session hardens browser/device lifecycle interruptions', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonSessionPage(state: state, lesson: lesson, onChanged: () {}),
      ),
    );
    await pumpForUi(tester);

    final pageState = tester.state(find.byType(LessonSessionPage)) as dynamic;
    pageState.didChangeAppLifecycleState(AppLifecycleState.paused);
    await pumpForUi(tester);

    expect(find.byType(LessonSessionPage), findsOneWidget);
    expect(find.text('Back'), findsOneWidget);

    pageState.didChangeAppLifecycleState(AppLifecycleState.resumed);
    await pumpForUi(tester);

    expect(find.byType(LessonSessionPage), findsOneWidget);
    expect(find.text('Hear Mallam again'), findsWidgets);
    expect(find.text('The lesson is paused safely'), findsOneWidget);
    expect(find.text('Ready to resume'), findsOneWidget);

    state.dispose();
  });

  testWidgets(
    'lesson exit pauses safely instead of dropping learner evidence',
    (tester) async {
      tester.view.physicalSize = const Size(1200, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.attachLearnerAudioCapture(
        path: 'https://example.com/audio/exit-review.m4a',
        duration: const Duration(seconds: 3),
      );
      state.submitLearnerResponse('I still need a quick review');

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => FilledButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => LessonSessionPage(
                      state: state,
                      lesson: lesson,
                      onChanged: () {},
                    ),
                  ),
                );
              },
              child: const Text('Open lesson'),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open lesson'));
      await pumpForUi(tester);

      expect(find.byType(LessonSessionPage), findsOneWidget);

      await tester.tap(find.text('Back'));
      await pumpForUi(tester);

      expect(find.text('Leave lesson safely?'), findsOneWidget);
      expect(
        find.textContaining('saved voice, and draft answer'),
        findsOneWidget,
      );

      await tester.tap(find.text('Leave lesson'));
      await pumpForUi(tester);

      expect(find.byType(LessonSessionPage), findsNothing);
      expect(find.text('Open lesson'), findsOneWidget);
      expect(state.activeSession, isNotNull);
      expect(state.activeSession?.latestLearnerAudioPath, isNotNull);
      expect(state.activeSession?.latestLearnerResponse, isNotNull);
      expect(state.activeSession?.stepIndex, 0);

      state.dispose();
    },
  );

  testWidgets('subject module page highlights the guided lesson journey', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final nextLesson = state.nextAssignedLessonForLearner(learner)!;
    final module = state.modules.firstWhere(
      (item) => item.id == nextLesson.moduleId,
    );
    state.selectLearner(learner);
    state.selectModule(module);

    await tester.pumpWidget(
      MaterialApp(
        home: SubjectModulesPage(
          state: state,
          onChanged: () {},
          module: module,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));

    expect(tester.takeException(), isNull);
    expect(find.text('Available lessons'), findsOneWidget);
    expect(
      find.textContaining('choose which available learner'),
      findsOneWidget,
    );

    state.dispose();
  });

  testWidgets(
    'subject module page shows recovery actions when a subject has no learner-safe lessons',
    (tester) async {
      final state = LumoAppState(includeSeedDemoContent: false);
      const module = LearningModule(
        id: 'science-lab',
        title: 'Science Lab',
        description: 'No published lessons have reached this tablet yet.',
        voicePrompt: 'Open science.',
        readinessGoal: 'Science practice',
        badge: '0 lessons',
      );
      state.modules.add(module);
      state.selectModule(module);

      await tester.pumpWidget(
        MaterialApp(
          home: SubjectModulesPage(
            state: state,
            onChanged: () {},
            module: module,
            subjectTitle: 'Science Lab',
            subjectKey: 'science-lab',
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));

      expect(
        find.text('No learner-safe lessons are ready in Science Lab yet.'),
        findsOneWidget,
      );
      expect(find.text('Refresh live sync'), findsOneWidget);
      expect(find.text('Open student list'), findsOneWidget);
      expect(find.text('Back to subjects'), findsWidgets);

      state.dispose();
    },
  );

  test(
    'subject module page resolves learner-facing subject labels from backend module metadata',
    () {
      final state = LumoAppState(includeSeedDemoContent: false);
      final learner = const LearnerProfile(
        id: 'learner-1',
        name: 'Amina',
        age: 7,
        cohort: 'Alpha',
        streakDays: 1,
        guardianName: 'Zainab',
        preferredLanguage: 'Hausa',
        readinessLabel: 'Voice-first beginner',
        village: 'Pod 1',
        guardianPhone: '0800000000',
        sex: 'Girl',
        baselineLevel: 'No prior exposure',
        consentCaptured: true,
        learnerCode: 'AMI-AL07',
      );
      const module = LearningModule(
        id: 'english-reading-module',
        title: 'Reading Foundations',
        description:
            'Backend module title differs from learner-facing subject.',
        voicePrompt: 'Open the reading module.',
        readinessGoal: 'Reading practice',
        badge: '1 lesson',
      );
      const lesson = LessonCardModel(
        id: 'english-reading-lesson',
        moduleId: 'english-reading-module',
        title: 'Read the greeting',
        subject: 'English',
        durationMinutes: 12,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Learner should see the mapped English lesson.',
        steps: [
          LessonStep(
            id: 'step-1',
            type: LessonStepType.prompt,
            title: 'Say hello',
            instruction: 'Say hello.',
            expectedResponse: 'Say hello.',
            coachPrompt: 'Coach the learner to say hello.',
            facilitatorTip: 'Keep the greeting calm and short.',
            realWorldCheck: 'Learner greets clearly before continuing.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );
      state.learners.add(learner);
      state.modules.add(module);
      state.assignedLessons.add(lesson);
      state.selectLearner(learner);
      state.selectModule(module);

      final page = SubjectModulesPage(
        state: state,
        onChanged: () {},
        module: module,
      );
      final visibleLessons = state.lessonsForLearnerAndSubject(
        learner,
        page.subjectKey,
      );

      expect(page.subjectTitle, 'English');
      expect(page.subjectKey, 'english');
      expect(visibleLessons.map((item) => item.id), ['english-reading-lesson']);

      state.dispose();
    },
  );
}
