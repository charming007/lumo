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
  int _consecutiveStartFailures = 0;
  DateTime? _lastStartFailureAt;

  bool get isAvailable => _available;
  String? get lastError => _lastError;
  String get lastStatus => _lastStatus;
  bool get isListening => _speech.isListening;

  String get availabilityLabel {
    if (_available) {
      return 'Speech recognition is ready for live transcript capture.';
    }
    final failureDetail = _consecutiveStartFailures >= 2
        ? ' Lumo has already retried a few times, so it will favor audio capture and manual confirmation until the mic is stable again.'
        : '';
    return (_lastError ??
            (kIsWeb
                ? 'Browser speech recognition is unavailable, so the app will save audio and let the facilitator confirm answers manually.'
                : 'Speech recognition is unavailable on this device, so the app will save audio and let the facilitator confirm answers manually.')) +
        failureDetail;
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

    Future<void> startListening(SpeechListenOptions options) {
      return _speech.listen(
        onResult: (SpeechRecognitionResult result) {
          final text = result.recognizedWords.trim();
          if (text.isEmpty) return;
          _consecutiveStartFailures = 0;
          onResult(text, result.finalResult);
        },
        listenOptions: options,
        pauseFor: const Duration(seconds: 4),
        listenFor: const Duration(minutes: 2),
      );
    }

    try {
      await startListening(
        SpeechListenOptions(
          partialResults: true,
          cancelOnError: false,
          listenMode: ListenMode.dictation,
          onDevice: !kIsWeb,
        ),
      );
    } catch (_) {
      try {
        await startListening(
          SpeechListenOptions(
            partialResults: true,
            cancelOnError: false,
            listenMode: ListenMode.confirmation,
            onDevice: false,
          ),
        );
      } catch (error) {
        _consecutiveStartFailures += 1;
        _lastStartFailureAt = DateTime.now();
        _lastError = _normalizeError(error.toString());
        onStatus?.call(_lastStatus);
        return false;
      }
    }
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
    if (lower.contains('network') || lower.contains('timeout')) {
      return 'Speech recognition needs a steadier connection right now. Lumo will keep saving audio locally so the lesson can continue.';
    }
    if (lower.contains('notallowed') || lower.contains('service-not-allowed')) {
      return 'This browser or device blocked speech recognition for now. Keep the lesson moving with audio capture and a quick manual check.';
    }
    if (lower.contains('aborted')) {
      return 'The browser or OS stopped listening early. Reopen the mic once, then switch to repeat mode if it keeps happening.';
    }
    if (lower.contains('notavailable') || lower.contains('not available')) {
      return kIsWeb
          ? 'Browser speech recognition is unavailable here, so Lumo will save learner audio and let the facilitator confirm answers manually.'
          : 'Speech recognition is unavailable on this device, so Lumo will save learner audio and let the facilitator confirm answers manually.';
    }
    if (_lastStartFailureAt != null &&
        DateTime.now().difference(_lastStartFailureAt!).inMinutes < 2) {
      return 'Speech recognition is still unstable after a recent retry. Keep the lesson in audio-first mode for now.';
    }
    return raw;
  }
}
