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

    final syncRequiredButton = find.widgetWithText(
      FilledButton,
      'Sync required before starting',
    );
    expect(syncRequiredButton, findsOneWidget);
    expect(
      tester.widget<FilledButton>(syncRequiredButton).onPressed,
      isNull,
    );

    await tester.ensureVisible(syncRequiredButton);
    await tester.tap(syncRequiredButton, warnIfMissed: false);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(LessonLaunchSetupPage), findsNothing);
    expect(find.text('Refresh sync before starting'), findsNothing);

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
}
