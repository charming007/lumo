import 'package:flutter/foundation.dart';

import 'web_speech_runtime_probe.dart';

bool shouldAvoidConcurrentSpeechCapture({
  required bool isWeb,
  required TargetPlatform platform,
  WebSpeechRuntimeSupport? webRuntime,
}) {
  if (isWeb) {
    final runtime = webRuntime;
    if (runtime == null) {
      return true;
    }
    return !runtime.looksSupported;
  }

  return switch (platform) {
    TargetPlatform.macOS || TargetPlatform.iOS => true,
    _ => false,
  };
}
