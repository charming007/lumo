import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void _noop() {}

void main() {
  test('operator source labels prefer live backend when healthy', () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 2));

    expect(state.operatorSourceLabel, 'Backend link live');
    expect(state.curriculumSourceLabel, 'Curriculum unknown');
    expect(state.operatorHealthLabel, 'Backend healthy');
  });

  test('operator source labels prioritize stale local runtime warnings', () {
    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = true
      ..lastSyncedAt = DateTime.now().subtract(const Duration(hours: 8))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(hours: 2))
      ..pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );

    expect(state.operatorSourceLabel, 'Backend offline');
    expect(state.curriculumSourceLabel, 'Offline pack curriculum');
    expect(state.operatorHealthLabel, 'Sync stale');
  });

  testWidgets('home top bar shows source chips without overflow',
      (tester) async {
    tester.view.physicalSize = const Size(752, 1024);
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
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Offline pack curriculum'), findsOneWidget);
    expect(find.text('Sync stale'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'healthy home keeps live backend chips and prominent sync freshness visible',
      (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1));
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Backend link live'), findsOneWidget);
    expect(find.text('Backend healthy'), findsOneWidget);
    expect(find.text('Sync freshness'), findsOneWidget);
    expect(find.textContaining('Last trusted sync'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'home freshness banner stops presenting stale queued sync as healthy',
      (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(hours: 8))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(hours: 2))
      ..pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sync needs attention'), findsOneWidget);
    expect(find.text('Sync freshness'), findsNothing);
    expect(
      find.textContaining('1 learner event(s) are still queued locally'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'home trust banner stays visible on landscape tablets when sync warnings exist',
      (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
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
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tablet trust check'), findsOneWidget);
    expect(find.text('Refresh sync'), findsOneWidget);
    expect(find.text('Offline pack curriculum'), findsOneWidget);
    expect(find.text('Sync stale'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test(
      'placeholder assignments never advertise a learner as ready before lesson sync lands',
      () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..registrationContext = const RegistrationContext(
        tabletRegistration: TabletRegistration(
          id: 'tablet-1',
          podId: 'pod-1',
          podLabel: 'Pod 1',
        ),
      );
    addTearDown(state.dispose);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina Bello',
      age: 7,
      cohort: 'Alpha',
      cohortId: 'cohort-1',
      podId: 'pod-1',
      podLabel: 'Pod 1',
      streakDays: 1,
      guardianName: 'Zainab',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Kawo',
      guardianPhone: '0800000000',
      sex: 'Girl',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'AMI-001',
    );
    const placeholderLesson = LessonCardModel(
      id: 'assignment-placeholder:lesson-placeholder',
      moduleId: 'english',
      title: 'Greeting lesson',
      subject: 'English',
      durationMinutes: 10,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Assignment visible before payload sync.',
      steps: [],
    );

    state.learners.add(learner);
    state.assignedLessons.add(placeholderLesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-1',
        lessonId: placeholderLesson.id,
        moduleId: placeholderLesson.moduleId,
        lessonTitle: placeholderLesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    );

    final availability = learnerLessonAvailability(
      state: state,
      learner: learner,
      lesson: placeholderLesson,
    );

    expect(availability.kind, LearnerLessonAvailabilityKind.unavailable);
    expect(availability.label, 'Waiting for sync');
    expect(availability.canLaunch, isFalse);
  });

  test(
      'live lessons without synced activity steps stay blocked instead of ready',
      () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..registrationContext = const RegistrationContext(
        tabletRegistration: TabletRegistration(
          id: 'tablet-1',
          podId: 'pod-1',
          podLabel: 'Pod 1',
        ),
      );
    addTearDown(state.dispose);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina Bello',
      age: 7,
      cohort: 'Alpha',
      cohortId: 'cohort-1',
      podId: 'pod-1',
      podLabel: 'Pod 1',
      streakDays: 1,
      guardianName: 'Zainab',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Kawo',
      guardianPhone: '0800000000',
      sex: 'Girl',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'AMI-001',
    );
    const shellLesson = LessonCardModel(
      id: 'lesson-shell-1',
      moduleId: 'english',
      title: 'Greeting lesson',
      subject: 'English',
      durationMinutes: 10,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Lesson shell synced before activity steps land.',
      steps: [],
    );

    state.learners.add(learner);
    state.assignedLessons.add(shellLesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-1',
        lessonId: shellLesson.id,
        moduleId: shellLesson.moduleId,
        lessonTitle: shellLesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    );

    final availability = learnerLessonAvailability(
      state: state,
      learner: learner,
      lesson: shellLesson,
    );

    expect(availability.kind, LearnerLessonAvailabilityKind.unavailable);
    expect(availability.label, 'Sync incomplete');
    expect(availability.detail, contains('without any activity steps'));
    expect(availability.canLaunch, isFalse);
  });

  testWidgets(
      'learner profile blocks runtime resume CTA when the lesson payload is still sync-incomplete',
      (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..registrationContext = const RegistrationContext(
        tabletRegistration: TabletRegistration(
          id: 'tablet-1',
          podId: 'pod-1',
          podLabel: 'Pod 1',
        ),
      );
    addTearDown(state.dispose);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina Bello',
      age: 7,
      cohort: 'Alpha',
      cohortId: 'cohort-1',
      podId: 'pod-1',
      podLabel: 'Pod 1',
      streakDays: 1,
      guardianName: 'Zainab',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Kawo',
      guardianPhone: '0800000000',
      sex: 'Girl',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'AMI-001',
    );
    const shellLesson = LessonCardModel(
      id: 'lesson-shell-1',
      moduleId: 'english',
      title: 'Greeting lesson',
      subject: 'English',
      durationMinutes: 10,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Lesson shell synced before activity steps land.',
      steps: [],
    );

    state.learners.add(learner);
    state.currentLearner = learner;
    state.assignedLessons.add(shellLesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-1',
        lessonId: shellLesson.id,
        moduleId: shellLesson.moduleId,
        lessonTitle: shellLesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    );
    state.recentRuntimeSessionsByLearnerId[learner.id] = [
      BackendLessonSession(
        id: 'runtime-shell',
        sessionId: 'session-shell',
        studentId: learner.id,
        learnerCode: learner.learnerCode,
        lessonId: shellLesson.id,
        lessonTitle: shellLesson.title,
        moduleId: shellLesson.moduleId,
        status: 'in_progress',
        completionState: 'inProgress',
        automationStatus: 'Mallam is waiting for the next response.',
        currentStepIndex: 1,
        stepsTotal: 0,
        responsesCaptured: 1,
        supportActionsUsed: 0,
        audioCaptures: 1,
        facilitatorObservations: 0,
      ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: LearnerProfilePage(state: state, learner: learner),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Refresh sync before resuming'), findsOneWidget);
    expect(find.text('Resume from backend session'), findsNothing);
    expect(
      find.textContaining('missing its activity steps'),
      findsOneWidget,
    );
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Refresh sync before resuming'),
    );
    expect(button.onPressed, isNull);
  });

  test('operator curriculum chip flags published lesson shells as incomplete', () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1));
    addTearDown(state.dispose);

    state.assignedLessons.add(
      const LessonCardModel(
        id: 'lesson-shell-1',
        moduleId: 'english',
        title: 'Greeting lesson',
        subject: 'English',
        durationMinutes: 10,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Lesson shell synced before activity steps land.',
        steps: [],
      ),
    );

    expect(state.curriculumSourceLabel, 'Curriculum incomplete');
    expect(
      state.curriculumTruthWarning,
      contains('full activity payload'),
    );
  });

  testWidgets(
      'home trust chips show curriculum incomplete for published lesson shells',
      (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1));
    addTearDown(state.dispose);

    state.assignedLessons.add(
      const LessonCardModel(
        id: 'lesson-shell-1',
        moduleId: 'english',
        title: 'Greeting lesson',
        subject: 'English',
        durationMinutes: 10,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Lesson shell synced before activity steps land.',
        steps: [],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Curriculum incomplete'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('subject cards stay hidden until a synced learner lands on the tablet',
      () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..registrationContext = const RegistrationContext(
        tabletRegistration: TabletRegistration(
          id: 'tablet-1',
          podId: 'pod-1',
          podLabel: 'Pod 1',
        ),
      )
      ..assignedLessons.add(
        const LessonCardModel(
          id: 'english-live-lesson',
          moduleId: 'english',
          title: 'Greetings with Mallam',
          subject: 'English',
          durationMinutes: 10,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'Greeting flow',
          scenario: 'Lesson is synced before any learner roster lands.',
          steps: [],
        ),
      );
    addTearDown(state.dispose);

    final subjectCards = buildLearnerSubjectCards(state: state);

    expect(subjectCards, isEmpty);
  });

  test(
      'subject cards surface sync-incomplete shells instead of generic visibility',
      () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false;
    addTearDown(state.dispose);

    state.modules.add(
      const LearningModule(
        id: 'english',
        title: 'English',
        description: 'English path',
        voicePrompt: 'Open English.',
        readinessGoal: 'Greeting flow',
        badge: '1 lesson',
      ),
    );
    state.learners.add(
      const LearnerProfile(
        id: 'learner-1',
        name: 'Amina',
        age: 7,
        cohort: 'Pod 1',
        podId: 'pod-1',
        podLabel: 'Pod 1',
        streakDays: 1,
        guardianName: 'Hauwa',
        preferredLanguage: 'Hausa',
        readinessLabel: 'Voice-first beginner',
        village: 'Kawo',
        guardianPhone: '0800000000',
        sex: 'Girl',
        baselineLevel: 'No prior exposure',
        consentCaptured: true,
        learnerCode: 'AMI-001',
      ),
    );
    state.registrationContext = const RegistrationContext(
      tabletRegistration: TabletRegistration(
        id: 'tablet-1',
        podId: 'pod-1',
        podLabel: 'Pod 1',
      ),
    );
    state.assignedLessons.add(
      const LessonCardModel(
        id: 'english-shell',
        moduleId: 'english',
        title: 'Greeting lesson shell',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Published lesson shell before steps sync.',
        steps: [],
      ),
    );

    final subjectCards = buildLearnerSubjectCards(state: state);

    expect(subjectCards, hasLength(1));
    expect(subjectCards.single.statusLabel, 'Sync incomplete');
  });

  test(
      'subject cards keep sync-incomplete blockers visible even after earlier lesson progress exists',
      () async {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false;
    addTearDown(state.dispose);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina',
      age: 7,
      cohort: 'Pod 1',
      podId: 'pod-1',
      podLabel: 'Pod 1',
      streakDays: 1,
      guardianName: 'Hauwa',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Kawo',
      guardianPhone: '0800000000',
      sex: 'Girl',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'AMI-001',
    );
    const completedLesson = LessonCardModel(
      id: 'english-complete',
      moduleId: 'english',
      title: 'Completed greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Finished lesson already saved on this tablet.',
      steps: [
        LessonStep(
          id: 'step-1',
          type: LessonStepType.practice,
          title: 'Say hello',
          instruction: 'Say hello.',
          expectedResponse: 'Hello',
          coachPrompt: 'Say hello.',
          facilitatorTip: 'Keep it warm.',
          realWorldCheck: 'Learner greets',
          speakerMode: SpeakerMode.guiding,
        ),
      ],
    );
    const waitingLesson = LessonCardModel(
      id: 'english-next-shell',
      moduleId: 'english',
      title: 'Next greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Lesson shell visible before activity steps sync.',
      steps: [],
    );
    const module = LearningModule(
      id: 'english',
      title: 'English',
      description: 'English path',
      voicePrompt: 'Open English.',
      readinessGoal: 'Greeting flow',
      badge: '2 lessons',
    );

    state.modules.add(module);
    state.learners.add(learner);
    state.registrationContext = const RegistrationContext(
      tabletRegistration: TabletRegistration(
        id: 'tablet-1',
        podId: 'pod-1',
        podLabel: 'Pod 1',
      ),
    );
    state.assignedLessons.addAll([completedLesson, waitingLesson]);
    state.assignmentPacks.addAll([
      LearnerAssignmentPack(
        assignmentId: 'assignment-complete',
        lessonId: completedLesson.id,
        moduleId: completedLesson.moduleId,
        lessonTitle: completedLesson.title,
        eligibleLearnerIds: [learner.id],
      ),
      LearnerAssignmentPack(
        assignmentId: 'assignment-next',
        lessonId: waitingLesson.id,
        moduleId: waitingLesson.moduleId,
        lessonTitle: waitingLesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    ]);
    state.selectLearner(learner);
    state.selectModule(module);
    state.startLesson(completedLesson);
    await state.completeLesson(completedLesson);

    final subjectCards = buildLearnerSubjectCards(state: state);

    expect(subjectCards, hasLength(1));
    expect(subjectCards.single.statusLabel, 'Sync incomplete');
  });

  test(
      'source status escalates pending learner registration sync over generic queue copy',
      () {
    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1))
      ..pendingSyncEvents.add(
        const SyncEvent(
          id: 'sync-register-1',
          type: 'learner_registered_local_fallback',
          payload: {'learnerCode': 'AMI-001'},
        ),
      )
      ..pendingSyncEvents.add(
        const SyncEvent(
          id: 'sync-lesson-1',
          type: 'lesson_completed',
          payload: {'learnerCode': 'AMI-001'},
        ),
      );
    addTearDown(state.dispose);

    final signal = buildLearnerSourceStatusSignal(state);

    expect(signal.id, 'runtime-pending-registration-1');
    expect(signal.label, '1 learner still needs backend registration');
    expect(signal.detail, contains('live roster is not trustworthy'));
    expect(signal.detail, contains('Do not treat local-only registration as pilot-ready progress yet'));
  });

  testWidgets(
      'backend banner escalates unknown learner sync failures into a deployment-trust blocker',
      (tester) async {
    tester.view.physicalSize = const Size(900, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1))
      ..lastSyncError = 'Unknown learner for sync event';
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: RegisterPage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Pilot trust blocker'), findsOneWidget);
    expect(
      find.textContaining(
          'backend rejected at least one learner event as unknown'),
      findsOneWidget,
    );
    expect(
      find.textContaining('local-only registration as incomplete'),
      findsOneWidget,
    );
    expect(
      find.textContaining(
          'An unknown learner sync failure usually means local-only registration never reconciled.'),
      findsOneWidget,
    );
    expect(
      find.textContaining('Latest blocked learner reference:'),
      findsNothing,
    );
  });

  testWidgets(
      'backend banner surfaces concrete sync trust evidence for drifting learner contracts',
      (tester) async {
    tester.view.physicalSize = const Size(900, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1))
      ..lastSyncError = 'Unknown learner for sync event'
      ..pendingSyncEvents.add(
        const SyncEvent(
          id: 'sync-register-1',
          type: 'learner_registered_local_fallback',
          payload: {'learnerCode': 'AMI-001'},
        ),
      )
      ..pendingSyncEvents.add(
        const SyncEvent(
          id: 'sync-reward-1',
          type: 'learner_reward_redeemed',
          payload: {'learnerCode': 'AMI-001'},
        ),
      );
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: RegisterPage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));

    expect(
      find.textContaining('learner_registered_local_fallback'),
      findsOneWidget,
    );
    expect(
      find.textContaining('learner_reward_redeemed'),
      findsOneWidget,
    );
    expect(
      find.textContaining('Latest blocked learner reference: AMI-001'),
      findsOneWidget,
    );
  });

  testWidgets(
      'compact home trust banner does not claim safe handoff during critical sync blocker',
      (tester) async {
    tester.view.physicalSize = const Size(1024, 768);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1))
      ..lastSyncError = 'Unknown learner for sync event';
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tablet trust check'), findsOneWidget);
    expect(find.text('Pilot trust blocker'), findsOneWidget);
    expect(
      find.textContaining('Deployment trust is blocked until the backend sync mismatch is reconciled.'),
      findsOneWidget,
    );
    expect(
      find.textContaining('backend rejected at least one learner event as unknown'),
      findsOneWidget,
    );
    expect(
      find.text('Backend connected • sync trust blocked'),
      findsOneWidget,
    );
    expect(find.text('Sync trust blocked'), findsOneWidget);
    expect(
      find.text('Backend, roster, and assignment payload all look sane enough for the next live lesson handoff.'),
      findsNothing,
    );
  });

  test('operator labels stop pretending healthy backend trust during sync blockers', () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1))
      ..lastSyncError = 'Unknown learner for sync event';
    addTearDown(state.dispose);

    expect(state.backendStatusLabel, 'Backend connected • sync trust blocked');
    expect(state.operatorHealthLabel, 'Sync trust blocked');
  });

  test('operator labels escalate pending local registration sync over healthy backend copy', () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 1))
      ..pendingSyncEvents.add(
        const SyncEvent(
          id: 'sync-register-1',
          type: 'learner_registered_local_fallback',
          payload: {'learnerCode': 'AMI-001'},
        ),
      );
    addTearDown(state.dispose);

    expect(
      state.backendStatusLabel,
      'Backend connected • registration sync blocked',
    );
    expect(state.operatorHealthLabel, 'Registration sync blocked');
  });

  test('compact home trust banner prioritizes sync trust blockers over registration blockers', () {
    final source = File('lib/main.dart').readAsStringSync();

    expect(
      source,
      contains('final compactWarning = criticalSyncBlocker ??'),
    );
    expect(
      source,
      contains("(registrationBlocked != null\n            ? '\$registrationBlocked Fix backend reachability first.'"),
    );
  });

  test('full home trust banner prioritizes sync trust blockers over registration blockers', () {
    final source = File('lib/main.dart').readAsStringSync();

    expect(
      source,
      contains('Text(\n                      criticalSyncBlocker ??'),
    );
    expect(
      source,
      contains("(registrationBlocked != null\n                              ? '\$registrationBlocked Fix backend reachability first. Local-only registration is intentionally blocked because it can create sync records the backend does not honor.'"),
    );
  });

  test('home trust surfaces count sync-incomplete lessons, not only placeholders', () {
    final source = File('lib/main.dart').readAsStringSync();

    expect(
      source,
      contains('state.assignedLessons.where(lessonRequiresSyncBeforeStarting).length'),
    );
    expect(
      source,
      contains('1 assigned lesson is still sync-incomplete. Refresh sync before launch.'),
    );
    expect(
      source,
      contains('1 assigned lesson is still sync-incomplete on this tablet.'),
    );
  });

  test('subject journey keeps sync blockers learner-honest for placeholders and live shells', () {
    const placeholderLesson = LessonCardModel(
      id: 'assignment-placeholder:english-1',
      moduleId: 'english',
      title: 'Waiting lesson shell',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Placeholder before live payload syncs.',
      steps: [],
    );
    const syncIncompleteLesson = LessonCardModel(
      id: 'english-shell',
      moduleId: 'english',
      title: 'Greeting lesson shell',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Published lesson shell before steps sync.',
      steps: [],
    );

    expect(lessonRequiresSyncBeforeStarting(placeholderLesson), isTrue);
    expect(lessonSyncBlockerStatusLabel(placeholderLesson), 'Waiting for sync');
    expect(
      lessonSyncBlockerCtaLabel(placeholderLesson),
      'Sync required before starting',
    );

    expect(lessonRequiresSyncBeforeStarting(syncIncompleteLesson), isTrue);
    expect(
      lessonSyncBlockerStatusLabel(syncIncompleteLesson),
      'Sync incomplete',
    );
    expect(
      lessonSyncBlockerCtaLabel(syncIncompleteLesson),
      'Sync required before starting',
    );
  });
}
