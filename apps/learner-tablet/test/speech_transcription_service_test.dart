import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/speech_transcription_service.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'package:lumo_learner_tablet/web_speech_runtime_probe.dart';

class FakeSpeechRecognitionEngine implements SpeechRecognitionEngine {
  FakeSpeechRecognitionEngine({
    this.initializeResult = true,
    this.failInitializeAttempts = 0,
    this.failInitializeError = 'not available',
    this.failListenAttempts = 0,
    this.emitTranscriptOnListen,
  });

  bool initializeResult;
  int failInitializeAttempts;
  String failInitializeError;
  int failListenAttempts;
  void Function(void Function(String transcript, bool isFinal) onResult)?
      emitTranscriptOnListen;
  int listenCalls = 0;
  bool _isListening = false;
  void Function(String errorMsg)? _onError;

  @override
  bool get isListening => _isListening;

  @override
  Future<bool> initialize({
    required void Function(String errorMsg) onError,
    required void Function(String status) onStatus,
    bool debugLogging = false,
  }) async {
    _onError = onError;
    onStatus('initialized');
    if (failInitializeAttempts > 0) {
      failInitializeAttempts -= 1;
      onError(failInitializeError);
      return false;
    }
    return initializeResult;
  }

  @override
  Future<void> listen({
    required void Function(String transcript, bool isFinal) onResult,
    required SpeechListenOptions options,
    required Duration pauseFor,
    required Duration listenFor,
  }) async {
    listenCalls += 1;
    if (failListenAttempts > 0) {
      failListenAttempts -= 1;
      throw Exception('not available');
    }
    _isListening = true;
    emitTranscriptOnListen?.call(onResult);
  }

  @override
  Future<void> stop() async {
    _isListening = false;
  }

  @override
  Future<void> cancel() async {
    _isListening = false;
  }

  void emitRuntimeError(String errorMsg) {
    _onError?.call(errorMsg);
  }
}

void main() {
  test('blocks force-retry briefly after repeated transcript engine failures',
      () async {
    final engine = FakeSpeechRecognitionEngine(failListenAttempts: 6);
    final service = SpeechTranscriptionService(engine: engine);

    expect(
      await service.start(onResult: (_, __) {}),
      isFalse,
    );
    expect(
      await service.start(onResult: (_, __) {}),
      isFalse,
    );
    expect(
      await service.start(onResult: (_, __) {}),
      isFalse,
    );

    final listenCallsBeforeCooldownRetry = engine.listenCalls;
    final ready = await service.initialize(forceRetry: true);

    expect(ready, isFalse);
    expect(service.lastStatus, 'retry-blocked');
    expect(service.lastError, contains('cooling down'));
    expect(engine.listenCalls, listenCallsBeforeCooldownRetry);
  });

  test('blocks force-retry after repeated initialize failures too', () async {
    final engine = FakeSpeechRecognitionEngine(failInitializeAttempts: 3);
    final service = SpeechTranscriptionService(engine: engine);

    expect(await service.initialize(forceRetry: true), isFalse);
    expect(await service.initialize(forceRetry: true), isFalse);
    expect(await service.initialize(forceRetry: true), isFalse);

    final ready = await service.initialize(forceRetry: true);

    expect(ready, isFalse);
    expect(service.lastStatus, 'retry-blocked');
    expect(service.lastError, contains('cooling down'));
  });

  test('clears retry cooldown after a transcript arrives', () async {
    final engine = FakeSpeechRecognitionEngine(
      emitTranscriptOnListen: (onResult) => onResult('sannu', true),
    );
    final service = SpeechTranscriptionService(engine: engine);

    expect(await service.start(onResult: (_, __) {}), isTrue);
    expect(service.isAvailable, isTrue);
    expect(service.availabilityLabel, contains('ready'));
  });

  test(
      'runtime-style transcript errors expose cooldown guidance with remaining time',
      () async {
    final engine = FakeSpeechRecognitionEngine(
      failInitializeAttempts: 3,
      failInitializeError: 'network timeout',
    );
    final service = SpeechTranscriptionService(engine: engine);

    expect(await service.initialize(forceRetry: true), isFalse);
    expect(await service.initialize(forceRetry: true), isFalse);
    expect(await service.initialize(forceRetry: true), isFalse);

    expect(service.isInRetryCooldown, isTrue);
    expect(service.availabilityLabel, contains('Retry cooldown'));
    expect(service.availabilityLabel, contains('manual confirmation'));
    expect(service.lastError, contains('cooling down'));
  });

  test('surfaces runtime transcript errors through the live onError callback',
      () async {
    final engine = FakeSpeechRecognitionEngine();
    final service = SpeechTranscriptionService(engine: engine);
    final seenErrors = <String>[];

    expect(
      await service.start(
        onResult: (_, __) {},
        onError: seenErrors.add,
      ),
      isTrue,
    );

    engine.emitRuntimeError('microphone unavailable');

    expect(seenErrors, isNotEmpty);
    expect(seenErrors.last, contains('microphone became unavailable'));
    expect(service.lastError, contains('microphone became unavailable'));
  });

  test('explains when the browser does not expose speech recognition', () async {
    final engine = FakeSpeechRecognitionEngine();
    final service = SpeechTranscriptionService(
      engine: engine,
      inspectWebRuntime: () => const WebSpeechRuntimeSupport(
        isSpeechRecognitionExposed: false,
        isSecureContext: true,
        isOnline: true,
        userAgent: 'Firefox',
      ),
    );

    expect(await service.initialize(forceRetry: true), isFalse);
    expect(service.lastStatus, 'web-runtime-blocked');
    expect(service.lastError, contains('does not expose live speech recognition'));
  });

  test('explains when browser transcript is blocked by insecure context', () async {
    final engine = FakeSpeechRecognitionEngine();
    final service = SpeechTranscriptionService(
      engine: engine,
      inspectWebRuntime: () => const WebSpeechRuntimeSupport(
        isSpeechRecognitionExposed: true,
        isSecureContext: false,
        isOnline: true,
        userAgent: 'Chrome',
      ),
    );

    expect(await service.initialize(forceRetry: true), isFalse);
    expect(service.lastStatus, 'web-runtime-blocked');
    expect(service.lastError, contains('secure HTTPS context'));
  });
}
