import 'dart:io';

void main(List<String> args) async {
  final parsed = _parseArgs(args);
  final releaseTarget = parsed.releaseTarget;
  if (releaseTarget == null || releaseTarget.isEmpty) {
    stderr.writeln(
      'Learner-tablet release build needs --release-target=<web|apk|appbundle|ipa|macos|windows|linux>.',
    );
    exitCode = 64;
    return;
  }

  final flutterTarget = _flutterBuildTarget(releaseTarget);
  if (flutterTarget == null) {
    stderr.writeln(
      'Unsupported learner release target "$releaseTarget". Use one of: web, apk, appbundle, ipa, macos, windows, linux.',
    );
    exitCode = 64;
    return;
  }

  final verifyProcess = await Process.start(
    'dart',
    [
      'run',
      'tool/verify_release_config.dart',
      '--release-target=$releaseTarget',
      ...parsed.dartDefines.entries.map(
        (entry) => '--dart-define=${entry.key}=${entry.value}',
      ),
    ],
    mode: ProcessStartMode.inheritStdio,
  );

  final verifyExitCode = await verifyProcess.exitCode;
  if (verifyExitCode != 0) {
    exitCode = verifyExitCode;
    return;
  }

  final flutterArgs = [
    'build',
    flutterTarget,
    '--release',
    if (releaseTarget.trim().toLowerCase() == 'web' &&
        !parsed.forwardedArgs.contains('--no-wasm-dry-run'))
      '--no-wasm-dry-run',
    ...parsed.dartDefines.entries.map(
      (entry) => '--dart-define=${entry.key}=${entry.value}',
    ),
    ...parsed.forwardedArgs,
  ];

  final buildProcess = await Process.start(
    'flutter',
    flutterArgs,
    mode: ProcessStartMode.inheritStdio,
  );

  exitCode = await buildProcess.exitCode;
}

class _ParsedArgs {
  const _ParsedArgs({
    required this.releaseTarget,
    required this.dartDefines,
    required this.forwardedArgs,
  });

  final String? releaseTarget;
  final Map<String, String> dartDefines;
  final List<String> forwardedArgs;
}

_ParsedArgs _parseArgs(List<String> args) {
  String? releaseTarget;
  final dartDefines = <String, String>{};
  final forwardedArgs = <String>[];

  for (final arg in args) {
    if (arg.startsWith('--release-target=')) {
      releaseTarget = arg.substring('--release-target='.length).trim();
      continue;
    }

    if (arg.startsWith('--dart-define=')) {
      final define = arg.substring('--dart-define='.length);
      final separatorIndex = define.indexOf('=');
      if (separatorIndex > 0) {
        dartDefines[define.substring(0, separatorIndex)] =
            define.substring(separatorIndex + 1);
      }
      continue;
    }

    forwardedArgs.add(arg);
  }

  return _ParsedArgs(
    releaseTarget: releaseTarget,
    dartDefines: dartDefines,
    forwardedArgs: forwardedArgs,
  );
}

String? _flutterBuildTarget(String releaseTarget) {
  switch (releaseTarget.trim().toLowerCase()) {
    case 'web':
    case 'apk':
    case 'appbundle':
    case 'ipa':
    case 'macos':
    case 'windows':
    case 'linux':
      return releaseTarget.trim().toLowerCase();
    default:
      return null;
  }
}
