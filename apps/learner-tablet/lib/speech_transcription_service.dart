import 'dart:async';

import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

class SpeechTranscriptionService {
  SpeechTranscriptionService() : _speech = SpeechToText();

  final SpeechToText _speech;
  bool _initialized = false;
  bool _available = false;
  String? _lastError;

  bool get isAvailable => _available;
  String? get lastError => _lastError;

  Future<bool> initialize() async {
    if (_initialized) return _available;

    _available = await _speech.initialize(
      onError: (error) {
        _lastError = error.errorMsg;
      },
      onStatus: (_) {},
      debugLogging: false,
    );
    _initialized = true;
    if (!_available && _lastError == null) {
      _lastError =
          'Speech recognition is unavailable on this device, so only audio recording will be captured.';
    }
    return _available;
  }

  Future<bool> start({
    required void Function(String transcript, bool isFinal) onResult,
  }) async {
    final ready = await initialize();
    if (!ready) return false;

    _lastError = null;
    await _speech.listen(
      onResult: (SpeechRecognitionResult result) {
        final text = result.recognizedWords.trim();
        if (text.isEmpty) return;
        onResult(text, result.finalResult);
      },
      listenOptions: SpeechListenOptions(
        partialResults: true,
        cancelOnError: false,
        listenMode: ListenMode.confirmation,
      ),
      pauseFor: const Duration(seconds: 3),
      listenFor: const Duration(minutes: 2),
    );
    return true;
  }

  Future<void> stop() async {
    if (!_initialized) return;
    await _speech.stop();
  }

  Future<void> cancel() async {
    if (!_initialized) return;
    await _speech.cancel();
  }
}
