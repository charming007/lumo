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
    if (repeated) {
      return 'Mallam ya ji maimaitawa da kyau. Mu wuce zuwa na gaba.';
    }
    if (independent) {
      return 'Mallam ya ji amsa a sarari. Mu wuce zuwa na gaba.';
    }
    return 'Madalla. Mu ci gaba.';
  }

  static String retryStatus(
      {required int attemptNumber, required bool repeatAfterMe}) {
    if (repeatAfterMe) {
      return 'Mallam zai sake fada. Mai koyo zai kara maimaitawa sau daya.';
    }
    if (attemptNumber >= 2) {
      return 'Mallam zai bada misali sau daya, sannan mai koyo ya sake gwadawa.';
    }
    return 'Ba daidai ba tukuna. Mallam zai bada karamar alama sannan a sake gwadawa.';
  }

  static String supportPrompt({
    required String supportType,
    required String learnerName,
    required String prompt,
    required String expected,
    String supportLanguage = 'Hausa',
    String targetLanguage = 'English',
  }) {
    final usesHausaSupport = supportLanguage.trim().toLowerCase() == 'hausa' &&
        targetLanguage.trim().toLowerCase() == 'english';

    switch (supportType) {
      case 'hint':
        return usesHausaSupport
            ? '$learnerName, saurara kuma. $prompt Idan kina bukatar taimako, ki ce: $expected'
            : '$learnerName, listen again. $prompt If you need help, say: $expected';
      case 'model':
        return usesHausaSupport
            ? 'Da farko ni zan fada, $learnerName. Ki fada tare da ni: $expected'
            : 'My turn first, $learnerName. Say it with me: $expected';
      case 'slow':
        return usesHausaSupport
            ? 'Mu yi a hankali, $learnerName. $prompt'
            : 'Let\'s take it slowly, $learnerName. $prompt';
      case 'wait':
        return usesHausaSupport
            ? 'Ki dauki lokaci, $learnerName. Ina nan.'
            : 'Take your time, $learnerName. I am here.';
      case 'translate':
        return usesHausaSupport
            ? 'Za mu yi bayanin a Hausa, sannan mu koma amsar Turanci: $expected'
            : 'Give the prompt in the learner\'s stronger language, then come back to the target answer.';
      default:
        return prompt;
    }
  }

  static String supportStatus(String supportType) {
    switch (supportType) {
      case 'hint':
        return 'An ba da karamar alama. Yanzu mai koyo zai sake gwadawa.';
      case 'model':
        return 'Mallam ya bada amsar misali. Yanzu mai koyo zai maimaita.';
      case 'slow':
        return 'An sake fada a hankali. Yanzu mai koyo zai amsa.';
      case 'translate':
        return 'An bada taimakon Hausa. Yanzu mai koyo zai amsa a Turanci.';
      case 'wait':
        return 'Lokacin tunani ya kare. Yanzu mai koyo zai amsa.';
      default:
        return 'Mallam ya sake fada. Yanzu mai koyo zai amsa.';
    }
  }

  static String promptReady({bool resumed = false}) {
    return resumed
        ? 'Mun dawo. Ki saurara, sannan ki amsa.'
        : 'Mallam ya gama. Yanzu naki ne.';
  }

  static String replayedPrompt() =>
      'Mallam ya sake fada. Mai koyo zai iya sake sauraro.';

  static String movingToNext() =>
      'An karbi amsa mai kyau. Mallam yana wucewa zuwa na gaba.';
}
