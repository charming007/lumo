import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BundledContentLoader', () {
    test('loads the Meet Mallam bundled starter lesson', () async {
      const loader = BundledContentLoader();

      final library = await loader.load();

      expect(library.modules, isNotEmpty);
      expect(library.lessons, isNotEmpty);

      final module = library.modules.firstWhere(
        (item) => item.id == 'lumo-fundamentals',
      );
      final lesson = library.lessons.firstWhere(
        (item) => item.id == 'lf-meet-mallam',
      );

      expect(module.title, 'Lumo Fundamentals');
      expect(lesson.title, 'Meet Mallam');
      expect(lesson.moduleId, 'lumo-fundamentals');
      expect(lesson.steps.length, 3);
      expect(lesson.steps.first.activity?.prompt,
          'Listen to Mallam say hello, then say hello back.');
      expect(lesson.steps[1].activity?.choiceItems.length, 3);
      expect(lesson.steps[1].activity?.choiceItems.first.mediaValue,
          'bundle:lf-meet-mallam:mallam-card');
    });
  });
}
