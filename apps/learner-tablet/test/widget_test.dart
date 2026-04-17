import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';
import 'package:lumo_learner_tablet/seed_data.dart';
import 'package:lumo_learner_tablet/widgets.dart';

class _FailingApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap() async {
    throw Exception('backend offline');
  }
}

class _DelayedApiClient extends LumoApiClient {
  _DelayedApiClient(this._completer);

  final Completer<LumoBootstrap> _completer;

  @override
  Future<LumoBootstrap> fetchBootstrap() => _completer.future;
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

void _noop() {}

void main() {
  Future<void> pumpAppAtSize(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const LumoApp(includeSeedDemoContent: true));
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

    expect(find.text('Replay Mallam'), findsOneWidget);
    expect(find.text('Register'), findsOneWidget);
    expect(find.text('Student list'), findsOneWidget);
    expect(find.text('Subjects'), findsNothing);
  });

  testWidgets('home screen keeps Mallam frameless with replay CTA only', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Replay Mallam'), findsOneWidget);
    expect(find.text('AI Mallam is ready'), findsNothing);
    expect(find.text('Home guide'), findsNothing);
    expect(
      find.textContaining('Assalamu alaikum. You are on the home page.'),
      findsNothing,
    );
    expect(
        find.textContaining('Keep Mallam visible and dominant'), findsNothing);
    expect(find.textContaining('Facilitator guidance'), findsNothing);

    state.dispose();
  });

  testWidgets(
      'holds on bootstrap loading state instead of showing an empty home screen',
      (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final completer = Completer<LumoBootstrap>();
    final state = LumoAppState(
      apiClient: _DelayedApiClient(completer),
      includeSeedDemoContent: false,
    );

    await tester.pumpWidget(MaterialApp(
      home: LumoApp(stateOverride: state, includeSeedDemoContent: false),
    ));

    await tester.pump(const Duration(seconds: 3));
    await tester.pump();

    expect(
      find.text('Loading the live learner roster before the tablet opens.'),
      findsOneWidget,
    );
    expect(find.text('Register'), findsNothing);
    expect(find.text('Student list'), findsNothing);

    completer.complete(
      LumoBootstrap(
        learners: const [
          LearnerProfile(
            id: 'learner-live-1',
            name: 'Amina Bello',
            age: 9,
            cohort: 'Cohort A',
            streakDays: 2,
            guardianName: 'Hauwa Bello',
            preferredLanguage: 'Hausa',
            readinessLabel: 'Voice-first beginner',
            village: 'Kawo',
            guardianPhone: '08000000000',
            sex: 'Girl',
            baselineLevel: 'No prior exposure',
            consentCaptured: true,
            learnerCode: 'LM-101',
            caregiverRelationship: 'Mother',
            enrollmentStatus: 'Active',
            attendanceBand: 'Stable attendance',
            supportPlan: 'Short prompts and praise.',
            lastLessonSummary: 'No lesson captured yet.',
            lastAttendance: 'Checked in today',
          ),
        ],
        modules: learningModules,
        lessons: assignedLessonsSeed,
      ),
    );

    await tester.pump();
    await pumpForUi(tester);

    expect(find.text('Replay Mallam'), findsOneWidget);
    expect(find.text('Student list'), findsOneWidget);

    state.dispose();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  });

  testWidgets('splash screen stays usable on short tablet heights', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 360);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const MaterialApp(
      home: SplashScreen(onFinish: _noop),
    ));
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

    expect(find.text('Replay Mallam'), findsOneWidget);
    expect(find.text('Follow Mallam one lesson at a time'), findsNothing);
    expect(
      find.textContaining('You opened ${module.title}.'),
      findsNothing,
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
        home: SessionRecoveryGate(
          state: state,
          onChanged: () {},
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(tester.takeException(), isNull);
    expect(find.text('Back'), findsOneWidget);
    expect(find.text('Replay Mallam'), findsWidgets);
    expect(find.text('Save answer'), findsOneWidget);

    state.dispose();
  });

  testWidgets('reopens the completion page when a finished lesson is restored',
      (
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
    state.activeSession = state.activeSession?.copyWith(
      completionState: LessonCompletionState.complete,
    );
    state.restoredFromPersistence = true;

    await tester.pumpWidget(
      MaterialApp(
        home: SessionRecoveryGate(
          state: state,
          onChanged: () {},
        ),
      ),
    );
    await tester.pump();
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Back home'), findsOneWidget);
    expect(find.textContaining('lesson'), findsWidgets);

    state.dispose();
  });

  testWidgets('restores recent runtime sessions from legacy persisted key', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'lumo_learner_tablet_state_v1':
          '{"schemaVersion":"2026-04-13-runtime-persist","learners":[{"id":"student-1","name":"Amina Bello","age":9,"cohort":"Cohort A","streakDays":0,"guardianName":"Hauwa Bello","preferredLanguage":"Hausa","readinessLabel":"Voice-first beginner","village":"Kawo","guardianPhone":"","sex":"Girl","baselineLevel":"No prior exposure","consentCaptured":true,"learnerCode":"LM-001","caregiverRelationship":"Mother","enrollmentStatus":"Active","attendanceBand":"Stable attendance","supportPlan":"Short prompts and praise after every answer.","lastLessonSummary":"No lesson captured yet.","lastAttendance":"Checked in today"}],"modules":[],"assignedLessons":[],"assignmentPacks":[],"pendingSyncEvents":[],"recentRuntimeSessions":{"student-1":[{"id":"runtime-1","sessionId":"session-1","studentId":"student-1","learnerCode":"LM-001","lessonId":"lesson-1","lessonTitle":"Warm-up","moduleId":"english","moduleTitle":"English","status":"in_progress","completionState":"inProgress","automationStatus":"Resume ready","currentStepIndex":2,"stepsTotal":4,"responsesCaptured":1,"supportActionsUsed":0,"audioCaptures":0,"facilitatorObservations":0}]}}'
    });

    final state = LumoAppState(includeSeedDemoContent: false);
    await state.restorePersistedState();

    expect(state.learners.single.name, 'Amina Bello');
    expect(state.recentRuntimeSessionsForLearner(state.learners.single),
        hasLength(1));
    expect(
      state
          .recentRuntimeSessionsForLearner(state.learners.single)
          .single
          .automationStatus,
      'Resume ready',
    );
  });

  testWidgets('bootstrap failure restores guaranteed offline lesson pack', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    final state = LumoAppState(
      apiClient: _FailingApiClient(),
      includeSeedDemoContent: false,
    );
    addTearDown(state.dispose);

    await state.bootstrap();
    await tester.pump(const Duration(milliseconds: 450));

    expect(state.usingFallbackData, isTrue);
    expect(state.backendError, 'backend offline');
    expect(state.learners, isNotEmpty);
    expect(state.modules, isNotEmpty);
    expect(state.assignedLessons, isNotEmpty);
    expect(state.suggestedLearnerForHome, isNotNull);
  });

  testWidgets('home screen stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    expect(tester.takeException(), isNull);
    expect(find.text('Replay Mallam'), findsOneWidget);
    expect(find.text('Student list'), findsOneWidget);
    expect(find.byType(GridView), findsOneWidget);
    expect(find.byType(DetailCard), findsNothing);
    expect(find.text('English'), findsOneWidget);
    expect(find.text('Basic Mathematics'), findsOneWidget);
    expect(find.text('Life Skills'), findsOneWidget);
  });

  testWidgets(
      'home screen keeps all subject cards visible on short tablet heights', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(1280, 800));

    expect(tester.takeException(), isNull);
    expect(find.text('Replay Mallam'), findsOneWidget);
    expect(find.byType(DetailCard), findsNothing);
    expect(find.text('English'), findsOneWidget);
    expect(find.text('Basic Mathematics'), findsOneWidget);
    expect(find.text('Life Skills'), findsOneWidget);
  });

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
      (
    tester,
  ) async {
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
        home: LearnerProfilePage(
          state: state,
          learner: staleLearner,
        ),
      ),
    );
    await pumpForUi(tester);

    expect(find.text('160 XP'), findsWidgets);
    expect(find.textContaining('Bright Reader'), findsWidgets);

    state.dispose();
  });

  testWidgets(
      'learner profile refreshes while an async reward reconciliation lands', (
    tester,
  ) async {
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
        home: LearnerProfilePage(
          state: state,
          learner: staleLearner,
        ),
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
  });

  testWidgets('student list marks locally registered learners as sync pending',
      (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1280);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    state.usingFallbackData = true;
    state.registrationDraft = const RegistrationDraft(
      name: 'Amina Bello',
      age: '9',
      cohort: 'Fallback cohort',
      guardianName: 'Hauwa Bello',
      village: 'Kawo',
      consentCaptured: true,
    );
    await state.registerLearner();

    await tester.pumpWidget(
      MaterialApp(
        home: AllStudentsPage(
          state: state,
          onChanged: () {},
        ),
      ),
    );
    await pumpForUi(tester);

    expect(find.text('1 sync pending'), findsOneWidget);
    expect(find.text('Sync pending'), findsWidgets);
    expect(
      find.textContaining('waiting for backend sync'),
      findsOneWidget,
    );

    state.dispose();
  });

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
        home: RegisterPage(
          state: state,
          onChanged: () {},
        ),
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
      defaultTarget: RegistrationTarget(
        cohort: cohort,
        mallam: mallam,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: RegisterPage(
          state: state,
          onChanged: () {},
        ),
      ),
    );
    await pumpForUi(tester);

    expect(find.text('Backend cohort'), findsOneWidget);
    expect(find.text('Cohort A'), findsWidgets);
    expect(state.registrationDraft.cohort, 'Cohort A');
    expect(state.registrationDraft.mallamId, 'mallam-1');

    state.dispose();
  });

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

  testWidgets('registration success page stays usable on narrow tablet widths',
      (
    tester,
  ) async {
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
  });

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
        home: LessonCompletePage(
          state: state,
          lesson: lesson,
        ),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Back home'), findsOneWidget);
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
    expect(find.text('Lesson journey'), findsOneWidget);
    expect(find.text('Start next lesson'), findsOneWidget);
    expect(
      find.textContaining('Tap the first big card'),
      findsOneWidget,
    );

    final mallamGuideTopLeft = tester.getTopLeft(find.text('Replay Mallam'));
    final lessonChooserTopLeft =
        tester.getTopLeft(find.text('Start next lesson'));
    expect(
      mallamGuideTopLeft.dy,
      lessThan(lessonChooserTopLeft.dy),
      reason:
          'On stacked portrait layouts, the Mallam guidance pane should stay above the lesson chooser instead of being reversed below it.',
    );

    state.dispose();
  });

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
    expect(find.text('Choose learner'), findsOneWidget);
    expect(find.text('Select learner to continue'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsWidgets);

    state.dispose();
  });

  testWidgets('sync-pending placeholder lessons stay blocked in launch setup', (
    tester,
  ) async {
    final state = LumoAppState(includeSeedDemoContent: true);
    final module = state.modules.first;
    final lesson = LessonCardModel(
      id: 'assignment-placeholder:assignment-42',
      moduleId: module.id,
      title: 'Sync pending lesson',
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
        find.textContaining('Lesson content not available yet'), findsWidgets);
    expect(find.text('Refresh sync before starting'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Refresh sync before starting'))
          .onPressed,
      isNull,
    );

    state.dispose();
  });

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
        home: LessonSessionPage(
          state: state,
          lesson: lesson,
          onChanged: () {},
        ),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.textContaining('Capture or type the learner answer'),
        findsOneWidget);
    expect(
      find.text('Start listening + transcript').evaluate().isNotEmpty ||
          find.text('Start listening (audio first)').evaluate().isNotEmpty,
      isTrue,
    );
    expect(find.byType(SingleChildScrollView), findsWidgets);

    final mallamGuideTopLeft =
        tester.getTopLeft(find.text('Replay Mallam').first);
    final answerPanelTopLeft = tester.getTopLeft(
      find.textContaining('Capture or type the learner answer'),
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
    expect(find.text('Choose learner'), findsOneWidget);

    state.dispose();
  });

  testWidgets(
      'resume launch setup locks the original learner from backend session', (
    tester,
  ) async {
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
            '${learner.name} is locked for this resume session.'),
        findsOneWidget);
    expect(find.text('Resume with ${learner.name}'), findsOneWidget);

    await tester.tap(find.text(otherLearner.name).first);
    await pumpForUi(tester);

    expect(find.text('Resume with ${learner.name}'), findsOneWidget);
    expect(find.text('Start with ${otherLearner.name}'), findsNothing);

    state.dispose();
  });

  testWidgets(
      'lesson session exposes saved voice playback controls during audio-only review',
      (
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
    expect(find.text('Replay Mallam'), findsWidgets);
    expect(
      find.text('Save note + resume hands-free').evaluate().isNotEmpty ||
          find.text('Confirm transcript').evaluate().isNotEmpty,
      isTrue,
    );

    state.dispose();
  });

  testWidgets('lesson session marks draft transcripts as audio-verified review',
      (
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
    expect(find.text('Confirm transcript'), findsOneWidget);
    expect(find.text('Replay Mallam'), findsWidgets);

    state.dispose();
  });

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
        home: LessonSessionPage(
          state: state,
          lesson: lesson,
          onChanged: () {},
        ),
      ),
    );
    await pumpForUi(tester);

    expect(tester.takeException(), isNull);
    expect(find.text('Replay Mallam'), findsWidgets);
    expect(find.textContaining('Capture or type the learner answer'),
        findsOneWidget);
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
        home: LessonSessionPage(
          state: state,
          lesson: lesson,
          onChanged: () {},
        ),
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
    expect(find.text('Replay Mallam'), findsWidgets);

    state.dispose();
  });

  testWidgets('lesson exit pauses safely instead of dropping learner evidence',
      (
    tester,
  ) async {
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
        find.textContaining('saved voice, and draft answer'), findsOneWidget);

    await tester.tap(find.text('Leave lesson'));
    await pumpForUi(tester);

    expect(find.byType(LessonSessionPage), findsNothing);
    expect(find.text('Open lesson'), findsOneWidget);
    expect(state.activeSession, isNotNull);
    expect(state.activeSession?.latestLearnerAudioPath, isNotNull);
    expect(state.activeSession?.latestLearnerResponse, isNotNull);
    expect(state.activeSession?.stepIndex, 0);

    state.dispose();
  });

  testWidgets('subject module page highlights the guided lesson journey', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final nextLesson = state.nextAssignedLessonForLearner(learner)!;
    final module =
        state.modules.firstWhere((item) => item.id == nextLesson.moduleId);
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
    expect(find.text('Lesson journey'), findsOneWidget);
    expect(find.textContaining('Tap the first big card'), findsOneWidget);

    state.dispose();
  });
}
