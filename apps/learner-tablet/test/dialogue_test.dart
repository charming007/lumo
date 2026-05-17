import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/dialogue.dart';

void main() {
  group('LearnerDialogue', () {
    test('builds short continuation lines by remaining steps', () {
      expect(LearnerDialogue.continuation(remainingSteps: 0, seed: 0),
          'You did it.');
      expect(LearnerDialogue.continuation(remainingSteps: 1, seed: 0),
          'Nice. One more.');
      expect(LearnerDialogue.continuation(remainingSteps: 3, seed: 1),
          'Nice one. Next.');
    });

    test('builds warmer support prompts', () {
      expect(
        LearnerDialogue.supportPrompt(
          supportType: 'hint',
          learnerName: 'Amina',
          prompt: 'Ki fadi amsar.',
          expected: 'A is for ant.',
        ),
        'Amina, saurara kuma. Ki fadi amsar. Idan kina bukatar taimako, ki ce: A is for ant.',
      );
      expect(
        LearnerDialogue.supportStatus('model'),
        'Mallam ya bada amsar misali. Yanzu mai koyo zai maimaita.',
      );
    });
  });

  group('LumoAppState dialogue integration', () {
    test('uses reusable dialogue copy for accepted responses', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);

      final accepted = state.submitLearnerResponse('A');
      expect(accepted.accepted, isTrue);
      expect(accepted.automationStatus, 'Madalla. Mu ci gaba.');

      state.dispose();
      expect(
        LearnerDialogue.retryStatus(
          attemptNumber: 1,
          repeatAfterMe: false,
        ),
        'Ba daidai ba tukuna. Mallam zai bada karamar alama sannan a sake gwadawa.',
      );
    });

    test('uses reusable support status copy', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);

      state.useCoachSupport('hint');

      expect(
        state.activeSession?.automationStatus,
        'An ba da karamar alama. Yanzu mai koyo zai sake gwadawa.',
      );
      expect(
          state.activeSession?.transcript.last.text, contains('saurara kuma'));
      expect(state.activeSession?.transcript.last.text, contains('ki ce: A'));
      state.dispose();
    });
  });
}
