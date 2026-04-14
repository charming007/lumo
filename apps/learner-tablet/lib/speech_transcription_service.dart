import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

abstract class SpeechRecognitionEngine {
  bool get isListening;

  Future<bool> initialize({
    required void Function(String errorMsg) onError,
    required void Function(String status) onStatus,
    bool debugLogging = false,
  });

  Future<void> listen({
    required void Function(String transcript, bool isFinal) onResult,
    required SpeechListenOptions options,
    required Duration pauseFor,
    required Duration listenFor,
  });

  Future<void> stop();
  Future<void> cancel();
}

class SpeechToTextEngine implements SpeechRecognitionEngine {
  SpeechToTextEngine() : _speech = SpeechToText();

  final SpeechToText _speech;

  @override
  bool get isListening => _speech.isListening;

  @override
  Future<bool> initialize({
    required void Function(String errorMsg) onError,
    required void Function(String status) onStatus,
    bool debugLogging = false,
  }) {
    return _speech.initialize(
      onError: (error) => onError(error.errorMsg),
      onStatus: onStatus,
      debugLogging: debugLogging,
    );
  }

  @override
  Future<void> listen({
    required void Function(String transcript, bool isFinal) onResult,
    required SpeechListenOptions options,
    required Duration pauseFor,
    required Duration listenFor,
  }) {
    return _speech.listen(
      onResult: (SpeechRecognitionResult result) {
        onResult(result.recognizedWords, result.finalResult);
      },
      listenOptions: options,
      pauseFor: pauseFor,
      listenFor: listenFor,
    );
  }

  @override
  Future<void> stop() => _speech.stop();

  @override
  Future<void> cancel() => _speech.cancel();
}

class SpeechTranscriptionService {
  SpeechTranscriptionService({SpeechRecognitionEngine? engine})
      : _engine = engine ?? SpeechToTextEngine();

  final SpeechRecognitionEngine _engine;
  bool _initialized = false;
  bool _available = false;
  String? _lastError;
  String _lastStatus = 'idle';
  int _consecutiveStartFailures = 0;
  DateTime? _lastStartFailureAt;
  DateTime? _retryBlockedUntil;

  bool get isAvailable => _available;
  String? get lastError => _lastError;
  String get lastStatus => _lastStatus;
  bool get isListening => _engine.isListening;

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
    final now = DateTime.now();
    final retryBlockedUntil = _retryBlockedUntil;
    final recentRepeatedFailures = _consecutiveStartFailures >= 3 &&
        _lastStartFailureAt != null &&
        now.difference(_lastStartFailureAt!) < const Duration(seconds: 20);
    if (forceRetry &&
        ((retryBlockedUntil != null && now.isBefore(retryBlockedUntil)) ||
            recentRepeatedFailures)) {
      _available = false;
      _lastStatus = 'retry-blocked';
      _lastError =
          'Speech recognition is cooling down after repeated start failures. Keep saving audio locally for a moment, then try again.';
      return false;
    }

    if (_initialized && !forceRetry) return _available;

    _lastError = null;
    _lastStatus = 'initializing';
    _available = await _engine.initialize(
      onError: (errorMsg) {
        _lastError = _normalizeError(errorMsg);
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
    if (_engine.isListening) {
      await _engine.stop();
    }

    Future<void> startListening(SpeechListenOptions options) {
      return _engine.listen(
        onResult: (transcript, isFinal) {
          final text = transcript.trim();
          if (text.isEmpty) return;
          _consecutiveStartFailures = 0;
          _lastStartFailureAt = null;
          _retryBlockedUntil = null;
          _available = true;
          onResult(text, isFinal);
        },
        options: options,
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
      _available = true;
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
        _available = true;
      } catch (error) {
        _consecutiveStartFailures += 1;
        _lastStartFailureAt = DateTime.now();
        if (_consecutiveStartFailures >= 3) {
          _retryBlockedUntil = DateTime.now().add(const Duration(seconds: 20));
        }
        _lastError = _normalizeError(error.toString());
        _available = false;
        onStatus?.call(_lastStatus);
        return false;
      }
    }
    onStatus?.call(_lastStatus);
    return true;
  }

  Future<void> stop() async {
    if (!_initialized) return;
    await _engine.stop();
  }

  Future<void> cancel() async {
    if (!_initialized) return;
    await _engine.cancel();
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
    if (lower.contains('no-speech') || lower.contains('speech timeout')) {
      return 'No clear speech was detected on this take. Lumo will keep the saved audio and can reopen the mic for another try.';
    }
    if (lower.contains('audio-capture') ||
        lower.contains('microphone unavailable')) {
      return 'The microphone became unavailable mid-session. Reconnect the mic if needed; Lumo will keep using saved audio until live transcript help recovers.';
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
