import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BundledContentLoader', () {
    test('loads the richer Meet Mallam bundled fundamentals lesson', () async {
      const loader = BundledContentLoader();

      final library = await loader.load();

      expect(library.modules, isNotEmpty);
      expect(library.lessons, isNotEmpty);

      final module = library.modules.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam',
      );
      final lesson = library.lessons.firstWhere(
        (item) => item.id == 'fundamentals-meet-mallam.lesson-01',
      );

      expect(module.title, 'Meet Mallam');
      expect(module.badge, contains('1 lesson'));
      expect(lesson.title, 'Hello, Mallam');
      expect(lesson.moduleId, 'fundamentals-meet-mallam');
      expect(lesson.steps.length, 5);
      expect(
        lesson.steps.first.activity?.mediaItems.first.firstValue,
        'Hello, Mallam.',
      );
      expect(
        lesson.steps[1].activity?.choiceItems.first.mediaValue,
        'assets/content_packs/lumo-fundamentals/meet_mallam/media/images/mallam-card.png',
      );
      expect(
        lesson.steps[3].activity?.choiceItems.first.mediaItems.first.firstValue,
        'I am ready.',
      );
      expect(
        lesson.steps.last.activity?.targetResponse,
        'I am ready to learn.',
      );
    });
  });
}
