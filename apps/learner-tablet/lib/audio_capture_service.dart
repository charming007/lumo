import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class AudioCaptureResult {
  final String path;
  final Duration duration;

  const AudioCaptureResult({required this.path, required this.duration});
}

class AudioStartResult {
  final bool started;
  final String? message;

  const AudioStartResult({required this.started, this.message});
}

class AudioCaptureService {
  AudioCaptureService() : _recorder = AudioRecorder();

  final AudioRecorder _recorder;
  DateTime? _recordingStartedAt;

  Future<bool> hasPermission() => _recorder.hasPermission();

  Future<AudioStartResult> startSafely({String? fileStem}) async {
    final hasMicPermission = await _recorder.hasPermission();
    if (!hasMicPermission) {
      throw const AudioCaptureException(
        'Microphone permission was denied. Allow mic access to capture learner voice.',
      );
    }

    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }

    final recordingsDir = await _recordingsDirectory();
    final safeStem = (fileStem == null || fileStem.trim().isEmpty)
        ? 'learner-voice'
        : fileStem.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '-');
    final timestamp = DateTime.now().millisecondsSinceEpoch;

    final attempts = <({RecordConfig config, String extension, String? note})>[
      (
        config: const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        extension: 'm4a',
        note: null,
      ),
      (
        config: const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          numChannels: 1,
        ),
        extension: 'wav',
        note:
            'Fallback recording mode is active because the preferred encoder was unavailable.',
      ),
    ];

    Object? lastError;
    for (final attempt in attempts) {
      final filePath =
          '${recordingsDir.path}/$safeStem-$timestamp.${attempt.extension}';
      try {
        await _recorder.start(attempt.config, path: filePath);
        _recordingStartedAt = DateTime.now();
        return AudioStartResult(started: true, message: attempt.note);
      } catch (error) {
        lastError = error;
      }
    }

    throw AudioCaptureException(
      'Unable to start learner voice capture on this device: ${lastError ?? 'unknown recorder error'}',
    );
  }

  Future<AudioCaptureResult?> stop() async {
    final path = await _recorder.stop();
    final startedAt = _recordingStartedAt;
    _recordingStartedAt = null;
    if (path == null) return null;

    final duration = startedAt == null
        ? Duration.zero
        : DateTime.now().difference(startedAt);

    return AudioCaptureResult(path: path, duration: duration);
  }

  Future<bool> get isRecording async => _recorder.isRecording();

  Future<void> dispose() => _recorder.dispose();

  Future<Directory> _recordingsDirectory() async {
    try {
      final baseDir = await getApplicationDocumentsDirectory();
      return _ensureDirectory('${baseDir.path}/learner_recordings');
    } on MissingPluginException {
      return _fallbackRecordingsDirectory();
    } catch (_) {
      return _fallbackRecordingsDirectory();
    }
  }

  Future<Directory> _fallbackRecordingsDirectory() async {
    final home = Platform.environment['HOME'];
    final userProfile = Platform.environment['USERPROFILE'];
    final appData = Platform.environment['APPDATA'];

    final candidates = <String>[
      if (Platform.isMacOS && home != null)
        '$home/Library/Application Support/Lumo Learner/learner_recordings',
      if (Platform.isWindows && appData != null)
        '$appData\\Lumo Learner\\learner_recordings',
      if (Platform.isWindows && userProfile != null)
        '$userProfile\\AppData\\Roaming\\Lumo Learner\\learner_recordings',
      if ((Platform.isLinux || Platform.isAndroid) && home != null)
        '$home/.local/share/lumo_learner/learner_recordings',
      if (home != null) '$home/lumo_learner_recordings',
      '${Directory.systemTemp.path}/lumo_learner_recordings',
    ];

    for (final path in candidates) {
      try {
        return await _ensureDirectory(path);
      } catch (_) {
        continue;
      }
    }

    throw const AudioCaptureException(
      'Unable to prepare a local folder for learner recordings on this device.',
    );
  }

  Future<Directory> _ensureDirectory(String path) async {
    final dir = Directory(path);
    if (!dir.existsSync()) {
      await dir.create(recursive: true);
    }
    return dir;
  }
}

class AudioCaptureException implements Exception {
  final String message;

  const AudioCaptureException(this.message);

  @override
  String toString() => message;
}
