import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/dialogue.dart';

void main() {
  group('LearnerDialogue', () {
    test('builds short continuation lines by remaining steps', () {
      expect(LearnerDialogue.continuation(remainingSteps: 0, seed: 0), 'You did it.');
      expect(LearnerDialogue.continuation(remainingSteps: 1, seed: 0), 'Nice. One more.');
      expect(LearnerDialogue.continuation(remainingSteps: 3, seed: 1), 'Nice one. Next.');
    });

    test('builds warmer support prompts', () {
      expect(
        LearnerDialogue.supportPrompt(
          supportType: 'hint',
          learnerName: 'Amina',
          prompt: 'Say the answer.',
          expected: 'A is for ant.',
        ),
        'Amina, listen again. Say the answer. If you need help, say: A is for ant.',
      );
      expect(
        LearnerDialogue.supportStatus('model'),
        'Model answer played. Now the learner repeats it.',
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
      expect(accepted.automationStatus, 'Mallam got it. Let\'s keep moving.');

      state.dispose();
      expect(
        LearnerDialogue.retryStatus(
          attemptNumber: 1,
          repeatAfterMe: false,
        ),
        'Not quite yet. Mallam will give a small hint and try again.',
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
        'Small hint given. The learner can try again now.',
      );
      expect(state.activeSession?.transcript.last.text, contains('listen again'));
      state.dispose();
    });
  });
}
