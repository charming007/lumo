// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:async';
import 'dart:html' as html;

import 'package:flutter/foundation.dart';

import 'browser_runtime_observer.dart';

class _WebBrowserRuntimeObserver implements BrowserRuntimeObserver {
  _WebBrowserRuntimeObserver() {
    _subscriptions.add(
      html.document.onVisibilityChange.listen((_) {
        final hidden = html.document.hidden ?? false;
        _controller.add(
          BrowserRuntimeSignal(
            hidden
                ? BrowserRuntimeSignalKind.hidden
                : BrowserRuntimeSignalKind.visible,
            detail: hidden ? 'Browser tab hidden' : 'Browser tab visible again',
          ),
        );
      }),
    );
    _subscriptions.add(
      html.window.onOffline.listen((_) {
        _controller.add(
          const BrowserRuntimeSignal(
            BrowserRuntimeSignalKind.offline,
            detail: 'Browser went offline',
          ),
        );
      }),
    );
    _subscriptions.add(
      html.window.onOnline.listen((_) {
        _controller.add(
          const BrowserRuntimeSignal(
            BrowserRuntimeSignalKind.online,
            detail: 'Browser is back online',
          ),
        );
      }),
    );

    final mediaDevices = html.window.navigator.mediaDevices;
    if (mediaDevices != null) {
      late void Function(html.Event event) listener;
      listener = (_) {
        _controller.add(
          const BrowserRuntimeSignal(
            BrowserRuntimeSignalKind.deviceChanged,
            detail: 'Audio input/output devices changed',
          ),
        );
      };
      mediaDevices.addEventListener('devicechange', listener);
      _deviceChangeDisposer = () {
        mediaDevices.removeEventListener('devicechange', listener);
      };
    }
  }

  final StreamController<BrowserRuntimeSignal> _controller =
      StreamController<BrowserRuntimeSignal>.broadcast();
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  VoidCallback? _deviceChangeDisposer;

  @override
  Stream<BrowserRuntimeSignal> get signals => _controller.stream;

  @override
  Future<void> dispose() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _deviceChangeDisposer?.call();
    await _controller.close();
  }
}

BrowserRuntimeObserver createPlatformBrowserRuntimeObserver() {
  return _WebBrowserRuntimeObserver();
}
