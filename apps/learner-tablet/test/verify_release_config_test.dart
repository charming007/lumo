import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('verify_release_config accepts seed demo release without device id', () async {
    final result = await Process.run('dart', [
      'run',
      'tool/verify_release_config.dart',
      '--release-target=web',
      '--dart-define=LUMO_ENABLE_SEED_DEMO_CONTENT=true',
      '--dart-define=LUMO_API_BASE_URL=https://lumo-api-production-303a.up.railway.app',
    ]);

    expect(result.exitCode, 0, reason: '${result.stdout}\n${result.stderr}');
    expect(
      result.stdout.toString(),
      contains('with seed demo content enabled and no provisioned tablet identity'),
    );
  });
}
