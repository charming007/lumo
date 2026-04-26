import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';
import 'package:lumo_learner_tablet/seed_data.dart';

class _SeedApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap({String? overrideDeviceIdentifier}) async {
    return LumoBootstrap(
      learners: learnerProfilesSeed,
      modules: learningModules,
      lessons: assignedLessonsSeed,
    );
  }

  @override
  Future<LumoModuleBundle> fetchModuleBundle(String moduleId) async {
    final module = learningModules.firstWhere(
      (item) => item.id == moduleId,
      orElse: () => learningModules.first,
    );
    return LumoModuleBundle(
      module: module,
      lessons: assignedLessonsSeed.where((lesson) => lesson.moduleId == moduleId).toList(),
    );
  }
}

class _FakeBundledContentLoader extends BundledContentLoader {
  const _FakeBundledContentLoader(this.library);
  final BundledContentLibrary library;
  @override
  Future<BundledContentLibrary> load() async => library;
}

void main() {
  testWidgets('debug home', (tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(800, 1280);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final state = LumoAppState(
      apiClient: _SeedApiClient(),
      bundledContentLoader: _FakeBundledContentLoader(
        BundledContentLibrary(modules: learningModules, lessons: assignedLessonsSeed),
      ),
      includeSeedDemoContent: false,
    );

    await tester.pumpWidget(LumoApp(stateOverride: state, includeSeedDemoContent: false));
    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(milliseconds: 300));

    final texts = tester.widgetList<Text>(find.byType(Text)).map((w) => w.data).whereType<String>().toSet().toList()..sort();
    // ignore: avoid_print
    print(texts.join('\n'));
  });
}
