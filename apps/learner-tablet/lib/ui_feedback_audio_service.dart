import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

const String _kUiTapAsset = 'audio/ui_tap_soft.wav';
const String _kUiHoverAsset = 'audio/ui_hover_soft.wav';
const String _kUiDragPickupAsset = 'audio/ui_drag_pickup.wav';
const String _kUiDragDropAsset = 'audio/ui_drag_drop.wav';
const String _kUiCorrectAsset = 'audio/ui_correct_chime.wav';
const String _kUiIncorrectAsset = 'audio/ui_incorrect_soft.wav';

enum UiFeedbackSound {
  tap(_kUiTapAsset, 0.24),
  hover(_kUiHoverAsset, 0.14),
  dragPickup(_kUiDragPickupAsset, 0.2),
  dragDrop(_kUiDragDropAsset, 0.2),
  correct(_kUiCorrectAsset, 0.4),
  incorrect(_kUiIncorrectAsset, 0.32);

  const UiFeedbackSound(this.assetPath, this.volume);

  final String assetPath;
  final double volume;
}

class UiFeedbackAudioService {
  UiFeedbackAudioService()
      : _player = AudioPlayer(playerId: 'learner-ui-feedback') {
    unawaited(_player.setPlayerMode(PlayerMode.lowLatency));
    unawaited(_player.setReleaseMode(ReleaseMode.stop));
  }

  final AudioPlayer _player;
  final Map<UiFeedbackSound, DateTime> _lastPlayedAt =
      <UiFeedbackSound, DateTime>{};

  Future<void> play(
    UiFeedbackSound sound, {
    Duration minGap = const Duration(milliseconds: 90),
  }) async {
    final now = DateTime.now();
    final previous = _lastPlayedAt[sound];
    if (previous != null && now.difference(previous) < minGap) {
      return;
    }
    _lastPlayedAt[sound] = now;

    try {
      await _player.stop();
      await _player.setVolume(sound.volume);
      await _player.play(
        AssetSource(sound.assetPath),
        mode: PlayerMode.lowLatency,
      );
    } catch (_) {
      await _fallback(sound);
    }
  }

  Future<void> _fallback(UiFeedbackSound sound) {
    switch (sound) {
      case UiFeedbackSound.correct:
        return SystemSound.play(SystemSoundType.alert);
      case UiFeedbackSound.incorrect:
        return HapticFeedback.lightImpact();
      case UiFeedbackSound.tap:
      case UiFeedbackSound.hover:
      case UiFeedbackSound.dragPickup:
      case UiFeedbackSound.dragDrop:
        return SystemSound.play(SystemSoundType.click);
    }
  }

  Future<void> dispose() => _player.dispose();
}
