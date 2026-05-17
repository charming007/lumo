import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/design_shell.dart';

void main() {
  testWidgets(
      'LumoTopBar shows live metadata labels instead of rotating static locations',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LumoTopBar(
            onLogoTap: () {},
            metadataLabels: const ['Kaduna / Zaria'],
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Kaduna / Zaria'), findsOneWidget);
    expect(find.text('Maiduguri'), findsNothing);
    expect(find.text('Jere'), findsNothing);
  });
}
