import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/main.dart';

void main() {
  group('resolveCapturedTranscriptForReview', () {
    test('prefers final transcript, then live transcript', () {
      expect(
        resolveCapturedTranscriptForReview(
          latestFinalTranscript: ' Final answer ',
          liveTranscript: 'draft answer',
          transcriptCapturedThisTake: true,
          responseDraft: 'typed fallback',
          visibleLearnerText: 'session fallback',
        ),
        'Final answer',
      );

      expect(
        resolveCapturedTranscriptForReview(
          latestFinalTranscript: '',
          liveTranscript: ' draft answer ',
          transcriptCapturedThisTake: true,
          responseDraft: 'typed fallback',
          visibleLearnerText: 'session fallback',
        ),
        'draft answer',
      );
    });

    test(
      'recovers mirrored draft when callbacks captured speech but local transcript is blank',
      () {
        expect(
          resolveCapturedTranscriptForReview(
            latestFinalTranscript: '',
            liveTranscript: '',
            transcriptCapturedThisTake: true,
            responseDraft: ' I can hear a learner answer ',
            visibleLearnerText: 'session fallback',
          ),
          'I can hear a learner answer',
        );

        expect(
          resolveCapturedTranscriptForReview(
            latestFinalTranscript: '',
            liveTranscript: '',
            transcriptCapturedThisTake: true,
            responseDraft: '',
            visibleLearnerText: ' visible learner transcript ',
          ),
          'visible learner transcript',
        );
      },
    );

    test('does not invent a transcript when this take captured nothing', () {
      expect(
        resolveCapturedTranscriptForReview(
          latestFinalTranscript: '',
          liveTranscript: '',
          transcriptCapturedThisTake: false,
          responseDraft: 'stale text from earlier',
          visibleLearnerText: 'older learner turn',
        ),
        isEmpty,
      );
    });
  });
}
