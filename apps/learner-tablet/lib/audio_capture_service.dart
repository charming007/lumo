import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class AudioCaptureResult {
  final String path;
  final Duration duration;

  const AudioCaptureResult({required this.path, required this.duration});
}

class AudioCaptureService {
  AudioCaptureService() : _recorder = AudioRecorder();

  final AudioRecorder _recorder;
  DateTime? _recordingStartedAt;

  Future<bool> hasPermission() => _recorder.hasPermission();

  Future<void> start({String? fileStem}) async {
    final hasMicPermission = await _recorder.hasPermission();
    if (!hasMicPermission) {
      throw const AudioCaptureException(
        'Microphone permission was denied. Allow mic access to capture learner voice.',
      );
    }

    final recordingsDir = await _recordingsDirectory();
    final safeStem = (fileStem == null || fileStem.trim().isEmpty)
        ? 'learner-voice'
        : fileStem.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '-');
    final filePath =
        '${recordingsDir.path}/$safeStem-${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 128000,
        sampleRate: 44100,
      ),
      path: filePath,
    );
    _recordingStartedAt = DateTime.now();
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
    final baseDir = await getApplicationDocumentsDirectory();
    final dir = Directory('${baseDir.path}/learner_recordings');
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
