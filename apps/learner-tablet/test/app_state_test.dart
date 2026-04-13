import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:lumo_learner_tablet/api_client.dart';
import 'package:lumo_learner_tablet/app_state.dart';
import 'package:lumo_learner_tablet/models.dart';

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

    test('keeps live module list free of demo-only subjects during bootstrap',
        () async {
      final state = LumoAppState(
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
                    {
                      'subjectId': 'life-skills',
                      'subjectName': 'Life Skills',
                      'title': 'Life Skills',
                      'level': 'foundation-a',
                    },
                  ],
                  'lessons': const [],
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
      state.dispose();
    });

    test('ranks english first for voice-first beginners', () {
      final state = LumoAppState();

      final lessons = state.lessonsForLearner(beginner);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'english');
      expect(state.nextAssignedLessonForLearner(beginner)?.moduleId, 'english');
    });

    test('ranks math first for guided practice learners', () {
      final state = LumoAppState();

      final lessons = state.lessonsForLearner(emerging);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'math');
    });

    test('ranks story first for confident responders', () {
      final state = LumoAppState();

      final lessons = state.lessonsForLearner(confident);

      expect(lessons, isNotEmpty);
      expect(lessons.first.moduleId, 'story');
      expect(
          state.recommendedModuleLabelForLearner(confident), contains('Story'));
    });

    test('assigned lesson summary reflects next lesson title', () {
      final state = LumoAppState();

      final summary = state.assignedLessonSummaryForLearner(beginner);
      final nextLesson = state.nextAssignedLessonForLearner(beginner);

      expect(nextLesson, isNotNull);
      expect(summary, contains(nextLesson!.title));
      expect(summary, contains('assigned lesson'));
    });

    test('prefers backend assignment packs over heuristic lesson order', () {
      final state = LumoAppState();
      final storyLesson = state.assignedLessons
          .firstWhere((lesson) => lesson.moduleId == 'story');

      state.assignmentPacks.add(
        LearnerAssignmentPack(
          assignmentId: 'assignment-1',
          lessonId: storyLesson.id,
          moduleId: storyLesson.moduleId,
          lessonTitle: storyLesson.title,
          cohortName: beginner.cohort,
          mallamName: 'Mallam Idris',
          dueDate: '2026-04-20T10:00:00.000Z',
          assessmentTitle: 'Story check',
          eligibleLearnerIds: [beginner.id],
        ),
      );

      final lessons = state.lessonsForLearner(beginner);
      final nextPack = state.nextAssignmentPackForLearner(beginner);

      expect(nextPack, isNotNull);
      expect(lessons.first.id, storyLesson.id);
      expect(state.backendRoutingSummaryForLearner(beginner),
          contains('Mallam Idris'));
    });

    test('uses backend recommended module when available', () {
      final state = LumoAppState();
      final learner = beginner.copyWith(backendRecommendedModuleId: 'math');

      expect(state.recommendedModuleLabelForLearner(learner), contains('Math'));
      expect(state.recommendedModuleForLearner(learner).id, 'math');
    });

    test('prefers resumable backend runtime lesson before fresh routing', () {
      final state = LumoAppState();
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

    test('routes away from the completed lesson when continuing', () {
      final state = LumoAppState();
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
      final state = LumoAppState();
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
      final state = LumoAppState();
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

    test('resumes lesson state from backend runtime session metadata', () {
      final state = LumoAppState();
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

    test('repeat-after-me mode uses stricter matching and can be toggled', () {
      final state = LumoAppState();
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
      final state = LumoAppState();
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

    test('levels up reward snapshot when lesson XP crosses a threshold',
        () async {
      final state = LumoAppState();
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

    test('degraded mode summary reflects queued offline work', () {
      final state = LumoAppState();
      state.usingFallbackData = true;
      state.pendingSyncEvents.add(
        const SyncEvent(id: 'sync-1', type: 'lesson_completed', payload: {}),
      );

      expect(state.degradedModeSummary, contains('Degraded mode'));
      expect(state.degradedModeSummary, contains('queued locally'));
    });

    test('degraded mode actions recommend audio-first recovery steps', () {
      final state = LumoAppState();
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
    });

    test('reward celebration helpers surface level and badge momentum', () {
      final state = LumoAppState();
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
        contains('badge'),
      );
    });
  });
}
