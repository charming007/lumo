import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  group('learner subject copy', () {
    test(
        'recommended routing copy prefers learner subject labels over module titles',
        () {
      final state = LumoAppState(includeSeedDemoContent: false);
      final learner = const LearnerProfile(
        id: 'learner-1',
        name: 'Amina',
        age: 7,
        cohort: 'Alpha',
        streakDays: 2,
        guardianName: 'Zainab',
        preferredLanguage: 'Hausa',
        readinessLabel: 'Ready for guided practice',
        village: 'Pod 1',
        guardianPhone: '0800000000',
        sex: 'Girl',
        baselineLevel: 'No prior exposure',
        consentCaptured: true,
        learnerCode: 'AMI-AL07',
      );

      state.modules
        ..clear()
        ..add(const LearningModule(
          id: 'english-reading-module',
          title: 'Reading Foundations',
          description: 'Module metadata should stay operator-side.',
          voicePrompt: 'Open the reading module.',
          readinessGoal: 'Reading practice',
          badge: '1 lesson',
        ));
      state.learners
        ..clear()
        ..add(learner.copyWith(
            backendRecommendedModuleId: 'english-reading-module'));
      state.assignedLessons
        ..clear()
        ..add(
          LessonCardModel(
            id: 'english-reading-lesson',
            moduleId: 'english-reading-module',
            title: 'Read the greeting',
            subject: 'English',
            durationMinutes: 12,
            status: 'published',
            mascotName: 'Mallam',
            readinessFocus: 'Greeting flow',
            scenario:
                'Learner should see subject copy instead of module jargon.',
            steps: const [
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
          ),
        );

      expect(state.recommendedModuleLabelForLearner(learner), 'English');
      expect(
        state.nextLessonRouteSummaryForLearner(learner),
        contains('from English'),
      );
      expect(
        state.nextLessonRouteSummaryForLearner(learner,
            completedLessonId: 'english-reading-lesson'),
        contains('Open English to keep going.'),
      );
      state.dispose();
    });

    test(
        'live subject fallback copy stays learner-facing when subject metadata exists',
        () {
      final module = LearningModule.fromBackend({
        'id': 'english-reading-module',
        'title': 'Reading Foundations',
        'subjectName': 'English',
      });

      expect(module.title, 'Reading Foundations');
      expect(module.description, 'Live english path for english learners.');
      expect(module.voicePrompt,
          'We are opening English. Follow Mallam one step at a time.');
    });
  });
}
