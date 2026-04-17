import 'models.dart';

class LearnerDialogue {
  static String greeting({String? learnerName}) {
    final name = learnerName?.trim();
    return name == null || name.isEmpty
        ? 'Assalamu alaikum. Ready?'
        : 'Assalamu alaikum, $name. Ready?';
  }

  static String introPrompt(LessonStep step) {
    switch (step.type) {
      case LessonStepType.intro:
        return 'Listen first, then say it with me.';
      case LessonStepType.prompt:
        return 'Listen, then give me the next answer.';
      case LessonStepType.practice:
        return 'Your turn. Try it.';
      case LessonStepType.reflection:
        return 'Say it in one clear sentence.';
      case LessonStepType.celebration:
        return 'Nice. Say it proudly.';
    }
  }

  static String continuation({required int remainingSteps, required int seed}) {
    if (remainingSteps <= 0) return 'You did it.';
    if (remainingSteps == 1) return 'Nice. One more.';
    const lines = [
      'Good. Keep going.',
      'Nice one. Next.',
      'Yes. Keep going.',
      'Good work. Keep moving.',
      'That\'s it. Next one.',
    ];
    return lines[seed % lines.length];
  }

  static String successStatus(
      {required bool independent, required bool repeated}) {
    if (repeated) return 'Mallam heard a clear repeat. Time for the next one.';
    if (independent) return 'Mallam got a clear answer. On to the next one.';
    return 'Mallam got it. Let\'s keep moving.';
  }

  static String retryStatus(
      {required int attemptNumber, required bool repeatAfterMe}) {
    if (repeatAfterMe) {
      return 'Mallam will say it again. The learner can echo once more.';
    }
    if (attemptNumber >= 2) {
      return 'Mallam will model it once, then the learner tries again.';
    }
    return 'Not quite yet. Mallam will give a small hint and try again.';
  }

  static String supportPrompt({
    required String supportType,
    required String learnerName,
    required String prompt,
    required String expected,
  }) {
    switch (supportType) {
      case 'hint':
        return '$learnerName, listen again. $prompt If you need help, say: $expected';
      case 'model':
        return 'My turn first, $learnerName. Say it with me: $expected';
      case 'slow':
        return 'Let\'s take it slowly, $learnerName. $prompt';
      case 'wait':
        return 'Take your time, $learnerName. I am here.';
      case 'translate':
        return 'Give the prompt in the learner\'s stronger language, then come back to the target answer.';
      default:
        return prompt;
    }
  }

  static String supportStatus(String supportType) {
    switch (supportType) {
      case 'hint':
        return 'Small hint given. The learner can try again now.';
      case 'model':
        return 'Model answer played. Now the learner repeats it.';
      case 'slow':
        return 'Slow replay done. The learner can answer now.';
      case 'translate':
        return 'Translation support played. The learner can answer now.';
      case 'wait':
        return 'Think time is over. The learner can answer now.';
      default:
        return 'Mallam replayed the line. The learner can answer now.';
    }
  }

  static String promptReady({bool resumed = false}) {
    return resumed
        ? 'We are back. Listen, then answer.'
        : 'Mallam is done. It\'s your turn.';
  }

  static String replayedPrompt() =>
      'Mallam said it again. The learner can listen once more.';

  static String movingToNext() => 'Good answer captured. Mallam is moving on.';
}
