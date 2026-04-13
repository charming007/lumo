import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';

void main() {
  Future<void> pumpAppAtSize(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const LumoApp(includeSeedDemoContent: true));
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
  }

  testWidgets('shows learner app shell after splash', (tester) async {
    await pumpAppAtSize(tester, const Size(1400, 1000));

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Student List'), findsOneWidget);
  });

  testWidgets('home screen stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    expect(tester.takeException(), isNull);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Student List'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsWidgets);
  });

  testWidgets('student list stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    await tester.tap(find.text('Student List'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('All learners'), findsOneWidget);
    expect(find.textContaining('learners'), findsWidgets);
  });

  testWidgets('student list stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Student List'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('All learners'), findsOneWidget);
    expect(find.text('Pick fast'), findsOneWidget);
    expect(find.textContaining('leads'), findsWidgets);
  });

  testWidgets('learner profile stays usable on narrow tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(540, 960));

    await tester.tap(find.text('Student List'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Profile').first);
    await tester.tap(find.text('Profile').first);
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Back'), findsOneWidget);
    expect(find.textContaining('leaderboard'), findsWidgets);
  });

  testWidgets('registration flow stays usable on portrait tablet widths', (
    tester,
  ) async {
    await pumpAppAtSize(tester, const Size(800, 1280));

    await tester.tap(find.text('Register'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Register learner'), findsOneWidget);
    expect(find.text('Save learner'), findsOneWidget);
    expect(find.text('Identity'), findsOneWidget);
    expect(find.text('Consent'), findsOneWidget);
  });

  testWidgets('registration success page stays usable on narrow tablet widths', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(540, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;

    await tester.pumpWidget(
      MaterialApp(
        home: RegistrationSuccessPage(
          state: state,
          learner: learner,
          onChanged: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Back home'), findsOneWidget);
    expect(find.text('Start assigned lesson'), findsOneWidget);
  });

  testWidgets('lesson complete page stays usable on narrow tablet widths', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(540, 960);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonCompletePage(
          state: state,
          lesson: lesson,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.text('Back home'), findsOneWidget);
    expect(find.textContaining('lesson'), findsWidgets);

    state.dispose();
  });

  testWidgets('lesson session hardens browser/device lifecycle interruptions', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1600, 1400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    final learner = state.learners.first;
    final lesson = state.assignedLessons.first;
    state.selectLearner(learner);
    state.selectModule(state.modules.first);
    state.startLesson(lesson);

    await tester.pumpWidget(
      MaterialApp(
        home: LessonSessionPage(
          state: state,
          lesson: lesson,
          onChanged: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    final pageState = tester.state(find.byType(LessonSessionPage)) as dynamic;
    pageState.didChangeAppLifecycleState(AppLifecycleState.paused);
    await tester.pumpAndSettle();

    expect(find.textContaining('left the foreground'), findsWidgets);
    expect(find.textContaining('protect the learner session'), findsWidgets);

    pageState.didChangeAppLifecycleState(AppLifecycleState.resumed);
    await tester.pumpAndSettle();

    expect(find.textContaining('returned to the foreground'), findsWidgets);
    expect(find.textContaining('Resume hands-free loop'), findsWidgets);

    state.dispose();
  });
}
