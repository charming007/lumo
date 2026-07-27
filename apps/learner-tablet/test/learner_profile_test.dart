import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  test(
      'LearnerProfile.fromBackend preserves canonical learnerCode and cohort label',
      () {
    final learner = LearnerProfile.fromBackend({
      'id': 'student-4',
      'name': 'Zainab',
      'age': 12,
      'cohort': 'Afternoon Cohort',
      'learnerCode': 'ZAI-AC12',
      'podLabel': 'Pod 2',
      'level': 'emerging',
      'gender': 'female',
    });

    expect(learner.cohort, 'Afternoon Cohort');
    expect(learner.learnerCode, 'ZAI-AC12');
  });

  testWidgets('placeholder assigned lessons stay blocked on learner profile', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina Bello',
      age: 7,
      cohort: 'Pod A',
      podId: 'pod-a',
      podLabel: 'Pod A',
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
    const placeholderLesson = LessonCardModel(
      id: 'assignment-placeholder:english-1',
      moduleId: 'english',
      title: 'English greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'assigned',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Lesson payload is still syncing to the tablet.',
      steps: [],
    );

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false;
    addTearDown(state.dispose);
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

    await tester.pumpWidget(
      MaterialApp(
        home: LearnerProfilePage(state: state, learner: learner),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));

    final syncRequiredButtons = find.widgetWithText(
      FilledButton,
      'Sync required before starting',
    );
    expect(syncRequiredButtons, findsNWidgets(2));
    expect(find.text('Waiting for sync'), findsNWidgets(2));
    expect(find.text('Ready'), findsNothing);
    for (final button in tester.widgetList<FilledButton>(syncRequiredButtons)) {
      expect(button.onPressed, isNull);
    }

    await tester.ensureVisible(syncRequiredButtons.first);
    await tester.tap(syncRequiredButtons.first, warnIfMissed: false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(LessonLaunchSetupPage), findsNothing);
    expect(find.text('Refresh sync before starting'), findsNothing);
    expect(
      find.text('1 assigned lesson is waiting for sync before launch.'),
      findsOneWidget,
    );

    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();
  });

  testWidgets(
      'live lesson shells without steps stay blocked on learner profile', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina Bello',
      age: 7,
      cohort: 'Pod A',
      podId: 'pod-a',
      podLabel: 'Pod A',
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
    const shellLesson = LessonCardModel(
      id: 'english-shell',
      moduleId: 'english',
      title: 'English greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Lesson shell is visible before activity steps sync.',
      steps: [],
    );

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false;
    addTearDown(state.dispose);
    state.learners.add(learner);
    state.assignedLessons.add(shellLesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-shell',
        lessonId: shellLesson.id,
        moduleId: shellLesson.moduleId,
        lessonTitle: shellLesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: LearnerProfilePage(state: state, learner: learner),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));

    final syncRequiredLabel = find.text('Sync required before starting');
    expect(syncRequiredLabel, findsNWidgets(2));
    expect(find.text('Sync incomplete'), findsOneWidget);
    expect(find.text('Ready'), findsNothing);
    expect(find.text('Start assigned lesson'), findsNothing);

    await tester.ensureVisible(syncRequiredLabel.first);
    await tester.tap(syncRequiredLabel.first, warnIfMissed: false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(LessonLaunchSetupPage), findsNothing);
    expect(find.text('Refresh sync before starting'), findsNothing);

    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();
  });

  test(
    'local-only learners stay blocked from launch until backend sync lands',
    () {
      const learner = LearnerProfile(
        id: 'learner-1',
        name: 'Amina Bello',
        age: 7,
        cohort: 'Pod A',
        podId: 'pod-a',
        podLabel: 'Pod A',
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
        enrollmentStatus: 'Needs backend sync',
      );
      const lesson = LessonCardModel(
        id: 'english-live-lesson',
        moduleId: 'english',
        title: 'English greeting lesson',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Lesson exists before learner registration is trusted.',
        steps: [
          LessonStep(
            id: 'step-1',
            type: LessonStepType.practice,
            title: 'Say hello',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Keep it warm.',
            realWorldCheck: 'Learner greets.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );
      const module = LearningModule(
        id: 'english',
        title: 'English',
        description: 'Live English path',
        voicePrompt: 'Open English.',
        readinessGoal: 'Greeting flow',
        badge: '1 lesson',
      );

      final state = LumoAppState(includeSeedDemoContent: false)
        ..usingFallbackData = false;
      addTearDown(state.dispose);
      state.modules.add(module);
      state.learners.add(learner);
      state.assignedLessons.add(lesson);
      state.assignmentPacks.add(
        LearnerAssignmentPack(
          assignmentId: 'assignment-live',
          lessonId: lesson.id,
          moduleId: lesson.moduleId,
          lessonTitle: lesson.title,
          eligibleLearnerIds: [learner.id],
        ),
      );

      expect(state.learnerCanOpenLesson(learner, lesson), isFalse);
      expect(state.nextAssignedLessonForLearner(learner), isNull);

      final availability = learnerLessonAvailability(
        state: state,
        learner: learner,
        lesson: lesson,
      );
      expect(
          availability.kind, LearnerLessonAvailabilityKind.backendSyncPending);
      expect(availability.label, 'Backend sync pending');
      expect(availability.canLaunch, isFalse);

      final subjectCards =
          buildLearnerSubjectCards(state: state, learner: learner);
      expect(subjectCards, hasLength(1));
      expect(subjectCards.single.statusLabel, 'Backend sync pending');
    },
  );

  testWidgets(
    'learner profile keeps local-only learners visibly blocked until backend sync lands',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const learner = LearnerProfile(
        id: 'learner-1',
        name: 'Amina Bello',
        age: 7,
        cohort: 'Pod A',
        podId: 'pod-a',
        podLabel: 'Pod A',
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
        enrollmentStatus: 'Needs backend sync',
      );
      const lesson = LessonCardModel(
        id: 'english-live-lesson',
        moduleId: 'english',
        title: 'English greeting lesson',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Lesson exists before learner registration is trusted.',
        steps: [
          LessonStep(
            id: 'step-1',
            type: LessonStepType.practice,
            title: 'Say hello',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Keep it warm.',
            realWorldCheck: 'Learner greets.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: false)
        ..usingFallbackData = false;
      addTearDown(state.dispose);
      state.learners.add(learner);
      state.assignedLessons.add(lesson);
      state.assignmentPacks.add(
        LearnerAssignmentPack(
          assignmentId: 'assignment-live',
          lessonId: lesson.id,
          moduleId: lesson.moduleId,
          lessonTitle: lesson.title,
          eligibleLearnerIds: [learner.id],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: LearnerProfilePage(state: state, learner: learner),
        ),
      );
      await tester.pump(const Duration(milliseconds: 500));

      expect(find.text('Backend sync pending'), findsAtLeastNWidgets(1));
      expect(find.text('Start assigned lesson'), findsNothing);
      final blockedButtons = find.widgetWithText(
        FilledButton,
        'Refresh sync before starting',
      );
      expect(blockedButtons, findsOneWidget);
      final button = tester.widget<FilledButton>(blockedButtons);
      expect(button.onPressed, isNull);
      expect(find.byType(LessonLaunchSetupPage), findsNothing);

      await state.flushPersistence();
    },
  );

  testWidgets(
      'learner profile does not offer resume when backend session cannot be matched to the next launchable lesson',
      (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    const learner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina Bello',
      age: 7,
      cohort: 'Pod A',
      podId: 'pod-a',
      podLabel: 'Pod A',
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
    const lesson = LessonCardModel(
      id: 'english-live-lesson',
      moduleId: 'english',
      title: 'English greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario:
          'Lesson should start fresh if resume payload cannot map back to it.',
      steps: [
        LessonStep(
          id: 'step-1',
          type: LessonStepType.practice,
          title: 'Say hello',
          instruction: 'Say hello.',
          expectedResponse: 'Hello',
          coachPrompt: 'Say hello.',
          facilitatorTip: 'Keep it warm.',
          realWorldCheck: 'Learner greets.',
          speakerMode: SpeakerMode.guiding,
        ),
      ],
    );

    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false;
    addTearDown(state.dispose);
    state.learners.add(learner);
    state.assignedLessons.add(lesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-live',
        lessonId: lesson.id,
        moduleId: lesson.moduleId,
        lessonTitle: lesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    );
    state.recentRuntimeSessionsByLearnerId[learner.id] = [
      BackendLessonSession(
        id: 'session-1',
        sessionId: 'session-1',
        studentId: learner.id,
        learnerCode: learner.learnerCode,
        lessonId: 'backend-alias-that-does-not-map',
        lessonTitle: 'Unmapped backend lesson alias',
        moduleId: 'other-module',
        moduleTitle: 'Other module',
        status: 'in_progress',
        completionState: 'in_progress',
        automationStatus: 'Backend thinks this is resumable.',
        currentStepIndex: 1,
        stepsTotal: 3,
        responsesCaptured: 1,
        supportActionsUsed: 0,
        audioCaptures: 0,
        facilitatorObservations: 0,
        startedAt: DateTime(2026, 5, 16, 10),
        lastActivityAt: DateTime(2026, 5, 16, 10, 5),
      ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: LearnerProfilePage(state: state, learner: learner),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Start assigned lesson'), findsOneWidget);
    expect(find.text('Resume assigned lesson'), findsNothing);
    expect(find.text('Resume lesson'), findsNothing);

    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();
  });
}
