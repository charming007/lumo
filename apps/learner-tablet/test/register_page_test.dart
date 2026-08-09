import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  testWidgets(
    'registration page tolerates stale persisted dropdown draft values',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(1600, 2200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final state = LumoAppState(includeSeedDemoContent: false);
      addTearDown(state.dispose);
      state.registrationContext = RegistrationContext(
        cohorts: const [
          BackendCohort(id: 'cohort-1', name: 'Cohort A', podId: 'pod-1'),
        ],
        mallams: const [
          BackendMallam(
              id: 'mallam-1', name: 'Mallam Idris', podIds: ['pod-1']),
        ],
      );
      state.registrationDraft = const RegistrationDraft(
        name: 'Safiya',
        age: '8',
        cohort: 'Legacy Cohort Name',
        guardianName: 'Maryam',
        village: 'Pod 3',
        guardianPhone: '0801234567',
        preferredLanguage: 'French',
        readinessLabel: 'Legacy readiness',
        sex: 'Female',
        baselineLevel: 'Legacy baseline',
        caregiverRelationship: 'Older sibling',
        consentCaptured: true,
        mallamId: 'retired-mallam',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: RegisterPage(
            state: state,
            onChanged: () {},
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Learner name'), findsOneWidget);
      expect(find.text('Safiya'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
