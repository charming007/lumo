// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;
import 'dart:js_util' as js_util;

import 'web_speech_runtime_probe.dart';

bool _looksLocalhost(String? host) {
  final normalized = host?.trim().toLowerCase() ?? '';
  return normalized == 'localhost' ||
      normalized == '127.0.0.1' ||
      normalized == '::1';
}

bool _hasProperty(Object target, String property) {
  try {
    return js_util.hasProperty(target, property);
  } catch (_) {
    return false;
  }
}

Object? _getPropertyIfPresent(Object target, String property) {
  if (!_hasProperty(target, property)) {
    return null;
  }

  try {
    return js_util.getProperty<Object?>(target, property);
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
  final speechRecognition = _getPropertyIfPresent(window, 'SpeechRecognition');
  final webkitSpeechRecognition =
      _getPropertyIfPresent(window, 'webkitSpeechRecognition');
  final speechRecognitionApi = speechRecognition != null
      ? 'SpeechRecognition'
      : webkitSpeechRecognition != null
          ? 'webkitSpeechRecognition'
          : null;
  final mediaDevices = html.window.navigator.mediaDevices;
  final hasGetUserMedia = mediaDevices != null
      ? _getPropertyIfPresent(mediaDevices, 'getUserMedia') != null
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
