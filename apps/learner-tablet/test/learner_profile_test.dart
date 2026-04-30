import 'package:flutter_test/flutter_test.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  test('LearnerProfile.fromBackend preserves canonical learnerCode and cohort label', () {
    final learner = LearnerProfile.fromBackend({
      'id': 'student-4',
      'name': 'Zainab',
      'age': 12,
      'cohort': 'Afternoon Cohort',
      'learnerCode': 'ZAI-AC12',
      'podLabel': 'Pod 2',
      'level': 'emerging',
      'gender': 'female',
    });

    expect(learner.cohort, 'Afternoon Cohort');
    expect(learner.learnerCode, 'ZAI-AC12');
  });
}
