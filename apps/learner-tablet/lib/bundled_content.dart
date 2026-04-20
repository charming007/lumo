import 'dart:convert';

import 'package:flutter/services.dart';

import 'models.dart';

class BundledContentLibrary {
  final List<LearningModule> modules;
  final List<LessonCardModel> lessons;

  const BundledContentLibrary({
    this.modules = const [],
    this.lessons = const [],
  });

  bool get isEmpty => modules.isEmpty && lessons.isEmpty;
}

class BundledContentLoader {
  const BundledContentLoader();

  static const String _indexAsset = 'assets/content_packs/index.json';

  Future<BundledContentLibrary> load() async {
    final index = await _readJsonAsset(_indexAsset);
    final packEntries = (index['packs'] as List?)
            ?.whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList() ??
        const <Map<String, dynamic>>[];

    final modules = <LearningModule>[];
    final seenModuleIds = <String>{};
    final lessons = <LessonCardModel>[];
    final seenLessonIds = <String>{};

    for (final packEntry in packEntries) {
      final packManifestPath = packEntry['manifest']?.toString().trim();
      if (packManifestPath == null || packManifestPath.isEmpty) continue;

      final packManifest = await _readJsonAsset(packManifestPath);
      final lessonEntries = (packManifest['lessons'] as List?)
              ?.whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList() ??
          const <Map<String, dynamic>>[];

      for (final lessonEntry in lessonEntries) {
        final moduleJson = lessonEntry['module'];
        if (moduleJson is Map) {
          final module = LearningModule.fromBackend(
            Map<String, dynamic>.from(moduleJson),
          );
          if (seenModuleIds.add(module.id)) {
            modules.add(module);
          }
        }

        final lessonManifestPath = lessonEntry['manifest']?.toString().trim();
        if (lessonManifestPath == null || lessonManifestPath.isEmpty) continue;

        final lessonManifest = await _readJsonAsset(lessonManifestPath);
        final lessonJson = lessonManifest['lesson'];
        if (lessonJson is! Map) continue;
        final resolvedLessonJson = _resolveLessonMedia(
          lessonJson: Map<String, dynamic>.from(lessonJson),
          lessonManifest: lessonManifest,
        );
        final lesson = LessonCardModel.fromBackend(resolvedLessonJson);
        if (seenLessonIds.add(lesson.id)) {
          lessons.add(lesson);
        }
      }
    }

    return BundledContentLibrary(modules: modules, lessons: lessons);
  }

  Map<String, dynamic> _resolveLessonMedia({
    required Map<String, dynamic> lessonJson,
    required Map<String, dynamic> lessonManifest,
  }) {
    final lessonId = lessonJson['id']?.toString().trim();
    final mediaLookup = _buildOfflineMediaLookup(lessonManifest);
    final rawSteps = (lessonJson['activitySteps'] as List?)
            ?.whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList() ??
        const <Map<String, dynamic>>[];

    final resolvedSteps = rawSteps
        .map(
          (step) => _resolveStepMedia(
            step,
            lessonId: lessonId,
            mediaLookup: mediaLookup,
          ),
        )
        .toList(growable: false);

    return {
      ...lessonJson,
      'activitySteps': resolvedSteps,
    };
  }

  Map<String, _BundledMediaItem> _buildOfflineMediaLookup(
    Map<String, dynamic> lessonManifest,
  ) {
    final offlineMedia = lessonManifest['offlineMedia'];
    if (offlineMedia is! Map) return const <String, _BundledMediaItem>{};

    final basePath = offlineMedia['basePath']?.toString().trim() ?? '';
    final items = (offlineMedia['items'] as List?)
            ?.whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList() ??
        const <Map<String, dynamic>>[];

    final lookup = <String, _BundledMediaItem>{};
    for (final item in items) {
      final id = item['id']?.toString().trim();
      final kind = item['kind']?.toString().trim();
      final relativePath = item['relativePath']?.toString().trim();
      final text = item['text']?.toString().trim();
      final label = item['label']?.toString().trim();
      if (id == null || id.isEmpty || kind == null || kind.isEmpty) continue;

      final assetPath = _joinAssetPath(basePath, relativePath);
      final normalizedKind = kind.toLowerCase();
      final inlineText = text != null && text.isNotEmpty
          ? text
          : (normalizedKind == 'prompt-card' || normalizedKind == 'text') &&
                  label != null &&
                  label.isNotEmpty
              ? label
              : null;
      lookup[id] = _BundledMediaItem(
        id: id,
        kind: kind,
        assetPath: assetPath,
        textValue: inlineText,
      );
    }

    return lookup;
  }

  Map<String, dynamic> _resolveStepMedia(
    Map<String, dynamic> step, {
    required String? lessonId,
    required Map<String, _BundledMediaItem> mediaLookup,
  }) {
    return {
      ...step,
      if (step['media'] is List)
        'media': _resolveMediaList(
          (step['media'] as List).whereType<Map>(),
          lessonId: lessonId,
          mediaLookup: mediaLookup,
        ),
      if (step['choices'] is List)
        'choices': (step['choices'] as List)
            .whereType<Map>()
            .map((choice) => {
                  ...Map<String, dynamic>.from(choice),
                  if (choice['media'] is Map || choice['media'] is List)
                    'media': _resolveChoiceMedia(
                      choice['media'],
                      lessonId: lessonId,
                      mediaLookup: mediaLookup,
                      fallbackLabel:
                          choice['label']?.toString().trim() ?? 'Choice',
                    ),
                })
            .toList(growable: false),
    };
  }

  Object _resolveChoiceMedia(
    Object? rawMedia, {
    required String? lessonId,
    required Map<String, _BundledMediaItem> mediaLookup,
    required String fallbackLabel,
  }) {
    final resolved = rawMedia is List
        ? _resolveMediaList(
            rawMedia.whereType<Map>(),
            lessonId: lessonId,
            mediaLookup: mediaLookup,
            fallbackLabel: fallbackLabel,
          )
        : rawMedia is Map
            ? _resolveMediaList(
                [rawMedia],
                lessonId: lessonId,
                mediaLookup: mediaLookup,
                fallbackLabel: fallbackLabel,
              )
            : const <Map<String, dynamic>>[];

    return resolved.length == 1 ? resolved.first : resolved;
  }

  List<Map<String, dynamic>> _resolveMediaList(
    Iterable<Map> rawMedia, {
    required String? lessonId,
    required Map<String, _BundledMediaItem> mediaLookup,
    String? fallbackLabel,
  }) {
    final resolved = <Map<String, dynamic>>[];

    for (final entry in rawMedia) {
      final media = Map<String, dynamic>.from(entry);
      final kind = media['kind']?.toString().trim().toLowerCase();
      final value = media['value']?.toString().trim();
      if (kind == 'asset-ref' && value != null && value.isNotEmpty) {
        final bundled = _resolveBundledAssetRef(
          value,
          lessonId: lessonId,
          mediaLookup: mediaLookup,
        );
        if (bundled != null) {
          final resolvedValue = bundled.resolvedValue;
          if (resolvedValue != null && resolvedValue.isNotEmpty) {
            resolved.add({
              ...media,
              'kind': bundled.kind,
              'value': resolvedValue,
            });
          }
          if (fallbackLabel != null &&
              fallbackLabel.isNotEmpty &&
              bundled.kind != 'prompt-card' &&
              bundled.kind != 'text') {
            resolved.add({
              'kind': 'prompt-card',
              'value': fallbackLabel,
            });
          }
          continue;
        }
      }
      resolved.add(media);
    }

    return resolved;
  }

  _BundledMediaItem? _resolveBundledAssetRef(
    String value, {
    required String? lessonId,
    required Map<String, _BundledMediaItem> mediaLookup,
  }) {
    final parts = value.split(':');
    if (parts.length != 3 || parts.first != 'bundle') return null;

    final referencedLessonId = parts[1].trim();
    final mediaId = parts[2].trim();
    if (mediaId.isEmpty) return null;
    if (lessonId != null &&
        lessonId.isNotEmpty &&
        referencedLessonId.isNotEmpty &&
        referencedLessonId != lessonId) {
      return null;
    }

    return mediaLookup[mediaId];
  }

  String? _joinAssetPath(String basePath, String? relativePath) {
    final trimmedRelative = relativePath?.trim() ?? '';
    if (trimmedRelative.isEmpty) {
      return basePath.trim().isEmpty ? null : basePath.trim();
    }
    if (basePath.trim().isEmpty) return trimmedRelative;
    final normalizedBase = basePath.endsWith('/')
        ? basePath.substring(0, basePath.length - 1)
        : basePath;
    final normalizedRelative = trimmedRelative.startsWith('/')
        ? trimmedRelative.substring(1)
        : trimmedRelative;
    return '$normalizedBase/$normalizedRelative';
  }

  Future<Map<String, dynamic>> _readJsonAsset(String assetPath) async {
    final raw = await rootBundle.loadString(assetPath);
    final decoded = jsonDecode(raw);
    if (decoded is! Map) {
      throw const FormatException('Expected JSON object asset manifest.');
    }
    return Map<String, dynamic>.from(decoded);
  }
}

class _BundledMediaItem {
  final String id;
  final String kind;
  final String? assetPath;
  final String? textValue;

  const _BundledMediaItem({
    required this.id,
    required this.kind,
    required this.assetPath,
    this.textValue,
  });

  String? get resolvedValue => textValue ?? assetPath;
}
