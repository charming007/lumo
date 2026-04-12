import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

class SpeechTranscriptionService {
  SpeechTranscriptionService() : _speech = SpeechToText();

  final SpeechToText _speech;
  bool _initialized = false;
  bool _available = false;
  String? _lastError;
  String _lastStatus = 'idle';

  bool get isAvailable => _available;
  String? get lastError => _lastError;
  String get lastStatus => _lastStatus;
  bool get isListening => _speech.isListening;

  String get availabilityLabel {
    if (_available) {
      return 'Speech recognition is ready for live transcript capture.';
    }
    return _lastError ??
        (kIsWeb
            ? 'Browser speech recognition is unavailable, so the app will save audio and let the facilitator confirm answers manually.'
            : 'Speech recognition is unavailable on this device, so the app will save audio and let the facilitator confirm answers manually.');
  }

  Future<bool> initialize({bool forceRetry = false}) async {
    if (_initialized && !forceRetry) return _available;

    _lastError = null;
    _lastStatus = 'initializing';
    _available = await _speech.initialize(
      onError: (error) {
        _lastError = _normalizeError(error.errorMsg);
      },
      onStatus: (status) {
        _lastStatus = status;
      },
      debugLogging: false,
    );
    _initialized = true;
    if (!_available && _lastError == null) {
      _lastError = availabilityLabel;
    }
    return _available;
  }

  Future<bool> start({
    required void Function(String transcript, bool isFinal) onResult,
    void Function(String status)? onStatus,
  }) async {
    final ready = await initialize(forceRetry: !_available);
    if (!ready) {
      onStatus?.call(_lastStatus);
      return false;
    }

    _lastError = null;
    if (_speech.isListening) {
      await _speech.stop();
    }

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
        onDevice: !kIsWeb,
      ),
      pauseFor: const Duration(seconds: 3),
      listenFor: const Duration(minutes: 2),
    );
    onStatus?.call(_lastStatus);
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

  String _normalizeError(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('permission')) {
      return 'Speech recognition permission was denied. Audio capture can still run, but transcript help is unavailable until mic permissions are allowed.';
    }
    if (lower.contains('network')) {
      return 'Speech recognition needs a stable connection on this device right now. Audio will still be saved locally.';
    }
    if (lower.contains('notavailable') || lower.contains('not available')) {
      return availabilityLabel;
    }
    return raw;
  }
}
