import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BundledContentLoader', () {
    test('loads the richer Meet Mallam bundled fundamentals lesson pack', () async {
      const loader = BundledContentLoader();

      final library = await loader.load();

      expect(library.modules, isNotEmpty);
      expect(library.modules.length, 1);
      expect(library.lessons, hasLength(2));

      final module = library.modules.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam',
      );
      final introLesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-01',
      );
      final readyLesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-02',
      );

      expect(module.title, 'Meet Mallam');
      expect(module.badge, contains('2 lessons'));

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
        introLesson.steps[3].activity?.choiceItems.first.mediaItems.first.firstValue,
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
    });
  });
}
