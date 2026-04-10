import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';

import 'package:lumo_learner_tablet/main.dart';

void main() {
  testWidgets('shows learner app shell after splash', (tester) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const LumoApp());

    expect(find.text('Lumo learner tablet'), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    expect(find.text('Today’s learner session'), findsOneWidget);
    expect(find.text('Learning modules'), findsOneWidget);
  });
}
