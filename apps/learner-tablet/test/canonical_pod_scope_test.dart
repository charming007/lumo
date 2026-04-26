import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';
import 'package:lumo_learner_tablet/models.dart';

class _FakeApiClient extends LumoApiClient {
  _FakeApiClient(this.bootstrapData) : super(baseUrl: 'https://example.test');

  final LumoBootstrap bootstrapData;

  @override
  Future<LumoBootstrap> fetchBootstrap(
          {String? overrideDeviceIdentifier}) async =>
      bootstrapData;
}

class _EmptyBundledContentLoader extends BundledContentLoader {
  const _EmptyBundledContentLoader();

  @override
  Future<BundledContentLibrary> load() async => const BundledContentLibrary();
}

LearnerProfile _learner({
  required String id,
  required String podId,
  required String podLabel,
}) {
  return LearnerProfile(
    id: id,
    name: 'Learner $id',
    age: 9,
    cohort: 'Bridge Cohort',
    cohortId: 'cohort-bridge',
    podId: podId,
    podLabel: podLabel,
    mallamId: 'mallam-zaria',
    mallamName: 'Mallam Zaria',
    streakDays: 2,
    guardianName: 'Guardian $id',
    preferredLanguage: 'Hausa + English',
    readinessLabel: 'Voice-first beginner',
    village: podLabel,
    guardianPhone: '',
    sex: 'Girl',
    baselineLevel: 'No prior exposure',
    consentCaptured: true,
    learnerCode: 'CODE-$id',
  );
}

RegistrationContext _registrationContext({String? tabletPodId}) {
  return RegistrationContext.fromJson({
    'cohorts': [
      {
        'id': 'cohort-bridge',
        'name': 'Bridge Cohort',
        'podId': 'pod-zaria',
      },
    ],
    'mallams': [
      {
        'id': 'mallam-zaria',
        'displayName': 'Mallam Zaria',
        'podIds': ['pod-zaria'],
      },
    ],
    'defaultTarget': {
      'cohortId': 'cohort-bridge',
      'mallamId': 'mallam-zaria',
    },
    'tabletRegistration': {
      'id': 'device-zaria',
      'deviceIdentifier': 'lumo-tablet-zaria-01',
      'podId': tabletPodId,
      'podLabel': 'Kaduna / Zaria',
      'mallamId': 'mallam-zaria',
      'mallamName': 'Mallam Zaria',
    },
  });
}

Map<String, dynamic> _encodedLearner(LearnerProfile learner) => {
      'id': learner.id,
      'name': learner.name,
      'age': learner.age,
      'cohort': learner.cohort,
      'cohortId': learner.cohortId,
      'podId': learner.podId,
      'podLabel': learner.podLabel,
      'mallamId': learner.mallamId,
      'mallamName': learner.mallamName,
      'streakDays': learner.streakDays,
      'guardianName': learner.guardianName,
      'preferredLanguage': learner.preferredLanguage,
      'readinessLabel': learner.readinessLabel,
      'village': learner.village,
      'guardianPhone': learner.guardianPhone,
      'sex': learner.sex,
      'baselineLevel': learner.baselineLevel,
      'consentCaptured': learner.consentCaptured,
      'learnerCode': learner.learnerCode,
      'caregiverRelationship': learner.caregiverRelationship,
      'enrollmentStatus': learner.enrollmentStatus,
      'attendanceBand': learner.attendanceBand,
      'supportPlan': learner.supportPlan,
      'profilePhotoBase64': learner.profilePhotoBase64,
      'lastLessonSummary': learner.lastLessonSummary,
      'lastAttendance': learner.lastAttendance,
      'backendRecommendedModuleId': learner.backendRecommendedModuleId,
      'rewards': null,
    };

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
      'restorePersistedState derives canonical tablet pod id from scoped registration context when persisted tabletRegistration podId is stale',
      () async {
    final zariaLearner = _learner(
      id: 'learner-zaria',
      podId: 'pod-zaria',
      podLabel: 'Kaduna / Zaria',
    );
    final wrongPodLearner = _learner(
      id: 'learner-kano',
      podId: 'pod-1',
      podLabel: 'Kano Pod 01',
    );

    final snapshot = {
      'schemaVersion': '2026-04-13-runtime-persist',
      'tabletDeviceIdentifier': 'lumo-tablet-zaria-01',
      'registrationContext': {
        'cohorts': [
          {
            'id': 'cohort-bridge',
            'name': 'Bridge Cohort',
            'podId': 'pod-zaria',
          },
        ],
        'mallams': [
          {
            'id': 'mallam-zaria',
            'displayName': 'Mallam Zaria',
            'podIds': ['pod-zaria'],
          },
        ],
        'defaultTarget': {
          'cohortId': 'cohort-bridge',
          'mallamId': 'mallam-zaria',
        },
        'tabletRegistration': {
          'id': 'device-zaria',
          'deviceIdentifier': 'lumo-tablet-zaria-01',
          'podId': 'pod-1',
          'podLabel': 'Kaduna / Zaria',
          'mallamId': 'mallam-zaria',
          'mallamName': 'Mallam Zaria',
        },
      },
      'learners': [
        _encodedLearner(zariaLearner),
        _encodedLearner(wrongPodLearner),
      ],
      'modules': const [],
      'assignedLessons': const [],
      'assignmentPacks': const [],
      'pendingSyncEvents': const [],
      'usingFallbackData': true,
      'snapshotTrustedFromLiveBootstrap': true,
    };

    SharedPreferences.setMockInitialValues({
      'lumo_learner_tablet_state_v1': jsonEncode(snapshot),
    });

    final state = LumoAppState(
      bundledContentLoader: const _EmptyBundledContentLoader(),
      includeSeedDemoContent: false,
    );

    await state.restorePersistedState();

    expect(state.tabletPodId, 'pod-zaria');
    expect(state.learners.map((learner) => learner.id).toList(),
        ['learner-zaria']);
    expect(state.learners.single.podId, 'pod-zaria');
    expect(state.learners.single.podLabel, 'Kaduna / Zaria');
  });

  test(
      'bootstrap keeps learner roster scoped to the canonical cohort pod when tablet registration podId is stale',
      () async {
    final state = LumoAppState(
      apiClient: _FakeApiClient(
        LumoBootstrap(
          learners: [
            _learner(
              id: 'learner-zaria',
              podId: 'pod-zaria',
              podLabel: 'Legacy wrong label',
            ),
            _learner(
              id: 'learner-kano',
              podId: 'pod-1',
              podLabel: 'Kano Pod 01',
            ),
          ],
          modules: const [],
          lessons: const [],
          registrationContext: _registrationContext(tabletPodId: 'pod-1'),
        ),
      ),
      bundledContentLoader: const _EmptyBundledContentLoader(),
      includeSeedDemoContent: false,
    );

    await state.bootstrap();

    expect(state.tabletPodId, 'pod-zaria');
    expect(state.learners.map((learner) => learner.id).toList(),
        ['learner-zaria']);
    expect(state.learners.single.podId, 'pod-zaria');
    expect(state.learners.single.podLabel, 'Kaduna / Zaria');
  });
}
