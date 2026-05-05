import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  testWidgets(
    'subject page keeps the selected learner scoped to their own subject lessons',
    (tester) async {
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
    },
  );

  testWidgets(
    'subject page ignores stale learner scope when opened from the home subject grid',
    (tester) async {
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
      expect(
        find.text('No learner-safe lessons are ready in English yet.'),
        findsNothing,
      );
    },
  );

  testWidgets(
    'subject page shows completed and locked lesson states for the learner',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      addTearDown(state.dispose);

      final learner = state.learners.first;
      const module = LearningModule(
        id: 'progression-module',
        title: 'Progression Module',
        description: 'Test module',
        voicePrompt: 'Open progression module.',
        readinessGoal: 'Progress forward.',
        badge: '2 lessons',
      );
      const moduleLessons = [
        LessonCardModel(
          id: 'progression-lesson-1',
          moduleId: 'progression-module',
          title: 'Lesson One',
          subject: 'Progression',
          durationMinutes: 8,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'First step',
          scenario: 'Start here.',
          steps: [
            LessonStep(
              id: 'progression-step-1',
              type: LessonStepType.intro,
              title: 'Intro',
              instruction: 'Start.',
              expectedResponse: 'Start',
              coachPrompt: 'Start.',
              facilitatorTip: 'Guide the learner.',
              realWorldCheck: 'Learner starts.',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
        LessonCardModel(
          id: 'progression-lesson-2',
          moduleId: 'progression-module',
          title: 'Lesson Two',
          subject: 'Progression',
          durationMinutes: 9,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'Second step',
          scenario: 'Continue here.',
          steps: [
            LessonStep(
              id: 'progression-step-2',
              type: LessonStepType.intro,
              title: 'Continue',
              instruction: 'Continue.',
              expectedResponse: 'Continue',
              coachPrompt: 'Continue.',
              facilitatorTip: 'Guide the learner.',
              realWorldCheck: 'Learner continues.',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
      ];

      state.modules.add(module);
      state.assignedLessons.addAll(moduleLessons);
      state.selectLearner(learner);
      state.selectModule(module);
      state.startLesson(moduleLessons.first);
      await state.completeLesson(moduleLessons.first);

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

      expect(find.text(moduleLessons.first.title), findsOneWidget);
      expect(find.text('Completed'), findsWidgets);
      expect(find.text(moduleLessons[1].title), findsOneWidget);
      expect(find.text('Start next lesson'), findsOneWidget);
      expect(find.text('Locked'), findsNothing);
    },
  );

  testWidgets(
    'subject page keeps completed lessons visible after every assigned learner finishes available work',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: false)
        ..isBootstrapping = false
        ..usingFallbackData = false
        ..registrationContext = const RegistrationContext(
          tabletRegistration: TabletRegistration(
            id: 'tablet-1',
            podId: 'pod-1',
            podLabel: 'Pod 1',
          ),
        );
      addTearDown(state.dispose);

      const learnerA = LearnerProfile(
        id: 'learner-a',
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
        village: 'Pod 1',
        guardianPhone: '0800000000',
        sex: 'Girl',
        baselineLevel: 'No prior exposure',
        consentCaptured: true,
        learnerCode: 'AMI-AL07',
      );
      const learnerB = LearnerProfile(
        id: 'learner-b',
        name: 'Bello Musa',
        age: 8,
        cohort: 'Alpha',
        cohortId: 'cohort-1',
        podId: 'pod-1',
        podLabel: 'Pod 1',
        streakDays: 2,
        guardianName: 'Aisha',
        preferredLanguage: 'Hausa',
        readinessLabel: 'Voice-first beginner',
        village: 'Pod 1',
        guardianPhone: '0800000001',
        sex: 'Boy',
        baselineLevel: 'No prior exposure',
        consentCaptured: true,
        learnerCode: 'BEL-AL08',
      );
      const module = LearningModule(
        id: 'english-reading-module',
        title: 'Reading Foundations',
        description: 'Reading path',
        voicePrompt: 'Open reading.',
        readinessGoal: 'Greeting flow',
        badge: '1 lesson',
        status: 'published',
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
        scenario: 'Completed lessons must stay visible on subject page.',
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

      state.learners
        ..clear()
        ..addAll([learnerA, learnerB]);
      state.modules
        ..clear()
        ..add(module);
      state.assignedLessons
        ..clear()
        ..add(lesson);
      final now = DateTime.now();
      state.recentRuntimeSessionsByLearnerId[learnerA.id] = [
        BackendLessonSession(
          id: 'session-a',
          sessionId: 'session-a',
          studentId: learnerA.id,
          learnerCode: learnerA.learnerCode,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          moduleId: lesson.moduleId,
          moduleTitle: module.title,
          status: 'completed',
          completionState: 'completed',
          automationStatus: 'Completed on this tablet.',
          currentStepIndex: lesson.steps.length,
          stepsTotal: lesson.steps.length,
          responsesCaptured: lesson.steps.length,
          supportActionsUsed: 0,
          audioCaptures: 0,
          facilitatorObservations: 0,
          completedAt: now,
          lastActivityAt: now,
          startedAt: now,
        ),
      ];
      state.recentRuntimeSessionsByLearnerId[learnerB.id] = [
        BackendLessonSession(
          id: 'session-b',
          sessionId: 'session-b',
          studentId: learnerB.id,
          learnerCode: learnerB.learnerCode,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          moduleId: lesson.moduleId,
          moduleTitle: module.title,
          status: 'completed',
          completionState: 'completed',
          automationStatus: 'Completed on this tablet.',
          currentStepIndex: lesson.steps.length,
          stepsTotal: lesson.steps.length,
          responsesCaptured: lesson.steps.length,
          supportActionsUsed: 0,
          audioCaptures: 0,
          facilitatorObservations: 0,
          completedAt: now,
          lastActivityAt: now,
          startedAt: now,
        ),
      ];

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

      expect(find.text(lesson.title), findsOneWidget);
      expect(find.text('Tafiyar darasi'), findsOneWidget);
      expect(
        find.text('All available lessons in English are complete for today.'),
        findsNothing,
      );
      expect(
        find.text('No learner-safe lessons are ready in English yet.'),
        findsNothing,
      );
    },
  );

  testWidgets(
    'subject page marks the guided next lesson for the selected learner',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: true);
      addTearDown(state.dispose);

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
      await tester.pump(const Duration(milliseconds: 500));
      await state.flushPersistence();

      expect(find.text(nextLesson.title), findsOneWidget);
      expect(find.text('Start next lesson'), findsOneWidget);
    },
  );

  testWidgets('subject page shows locked lessons before progression advances', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    addTearDown(state.dispose);

    final learner = state.learners.first;
    const module = LearningModule(
      id: 'progression-module',
      title: 'Progression Module',
      description: 'Test module',
      voicePrompt: 'Open progression module.',
      readinessGoal: 'Progress forward.',
      badge: '2 lessons',
    );
    const moduleLessons = [
      LessonCardModel(
        id: 'progression-lesson-1',
        moduleId: 'progression-module',
        title: 'Lesson One',
        subject: 'Progression',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'First step',
        scenario: 'Start here.',
        steps: [
          LessonStep(
            id: 'progression-step-1',
            type: LessonStepType.intro,
            title: 'Intro',
            instruction: 'Start.',
            expectedResponse: 'Start',
            coachPrompt: 'Start.',
            facilitatorTip: 'Guide the learner.',
            realWorldCheck: 'Learner starts.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      ),
      LessonCardModel(
        id: 'progression-lesson-2',
        moduleId: 'progression-module',
        title: 'Lesson Two',
        subject: 'Progression',
        durationMinutes: 9,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Second step',
        scenario: 'Continue here.',
        steps: [
          LessonStep(
            id: 'progression-step-2',
            type: LessonStepType.intro,
            title: 'Continue',
            instruction: 'Continue.',
            expectedResponse: 'Continue',
            coachPrompt: 'Continue.',
            facilitatorTip: 'Guide the learner.',
            realWorldCheck: 'Learner continues.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      ),
    ];

    state.modules.add(module);
    state.assignedLessons.addAll(moduleLessons);
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

    expect(find.text(moduleLessons.first.title), findsOneWidget);
    expect(find.text(moduleLessons[1].title), findsOneWidget);
    expect(find.text('Locked'), findsOneWidget);
    expect(find.text('Start next lesson'), findsOneWidget);
  });

  testWidgets(
    'subject page keeps completed later lessons visible after live assignments narrow',
    (tester) async {
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
      );
      const module = LearningModule(
        id: 'english',
        title: 'English',
        description: 'Greeting path',
        voicePrompt: 'Open English.',
        readinessGoal: 'Greeting flow',
        badge: '2 lessons',
      );
      const lessonOne = LessonCardModel(
        id: 'english-1',
        moduleId: 'english',
        title: 'Hear and say hello',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Start here.',
        steps: [
          LessonStep(
            id: 'english-1-step',
            type: LessonStepType.intro,
            title: 'Hello',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Model hello.',
            realWorldCheck: 'Learner greets.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );
      const lessonTwo = LessonCardModel(
        id: 'english-2',
        moduleId: 'english',
        title: 'Ask how are you',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Second greeting step',
        scenario: 'Continue here.',
        steps: [
          LessonStep(
            id: 'english-2-step',
            type: LessonStepType.intro,
            title: 'How are you',
            instruction: 'Ask how are you.',
            expectedResponse: 'How are you?',
            coachPrompt: 'Ask how are you.',
            facilitatorTip: 'Guide the learner.',
            realWorldCheck: 'Learner asks clearly.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: false)
        ..usingFallbackData = false;
      addTearDown(state.dispose);
      state.learners.add(learner);
      state.modules.add(module);
      state.assignedLessons.addAll([lessonOne, lessonTwo]);
      state.assignmentPacks.add(
        LearnerAssignmentPack(
          assignmentId: 'assignment-1',
          lessonId: lessonOne.id,
          moduleId: lessonOne.moduleId,
          curriculumModuleId: lessonOne.moduleId,
          lessonTitle: lessonOne.title,
          eligibleLearnerIds: [learner.id],
        ),
      );
      state.recentRuntimeSessionsByLearnerId[learner.id] = [
        BackendLessonSession(
          id: 'session-2',
          sessionId: 'session-2',
          studentId: learner.id,
          learnerCode: learner.learnerCode,
          lessonId: lessonTwo.id,
          lessonTitle: lessonTwo.title,
          moduleId: lessonTwo.moduleId,
          moduleTitle: module.title,
          status: 'completed',
          completionState: 'completed',
          automationStatus: 'Completed.',
          currentStepIndex: lessonTwo.steps.length,
          stepsTotal: lessonTwo.steps.length,
          responsesCaptured: 1,
          supportActionsUsed: 0,
          audioCaptures: 0,
          facilitatorObservations: 0,
          completedAt: DateTime.now(),
        ),
      ];
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

      expect(find.text(lessonOne.title), findsOneWidget);
      expect(find.text(lessonTwo.title), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('Start next lesson'), findsOneWidget);
    },
  );

  testWidgets(
    'subject page keeps completed later lessons visible in the unscoped re-entry flow after assignments narrow',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const learner = LearnerProfile(
        id: 'learner-a',
        name: 'Amina',
        age: 7,
        cohort: 'Pod A',
        cohortId: 'cohort-a',
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
      const module = LearningModule(
        id: 'english',
        title: 'English',
        description: 'Greeting path',
        voicePrompt: 'Open English.',
        readinessGoal: 'Greeting flow',
        badge: '2 lessons',
      );
      const lessonOne = LessonCardModel(
        id: 'english-1',
        moduleId: 'english',
        title: 'Hear and say hello',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Still assigned after re-entry.',
        steps: [
          LessonStep(
            id: 'english-1-step',
            type: LessonStepType.intro,
            title: 'Hello',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Model hello.',
            realWorldCheck: 'Learner greets.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );
      const lessonTwo = LessonCardModel(
        id: 'english-2',
        moduleId: 'english',
        title: 'Ask how are you',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Second greeting step',
        scenario: 'Should remain visible after re-entry.',
        steps: [
          LessonStep(
            id: 'english-2-step',
            type: LessonStepType.intro,
            title: 'How are you',
            instruction: 'Ask how are you.',
            expectedResponse: 'How are you?',
            coachPrompt: 'Ask how are you.',
            facilitatorTip: 'Guide the learner.',
            realWorldCheck: 'Learner asks clearly.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: false)
        ..isBootstrapping = false
        ..usingFallbackData = false
        ..registrationContext = const RegistrationContext(
          tabletRegistration: TabletRegistration(
            id: 'tablet-1',
            podId: 'pod-a',
            podLabel: 'Pod A',
          ),
        );
      addTearDown(state.dispose);

      state.learners
        ..clear()
        ..add(learner);
      state.modules
        ..clear()
        ..add(module);
      state.assignedLessons
        ..clear()
        ..addAll([lessonOne, lessonTwo]);
      state.assignmentPacks
        ..clear()
        ..add(
          LearnerAssignmentPack(
            assignmentId: 'assignment-1',
            lessonId: lessonOne.id,
            moduleId: lessonOne.moduleId,
            curriculumModuleId: lessonOne.moduleId,
            lessonTitle: lessonOne.title,
            eligibleLearnerIds: [learner.id],
          ),
        );
      state.recentRuntimeSessionsByLearnerId[learner.id] = [
        BackendLessonSession(
          id: 'session-2',
          sessionId: 'session-2',
          studentId: learner.id,
          learnerCode: learner.learnerCode,
          lessonId: lessonTwo.id,
          lessonTitle: lessonTwo.title,
          moduleId: lessonTwo.moduleId,
          moduleTitle: module.title,
          status: 'completed',
          completionState: 'completed',
          automationStatus: 'Completed on this tablet.',
          currentStepIndex: lessonTwo.steps.length,
          stepsTotal: lessonTwo.steps.length,
          responsesCaptured: lessonTwo.steps.length,
          supportActionsUsed: 0,
          audioCaptures: 0,
          facilitatorObservations: 0,
          completedAt: DateTime.now(),
          lastActivityAt: DateTime.now(),
          startedAt: DateTime.now(),
        ),
      ];

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

      expect(find.text('Tafiyar darasi'), findsOneWidget);
      expect(find.text(lessonOne.title), findsOneWidget);
      expect(find.text(lessonTwo.title), findsOneWidget);
      expect(find.text('Start next lesson'), findsOneWidget);
      expect(
        find.text('No learner-safe lessons are ready in English yet.'),
        findsNothing,
      );
      expect(
        find.text(
          'All available lessons in English are complete for today.',
        ),
        findsNothing,
      );
    },
  );

  testWidgets(
    'subject page keeps completed tap-to-act lessons visible when runtime history reports an alias lesson id',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1400, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      const learner = LearnerProfile(
        id: 'learner-a',
        name: 'Amina',
        age: 7,
        cohort: 'Pod A',
        cohortId: 'cohort-a',
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
      const module = LearningModule(
        id: 'english',
        title: 'English',
        description: 'Greeting path',
        voicePrompt: 'Open English.',
        readinessGoal: 'Greeting flow',
        badge: '2 lessons',
      );
      const lessonOne = LessonCardModel(
        id: 'english-1',
        moduleId: 'english',
        title: 'Hear and say hello',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Greeting flow',
        scenario: 'Still assigned after re-entry.',
        steps: [
          LessonStep(
            id: 'english-1-step',
            type: LessonStepType.intro,
            title: 'Hello',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Model hello.',
            realWorldCheck: 'Learner greets.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );
      const lessonTwo = LessonCardModel(
        id: 'english-2',
        moduleId: 'tap-to-act-package',
        title: 'Tap the greeting card',
        subject: 'English Tap to Act',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Tap to Act follow-up',
        scenario: 'Should remain visible after alias runtime re-entry.',
        steps: [
          LessonStep(
            id: 'english-2-step',
            type: LessonStepType.practice,
            title: 'Pick the greeting',
            instruction: 'Tap the hello card.',
            expectedResponse: 'hello',
            coachPrompt: 'Tap the hello card.',
            facilitatorTip: 'Guide the learner to the right card.',
            realWorldCheck: 'Learner picks the greeting card.',
            speakerMode: SpeakerMode.guiding,
            activity: LessonActivity(
              type: LessonActivityType.tapChoice,
              prompt: 'Tap hello.',
              targetResponse: 'hello',
              choices: ['hello', 'book'],
            ),
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: false)
        ..isBootstrapping = false
        ..usingFallbackData = false
        ..registrationContext = const RegistrationContext(
          tabletRegistration: TabletRegistration(
            id: 'tablet-1',
            podId: 'pod-a',
            podLabel: 'Pod A',
          ),
        );
      addTearDown(state.dispose);

      state.learners
        ..clear()
        ..add(learner);
      state.modules
        ..clear()
        ..add(module);
      state.assignedLessons
        ..clear()
        ..addAll([lessonOne, lessonTwo]);
      state.assignmentPacks
        ..clear()
        ..add(
          LearnerAssignmentPack(
            assignmentId: 'assignment-1',
            lessonId: lessonOne.id,
            moduleId: lessonOne.moduleId,
            curriculumModuleId: lessonOne.moduleId,
            lessonTitle: lessonOne.title,
            eligibleLearnerIds: [learner.id],
          ),
        );
      state.recentRuntimeSessionsByLearnerId[learner.id] = [
        BackendLessonSession(
          id: 'session-2',
          sessionId: 'session-2',
          studentId: learner.id,
          learnerCode: learner.learnerCode,
          lessonId: 'tap-to-act-runtime-alias',
          lessonTitle: lessonTwo.title,
          moduleId: 'tap-to-act-package',
          moduleTitle: 'English Tap to Act',
          status: 'completed',
          completionState: 'completed',
          automationStatus: 'Completed on this tablet.',
          currentStepIndex: lessonTwo.steps.length,
          stepsTotal: lessonTwo.steps.length,
          responsesCaptured: lessonTwo.steps.length,
          supportActionsUsed: 0,
          audioCaptures: 0,
          facilitatorObservations: 0,
          completedAt: DateTime.now(),
          lastActivityAt: DateTime.now(),
          startedAt: DateTime.now(),
        ),
      ];

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

      expect(find.text('Tafiyar darasi'), findsOneWidget);
      expect(find.text(lessonOne.title), findsOneWidget);
      expect(find.text(lessonTwo.title), findsOneWidget);
      expect(find.text('Start next lesson'), findsOneWidget);
      expect(
        find.text('No learner-safe lessons are ready in English yet.'),
        findsNothing,
      );
    },
  );

  testWidgets(
    'subject page keeps learner lessons visible when backend recommends an alias module id',
    (tester) async {
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
    },
  );
}
