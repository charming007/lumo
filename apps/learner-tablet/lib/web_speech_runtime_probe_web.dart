// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'web_speech_runtime_probe.dart';

bool _looksLocalhost(String? host) {
  final normalized = (host ?? '').trim().toLowerCase();
  return normalized == 'localhost' ||
      normalized == '127.0.0.1' ||
      normalized == '::1';
}

WebSpeechRuntimeSupport inspectPlatformWebSpeechRuntime() {
  final userAgent = html.window.navigator.userAgent;
  final location = html.window.location;
  final host = location.hostname;
  final protocol = location.protocol;
  final origin = location.origin;
  final window = html.window as JSObject;
  final speechRecognitionApi =
      window.has('SpeechRecognition')
          ? 'SpeechRecognition'
          : window.has('webkitSpeechRecognition')
              ? 'webkitSpeechRecognition'
              : null;
  final mediaDevices = html.window.navigator.mediaDevices;

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
    hasGetUserMedia: mediaDevices != null &&
        (mediaDevices as JSObject).has('getUserMedia'),
    exposedSpeechRecognitionApi: speechRecognitionApi,
  );
}
