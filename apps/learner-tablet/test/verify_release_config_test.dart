import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('verify_release_config rejects seed demo release without device id', () async {
    final result = await Process.run('dart', [
      'run',
      'tool/verify_release_config.dart',
      '--release-target=web',
      '--dart-define=LUMO_ENABLE_SEED_DEMO_CONTENT=true',
      '--dart-define=LUMO_API_BASE_URL=https://lumo-api-production-303a.up.railway.app',
    ]);

    expect(result.exitCode, isNonZero,
        reason: '${result.stdout}\n${result.stderr}');
    expect(
      result.stderr.toString(),
      contains('no LUMO_DEVICE_IDENTIFIER'),
    );
  });
}
