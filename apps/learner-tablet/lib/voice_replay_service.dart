import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'api_client.dart';
import 'models.dart';

class VoiceReplayService {
  VoiceReplayService({LumoApiClient? apiClient})
      : _apiClient = apiClient ?? LumoApiClient() {
    _configure();
  }

  final LumoApiClient _apiClient;
  final FlutterTts _tts = FlutterTts();
  final AudioPlayer _remotePlayer = AudioPlayer();
  bool _configured = false;

  Future<void> _configure() async {
    if (_configured) return;
    _configured = true;

    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(kIsWeb ? 0.9 : 0.45);
    await _tts.setPitch(1.0);
    await _tts.awaitSpeakCompletion(true);
    await _remotePlayer.setReleaseMode(ReleaseMode.stop);
  }

  Future<void> replay(String text, SpeakerMode mode) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    await _configure();
    await stop();

    try {
      final clip = await _apiClient.fetchTutorVoiceReplay(
        text: trimmed,
        mode: mode,
      );
      if (clip != null) {
        await _playRemoteClip(clip.audioBytes);
        return;
      }
    } catch (_) {
      // Remote voice is best-effort for now. Local TTS stays the hard fallback.
    }

    await _tts.setVolume(_volumeFor(mode));
    await _tts.speak(trimmed);
  }

  Future<void> _playRemoteClip(Uint8List bytes) async {
    await _remotePlayer.play(BytesSource(bytes));
  }

  Future<void> stop() async {
    await _remotePlayer.stop();
    await _tts.stop();
  }

  Future<void> dispose() async {
    await stop();
    await _remotePlayer.dispose();
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
