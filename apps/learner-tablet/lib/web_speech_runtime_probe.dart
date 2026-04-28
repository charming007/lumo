import 'package:flutter/foundation.dart';

import 'web_speech_runtime_probe_stub.dart'
    if (dart.library.html) 'web_speech_runtime_probe_web.dart';

class WebSpeechRuntimeSupport {
  const WebSpeechRuntimeSupport({
    required this.isSpeechRecognitionExposed,
    required this.isSecureContext,
    required this.isOnline,
    required this.userAgent,
    this.host,
    this.origin,
    this.protocol,
    this.isLocalhostLike = false,
    this.hasMediaDevices = false,
    this.hasGetUserMedia = false,
    this.exposedSpeechRecognitionApi,
  });

  final bool isSpeechRecognitionExposed;
  final bool isSecureContext;
  final bool isOnline;
  final String? userAgent;
  final String? host;
  final String? origin;
  final String? protocol;
  final bool isLocalhostLike;
  final bool hasMediaDevices;
  final bool hasGetUserMedia;
  final String? exposedSpeechRecognitionApi;

  bool get looksSupported =>
      isSpeechRecognitionExposed &&
      isSecureContext &&
      isOnline &&
      hasMediaDevices &&
      hasGetUserMedia;

  String get debugSummary {
    final parts = <String>[
      'speechApi=${isSpeechRecognitionExposed ? (exposedSpeechRecognitionApi ?? 'exposed') : 'missing'}',
      'secure=$isSecureContext',
      'online=$isOnline',
      'mediaDevices=$hasMediaDevices',
      'getUserMedia=$hasGetUserMedia',
      if (protocol != null) 'protocol=$protocol',
      if (host != null) 'host=$host',
      'localhost=$isLocalhostLike',
    ];
    return parts.join(', ');
  }
}

bool looksLikeBrowserWithWebSpeechExposure(String? userAgent) {
  final normalized = userAgent?.toLowerCase() ?? '';
  if (normalized.isEmpty) return false;

  final isChromium = normalized.contains('chrome/') ||
      normalized.contains('crios/') ||
      normalized.contains('edg/') ||
      normalized.contains('edga/') ||
      normalized.contains('edgios/');
  final isExplicitlyUnsupported = normalized.contains('firefox/') ||
      normalized.contains('fxios/') ||
      normalized.contains('opr/') ||
      normalized.contains('opera/');

  return isChromium && !isExplicitlyUnsupported;
}

WebSpeechRuntimeSupport? inspectWebSpeechRuntime() {
  if (!kIsWeb) return null;
  return inspectPlatformWebSpeechRuntime();
}
