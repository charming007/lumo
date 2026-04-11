import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'models.dart';

class VoiceReplayService {
  VoiceReplayService() {
    _configure();
  }

  final FlutterTts _tts = FlutterTts();
  bool _configured = false;

  Future<void> _configure() async {
    if (_configured) return;
    _configured = true;

    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(kIsWeb ? 0.9 : 0.45);
    await _tts.setPitch(1.0);
    await _tts.awaitSpeakCompletion(true);
  }

  Future<void> replay(String text, SpeakerMode mode) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    await _configure();
    await _tts.stop();
    await _tts.setVolume(_volumeFor(mode));
    await _tts.speak(trimmed);
  }

  Future<void> dispose() async {
    await _tts.stop();
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
