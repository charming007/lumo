import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/models.dart';

void main() {
  group('LumoApiClient tablet identity', () {
    test(
        'sends bootstrap device identifier via query and avoids brittle GET headers',
        () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/bootstrap');
          expect(request.url.queryParameters['deviceIdentifier'],
              'lumo-tablet-stable-01');
          expect(request.headers['x-lumo-device-identifier'], isNull);
          expect(request.headers['content-type'], isNull);
          expect(request.headers['accept'], 'application/json');
          return http.Response(
            jsonEncode({
              'learners': const [],
              'modules': const [],
              'lessons': const [],
              'assignments': const [],
              'registrationContext': const {},
              'meta': const {},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
        deviceIdentifier: 'lumo-tablet-stable-01',
      );

      await client.fetchBootstrap();
    });

    test('allows slower bootstrap responses without timing out early',
        () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          await Future<void>.delayed(const Duration(seconds: 4));
          return http.Response(
            jsonEncode({
              'learners': const [],
              'modules': const [],
              'lessons': const [],
              'assignments': const [],
              'registrationContext': const {},
              'meta': const {},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
      );

      await expectLater(client.fetchBootstrap(), completes);
    });

    test(
        'sends device identifier on learner registration and skips manual backendTarget when tablet identity is present',
        () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/learners');
          expect(request.headers['x-lumo-device-identifier'],
              'lumo-tablet-stable-01');
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['deviceIdentifier'], 'lumo-tablet-stable-01');
          expect(body.containsKey('backendTarget'), isFalse);
          return http.Response(
            jsonEncode({
              'id': 'student-1',
              'name': 'Amina',
              'age': 8,
              'cohortName': 'Alpha',
              'guardianName': 'Zainab',
              'attendanceRate': 0.9,
              'level': 'beginner',
            }),
            201,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
        deviceIdentifier: 'lumo-tablet-stable-01',
      );

      await client.registerLearner(
        draft: const RegistrationDraft(
          name: 'Amina',
          age: '8',
          cohort: 'Alpha',
          guardianName: 'Zainab',
          village: 'Pod 1',
          guardianPhone: '0800000000',
          consentCaptured: true,
        ),
        registrationTarget: RegistrationTarget(
          cohort: const BackendCohort(
            id: 'cohort-1',
            name: 'Alpha',
            podId: 'pod-1',
          ),
          mallam: const BackendMallam(
            id: 'teacher-1',
            name: 'Mallam Idris',
            podIds: ['pod-1'],
          ),
        ),
      );
    });
  });

  group('LumoApiClient.normalizeBaseUrl', () {
    test('keeps a clean https origin unchanged', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });

    test('adds https when user passes only the host', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          'lumo-api-production-303a.up.railway.app',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });

    test('strips known API suffixes and whitespace', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          '  https://lumo-api-production-303a.up.railway.app/api/v1/learner-app/bootstrap  ',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );

      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app/api/v1/learner-app',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );

      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app/api/v1',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });

    test('drops query string and fragment noise from pasted URLs', () {
      expect(
        LumoApiClient.normalizeBaseUrl(
          'https://lumo-api-production-303a.up.railway.app/api/v1/learner-app/bootstrap?x=1#debug',
        ),
        'https://lumo-api-production-303a.up.railway.app',
      );
    });
  });

  group('LumoApiClient.productionBaseUrlIssue', () {
    test(
        'allows the bundled production default when explicit release config is absent',
        () {
      expect(
        LumoApiClient.productionBaseUrlIssue(
          'https://lumo-api-production-303a.up.railway.app',
          hasExplicitConfig: false,
        ),
        isNull,
      );
    });

    test(
        'still rejects missing release config when the implicit target is not the bundled production default',
        () {
      expect(
        LumoApiClient.productionBaseUrlIssue(
          'https://staging-lumo-api.example.org',
          hasExplicitConfig: false,
        ),
        contains('LUMO_API_BASE_URL is missing'),
      );
    });

    test('rejects localhost release targets', () {
      expect(
        LumoApiClient.productionBaseUrlIssue('http://localhost:4000'),
        contains('only reachable from the local machine'),
      );
    });

    test('rejects non-https release targets', () {
      expect(
        LumoApiClient.productionBaseUrlIssue('http://lumo-api.example.org'),
        contains('must use https'),
      );
    });

    test('accepts the production railway host', () {
      expect(
        LumoApiClient.productionBaseUrlIssue(
          'https://lumo-api-production-303a.up.railway.app',
        ),
        isNull,
      );
    });
  });

  group('LumoApiClient module bundles', () {
    test('parses nested module payloads without collapsing the subject id',
        () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/modules/english');
          return http.Response(
            jsonEncode({
              'module': {
                'id': 'english',
                'subjectId': 'english',
                'subjectName': 'Foundational English',
                'title': 'Foundational English',
                'badge': '12 lessons',
              },
              'lessons': [
                {
                  'id': 'english-lesson-1',
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
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
      );

      final bundle = await client.fetchModuleBundle('english');

      expect(bundle.module.id, 'english');
      expect(bundle.module.title, 'Foundational English');
      expect(bundle.lessons, hasLength(1));
      expect(bundle.lessons.first.moduleId, 'english');
    });
  });

  group('LumoApiClient runtime sessions', () {
    test('parses recent learner runtime sessions', () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/sessions');
          expect(request.url.queryParameters['learnerCode'], 'AMI-AL07');
          expect(request.url.queryParameters['limit'], '3');
          return http.Response(
            jsonEncode({
              'sessions': [
                {
                  'id': 'runtime-session-1',
                  'sessionId': 'session-1',
                  'studentId': 'learner-1',
                  'learnerCode': 'AMI-AL07',
                  'lessonId': 'lesson-1',
                  'lessonTitle': 'Alphabet warm-up',
                  'moduleId': 'english',
                  'moduleTitle': 'English',
                  'status': 'completed',
                  'completionState': 'completed',
                  'automationStatus': 'Mallam wrapped the lesson cleanly.',
                  'currentStepIndex': 4,
                  'stepsTotal': 4,
                  'responsesCaptured': 3,
                  'supportActionsUsed': 1,
                  'audioCaptures': 2,
                  'facilitatorObservations': 0,
                  'latestReview': 'onTrack',
                  'lastActivityAt': '2026-04-12T10:00:00.000Z',
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
      );

      final sessions = await client.fetchRecentSessions(
        learnerCode: 'AMI-AL07',
        limit: 3,
      );

      expect(sessions, hasLength(1));
      expect(sessions.first.lessonTitle, 'Alphabet warm-up');
      expect(sessions.first.statusLabel, 'Completed');
      expect(sessions.first.progressLabel, 'Step 4 of 4');
    });
  });

  group('LumoApiClient learner rewards', () {
    test('loads the authoritative learner reward snapshot', () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/rewards');
          expect(request.url.queryParameters['learnerId'], 'learner-1');
          expect(request.url.queryParameters['learnerCode'], 'AMI-AL07');
          return http.Response(
            jsonEncode({
              'learnerId': 'learner-1',
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
              'badges': const [
                {
                  'id': 'first-lesson',
                  'title': 'First Light',
                  'description': 'Completed a first lesson.',
                  'icon': 'emoji_events',
                  'category': 'milestone',
                  'earned': true,
                  'progress': 1,
                  'target': 1,
                },
              ],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
      );

      final snapshot = await client.fetchLearnerRewards(
        learnerId: 'learner-1',
        learnerCode: 'AMI-AL07',
      );

      expect(snapshot.totalXp, 44);
      expect(snapshot.levelLabel, 'Explorer');
      expect(snapshot.badgesUnlocked, 1);
    });
  });

  group('LumoApiClient backend target diagnostics', () {
    test('surfaces route mismatch evidence when bootstrap hits an HTML 404',
        () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/bootstrap');
          return http.Response(
            '<html><body>Cannot GET /api/v1/learner-app/bootstrap</body></html>',
            404,
            headers: {'content-type': 'text/html; charset=utf-8'},
          );
        }),
        baseUrl: 'https://wrong-backend.example.com',
      );

      await expectLater(
        client.fetchBootstrap(),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'message',
            allOf(
              contains('wrong backend'),
              contains('API base: https://wrong-backend.example.com'),
              contains('/api/v1/learner-app/bootstrap'),
            ),
          ),
        ),
      );
    });

    test('surfaces HTML success responses as wrong backend evidence', () async {
      final client = LumoApiClient(
        client: MockClient((request) async => http.Response(
              '<!doctype html><html><body>frontend shell</body></html>',
              200,
              headers: {'content-type': 'text/html'},
            )),
        baseUrl: 'https://frontend-shell.example.com',
      );

      await expectLater(
        client.fetchBootstrap(),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'message',
            allOf(
              contains('got HTML instead'),
              contains('API base: https://frontend-shell.example.com'),
            ),
          ),
        ),
      );
    });
  });

  group('LumoApiClient bootstrap parsing', () {
    test('preserves backend default registration target', () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/bootstrap');
          return http.Response(
            jsonEncode({
              'learners': [],
              'modules': [],
              'lessons': [],
              'assignments': [],
              'registrationContext': {
                'cohorts': [
                  {'id': 'cohort-1', 'name': 'Cohort A', 'podId': 'pod-1'},
                ],
                'mallams': [
                  {
                    'id': 'mallam-1',
                    'displayName': 'Mallam Idris',
                    'podIds': ['pod-1']
                  },
                ],
                'defaultTarget': {
                  'cohortId': 'cohort-1',
                  'mallamId': 'mallam-1',
                },
              },
              'meta': {
                'generatedAt': '2026-04-12T10:00:00.000Z',
                'contractVersion': 'learner-app.v2',
                'assignmentCount': 0,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
      );

      final bootstrap = await client.fetchBootstrap();

      expect(bootstrap.registrationContext.defaultTarget, isNotNull);
      expect(
          bootstrap.registrationContext.defaultTarget!.cohort.id, 'cohort-1');
      expect(
          bootstrap.registrationContext.defaultTarget!.mallam.id, 'mallam-1');
      expect(bootstrap.registrationContext.summary, contains('Mallam Idris'));
    });
  });

  group('LumoApiClient bootstrap scope', () {
    test('parses pod-scoped learner and tablet registration context', () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/bootstrap');
          return http.Response(
            jsonEncode({
              'learners': [
                {
                  'id': 'student-1',
                  'name': 'Abdullahi',
                  'age': 8,
                  'cohortId': 'cohort-1',
                  'cohortName': 'Alpha Cohort',
                  'podId': 'pod-1',
                  'podLabel': 'Kano North',
                  'mallamId': 'teacher-1',
                  'mallamName': 'Mallam Idris',
                  'attendanceRate': 0.9,
                  'level': 'beginner',
                },
              ],
              'modules': const [],
              'lessons': const [],
              'assignments': const [],
              'registrationContext': {
                'cohorts': [
                  {'id': 'cohort-1', 'name': 'Alpha Cohort', 'podId': 'pod-1'},
                ],
                'mallams': [
                  {
                    'id': 'teacher-1',
                    'name': 'Mallam Idris',
                    'podIds': ['pod-1']
                  },
                ],
                'defaultTarget': {
                  'cohortId': 'cohort-1',
                  'podId': 'pod-1',
                  'mallamId': 'teacher-1',
                },
                'tabletRegistration': {
                  'id': 'device-1',
                  'deviceIdentifier': 'lumo-tablet-kano-01',
                  'podId': 'pod-1',
                  'podLabel': 'Kano North',
                  'mallamId': 'teacher-1',
                  'mallamName': 'Mallam Idris',
                },
              },
              'meta': {
                'generatedAt': '2026-04-23T00:00:00.000Z',
                'contractVersion': 'learner-app-v2.4',
                'assignmentCount': 0,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
        baseUrl: 'https://example.com',
      );

      final bootstrap = await client.fetchBootstrap();

      expect(bootstrap.learners.single.podId, 'pod-1');
      expect(bootstrap.learners.single.mallamName, 'Mallam Idris');
      expect(
        bootstrap.registrationContext.tabletRegistration?.deviceIdentifier,
        'lumo-tablet-kano-01',
      );
      expect(
          bootstrap.registrationContext.summary, 'Kano North • Mallam Idris');
    });
  });

  group('LumoApiClient tutor voice replay', () {
    test('returns null when backend says remote tutor voice is unavailable',
        () async {
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/voice/replay');
          return http.Response('', 204);
        }),
        baseUrl: 'https://example.com',
      );

      final clip = await client.fetchTutorVoiceReplay(
        text: 'Hello learner',
        mode: SpeakerMode.guiding,
      );

      expect(clip, isNull);
    });

    test('parses binary tutor voice audio payloads', () async {
      final bytes = utf8.encode('fake-mp3-audio');
      final client = LumoApiClient(
        client: MockClient((request) async {
          expect(request.url.path, '/api/v1/learner-app/voice/replay');
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body['text'], 'Hello learner');
          expect(body['mode'], 'guiding');
          return http.Response.bytes(
            bytes,
            200,
            headers: {
              'content-type': 'audio/mpeg',
              'x-lumo-voice-provider': 'elevenlabs',
              'x-lumo-voice-model': 'eleven_flash_v2_5',
            },
          );
        }),
        baseUrl: 'https://example.com',
      );

      final clip = await client.fetchTutorVoiceReplay(
        text: 'Hello learner',
        mode: SpeakerMode.guiding,
      );

      expect(clip, isNotNull);
      expect(clip!.contentType, 'audio/mpeg');
      expect(clip.provider, 'elevenlabs');
      expect(clip.model, 'eleven_flash_v2_5');
      expect(clip.audioBytes, bytes);
    });
  });
}
