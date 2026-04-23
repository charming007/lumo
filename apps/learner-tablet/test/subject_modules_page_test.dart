import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';

void main() {
  testWidgets(
      'subject page marks the guided next lesson for the selected learner', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true);
    addTearDown(state.dispose);

    final learner = state.learners.first;
    final nextLesson = state.nextAssignedLessonForLearner(learner)!;
    final module =
        state.modules.firstWhere((item) => item.id == nextLesson.moduleId);

    state.selectLearner(learner);
    state.selectModule(module);

    await tester.pumpWidget(
      MaterialApp(
        home: SubjectModulesPage(
          state: state,
          onChanged: () {},
          module: module,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 500));
    await state.flushPersistence();

    expect(find.text(nextLesson.title), findsOneWidget);
    expect(find.text('Start next lesson'), findsOneWidget);
  });
}
