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

  static const Duration _retryCooldown = Duration(seconds: 20);

  bool get isAvailable => _available;
  String? get lastError => _lastError;
  String get lastStatus => _lastStatus;
  bool get isListening => _engine.isListening;
  bool get isInRetryCooldown =>
      _retryBlockedUntil != null && DateTime.now().isBefore(_retryBlockedUntil!);
  Duration? get retryCooldownRemaining {
    final retryBlockedUntil = _retryBlockedUntil;
    if (retryBlockedUntil == null) return null;
    final remaining = retryBlockedUntil.difference(DateTime.now());
    if (remaining.isNegative || remaining == Duration.zero) {
      return Duration.zero;
    }
    return remaining;
  }

  String get availabilityLabel {
    if (_available) {
      return 'Speech recognition is ready for live transcript capture.';
    }
    final remainingCooldown = retryCooldownRemaining;
    final cooldownDetail = remainingCooldown != null && remainingCooldown > Duration.zero
        ? ' Retry cooldown: ${remainingCooldown.inSeconds}s remaining before the next transcript restart.'
        : '';
    final failureDetail = _consecutiveStartFailures >= 2
        ? ' Lumo has already retried a few times, so it will favor audio capture and manual confirmation until the mic is stable again.'
        : '';
    return (_lastError ??
            (kIsWeb
                ? 'Browser speech recognition is unavailable, so the app will save audio and let the facilitator confirm answers manually.'
                : 'Speech recognition is unavailable on this device, so the app will save audio and let the facilitator confirm answers manually.')) +
        failureDetail +
        cooldownDetail;
  }

  String strategyHeadline({bool preferAudioOnly = false}) {
    if (preferAudioOnly) {
      return 'Audio-first capture';
    }
    if (_available) {
      return 'Live transcript + saved audio';
    }
    if (isInRetryCooldown) {
      return 'Transcript cooldown';
    }
    return kIsWeb ? 'Browser fallback transcription' : 'Device fallback transcription';
  }

  String strategySummary({bool preferAudioOnly = false}) {
    if (preferAudioOnly) {
      return 'This platform avoids running live transcript capture while the recorder owns the microphone. Lumo keeps the learner audio, then asks for a quick review before advancing.';
    }
    if (_available) {
      return 'Lumo will try live speech-to-text while still saving the learner audio locally, so Mallam can keep moving and the facilitator still has evidence if the transcript is shaky.';
    }
    if (isInRetryCooldown) {
      final remaining = retryCooldownRemaining?.inSeconds ?? _retryCooldown.inSeconds;
      return 'Live transcript restarts are cooling down for about ${remaining}s after repeated failures. Keep teaching in audio-first mode, then retry when the mic settles.';
    }
    return availabilityLabel;
  }

  List<String> strategyActionItems({bool preferAudioOnly = false}) {
    if (preferAudioOnly) {
      return const [
        'Use the saved learner voice as the source of truth on this device.',
        'Type or confirm the answer after playback, then resume hands-free only when it is safe.',
        'Repeat mode is the safest fallback if the learner needs another automated turn.',
      ];
    }
    if (_available) {
      return const [
        'Live transcript can draft the response while the saved audio stays attached as backup.',
        'If the draft looks wrong, verify it once with the saved voice before advancing.',
        'If repeated misses start happening, switch to Repeat mode or pause for manual confirmation.',
      ];
    }
    if (isInRetryCooldown) {
      return const [
        'Keep the lesson moving with saved learner audio and manual confirmation.',
        'Avoid hammering transcript restart while the cooldown is active.',
        'Resume the hands-free loop after the cooldown or once the mic becomes stable again.',
      ];
    }
    return const [
      'Capture learner audio first so no spoken evidence is lost.',
      'Use the response box only after listening back or confirming the draft transcript.',
      'Treat transcript help as optional until the browser or device exposes a stable speech engine.',
    ];
  }

  Future<bool> initialize({bool forceRetry = false}) async {
    final now = DateTime.now();
    final retryBlockedUntil = _retryBlockedUntil;
    final recentRepeatedFailures = _consecutiveStartFailures >= 3 &&
        _lastStartFailureAt != null &&
        now.difference(_lastStartFailureAt!) < _retryCooldown;
    if (forceRetry &&
        ((retryBlockedUntil != null && now.isBefore(retryBlockedUntil)) ||
            recentRepeatedFailures)) {
      _available = false;
      _lastStatus = 'retry-blocked';
      final seconds = retryCooldownRemaining?.inSeconds ?? _retryCooldown.inSeconds;
      _lastError =
          'Speech recognition is cooling down after repeated start failures. Keep saving audio locally for about ${seconds}s, then try again.';
      return false;
    }

    if (_initialized && !forceRetry) return _available;

    _lastError = null;
    _lastStatus = 'initializing';
    try {
      _available = await _engine.initialize(
        onError: (errorMsg) {
          _lastError = _normalizeError(errorMsg);
          if (_shouldCooldownAfterRuntimeError(errorMsg)) {
            _available = false;
            _registerStartFailure();
          }
        },
        onStatus: (status) {
          _lastStatus = status;
        },
        debugLogging: false,
      );
    } catch (error) {
      _available = false;
      _lastError = _normalizeError(error.toString());
    }
    _initialized = true;
    if (_available) {
      return true;
    }

    _registerStartFailure();
    _lastError ??= availabilityLabel;
    return false;
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
          _clearFailureCooldown();
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
        _registerStartFailure();
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

  void _registerStartFailure() {
    _consecutiveStartFailures += 1;
    _lastStartFailureAt = DateTime.now();
    if (_consecutiveStartFailures >= 3) {
      _retryBlockedUntil = _lastStartFailureAt!.add(_retryCooldown);
    }
  }

  void _clearFailureCooldown() {
    _consecutiveStartFailures = 0;
    _lastStartFailureAt = null;
    _retryBlockedUntil = null;
  }

  bool _shouldCooldownAfterRuntimeError(String raw) {
    final lower = raw.toLowerCase();
    return lower.contains('network') ||
        lower.contains('timeout') ||
        lower.contains('audio-capture') ||
        lower.contains('microphone unavailable') ||
        lower.contains('service-not-allowed') ||
        lower.contains('notallowed') ||
        lower.contains('aborted');
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
