import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'api_client.dart';
import 'models.dart';

class VoiceReplayService {
  VoiceReplayService({
    LumoApiClient? apiClient,
    LumoApiClient Function(String baseUrl)? apiClientFactory,
    @visibleForTesting bool enablePlatformAudio = true,
  })  : _apiClient = apiClient ?? LumoApiClient(),
        _apiClientFactory = apiClientFactory ??
            ((baseUrl) => LumoApiClient(baseUrl: baseUrl)),
        _enablePlatformAudio = enablePlatformAudio,
        _tts = enablePlatformAudio ? FlutterTts() : null,
        _remotePlayer = enablePlatformAudio ? AudioPlayer() : null {
    if (_enablePlatformAudio) {
      _configure();
    }
  }

  final LumoApiClient _apiClient;
  final LumoApiClient Function(String baseUrl) _apiClientFactory;
  final bool _enablePlatformAudio;
  final FlutterTts? _tts;
  final AudioPlayer? _remotePlayer;
  bool _configured = false;

  Future<void> _configure() async {
    if (_configured) return;
    _configured = true;

    final tts = _tts;
    final remotePlayer = _remotePlayer;
    if (tts == null || remotePlayer == null) return;

    await tts.setSpeechRate(kIsWeb ? 0.9 : 0.45);
    await tts.setPitch(1.0);
    await tts.awaitSpeakCompletion(true);
    await remotePlayer.setReleaseMode(ReleaseMode.stop);
  }

  Future<void> replay(
    String text,
    SpeakerMode mode, {
    String? supportLanguage,
    String? baseUrl,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    await _configure();
    await stop();

    final apiClient = _apiClientFor(baseUrl);

    try {
      final clip = await apiClient.fetchTutorVoiceReplay(
        text: trimmed,
        mode: mode,
        supportLanguage: supportLanguage,
      );
      if (clip != null) {
        await _playRemoteClip(clip.audioBytes);
        return;
      }
    } catch (_) {
      // Remote voice is best-effort for now. Local TTS stays the hard fallback.
    }

    final tts = _tts;
    if (tts == null) return;

    await tts.setLanguage(_ttsLanguageFor(supportLanguage));
    await tts.setVolume(_volumeFor(mode));
    await tts.speak(trimmed);
  }

  String _ttsLanguageFor(String? supportLanguage) {
    final normalized = supportLanguage?.trim().toLowerCase() ?? '';
    if (normalized == 'english') return 'en-US';
    if (normalized.contains('hausa')) return 'ha-NG';
    return 'en-US';
  }

  @visibleForTesting
  LumoApiClient apiClientForBaseUrl(String? baseUrl) => _apiClientFor(baseUrl);

  LumoApiClient _apiClientFor(String? baseUrl) {
    final normalizedBaseUrl = baseUrl?.trim();
    if (normalizedBaseUrl == null || normalizedBaseUrl.isEmpty) {
      return _apiClient;
    }
    if (normalizedBaseUrl == _apiClient.baseUrl) {
      return _apiClient;
    }
    return _apiClientFactory(normalizedBaseUrl);
  }

  Future<void> _playRemoteClip(Uint8List bytes) async {
    final remotePlayer = _remotePlayer;
    if (remotePlayer == null) return;
    await remotePlayer.play(BytesSource(bytes));
  }

  Future<void> stop() async {
    await _remotePlayer?.stop();
    await _tts?.stop();
  }

  Future<void> dispose() async {
    await stop();
    await _remotePlayer?.dispose();
  }

  double _volumeFor(SpeakerMode mode) {
    switch (mode) {
      case SpeakerMode.guiding:
        return 1.0;
      case SpeakerMode.affirming:
        return 0.95;
      case SpeakerMode.listening:
      case SpeakerMode.waiting:
      case SpeakerMode.idle:
        return 0.9;
    }
  }
}
