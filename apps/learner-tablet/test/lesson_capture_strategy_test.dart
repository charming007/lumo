import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/lesson_capture_strategy.dart';
import 'package:lumo_learner_tablet/web_speech_runtime_probe.dart';

void main() {
  test('allows concurrent capture on supported secure web runtime', () {
    expect(
      shouldAvoidConcurrentSpeechCapture(
        isWeb: true,
        platform: TargetPlatform.android,
        webRuntime: const WebSpeechRuntimeSupport(
          isSpeechRecognitionExposed: true,
          isSecureContext: true,
          isOnline: true,
          userAgent: 'Chrome',
        ),
      ),
      isFalse,
    );
  });

  test('keeps audio-first fallback on unsupported web runtime', () {
    expect(
      shouldAvoidConcurrentSpeechCapture(
        isWeb: true,
        platform: TargetPlatform.android,
        webRuntime: const WebSpeechRuntimeSupport(
          isSpeechRecognitionExposed: false,
          isSecureContext: true,
          isOnline: true,
          userAgent: 'Firefox',
        ),
      ),
      isTrue,
    );
  });

  test('keeps native Apple platforms in audio-first mode', () {
    expect(
      shouldAvoidConcurrentSpeechCapture(
        isWeb: false,
        platform: TargetPlatform.iOS,
      ),
      isTrue,
    );
    expect(
      shouldAvoidConcurrentSpeechCapture(
        isWeb: false,
        platform: TargetPlatform.macOS,
      ),
      isTrue,
    );
  });

  test('allows non-Apple native platforms to attempt concurrent capture', () {
    expect(
      shouldAvoidConcurrentSpeechCapture(
        isWeb: false,
        platform: TargetPlatform.android,
      ),
      isFalse,
    );
  });
}
