import 'dart:async';

import 'browser_runtime_observer.dart';

class _NoopBrowserRuntimeObserver implements BrowserRuntimeObserver {
  final StreamController<BrowserRuntimeSignal> _controller =
      StreamController<BrowserRuntimeSignal>.broadcast();

  @override
  Stream<BrowserRuntimeSignal> get signals => _controller.stream;

  @override
  Future<void> dispose() => _controller.close();
}

BrowserRuntimeObserver createPlatformBrowserRuntimeObserver() {
  return _NoopBrowserRuntimeObserver();
}
