import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';

class LearnerAudioPlaybackService {
  LearnerAudioPlaybackService({LumoApiClient? apiClient})
      : _apiClient = apiClient ?? LumoApiClient() {
    _player = AudioPlayer();
    _player.onPlayerComplete.listen((_) {
      _isPlaying = false;
    });
  }

  final LumoApiClient _apiClient;
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

    final resolvedPath = await _resolvePlaybackPath(trimmed);
    final source = _sourceFor(resolvedPath);
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

  Future<String> _resolvePlaybackPath(String path) async {
    if (!path.startsWith('asset:')) return path;

    final assetId = path.substring('asset:'.length).trim();
    if (assetId.isEmpty) return path;

    final asset = await _apiClient.fetchLessonAsset(assetId);
    final fileUrl = asset?.fileUrl?.trim();
    if (fileUrl != null && fileUrl.isNotEmpty) {
      return fileUrl;
    }
    return path;
  }

  Source _sourceFor(String path) {
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

    if (!kIsWeb && File(path).existsSync()) {
      return DeviceFileSource(path);
    }

    if (_looksLikeFlutterAsset(path)) {
      return AssetSource(path);
    }

    return UrlSource(path);
  }

  bool _looksLikeFlutterAsset(String path) {
    final trimmed = path.trim();
    if (trimmed.isEmpty || trimmed.startsWith('/')) return false;
    final uri = Uri.tryParse(trimmed);
    return !(uri?.hasScheme ?? false);
  }
}
