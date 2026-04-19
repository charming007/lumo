import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lumo_learner_tablet/api_client.dart';

void main() {
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
    test('rejects missing release config', () {
      expect(
        LumoApiClient.productionBaseUrlIssue(
          'https://lumo-api-production-303a.up.railway.app',
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
    test('parses nested module payloads without collapsing the subject id', () async {
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
}
