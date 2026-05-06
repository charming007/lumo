import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  test(
      'lesson backend parsing keeps Hausa support separate from English target cues',
      () {
    final lesson = LessonCardModel.fromBackend(
      jsonDecode(_sampleLessonJson) as Map<String, dynamic>,
    );

    expect(lesson.supportLanguage, 'Hausa');
    expect(lesson.targetLanguage, 'English');
    expect(lesson.localization.defaultStepSupportText, contains('Hausa'));
    expect(lesson.localization.lessonTargetAudio?.playbackValue,
        'asset:english-audio-lesson-001');

    final firstStep = lesson.steps.first;
    expect(firstStep.activity?.targetText, 'A');
    expect(firstStep.activity?.supportText,
        'Ka nuna harafin A sannan ka sa ɗalibi ya maimaita sautin Turanci a hankali.');
    expect(firstStep.activity?.targetAudio?.playbackValue,
        'asset:english-a-letter-a');
    expect(firstStep.activity?.supportAudio?.spokenFallbackText,
        'Ka nuna harafin A sannan ka sa ɗalibi ya maimaita sautin Turanci a hankali.');

    final secondStep = lesson.steps[1];
    expect(secondStep.activity?.supportAudio?.playbackValue,
        'asset:ha-image-choice-a-support');

    final thirdStep = lesson.steps[2];
    expect(thirdStep.activity?.supportAudio?.spokenFallbackText,
        contains('ja kowace kalma zuwa hoton da ya dace'));
  });
}

const _sampleLessonJson = '''
{
  "id": "lesson-english-phonics-001",
  "subject": "english",
  "title": "Letter A and First Sound Match",
  "mode": "guided",
  "durationMinutes": 5,
  "localization": {
    "supportLanguage": "ha",
    "supportLanguageLabel": "Hausa",
    "targetLanguage": "en",
    "targetLanguageLabel": "English",
    "defaultStepSupportText": "Explain the task briefly in Hausa, then model the English target once before the learner answers.",
    "defaultStepSupportAudio": {
      "source": "phrase-bank",
      "phraseId": "ha-greet-and-model-once",
      "phraseText": "A Hausa reminder to explain the task briefly, then model the English target once."
    },
    "lessonTargetAudio": {
      "source": "asset",
      "assetId": "english-audio-lesson-001",
      "value": "asset:english-audio-lesson-001"
    }
  },
  "activitySteps": [
    {
      "id": "act-1",
      "type": "letter_intro",
      "order": 1,
      "prompt": "This is the letter A. It says /a/.",
      "targetText": "A",
      "targetAudio": {
        "source": "asset",
        "assetId": "english-a-letter-a",
        "value": "asset:english-a-letter-a"
      },
      "supportText": "Ka nuna harafin A sannan ka sa ɗalibi ya maimaita sautin Turanci a hankali.",
      "supportAudio": {
        "source": "phrase-bank",
        "phraseId": "ha-letter-a-support",
        "phraseText": "Ka nuna harafin A sannan ka sa ɗalibi ya maimaita sautin Turanci a hankali."
      }
    },
    {
      "id": "act-2",
      "type": "image_choice",
      "order": 2,
      "prompt": "Tap the picture that starts with /a/.",
      "supportAudio": {
        "source": "asset",
        "assetId": "ha-image-choice-a-support",
        "value": "asset:ha-image-choice-a-support"
      }
    },
    {
      "id": "act-3",
      "type": "drag_to_match",
      "order": 3,
      "prompt": "Drag each word to the matching picture zone.",
      "supportAudio": {
        "source": "phrase-bank",
        "phraseId": "ha-drag-to-match-support",
        "phraseText": "Ka bayyana a Hausa yadda za a ja kowace kalma zuwa hoton da ya dace idan ɗalibi ya makale."
      }
    }
  ]
}
''';
