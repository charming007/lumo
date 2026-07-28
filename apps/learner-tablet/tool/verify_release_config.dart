import 'dart:io';

import 'package:lumo_learner_tablet/api_client.dart';

void main(List<String> args) {
  final parsed = _parseArgs(args);
  final releaseTarget = parsed.releaseTarget;
  if (releaseTarget == null || releaseTarget.isEmpty) {
    stderr.writeln(
      'Learner-tablet release config check needs --release-target=<web|appbundle|ipa|macos|windows|linux>.',
    );
    exitCode = 64;
    return;
  }

  final issues = learnerReleaseBuildConfigIssues(
    rawApiBaseUrl: parsed.dartDefines['LUMO_API_BASE_URL'] ?? '',
    hasExplicitApiBaseUrl: parsed.dartDefines.containsKey('LUMO_API_BASE_URL'),
    rawDeviceIdentifier: parsed.dartDefines['LUMO_DEVICE_IDENTIFIER'] ?? '',
    includeSeedDemoContent:
        (parsed.dartDefines['LUMO_ENABLE_SEED_DEMO_CONTENT'] ?? '')
                .trim()
                .toLowerCase() ==
            'true',
  );

  if (issues.isNotEmpty) {
    stderr.writeln(
      'Learner-tablet $releaseTarget release config is not shippable:',
    );
    for (final issue in issues) {
      stderr.writeln('- $issue');
    }
    exitCode = 64;
    return;
  }

  stdout.writeln(
    'Learner-tablet $releaseTarget release config looks shippable for ${LumoApiClient.normalizeBaseUrl(parsed.dartDefines['LUMO_API_BASE_URL']!)} with device ${parsed.dartDefines['LUMO_DEVICE_IDENTIFIER']!.trim()}.',
  );
}

class _ParsedArgs {
  const _ParsedArgs({required this.releaseTarget, required this.dartDefines});

  final String? releaseTarget;
  final Map<String, String> dartDefines;
}

_ParsedArgs _parseArgs(List<String> args) {
  String? releaseTarget;
  final dartDefines = <String, String>{};

  for (final arg in args) {
    if (arg.startsWith('--release-target=')) {
      releaseTarget = arg.substring('--release-target='.length).trim();
      continue;
    }
    if (!arg.startsWith('--dart-define=')) {
      continue;
    }
    final define = arg.substring('--dart-define='.length);
    final separatorIndex = define.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    dartDefines[define.substring(0, separatorIndex)] =
        define.substring(separatorIndex + 1);
  }

  return _ParsedArgs(releaseTarget: releaseTarget, dartDefines: dartDefines);
}
