import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BundledContentLoader', () {
    test('loads the richer Meet Mallam bundled fundamentals lesson pack',
        () async {
      const loader = BundledContentLoader();

      final library = await loader.load();

      expect(library.modules, isNotEmpty);
      expect(library.modules.length, 1);
      expect(library.lessons, hasLength(4));

      final module = library.modules.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam',
      );
      final introLesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-01',
      );
      final readyLesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-02',
      );
      final listenLesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-03',
      );
      final firstTurnLesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-04',
      );

      expect(module.title, 'Meet Mallam');
      expect(module.badge, contains('4 lessons'));

      expect(introLesson.title, 'Hello, Mallam');
      expect(introLesson.moduleId, 'fundamentals-meet-mallam');
      expect(introLesson.steps.length, 5);
      expect(
        introLesson.steps.first.activity?.mediaItems.first.firstValue,
        'Hello, Mallam.',
      );
      expect(
        introLesson.steps[1].activity?.choiceItems.first.mediaValue,
        'assets/content_packs/lumo-fundamentals/meet_mallam/media/images/mallam-card.png',
      );
      expect(
        introLesson
            .steps[3].activity?.choiceItems.first.mediaItems.first.firstValue,
        'I am ready.',
      );
      expect(
        introLesson.steps.last.activity?.targetResponse,
        'I am ready to learn.',
      );

      expect(readyLesson.title, 'My name and I am ready');
      expect(readyLesson.steps.length, 5);
      expect(
        readyLesson.steps.first.activity?.mediaItems.first.firstValue,
        'Listen first.',
      );
      expect(
        readyLesson.steps[1].activity?.choiceItems.first.mediaValue,
        'assets/content_packs/lumo-fundamentals/meet_mallam/media/images/ear-card.png',
      );
      expect(
        readyLesson.steps[2].activity?.targetResponse,
        'My name is [learner name].',
      );
      expect(
        readyLesson.steps.last.activity?.targetResponse,
        'My name is [learner name]. I am ready.',
      );

      expect(listenLesson.title, 'I can listen and answer');
      expect(listenLesson.steps.length, 5);
      expect(
        listenLesson.steps.first.activity?.mediaItems.first.firstValue,
        'Listen and touch your ear.',
      );
      expect(
        listenLesson
            .steps[3].activity?.choiceItems.first.mediaItems.first.firstValue,
        'I can listen.',
      );
      expect(
        listenLesson.steps.last.activity?.targetResponse,
        'I can listen and answer.',
      );

      expect(firstTurnLesson.title, 'My first learning turn');
      expect(firstTurnLesson.steps.length, 5);
      expect(
        firstTurnLesson.steps.first.activity?.mediaItems.first.firstValue,
        'Hello, [learner first name].',
      );
      expect(
        firstTurnLesson.steps[2].activity?.targetResponse,
        'My name is [learner name].',
      );
      expect(
        firstTurnLesson.steps.last.activity?.targetResponse,
        'Hello, Mallam. My name is [learner name]. I am ready to learn.',
      );
    });
  });
}
