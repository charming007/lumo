import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/bundled_content.dart';
import 'package:lumo_learner_tablet/main.dart';
import 'package:lumo_learner_tablet/models.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeBundledContentLoader extends BundledContentLoader {
  const _FakeBundledContentLoader(this.library);

  final BundledContentLibrary library;

  @override
  Future<BundledContentLibrary> load() async => library;
}

class _BootstrapWithBundledFundamentalsApiClient extends LumoApiClient {
  @override
  Future<LumoBootstrap> fetchBootstrap() async {
    return LumoBootstrap(
      learners: const [
        LearnerProfile(
          id: 'learner-1',
          name: 'Amina',
          age: 7,
          cohort: 'Alpha',
          streakDays: 1,
          guardianName: 'Zainab',
          preferredLanguage: 'Hausa',
          readinessLabel: 'Voice-first beginner',
          village: 'Pod 1',
          guardianPhone: '0800000000',
          sex: 'Girl',
          baselineLevel: 'No prior exposure',
          consentCaptured: true,
          learnerCode: 'AMI-AL07',
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
        LearningModule(
          id: 'math',
          title: 'Basic Mathematics',
          description: 'Live Math path',
          voicePrompt: 'Open Math.',
          readinessGoal: 'Live counting flow',
          badge: 'Live backend',
        ),
        LearningModule(
          id: 'life-skills',
          title: 'Life Skills',
          description: 'Live Life Skills path',
          voicePrompt: 'Open Life Skills.',
          readinessGoal: 'Live routine flow',
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
        LessonCardModel(
          id: 'math-live-1',
          moduleId: 'math',
          title: 'Count together',
          subject: 'Basic Mathematics',
          durationMinutes: 8,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'Live counting flow',
          scenario: 'Live lesson from backend bootstrap.',
          steps: [
            LessonStep(
              id: 'math-step-1',
              type: LessonStepType.practice,
              title: 'Count together',
              instruction: 'Count to three.',
              expectedResponse: '1 2 3',
              coachPrompt: 'Count to three.',
              facilitatorTip: 'Count together.',
              realWorldCheck: 'Learner counts',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
        LessonCardModel(
          id: 'life-live-1',
          moduleId: 'life-skills',
          title: 'Wash hands',
          subject: 'Life Skills',
          durationMinutes: 8,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'Live routine flow',
          scenario: 'Live lesson from backend bootstrap.',
          steps: [
            LessonStep(
              id: 'life-step-1',
              type: LessonStepType.practice,
              title: 'Wash hands',
              instruction: 'Say wash hands.',
              expectedResponse: 'Wash hands',
              coachPrompt: 'Say wash hands.',
              facilitatorTip: 'Model the routine.',
              realWorldCheck: 'Learner repeats the routine',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
      ],
    );
  }

  @override
  Future<LumoModuleBundle> fetchModuleBundle(String moduleId) async {
    final modules = {
      'english': const LearningModule(
        id: 'english',
        title: 'English',
        description: 'Live English path',
        voicePrompt: 'Open English.',
        readinessGoal: 'Live greeting flow',
        badge: '1 lesson',
      ),
      'math': const LearningModule(
        id: 'math',
        title: 'Basic Mathematics',
        description: 'Live Math path',
        voicePrompt: 'Open Math.',
        readinessGoal: 'Live counting flow',
        badge: '1 lesson',
      ),
      'life-skills': const LearningModule(
        id: 'life-skills',
        title: 'Life Skills',
        description: 'Live Life Skills path',
        voicePrompt: 'Open Life Skills.',
        readinessGoal: 'Live routine flow',
        badge: '1 lesson',
      ),
    };

    final lessons = {
      'english': const [
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
      'math': const [
        LessonCardModel(
          id: 'math-live-1',
          moduleId: 'math',
          title: 'Count together',
          subject: 'Basic Mathematics',
          durationMinutes: 8,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'Live counting flow',
          scenario: 'Live lesson from backend bootstrap.',
          steps: [
            LessonStep(
              id: 'math-step-1',
              type: LessonStepType.practice,
              title: 'Count together',
              instruction: 'Count to three.',
              expectedResponse: '1 2 3',
              coachPrompt: 'Count to three.',
              facilitatorTip: 'Count together.',
              realWorldCheck: 'Learner counts',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
      ],
      'life-skills': const [
        LessonCardModel(
          id: 'life-live-1',
          moduleId: 'life-skills',
          title: 'Wash hands',
          subject: 'Life Skills',
          durationMinutes: 8,
          status: 'published',
          mascotName: 'Mallam',
          readinessFocus: 'Live routine flow',
          scenario: 'Live lesson from backend bootstrap.',
          steps: [
            LessonStep(
              id: 'life-step-1',
              type: LessonStepType.practice,
              title: 'Wash hands',
              instruction: 'Say wash hands.',
              expectedResponse: 'Wash hands',
              coachPrompt: 'Say wash hands.',
              facilitatorTip: 'Model the routine.',
              realWorldCheck: 'Learner repeats the routine',
              speakerMode: SpeakerMode.guiding,
            ),
          ],
        ),
      ],
    };

    return LumoModuleBundle(
      module: modules[moduleId]!,
      lessons: lessons[moduleId]!,
    );
  }
}

void main() {
  group('LumoAppState learner assignment flow', () {
    final beginner = LearnerProfile(
      id: 'learner-1',
      name: 'Amina',
      age: 7,
      cohort: 'Alpha',
      streakDays: 1,
      guardianName: 'Zainab',
      preferredLanguage: 'Hausa',
      readinessLabel: 'Voice-first beginner',
      village: 'Pod 1',
      guardianPhone: '0800000000',
      sex: 'Girl',
      baselineLevel: 'No prior exposure',
      consentCaptured: true,
      learnerCode: 'AMI-AL07',
    );

    final emerging = beginner.copyWith(
      id: 'learner-2',
      name: 'Musa',
      readinessLabel: 'Ready for guided practice',
      learnerCode: 'MUS-AL08',
      sex: 'Boy',
    );

    final confident = beginner.copyWith(
      id: 'learner-3',
      name: 'Halima',
      readinessLabel: 'Confident responder',
      learnerCode: 'HAL-AL09',
    );

    test('does not auto-select a learner during bootstrap refreshes', () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': [
                    {
                      'id': beginner.id,
                      'name': beginner.name,
                      'age': beginner.age,
                      'cohortName': beginner.cohort,
                      'guardianName': beginner.guardianName,
                      'attendanceRate': 0.9,
                      'level': 'beginner',
                    },
                  ],
                  'modules': const [],
                  'lessons': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(state.learners, isNotEmpty);
      expect(state.currentLearner, isNull);
      state.dispose();
    });

    test('clears stale learner evidence before a fresh take on the same step',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);
      state.attachLearnerAudioCapture(
        path: '/tmp/old-take.m4a',
        duration: const Duration(seconds: 4),
      );
      state.submitLearnerResponse('old transcript');

      expect(state.activeSession?.latestLearnerResponse, 'old transcript');
      expect(state.activeSession?.latestLearnerAudioPath, '/tmp/old-take.m4a');

      state.clearCurrentStepLearnerEvidence(
        automationStatus: 'Fresh learner take started.',
      );

      expect(state.activeSession?.latestLearnerResponse, isNull);
      expect(state.activeSession?.latestLearnerAudioPath, isNull);
      expect(state.activeSession?.latestLearnerAudioDuration, isNull);
      expect(state.activeSession?.latestReview, ResponseReview.pending);
      expect(
        state.activeSession?.automationStatus,
        'Fresh learner take started.',
      );
      state.dispose();
    });

    test('persists in-progress learner draft answers before submission', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final lesson = state.assignedLessons.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);
      state.startLesson(lesson);

      state.updateCurrentStepLearnerDraft('I am rea');
      expect(state.activeSession?.latestLearnerResponse, 'I am rea');
      expect(state.activeSession?.latestReview, ResponseReview.pending);

      state.updateCurrentStepLearnerDraft('');
      expect(state.activeSession?.latestLearnerResponse, isNull);
      expect(state.activeSession?.latestReview, ResponseReview.pending);
      state.dispose();
    });

    test('keeps live module list free of demo-only subjects during bootstrap',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': const [],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                    {
                      'subjectId': 'story',
                      'subjectName': 'Story Time',
                      'title': 'Story Time',
                      'level': 'foundation-a',
                    },
                    {
                      'subjectId': 'math',
                      'subjectName': 'Basic Numeracy',
                      'title': 'Basic Numeracy',
                      'level': 'foundation-a',
                    },
                    {
                      'subjectId': 'life-skills',
                      'subjectName': 'Life Skills',
                      'title': 'Life Skills',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'story-lesson-1',
                      'moduleId': 'story',
                      'subjectName': 'Story Time',
                      'title': 'Story Time',
                      'durationMinutes': 9,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Listen and retell',
                      'scenario': 'Deprecated demo lesson',
                      'steps': const [],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': const [],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/math') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'math',
                  'subjectName': 'Basic Numeracy',
                  'title': 'Basic Numeracy',
                  'level': 'foundation-a',
                  'lessons': const [],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/life-skills') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'life-skills',
                  'subjectName': 'Life Skills',
                  'title': 'Life Skills',
                  'level': 'foundation-a',
                  'lessons': const [],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(state.modules.map((module) => module.id),
          equals(['english', 'math', 'life-skills']));
      expect(
        state.modules.where((module) => module.id == 'story'),
        isEmpty,
      );
      expect(
        state.assignedLessons.where((lesson) => lesson.moduleId == 'story'),
        isEmpty,
      );
      state.dispose();
    });

    test('drops backend lessons that have no activity steps', () async {
      final state = LumoAppState(
        includeSeedDemoContent: false,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': [
                    {
                      'id': 'student-1',
                      'name': 'Amina',
                      'age': 8,
                      'cohort': 'Morning Cohort',
                      'guardianName': 'Zainab',
                      'preferredLanguage': 'Hausa',
                      'readinessLabel': 'Voice-first beginner',
                      'village': 'Kano',
                      'guardianPhone': '0800000000',
                      'sex': 'Girl',
                      'baselineLevel': 'foundation-a',
                      'consentCaptured': true,
                      'learnerCode': 'AMI-MC08',
                      'caregiverRelationship': 'Mother',
                    },
                  ],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'english-empty',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Broken lesson',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greeting',
                      'scenario': 'This lesson is unusable.',
                      'activitySteps': const [],
                    },
                    {
                      'id': 'english-live',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Live lesson',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greeting',
                      'scenario': 'This lesson should remain.',
                      'activitySteps': [
                        {
                          'id': 'step-1',
                          'type': 'intro',
                          'title': 'Say hello',
                          'instruction': 'Welcome the learner.',
                          'expectedResponse': 'Hello',
                          'coachPrompt': 'Say hello.',
                          'facilitatorTip': 'Keep it short.',
                          'speakerMode': 'guiding',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': [
                    {
                      'id': 'english-empty',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Broken lesson',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greeting',
                      'scenario': 'This lesson is unusable.',
                      'activitySteps': const [],
                    },
                    {
                      'id': 'english-live',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Live lesson',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greeting',
                      'scenario': 'This lesson should remain.',
                      'activitySteps': [
                        {
                          'id': 'step-1',
                          'type': 'intro',
                          'title': 'Say hello',
                          'instruction': 'Welcome the learner.',
                          'expectedResponse': 'Hello',
                          'coachPrompt': 'Say hello.',
                          'facilitatorTip': 'Keep it short.',
                          'speakerMode': 'guiding',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(state.assignedLessons.map((lesson) => lesson.id),
          equals(['english-live']));
      expect(() => state.startLesson(state.assignedLessons.first),
          returnsNormally);
      state.dispose();
    });

    test('drops deprecated story/demo lessons even when the module id is messy',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': const [],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'story-lesson-legacy',
                      'moduleId': 'module-story-legacy',
                      'subjectName': 'Story Time',
                      'title': 'Listen and retell',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Listen & retell',
                      'scenario': 'Old cached demo lesson',
                      'steps': const [],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': const [],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(
        state.assignedLessons.where((lesson) => lesson.subject == 'Story Time'),
        isEmpty,
      );
      state.dispose();
    });

    test('filters deprecated story/demo modules from persisted tablet state',
        () async {
      SharedPreferences.setMockInitialValues({
        'lumo_learner_tablet_state_v1': jsonEncode({
          'schemaVersion': '2026-04-13-runtime-persist',
          'learners': const [],
          'modules': const [
            {
              'id': 'english',
              'title': 'Foundational English',
              'description': 'Live module',
              'voicePrompt': 'Let us speak',
              'readinessGoal': 'Speak clearly',
              'badge': '4 lessons',
            },
            {
              'id': 'story',
              'title': 'Story Time',
              'description': 'Deprecated demo module',
              'voicePrompt': 'Listen and retell',
              'readinessGoal': 'Listen & retell',
              'badge': '1 lesson',
            },
          ],
          'assignedLessons': const [
            {
              'id': 'lesson-english-1',
              'moduleId': 'english',
              'title': 'Greetings',
              'subjectName': 'Foundational English',
              'durationMinutes': 10,
              'status': 'assigned',
              'mascotName': 'Mallam',
              'readinessFocus': 'Greetings',
              'scenario': 'Live lesson',
              'steps': [],
            },
            {
              'id': 'lesson-story-1',
              'moduleId': 'module-story-legacy',
              'title': 'Listen and retell',
              'subjectName': 'Story Time',
              'durationMinutes': 8,
              'status': 'assigned',
              'mascotName': 'Mallam',
              'readinessFocus': 'Listen & retell',
              'scenario': 'Deprecated demo lesson',
              'steps': [],
            },
          ],
          'assignmentPacks': const [],
          'pendingSyncEvents': const [],
          'recentRuntimeSessionsByLearnerId': const {},
          'registrationDraft': const {},
          'registrationContext': const {},
          'speakerMode': 'guiding',
          'usingFallbackData': false,
        }),
      });

      final state = LumoAppState(includeSeedDemoContent: true);

      await state.restorePersistedState();

      expect(state.restoredFromPersistence, isTrue);
      expect(state.modules.map((module) => module.id), equals(['english']));
      expect(
        state.assignedLessons.where((lesson) => lesson.subject == 'Story Time'),
        isEmpty,
      );
      state.dispose();
    });

    test('recovers a persisted active session after lesson sync reloads',
        () async {
      SharedPreferences.setMockInitialValues({
        'lumo_learner_tablet_state_v1': jsonEncode({
          'schemaVersion': '2026-04-13-runtime-persist',
          'currentLearnerId': beginner.id,
          'learners': [
            {
              'id': beginner.id,
              'name': beginner.name,
              'age': beginner.age,
              'cohort': beginner.cohort,
              'streakDays': beginner.streakDays,
              'guardianName': beginner.guardianName,
              'preferredLanguage': beginner.preferredLanguage,
              'readinessLabel': beginner.readinessLabel,
              'village': beginner.village,
              'guardianPhone': beginner.guardianPhone,
              'sex': beginner.sex,
              'baselineLevel': beginner.baselineLevel,
              'consentCaptured': beginner.consentCaptured,
              'learnerCode': beginner.learnerCode,
            },
          ],
          'modules': const [],
          'assignedLessons': const [],
          'assignmentPacks': const [],
          'pendingSyncEvents': const [],
          'recentRuntimeSessionsByLearnerId': const {},
          'registrationDraft': const {},
          'registrationContext': const {},
          'speakerMode': 'guiding',
          'usingFallbackData': false,
          'activeSession': {
            'sessionId': 'session-recover',
            'lessonId': 'lesson-recover',
            'lessonTitle': 'Recovered English lesson',
            'currentLearnerId': beginner.id,
            'stepIndex': 1,
            'completionState': 'inProgress',
            'speakerMode': 'guiding',
            'latestReview': 'pending',
            'supportActionsUsed': 0,
            'attemptsThisStep': 0,
            'facilitatorObservations': const [],
            'transcript': const [],
            'startedAt': '2026-04-15T10:00:00.000Z',
            'audioInputMode': 'Shared mic on tablet',
            'speakerOutputMode': 'Tablet speaker',
            'totalResponses': 2,
            'totalAudioCaptures': 1,
            'lastSupportType': 'Prompt replay',
            'automationStatus': 'Mallam is waiting to continue.',
            'practiceMode': 'standard',
            'lastUpdatedAt': '2026-04-15T10:04:00.000Z'
          },
        }),
      });

      final state = LumoAppState(
        includeSeedDemoContent: false,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': [
                    {
                      'id': beginner.id,
                      'name': beginner.name,
                      'age': beginner.age,
                      'cohortName': beginner.cohort,
                      'guardianName': beginner.guardianName,
                      'attendanceRate': 0.9,
                      'level': 'beginner',
                    },
                  ],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'lesson-recover',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Recovered English lesson',
                      'durationMinutes': 9,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Resume guidance',
                      'scenario': 'Recovered from persisted state',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Resume guidance',
                          'instruction': 'Say hello again',
                          'coachPrompt': 'Say hello again.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': [
                    {
                      'id': 'lesson-recover',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Recovered English lesson',
                      'durationMinutes': 9,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Resume guidance',
                      'scenario': 'Recovered from persisted state',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Resume guidance',
                          'instruction': 'Say hello again',
                          'coachPrompt': 'Say hello again.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.restorePersistedState();
      expect(state.activeSession, isNull);
      expect(state.hasPendingRecoveredSession, isTrue);
      expect(state.pendingRecoveredSessionLabel,
          contains('Recovered English lesson'));

      await state.bootstrap();

      expect(state.hasPendingRecoveredSession, isFalse);
      expect(state.activeSession, isNotNull);
      expect(state.activeSession!.sessionId, 'session-recover');
      expect(state.activeSession!.lesson.id, 'lesson-recover');
      expect(state.currentLearner?.id, beginner.id);
      state.dispose();
    });

    test(
        'recovers a persisted active session when lesson ids churn but the lesson title still matches',
        () async {
      SharedPreferences.setMockInitialValues({
        'lumo_learner_tablet_state_v1': jsonEncode({
          'schemaVersion': '2026-04-13-runtime-persist',
          'currentLearnerId': beginner.id,
          'learners': [
            {
              'id': beginner.id,
              'name': beginner.name,
              'age': beginner.age,
              'cohort': beginner.cohort,
              'streakDays': beginner.streakDays,
              'guardianName': beginner.guardianName,
              'preferredLanguage': beginner.preferredLanguage,
              'readinessLabel': beginner.readinessLabel,
              'village': beginner.village,
              'guardianPhone': beginner.guardianPhone,
              'sex': beginner.sex,
              'baselineLevel': beginner.baselineLevel,
              'consentCaptured': beginner.consentCaptured,
              'learnerCode': beginner.learnerCode,
            },
          ],
          'modules': const [],
          'assignedLessons': const [],
          'assignmentPacks': const [],
          'pendingSyncEvents': const [],
          'recentRuntimeSessionsByLearnerId': const {},
          'registrationDraft': const {},
          'registrationContext': const {},
          'speakerMode': 'guiding',
          'usingFallbackData': false,
          'activeSession': {
            'sessionId': 'session-recover-title-match',
            'lessonId': 'lesson-recover-stale-id',
            'lessonTitle': 'Recovered English lesson',
            'moduleId': 'english',
            'currentLearnerId': beginner.id,
            'stepIndex': 0,
            'completionState': 'inProgress',
            'speakerMode': 'guiding',
            'latestLearnerResponse': 'Hello again',
            'latestReview': 'pending',
            'supportActionsUsed': 1,
            'attemptsThisStep': 1,
            'facilitatorObservations': const [],
            'transcript': const [
              {
                'speaker': 'Mallam',
                'text': 'Say hello again.',
                'timestamp': '2026-04-15T10:00:00.000Z',
              },
            ],
            'startedAt': '2026-04-15T10:00:00.000Z',
            'audioInputMode': 'Shared mic on tablet',
            'speakerOutputMode': 'Tablet speaker',
            'totalResponses': 1,
            'totalAudioCaptures': 0,
            'lastSupportType': 'Prompt replay',
            'automationStatus': 'Mallam is waiting to continue.',
            'practiceMode': 'standard',
            'lastUpdatedAt': '2026-04-15T10:04:00.000Z'
          },
        }),
      });

      final state = LumoAppState(
        includeSeedDemoContent: false,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': [
                    {
                      'id': beginner.id,
                      'name': beginner.name,
                      'age': beginner.age,
                      'cohortName': beginner.cohort,
                      'guardianName': beginner.guardianName,
                      'attendanceRate': 0.9,
                      'level': 'beginner',
                    },
                  ],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'lesson-recover-live-id',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Recovered English lesson',
                      'durationMinutes': 9,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Resume guidance',
                      'scenario':
                          'Recovered from persisted state after lesson id churn',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Resume guidance',
                          'instruction': 'Say hello again',
                          'coachPrompt': 'Say hello again.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': [
                    {
                      'id': 'lesson-recover-live-id',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Recovered English lesson',
                      'durationMinutes': 9,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Resume guidance',
                      'scenario':
                          'Recovered from persisted state after lesson id churn',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Resume guidance',
                          'instruction': 'Say hello again',
                          'coachPrompt': 'Say hello again.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.restorePersistedState();
      expect(state.activeSession, isNull);
      expect(state.hasPendingRecoveredSession, isTrue);

      await state.bootstrap();

      expect(state.hasPendingRecoveredSession, isFalse);
      expect(state.activeSession, isNotNull);
      expect(state.activeSession!.sessionId, 'session-recover-title-match');
      expect(state.activeSession!.lesson.id, 'lesson-recover-live-id');
      expect(state.activeSession!.latestLearnerResponse, 'Hello again');
      expect(state.currentLearner?.id, beginner.id);
      state.dispose();
    });

    test('logs learner reward redemption history and reduces spendable points',
        () async {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final option = state
          .rewardRedemptionOptionsForLearner(learner)
          .firstWhere((item) => item.unlocked);

      final before = state.spendableRewardPointsForLearner(learner);
      final record = state.redeemRewardForLearner(
        learner: learner,
        option: option,
        note: 'Chose extra story time',
      );

      expect(state.rewardRedemptionHistoryForLearner(learner), hasLength(1));
      expect(state.latestRewardRedemptionForLearner(learner)?.id, record.id);
      expect(
          state.spendableRewardPointsForLearner(learner), before - option.cost);
      expect(state.pendingSyncEvents.last.type, 'learner_reward_redeemed');
      expect(state.pendingSyncEvents.last.payload['note'],
          'Chose extra story time');
      state.dispose();
    });

    test('persists reward redemption history across tablet restarts', () async {
      SharedPreferences.setMockInitialValues({});
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      final option = state
          .rewardRedemptionOptionsForLearner(learner)
          .firstWhere((item) => item.unlocked);

      final record = state.redeemRewardForLearner(
        learner: learner,
        option: option,
        note: 'Sticker earned after strong speaking turn',
      );
      state.dispose();
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      final restored = LumoAppState(includeSeedDemoContent: true);
      await restored.restorePersistedState();

      final restoredLearner = restored.learners.firstWhere(
        (item) => item.id == learner.id,
      );
      final history =
          restored.rewardRedemptionHistoryForLearner(restoredLearner);
      expect(history, hasLength(1));
      expect(history.first.id, record.id);
      expect(history.first.note, 'Sticker earned after strong speaking turn');
      restored.dispose();
    });

    test('persists registration draft photos across tablet restarts', () async {
      SharedPreferences.setMockInitialValues({});
      final state = LumoAppState(includeSeedDemoContent: true);
      state.updateDraft(
        const RegistrationDraft(
          name: 'Safiya',
          age: '8',
          cohort: 'Alpha',
          guardianName: 'Maryam',
          village: 'Pod 3',
          guardianPhone: '0801234567',
          consentCaptured: true,
          profilePhotoBase64: 'base64-photo-payload',
        ),
      );

      state.dispose();
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      final restored = LumoAppState(includeSeedDemoContent: true);
      await restored.restorePersistedState();

      expect(restored.registrationDraft.name, 'Safiya');
      expect(
        restored.registrationDraft.profilePhotoBase64,
        'base64-photo-payload',
      );
      restored.dispose();
    });

    test('persists sync receipt counters and warnings across tablet restarts',
        () async {
      SharedPreferences.setMockInitialValues({});
      final state = LumoAppState(includeSeedDemoContent: true);
      state.lastSyncDuplicateCount = 2;
      state.lastSyncResultCount = 5;
      state.lastSyncWarnings = const [
        'lesson_completed was ignored (already_applied).',
      ];
      state.lastSyncAcceptedCount = 3;
      state.lastSyncIgnoredCount = 1;
      state.lastSyncAttemptAt = DateTime.parse('2026-04-16T09:15:00.000Z');
      state.dispose();
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      final restored = LumoAppState(includeSeedDemoContent: true);
      await restored.restorePersistedState();

      expect(restored.lastSyncDuplicateCount, 2);
      expect(restored.lastSyncResultCount, 5);
      expect(restored.lastSyncWarnings,
          ['lesson_completed was ignored (already_applied).']);
      expect(restored.syncReceiptLabel, '5 receipt row(s) • 2 duplicate');
      restored.dispose();
    });

    test('preserves bootstrap lessons when one module hydration request fails',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': const [],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                    {
                      'subjectId': 'math',
                      'subjectName': 'Basic Numeracy',
                      'title': 'Basic Numeracy',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'english-bootstrap-1',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Say hello',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greetings',
                      'scenario': 'Warm greeting practice',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Say hello',
                          'instruction': 'Say hello.',
                          'coachPrompt': 'Say hello.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                    {
                      'id': 'math-bootstrap-1',
                      'moduleId': 'math',
                      'subjectName': 'Basic Numeracy',
                      'title': 'Count to 5',
                      'durationMinutes': 10,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Counting',
                      'scenario': 'Counting objects aloud',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Count to 5',
                          'instruction': 'Count to five.',
                          'coachPrompt': 'Count to five.',
                          'expectedResponse': '1 2 3 4 5',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': [
                    {
                      'id': 'english-live-1',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Introduce yourself',
                      'durationMinutes': 12,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Speaking',
                      'scenario': 'Learner says their name',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Introduce yourself',
                          'instruction': 'Say your name.',
                          'coachPrompt': 'Say your name.',
                          'expectedResponse': 'My name is Amina',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/math') {
              throw Exception('math bundle timed out');
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(
        state.assignedLessons.map((lesson) => lesson.id),
        equals(['english-live-1', 'math-bootstrap-1']),
      );
      expect(
        state.assignedLessons
            .where((lesson) => lesson.moduleId == 'english')
            .map((lesson) => lesson.id),
        equals(['english-live-1']),
      );
      expect(
        state.assignedLessons
            .where((lesson) => lesson.moduleId == 'math')
            .map((lesson) => lesson.id),
        equals(['math-bootstrap-1']),
      );
      state.dispose();
    });

    test(
        'keeps bootstrap lessons when successful module hydration returns only a partial subset',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': const [],
                  'modules': [
                    {
                      'subjectId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Foundational English',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'english-bootstrap-1',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Say hello',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greetings',
                      'scenario': 'Warm greeting practice',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Say hello',
                          'instruction': 'Say hello.',
                          'coachPrompt': 'Say hello.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                    {
                      'id': 'english-bootstrap-2',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Ask a name',
                      'durationMinutes': 9,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greetings',
                      'scenario': 'Learner asks for a name',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Ask a name',
                          'instruction': 'Ask their name.',
                          'coachPrompt': 'Ask their name.',
                          'expectedResponse': 'What is your name?',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'subjectId': 'english',
                  'subjectName': 'Foundational English',
                  'title': 'Foundational English',
                  'level': 'foundation-a',
                  'lessons': [
                    {
                      'id': 'english-bootstrap-1',
                      'moduleId': 'english',
                      'subjectName': 'Foundational English',
                      'title': 'Say hello',
                      'durationMinutes': 8,
                      'status': 'assigned',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greetings',
                      'scenario': 'Warm greeting practice',
                      'steps': [
                        {
                          'id': 'step-1',
                          'title': 'Say hello',
                          'instruction': 'Say hello.',
                          'coachPrompt': 'Say hello.',
                          'expectedResponse': 'Hello',
                          'speakerMode': 'guiding',
                          'type': 'prompt',
                        },
                      ],
                    },
                  ],
                  'assignmentPacks': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }

            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(
        state.assignedLessons
            .where((lesson) => lesson.moduleId == 'english')
            .map((lesson) => lesson.id),
        equals(['english-bootstrap-2', 'english-bootstrap-1']),
      );
      state.dispose();
    });

    test('builds a fallback module when lesson metadata arrives before modules',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final lesson = state.assignedLessons.first;

      state.modules.clear();

      final module = resolveLessonModule(state: state, lesson: lesson);

      expect(module.id, lesson.moduleId);
      expect(module.title, lesson.subject);
      expect(module.readinessGoal, lesson.readinessFocus);
      expect(module.badge, 'Lesson ready');
    });

    test('does not crash when live learners exist but lessons are empty', () {
      final state = LumoAppState(includeSeedDemoContent: true)
        ..assignedLessons.clear()
        ..learners.clear()
        ..learners.add(beginner);

      expect(state.nextAssignedLessonForLearner(beginner), isNull);
      expect(state.assignedLessonSummaryForLearner(beginner),
          'No assigned lessons yet.');
      state.dispose();
    });

    test('returns a safe draft module placeholder when subjects are missing',
        () {
      final state = LumoAppState(includeSeedDemoContent: true)..modules.clear();

      final module = state.recommendedModuleForDraft;

      expect(module.id, 'pending-module');
      expect(module.title, 'Subject sync pending');
      state.dispose();
    });

    test('ranks english first for voice-first beginners', () {
      final state = LumoAppState(includeSeedDemoContent: true);

      final lessons = state.lessonsForLearner(beginner);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'english');
      expect(state.nextAssignedLessonForLearner(beginner)?.moduleId, 'english');
    });

    test('ranks math first for guided practice learners', () {
      final state = LumoAppState(includeSeedDemoContent: true);

      final lessons = state.lessonsForLearner(emerging);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'math');
    });

    test('ranks life skills first for confident responders', () {
      final state = LumoAppState(includeSeedDemoContent: true);

      final lessons = state.lessonsForLearner(confident);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'life-skills');
      expect(
        state.recommendedModuleLabelForLearner(confident),
        contains('Life Skills'),
      );
    });

    test('assigned lesson summary reflects next lesson title', () {
      final state = LumoAppState(includeSeedDemoContent: true);

      final summary = state.assignedLessonSummaryForLearner(beginner);
      final nextLesson = state.nextAssignedLessonForLearner(beginner);

      expect(nextLesson, isNotNull);
      expect(summary, contains(nextLesson!.title));
      expect(summary, contains('assigned lesson'));
    });

    test('prefers backend assignment packs over heuristic lesson order', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final lifeSkillsLesson = state.assignedLessons
          .firstWhere((lesson) => lesson.moduleId == 'life-skills');

      state.assignmentPacks.add(
        LearnerAssignmentPack(
          assignmentId: 'assignment-1',
          lessonId: lifeSkillsLesson.id,
          moduleId: lifeSkillsLesson.moduleId,
          lessonTitle: lifeSkillsLesson.title,
          cohortName: beginner.cohort,
          mallamName: 'Mallam Idris',
          dueDate: '2026-04-20T10:00:00.000Z',
          assessmentTitle: 'Life skills check',
          eligibleLearnerIds: [beginner.id],
        ),
      );

      final lessons = state.lessonsForLearner(beginner);
      final nextPack = state.nextAssignmentPackForLearner(beginner);

      expect(nextPack, isNotNull);
      expect(lessons.first.id, lifeSkillsLesson.id);
      expect(state.backendRoutingSummaryForLearner(beginner),
          contains('Mallam Idris'));
    });

    test(
        'keeps assignment-backed lessons visible when lesson payload is missing',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);

      state.assignmentPacks.addAll([
        LearnerAssignmentPack(
          assignmentId: 'assignment-1',
          lessonId: 'missing-english',
          moduleId: 'english',
          curriculumModuleId: 'english',
          lessonTitle: 'English warm-up live',
          cohortName: beginner.cohort,
          mallamName: 'Mallam Idris',
          dueDate: '2026-04-20T10:00:00.000Z',
          eligibleLearnerIds: [beginner.id],
        ),
        LearnerAssignmentPack(
          assignmentId: 'assignment-2',
          lessonId: 'missing-math',
          moduleId: 'math',
          curriculumModuleId: 'math',
          lessonTitle: 'Math drill live',
          cohortName: beginner.cohort,
          mallamName: 'Mallam Idris',
          dueDate: '2026-04-21T10:00:00.000Z',
          eligibleLearnerIds: [beginner.id],
        ),
      ]);

      final lessons = state.backendAssignedLessonsForLearner(beginner);

      expect(lessons, hasLength(2));
      expect(
        lessons.map((lesson) => lesson.id),
        containsAll([
          'assignment-placeholder:assignment-1',
          'assignment-placeholder:assignment-2',
        ]),
      );
      expect(lessons.every((lesson) => lesson.steps.isNotEmpty), isTrue);
      expect(
        lessons.every((lesson) => lesson.scenario.contains('has not synced')),
        isTrue,
      );
    });

    test(
        'keeps multiple learner lessons visible inside a module when assignments map them there',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.selectLearner(beginner);

      final baseEnglishLesson = state.assignedLessons
          .firstWhere((lesson) => lesson.moduleId == 'english');
      final shadowEnglishLesson = LessonCardModel(
        id: 'english-shadow-live',
        moduleId: 'english-shadow-lane',
        title: 'English partner practice',
        subject: baseEnglishLesson.subject,
        durationMinutes: 11,
        status: 'assigned',
        mascotName: baseEnglishLesson.mascotName,
        readinessFocus: 'Conversation turns',
        scenario: 'Learner practices a second live English activity.',
        steps: baseEnglishLesson.steps,
      );
      state.assignedLessons.add(shadowEnglishLesson);

      state.assignmentPacks
        ..clear()
        ..addAll([
          LearnerAssignmentPack(
            assignmentId: 'assignment-1',
            lessonId: baseEnglishLesson.id,
            moduleId: 'english-home-lane',
            curriculumModuleId: 'english',
            lessonTitle: baseEnglishLesson.title,
            cohortName: beginner.cohort,
            mallamName: 'Mallam Idris',
            eligibleLearnerIds: [beginner.id],
          ),
          LearnerAssignmentPack(
            assignmentId: 'assignment-2',
            lessonId: shadowEnglishLesson.id,
            moduleId: 'english-home-lane',
            curriculumModuleId: 'english',
            lessonTitle: shadowEnglishLesson.title,
            cohortName: beginner.cohort,
            mallamName: 'Mallam Idris',
            eligibleLearnerIds: [beginner.id],
          ),
        ]);

      final visibleLessons =
          state.lessonsForLearnerAndModule(beginner, 'english');

      expect(
        visibleLessons.map((lesson) => lesson.title),
        containsAll([baseEnglishLesson.title, shadowEnglishLesson.title]),
      );
    });

    test('uses backend recommended module when available', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = beginner.copyWith(backendRecommendedModuleId: 'math');

      expect(state.recommendedModuleLabelForLearner(learner), contains('Math'));
      expect(state.recommendedModuleForLearner(learner).id, 'math');
    });

    test('prefers resumable backend runtime lesson before fresh routing', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'math',
      );

      state.recentRuntimeSessionsByLearnerId[beginner.id] = [
        BackendLessonSession(
          id: 'runtime-1',
          sessionId: 'session-1',
          studentId: beginner.id,
          learnerCode: beginner.learnerCode,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          moduleId: lesson.moduleId,
          status: 'in_progress',
          completionState: 'inProgress',
          automationStatus: 'Mallam is waiting for the next response.',
          currentStepIndex: 2,
          stepsTotal: lesson.steps.length,
          responsesCaptured: 1,
          supportActionsUsed: 0,
          audioCaptures: 1,
          facilitatorObservations: 0,
        ),
      ];

      expect(state.resumableRuntimeSessionForLearner(beginner), isNotNull);
      expect(state.resumableLessonForLearner(beginner)?.id, lesson.id);
      expect(state.nextAssignedLessonForLearner(beginner)?.id, lesson.id);
      expect(
        state.runtimeSessionSummaryForLearner(beginner),
        contains('Resume ready'),
      );
    });

    test(
        'does not map backend resume to the wrong lesson when only module matches',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final sourceLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );
      state.assignedLessons.add(
        LessonCardModel(
          id: 'english-shadow',
          moduleId: sourceLesson.moduleId,
          title: 'English shadow lesson',
          subject: sourceLesson.subject,
          durationMinutes: sourceLesson.durationMinutes,
          status: sourceLesson.status,
          mascotName: sourceLesson.mascotName,
          readinessFocus: sourceLesson.readinessFocus,
          scenario: sourceLesson.scenario,
          steps: sourceLesson.steps,
        ),
      );

      final resumeSession = BackendLessonSession(
        id: 'runtime-ambiguous',
        sessionId: 'session-ambiguous',
        studentId: beginner.id,
        learnerCode: beginner.learnerCode,
        lessonId: 'missing-lesson-id',
        lessonTitle: 'Missing backend lesson',
        moduleId: sourceLesson.moduleId,
        status: 'in_progress',
        completionState: 'inProgress',
        automationStatus: 'Mallam is waiting for the next response.',
        currentStepIndex: 2,
        stepsTotal: sourceLesson.steps.length,
        responsesCaptured: 1,
        supportActionsUsed: 0,
        audioCaptures: 1,
        facilitatorObservations: 0,
      );

      expect(state.lessonForBackendSession(resumeSession), isNull);
    });

    test('routes away from the completed lesson when continuing', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final currentLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      final nextLesson = state.nextLessonAfterCompletion(
        beginner,
        completedLessonId: currentLesson.id,
      );

      expect(nextLesson, isNotNull);
      expect(nextLesson!.id, isNot(currentLesson.id));
      expect(
        state.nextLessonRouteSummaryForLearner(
          beginner,
          completedLessonId: currentLesson.id,
        ),
        contains('Next up:'),
      );
    });

    test('falls back to backend recommended module after lesson completion',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = beginner.copyWith(backendRecommendedModuleId: 'math');
      final completedLesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      final nextLesson = state.nextLessonAfterCompletion(
        learner,
        completedLessonId: completedLesson.id,
      );

      expect(nextLesson, isNotNull);
      expect(nextLesson!.moduleId, 'math');
      expect(
        state.nextLessonRouteSummaryForLearner(
          learner,
          completedLessonId: completedLesson.id,
        ),
        contains('Math'),
      );
    });

    test('maps registration cohort to backend mallam target', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.registrationContext = RegistrationContext(
        cohorts: const [
          BackendCohort(id: 'cohort-1', name: 'Cohort A', podId: 'pod-1'),
          BackendCohort(id: 'cohort-2', name: 'Cohort B', podId: 'pod-2'),
        ],
        mallams: const [
          BackendMallam(
              id: 'mallam-1', name: 'Mallam Idris', podIds: ['pod-1']),
          BackendMallam(
              id: 'mallam-2', name: 'Mallama Zarah', podIds: ['pod-2']),
        ],
      );
      state.updateDraft(
        const RegistrationDraft(
          name: 'Amina',
          age: '7',
          cohort: 'Cohort B',
          guardianName: 'Zainab',
          village: 'Pod 2',
          guardianPhone: '0800000000',
          consentCaptured: true,
        ),
      );

      final target = state.registrationTargetForDraft;

      expect(target, isNotNull);
      expect(target!.cohort.id, 'cohort-2');
      expect(target.mallam.id, 'mallam-2');
      expect(state.registrationTargetSummary, contains('Mallama Zarah'));
    });

    test('loads recent backend runtime sessions for the selected learner',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/sessions') {
              return http.Response(
                jsonEncode({
                  'sessions': [
                    {
                      'id': 'runtime-session-1',
                      'sessionId': 'session-1',
                      'studentId': beginner.id,
                      'learnerCode': beginner.learnerCode,
                      'lessonTitle': 'Alphabet warm-up',
                      'status': 'in_progress',
                      'completionState': 'inProgress',
                      'automationStatus':
                          'Mallam is waiting for the next response.',
                      'currentStepIndex': 2,
                      'stepsTotal': 4,
                      'responsesCaptured': 1,
                      'supportActionsUsed': 0,
                      'audioCaptures': 1,
                      'facilitatorObservations': 0,
                      'lastActivityAt': '2026-04-12T10:00:00.000Z',
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      )..usingFallbackData = false;

      await state.refreshLearnerRuntimeSessions(beginner);

      final sessions = state.recentRuntimeSessionsForLearner(beginner);
      expect(sessions, hasLength(1));
      expect(sessions.first.lessonTitle, 'Alphabet warm-up');
      expect(state.runtimeSessionSummaryForLearner(beginner),
          contains('Step 2 of 4'));
    });

    test('applies synced runtime session updates into learner history',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/sync') {
              final body = jsonDecode(request.body) as Map<String, dynamic>;
              final events = body['events'] as List<dynamic>;
              return http.Response(
                jsonEncode({
                  'accepted': events.length,
                  'ignored': 0,
                  'syncedAt': '2026-04-12T10:00:00.000Z',
                  'results': [
                    {
                      'type': 'lesson_session_started',
                      'learnerCode': beginner.learnerCode,
                      'session': {
                        'id': 'runtime-session-1',
                        'sessionId': 'session-1',
                        'studentId': beginner.id,
                        'learnerCode': beginner.learnerCode,
                        'lessonTitle': 'Alphabet warm-up',
                        'status': 'in_progress',
                        'completionState': 'inProgress',
                        'automationStatus':
                            'Mallam is waiting for the next response.',
                        'currentStepIndex': 1,
                        'stepsTotal': 4,
                        'responsesCaptured': 0,
                        'supportActionsUsed': 0,
                        'audioCaptures': 0,
                        'facilitatorObservations': 0,
                        'lastActivityAt': '2026-04-12T10:00:00.000Z',
                      },
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );
      state.usingFallbackData = false;
      state.learners
        ..clear()
        ..add(beginner);
      state.currentLearner = beginner;

      state.startLesson(state.assignedLessons.first);
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      final sessions = state.recentRuntimeSessionsForLearner(beginner);
      expect(sessions, isNotEmpty);
      expect(sessions.first.sessionId, 'session-1');
      expect(sessions.first.progressLabel, 'Step 1 of 4');
      state.dispose();
    });

    test('auto-syncs queued lesson events when backend is live', () async {
      var syncCalls = 0;
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/sync') {
              syncCalls += 1;
              final body = jsonDecode(request.body) as Map<String, dynamic>;
              final events = body['events'] as List<dynamic>;
              return http.Response(
                jsonEncode({
                  'accepted': events.length,
                  'ignored': 0,
                  'syncedAt': '2026-04-12T10:00:00.000Z',
                  'results': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );
      state.usingFallbackData = false;
      state.backendError = null;
      state.currentLearner = beginner;

      final lesson = state.assignedLessons.first;
      state.startLesson(lesson);

      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      expect(syncCalls, 1);
      expect(state.pendingSyncEvents, isEmpty);
      expect(state.lastSyncAcceptedCount, 1);
      state.dispose();
    });

    test('falls back to local registration when live learner save fails',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/learners') {
              return http.Response(
                jsonEncode({'message': 'Backend register endpoint is down.'}),
                500,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );
      state.usingFallbackData = false;
      state.registrationDraft = const RegistrationDraft(
        name: 'Safiya',
        age: '8',
        cohort: 'Alpha',
        guardianName: 'Maryam',
        village: 'Pod 3',
        guardianPhone: '0801234567',
        consentCaptured: true,
      );

      final learner = await state.registerLearner();

      expect(learner.name, 'Safiya');
      expect(state.learners.first.name, 'Safiya');
      expect(state.currentLearner?.name, 'Safiya');
      expect(state.usingFallbackData, isTrue);
      expect(state.pendingSyncEvents, hasLength(1));
      expect(state.pendingSyncEvents.first.type,
          'learner_registered_local_fallback');
      expect(state.backendError, contains('saved locally and queued for sync'));
      expect(state.lastSyncError, 'Backend register endpoint is down.');
      expect(state.registrationDraft.name, isEmpty);
      state.dispose();
    });

    test('resumes lesson state from backend runtime session metadata', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.currentLearner = beginner;
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );
      final runtimeSession = BackendLessonSession(
        id: 'runtime-1',
        sessionId: 'session-42',
        studentId: beginner.id,
        learnerCode: beginner.learnerCode,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleId: lesson.moduleId,
        status: 'in_progress',
        completionState: 'inProgress',
        automationStatus: 'Mallam is waiting for the next response.',
        currentStepIndex: 2,
        stepsTotal: lesson.steps.length,
        responsesCaptured: 3,
        supportActionsUsed: 1,
        audioCaptures: 2,
        facilitatorObservations: 1,
      );

      state.startLesson(lesson, resumeFrom: runtimeSession);

      expect(state.activeSession, isNotNull);
      expect(state.activeSession!.sessionId, 'session-42');
      expect(state.activeSession!.stepIndex, 1);
      expect(state.activeSession!.totalResponses, 3);
      expect(state.activeSession!.supportActionsUsed, 1);
      expect(state.activeSession!.totalAudioCaptures, 2);
      expect(state.activeSession!.automationStatus, contains('Resume from'));
    });

    test('startLesson rejects malformed lessons with no activity steps', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);

      final malformedLesson = LessonCardModel(
        id: 'lesson-empty-steps',
        moduleId: 'english',
        title: 'Broken lesson',
        subject: 'English',
        durationMinutes: 8,
        status: 'assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Guided voice practice',
        scenario: 'Malformed lesson payload.',
        steps: const [],
      );

      expect(
        () => state.startLesson(malformedLesson),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            contains('has no activity steps'),
          ),
        ),
      );
      expect(state.activeSession, isNull);
      state.dispose();
    });

    test('startLesson rejects sync-pending assignment placeholder lessons', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = state.learners.first;
      state.selectLearner(learner);
      state.selectModule(state.modules.first);

      final placeholderLesson = LessonCardModel(
        id: 'assignment-placeholder:assignment-42',
        moduleId: 'english',
        title: 'Sync pending lesson',
        subject: 'Live assignment',
        durationMinutes: 10,
        status: 'assigned',
        mascotName: 'Mallam',
        readinessFocus: 'Assignment payload reached the tablet first.',
        scenario: 'Real lesson payload has not synced yet.',
        steps: const [
          LessonStep(
            id: 'assignment-placeholder-step',
            type: LessonStepType.intro,
            title: 'Lesson sync pending',
            instruction: 'Refresh sync before starting this assignment.',
            expectedResponse: 'Refresh sync first.',
            coachPrompt: 'Do not start runtime on a placeholder lesson.',
            facilitatorTip: 'Refresh assignments first.',
            realWorldCheck: 'Only start once the real lesson appears.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      expect(
        () => state.startLesson(placeholderLesson),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            contains('has not synced to this tablet yet'),
          ),
        ),
      );
      expect(state.activeSession, isNull);
      state.dispose();
    });

    test('restored active sessions clamp stale step indexes safely', () async {
      SharedPreferences.setMockInitialValues({
        'lumo_learner_tablet_state_v1': jsonEncode({
          'schemaVersion': '2026-04-13-runtime-persist',
          'learners': [
            {
              'id': beginner.id,
              'name': beginner.name,
              'age': beginner.age,
              'cohort': beginner.cohort,
              'streakDays': beginner.streakDays,
              'guardianName': beginner.guardianName,
              'preferredLanguage': beginner.preferredLanguage,
              'readinessLabel': beginner.readinessLabel,
              'village': beginner.village,
              'guardianPhone': beginner.guardianPhone,
              'sex': beginner.sex,
              'baselineLevel': beginner.baselineLevel,
              'consentCaptured': beginner.consentCaptured,
              'learnerCode': beginner.learnerCode,
              'caregiverRelationship': beginner.caregiverRelationship,
              'enrollmentStatus': beginner.enrollmentStatus,
              'attendanceBand': beginner.attendanceBand,
              'supportPlan': beginner.supportPlan,
              'lastLessonSummary': beginner.lastLessonSummary,
              'lastAttendance': beginner.lastAttendance,
            },
          ],
          'modules': const [],
          'assignedLessons': [
            {
              'id': 'lesson-recover',
              'moduleId': 'english',
              'title': 'Recovered English lesson',
              'subject': 'English',
              'durationMinutes': 12,
              'status': 'Ready now',
              'mascotName': 'Mallam',
              'readinessFocus': 'Resume guidance',
              'scenario': 'Restore safely after a lesson update',
              'steps': [
                {
                  'id': 'step-1',
                  'title': 'Warm-up',
                  'instruction': 'Say hello',
                  'coachPrompt': 'Say hello to Mallam.',
                  'expectedResponse': 'Hello',
                  'speakerMode': 'guiding',
                  'type': 'prompt',
                },
              ],
            },
          ],
          'pendingSyncEvents': const [],
          'activeSession': {
            'sessionId': 'session-restored',
            'lessonId': 'lesson-recover',
            'lessonTitle': 'Recovered English lesson',
            'currentLearnerId': beginner.id,
            'stepIndex': 99,
            'completionState': 'inProgress',
            'speakerMode': 'waiting',
            'transcript': const [],
            'startedAt': '2026-04-16T10:00:00.000Z',
            'lastUpdatedAt': '2026-04-16T10:05:00.000Z',
          },
        }),
      });

      final state = LumoAppState(includeSeedDemoContent: false);
      await state.restorePersistedState();

      expect(state.currentLearner?.id, beginner.id);
      expect(state.activeSession, isNotNull);
      expect(state.activeSession!.stepIndex,
          state.activeSession!.lesson.steps.length - 1);
      expect(
        state.activeSession!.speakerMode,
        state.activeSession!.lesson.steps[state.activeSession!.stepIndex]
            .speakerMode,
      );
      expect(state.activeSession!.transcript, isNotEmpty);
      expect(
        state.activeSession!.transcript.first.text,
        contains(state.activeSession!.lesson
            .steps[state.activeSession!.stepIndex].coachPrompt),
      );
      state.dispose();
    });

    test(
        'resume flow rebinds the active learner to the backend session learner',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );
      final resumeLearner = state.learners.first;
      final otherLearner = state.learners.firstWhere(
        (item) => item.id != resumeLearner.id,
      );
      state.currentLearner = otherLearner;
      final runtimeSession = BackendLessonSession(
        id: 'runtime-2',
        sessionId: 'session-77',
        studentId: resumeLearner.id,
        learnerCode: resumeLearner.learnerCode,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleId: lesson.moduleId,
        status: 'in_progress',
        completionState: 'inProgress',
        automationStatus: 'Resume the learner session.',
        currentStepIndex: 1,
        stepsTotal: lesson.steps.length,
        responsesCaptured: 1,
        supportActionsUsed: 0,
        audioCaptures: 0,
        facilitatorObservations: 0,
      );

      state.startLesson(lesson, resumeFrom: runtimeSession);

      expect(state.currentLearner?.id, resumeLearner.id);
      expect(state.activeSession?.sessionId, 'session-77');
    });

    test('repeat-after-me mode uses stricter matching and can be toggled', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.currentLearner = beginner;
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      state.startLesson(lesson);
      state.setPracticeMode(PracticeMode.repeatAfterMe);

      expect(state.activeSession!.practiceMode, PracticeMode.repeatAfterMe);
      final evaluation = state.evaluateLearnerResponse('ready');
      expect(evaluation.review, ResponseReview.needsSupport);
    });

    test('creates local rewards for seed learners after lesson completion',
        () async {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.currentLearner = beginner;
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      state.startLesson(lesson);
      state.submitLearnerResponse('I am ready');
      state.submitLearnerResponse('I can answer about English');
      await state.completeLesson(lesson);

      final rewards = state.currentLearner!.rewards;
      expect(rewards, isNotNull);
      expect(rewards!.points, greaterThan(0));
      expect(rewards.levelLabel, isNotEmpty);
      expect(rewards.badgesUnlocked, greaterThanOrEqualTo(1));
      expect(
        rewards.badges
            .any((badge) => badge.id == 'voice-starter' && badge.earned),
        isTrue,
      );
      state.dispose();
    });

    test(
        'reconciles learner profile rewards with backend projection after sync',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/sync') {
              return http.Response(
                jsonEncode({
                  'accepted': 1,
                  'ignored': 0,
                  'results': [
                    {
                      'type': 'lesson_completed',
                      'status': 'accepted',
                      'progress': {
                        'studentId': beginner.id,
                        'progressionStatus': 'on-track',
                        'recommendedNextModuleId': 'english',
                        'lessonsCompleted': 1,
                      },
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path == '/api/v1/learner-app/rewards') {
              return http.Response(
                jsonEncode({
                  'learnerId': beginner.id,
                  'totalXp': 44,
                  'points': 44,
                  'level': 2,
                  'levelLabel': 'Explorer',
                  'nextLevel': 3,
                  'nextLevelLabel': 'Bright Reader',
                  'xpIntoLevel': 4,
                  'xpForNextLevel': 36,
                  'progressToNextLevel': 0.1,
                  'badgesUnlocked': 1,
                  'badges': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path == '/api/v1/learner-app/sessions') {
              return http.Response(
                jsonEncode({'sessions': const []}),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );
      state.usingFallbackData = false;
      state.learners
        ..clear()
        ..add(beginner);
      state.currentLearner = beginner;
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      state.startLesson(lesson);
      state.submitLearnerResponse('I am ready');
      await state.completeLesson(lesson);

      expect(state.currentLearner!.rewards, isNotNull);
      expect(state.currentLearner!.rewards!.totalXp, 44);
      expect(state.currentLearner!.rewards!.levelLabel, 'Explorer');
      state.dispose();
    });

    test('levels up reward snapshot when lesson XP crosses a threshold',
        () async {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.currentLearner = beginner.copyWith(
        rewards: const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 154,
          points: 154,
          level: 2,
          levelLabel: 'Rising Voice',
          nextLevel: 3,
          nextLevelLabel: 'Bright Reader',
          xpIntoLevel: 74,
          xpForNextLevel: 6,
          progressToNextLevel: 0.92,
          badgesUnlocked: 0,
        ),
      );
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      state.startLesson(lesson);
      state.submitLearnerResponse('I am ready');
      state.submitLearnerResponse('I can answer about English');
      await state.completeLesson(lesson);

      final rewards = state.currentLearner!.rewards!;
      expect(rewards.level, 3);
      expect(rewards.levelLabel, 'Bright Reader');
      expect(rewards.nextLevelLabel, 'Story Scout');
      expect(rewards.xpForNextLevel, lessThan(80));
      state.dispose();
    });

    test('keeps optimistic lesson completion XP when reward fetch lags behind',
        () async {
      final state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/rewards') {
              return http.Response(
                jsonEncode({
                  'learnerId': beginner.id,
                  'totalXp': 120,
                  'points': 120,
                  'level': 2,
                  'levelLabel': 'Rising Voice',
                  'nextLevel': 3,
                  'nextLevelLabel': 'Bright Reader',
                  'xpIntoLevel': 40,
                  'xpForNextLevel': 40,
                  'progressToNextLevel': 0.5,
                  'badgesUnlocked': 0,
                  'badges': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      )..usingFallbackData = false;
      state.currentLearner = beginner.copyWith(
        rewards: const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 160,
          points: 160,
          level: 3,
          levelLabel: 'Bright Reader',
          nextLevel: 4,
          nextLevelLabel: 'Story Scout',
          xpIntoLevel: 0,
          xpForNextLevel: 80,
          progressToNextLevel: 0,
          badgesUnlocked: 1,
          badges: [
            RewardBadge(
              id: 'voice-starter',
              title: 'Voice Starter',
              description: 'First lesson completed with Mallam.',
              icon: 'record_voice_over',
              category: 'lesson',
              earned: true,
              progress: 1,
              target: 1,
            ),
          ],
        ),
      );
      state.learners[0] = state.currentLearner!;

      await state.refreshLearnerRewards(state.currentLearner!);

      final rewards = state.currentLearner!.rewards!;
      expect(rewards.totalXp, 160);
      expect(rewards.levelLabel, 'Bright Reader');
      expect(
        rewards.badges
            .any((badge) => badge.id == 'voice-starter' && badge.earned),
        isTrue,
      );
      state.dispose();
    });

    test('bootstrap keeps stronger local reward snapshots when backend lags',
        () async {
      SharedPreferences.setMockInitialValues({});
      final localRewards = const RewardSnapshot(
        learnerId: 'learner-1',
        totalXp: 160,
        points: 160,
        level: 3,
        levelLabel: 'Bright Reader',
        nextLevel: 4,
        nextLevelLabel: 'Story Scout',
        xpIntoLevel: 0,
        xpForNextLevel: 80,
        progressToNextLevel: 0,
        badgesUnlocked: 1,
        badges: [
          RewardBadge(
            id: 'voice-starter',
            title: 'Voice Starter',
            description: 'First lesson completed with Mallam.',
            icon: 'record_voice_over',
            category: 'lesson',
            earned: true,
            progress: 1,
            target: 1,
          ),
        ],
      );
      SharedPreferences.setMockInitialValues({
        'lumo_learner_tablet_state_v1': jsonEncode({
          'schemaVersion': '2026-04-13-runtime-persist',
          'savedAt': '2026-04-20T09:00:00.000Z',
          'learners': [
            {
              'id': beginner.id,
              'name': beginner.name,
              'age': beginner.age,
              'cohort': beginner.cohort,
              'streakDays': beginner.streakDays,
              'guardianName': beginner.guardianName,
              'preferredLanguage': beginner.preferredLanguage,
              'readinessLabel': beginner.readinessLabel,
              'village': beginner.village,
              'guardianPhone': beginner.guardianPhone,
              'sex': beginner.sex,
              'baselineLevel': beginner.baselineLevel,
              'consentCaptured': beginner.consentCaptured,
              'learnerCode': beginner.learnerCode,
              'caregiverRelationship': beginner.caregiverRelationship,
              'enrollmentStatus': beginner.enrollmentStatus,
              'attendanceBand': beginner.attendanceBand,
              'supportPlan': beginner.supportPlan,
              'profilePhotoBase64': null,
              'lastLessonSummary': beginner.lastLessonSummary,
              'lastAttendance': beginner.lastAttendance,
              'backendRecommendedModuleId': null,
              'rewards': {
                'learnerId': localRewards.learnerId,
                'totalXp': localRewards.totalXp,
                'points': localRewards.points,
                'level': localRewards.level,
                'levelLabel': localRewards.levelLabel,
                'nextLevel': localRewards.nextLevel,
                'nextLevelLabel': localRewards.nextLevelLabel,
                'xpIntoLevel': localRewards.xpIntoLevel,
                'xpForNextLevel': localRewards.xpForNextLevel,
                'progressToNextLevel': localRewards.progressToNextLevel,
                'badgesUnlocked': localRewards.badgesUnlocked,
                'badges': [
                  {
                    'id': 'voice-starter',
                    'title': 'Voice Starter',
                    'description': 'First lesson completed with Mallam.',
                    'icon': 'record_voice_over',
                    'category': 'lesson',
                    'earned': true,
                    'progress': 1,
                    'target': 1,
                  },
                ],
              },
            },
          ],
          'modules': const [],
          'assignedLessons': const [],
          'assignmentPacks': const [],
          'pendingSyncEvents': const [],
          'recentRuntimeSessionsByLearnerId': const {},
          'rewardRedemptionHistoryByLearnerId': const {},
          'usingFallbackData': false,
          'acknowledgedOfflineFallbackRisk': false,
        }),
      });

      final state = LumoAppState(
        includeSeedDemoContent: false,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'generatedAt': '2026-04-20T10:00:00.000Z',
                  'contractVersion': '2026-04-13-runtime-persist',
                  'learners': [
                    {
                      'id': beginner.id,
                      'name': beginner.name,
                      'age': beginner.age,
                      'gender': 'female',
                      'level': 'beginner',
                      'cohortName': beginner.cohort,
                      'podLabel': beginner.village,
                      'attendanceRate': 0.9,
                      'recommendedModuleId': 'english',
                      'rewards': {
                        'learnerId': beginner.id,
                        'totalXp': 0,
                        'points': 0,
                        'level': 1,
                        'levelLabel': 'Starter',
                        'nextLevel': 2,
                        'nextLevelLabel': 'Rising Voice',
                        'xpIntoLevel': 0,
                        'xpForNextLevel': 40,
                        'progressToNextLevel': 0,
                        'badgesUnlocked': 0,
                        'badges': const [],
                      },
                    },
                  ],
                  'modules': [
                    {
                      'id': 'english',
                      'title': 'English',
                      'description': 'English module',
                      'voicePrompt': 'Open English.',
                      'readinessGoal': 'Greeting flow',
                      'badge': '1 lesson',
                    },
                  ],
                  'lessons': [
                    {
                      'id': 'english-lesson-1',
                      'moduleId': 'english',
                      'title': 'Hello there',
                      'subject': 'English',
                      'durationMinutes': 8,
                      'status': 'published',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greeting flow',
                      'scenario': 'Say hello.',
                      'steps': [
                        {
                          'id': 'step-1',
                          'type': 'practice',
                          'title': 'Say hello',
                          'instruction': 'Say hello.',
                          'expectedResponse': 'Hello',
                          'coachPrompt': 'Say hello.',
                          'facilitatorTip': 'Keep it short.',
                          'realWorldCheck': 'Learner greets',
                          'speakerMode': 'guiding',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path ==
                '/api/v1/learner-app/module-bundles/english') {
              return http.Response(
                jsonEncode({
                  'module': {
                    'id': 'english',
                    'title': 'English',
                    'description': 'English module',
                    'voicePrompt': 'Open English.',
                    'readinessGoal': 'Greeting flow',
                    'badge': '1 lesson',
                  },
                  'lessons': [
                    {
                      'id': 'english-lesson-1',
                      'moduleId': 'english',
                      'title': 'Hello there',
                      'subject': 'English',
                      'durationMinutes': 8,
                      'status': 'published',
                      'mascotName': 'Mallam',
                      'readinessFocus': 'Greeting flow',
                      'scenario': 'Say hello.',
                      'steps': [
                        {
                          'id': 'step-1',
                          'type': 'practice',
                          'title': 'Say hello',
                          'instruction': 'Say hello.',
                          'expectedResponse': 'Hello',
                          'coachPrompt': 'Say hello.',
                          'facilitatorTip': 'Keep it short.',
                          'realWorldCheck': 'Learner greets',
                          'speakerMode': 'guiding',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );
      addTearDown(state.dispose);

      await state.restorePersistedState();
      await state.bootstrap();

      final rewards = state.learners.first.rewards!;
      expect(rewards.totalXp, 160);
      expect(rewards.levelLabel, 'Bright Reader');
      expect(
        rewards.badges
            .any((badge) => badge.id == 'voice-starter' && badge.earned),
        isTrue,
      );
    });

    test('lesson completion projects a completed runtime session locally',
        () async {
      late final LumoAppState state;
      state = LumoAppState(
        includeSeedDemoContent: true,
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/sync') {
              return http.Response(
                jsonEncode({
                  'accepted': 1,
                  'ignored': 0,
                  'syncedAt': '2026-04-12T10:00:00.000Z',
                  'results': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path == '/api/v1/learner-app/rewards') {
              return http.Response(
                jsonEncode({
                  'learnerId': beginner.id,
                  'totalXp': 180,
                  'points': 180,
                  'level': 3,
                  'levelLabel': 'Bright Reader',
                  'nextLevel': 4,
                  'nextLevelLabel': 'Story Scout',
                  'xpIntoLevel': 20,
                  'xpForNextLevel': 60,
                  'progressToNextLevel': 0.25,
                  'badgesUnlocked': 1,
                  'badges': const [],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path == '/api/v1/learner-app/sessions') {
              return http.Response(
                jsonEncode({
                  'sessions': [
                    {
                      'id': state.activeSession?.sessionId ??
                          'runtime-session-stale',
                      'sessionId':
                          state.activeSession?.sessionId ?? 'session-stale',
                      'studentId': beginner.id,
                      'learnerCode': beginner.learnerCode,
                      'lessonId':
                          state.activeSession?.lesson.id ?? 'lesson-stale',
                      'lessonTitle':
                          state.activeSession?.lesson.title ?? 'Older session',
                      'moduleId':
                          state.activeSession?.lesson.moduleId ?? 'english',
                      'moduleTitle':
                          state.activeSession?.lesson.subject ?? 'English',
                      'status': 'in_progress',
                      'completionState': 'inProgress',
                      'automationStatus': 'Waiting for input.',
                      'currentStepIndex': 1,
                      'stepsTotal': 4,
                      'responsesCaptured': 0,
                      'supportActionsUsed': 0,
                      'audioCaptures': 0,
                      'facilitatorObservations': 0,
                      'lastActivityAt': '2026-04-12T09:00:00.000Z',
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      )
        ..usingFallbackData = false
        ..currentLearner = beginner;

      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );
      state.startLesson(lesson);
      state.submitLearnerResponse('I am ready');
      await state.completeLesson(lesson);

      final sessions = state.recentRuntimeSessionsForLearner(beginner);
      final activeSession = state.activeSession;
      expect(sessions, isNotEmpty);
      expect(activeSession, isNotNull);
      expect(sessions.first.sessionId, activeSession?.sessionId);
      expect(sessions.first.status, 'completed');
      expect(state.resumableRuntimeSessionForLearner(beginner), isNull);
      state.dispose();
    });

    test('degraded mode summary reflects queued offline work', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.usingFallbackData = true;
      state.pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );

      expect(state.degradedModeSummary, contains('Degraded mode'));
      expect(state.degradedModeSummary, contains('queued locally'));
    });

    test('roster freshness labels expose offline fallback and queued sync work',
        () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.usingFallbackData = true;
      state.lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 12));
      state.pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );

      expect(state.rosterFreshnessLabel, contains('Roster last synced'));
      expect(state.rosterFreshnessLabel, contains('offline fallback active'));
      expect(state.rosterFreshnessDetail, contains('last confirmed'));
      expect(state.rosterFreshnessDetail, contains('refresh before trusting'));
    });

    test('roster freshness detail confirms when live roster is current', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.usingFallbackData = false;
      state.lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 5));

      expect(state.rosterFreshnessLabel, contains('Roster last synced'));
      expect(state.rosterFreshnessDetail, contains('current enough to trust'));
    });

    test('degraded mode actions recommend audio-first recovery steps', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.usingFallbackData = true;
      state.lastSyncError = 'timeout';
      state.pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );

      final actions = state.degradedModeActions(
        speechAvailable: false,
        transcriptMisses: 3,
      );

      expect(actions.join(' '), contains('cached lessons'));
      expect(actions.join(' '), contains('audio-first mode'));
      expect(actions.join(' '), contains('Repeat mode'));
      expect(actions.join(' '), contains('Pause full auto-advance'));
    });

    test('hands-free recovery helpers expose safe resume guidance', () {
      final state = LumoAppState(includeSeedDemoContent: true);

      expect(
        state.shouldOfferHandsFreeResume(
          speechAvailable: false,
          transcriptMisses: 2,
        ),
        isTrue,
      );
      expect(
        state.handsFreeRecoverySummary(
          speechAvailable: true,
          transcriptMisses: 3,
          autoPaused: true,
        ),
        contains('paused'),
      );
      expect(
        state.handsFreeRecoverySummary(
          speechAvailable: false,
          transcriptMisses: 1,
          hasDraftResponse: true,
        ),
        contains('Submit it'),
      );
    });

    test('offline completion unlocks resilience and hands-free badges',
        () async {
      final state = LumoAppState(includeSeedDemoContent: true);
      state.usingFallbackData = true;
      state.currentLearner = beginner;
      final lesson = state.assignedLessons.firstWhere(
        (item) => item.moduleId == 'english',
      );

      state.startLesson(lesson);
      state.attachLearnerAudioCapture(
        path: '/tmp/learner.m4a',
        duration: const Duration(seconds: 4),
        audioInputMode: 'Shared mic on tablet • audio-only fallback',
      );
      state.submitLearnerResponse('A is for ant.');
      await state.completeLesson(lesson);

      final rewards = state.currentLearner!.rewards!;
      expect(
        rewards.badges
            .any((badge) => badge.id == 'signal-keeper' && badge.earned),
        isTrue,
      );
      expect(
        rewards.badges
            .any((badge) => badge.id == 'hands-free-hero' && badge.earned),
        isTrue,
      );
      state.dispose();
    });

    test('reward celebration helpers surface level and badge momentum', () {
      final state = LumoAppState(includeSeedDemoContent: true);
      final learner = beginner.copyWith(
        rewards: const RewardSnapshot(
          learnerId: 'learner-1',
          totalXp: 188,
          points: 188,
          level: 3,
          levelLabel: 'Bright Reader',
          nextLevel: 4,
          nextLevelLabel: 'Story Scout',
          xpIntoLevel: 28,
          xpForNextLevel: 52,
          progressToNextLevel: 0.35,
          badgesUnlocked: 1,
          badges: [
            RewardBadge(
              id: 'voice-starter',
              title: 'Voice Starter',
              description: 'First lesson completed with Mallam.',
              icon: 'record_voice_over',
              category: 'lesson',
              earned: true,
              progress: 1,
              target: 1,
            ),
          ],
        ),
      );

      expect(
        state.rewardCelebrationHeadlineForLearner(learner),
        contains('Bright Reader'),
      );
      expect(
        state.rewardCelebrationDetailForLearner(learner),
        contains('Story Scout'),
      );
      expect(
        state.rewardCelebrationDetailForLearner(learner),
        contains('Voice Starter'),
      );
    });

    test(
        'limited offline recovery mode clears the blocker and restores fallback content',
        () async {
      final state = LumoAppState(includeSeedDemoContent: false);
      state.learners.clear();
      state.modules.clear();
      state.assignedLessons.clear();
      state.deploymentBlockerReason = 'Bootstrap failed';
      state.usingFallbackData = true;

      await state.allowLimitedOfflineRecoveryMode();

      expect(state.acknowledgedOfflineFallbackRisk, isTrue);
      expect(state.deploymentBlockerReason, isNull);
      expect(state.learners, isNotEmpty);
      expect(state.modules, isNotEmpty);
      expect(state.assignedLessons, isNotEmpty);
      expect(state.suggestedLearnerForHome, isNotNull);
    });

    test(
        'bootstrap merges bundled Meet Mallam content without overriding live lessons',
        () async {
      final liveLesson = LessonCardModel(
        id: 'live-lesson-1',
        moduleId: 'english',
        title: 'Live English hello',
        subject: 'English',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Live greeting flow',
        scenario: 'Live lesson from backend bootstrap.',
        steps: const [
          LessonStep(
            id: 'live-step-1',
            type: LessonStepType.practice,
            title: 'Live hello',
            instruction: 'Say hello.',
            expectedResponse: 'Hello',
            coachPrompt: 'Say hello.',
            facilitatorTip: 'Keep it short.',
            realWorldCheck: 'Learner says hello.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      final bundledLesson = LessonCardModel(
        id: 'lf-meet-mallam',
        moduleId: 'lumo-fundamentals',
        title: 'Meet Mallam',
        subject: 'Lumo Fundamentals',
        durationMinutes: 6,
        status: 'bundled',
        mascotName: 'Mallam',
        readinessFocus: 'Offline starter',
        scenario: 'Bundled offline intro lesson.',
        steps: const [
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
      );

      final state = LumoAppState(
        includeSeedDemoContent: false,
        bundledContentLoader: _FakeBundledContentLoader(
          BundledContentLibrary(
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
            lessons: [bundledLesson],
          ),
        ),
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': [
                    {
                      'id': beginner.id,
                      'name': beginner.name,
                      'age': beginner.age,
                      'cohortName': beginner.cohort,
                      'guardianName': beginner.guardianName,
                      'attendanceRate': 0.9,
                      'level': 'beginner',
                    },
                  ],
                  'modules': [
                    {
                      'id': 'english',
                      'subjectId': 'english',
                      'subjectName': 'English',
                      'title': 'English',
                      'level': 'beginner',
                      'status': 'published',
                    },
                  ],
                  'lessons': [
                    {
                      'id': liveLesson.id,
                      'moduleId': liveLesson.moduleId,
                      'title': liveLesson.title,
                      'subject': liveLesson.subject,
                      'durationMinutes': liveLesson.durationMinutes,
                      'status': liveLesson.status,
                      'mascotName': liveLesson.mascotName,
                      'readinessFocus': liveLesson.readinessFocus,
                      'scenario': liveLesson.scenario,
                      'activitySteps': [
                        {
                          'id': 'live-step-1',
                          'type': 'listen_repeat',
                          'title': 'Live hello',
                          'prompt': 'Say hello.',
                          'detail': 'Greeting step',
                          'evidence': 'Learner greets',
                        },
                      ],
                    },
                  ],
                  'assignments': [],
                  'registrationContext': {
                    'cohorts': [],
                    'mallams': [],
                  },
                  'meta': {
                    'generatedAt': '2026-04-19T10:00:00.000Z',
                    'contractVersion': 'learner-app.v2',
                    'assignmentCount': 0,
                  },
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path == '/api/v1/learner-app/modules/english') {
              return http.Response(
                jsonEncode({
                  'module': {
                    'id': 'english',
                    'subjectId': 'english',
                    'subjectName': 'English',
                    'title': 'English',
                    'level': 'beginner',
                    'status': 'published',
                  },
                  'lessons': [
                    {
                      'id': liveLesson.id,
                      'moduleId': liveLesson.moduleId,
                      'title': liveLesson.title,
                      'subject': liveLesson.subject,
                      'durationMinutes': liveLesson.durationMinutes,
                      'status': liveLesson.status,
                      'mascotName': liveLesson.mascotName,
                      'readinessFocus': liveLesson.readinessFocus,
                      'scenario': liveLesson.scenario,
                      'activitySteps': [
                        {
                          'id': 'live-step-1',
                          'type': 'listen_repeat',
                          'title': 'Live hello',
                          'prompt': 'Say hello.',
                          'detail': 'Greeting step',
                          'evidence': 'Learner greets',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(state.modules, isNotEmpty);
      expect(
        state.modules.any((module) => module.id == 'lumo-fundamentals'),
        isTrue,
      );
      expect(
        state.assignedLessons.any((lesson) => lesson.id == liveLesson.id),
        isTrue,
      );
      expect(
        state.assignedLessons.any((lesson) => lesson.id == bundledLesson.id),
        isTrue,
      );
    });

    test(
        'bundled fundamentals lesson wins over live lesson body with same stable id',
        () async {
      final bundledLesson = LessonCardModel(
        id: 'fundamentals-meet-mallam.lesson-01',
        moduleId: 'fundamentals-meet-mallam',
        title: 'Hello, Mallam',
        subject: 'Lumo Fundamentals',
        durationMinutes: 8,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Offline starter',
        scenario: 'Bundled offline intro lesson.',
        steps: const [
          LessonStep(
            id: 'bundled-step-1',
            type: LessonStepType.intro,
            title: 'Meet Mallam',
            instruction: 'Say hello to Mallam.',
            expectedResponse: 'Hello Mallam',
            coachPrompt: 'Say hello to Mallam.',
            facilitatorTip: 'Model the phrase once.',
            realWorldCheck: 'Learner greets Mallam.',
            speakerMode: SpeakerMode.guiding,
          ),
          LessonStep(
            id: 'bundled-step-2',
            type: LessonStepType.practice,
            title: 'Find Mallam',
            instruction: 'Tap Mallam.',
            expectedResponse: 'Mallam',
            coachPrompt: 'Tap Mallam.',
            facilitatorTip: 'One cue is enough.',
            realWorldCheck: 'Learner identifies Mallam.',
            speakerMode: SpeakerMode.listening,
          ),
        ],
      );

      final state = LumoAppState(
        includeSeedDemoContent: false,
        bundledContentLoader: _FakeBundledContentLoader(
          BundledContentLibrary(
            modules: const [
              LearningModule(
                id: 'fundamentals-meet-mallam',
                title: 'Meet Mallam',
                description: 'Offline starter pack',
                voicePrompt: 'Meet Mallam offline.',
                readinessGoal: 'Ready for offline startup.',
                badge: 'Bundled pack',
              ),
            ],
            lessons: [bundledLesson],
          ),
        ),
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            if (request.url.path == '/api/v1/learner-app/bootstrap') {
              return http.Response(
                jsonEncode({
                  'learners': [
                    {
                      'id': beginner.id,
                      'name': beginner.name,
                      'age': beginner.age,
                      'cohortName': beginner.cohort,
                      'guardianName': beginner.guardianName,
                      'attendanceRate': 0.9,
                      'level': 'beginner',
                    },
                  ],
                  'modules': [
                    {
                      'id': 'fundamentals-meet-mallam',
                      'subjectId': 'english',
                      'subjectName': 'English',
                      'title': 'Meet Mallam',
                      'level': 'beginner',
                      'status': 'published',
                    },
                  ],
                  'lessons': [
                    {
                      'id': bundledLesson.id,
                      'moduleId': bundledLesson.moduleId,
                      'title': bundledLesson.title,
                      'subject': bundledLesson.subject,
                      'durationMinutes': bundledLesson.durationMinutes,
                      'status': bundledLesson.status,
                      'mascotName': bundledLesson.mascotName,
                      'readinessFocus': bundledLesson.readinessFocus,
                      'scenario':
                          'Live server variant that should not replace the bundled body.',
                      'activitySteps': [
                        {
                          'id': 'live-step-1',
                          'order': 1,
                          'type': 'listen_repeat',
                          'title': 'Live hello',
                          'prompt': 'Say hello.',
                          'detail': 'Greeting step',
                          'evidence': 'Learner greets',
                        },
                      ],
                    },
                  ],
                  'assignments': [],
                  'registrationContext': {
                    'cohorts': [],
                    'mallams': [],
                  },
                  'meta': {
                    'generatedAt': '2026-04-19T10:00:00.000Z',
                    'contractVersion': 'learner-app.v2',
                    'assignmentCount': 0,
                  },
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            if (request.url.path ==
                '/api/v1/learner-app/modules/fundamentals-meet-mallam') {
              return http.Response(
                jsonEncode({
                  'module': {
                    'id': 'fundamentals-meet-mallam',
                    'subjectId': 'english',
                    'subjectName': 'English',
                    'title': 'Meet Mallam',
                    'level': 'beginner',
                    'status': 'published',
                  },
                  'lessons': [
                    {
                      'id': bundledLesson.id,
                      'moduleId': bundledLesson.moduleId,
                      'title': bundledLesson.title,
                      'subject': bundledLesson.subject,
                      'durationMinutes': bundledLesson.durationMinutes,
                      'status': bundledLesson.status,
                      'mascotName': bundledLesson.mascotName,
                      'readinessFocus': bundledLesson.readinessFocus,
                      'scenario':
                          'Live hydrated variant that should not replace the bundled body.',
                      'activitySteps': [
                        {
                          'id': 'live-step-1',
                          'order': 1,
                          'type': 'listen_repeat',
                          'title': 'Live hello',
                          'prompt': 'Say hello.',
                          'detail': 'Greeting step',
                          'evidence': 'Learner greets',
                        },
                      ],
                    },
                  ],
                }),
                200,
                headers: {'content-type': 'application/json'},
              );
            }
            throw Exception('Unexpected request: ${request.url}');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      final resolvedLesson = state.assignedLessons.firstWhere(
        (lesson) => lesson.id == bundledLesson.id,
      );
      expect(resolvedLesson.steps.length, 2);
      expect(resolvedLesson.steps.first.id, 'bundled-step-1');
      expect(
        resolvedLesson.scenario,
        'Bundled offline intro lesson.',
      );
    });

    test(
        'bundled Meet Mallam onboarding uses first-name personalization and offline route copy',
        () {
      final learner = beginner.copyWith(name: 'Amina Bello');
      final lesson = LessonCardModel(
        id: 'fundamentals-meet-mallam.lesson-04',
        moduleId: 'fundamentals-meet-mallam',
        title: 'My first learning turn',
        subject: 'Lumo Fundamentals',
        durationMinutes: 12,
        status: 'published',
        mascotName: 'Mallam',
        readinessFocus: 'Offline onboarding',
        scenario: 'Bundled offline onboarding finale.',
        steps: const [
          LessonStep(
            id: 'bundled-step-1',
            type: LessonStepType.intro,
            title: 'Open your first turn',
            instruction: 'Hello, [learner first name]. Say hello back.',
            expectedResponse: 'Hello, Mallam.',
            coachPrompt: 'Hello, [learner first name]. Say hello back.',
            facilitatorTip: 'Use the first name warmly.',
            realWorldCheck: 'Learner greets Mallam.',
            speakerMode: SpeakerMode.guiding,
          ),
        ],
      );

      final state = LumoAppState(includeSeedDemoContent: false);
      state.learners.add(learner);
      state.currentLearner = learner;
      state.assignedLessons.add(lesson);

      expect(
        state.personalizePrompt('Hello, [learner first name].'),
        'Hello, Amina.',
      );
      expect(
        state.nextLessonRouteSummaryForLearner(learner),
        'Next up: My first learning turn • continue the offline Meet Mallam onboarding pack.',
      );

      state.startLesson(lesson);

      expect(
        state.activeSession?.automationStatus,
        contains('Offline onboarding is ready for Amina.'),
      );
      expect(
        state.activeSession?.transcript.first.text,
        'Hello, Amina. Say hello back.',
      );
    });

    test('offline bootstrap failure still exposes bundled Meet Mallam module',
        () async {
      final bundledLesson = LessonCardModel(
        id: 'lf-meet-mallam',
        moduleId: 'lumo-fundamentals',
        title: 'Meet Mallam',
        subject: 'Lumo Fundamentals',
        durationMinutes: 6,
        status: 'bundled',
        mascotName: 'Mallam',
        readinessFocus: 'Offline starter',
        scenario: 'Bundled offline intro lesson.',
        steps: const [
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
      );

      final state = LumoAppState(
        includeSeedDemoContent: false,
        bundledContentLoader: _FakeBundledContentLoader(
          BundledContentLibrary(
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
            lessons: [bundledLesson],
          ),
        ),
        apiClient: LumoApiClient(
          client: MockClient((request) async {
            throw Exception('network offline');
          }),
          baseUrl: 'https://example.com',
        ),
      );

      await state.bootstrap();

      expect(state.usingFallbackData, isTrue);
      expect(
        state.modules.any((module) => module.id == 'lumo-fundamentals'),
        isTrue,
      );
      expect(
        state.assignedLessons.any((lesson) => lesson.id == 'lf-meet-mallam'),
        isTrue,
      );
    });

    test(
        'bootstrap keeps live subjects alongside bundled fundamentals instead of collapsing to the offline pack',
        () async {
      final bundledLesson = LessonCardModel(
        id: 'lf-meet-mallam',
        moduleId: 'lumo-fundamentals',
        title: 'Meet Mallam',
        subject: 'Lumo Fundamentals',
        durationMinutes: 6,
        status: 'bundled',
        mascotName: 'Mallam',
        readinessFocus: 'Offline starter',
        scenario: 'Bundled offline intro lesson.',
        steps: const [
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
      );

      final state = LumoAppState(
        includeSeedDemoContent: false,
        bundledContentLoader: _FakeBundledContentLoader(
          BundledContentLibrary(
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
            lessons: [bundledLesson],
          ),
        ),
        apiClient: _BootstrapWithBundledFundamentalsApiClient(),
      );

      await state.bootstrap();

      expect(
        state.modules.map((module) => module.id),
        equals(['english', 'math', 'life-skills', 'lumo-fundamentals']),
      );
      expect(
        state.modules.map((module) => module.title),
        containsAll([
          'English',
          'Basic Mathematics',
          'Life Skills',
          'Lumo Fundamentals',
        ]),
      );
      expect(
        state.assignedLessons.map((lesson) => lesson.id),
        containsAll([
          'english-live-1',
          'math-live-1',
          'life-live-1',
          'lf-meet-mallam',
        ]),
      );
      state.dispose();
    });
  });
}
