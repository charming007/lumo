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
