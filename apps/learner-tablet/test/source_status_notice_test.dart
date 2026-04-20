import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void _noop() {}

void main() {
  test('operator source labels prefer live backend when healthy', () {
    final state = LumoAppState(includeSeedDemoContent: false)
      ..usingFallbackData = false
      ..lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(minutes: 2));

    expect(state.operatorSourceLabel, 'Live backend connected');
    expect(state.operatorHealthLabel, 'Backend healthy');
  });

  test('operator source labels prioritize stale local runtime warnings', () {
    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = true
      ..lastSyncedAt = DateTime.now().subtract(const Duration(hours: 8))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(hours: 2))
      ..pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );

    expect(state.operatorSourceLabel, 'Offline pack active');
    expect(state.operatorHealthLabel, 'Sync stale');
  });

  testWidgets('home top bar shows source chips without overflow',
      (tester) async {
    tester.view.physicalSize = const Size(752, 1024);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(includeSeedDemoContent: true)
      ..usingFallbackData = true
      ..lastSyncedAt = DateTime.now().subtract(const Duration(hours: 8))
      ..lastSyncAttemptAt = DateTime.now().subtract(const Duration(hours: 2))
      ..pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );
    addTearDown(state.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(
          state: state,
          onChanged: _noop,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Offline pack active'), findsOneWidget);
    expect(find.text('Sync stale'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
