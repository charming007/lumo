import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  Future<void> pumpAppAtSize(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const LumoApp(includeSeedDemoContent: true));
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
  }

  testWidgets('shows learner app shell after splash', (tester) async {
    await pumpAppAtSize(tester, const Size(1400, 1000));

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Student List'), findsOneWidget);
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
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Learner microphone capture'), findsOneWidget);
    expect(find.textContaining(lesson.title), findsWidgets);

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
    await tester.pumpAndSettle();

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
    expect(state.recentRuntimeSessionsForLearner(state.learners.single), hasLength(1));
    expect(
      state.recentRuntimeSessionsForLearner(state.learners.single).single
          .automationStatus,
      'Resume ready',
    );
  });

  testWidgets('home screen stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    expect(tester.takeException(), isNull);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Student List'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsWidgets);
  });

  testWidgets('student list stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    await tester.tap(find.text('Student List'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('All learners'), findsOneWidget);
    expect(find.textContaining('learners'), findsWidgets);
  });

  testWidgets('student list stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Student List'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('All learners'), findsOneWidget);
    expect(find.text('Pick fast'), findsOneWidget);
    expect(find.textContaining('leads'), findsWidgets);
  });

  testWidgets('learner profile stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Student List'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Profile').first);
    await tester.tap(find.text('Profile').first);
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Back'), findsOneWidget);
    expect(find.textContaining('leaderboard'), findsWidgets);
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
    await tester.pumpAndSettle();

    expect(find.text('1 sync pending'), findsOneWidget);
    expect(find.text('Sync pending'), findsWidgets);
    expect(
      find.textContaining('waiting for backend sync'),
      findsOneWidget,
    );

    state.dispose();
  });

  testWidgets('registration flow stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    await tester.tap(find.text('Register'));
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text(state.modules.first.title), findsWidgets);
    expect(find.text('Tap to choose learner'), findsWidgets);

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
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Choose learner'), findsOneWidget);
    expect(find.text('Select learner to continue'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsWidgets);

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
    await tester.pumpAndSettle();
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
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Resume learner'), findsOneWidget);
    expect(
        find.textContaining(
            '${learner.name} is locked for this resume session.'),
        findsOneWidget);
    expect(find.text('Resume with ${learner.name}'), findsOneWidget);

    await tester.tap(find.text(otherLearner.name).first);
    await tester.pumpAndSettle();

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
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Review saved voice before advancing'), findsOneWidget);
    expect(find.text('Transcript missing • use saved voice'), findsOneWidget);
    expect(find.text('Saved learner voice attached'), findsOneWidget);
    expect(find.text('Play saved voice'), findsWidgets);
    expect(find.text('Accept saved voice + continue'), findsOneWidget);

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
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(
        find.text('Verify draft transcript with saved voice'), findsOneWidget);
    expect(find.text('Draft transcript • verify with audio'), findsOneWidget);
    expect(
      find.textContaining('Use the saved voice as the source of truth'),
      findsOneWidget,
    );
    expect(find.text('Confirm transcript'), findsOneWidget);

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
    await tester.pumpAndSettle();

    final pageState = tester.state(find.byType(LessonSessionPage)) as dynamic;
    pageState.didChangeAppLifecycleState(AppLifecycleState.paused);
    await tester.pumpAndSettle();

    expect(find.textContaining('left the foreground'), findsWidgets);
    expect(find.textContaining('protect the learner session'), findsWidgets);
    expect(
        find.textContaining('resume hands-free automatically'), findsNothing);

    pageState.didChangeAppLifecycleState(AppLifecycleState.resumed);
    await tester.pumpAndSettle();

    expect(find.textContaining('returned to the foreground'), findsWidgets);
    expect(find.textContaining('Resume hands-free loop'), findsWidgets);

    state.dispose();
  });
}
