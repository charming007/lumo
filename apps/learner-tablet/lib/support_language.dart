enum MallamSupportLanguage { hausa, english }

extension MallamSupportLanguageX on MallamSupportLanguage {
  String get code => this == MallamSupportLanguage.hausa ? 'hausa' : 'english';
  String get label => this == MallamSupportLanguage.hausa ? 'Hausa' : 'English';
  bool get isHausa => this == MallamSupportLanguage.hausa;
}

class MallamSupportCopy {
  final MallamSupportLanguage language;

  const MallamSupportCopy._(this.language);

  factory MallamSupportCopy.forLanguage(MallamSupportLanguage language) =>
      MallamSupportCopy._(language);

  bool get isHausa => language.isHausa;
  String get replayButton => isHausa ? 'A sake jin Mallam' : 'Hear Mallam again';
  String get guidanceTitle => isHausa ? 'Abin da za a yi gaba' : 'What to do next';
  String get replayingLabel => isHausa ? 'Mallam yana maimaitawa' : 'Mallam is replaying';
  String get replayHelperActive => isHausa
      ? 'Mallam yana sake magana. Bari mai koyo ya ji sau daya, sannan a ci gaba.'
      : 'Mallam is speaking again. Let the learner hear it once, then continue.';
  String get replayHelperIdle => isHausa
      ? 'Taɓa nan a kowane lokaci domin Mallam ya sake maimaita abin da ake yi yanzu.'
      : 'Tap any time to hear Mallam repeat the current cue.';
  String get centeredSupportNote => isHausa
      ? 'Mallam yana nan a bayyane domin ya sake maimaita umarni idan mai koyo na bukatar karin bayani a hankali.'
      : 'Mallam stays visible here, ready to repeat the cue whenever the learner needs a softer second pass.';
  String get guidingNow => isHausa ? 'Mallam yana magana yanzu' : 'Mallam is speaking now';
  String get listeningNow => isHausa ? 'Dakatar ka saurari muryar mai koyo' : 'Pause and capture the learner voice';
  String get affirmingNow => isHausa ? 'Yaba sannan a ci gaba' : 'Praise and continue';
  String get waitingNow => isHausa ? 'Ba mai koyo ɗan lokaci' : 'Give the learner a moment';
  String get idleNow => isHausa ? 'Murya na jiran aiki' : 'Voice is standing by';
  String get homeReplayPromptNoLearnerBlocked => isHausa
      ? 'Kana kan shafin gida. Rijistar mai koyo tana kulle har sai backend ya dawo. Buɗe Jerin ɗalibai domin duba masu koyo da suka yi sync ko zaɓi darasi domin a ci gaba da koyarwa.'
      : 'You are on the home page. Registration is blocked until the live backend recovers, so open Student List to review synced learners or choose a subject to continue teaching.';
  String get homeReplayPromptNoLearner => isHausa
      ? 'Kana kan shafin gida. Danna Rijista domin ƙara mai koyo, Jerin ɗalibai domin ganin duka masu koyo, ko zaɓi darasi domin ganin darussansa.'
      : 'You are on the home page. Tap Register to add a learner, Student List to see all learners, or choose a subject to see its lessons.';
  String lessonJourneyTitle() => isHausa ? 'Tafiyar darasi' : 'Lesson journey';
  String lessonJourneyHint() => isHausa
      ? 'Darussan da aka gama suna nan a gani amma ba za a sake buɗe su ba. Bi darasin farko da yake a buɗe domin hanya ta ci gaba.'
      : 'Finished lessons stay visible but cannot be reopened. Follow the first open lesson to keep the path moving.';
  String modulesInstruction() => isHausa
      ? 'Kowane darasi yana tafiya da muryar Mallam. Duba yanayin darasin da abin da za a kai, sannan a buɗe darasin mai koyo daga wannan hanya.'
      : 'Each module is voice-led. Review the scenario, facilitator tip, and readiness goal before you send the learner into the lesson flow.';
  String lessonInstruction() => isHausa
      ? 'Sake kunna umarnin Mallam idan an bukata, kama abin da mai koyo ya fada, sannan amfani da taimako idan amsar tana bukatar agaji.'
      : 'Replay the coach prompt when needed, capture what the learner actually said, and use support actions only when the response needs help.';
  String modulesPrompt(String subjectTitle) => isHausa
      ? 'Ka buɗe $subjectTitle. Zaɓi darasi a wannan fanni, sannan ka fara da mai koyo da ya kamata ya ɗauke shi.'
      : 'You opened $subjectTitle. Choose a lesson in this subject, then start with the learner who is taking it.';
  String modulesReplayPrompt(String subjectTitle) => isHausa
      ? 'Ka buɗe $subjectTitle. Fara da darasin gaba a wannan hanya, sannan ka bi tafiyar darasi mataki-mataki.'
      : 'You opened $subjectTitle. Start with the next lesson bubble, then follow the lesson path one step at a time.';

  String homeReplayPromptForLearner({
    required String learnerName,
    required String learnerMoment,
    String? moduleTitle,
    String? nextLessonTitle,
    String? nextLessonSubject,
  }) {
    if (nextLessonTitle != null) {
      return isHausa
          ? '$learnerName ya shirya don $nextLessonTitle. $learnerMoment Buɗe Jerin ɗalibai domin katin mai koyo, ko buɗe ${moduleTitle ?? nextLessonSubject ?? 'darasin'} domin a ci gaba da tafiyar darasi.'
          : '$learnerName is ready for $nextLessonTitle. $learnerMoment Tap Student List to open learner cards, or open ${moduleTitle ?? nextLessonSubject} to continue the lesson path.';
    }
    if (moduleTitle != null) {
      return isHausa
          ? '$learnerName ya shirya ya ci gaba da koyo. $learnerMoment Buɗe Jerin ɗalibai domin katin mai koyo, ko zaɓi $moduleTitle domin a ci gaba da darasi na gaba.'
          : '$learnerName is ready to keep learning. $learnerMoment Tap Student List to open learner cards, or choose $moduleTitle to keep the next lesson moving.';
    }
    return isHausa
        ? '$learnerName yana kan shafin gida. $learnerMoment Danna Rijista domin ƙara wani mai koyo, Jerin ɗalibai domin ganin duka masu koyo, ko zaɓi darasi domin ganin darussansa.'
        : '$learnerName is on the home page. $learnerMoment Tap Register to add another learner, Student List to see all learners, or choose a subject to see its lessons.';
  }
}
