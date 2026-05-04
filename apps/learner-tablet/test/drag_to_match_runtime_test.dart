import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('drag to match runtime keeps an immediate web draggable path with tap fallback', () {
    final source = File('lib/main.dart').readAsStringSync();

    expect(
      source,
      contains("if (kIsWeb) {"),
      reason: 'web/tablet runtime should take its own drag path instead of reusing long-press only behavior',
    );
    expect(
      source,
      contains('Draggable<String>('),
      reason: 'web drag-to-match cards should use an immediate draggable widget',
    );
    expect(
      source,
      contains("child: Text(selected ? 'Clear selection' : 'Tap to select')"),
      reason: 'tap-select fallback should stay available even after restoring direct drag on web',
    );
    expect(
      source,
      contains('LongPressDraggable<String>('),
      reason: 'touch-native path should still preserve the deliberate long-press interaction',
    );
  });
}
