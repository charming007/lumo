import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  test('authored audio fallback prefers phrase text or label before generic copy', () {
    final page = LessonSessionPage(
      state: LumoAppState(includeSeedDemoContent: true),
      lesson: const LessonCardModel(
        id: 'lesson-fallback-helper',
        moduleId: 'english',
        title: 'Fallback helper',
        subject: 'English',
        durationMinutes: 5,
        status: 'Assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Verify authored audio fallback copy.',
        scenario: 'Ensure spoken copy survives missing audio.',
        steps: [],
      ),
      onChanged: () {},
    );

    final state = page.createState() as dynamic;

    expect(
      state.resolveAuthoredAudioFallbackText(
        const LessonAudioReference(
          value: 'asset:missing-audio',
          phraseText: 'Say the prompt aloud.',
          label: 'Fallback label',
        ),
        spokenFallback: 'Generic spoken fallback',
      ),
      'Say the prompt aloud.',
    );

    expect(
      state.resolveAuthoredAudioFallbackText(
        const LessonAudioReference(
          value: 'asset:missing-audio',
          label: 'Fallback label',
        ),
        spokenFallback: 'Generic spoken fallback',
      ),
      'Fallback label',
    );

    expect(
      state.resolveAuthoredAudioFallbackText(
        const LessonAudioReference(value: 'asset:missing-audio'),
        spokenFallback: 'Generic spoken fallback',
      ),
      'Generic spoken fallback',
    );
  });
}
