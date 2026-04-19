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
    final lessons = <LessonCardModel>[];

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
          modules.add(
            LearningModule.fromBackend(Map<String, dynamic>.from(moduleJson)),
          );
        }

        final lessonManifestPath = lessonEntry['manifest']?.toString().trim();
        if (lessonManifestPath == null || lessonManifestPath.isEmpty) continue;

        final lessonManifest = await _readJsonAsset(lessonManifestPath);
        final lessonJson = lessonManifest['lesson'];
        if (lessonJson is! Map) continue;
        lessons.add(
          LessonCardModel.fromBackend(Map<String, dynamic>.from(lessonJson)),
        );
      }
    }

    return BundledContentLibrary(modules: modules, lessons: lessons);
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
