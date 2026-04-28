// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;

import 'web_speech_runtime_probe.dart';

bool _looksLocalhost(String? host) {
  final normalized = host?.trim().toLowerCase() ?? '';
  return normalized == 'localhost' ||
      normalized == '127.0.0.1' ||
      normalized == '::1';
}

Object? _getDynamicProperty(Object target, String property) {
  try {
    final dynamic dynamicTarget = target;
    return switch (property) {
      'SpeechRecognition' => dynamicTarget.SpeechRecognition,
      'webkitSpeechRecognition' => dynamicTarget.webkitSpeechRecognition,
      'getUserMedia' => dynamicTarget.getUserMedia,
      _ => null,
    };
  } catch (_) {
    return null;
  }
}

WebSpeechRuntimeSupport inspectPlatformWebSpeechRuntime() {
  final userAgent = html.window.navigator.userAgent;
  final location = html.window.location;
  final host = location.hostname;
  final protocol = location.protocol;
  final origin = location.origin;
  final window = html.window;
  final speechRecognition = _getDynamicProperty(window, 'SpeechRecognition');
  final webkitSpeechRecognition =
      _getDynamicProperty(window, 'webkitSpeechRecognition');
  final speechRecognitionApi = speechRecognition != null
      ? 'SpeechRecognition'
      : webkitSpeechRecognition != null
          ? 'webkitSpeechRecognition'
          : null;
  final mediaDevices = html.window.navigator.mediaDevices;
  final hasGetUserMedia = mediaDevices != null
      ? _getDynamicProperty(mediaDevices, 'getUserMedia') != null
      : false;

  return WebSpeechRuntimeSupport(
    isSpeechRecognitionExposed: speechRecognitionApi != null,
    isSecureContext: html.window.isSecureContext ?? false,
    isOnline: html.window.navigator.onLine == true,
    userAgent: userAgent,
    host: host,
    origin: origin,
    protocol: protocol,
    isLocalhostLike: _looksLocalhost(host),
    hasMediaDevices: mediaDevices != null,
    hasGetUserMedia: hasGetUserMedia,
    exposedSpeechRecognitionApi: speechRecognitionApi,
  );
}
