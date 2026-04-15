import 'dart:async';

import 'package:flutter/foundation.dart';

import 'browser_runtime_observer_stub.dart'
    if (dart.library.html) 'browser_runtime_observer_web.dart';

enum BrowserRuntimeSignalKind {
  hidden,
  visible,
  offline,
  online,
  deviceChanged
}

class BrowserRuntimeSignal {
  const BrowserRuntimeSignal(this.kind, {this.detail});

  final BrowserRuntimeSignalKind kind;
  final String? detail;
}

abstract class BrowserRuntimeObserver {
  Stream<BrowserRuntimeSignal> get signals;
  Future<void> dispose();
}

BrowserRuntimeObserver createBrowserRuntimeObserver() {
  if (!kIsWeb) {
    return createPlatformBrowserRuntimeObserver();
  }
  return createPlatformBrowserRuntimeObserver();
}
