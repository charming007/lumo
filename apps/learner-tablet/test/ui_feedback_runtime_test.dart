import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
      'lesson runtime wires learner ui feedback sounds into choice, drag, and evaluation flows',
      () {
    final source = File('lib/main.dart').readAsStringSync();

    expect(source, contains('UiFeedbackAudioService();'));
    expect(source, contains("_playUiFeedback(UiFeedbackSound.tap);"));
    expect(source, contains('UiFeedbackSound.correct'));
    expect(source, contains('UiFeedbackSound.incorrect'));
    expect(source, contains('onDragStarted: ()'));
    expect(source, contains('UiFeedbackSound.dragPickup'));
    expect(source, contains('UiFeedbackSound.dragDrop'));
    expect(source, contains('_playChoiceSelectionFeedback(value);'));
  });

  test(
      'learner tablet pubspec bundles dedicated runtime ui feedback audio assets',
      () {
    final pubspec = File('pubspec.yaml').readAsStringSync();

    expect(pubspec, contains('assets/audio/ui_tap_soft.wav'));
    expect(pubspec, contains('assets/audio/ui_hover_soft.wav'));
    expect(pubspec, contains('assets/audio/ui_drag_pickup.wav'));
    expect(pubspec, contains('assets/audio/ui_drag_drop.wav'));
    expect(pubspec, contains('assets/audio/ui_correct_chime.wav'));
    expect(pubspec, contains('assets/audio/ui_incorrect_soft.wav'));
  });
}
