import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
      'non-lesson runtime keeps opaque hit-testing on learner, subject, and navigation tap targets',
      () {
    final mainSource = File('lib/main.dart').readAsStringSync();
    final shellSource = File('lib/design_shell.dart').readAsStringSync();

    expect(
      mainSource,
      contains('behavior: HitTestBehavior.opaque'),
      reason:
          'custom non-lesson tap regions should opt into opaque hit-testing on tablet/web instead of relying on fragile defaults',
    );
    expect(
      mainSource,
      contains("title: 'Student list'"),
      reason: 'home quick actions should remain part of the protected tap path',
    );
    expect(
      mainSource,
      contains('class _SubjectCard extends StatelessWidget'),
      reason: 'subject cards are one of the key non-lesson click targets',
    );
    expect(
      mainSource,
      contains('class _LearnerBackAffordance extends StatelessWidget'),
      reason:
          'navigation affordances should stay in the hardened non-lesson tap path',
    );
    expect(
      shellSource,
      contains('behavior: HitTestBehavior.opaque'),
      reason:
          'top-bar/logo gesture targets should also use explicit opaque hit-testing',
    );
  });
}
