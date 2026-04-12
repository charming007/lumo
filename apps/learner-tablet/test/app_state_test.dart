import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  group('LumoAppState learner assignment flow', () {
    final beginner = LearnerProfile(
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

    final emerging = beginner.copyWith(
      id: 'learner-2',
      name: 'Musa',
      readinessLabel: 'Ready for guided practice',
      learnerCode: 'MUS-AL08',
      sex: 'Boy',
    );

    final confident = beginner.copyWith(
      id: 'learner-3',
      name: 'Halima',
      readinessLabel: 'Confident responder',
      learnerCode: 'HAL-AL09',
    );

    test('ranks english first for voice-first beginners', () {
      final state = LumoAppState();

      final lessons = state.lessonsForLearner(beginner);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'english');
      expect(state.nextAssignedLessonForLearner(beginner)?.moduleId, 'english');
    });

    test('ranks math first for guided practice learners', () {
      final state = LumoAppState();

      final lessons = state.lessonsForLearner(emerging);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'math');
    });

    test('ranks story first for confident responders', () {
      final state = LumoAppState();

      final lessons = state.lessonsForLearner(confident);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'story');
      expect(
          state.recommendedModuleLabelForLearner(confident), contains('Story'));
    });

    test('assigned lesson summary reflects next lesson title', () {
      final state = LumoAppState();

      final summary = state.assignedLessonSummaryForLearner(beginner);
      final nextLesson = state.nextAssignedLessonForLearner(beginner);

      expect(nextLesson, isNotNull);
      expect(summary, contains(nextLesson!.title));
      expect(summary, contains('assigned lesson'));
    });

    test('prefers backend assignment packs over heuristic lesson order', () {
      final state = LumoAppState();
      final storyLesson = state.assignedLessons
          .firstWhere((lesson) => lesson.moduleId == 'story');

      state.assignmentPacks.add(
        LearnerAssignmentPack(
          assignmentId: 'assignment-1',
          lessonId: storyLesson.id,
          moduleId: storyLesson.moduleId,
          lessonTitle: storyLesson.title,
          cohortName: beginner.cohort,
          mallamName: 'Mallam Idris',
          dueDate: '2026-04-20T10:00:00.000Z',
          assessmentTitle: 'Story check',
          eligibleLearnerIds: [beginner.id],
        ),
      );

      final lessons = state.lessonsForLearner(beginner);
      final nextPack = state.nextAssignmentPackForLearner(beginner);

      expect(nextPack, isNotNull);
      expect(lessons.first.id, storyLesson.id);
      expect(state.backendRoutingSummaryForLearner(beginner),
          contains('Mallam Idris'));
    });

    test('uses backend recommended module when available', () {
      final state = LumoAppState();
      final learner = beginner.copyWith(backendRecommendedModuleId: 'math');

      expect(state.recommendedModuleLabelForLearner(learner), contains('Math'));
      expect(state.recommendedModuleForLearner(learner).id, 'math');
    });
  });
}
