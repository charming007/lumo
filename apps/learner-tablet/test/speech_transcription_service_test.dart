import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/speech_transcription_service.dart';
import 'package:speech_to_text/speech_to_text.dart';

class FakeSpeechRecognitionEngine implements SpeechRecognitionEngine {
  FakeSpeechRecognitionEngine({
    this.initializeResult = true,
    this.failListenAttempts = 0,
    this.emitTranscriptOnListen,
  });

  bool initializeResult;
  int failListenAttempts;
  void Function(void Function(String transcript, bool isFinal) onResult)?
      emitTranscriptOnListen;
  int listenCalls = 0;
  bool _isListening = false;

  @override
  bool get isListening => _isListening;

  @override
  Future<bool> initialize({
    required void Function(String errorMsg) onError,
    required void Function(String status) onStatus,
    bool debugLogging = false,
  }) async {
    onStatus('initialized');
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

  test('clears retry cooldown after a transcript arrives', () async {
    final engine = FakeSpeechRecognitionEngine(
      emitTranscriptOnListen: (onResult) => onResult('sannu', true),
    );
    final service = SpeechTranscriptionService(engine: engine);

    expect(await service.start(onResult: (_, __) {}), isTrue);
    expect(service.isAvailable, isTrue);
    expect(service.availabilityLabel, contains('ready'));
  });
}
