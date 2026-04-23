import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  testWidgets(
      'subject page keeps the selected learner scoped to their own subject lessons',
      (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    const learnerA = LearnerProfile(
      id: 'learner-a',
      name: 'Amina',
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
    const learnerB = LearnerProfile(
      id: 'learner-b',
      name: 'Bashir',
      age: 8,
      cohort: 'Pod A',
      podId: 'pod-a',
      podLabel: 'Pod A',
      streakDays: 1,
      guardianName: 'Aisha',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Kawo',
      guardianPhone: '0800000001',
      sex: 'Boy',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'BAS-001',
    );
    const module = LearningModule(
      id: 'english',
      title: 'English',
      description: 'Live English path',
      voicePrompt: 'Open English.',
      readinessGoal: 'Greeting flow',
      badge: '2 lessons',
    );
    const learnerALesson = LessonCardModel(
      id: 'english-amina',
      moduleId: 'english',
      title: 'Amina greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Learner A lesson',
      steps: [
        LessonStep(
          id: 'step-a',
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
    const learnerBLesson = LessonCardModel(
      id: 'english-bashir',
      moduleId: 'english',
      title: 'Bashir greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Learner B lesson',
      steps: [
        LessonStep(
          id: 'step-b',
          type: LessonStepType.practice,
          title: 'Wave hello',
          instruction: 'Wave hello.',
          expectedResponse: 'Hello',
          coachPrompt: 'Wave hello.',
          facilitatorTip: 'Model the wave.',
          realWorldCheck: 'Learner greets',
          speakerMode: SpeakerMode.guiding,
        ),
      ],
    );

    final state = LumoAppState(includeSeedDemoContent: false);
    addTearDown(state.dispose);
    state.usingFallbackData = false;
    state.modules.add(module);
    state.learners.addAll([learnerA, learnerB]);
    state.assignedLessons.addAll([learnerALesson, learnerBLesson]);
    state.assignmentPacks.addAll([
      LearnerAssignmentPack(
        assignmentId: 'assignment-a',
        lessonId: learnerALesson.id,
        moduleId: learnerALesson.moduleId,
        lessonTitle: learnerALesson.title,
        eligibleLearnerIds: [learnerA.id],
      ),
      LearnerAssignmentPack(
        assignmentId: 'assignment-b',
        lessonId: learnerBLesson.id,
        moduleId: learnerBLesson.moduleId,
        lessonTitle: learnerBLesson.title,
        eligibleLearnerIds: [learnerB.id],
      ),
    ]);
    state.selectLearner(learnerA);
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
    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();

    expect(find.text(learnerALesson.title), findsOneWidget);
    expect(find.text(learnerBLesson.title), findsNothing);
  });

  testWidgets(
      'subject page ignores stale learner scope when opened from the home subject grid', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    const lockedLearner = LearnerProfile(
      id: 'locked-learner',
      name: 'Amina',
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
    const availableLearner = LearnerProfile(
      id: 'available-learner',
      name: 'Bashir',
      age: 8,
      cohort: 'Pod A',
      podId: 'pod-a',
      podLabel: 'Pod A',
      streakDays: 1,
      guardianName: 'Aisha',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Kawo',
      guardianPhone: '0800000001',
      sex: 'Boy',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'BAS-001',
    );
    const module = LearningModule(
      id: 'english',
      title: 'English',
      description: 'Live English path',
      voicePrompt: 'Open English.',
      readinessGoal: 'Greeting flow',
      badge: '1 lesson',
    );
    const lesson = LessonCardModel(
      id: 'english-bashir',
      moduleId: 'english',
      title: 'Bashir greeting lesson',
      subject: 'English',
      durationMinutes: 8,
      status: 'published',
      mascotName: 'Mallam',
      readinessFocus: 'Greeting flow',
      scenario: 'Only Bashir can open this lesson.',
      steps: [
        LessonStep(
          id: 'step-b',
          type: LessonStepType.practice,
          title: 'Wave hello',
          instruction: 'Wave hello.',
          expectedResponse: 'Hello',
          coachPrompt: 'Wave hello.',
          facilitatorTip: 'Model the wave.',
          realWorldCheck: 'Learner greets',
          speakerMode: SpeakerMode.guiding,
        ),
      ],
    );

    final state = LumoAppState(includeSeedDemoContent: false);
    addTearDown(state.dispose);
    state.usingFallbackData = false;
    state.modules.add(module);
    state.learners.addAll([lockedLearner, availableLearner]);
    state.assignedLessons.add(lesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-b',
        lessonId: lesson.id,
        moduleId: lesson.moduleId,
        lessonTitle: lesson.title,
        eligibleLearnerIds: [availableLearner.id],
      ),
    );
    state.selectLearner(lockedLearner);
    state.selectModule(module);

    await tester.pumpWidget(
      MaterialApp(
        home: SubjectModulesPage(
          state: state,
          onChanged: () {},
          module: module,
          forceUnscopedLessons: true,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();

    expect(find.text(lesson.title), findsOneWidget);
    expect(find.text('No learner-safe lessons are ready in English yet.'),
        findsNothing);
  });

  testWidgets(
      'subject page marks the guided next lesson for the selected learner', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    addTearDown(state.dispose);

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
    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();

    expect(find.text(nextLesson.title), findsOneWidget);
    expect(find.text('Start next lesson'), findsOneWidget);
  });

  testWidgets(
      'subject page keeps learner lessons visible when backend recommends an alias module id', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    const learner = LearnerProfile(
      id: 'learner-a',
      name: 'Amina',
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
      backendRecommendedModuleId: 'english-reading-module',
    );
    const recommendedModule = LearningModule(
      id: 'english-reading-module',
      title: 'English Reading',
      description: 'Backend alias module title differs from learner subject.',
      voicePrompt: 'Open English reading.',
      readinessGoal: 'Keep English moving.',
      badge: 'Alias',
    );
    const canonicalModule = LearningModule(
      id: 'english',
      title: 'English',
      description: 'Canonical learner-facing subject.',
      voicePrompt: 'Open English.',
      readinessGoal: 'Greeting flow',
      badge: 'Live',
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
      scenario: 'Learner should still see this from the alias route.',
      steps: [
        LessonStep(
          id: 'step-a',
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

    final state = LumoAppState(includeSeedDemoContent: false);
    addTearDown(state.dispose);
    state.usingFallbackData = false;
    state.learners.add(learner);
    state.modules.addAll([recommendedModule, canonicalModule]);
    state.assignedLessons.add(lesson);
    state.assignmentPacks.add(
      LearnerAssignmentPack(
        assignmentId: 'assignment-a',
        lessonId: lesson.id,
        moduleId: lesson.moduleId,
        lessonTitle: lesson.title,
        eligibleLearnerIds: [learner.id],
      ),
    );
    state.selectLearner(learner);
    state.selectModule(recommendedModule);

    await tester.pumpWidget(
      MaterialApp(
        home: SubjectModulesPage(
          state: state,
          onChanged: () {},
          module: recommendedModule,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('English greeting lesson'), findsOneWidget);
    expect(
      find.text('No learner-safe lessons are ready in English Reading yet.'),
      findsNothing,
    );
  });
}
