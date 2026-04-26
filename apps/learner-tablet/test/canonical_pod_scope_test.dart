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

class _BundledFundamentalsLoader extends BundledContentLoader {
  const _BundledFundamentalsLoader();

  @override
  Future<BundledContentLibrary> load() async => BundledContentLibrary(
        modules: const [
          LearningModule(
            id: 'lumo-fundamentals',
            title: 'Lumo Fundamentals',
            description: 'Offline starter pack',
            voicePrompt: 'Meet Mallam offline.',
            readinessGoal: 'Ready for offline startup.',
            badge: 'Bundled pack',
          ),
        ],
        lessons: const [
          LessonCardModel(
            id: 'lf-meet-mallam',
            moduleId: 'lumo-fundamentals',
            title: 'Meet Mallam',
            subject: 'Lumo Fundamentals',
            durationMinutes: 6,
            status: 'bundled',
            mascotName: 'Mallam',
            readinessFocus: 'Offline starter',
            scenario: 'Bundled offline intro lesson.',
            steps: [
              LessonStep(
                id: 'bundled-step-1',
                type: LessonStepType.practice,
                title: 'Meet Mallam',
                instruction: 'Say hello to Mallam.',
                expectedResponse: 'Hello Mallam',
                coachPrompt: 'Say hello to Mallam.',
                facilitatorTip: 'Model the phrase once.',
                realWorldCheck: 'Learner greets Mallam.',
                speakerMode: SpeakerMode.guiding,
              ),
            ],
          ),
        ],
      );
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

  test(
      'restorePersistedState keeps learner-facing subjects scoped to canonical pod routing and drops bundled fallback subjects without scoped assignments',
      () async {
    final zariaLearner = _learner(
      id: 'learner-zaria',
      podId: 'pod-zaria',
      podLabel: 'Kaduna / Zaria',
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
      'learners': [_encodedLearner(zariaLearner)],
      'modules': [
        {
          'id': 'english',
          'title': 'English',
          'description': 'Live English path',
          'voicePrompt': 'Open English.',
          'readinessGoal': 'Live greeting flow',
          'badge': 'Live backend',
          'status': 'published',
        },
        {
          'id': 'lumo-fundamentals',
          'title': 'Lumo Fundamentals',
          'description': 'Offline starter pack',
          'voicePrompt': 'Meet Mallam offline.',
          'readinessGoal': 'Ready for offline startup.',
          'badge': 'Bundled pack',
          'status': 'published',
        },
      ],
      'assignedLessons': [
        {
          'id': 'english-live-1',
          'moduleId': 'english',
          'title': 'Live English hello',
          'subject': 'English',
          'durationMinutes': 8,
          'status': 'published',
          'mascotName': 'Mallam',
          'readinessFocus': 'Live greeting flow',
          'scenario': 'Live lesson from backend bootstrap.',
          'steps': [
            {
              'id': 'english-step-1',
              'type': 'practice',
              'title': 'Live hello',
              'instruction': 'Say hello.',
              'expectedResponse': 'Hello',
              'acceptableResponses': ['Hello'],
              'coachPrompt': 'Say hello.',
              'facilitatorTip': 'Keep it short.',
              'realWorldCheck': 'Learner greets',
              'speakerMode': 'guiding',
            }
          ],
        },
        {
          'id': 'lf-meet-mallam',
          'moduleId': 'lumo-fundamentals',
          'title': 'Meet Mallam',
          'subject': 'Lumo Fundamentals',
          'durationMinutes': 6,
          'status': 'bundled',
          'mascotName': 'Mallam',
          'readinessFocus': 'Offline starter',
          'scenario': 'Bundled offline intro lesson.',
          'steps': [
            {
              'id': 'bundled-step-1',
              'type': 'practice',
              'title': 'Meet Mallam',
              'instruction': 'Say hello to Mallam.',
              'expectedResponse': 'Hello Mallam',
              'acceptableResponses': ['Hello Mallam'],
              'coachPrompt': 'Say hello to Mallam.',
              'facilitatorTip': 'Model the phrase once.',
              'realWorldCheck': 'Learner greets Mallam.',
              'speakerMode': 'guiding',
            }
          ],
        },
      ],
      'assignmentPacks': [
        {
          'assignmentId': 'assignment-1',
          'cohortName': 'Bridge Cohort',
          'mallamName': 'Mallam Zaria',
          'lessonPack': {
            'lessonId': 'english-live-1',
            'lessonTitle': 'Live English hello',
            'moduleKey': 'english',
            'curriculumModuleId': 'english',
          },
          'eligibleLearners': [
            {'id': 'learner-zaria'}
          ],
        }
      ],
      'pendingSyncEvents': const [],
      'usingFallbackData': false,
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

    expect(
      state.learnerFacingSubjects().map((subject) => subject.title).toList(),
      ['English'],
    );
    expect(
      state
          .lessonsForLearnerAndSubject(null, 'english')
          .map((lesson) => lesson.id)
          .toList(),
      ['english-live-1'],
    );
    expect(
      state.learnerFacingSubjects().any(
            (subject) => subject.title == 'Lumo Fundamentals',
          ),
      isFalse,
    );
  });

  test(
      'bootstrap keeps bundled fallback subjects out of learner-facing cards when canonical scoped assignments already exist',
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
          modules: const [
            LearningModule(
              id: 'english',
              title: 'English',
              description: 'Live English path',
              voicePrompt: 'Open English.',
              readinessGoal: 'Live greeting flow',
              badge: 'Live backend',
            ),
          ],
          lessons: const [
            LessonCardModel(
              id: 'english-live-1',
              moduleId: 'english',
              title: 'Live English hello',
              subject: 'English',
              durationMinutes: 8,
              status: 'published',
              mascotName: 'Mallam',
              readinessFocus: 'Live greeting flow',
              scenario: 'Live lesson from backend bootstrap.',
              steps: [
                LessonStep(
                  id: 'english-step-1',
                  type: LessonStepType.practice,
                  title: 'Live hello',
                  instruction: 'Say hello.',
                  expectedResponse: 'Hello',
                  coachPrompt: 'Say hello.',
                  facilitatorTip: 'Keep it short.',
                  realWorldCheck: 'Learner greets',
                  speakerMode: SpeakerMode.guiding,
                ),
              ],
            ),
          ],
          assignmentPacks: const [
            LearnerAssignmentPack(
              assignmentId: 'assignment-1',
              lessonId: 'english-live-1',
              moduleId: 'english',
              curriculumModuleId: 'english',
              lessonTitle: 'Live English hello',
              cohortName: 'Bridge Cohort',
              mallamName: 'Mallam Zaria',
              eligibleLearnerIds: ['learner-zaria'],
            ),
          ],
          registrationContext: _registrationContext(tabletPodId: 'pod-1'),
        ),
      ),
      bundledContentLoader: const _BundledFundamentalsLoader(),
      includeSeedDemoContent: false,
    );

    await state.bootstrap();

    expect(
      state.learnerFacingSubjects().map((subject) => subject.title).toList(),
      ['English'],
    );
    expect(
      state.learnerFacingSubjects().any(
            (subject) => subject.title == 'Lumo Fundamentals',
          ),
      isFalse,
    );
    expect(
      state.learners.map((learner) => learner.id).toList(),
      ['learner-zaria'],
    );
  });
}
