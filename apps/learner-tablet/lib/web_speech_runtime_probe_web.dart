// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;

import 'web_speech_runtime_probe.dart';

WebSpeechRuntimeSupport inspectPlatformWebSpeechRuntime() {
  final userAgent = html.window.navigator.userAgent;
  final normalized = userAgent.toLowerCase();
  final exposesSpeechRecognition = (normalized.contains('chrome/') ||
          normalized.contains('edg/') ||
          normalized.contains('edga/') ||
          normalized.contains('crios/')) &&
      !normalized.contains('firefox/') &&
      !normalized.contains('fxios/') &&
      !normalized.contains('safari/') &&
      !normalized.contains('opr/');

  return WebSpeechRuntimeSupport(
    isSpeechRecognitionExposed: exposesSpeechRecognition,
    isSecureContext: html.window.isSecureContext ?? false,
    isOnline: html.window.navigator.onLine == true,
    userAgent: userAgent,
  );
}
