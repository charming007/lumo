import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

class LearnerAudioPlaybackService {
  LearnerAudioPlaybackService() {
    _player = AudioPlayer();
    _player.onPlayerComplete.listen((_) {
      _isPlaying = false;
    });
  }

  late final AudioPlayer _player;
  bool _isPlaying = false;
  String? _currentSourcePath;

  bool get isPlaying => _isPlaying;
  String? get currentSourcePath => _currentSourcePath;

  Future<void> play(String path) async {
    final trimmed = path.trim();
    if (trimmed.isEmpty) return;

    if (_isPlaying && _currentSourcePath == trimmed) {
      await stop();
      return;
    }

    await _player.stop();

    final source = _sourceFor(trimmed);
    await _player.play(source);
    _isPlaying = true;
    _currentSourcePath = trimmed;
  }

  Future<void> stop() async {
    await _player.stop();
    _isPlaying = false;
    _currentSourcePath = null;
  }

  Future<void> dispose() async {
    await _player.dispose();
    _isPlaying = false;
    _currentSourcePath = null;
  }

  Source _sourceFor(String path) {
    if (kIsWeb) {
      return UrlSource(path);
    }

    final uri = Uri.tryParse(path);
    final scheme = uri?.scheme ?? '';
    final hasScheme = scheme.isNotEmpty;
    if (hasScheme &&
        (scheme == 'http' ||
            scheme == 'https' ||
            scheme == 'blob' ||
            scheme == 'data')) {
      return UrlSource(path);
    }

    if (File(path).existsSync()) {
      return DeviceFileSource(path);
    }

    return UrlSource(path);
  }
}
