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
  });
}
