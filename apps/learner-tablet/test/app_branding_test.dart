import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final projectRoot = Directory.current;
  final mainSource = File('${projectRoot.path}/lib/main.dart').readAsStringSync();
  final webIndexSource = File('${projectRoot.path}/web/index.html').readAsStringSync();
  final webManifestSource = File('${projectRoot.path}/web/manifest.json').readAsStringSync();
  final androidManifestSource = File('${projectRoot.path}/android/app/src/main/AndroidManifest.xml').readAsStringSync();
  final iosInfoPlistSource = File('${projectRoot.path}/ios/Runner/Info.plist').readAsStringSync();

  test('learner app uses the shipped Lumo Learner title in Flutter', () {
    expect(mainSource, contains("title: 'Lumo Learner'"));
    expect(mainSource, isNot(contains("title: 'Lumo'")));
  });

  test('web shell ships the learner-facing title and description', () {
    expect(webIndexSource, contains('content="Lumo Learner is the shared-tablet lesson app for guided, voice-first learning."'));
    expect(webIndexSource, contains('content="Lumo Learner"'));
    expect(webIndexSource, contains('<title>Lumo Learner</title>'));
    expect(webIndexSource, isNot(contains('A new Flutter project.')));
    expect(webIndexSource, isNot(contains('lumo_learner_tablet')));
  });

  test('web manifest ships learner-facing install metadata', () {
    expect(webManifestSource, contains('"name": "Lumo Learner"'));
    expect(webManifestSource, contains('"short_name": "Lumo"'));
    expect(webManifestSource, contains('"description": "Lumo Learner is the shared-tablet lesson app for guided, voice-first learning."'));
    expect(webManifestSource, isNot(contains('A new Flutter project.')));
    expect(webManifestSource, isNot(contains('lumo_learner_tablet')));
  });

  test('native shells expose the learner-facing app name', () {
    expect(androidManifestSource, contains('android:label="Lumo Learner"'));
    expect(iosInfoPlistSource, contains('<string>Lumo Learner</string>'));
    expect(androidManifestSource, isNot(contains('lumo_learner_tablet')));
    expect(iosInfoPlistSource, isNot(contains('lumo_learner_tablet')));
    expect(iosInfoPlistSource, isNot(contains('Lumo Learner Tablet')));
  });
}
