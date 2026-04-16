import 'package:flutter/foundation.dart';

import 'web_speech_runtime_probe_stub.dart'
    if (dart.library.html) 'web_speech_runtime_probe_web.dart';

class WebSpeechRuntimeSupport {
  const WebSpeechRuntimeSupport({
    required this.isSpeechRecognitionExposed,
    required this.isSecureContext,
    required this.isOnline,
    required this.userAgent,
  });

  final bool isSpeechRecognitionExposed;
  final bool isSecureContext;
  final bool isOnline;
  final String? userAgent;

  bool get looksSupported =>
      isSpeechRecognitionExposed && isSecureContext && isOnline;
}

WebSpeechRuntimeSupport? inspectWebSpeechRuntime() {
  if (!kIsWeb) return null;
  return inspectPlatformWebSpeechRuntime();
}
