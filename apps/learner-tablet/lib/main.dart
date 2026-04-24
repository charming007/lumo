// ignore_for_file: unused_element, unused_field, unused_local_variable

import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import 'app_state.dart';
import 'api_client.dart';
import 'audio_capture_service.dart';
import 'browser_runtime_observer.dart';
import 'design_shell.dart';
import 'dialogue.dart';
import 'instructions.dart';
import 'learner_audio_playback_service.dart';
import 'models.dart';
import 'speech_transcription_service.dart';
import 'theme.dart';
import 'voice_replay_service.dart';
import 'widgets.dart';

final RouteObserver<ModalRoute<void>> lumoRouteObserver =
    RouteObserver<ModalRoute<void>>();

void main() {
  runApp(const LumoApp());
}

class LumoApp extends StatefulWidget {
  const LumoApp({
    super.key,
    this.stateOverride,
    this.includeSeedDemoContent = kEnableSeedDemoContent,
  });

  final LumoAppState? stateOverride;
  final bool includeSeedDemoContent;

  @override
  State<LumoApp> createState() => _LumoAppState();
}

class _LumoAppState extends State<LumoApp> {
  late final bool _ownsState = widget.stateOverride == null;
  late final LumoAppState state = widget.stateOverride ??
      LumoAppState(includeSeedDemoContent: widget.includeSeedDemoContent);
  late final VoiceReplayService voiceReplayService = VoiceReplayService(
      apiClient: LumoApiClient(baseUrl: state.backendBaseUrl));
  bool showSplash = true;

  @override
  void initState() {
    super.initState();
    state.attachVoiceReplay(
      voiceReplayService.replay,
      onStop: voiceReplayService.stop,
    );
    Future.microtask(() async {
      await state.restorePersistedState();
      if (mounted) {
        setState(() {});
      }
      await state.bootstrap();
      if (!mounted) return;
      setState(() {});
    });
  }

  void handleSplashFinished() {
    if (!mounted) return;
    setState(() {
      showSplash = false;
    });
  }

  @override
  void dispose() {
    if (_ownsState) {
      state.dispose();
    }
    voiceReplayService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lumo',
      debugShowCheckedModeBanner: false,
      theme: LumoTheme.light,
      navigatorObservers: [lumoRouteObserver],
      home: showSplash
          ? SplashScreen(onFinish: handleSplashFinished)
          : SessionRecoveryGate(
              state: state,
              onChanged: () => setState(() {}),
            ),
    );
  }
}

class SessionRecoveryGate extends StatefulWidget {
  const SessionRecoveryGate({
    super.key,
    required this.state,
    required this.onChanged,
  });

  final LumoAppState state;
  final VoidCallback onChanged;

  @override
  State<SessionRecoveryGate> createState() => _SessionRecoveryGateState();
}

class _SessionRecoveryGateState extends State<SessionRecoveryGate> {
  bool _recoveryLaunchHandled = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _launchRecoveredSessionIfNeeded();
  }

  @override
  void didUpdateWidget(covariant SessionRecoveryGate oldWidget) {
    super.didUpdateWidget(oldWidget);
    _launchRecoveredSessionIfNeeded();
  }

  void _launchRecoveredSessionIfNeeded() {
    if (_recoveryLaunchHandled || !widget.state.restoredFromPersistence) {
      return;
    }
    final session = widget.state.activeSession;
    final lesson = session?.lesson;
    if (session == null || lesson == null) {
      if (!widget.state.hasPendingRecoveredSession) {
        _recoveryLaunchHandled = true;
      }
      return;
    }

    _recoveryLaunchHandled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final recoveredRoute =
          session.completionState == LessonCompletionState.complete
              ? MaterialPageRoute(
                  builder: (_) => LessonCompletePage(
                    state: widget.state,
                    lesson: lesson,
                  ),
                )
              : MaterialPageRoute(
                  builder: (_) => LessonSessionPage(
                    state: widget.state,
                    lesson: lesson,
                    onChanged: widget.onChanged,
                  ),
                );
      Navigator.of(context).push(recoveredRoute);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.state.isBootstrapping &&
        !widget.state.hasUsableOfflineSnapshot) {
      return LearnerBootstrapLoadingPage(state: widget.state);
    }

    if (widget.state.shouldBlockProductionDeployment) {
      return LearnerDeploymentBlockerPage(
        state: widget.state,
        onRetry: () async {
          await widget.state.bootstrap();
          widget.onChanged();
        },
      );
    }

    return HomePage(state: widget.state, onChanged: widget.onChanged);
  }
}

class LearnerBootstrapLoadingPage extends StatelessWidget {
  const LearnerBootstrapLoadingPage({
    super.key,
    required this.state,
  });

  final LumoAppState state;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 860),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LumoTopBar(
                    onLogoTap: () {},
                    extraChips: _buildOperatorStatusChips(state),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFFEEF2FF), Color(0xFFFFFFFF)],
                      ),
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: const Color(0xFFC7D2FE)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x140F172A),
                          blurRadius: 24,
                          offset: Offset(0, 14),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Loading the live learner roster before the tablet opens.',
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w900,
                            height: 1.1,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Lumo is waiting for the production bootstrap so facilitators do not land on an empty home screen or fake learner list while the tablet is still syncing.',
                          style: TextStyle(
                            color: Color(0xFF475569),
                            fontSize: 16,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const LinearProgressIndicator(
                          value: 0.72,
                          minHeight: 10,
                          borderRadius: BorderRadius.all(Radius.circular(999)),
                          color: LumoTheme.primary,
                          backgroundColor: Color(0xFFE0E7FF),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          state.backendStatusDetail,
                          style: const TextStyle(
                            color: Color(0xFF334155),
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LearnerDeploymentBlockerPage extends StatelessWidget {
  const LearnerDeploymentBlockerPage({
    super.key,
    required this.state,
    required this.onRetry,
  });

  final LumoAppState state;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final blockerReason = state.deploymentBlockerReason ??
        state.backendError ??
        'Learner bootstrap could not reach the production backend.';
    final configuredBackend = state.backendBaseUrl;
    final backendHost = Uri.tryParse(configuredBackend)?.host;
    final backendLabel = backendHost != null && backendHost.isNotEmpty
        ? '$backendHost · $configuredBackend'
        : configuredBackend;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LumoTopBar(
                    onLogoTap: () {},
                    extraChips: _buildOperatorStatusChips(state),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF7C2D12), Color(0xFF9A3412)],
                      ),
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: const Color(0xFFEA580C)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x3329231A),
                          blurRadius: 30,
                          offset: Offset(0, 18),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Deployment blocker: learner app is offline and refusing to fake a live roster.',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            height: 1.15,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'This release build could not load the production learner bootstrap, and there is no trusted offline snapshot on this device. Showing seed learners or demo lessons here would be polished nonsense.',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.92),
                            height: 1.5,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.10),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.18),
                            ),
                          ),
                          child: Text(
                            blockerReason,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  DetailCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'What to fix before deployment',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 14),
                        const _DeploymentCheckRow(
                          title: 'Backend bootstrap',
                          expected:
                              'GET /api/v1/learner-app/bootstrap returns production learners, modules, lessons, assignments, and registration targets.',
                          failure:
                              'Tablet opens to an offline blocker because the live roster cannot be trusted yet.',
                        ),
                        const _DeploymentCheckRow(
                          title: 'Release config',
                          expected:
                              'LUMO_API_BASE_URL points at the production API for this release build.',
                          failure:
                              'App targets the wrong host, times out, or never reaches the learner backend.',
                        ),
                        const _DeploymentCheckRow(
                          title: 'Trusted offline state',
                          expected:
                              'If the tablet must work offline, preload a real synced snapshot first instead of shipping demo seed content.',
                          failure:
                              'Operators see fake learners or empty live flows on a production tablet.',
                        ),
                        const SizedBox(height: 18),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Live backend target',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                backendLabel,
                                style: const TextStyle(
                                  color: Color(0xFF0F172A),
                                  fontWeight: FontWeight.w700,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                blockerReason.contains('LUMO_API_BASE_URL')
                                    ? 'This build is blocked on release config, not learner content. Fix the API host, redeploy, then retry on the tablet.'
                                    : 'This is the production host the tablet is trying to reach right now. If it looks wrong, fix the release config before blaming the learner roster.',
                                style: const TextStyle(
                                  color: Color(0xFF475569),
                                  height: 1.45,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            FilledButton.icon(
                              onPressed: () async {
                                await onRetry();
                              },
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('Retry production bootstrap'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          state.hasUsableOfflineSnapshot
                              ? 'This tablet already has a trusted offline snapshot, so once bootstrap recovers it can safely reopen without inventing demo learners.'
                              : 'Release builds stay blocked here until a real production bootstrap or trusted offline snapshot exists. This screen will not open demo learners just to look alive.',
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DeploymentCheckRow extends StatelessWidget {
  const _DeploymentCheckRow({
    required this.title,
    required this.expected,
    required this.failure,
  });

  final String title;
  final String expected;
  final String failure;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            expected,
            style: const TextStyle(color: Color(0xFF0F172A), height: 1.4),
          ),
          const SizedBox(height: 6),
          Text(
            failure,
            style: const TextStyle(color: Color(0xFF9A3412), height: 1.4),
          ),
        ],
      ),
    );
  }
}

class SplashScreen extends StatefulWidget {
  final VoidCallback onFinish;

  const SplashScreen({super.key, required this.onFinish});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 3), () {
      if (!mounted) return;
      widget.onFinish();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF9FAFF), Color(0xFFEFEFFF), Color(0xFFFDF7EE)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 32,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 64,
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(40),
                            boxShadow: [
                              BoxShadow(
                                color:
                                    LumoTheme.primary.withValues(alpha: 0.16),
                                blurRadius: 30,
                                offset: const Offset(0, 18),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(30),
                            child: Image.asset(
                              'assets/images/lumo_logo.jpg',
                              height: 168,
                              width: 168,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(height: 28),
                        const Text(
                          'Lumo learner tablet',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Getting Mallam, learners, and voice-first lessons ready...',
                          style: TextStyle(
                            color: Color(0xFF6B7280),
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        const SizedBox(
                          width: 220,
                          child: LinearProgressIndicator(
                            value: 0.72,
                            minHeight: 8,
                            borderRadius: BorderRadius.all(
                              Radius.circular(999),
                            ),
                            color: LumoTheme.primary,
                            backgroundColor: Color(0xFFE9E7FF),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

LearningModule resolveLessonModule({
  required LumoAppState state,
  required LessonCardModel lesson,
  LearningModule? module,
}) {
  return module ??
      state.modules.where((item) => item.id == lesson.moduleId).firstOrNull ??
      state.modules.firstOrNull ??
      LearningModule(
        id: lesson.moduleId,
        title: lesson.subject,
        description:
            'Continue this ${lesson.subject.toLowerCase()} lesson while live module metadata is still syncing.',
        voicePrompt: "Let's continue ${lesson.subject} together.",
        readinessGoal: lesson.readinessFocus,
        badge: 'Lesson ready',
      );
}

class LearnerSubjectCardModel {
  final String id;
  final String title;
  final String description;
  final String voicePrompt;
  final String readinessGoal;
  final String badge;
  final LearningModule module;
  final int availableLessonCount;

  const LearnerSubjectCardModel({
    required this.id,
    required this.title,
    required this.description,
    required this.voicePrompt,
    required this.readinessGoal,
    required this.badge,
    required this.module,
    required this.availableLessonCount,
  });
}

String _normalizeSubjectKey(String value) {
  return value.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-');
}

bool _isLearnerVisibleLesson({
  required LumoAppState state,
  required LessonCardModel lesson,
}) {
  final normalizedStatus = lesson.status.trim().toLowerCase();
  if (normalizedStatus.isEmpty ||
      normalizedStatus == 'published' ||
      normalizedStatus == 'live' ||
      normalizedStatus == 'assigned' ||
      normalizedStatus == 'bundled') {
    return true;
  }

  return state.usingFallbackData && normalizedStatus == 'offline';
}

List<LearnerSubjectCardModel> buildLearnerSubjectCards({
  required LumoAppState state,
  LearnerProfile? learner,
}) {
  final subjects = state.learnerFacingSubjects(learner: learner);

  return subjects
      .map((subject) {
        final availableLessonCount = state
            .lessonsForLearnerAndSubject(learner, subject.id)
            .where((lesson) {
          if (!_isLearnerVisibleLesson(state: state, lesson: lesson)) {
            return false;
          }
          if (learner != null || state.learners.isEmpty) {
            return true;
          }
          return state.availableLearnersForLesson(lesson).isNotEmpty;
        }).length;

        return LearnerSubjectCardModel(
          id: subject.id,
          title: subject.title,
          description: subject.description,
          voicePrompt: subject.voicePrompt,
          readinessGoal: subject.readinessGoal,
          badge: subject.badge,
          module: state.primaryModuleForSubject(
                learner: learner,
                subjectId: subject.id,
              ) ??
              subject,
          availableLessonCount: availableLessonCount,
        );
      })
      .where((subject) => subject.availableLessonCount > 0)
      .toList(growable: false);
}

String _resolvedSubjectTitleForModule({
  required LumoAppState state,
  required LearningModule module,
  LearnerProfile? learner,
}) {
  final lessonBackedSubject = state
      .lessonsForLearnerAndModule(learner, module.id)
      .map((lesson) => lesson.subject.trim())
      .firstWhere(
        (subject) => subject.isNotEmpty,
        orElse: () => '',
      );
  return lessonBackedSubject.isNotEmpty ? lessonBackedSubject : module.title;
}

String _resolvedSubjectKeyForModule({
  required LumoAppState state,
  required LearningModule module,
  LearnerProfile? learner,
}) {
  return _normalizeSubjectKey(
    _resolvedSubjectTitleForModule(
      state: state,
      module: module,
      learner: learner,
    ),
  );
}

enum LearnerLessonAvailabilityKind {
  resumeReady,
  assigned,
  available,
  completedToday,
  absent,
  skipped,
  podMismatch,
  unavailable,
}

class LearnerLessonAvailability {
  final LearnerLessonAvailabilityKind kind;
  final String label;
  final String detail;
  final BackendLessonSession? resumableSession;

  const LearnerLessonAvailability({
    required this.kind,
    required this.label,
    required this.detail,
    this.resumableSession,
  });

  bool get canLaunch =>
      kind == LearnerLessonAvailabilityKind.resumeReady ||
      kind == LearnerLessonAvailabilityKind.assigned ||
      kind == LearnerLessonAvailabilityKind.available;
}

LearnerLessonAvailability learnerLessonAvailability({
  required LumoAppState state,
  required LearnerProfile learner,
  required LessonCardModel lesson,
}) {
  final resumableSession =
      state.resumableSessionForLearnerAndLesson(learner, lesson);
  if (resumableSession != null) {
    return LearnerLessonAvailability(
      kind: LearnerLessonAvailabilityKind.resumeReady,
      label: 'Resume ready',
      detail: resumableSession.progressLabel,
      resumableSession: resumableSession,
    );
  }

  final terminalSession =
      state.terminalRuntimeSessionForLearnerAndLesson(learner, lesson);
  if (terminalSession != null) {
    final terminalState = terminalSession.completionState.trim().toLowerCase();
    if (terminalState == 'absent') {
      return const LearnerLessonAvailability(
        kind: LearnerLessonAvailabilityKind.absent,
        label: 'Absent today',
        detail: 'This learner was already marked absent for this lesson today.',
      );
    }
    if (terminalState == 'skipped' || terminalState == 'skip') {
      return const LearnerLessonAvailability(
        kind: LearnerLessonAvailabilityKind.skipped,
        label: 'Skipped today',
        detail:
            'This learner already skipped this lesson today on this tablet.',
      );
    }
    if (state.lessonCompletedTodayForLearner(learner, lesson)) {
      return const LearnerLessonAvailability(
        kind: LearnerLessonAvailabilityKind.completedToday,
        label: 'Completed today',
        detail:
            'This learner already finished this lesson today on this tablet.',
      );
    }
    return const LearnerLessonAvailability(
      kind: LearnerLessonAvailabilityKind.unavailable,
      label: 'Unavailable',
      detail: 'This learner already has a terminal session on this lesson.',
    );
  }

  if (!state.learnerMatchesTabletPod(learner)) {
    final tabletPodLabel = state.tabletPodLabel ?? 'this tablet pod';
    final learnerPodLabel = learner.podLabel ?? learner.cohort;
    return LearnerLessonAvailability(
      kind: LearnerLessonAvailabilityKind.podMismatch,
      label: 'Different pod',
      detail: '$learnerPodLabel learner, tablet is set for $tabletPodLabel.',
    );
  }

  final backendAssigned = state
      .backendAssignedLessonsForLearner(learner)
      .any((item) => item.id == lesson.id);
  if (backendAssigned) {
    return LearnerLessonAvailability(
      kind: LearnerLessonAvailabilityKind.assigned,
      label: 'Assigned now',
      detail: state.backendRoutingSummaryForLearner(learner),
    );
  }

  final learnerLessons = state.lessonsForLearner(learner);
  if (learnerLessons.any((item) => item.id == lesson.id)) {
    return LearnerLessonAvailability(
      kind: LearnerLessonAvailabilityKind.available,
      label: 'Available',
      detail: state.nextLessonRouteSummaryForLearner(
        learner,
        completedLessonId: lesson.id,
      ),
    );
  }

  return LearnerLessonAvailability(
    kind: LearnerLessonAvailabilityKind.unavailable,
    label: 'Not ready',
    detail: 'No safe start path for this learner on this lesson yet.',
  );
}

Color _learnerAvailabilityColor(LearnerLessonAvailabilityKind kind) {
  switch (kind) {
    case LearnerLessonAvailabilityKind.resumeReady:
      return LumoTheme.primary;
    case LearnerLessonAvailabilityKind.assigned:
      return LumoTheme.accentGreen;
    case LearnerLessonAvailabilityKind.available:
      return LumoTheme.accentOrange;
    case LearnerLessonAvailabilityKind.completedToday:
      return const Color(0xFF0F766E);
    case LearnerLessonAvailabilityKind.absent:
      return const Color(0xFFB45309);
    case LearnerLessonAvailabilityKind.skipped:
      return const Color(0xFF475569);
    case LearnerLessonAvailabilityKind.podMismatch:
      return const Color(0xFF7C3AED);
    case LearnerLessonAvailabilityKind.unavailable:
      return const Color(0xFF64748B);
  }
}

void launchLessonFlow({
  required BuildContext context,
  required LumoAppState state,
  required VoidCallback onChanged,
  required LessonCardModel lesson,
  LearningModule? module,
  BackendLessonSession? resumeFrom,
}) {
  if (lesson.isAssignmentPlaceholder) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Lesson content is still syncing. Refresh the tablet sync before starting this assignment.',
        ),
      ),
    );
    return;
  }

  if (lesson.steps.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          lesson.title.trim().isEmpty
              ? 'This lesson is missing its activity steps. Republish or refresh sync before a learner starts it.'
              : '${lesson.title} is missing its activity steps. Republish or refresh sync before a learner starts it.',
        ),
      ),
    );
    return;
  }

  final targetModule = resolveLessonModule(
    state: state,
    lesson: lesson,
    module: module,
  );

  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => LessonLaunchSetupPage(
        state: state,
        onChanged: onChanged,
        lesson: lesson,
        module: targetModule,
        resumeFrom: resumeFrom,
      ),
    ),
  );
}

List<Widget> _buildOperatorStatusChips(LumoAppState state) {
  return [
    _OperatorStatusChip(
      label: state.operatorSourceLabel,
      color: _operatorStatusColor(state.operatorSourceLabel),
      icon: _operatorStatusIcon(state.operatorSourceLabel),
    ),
    if (state.curriculumSourceLabel != state.operatorSourceLabel)
      _OperatorStatusChip(
        label: state.curriculumSourceLabel,
        color: _operatorStatusColor(state.curriculumSourceLabel),
        icon: _operatorStatusIcon(state.curriculumSourceLabel),
      ),
    if (state.operatorHealthLabel != state.operatorSourceLabel &&
        state.operatorHealthLabel != state.curriculumSourceLabel)
      _OperatorStatusChip(
        label: state.operatorHealthLabel,
        color: _operatorStatusColor(state.operatorHealthLabel),
        icon: _operatorStatusIcon(state.operatorHealthLabel),
      ),
  ];
}

Color _operatorStatusColor(String label) {
  switch (label) {
    case 'Backend link live':
    case 'Curriculum live':
    case 'Backend healthy':
      return LumoTheme.accentGreen;
    case 'Offline pack curriculum':
    case 'Cached curriculum':
    case 'Curriculum mixed':
    case 'Assignments incomplete':
    case 'Sync stale':
      return LumoTheme.accentOrange;
    case 'Backend offline':
    case 'Backend unavailable':
    case 'Curriculum unavailable':
      return const Color(0xFFB91C1C);
    default:
      return LumoTheme.primary;
  }
}

IconData _operatorStatusIcon(String label) {
  switch (label) {
    case 'Backend link live':
    case 'Backend healthy':
      return Icons.cloud_done_rounded;
    case 'Curriculum live':
      return Icons.verified_rounded;
    case 'Offline pack curriculum':
      return Icons.inventory_2_rounded;
    case 'Cached curriculum':
      return Icons.save_rounded;
    case 'Curriculum mixed':
      return Icons.layers_rounded;
    case 'Assignments incomplete':
      return Icons.rule_folder_rounded;
    case 'Sync stale':
      return Icons.sync_problem_rounded;
    case 'Backend offline':
    case 'Backend unavailable':
    case 'Curriculum unavailable':
      return Icons.cloud_off_rounded;
    default:
      return Icons.radar_rounded;
  }
}

class _OperatorStatusChip extends StatelessWidget {
  const _OperatorStatusChip({
    required this.label,
    required this.color,
    required this.icon,
  });

  final String label;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.20)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;

  const HomePage({super.key, required this.state, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final viewportSize = MediaQuery.sizeOf(context);
    final viewportHeight = viewportSize.height;
    final viewportWidth = viewportSize.width;
    final hasSyncWarnings = state.usingFallbackData ||
        state.hasCriticalSyncTrustBlocker ||
        state.registrationBlockerReason != null ||
        state.assignedLessons.any((lesson) => lesson.isAssignmentPlaceholder) ||
        state.lastSyncedAt == null;
    final showTrustBanner = hasSyncWarnings;
    final trustBannerCompact =
        viewportWidth < 900 || viewportHeight <= 840;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LumoTopBar(
                onLogoTap: () {},
                extraChips: _buildOperatorStatusChips(state),
              ),
              if (showTrustBanner) ...[
                const SizedBox(height: 12),
                _HomeTrustBanner(
                  state: state,
                  onChanged: onChanged,
                  compact: trustBannerCompact,
                ),
              ],
              if (state.hasPendingRecoveredSession) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFCD34D)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.history_toggle_off_rounded,
                            color: Color(0xFFB45309),
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Recovered lesson is waiting for live lesson sync.',
                              style: TextStyle(
                                color: Color(0xFF78350F),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        state.pendingRecoveredSessionLabel,
                        style: const TextStyle(
                          color: Color(0xFF92400E),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final compact = constraints.maxWidth < 900;
                    final shortHeight = constraints.maxHeight < 840;
                    final visibleSubjectCount = buildLearnerSubjectCards(
                      state: state,
                    ).length;
                    final denseSubjectLayout =
                        shortHeight && visibleSubjectCount > 3;
                    final mallamStageHeight = denseSubjectLayout
                        ? (compact ? 156.0 : 196.0)
                        : (compact ? 204.0 : 252.0);

                    void openRegister() {
                      final blocker = state.registrationBlockerReason;
                      if (blocker != null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(blocker),
                            backgroundColor: LumoTheme.accentOrange,
                          ),
                        );
                        return;
                      }

                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => RegisterPage(
                            state: state,
                            onChanged: onChanged,
                          ),
                        ),
                      );
                    }

                    void openLearners() {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => AllStudentsPage(
                            state: state,
                            onChanged: onChanged,
                          ),
                        ),
                      );
                    }

                    Widget buildActionPanel() {
                      final registrationBlocked =
                          state.registrationBlockerReason != null;
                      final actions = [
                        _HomeQuickAction(
                          title: registrationBlocked
                              ? 'Registration offline'
                              : 'Register',
                          icon: registrationBlocked
                              ? Icons.sync_problem_rounded
                              : Icons.person_add_alt_1_rounded,
                          color: registrationBlocked
                              ? LumoTheme.accentOrange
                              : LumoTheme.primary,
                          onTap: openRegister,
                        ),
                        _HomeQuickAction(
                          title: 'Student list',
                          icon: Icons.groups_rounded,
                          color: LumoTheme.accentGreen,
                          onTap: openLearners,
                        ),
                      ];

                      return Align(
                        alignment: Alignment.topRight,
                        child: Wrap(
                          spacing: compact ? 12 : 16,
                          runSpacing: 12,
                          alignment: WrapAlignment.end,
                          children: actions,
                        ),
                      );
                    }

                    Widget buildSubjectSection() {
                      final subjectCards = buildLearnerSubjectCards(
                        state: state,
                      );
                      final assignmentGapCount = state.assignedLessons
                          .where((lesson) => lesson.isAssignmentPlaceholder)
                          .length;
                      return Expanded(
                        flex: shortHeight ? 9 : (compact ? 7 : 6),
                        child: Padding(
                          padding: EdgeInsets.only(
                            top: shortHeight ? 2 : (compact ? 8 : 10),
                            left: compact ? 0 : 2,
                            right: compact ? 0 : 2,
                            bottom: shortHeight ? 0 : (compact ? 2 : 4),
                          ),
                          child: LayoutBuilder(
                            builder: (context, subjectConstraints) {
                              if (subjectCards.isEmpty) {
                                final headline = state.isBootstrapping
                                    ? 'Refreshing live subjects for this tablet.'
                                    : 'No live subjects are ready on this tablet yet.';
                                final detail = state
                                            .registrationBlockerReason !=
                                        null
                                    ? '${state.registrationBlockerReason!} Fix the roster feed before expecting learner-ready subjects.'
                                    : assignmentGapCount > 0
                                        ? assignmentGapCount == 1
                                            ? '1 assigned lesson is still only a placeholder. Refresh sync after the publish finishes so learners do not hit a dead-end card.'
                                            : '$assignmentGapCount assigned lessons are still placeholders. Refresh sync after publish finishes so learners do not hit a dead-end card.'
                                        : state.usingFallbackData
                                            ? 'The tablet is running on fallback data and there are still no learner-safe published subjects to show. Refresh live sync before handoff.'
                                            : 'Publish at least one learner-safe subject with live lesson content before handing the tablet to a learner.';

                                return Center(
                                  child: ConstrainedBox(
                                    constraints: const BoxConstraints(
                                      maxWidth: 760,
                                    ),
                                    child: Container(
                                      width: double.infinity,
                                      padding: EdgeInsets.all(
                                        compact ? 18 : 24,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(28),
                                        border: Border.all(
                                          color: const Color(0xFFE2E8F0),
                                        ),
                                        boxShadow: const [
                                          BoxShadow(
                                            color: Color(0x140F172A),
                                            blurRadius: 24,
                                            offset: Offset(0, 14),
                                          ),
                                        ],
                                      ),
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                padding:
                                                    const EdgeInsets.all(12),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFFFF7ED),
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                ),
                                                child: const Icon(
                                                  Icons.menu_book_rounded,
                                                  color: LumoTheme.accentOrange,
                                                ),
                                              ),
                                              const SizedBox(width: 14),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      headline,
                                                      style: const TextStyle(
                                                        fontSize: 24,
                                                        fontWeight:
                                                            FontWeight.w900,
                                                        color:
                                                            Color(0xFF0F172A),
                                                        height: 1.15,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 10),
                                                    Text(
                                                      detail,
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF475569),
                                                        height: 1.5,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 18),
                                          Wrap(
                                            spacing: 12,
                                            runSpacing: 12,
                                            children: [
                                              FilledButton.icon(
                                                onPressed: state.isBootstrapping
                                                    ? null
                                                    : () async {
                                                        await state.bootstrap();
                                                        onChanged();
                                                      },
                                                icon: const Icon(
                                                  Icons.sync_rounded,
                                                ),
                                                label: Text(
                                                  state.isBootstrapping
                                                      ? 'Refreshing live sync…'
                                                      : 'Refresh live sync',
                                                ),
                                              ),
                                              OutlinedButton.icon(
                                                onPressed: openLearners,
                                                icon: const Icon(
                                                  Icons.groups_rounded,
                                                ),
                                                label: const Text(
                                                  'Open student list',
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }

                              final minTileWidth = compact ? 210.0 : 260.0;
                              final crossAxisSpacing = compact ? 10.0 : 14.0;
                              final preferredSingleRowCount = !compact &&
                                      subjectCards.length <= 4 &&
                                      subjectCards.isNotEmpty
                                  ? subjectCards.length
                                  : 0;
                              final singleRowTileWidth =
                                  compact ? 210.0 : 220.0;
                              final shouldForceSingleRowSubjectStrip =
                                  preferredSingleRowCount > 0 &&
                                      subjectConstraints.maxWidth >=
                                          ((singleRowTileWidth *
                                                  preferredSingleRowCount) +
                                              (crossAxisSpacing *
                                                  (preferredSingleRowCount -
                                                      1)));
                              final adaptiveCrossAxisCount = _adaptiveGridCount(
                                subjectConstraints.maxWidth,
                                minTileWidth: minTileWidth,
                                maxCount: shouldForceSingleRowSubjectStrip
                                    ? preferredSingleRowCount
                                    : shortHeight
                                        ? (compact ? 2 : 3)
                                        : 3,
                              );
                              final crossAxisCount =
                                  shouldForceSingleRowSubjectStrip
                                      ? preferredSingleRowCount
                                      : adaptiveCrossAxisCount;

                              final aspectRatio = shortHeight
                                  ? (subjectConstraints.maxWidth < 700
                                      ? 1.48
                                      : subjectConstraints.maxWidth < 1100
                                          ? 1.6
                                          : 1.72)
                                  : (subjectConstraints.maxWidth < 700
                                      ? 1.34
                                      : subjectConstraints.maxWidth < 1100
                                          ? 1.42
                                          : 1.48);

                              final preferredTileWidth = shortHeight
                                  ? (compact ? 214.0 : 292.0)
                                  : (compact ? 248.0 : 360.0);
                              final centeredGridWidth = math.min(
                                subjectConstraints.maxWidth,
                                (crossAxisCount * preferredTileWidth) +
                                    ((crossAxisCount - 1) * crossAxisSpacing),
                              );

                              return Align(
                                alignment: Alignment.topCenter,
                                child: SizedBox(
                                  width: centeredGridWidth,
                                  child: GridView.builder(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    itemCount: subjectCards.length,
                                    primary: false,
                                    physics: const BouncingScrollPhysics(),
                                    shrinkWrap: false,
                                    gridDelegate:
                                        SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: crossAxisCount,
                                      mainAxisSpacing: shortHeight
                                          ? (compact ? 6 : 8)
                                          : (compact ? 12 : 14),
                                      crossAxisSpacing: crossAxisSpacing,
                                      childAspectRatio: aspectRatio,
                                    ),
                                    itemBuilder: (context, index) {
                                      final subject = subjectCards[index];
                                      return _SubjectCard(
                                        module: LearningModule(
                                          id: subject.id,
                                          title: subject.title,
                                          description: subject.description,
                                          voicePrompt: subject.voicePrompt,
                                          readinessGoal: subject.readinessGoal,
                                          badge: subject.badge,
                                          status: subject.module.status,
                                        ),
                                        lessonCount:
                                            subject.availableLessonCount,
                                        compact: false,
                                        onTap: () {
                                          state.selectModule(subject.module);
                                          onChanged();
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) =>
                                                  SubjectModulesPage(
                                                state: state,
                                                onChanged: onChanged,
                                                module: subject.module,
                                                subjectTitle: subject.title,
                                                subjectKey: subject.id,
                                              ),
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      );
                    }

                    return Stack(
                      children: [
                        Align(
                          alignment: Alignment.topCenter,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 980),
                            child: Column(
                              mainAxisAlignment: shortHeight
                                  ? MainAxisAlignment.start
                                  : MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (shortHeight)
                                  Padding(
                                    padding: EdgeInsets.only(
                                      top: 0,
                                      right: compact ? 0 : 8,
                                    ),
                                    child: SizedBox(
                                      height: mallamStageHeight,
                                      child: _HomeMallamStage(state: state),
                                    ),
                                  )
                                else
                                  Expanded(
                                    flex: compact ? 4 : 5,
                                    child: Padding(
                                      padding: EdgeInsets.only(
                                        top: 0,
                                        right: compact ? 0 : 8,
                                      ),
                                      child: _HomeMallamStage(state: state),
                                    ),
                                  ),
                                SizedBox(
                                  height: shortHeight ? 0 : (compact ? 0 : 2),
                                ),
                                buildSubjectSection(),
                              ],
                            ),
                          ),
                        ),
                        buildActionPanel(),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeTrustBanner extends StatelessWidget {
  const _HomeTrustBanner({
    required this.state,
    required this.onChanged,
    this.compact = false,
  });

  final LumoAppState state;
  final VoidCallback onChanged;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final registrationBlocked = state.registrationBlockerReason;
    final assignmentGapCount = state.assignedLessons
        .where((lesson) => lesson.isAssignmentPlaceholder)
        .length;
    final hasPriorityWarning =
        registrationBlocked != null || assignmentGapCount > 0;

    Future<void> refreshTabletSync() async {
      await state.bootstrap();
      onChanged();
    }

    void openRoster() {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => AllStudentsPage(
            state: state,
            onChanged: onChanged,
          ),
        ),
      );
    }

    final compactWarning = registrationBlocked != null
        ? '$registrationBlocked Fix backend reachability first.'
        : assignmentGapCount == 1
            ? '1 assigned lesson is still a placeholder. Refresh sync before launch.'
            : '$assignmentGapCount assigned lessons are still placeholders. Refresh sync before launch.';

    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(compact ? 14 : 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140F172A),
            blurRadius: 24,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.verified_user_rounded, color: LumoTheme.primary),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Tablet trust check',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      hasPriorityWarning
                          ? 'Confirm backend status, roster freshness, and lesson payload health before the next live handoff.'
                          : 'Backend, roster, and assignment payload all look sane enough for the next live lesson handoff.',
                      style: const TextStyle(
                        color: Color(0xFF475569),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (compact) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: state.usingFallbackData
                    ? const Color(0xFFFFF7ED)
                    : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: state.usingFallbackData
                      ? const Color(0xFFFED7AA)
                      : const Color(0xFFBBF7D0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        state.usingFallbackData
                            ? Icons.cloud_off_rounded
                            : Icons.cloud_done_rounded,
                        color: state.usingFallbackData
                            ? const Color(0xFF9A3412)
                            : const Color(0xFF166534),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              state.backendStatusLabel,
                              style: TextStyle(
                                color: state.usingFallbackData
                                    ? const Color(0xFF9A3412)
                                    : const Color(0xFF166534),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              state.rosterFreshnessDetail,
                              style: const TextStyle(
                                color: Color(0xFF475569),
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: state.usingFallbackData
                            ? const Color(0xFFFED7AA)
                            : const Color(0xFFBBF7D0),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.schedule_rounded,
                          size: 18,
                          color: state.usingFallbackData
                              ? const Color(0xFF9A3412)
                              : const Color(0xFF166534),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            state.trustedSyncHeadline,
                            style: TextStyle(
                              color: state.usingFallbackData
                                  ? const Color(0xFF9A3412)
                                  : const Color(0xFF166534),
                              fontWeight: FontWeight.w800,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      StatusPill(
                        text: state.rosterFreshnessLabel,
                        color: state.usingFallbackData
                            ? LumoTheme.accentOrange
                            : LumoTheme.accentGreen,
                      ),
                      StatusPill(
                        text: state.syncQueueLabel,
                        color: state.usingFallbackData
                            ? LumoTheme.accentOrange
                            : LumoTheme.accentGreen,
                      ),
                      StatusPill(
                        text: state.lastSyncSummaryLabel,
                        color: state.usingFallbackData
                            ? LumoTheme.accentOrange
                            : LumoTheme.accentGreen,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (hasPriorityWarning) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Text(
                  compactWarning,
                  style: const TextStyle(
                    color: Color(0xFF9A3412),
                    fontWeight: FontWeight.w700,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ] else ...[
            _BackendStatusBanner(state: state),
            const SizedBox(height: 12),
            _RosterFreshnessBanner(state: state),
            if (hasPriorityWarning) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.sync_problem_rounded,
                            color: Color(0xFF9A3412)),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Pilot blocker to clear on this tablet',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF9A3412),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      registrationBlocked != null
                          ? '$registrationBlocked Fix backend reachability first. Local-only registration is intentionally blocked because it can create sync records the backend does not honor.'
                          : assignmentGapCount == 1
                              ? '1 assigned lesson is still only a placeholder on this tablet. Refresh sync before a learner taps into it, or you are sending them into a pretty dead end.'
                              : '$assignmentGapCount assigned lessons are still placeholders on this tablet. Refresh sync before lesson launch so the live lesson payload actually exists offline.',
                      style: const TextStyle(
                        color: Color(0xFF7C2D12),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: () async {
                  await refreshTabletSync();
                },
                icon: const Icon(Icons.refresh_rounded),
                label: Text(compact ? 'Refresh sync' : 'Refresh live sync'),
              ),
              FilledButton.tonalIcon(
                onPressed: openRoster,
                icon: const Icon(Icons.groups_rounded),
                label: const Text('Review learner roster'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MallamStageShell extends StatelessWidget {
  final String eyebrow;
  final String? title;
  final String? description;
  final Widget child;
  final bool frameless;

  const _MallamStageShell({
    required this.eyebrow,
    this.title,
    this.description,
    required this.child,
    this.frameless = false,
  });

  @override
  Widget build(BuildContext context) {
    final showHeader = title != null || description != null;

    return Container(
      height: double.infinity,
      padding: frameless ? EdgeInsets.zero : const EdgeInsets.all(18),
      decoration: frameless
          ? const BoxDecoration(color: Colors.transparent)
          : BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showHeader) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.82),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    eyebrow,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                      color: LumoTheme.primary,
                    ),
                  ),
                  if (title != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      title!,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        height: 1.1,
                      ),
                    ),
                  ],
                  if (description != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      description!,
                      style: TextStyle(
                        color: Colors.black.withValues(alpha: 0.62),
                        height: 1.45,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 18),
          ],
          Expanded(child: SizedBox.expand(child: child)),
        ],
      ),
    );
  }
}

String _timeAwareMallamGreeting() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'Assalamu alaikum. Good morning.';
  if (hour < 17) return 'Assalamu alaikum. Good afternoon.';
  return 'Assalamu alaikum. Good evening.';
}

String _buildLearnerHumanMoment(LearnerProfile learner) {
  final supportPlan = learner.supportPlan.trim();
  final attendance = learner.lastAttendance.trim();
  final lastLesson = learner.lastLessonSummary.trim();

  if (supportPlan.isNotEmpty) {
    return supportPlan;
  }
  if (attendance.isNotEmpty &&
      attendance.toLowerCase() != 'attendance not captured yet') {
    return attendance;
  }
  if (lastLesson.isNotEmpty &&
      lastLesson.toLowerCase() != 'no lesson captured yet.') {
    return lastLesson;
  }
  return '${learner.name.split(' ').first} is ready for a calm, voice-first check-in.';
}

String _buildHomeMallamReplayPrompt(LumoAppState state) {
  final learner = state.suggestedLearnerForHome;
  final nextLesson = state.nextAssignedLessonForLearner(learner);
  final module =
      learner == null ? null : state.recommendedModuleForLearner(learner);
  final greeting = _timeAwareMallamGreeting();
  final registrationBlocked = state.registrationBlockerReason != null;

  if (learner == null) {
    return registrationBlocked
        ? '$greeting You are on the home page. Registration is blocked until the live backend recovers, so open Student List to review synced learners or choose a subject to continue teaching.'
        : '$greeting You are on the home page. Tap Register to add a learner, Student List to see all learners, or choose a subject to see its lessons.';
  }

  final learnerName = learner.name.split(' ').first;
  final learnerMoment = _buildLearnerHumanMoment(learner);
  if (nextLesson != null) {
    return '$greeting $learnerName is ready for ${nextLesson.title}. $learnerMoment Tap Student List to open learner cards, or open ${module?.title ?? nextLesson.subject} to continue the lesson path.';
  }

  if (module != null) {
    return '$greeting $learnerName is ready to keep learning. $learnerMoment Tap Student List to open learner cards, or choose ${module.title} to keep the next lesson moving.';
  }

  return '$greeting $learnerName is on the home page. $learnerMoment Tap Register to add another learner, Student List to see all learners, or choose a subject to see its lessons.';
}

class _HomeMallamStage extends StatelessWidget {
  final LumoAppState state;

  const _HomeMallamStage({required this.state});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact =
            constraints.maxWidth < 900 || constraints.maxHeight < 500;
        final shortHeight = constraints.maxHeight < 280;
        final learner = state.suggestedLearnerForHome;
        final nextLesson = state.nextAssignedLessonForLearner(learner);
        final module =
            learner == null ? null : state.recommendedModuleForLearner(learner);
        final learnerName = learner?.name.split(' ').first;
        final learnerMoment =
            learner == null ? null : _buildLearnerHumanMoment(learner);
        final showCompactSummary = constraints.maxHeight < 340;
        final showSummaryChips =
            constraints.maxWidth >= 620 && !showCompactSummary;
        final summaryTitle = learnerName == null
            ? 'Mallam is ready to welcome the next learner.'
            : nextLesson != null
                ? 'Mallam is ready for $learnerName\'s next step.'
                : '$learnerName is back on the mat.';
        final summaryBody = showCompactSummary
            ? learnerName == null
                ? 'Register or open Student list, then choose a subject.'
                : nextLesson != null
                    ? 'Open ${module?.title ?? nextLesson.subject} to keep $learnerName moving.'
                    : 'Open ${module?.title ?? 'a subject'} to keep $learnerName learning.'
            : learnerName == null
                ? 'Register a learner or open Student list, then choose a subject to keep the tablet moving.'
                : nextLesson != null
                    ? '$learnerName can jump straight into ${nextLesson.title}. Open ${module?.title ?? nextLesson.subject} to keep the flow calm and continuous.'
                    : 'Open ${module?.title ?? 'a subject'} to keep $learnerName learning without hunting around the tablet.';
        final portraitSize = math.min(
          shortHeight
              ? 176.0
              : compact
                  ? 238.0
                  : 332.0,
          math.max(132.0, constraints.maxHeight - (compact ? 18.0 : 20.0)),
        );

        return Container(
          decoration: const BoxDecoration(
            color: Colors.transparent,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Align(
                  alignment: Alignment.center,
                  child: Image.asset(
                    'assets/images/mallam_tutor_cutout.png',
                    height: portraitSize,
                    fit: BoxFit.contain,
                    alignment: Alignment.center,
                  ),
                ),
              ),
              SizedBox(height: shortHeight ? 10 : (compact ? 14 : 18)),
              FilledButton.tonalIcon(
                onPressed: () {
                  state.replayVisiblePrompt(
                    _buildHomeMallamReplayPrompt(state),
                  );
                },
                icon: const Icon(Icons.volume_up_rounded),
                label: const Text('Hear Mallam again'),
                style: FilledButton.styleFrom(
                  foregroundColor: LumoTheme.primary,
                  backgroundColor: LumoTheme.primary.withValues(alpha: 0.1),
                  padding: EdgeInsets.symmetric(
                    horizontal: compact ? 16 : 18,
                    vertical: compact ? 12 : 14,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                    side: BorderSide(
                      color: LumoTheme.primary.withValues(alpha: 0.14),
                    ),
                  ),
                ),
              ),
              SizedBox(height: shortHeight ? 0 : (compact ? 2 : 4)),
            ],
          ),
        );
      },
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 220),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: LumoTheme.primary),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF334155),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

bool _learnerNeedsBackendSync(LearnerProfile learner) {
  final status = learner.enrollmentStatus.toLowerCase();
  return status.contains('sync') || status.contains('pending');
}

class AllStudentsPage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;

  const AllStudentsPage({
    super.key,
    required this.state,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final leaderboard = buildLearnerLeaderboard(state.learners);
    final topLearner = leaderboard.firstOrNull;
    final unsyncedLearners =
        state.learners.where(_learnerNeedsBackendSync).toList(growable: false);
    final averagePoints = state.learners.isEmpty
        ? 0
        : state.learners
                .map(learnerMotivationPoints)
                .reduce((value, item) => value + item) ~/
            state.learners.length;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, viewportConstraints) {
            final availableWidth = viewportConstraints.maxWidth - 48;
            final crossAxisCount = _adaptiveGridCount(
              availableWidth,
              minTileWidth: 320,
              maxCount: 3,
            );
            final compactLearnerCards = availableWidth < 560;
            final childAspectRatio = availableWidth < 520
                ? 0.8
                : availableWidth < 900
                    ? 0.78
                    : availableWidth < 1280
                        ? 0.92
                        : 1.02;
            final headingWidth = availableWidth < 520 ? availableWidth : 520.0;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  LumoTopBar(
                    onLogoTap: () => Navigator.of(context)
                        .popUntil((route) => route.isFirst),
                    extraChips: _buildOperatorStatusChips(state),
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      SizedBox(
                        width: headingWidth,
                        child: const SectionTitle(
                          title: 'All learners',
                          subtitle:
                              'Cleaner cards, visible progress, and a live points leaderboard so it is obvious who is ready next.',
                        ),
                      ),
                      StatusPill(
                        text: '${state.learners.length} learners',
                        color: LumoTheme.accentGreen,
                      ),
                      StatusPill(
                        text: '$averagePoints avg pts',
                        color: LumoTheme.primary,
                      ),
                      if (topLearner != null)
                        StatusPill(
                          text:
                              '${topLearner.learner.name.split(' ').first} leads • ${topLearner.points} pts',
                          color: LumoTheme.accentOrange,
                        ),
                      if (unsyncedLearners.isNotEmpty)
                        StatusPill(
                          text: '${unsyncedLearners.length} sync pending',
                          color: LumoTheme.accentOrange,
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _BackendStatusBanner(state: state),
                  const SizedBox(height: 12),
                  _RosterFreshnessBanner(state: state),
                  const SizedBox(height: 16),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final stack = constraints.maxWidth < 1100;
                      final leaderboardPanel = _LearnerLeaderboardPanel(
                        leaderboard: leaderboard,
                        currentLearnerId: state.currentLearner?.id,
                      );
                      final coachPanel = SoftPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.tips_and_updates_rounded,
                                    color: LumoTheme.primary),
                                SizedBox(width: 8),
                                Text(
                                  'Pick fast',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 18,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              unsyncedLearners.isNotEmpty
                                  ? '${unsyncedLearners.length} learner ${unsyncedLearners.length == 1 ? 'still needs' : 'still need'} backend sync. Their cards are marked clearly so Mallam does not mistake local-only profiles for confirmed roster records.'
                                  : topLearner == null
                                      ? 'Open any learner card to view rewards, streaks, and assigned lessons.'
                                      : '${topLearner.learner.name} is leading the board right now. Tap Profile for the full reward view or Start assigned to continue momentum.',
                              style: const TextStyle(
                                color: Color(0xFF475569),
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: const [
                                _MiniMetricChip(
                                  icon: Icons.local_fire_department_rounded,
                                  label: 'Streaks stay visible',
                                ),
                                _MiniMetricChip(
                                  icon: Icons.workspace_premium_rounded,
                                  label: 'Points shown on every card',
                                ),
                                _MiniMetricChip(
                                  icon: Icons.play_circle_fill_rounded,
                                  label: 'Start from card actions',
                                ),
                              ],
                            ),
                          ],
                        ),
                      );

                      if (stack) {
                        return Column(
                          children: [
                            leaderboardPanel,
                            const SizedBox(height: 12),
                            coachPanel,
                          ],
                        );
                      }

                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: leaderboardPanel),
                          const SizedBox(width: 12),
                          Expanded(child: coachPanel),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  GridView.builder(
                    shrinkWrap: true,
                    primary: false,
                    physics: const NeverScrollableScrollPhysics(),
                    padding: const EdgeInsets.only(bottom: 12),
                    itemCount: state.learners.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossAxisCount,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 14,
                      childAspectRatio: childAspectRatio,
                    ),
                    itemBuilder: (context, index) {
                      final learner = state.learners[index];
                      final leaderboardEntry = learnerLeaderboardEntryFor(
                        leaderboard,
                        learner.id,
                      );
                      return GestureDetector(
                        onTap: () {
                          state.selectLearner(learner);
                          onChanged();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => LearnerProfilePage(
                                state: state,
                                learner: learner,
                              ),
                            ),
                          );
                        },
                        child: _LearnerCard(
                          learner: learner,
                          state: state,
                          dense: compactLearnerCards,
                          leaderboardEntry: leaderboardEntry,
                          isActive: state.currentLearner?.id == learner.id,
                          onSetActive: () {
                            state.selectLearner(learner);
                            onChanged();
                          },
                          onOpenProfile: () {
                            state.selectLearner(learner);
                            onChanged();
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => LearnerProfilePage(
                                  state: state,
                                  learner: learner,
                                ),
                              ),
                            );
                          },
                          onStartLesson: () {
                            final nextLesson =
                                state.nextAssignedLessonForLearner(learner);
                            if (nextLesson == null) return;
                            state.selectLearner(learner);
                            onChanged();
                            launchLessonFlow(
                              context: context,
                              state: state,
                              onChanged: onChanged,
                              lesson: nextLesson,
                            );
                          },
                        ),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

Uint8List? _decodeProfilePhoto(String? base64Value) {
  if (base64Value == null || base64Value.trim().isEmpty) return null;
  try {
    return base64Decode(base64Value);
  } catch (_) {
    return null;
  }
}

class _DefaultLearnerAvatar extends StatelessWidget {
  const _DefaultLearnerAvatar({this.size = 120});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140F172A),
            blurRadius: 18,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: ClipOval(
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned(
              top: size * 0.16,
              child: Container(
                width: size * 0.44,
                height: size * 0.3,
                decoration: const BoxDecoration(
                  color: Color(0xFF1E293B),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Positioned(
              top: size * 0.24,
              child: Container(
                width: size * 0.4,
                height: size * 0.4,
                decoration: const BoxDecoration(
                  color: Color(0xFFF4C7A1),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Positioned(
              top: size * 0.38,
              left: size * 0.34,
              child: Container(
                  width: size * 0.04,
                  height: size * 0.04,
                  decoration: const BoxDecoration(
                      color: Color(0xFF0F172A), shape: BoxShape.circle)),
            ),
            Positioned(
              top: size * 0.38,
              right: size * 0.34,
              child: Container(
                  width: size * 0.04,
                  height: size * 0.04,
                  decoration: const BoxDecoration(
                      color: Color(0xFF0F172A), shape: BoxShape.circle)),
            ),
            Positioned(
              top: size * 0.48,
              child: Container(
                width: size * 0.12,
                height: size * 0.05,
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Color(0xFF7C2D12), width: 2),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: size * 0.06,
              child: Container(
                width: size * 0.64,
                height: size * 0.34,
                decoration: const BoxDecoration(
                  color: Color(0xFF4F46E5),
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(999)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LearnerAvatar extends StatelessWidget {
  const _LearnerAvatar({required this.photoBase64, this.size = 120});

  final String? photoBase64;
  final double size;

  @override
  Widget build(BuildContext context) {
    final bytes = _decodeProfilePhoto(photoBase64);
    if (bytes == null) {
      return _DefaultLearnerAvatar(size: size);
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x140F172A),
            blurRadius: 18,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: ClipOval(
        child: Image.memory(bytes,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => _DefaultLearnerAvatar(size: size)),
      ),
    );
  }
}

class _LearnerIdentityHero extends StatelessWidget {
  const _LearnerIdentityHero({
    required this.learner,
    required this.totalPoints,
    required this.totalXp,
    required this.totalMinutes,
    required this.leaderboardEntry,
  });

  final LearnerProfile learner;
  final int totalPoints;
  final int totalXp;
  final int totalMinutes;
  final LearnerLeaderboardEntry? leaderboardEntry;

  @override
  Widget build(BuildContext context) {
    return SoftPanel(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 680;
          final avatar = _LearnerAvatar(
            photoBase64: learner.profilePhotoBase64,
            size: compact ? 112 : 136,
          );
          final textBlock = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                learner.name,
                style:
                    const TextStyle(fontSize: 30, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                '${learner.age} years • ${learner.cohort} • ${learner.preferredLanguage}',
                style: const TextStyle(color: Color(0xFF475569), height: 1.4),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusPill(
                      text: learner.readinessLabel, color: LumoTheme.primary),
                  StatusPill(
                      text: '$totalPoints pts', color: LumoTheme.accentGreen),
                  StatusPill(
                      text: '${learner.streakDays} day streak',
                      color: LumoTheme.accentOrange),
                  if (leaderboardEntry != null)
                    StatusPill(
                        text: 'Rank #${leaderboardEntry!.rank}',
                        color: const Color(0xFF0EA5E9)),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                learner.profilePhotoBase64 == null
                    ? 'Default learner avatar is active for now. Add a photo during registration whenever you want. $totalXp XP earned across about $totalMinutes learning minutes so far.'
                    : 'Profile photo captured for this learner. $totalXp XP earned across about $totalMinutes learning minutes so far.',
                style: const TextStyle(color: Color(0xFF64748B), height: 1.4),
              ),
            ],
          );

          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [avatar, const SizedBox(height: 16), textBlock],
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              avatar,
              const SizedBox(width: 20),
              Expanded(child: textBlock)
            ],
          );
        },
      ),
    );
  }
}

class LearnerProfilePage extends StatefulWidget {
  final LumoAppState state;
  final LearnerProfile learner;

  const LearnerProfilePage({
    super.key,
    required this.state,
    required this.learner,
  });

  @override
  State<LearnerProfilePage> createState() => _LearnerProfilePageState();
}

class _LearnerProfilePageState extends State<LearnerProfilePage>
    with RouteAware {
  void _handleStateChanged() {
    if (!mounted) return;
    setState(() {});
  }

  LearnerProfile _resolveLearner() {
    for (final entry in widget.state.learners) {
      if (entry.id == widget.learner.id) return entry;
    }
    if (widget.state.currentLearner?.id == widget.learner.id) {
      return widget.state.currentLearner!;
    }
    return widget.learner;
  }

  @override
  void initState() {
    super.initState();
    widget.state.addListener(_handleStateChanged);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute<dynamic>) {
      lumoRouteObserver.unsubscribe(this);
      lumoRouteObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    widget.state.removeListener(_handleStateChanged);
    lumoRouteObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  void didPopNext() {
    if (!mounted) return;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final learner = _resolveLearner();
    final rewards = learner.rewards;
    final totalXp = learner.totalXp;
    final totalMinutes = learner.estimatedTotalMinutes;
    final totalPoints = learnerMotivationPoints(learner);
    final allAssignedLessons = state.lessonsForLearner(learner);
    final assignedLessons = allAssignedLessons.take(3).toList();
    final hiddenAssignedLessonCount =
        (allAssignedLessons.length - assignedLessons.length).clamp(0, 999);
    final nextLesson = state.nextAssignedLessonForLearner(learner);
    final nextAssignmentPack = state.nextAssignmentPackForLearner(learner);
    final recommendedModule = state.recommendedModuleForLearner(learner);
    final recentSessions = state.recentRuntimeSessionsForLearner(learner);
    final resumableSession = state.resumableRuntimeSessionForLearner(learner);
    final leaderboard = buildLearnerLeaderboard(state.learners);
    final leaderboardEntry =
        learnerLeaderboardEntryFor(leaderboard, learner.id);
    final unlockedBadges =
        rewards?.badges.where((badge) => badge.earned).toList() ?? const [];
    final rewardOptions = state.rewardRedemptionOptionsForLearner(learner);
    final featuredReward = state.featuredRewardForLearner(learner);
    final nearlyUnlockedRewards =
        state.nearlyUnlockedRewardsForLearner(learner);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: DetailCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LayoutBuilder(
                  builder: (context, constraints) {
                    final compactHeader = constraints.maxWidth < 560;
                    if (compactHeader) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Back'),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 10,
                            runSpacing: 10,
                            children: [
                              if (leaderboardEntry != null)
                                StatusPill(
                                  text:
                                      '#${leaderboardEntry.rank} on leaderboard',
                                  color: leaderboardEntry.rank == 1
                                      ? LumoTheme.accentOrange
                                      : LumoTheme.primary,
                                ),
                              StatusPill(
                                  text: learner.enrollmentStatus,
                                  color: LumoTheme.primary),
                            ],
                          ),
                        ],
                      );
                    }

                    return Row(
                      children: [
                        OutlinedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Back'),
                        ),
                        const Spacer(),
                        if (leaderboardEntry != null) ...[
                          StatusPill(
                            text: '#${leaderboardEntry.rank} on leaderboard',
                            color: leaderboardEntry.rank == 1
                                ? LumoTheme.accentOrange
                                : LumoTheme.primary,
                          ),
                          const SizedBox(width: 10),
                        ],
                        StatusPill(
                            text: learner.enrollmentStatus,
                            color: LumoTheme.primary),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _LearnerIdentityHero(
                          learner: learner,
                          totalPoints: totalPoints,
                          totalXp: totalXp,
                          totalMinutes: totalMinutes,
                          leaderboardEntry: leaderboardEntry,
                        ),
                        const SizedBox(height: 18),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final compact = constraints.maxWidth < 640;
                            final tiles = [
                              MetricTile(
                                label: 'Streak',
                                value: '${learner.streakDays} days',
                                icon: Icons.local_fire_department_rounded,
                                color: LumoTheme.accentOrange,
                              ),
                              MetricTile(
                                label: 'Total XP',
                                value: '$totalXp XP',
                                icon: Icons.stars_rounded,
                                color: LumoTheme.primary,
                              ),
                              MetricTile(
                                label: 'Points',
                                value: '$totalPoints pts',
                                icon: Icons.workspace_premium_rounded,
                                color: LumoTheme.accentGreen,
                              ),
                              MetricTile(
                                label: 'Learning time',
                                value: '$totalMinutes min',
                                icon: Icons.schedule_rounded,
                                color: const Color(0xFF0EA5E9),
                              ),
                            ];

                            if (compact) {
                              return Column(
                                children: [
                                  for (var i = 0; i < tiles.length; i++) ...[
                                    SizedBox(
                                        width: double.infinity,
                                        child: tiles[i]),
                                    if (i < tiles.length - 1)
                                      const SizedBox(height: 12),
                                  ],
                                ],
                              );
                            }

                            return Wrap(
                              spacing: 12,
                              runSpacing: 12,
                              children: tiles
                                  .map((tile) => SizedBox(
                                        width: (constraints.maxWidth - 12) / 2,
                                        child: tile,
                                      ))
                                  .toList(),
                            );
                          },
                        ),
                        const SizedBox(height: 18),
                        if (rewards != null) ...[
                          SoftPanel(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.emoji_events_rounded,
                                        color: LumoTheme.accentOrange),
                                    SizedBox(width: 8),
                                    Text(
                                      'Rewards spotlight',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 18),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                LabelValueWrap(
                                  items: [
                                    (
                                      'Level',
                                      '${rewards.levelLabel} • Lv ${rewards.level}'
                                    ),
                                    ('Points', '${rewards.points} points'),
                                    (
                                      'Badges unlocked',
                                      '${unlockedBadges.length} of ${rewards.badges.length}'
                                    ),
                                    (
                                      'Next level',
                                      rewards.nextLevelLabel == null
                                          ? 'Top celebration band'
                                          : '${rewards.xpForNextLevel} XP to ${rewards.nextLevelLabel}',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                LinearProgressIndicator(
                                  value:
                                      rewards.progressToNextLevel.clamp(0, 1),
                                  minHeight: 10,
                                  borderRadius: const BorderRadius.all(
                                      Radius.circular(999)),
                                  color: LumoTheme.accentGreen,
                                  backgroundColor: const Color(0xFFD1FAE5),
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: rewards.badges.isEmpty
                                      ? const [
                                          StatusPill(
                                              text: 'No badges yet',
                                              color: Color(0xFF94A3B8)),
                                        ]
                                      : rewards.badges
                                          .take(6)
                                          .map((badge) => StatusPill(
                                                text: badge.earned
                                                    ? '${badge.icon} ${badge.title}'
                                                    : '${badge.title} ${badge.progress}/${badge.target}',
                                                color: badge.earned
                                                    ? LumoTheme.accentGreen
                                                    : LumoTheme.accentOrange,
                                              ))
                                          .toList(),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                        ],
                        if (rewardOptions.isNotEmpty) ...[
                          _RewardRedemptionPlannerPanel(
                            state: state,
                            learner: learner,
                            summary: state
                                .rewardRedemptionSummaryForLearner(learner),
                            featuredReward: featuredReward,
                            options: rewardOptions,
                            nearlyUnlockedRewards: nearlyUnlockedRewards,
                            history: state
                                .rewardRedemptionHistoryForLearner(learner),
                            spendablePoints:
                                state.spendableRewardPointsForLearner(learner),
                          ),
                          const SizedBox(height: 18),
                        ],
                        if (leaderboard.isNotEmpty) ...[
                          _LearnerLeaderboardPanel(
                            leaderboard: leaderboard.take(5).toList(),
                            currentLearnerId: learner.id,
                            title: 'Points leaderboard',
                            subtitle:
                                'Use this to celebrate progress publicly and keep momentum visible.',
                          ),
                          const SizedBox(height: 18),
                        ],
                        SoftPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Basic information',
                                  style:
                                      TextStyle(fontWeight: FontWeight.w800)),
                              const SizedBox(height: 12),
                              InfoRow(
                                  label: 'Guardian',
                                  value: learner.guardianName),
                              InfoRow(
                                  label: 'Relationship',
                                  value: learner.caregiverRelationship),
                              InfoRow(
                                  label: 'Language',
                                  value: learner.preferredLanguage),
                              InfoRow(
                                  label: 'Readiness',
                                  value: learner.readinessLabel),
                              InfoRow(
                                  label: 'Support plan',
                                  value: learner.supportPlan),
                              InfoRow(
                                  label: 'Last lesson',
                                  value: learner.lastLessonSummary),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        SoftPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Expanded(
                                      child: Text('Backend routing',
                                          style: TextStyle(
                                              fontWeight: FontWeight.w800))),
                                  StatusPill(
                                    text: nextAssignmentPack == null
                                        ? 'Fallback routing'
                                        : 'Live assignment',
                                    color: nextAssignmentPack == null
                                        ? LumoTheme.accentOrange
                                        : LumoTheme.accentGreen,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                state.backendRoutingSummaryForLearner(learner),
                                style: const TextStyle(
                                    color: Color(0xFF475569), height: 1.4),
                              ),
                              const SizedBox(height: 12),
                              InfoRow(
                                  label: 'Recommended subject',
                                  value: recommendedModule.title),
                              if (nextAssignmentPack != null) ...[
                                InfoRow(
                                    label: 'Assigned lesson',
                                    value: nextAssignmentPack.lessonTitle),
                                InfoRow(
                                  label: 'Assessment',
                                  value: nextAssignmentPack.assessmentTitle ??
                                      'No assessment gate',
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        SoftPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Expanded(
                                      child: Text('Recent backend runtime',
                                          style: TextStyle(
                                              fontWeight: FontWeight.w800))),
                                  StatusPill(
                                    text: recentSessions.isEmpty
                                        ? 'Waiting for sync'
                                        : '${recentSessions.length} session(s)',
                                    color: recentSessions.isEmpty
                                        ? LumoTheme.accentOrange
                                        : LumoTheme.accentGreen,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                state.runtimeSessionSummaryForLearner(learner),
                                style: const TextStyle(
                                    color: Color(0xFF475569), height: 1.4),
                              ),
                              if (recentSessions.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                ...recentSessions.take(3).map(
                                      (session) => Container(
                                        width: double.infinity,
                                        margin:
                                            const EdgeInsets.only(bottom: 10),
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF8FAFC),
                                          borderRadius:
                                              BorderRadius.circular(18),
                                          border: Border.all(
                                              color: const Color(0xFFE2E8F0)),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    session.lessonTitle ??
                                                        'Live runtime session',
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      color: Color(0xFF0F172A),
                                                    ),
                                                  ),
                                                ),
                                                StatusPill(
                                                  text: session.statusLabel,
                                                  color: session.status ==
                                                          'completed'
                                                      ? LumoTheme.accentGreen
                                                      : LumoTheme.accentOrange,
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            Text(session.automationStatus,
                                                style: const TextStyle(
                                                    color: Color(0xFF475569),
                                                    height: 1.35)),
                                            const SizedBox(height: 10),
                                            Wrap(
                                              spacing: 10,
                                              runSpacing: 8,
                                              children: [
                                                _MiniMetricChip(
                                                    icon: Icons.route_rounded,
                                                    label:
                                                        session.progressLabel),
                                                _MiniMetricChip(
                                                    icon: Icons
                                                        .record_voice_over_rounded,
                                                    label:
                                                        '${session.responsesCaptured} responses'),
                                                _MiniMetricChip(
                                                    icon: Icons
                                                        .tips_and_updates_rounded,
                                                    label:
                                                        '${session.supportActionsUsed} supports'),
                                              ],
                                            ),
                                            if (session.status ==
                                                'in_progress') ...[
                                              const SizedBox(height: 12),
                                              Align(
                                                alignment: Alignment.centerLeft,
                                                child: FilledButton.tonalIcon(
                                                  onPressed: () {
                                                    final resumeLesson = state
                                                        .lessonForBackendSession(
                                                            session);
                                                    if (resumeLesson == null) {
                                                      ScaffoldMessenger.of(
                                                              context)
                                                          .showSnackBar(
                                                        SnackBar(
                                                          content: Text(
                                                            session.lessonTitle
                                                                        ?.trim()
                                                                        .isNotEmpty ==
                                                                    true
                                                                ? 'Resume is blocked because ${session.lessonTitle} is not loaded on this tablet yet. Sync assignments or open the matching lesson manually.'
                                                                : 'Resume is blocked because the matching lesson is not loaded on this tablet yet. Sync assignments or open the correct lesson manually.',
                                                          ),
                                                        ),
                                                      );
                                                      return;
                                                    }

                                                    launchLessonFlow(
                                                      context: context,
                                                      state: state,
                                                      onChanged: () {},
                                                      lesson: resumeLesson,
                                                      resumeFrom: session,
                                                    );
                                                  },
                                                  icon: const Icon(Icons
                                                      .play_circle_fill_rounded),
                                                  label: const Text(
                                                      'Resume from backend session'),
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        SoftPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Expanded(
                                      child: Text('Assigned lessons',
                                          style: TextStyle(
                                              fontWeight: FontWeight.w800))),
                                  StatusPill(
                                      text: assignedLessons.isEmpty
                                          ? 'None yet'
                                          : hiddenAssignedLessonCount > 0
                                              ? '${assignedLessons.length} of ${allAssignedLessons.length} shown'
                                              : '${assignedLessons.length} shown',
                                      color: assignedLessons.isEmpty
                                          ? const Color(0xFF94A3B8)
                                          : LumoTheme.accentOrange),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                state.assignedLessonSummaryForLearner(learner),
                                style: const TextStyle(
                                    color: Color(0xFF475569), height: 1.4),
                              ),
                              const SizedBox(height: 12),
                              if (nextLesson != null)
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEEF2FF),
                                    borderRadius: BorderRadius.circular(18),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Continue learning',
                                        style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF312E81)),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '${nextLesson.title} • ${nextLesson.durationMinutes} min',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(nextLesson.readinessFocus),
                                      const SizedBox(height: 12),
                                      SizedBox(
                                        width: double.infinity,
                                        child: FilledButton.icon(
                                          onPressed: () {
                                            state.selectLearner(learner);
                                            launchLessonFlow(
                                              context: context,
                                              state: state,
                                              onChanged: () {},
                                              lesson: nextLesson,
                                              resumeFrom: resumableSession,
                                            );
                                          },
                                          icon: Icon(
                                            resumableSession == null
                                                ? Icons.play_arrow_rounded
                                                : Icons
                                                    .play_circle_fill_rounded,
                                          ),
                                          label: Text(
                                            resumableSession == null
                                                ? 'Start assigned lesson'
                                                : 'Resume assigned lesson',
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              if (assignedLessons.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                ...assignedLessons.map(
                                  (lesson) {
                                    final matchesResumableSession =
                                        resumableSession?.lessonId == lesson.id;
                                    return Container(
                                      width: double.infinity,
                                      margin: const EdgeInsets.only(bottom: 10),
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(18),
                                        border: Border.all(
                                            color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                child: Text(lesson.title,
                                                    style: const TextStyle(
                                                        fontWeight:
                                                            FontWeight.w800)),
                                              ),
                                              const SizedBox(width: 12),
                                              StatusPill(
                                                text: lesson
                                                        .isAssignmentPlaceholder
                                                    ? 'Sync first'
                                                    : matchesResumableSession
                                                        ? 'Resume ready'
                                                        : 'Ready',
                                                color: lesson
                                                        .isAssignmentPlaceholder
                                                    ? LumoTheme.accentOrange
                                                    : matchesResumableSession
                                                        ? LumoTheme.primary
                                                        : LumoTheme.accentGreen,
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${lesson.subject} • ${lesson.durationMinutes} min',
                                            style: const TextStyle(
                                                color: Color(0xFF64748B)),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(lesson.scenario,
                                              style: const TextStyle(
                                                  height: 1.35)),
                                          const SizedBox(height: 12),
                                          SizedBox(
                                            width: double.infinity,
                                            child: FilledButton.tonalIcon(
                                              onPressed:
                                                  lesson.isAssignmentPlaceholder
                                                      ? null
                                                      : () {
                                                          state.selectLearner(
                                                              learner);
                                                          launchLessonFlow(
                                                            context: context,
                                                            state: state,
                                                            onChanged: () {},
                                                            lesson: lesson,
                                                            resumeFrom:
                                                                matchesResumableSession
                                                                    ? resumableSession
                                                                    : null,
                                                          );
                                                        },
                                              icon: Icon(
                                                lesson.isAssignmentPlaceholder
                                                    ? Icons.sync_rounded
                                                    : matchesResumableSession
                                                        ? Icons
                                                            .play_circle_fill_rounded
                                                        : Icons
                                                            .open_in_new_rounded,
                                              ),
                                              label: Text(
                                                lesson.isAssignmentPlaceholder
                                                    ? 'Refresh sync before starting'
                                                    : matchesResumableSession
                                                        ? 'Resume lesson'
                                                        : 'Open lesson',
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                                if (hiddenAssignedLessonCount > 0)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      '$hiddenAssignedLessonCount more assigned lesson${hiddenAssignedLessonCount == 1 ? '' : 's'} still available after these quick picks.',
                                      style: const TextStyle(
                                        color: Color(0xFF64748B),
                                        height: 1.35,
                                      ),
                                    ),
                                  ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      final json = const JsonEncoder.withIndent('  ').convert({
                        'learner': {
                          'id': learner.id,
                          'name': learner.name,
                          'learnerCode': learner.learnerCode,
                          'age': learner.age,
                          'cohort': learner.cohort,
                          'guardianName': learner.guardianName,
                          'preferredLanguage': learner.preferredLanguage,
                          'readinessLabel': learner.readinessLabel,
                          'streakDays': learner.streakDays,
                          'points': totalPoints,
                          'totalXp': totalXp,
                          'attendanceBand': learner.attendanceBand,
                          'enrollmentStatus': learner.enrollmentStatus,
                          'lastLessonSummary': learner.lastLessonSummary,
                        },
                      });
                      await ClipboardBridge.copy(json);
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Learner data copied. Hook file export next if needed.',
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.download_rounded),
                    label: const Text('Download data'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SubjectModulesPage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;
  final LearningModule module;
  final String subjectTitle;
  final String subjectKey;

  SubjectModulesPage({
    super.key,
    required this.state,
    required this.onChanged,
    required this.module,
    String? subjectTitle,
    String? subjectKey,
  })  : subjectTitle = subjectTitle ??
            _resolvedSubjectTitleForModule(
              state: state,
              module: module,
              learner: state.currentLearner,
            ),
        subjectKey = subjectKey ??
            _resolvedSubjectKeyForModule(
              state: state,
              module: module,
              learner: state.currentLearner,
            );

  LessonCardModel? _resolveHighlightedLesson(List<LessonCardModel> lessons) {
    if (lessons.isEmpty) return null;

    final currentLearner = state.currentLearner;
    if (currentLearner != null) {
      final learnerPreferred =
          state.nextAssignedLessonForLearner(currentLearner);
      if (learnerPreferred != null) {
        final inSubjectMatch = lessons.cast<LessonCardModel?>().firstWhere(
              (lesson) => lesson?.id == learnerPreferred.id,
              orElse: () => null,
            );
        if (inSubjectMatch != null) return inSubjectMatch;
      }

      for (final lesson in lessons) {
        final availability = learnerLessonAvailability(
          state: state,
          learner: currentLearner,
          lesson: lesson,
        );
        if (availability.kind == LearnerLessonAvailabilityKind.resumeReady ||
            availability.kind == LearnerLessonAvailabilityKind.assigned ||
            availability.kind == LearnerLessonAvailabilityKind.available) {
          return lesson;
        }
      }
    }

    for (final kind in const [
      LearnerLessonAvailabilityKind.resumeReady,
      LearnerLessonAvailabilityKind.assigned,
      LearnerLessonAvailabilityKind.available,
    ]) {
      for (final lesson in lessons) {
        final learners = state.availableLearnersForLesson(lesson);
        final matchingLearner = learners.cast<LearnerProfile?>().firstWhere(
              (learner) =>
                  learner != null &&
                  learnerLessonAvailability(
                        state: state,
                        learner: learner,
                        lesson: lesson,
                      ).kind ==
                      kind,
              orElse: () => null,
            );
        if (matchingLearner != null) return lesson;
      }
    }

    return lessons.cast<LessonCardModel?>().firstWhere(
          (lesson) => lesson != null && !lesson.isAssignmentPlaceholder,
          orElse: () => lessons.first,
        );
  }

  @override
  Widget build(BuildContext context) {
    final scopedLearner = state.currentLearner;
    final lessons = state
        .lessonsForLearnerAndSubject(scopedLearner, subjectKey)
        .where((lesson) {
      if (!_isLearnerVisibleLesson(state: state, lesson: lesson)) {
        return false;
      }
      if (scopedLearner != null) {
        return learnerLessonAvailability(
          state: state,
          learner: scopedLearner,
          lesson: lesson,
        ).canLaunch;
      }
      return state.availableLearnersForLesson(lesson).isNotEmpty;
    }).toList();
    final nextAssignedLesson = _resolveHighlightedLesson(lessons);
    final registrationBlocked = state.registrationBlockerReason;
    final usingFallbackData = state.usingFallbackData;
    final highlightedLesson = lessons.cast<LessonCardModel?>().firstWhere(
          (lesson) => lesson?.id == nextAssignedLesson?.id,
          orElse: () => lessons.cast<LessonCardModel?>().firstWhere(
                (lesson) => lesson != null && !lesson.isAssignmentPlaceholder,
                orElse: () => lessons.isNotEmpty ? lessons.first : null,
              ),
        );

    void openLesson(LessonCardModel lesson) {
      if (lesson.isAssignmentPlaceholder) return;
      state.selectModule(module);
      onChanged();
      launchLessonFlow(
        context: context,
        state: state,
        onChanged: onChanged,
        lesson: lesson,
        module: module,
      );
    }

    Future<void> refreshTabletSync() async {
      await state.bootstrap();
      onChanged();
    }

    void openRoster() {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => AllStudentsPage(
            state: state,
            onChanged: onChanged,
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _LearnerBackAffordance(
                label: 'Back to subjects',
                onPressed: () => Navigator.of(context).pop(),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _ResponsiveWorkspaceRow(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ResponsivePane(
                      flex: 5,
                      child: _MallamStageShell(
                        eyebrow: 'Mallam',
                        frameless: true,
                        child: MallamPanel(
                          instruction: modulesInstruction,
                          onVoiceTap: () {
                            state.replayVisiblePrompt(
                              'You opened $subjectTitle. Start with the next lesson bubble, then follow the lesson path one step at a time.',
                            );
                          },
                          prompt:
                              'You opened $subjectTitle. Choose a lesson in this subject, then start with the learner who is taking it.',
                          speakerMode: SpeakerMode.guiding,
                          statusLabel: 'Mallam leads the lesson',
                          secondaryStatus: 'Lesson path guide',
                          voiceButtonLabel: 'Hear Mallam again',
                          centerPortraitLayout: true,
                          minimalStageLayout: true,
                          framelessStage: true,
                          framelessPortrait: true,
                        ),
                      ),
                    ),
                    const SizedBox(width: 20),
                    ResponsivePane(
                      flex: 5,
                      child: DetailCard(
                        child: LayoutBuilder(
                          builder: (context, detailConstraints) {
                            final compact = detailConstraints.maxWidth < 380;

                            Widget buildJourneyPath() {
                              if (lessons.isEmpty) {
                                final emptyStateMessage = registrationBlocked !=
                                        null
                                    ? '$registrationBlocked Refresh live sync before reopening $subjectTitle so the learner-safe lesson path can load.'
                                    : usingFallbackData
                                        ? 'This tablet is still leaning on fallback content and $subjectTitle does not have a learner-safe lesson path yet. Refresh live sync before handing it over.'
                                        : '$subjectTitle is visible, but its learner-safe lesson path has not landed on this tablet yet. Refresh live sync or reopen the student list before launch.';

                                return SoftPanel(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'No learner-safe lessons are ready in $subjectTitle yet.',
                                        style: const TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        emptyStateMessage,
                                        style: const TextStyle(
                                          color: Color(0xFF475569),
                                          height: 1.5,
                                          fontSize: 15,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      Wrap(
                                        spacing: 12,
                                        runSpacing: 12,
                                        children: [
                                          FilledButton.icon(
                                            onPressed: () async {
                                              await refreshTabletSync();
                                            },
                                            icon:
                                                const Icon(Icons.sync_rounded),
                                            label: const Text(
                                              'Refresh live sync',
                                            ),
                                          ),
                                          OutlinedButton.icon(
                                            onPressed: openRoster,
                                            icon: const Icon(
                                              Icons.groups_rounded,
                                            ),
                                            label: const Text(
                                              'Open student list',
                                            ),
                                          ),
                                          TextButton.icon(
                                            onPressed: () =>
                                                Navigator.of(context).pop(),
                                            icon: const Icon(
                                              Icons.arrow_back_rounded,
                                            ),
                                            label: const Text(
                                              'Back to subjects',
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              }

                              const showJourneyHeader = true;
                              const journeyHint =
                                  'Start with the first lesson card, then choose which available learner is taking it before the lesson begins.';

                              return Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFF),
                                  borderRadius: BorderRadius.circular(28),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (showJourneyHeader) ...[
                                      const Text(
                                        'Available lessons',
                                        style: TextStyle(
                                          fontSize: 30,
                                          fontWeight: FontWeight.w900,
                                          height: 1.05,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        journeyHint,
                                        style: const TextStyle(
                                          color: Color(0xFF475569),
                                          height: 1.45,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                    ],
                                    Wrap(
                                      spacing: compact ? 18 : 22,
                                      runSpacing: compact ? 22 : 26,
                                      children: [
                                        for (var i = 0; i < lessons.length; i++)
                                          _LessonJourneyStepCard(
                                            lesson: lessons[i],
                                            index: i,
                                            highlightedLessonId:
                                                highlightedLesson?.id,
                                            nextLessonId:
                                                nextAssignedLesson?.id,
                                            onTap: lessons[i]
                                                    .isAssignmentPlaceholder
                                                ? null
                                                : () => openLesson(lessons[i]),
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }

                            final content = buildJourneyPath();

                            return SingleChildScrollView(child: content);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LearnerBackAffordance extends StatelessWidget {
  const _LearnerBackAffordance({
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(999),
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.94),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x120F172A),
                  blurRadius: 18,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  size: 18,
                  color: Color(0xFF0F172A),
                ),
                const SizedBox(width: 10),
                Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LessonJourneyStepCard extends StatelessWidget {
  final LessonCardModel lesson;
  final int index;
  final String? highlightedLessonId;
  final String? nextLessonId;
  final VoidCallback? onTap;

  const _LessonJourneyStepCard({
    required this.lesson,
    required this.index,
    required this.highlightedLessonId,
    required this.nextLessonId,
    this.onTap,
  });

  static const List<IconData> _icons = [
    Icons.menu_book_rounded,
    Icons.calculate_rounded,
    Icons.record_voice_over_rounded,
    Icons.auto_stories_rounded,
    Icons.extension_rounded,
    Icons.lightbulb_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    final isHighlighted = highlightedLessonId == lesson.id;
    final isNext = nextLessonId == lesson.id;
    final syncPending = lesson.isAssignmentPlaceholder;
    final palette = _paletteFor(index,
        syncPending: syncPending, emphasized: isHighlighted || isNext);
    final labelColor =
        syncPending ? const Color(0xFF92400E) : const Color(0xFF0F172A);

    return SizedBox(
      width: 170,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(26),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 108,
                  height: 108,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: palette,
                    ),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.92),
                      width: 4,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: palette.first.withValues(alpha: 0.28),
                        blurRadius: 18,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Icon(
                          _icons[index % _icons.length],
                          size: 38,
                          color: Colors.white,
                        ),
                      ),
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.22),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  lesson.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                    color: labelColor,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  syncPending
                      ? 'Waiting for sync'
                      : isNext
                          ? 'Start next lesson'
                          : isHighlighted
                              ? 'Ready now'
                              : '${lesson.steps.length} steps · ${lesson.durationMinutes} min',
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.35,
                    color: syncPending
                        ? const Color(0xFFB45309)
                        : isNext || isHighlighted
                            ? palette.first
                            : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Color> _paletteFor(int index,
      {required bool syncPending, required bool emphasized}) {
    if (syncPending) {
      return const [Color(0xFFF59E0B), Color(0xFFFCD34D)];
    }

    const palettes = [
      [Color(0xFF6D5EF8), Color(0xFF8B7FFF)],
      [Color(0xFFFF8A5B), Color(0xFFFFB067)],
      [Color(0xFF10B981), Color(0xFF34D399)],
      [Color(0xFF0EA5E9), Color(0xFF38BDF8)],
      [Color(0xFFEF5DA8), Color(0xFFF472B6)],
      [Color(0xFFF97316), Color(0xFFFBBF24)],
    ];

    final colors = palettes[index % palettes.length];
    if (!emphasized) return colors;
    return [
      Color.lerp(colors[0], Colors.white, 0.08)!,
      Color.lerp(colors[1], Colors.white, 0.02)!,
    ];
  }
}

class _LessonJourneyConnector extends StatelessWidget {
  final Axis direction;

  const _LessonJourneyConnector({required this.direction});

  @override
  Widget build(BuildContext context) {
    final line = Container(
      width: direction == Axis.horizontal ? 40 : 4,
      height: direction == Axis.horizontal ? 4 : 28,
      decoration: BoxDecoration(
        color: const Color(0xFFC7D2FE),
        borderRadius: BorderRadius.circular(999),
      ),
    );

    return Padding(
      padding: direction == Axis.horizontal
          ? const EdgeInsets.symmetric(horizontal: 8)
          : const EdgeInsets.symmetric(vertical: 8),
      child: Center(child: line),
    );
  }
}

class RegisterPage extends StatefulWidget {
  final LumoAppState state;
  final VoidCallback onChanged;

  const RegisterPage({
    super.key,
    required this.state,
    required this.onChanged,
  });

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  late final TextEditingController nameController;
  late final TextEditingController ageController;
  late final TextEditingController cohortController;
  late final TextEditingController guardianController;
  late final TextEditingController villageController;
  late final TextEditingController guardianPhoneController;
  late final TextEditingController supportPlanController;
  late String preferredLanguage;
  late String readinessLabel;
  late String sex;
  late String baselineLevel;
  late String caregiverRelationship;
  late bool consentCaptured;
  late String selectedMallamId;
  String? profilePhotoBase64;
  final ImagePicker _imagePicker = ImagePicker();

  RegistrationDraft _routingHydratedDraft(RegistrationDraft draft) {
    final context = widget.state.registrationContext;
    final defaultTarget = context.defaultTarget;

    final currentCohort = draft.cohort.trim();
    final currentMallamId = draft.mallamId.trim();

    final resolvedCohort = currentCohort.isNotEmpty
        ? currentCohort
        : defaultTarget?.cohort.name ?? currentCohort;
    final resolvedMallamId = currentMallamId.isNotEmpty
        ? currentMallamId
        : defaultTarget?.mallam.id ?? currentMallamId;

    if (resolvedCohort == draft.cohort && resolvedMallamId == draft.mallamId) {
      return draft;
    }

    final nextDraft = draft.copyWith(
      cohort: resolvedCohort,
      mallamId: resolvedMallamId,
    );
    widget.state.updateDraft(nextDraft);
    return nextDraft;
  }

  void _syncRoutingDefaultsFromState() {
    final hydratedDraft = _routingHydratedDraft(widget.state.registrationDraft);

    if (cohortController.text != hydratedDraft.cohort) {
      cohortController.text = hydratedDraft.cohort;
    }
    if (selectedMallamId != hydratedDraft.mallamId) {
      selectedMallamId = hydratedDraft.mallamId;
    }
  }

  @override
  void initState() {
    super.initState();
    final draft = _routingHydratedDraft(widget.state.registrationDraft);
    nameController = TextEditingController(text: draft.name);
    ageController = TextEditingController(text: draft.age);
    cohortController = TextEditingController(text: draft.cohort);
    guardianController = TextEditingController(text: draft.guardianName);
    villageController = TextEditingController(text: draft.village);
    guardianPhoneController = TextEditingController(text: draft.guardianPhone);
    supportPlanController = TextEditingController(text: draft.supportPlan);
    preferredLanguage = draft.preferredLanguage;
    readinessLabel = draft.readinessLabel;
    sex = draft.sex;
    baselineLevel = draft.baselineLevel;
    caregiverRelationship = draft.caregiverRelationship;
    consentCaptured = draft.consentCaptured;
    selectedMallamId = draft.mallamId;
    profilePhotoBase64 = draft.profilePhotoBase64;
  }

  @override
  void dispose() {
    nameController.dispose();
    ageController.dispose();
    cohortController.dispose();
    guardianController.dispose();
    villageController.dispose();
    guardianPhoneController.dispose();
    supportPlanController.dispose();
    super.dispose();
  }

  void syncDraft() {
    widget.state.updateDraft(
      RegistrationDraft(
        name: nameController.text,
        age: ageController.text,
        cohort: cohortController.text,
        guardianName: guardianController.text,
        preferredLanguage: preferredLanguage,
        readinessLabel: readinessLabel,
        village: villageController.text,
        guardianPhone: guardianPhoneController.text,
        sex: sex,
        baselineLevel: baselineLevel,
        consentCaptured: consentCaptured,
        caregiverRelationship: caregiverRelationship,
        supportPlan: supportPlanController.text,
        profilePhotoBase64: profilePhotoBase64,
        mallamId: selectedMallamId,
      ),
    );
  }

  Future<void> _captureProfilePhoto() async {
    try {
      final photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
        maxWidth: 1200,
      );
      if (photo == null) return;
      final bytes = await photo.readAsBytes();
      if (!mounted) return;
      setState(() {
        profilePhotoBase64 = base64Encode(bytes);
        syncDraft();
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Photo capture could not start. Check that camera access is allowed for Lumo on this tablet, or skip for now and use the default avatar. $error',
          ),
        ),
      );
    }
  }

  void _removeProfilePhoto() {
    setState(() {
      profilePhotoBase64 = null;
      syncDraft();
    });
  }

  @override
  Widget build(BuildContext context) {
    _syncRoutingDefaultsFromState();

    final draft = RegistrationDraft(
      name: nameController.text,
      age: ageController.text,
      cohort: cohortController.text,
      guardianName: guardianController.text,
      preferredLanguage: preferredLanguage,
      readinessLabel: readinessLabel,
      village: villageController.text,
      guardianPhone: guardianPhoneController.text,
      sex: sex,
      baselineLevel: baselineLevel,
      consentCaptured: consentCaptured,
      caregiverRelationship: caregiverRelationship,
      supportPlan: supportPlanController.text,
      profilePhotoBase64: profilePhotoBase64,
      mallamId: selectedMallamId,
    );
    final recommendedModule = widget.state.recommendedModuleForDraft;
    final registrationTarget = widget.state.registrationTargetForDraft;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ResponsivePane(
                flex: 5,
                child: _MallamStageShell(
                  eyebrow: 'Mallam',
                  title: 'Guide registration from here',
                  description:
                      'Mallam stays full-height on the left while the facilitator completes the learner intake on the right.',
                  frameless: true,
                  child: MallamPanel(
                    instruction: registrationInstruction,
                    onVoiceTap: () {
                      syncDraft();
                      widget.state.replayVisiblePrompt(
                        'You are on the registration page. Fill in the learner details, capture consent, then save the learner profile.',
                      );
                      setState(() {});
                    },
                    prompt:
                        'You are on the registration page. Fill in the learner details, capture consent, then save the learner profile.',
                    speakerMode: SpeakerMode.guiding,
                    statusLabel: 'Mallam is guiding registration',
                    secondaryStatus: 'Registration guide',
                    voiceButtonLabel: 'Hear Mallam again',
                    voiceHint:
                        'Keep Mallam visible and dominant on this screen so the facilitator can finish intake without losing the voice guide.',
                    centerPortraitLayout: true,
                    framelessStage: true,
                    framelessPortrait: true,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              ResponsivePane(
                flex: 5,
                child: DetailCard(
                  child: LayoutBuilder(
                    builder: (context, cardConstraints) {
                      final compactCard = cardConstraints.maxWidth < 560 ||
                          cardConstraints.maxHeight < 900;

                      final formBody = Column(
                        children: [
                          TextField(
                            controller: nameController,
                            onChanged: (_) => setState(syncDraft),
                            decoration: const InputDecoration(
                              labelText: 'Learner name',
                            ),
                          ),
                          const SizedBox(height: 12),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final compact = constraints.maxWidth < 720;
                              final backendCohorts =
                                  widget.state.registrationContext.cohorts;
                              final cohortValue =
                                  cohortController.text.trim().isEmpty
                                      ? null
                                      : cohortController.text.trim();
                              final fields = [
                                TextField(
                                  controller: ageController,
                                  keyboardType: TextInputType.number,
                                  onChanged: (_) => setState(syncDraft),
                                  decoration: const InputDecoration(
                                    labelText: 'Age',
                                  ),
                                ),
                                backendCohorts.isEmpty
                                    ? TextField(
                                        controller: cohortController,
                                        onChanged: (_) => setState(syncDraft),
                                        decoration: const InputDecoration(
                                          labelText: 'Cohort',
                                        ),
                                      )
                                    : DropdownButtonFormField<String>(
                                        isExpanded: true,
                                        initialValue: backendCohorts.any(
                                          (cohort) =>
                                              cohort.name == cohortValue,
                                        )
                                            ? cohortValue
                                            : null,
                                        items: backendCohorts
                                            .map(
                                              (cohort) => DropdownMenuItem(
                                                value: cohort.name,
                                                child: Text(cohort.name),
                                              ),
                                            )
                                            .toList(),
                                        onChanged: (value) {
                                          if (value == null) return;
                                          setState(() {
                                            cohortController.text = value;
                                            syncDraft();
                                          });
                                        },
                                        decoration: const InputDecoration(
                                          labelText: 'Backend cohort',
                                        ),
                                      ),
                              ];

                              if (compact) {
                                return Column(
                                  children: [
                                    for (var i = 0; i < fields.length; i++) ...[
                                      SizedBox(
                                        width: double.infinity,
                                        child: fields[i],
                                      ),
                                      if (i < fields.length - 1)
                                        const SizedBox(height: 12),
                                    ],
                                  ],
                                );
                              }

                              return Row(
                                children: [
                                  for (var i = 0; i < fields.length; i++) ...[
                                    Expanded(child: fields[i]),
                                    if (i < fields.length - 1)
                                      const SizedBox(width: 12),
                                  ],
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                          Builder(
                            builder: (context) {
                              final mallams =
                                  widget.state.registrationContext.mallams;
                              final hasSelectedMallam = mallams.any(
                                (mallam) => mallam.id == selectedMallamId,
                              );

                              if (mallams.isEmpty) {
                                return const SizedBox.shrink();
                              }

                              return DropdownButtonFormField<String>(
                                isExpanded: true,
                                initialValue:
                                    hasSelectedMallam ? selectedMallamId : null,
                                items: mallams
                                    .map(
                                      (mallam) => DropdownMenuItem(
                                        value: mallam.id,
                                        child: Text(mallam.name),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (value) {
                                  if (value == null) return;
                                  setState(() {
                                    selectedMallamId = value;
                                    syncDraft();
                                  });
                                },
                                decoration: const InputDecoration(
                                  labelText: 'Assign mallam',
                                  helperText:
                                      'Choose the mallam responsible for this learner.',
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: guardianController,
                            onChanged: (_) => setState(syncDraft),
                            decoration: const InputDecoration(
                              labelText: 'Caregiver / facilitator name',
                            ),
                          ),
                          const SizedBox(height: 12),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final compact = constraints.maxWidth < 720;
                              final fields = [
                                DropdownButtonFormField<String>(
                                  isExpanded: true,
                                  initialValue: caregiverRelationship,
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'Mother',
                                      child: Text('Mother'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Father',
                                      child: Text('Father'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Aunt',
                                      child: Text('Aunt'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Uncle',
                                      child: Text('Uncle'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Guardian',
                                      child: Text('Guardian'),
                                    ),
                                  ],
                                  onChanged: (value) {
                                    if (value == null) return;
                                    setState(() {
                                      caregiverRelationship = value;
                                      syncDraft();
                                    });
                                  },
                                  decoration: const InputDecoration(
                                    labelText: 'Relationship',
                                  ),
                                ),
                                TextField(
                                  controller: guardianPhoneController,
                                  keyboardType: TextInputType.phone,
                                  onChanged: (_) => setState(syncDraft),
                                  decoration: const InputDecoration(
                                    labelText: 'Guardian phone',
                                  ),
                                ),
                              ];

                              if (compact) {
                                return Column(
                                  children: [
                                    for (var i = 0; i < fields.length; i++) ...[
                                      SizedBox(
                                        width: double.infinity,
                                        child: fields[i],
                                      ),
                                      if (i < fields.length - 1)
                                        const SizedBox(height: 12),
                                    ],
                                  ],
                                );
                              }

                              return Row(
                                children: [
                                  for (var i = 0; i < fields.length; i++) ...[
                                    Expanded(child: fields[i]),
                                    if (i < fields.length - 1)
                                      const SizedBox(width: 12),
                                  ],
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: villageController,
                            onChanged: (_) => setState(syncDraft),
                            decoration: const InputDecoration(
                              labelText: 'Village / area',
                            ),
                          ),
                          const SizedBox(height: 12),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final compact = constraints.maxWidth < 720;
                              final fields = [
                                DropdownButtonFormField<String>(
                                  isExpanded: true,
                                  initialValue: sex,
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'Boy',
                                      child: Text('Boy'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Girl',
                                      child: Text('Girl'),
                                    ),
                                  ],
                                  onChanged: (value) {
                                    if (value == null) return;
                                    setState(() {
                                      sex = value;
                                      syncDraft();
                                    });
                                  },
                                  decoration: const InputDecoration(
                                    labelText: 'Sex',
                                  ),
                                ),
                                DropdownButtonFormField<String>(
                                  isExpanded: true,
                                  initialValue: baselineLevel,
                                  items: const [
                                    DropdownMenuItem(
                                      value: 'No prior exposure',
                                      child: Text('No prior exposure'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Can repeat with support',
                                      child: Text('Can repeat with support'),
                                    ),
                                    DropdownMenuItem(
                                      value: 'Answers with short sentences',
                                      child: Text(
                                        'Answers with short sentences',
                                      ),
                                    ),
                                  ],
                                  onChanged: (value) {
                                    if (value == null) return;
                                    setState(() {
                                      baselineLevel = value;
                                      syncDraft();
                                    });
                                  },
                                  decoration: const InputDecoration(
                                    labelText: 'Baseline',
                                  ),
                                ),
                              ];

                              if (compact) {
                                return Column(
                                  children: [
                                    for (var i = 0; i < fields.length; i++) ...[
                                      SizedBox(
                                        width: double.infinity,
                                        child: fields[i],
                                      ),
                                      if (i < fields.length - 1)
                                        const SizedBox(height: 12),
                                    ],
                                  ],
                                );
                              }

                              return Row(
                                children: [
                                  for (var i = 0; i < fields.length; i++) ...[
                                    Expanded(child: fields[i]),
                                    if (i < fields.length - 1)
                                      const SizedBox(width: 12),
                                  ],
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            isExpanded: true,
                            initialValue: preferredLanguage,
                            items: const [
                              DropdownMenuItem(
                                value: 'Hausa',
                                child: Text('Hausa'),
                              ),
                              DropdownMenuItem(
                                value: 'Hausa + English',
                                child: Text('Hausa + English'),
                              ),
                              DropdownMenuItem(
                                value: 'English',
                                child: Text('English'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value == null) return;
                              setState(() {
                                preferredLanguage = value;
                                syncDraft();
                              });
                            },
                            decoration: const InputDecoration(
                              labelText: 'Preferred language',
                            ),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            isExpanded: true,
                            initialValue: readinessLabel,
                            items: const [
                              DropdownMenuItem(
                                value: 'Voice-first beginner',
                                child: Text('Voice-first beginner'),
                              ),
                              DropdownMenuItem(
                                value: 'Ready for guided practice',
                                child: Text('Ready for guided practice'),
                              ),
                              DropdownMenuItem(
                                value: 'Confident responder',
                                child: Text('Confident responder'),
                              ),
                            ],
                            onChanged: (value) {
                              if (value == null) return;
                              setState(() {
                                readinessLabel = value;
                                syncDraft();
                              });
                            },
                            decoration: const InputDecoration(
                              labelText: 'Readiness level',
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: supportPlanController,
                            maxLines: 3,
                            onChanged: (_) => setState(syncDraft),
                            decoration: const InputDecoration(
                              labelText: 'Support plan for first lessons',
                              hintText:
                                  'Use short prompts, pause for think time, and praise every clear answer.',
                            ),
                          ),
                          const SizedBox(height: 18),
                          CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            value: consentCaptured,
                            onChanged: (value) {
                              setState(() {
                                consentCaptured = value ?? false;
                                syncDraft();
                              });
                            },
                            title: const Text(
                              'Consent captured for learner profile and voice session',
                            ),
                            subtitle: const Text(
                              'Required before save and backend sync.',
                            ),
                            controlAffinity: ListTileControlAffinity.leading,
                          ),
                          const SizedBox(height: 8),
                          _RegistrationReadinessStrip(draft: draft),
                          const SizedBox(height: 18),
                          SoftPanel(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Photo capture (optional)',
                                  style: TextStyle(fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Take a learner photo now or skip it. If you skip, Lumo uses the default kid avatar on a white background.',
                                  style: TextStyle(
                                      color: Color(0xFF475569), height: 1.4),
                                ),
                                const SizedBox(height: 14),
                                LayoutBuilder(
                                  builder: (context, constraints) {
                                    final compactPhotoRow =
                                        constraints.maxWidth < 420;
                                    final avatar = _LearnerAvatar(
                                      photoBase64: profilePhotoBase64,
                                      size: 88,
                                    );
                                    final photoSummary = Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          profilePhotoBase64 == null
                                              ? 'No photo captured yet'
                                              : 'Photo captured and ready for this learner',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          profilePhotoBase64 == null
                                              ? 'This step is optional.'
                                              : 'You can retake it or remove it before saving.',
                                          style: const TextStyle(
                                            color: Color(0xFF64748B),
                                            height: 1.4,
                                          ),
                                        ),
                                      ],
                                    );

                                    if (compactPhotoRow) {
                                      return Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          avatar,
                                          const SizedBox(height: 14),
                                          photoSummary,
                                        ],
                                      );
                                    }

                                    return Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                      children: [
                                        avatar,
                                        const SizedBox(width: 14),
                                        Expanded(child: photoSummary),
                                      ],
                                    );
                                  },
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  children: [
                                    FilledButton.tonalIcon(
                                      onPressed: _captureProfilePhoto,
                                      icon: const Icon(
                                          Icons.photo_camera_rounded),
                                      label: Text(profilePhotoBase64 == null
                                          ? 'Take photo'
                                          : 'Retake photo'),
                                    ),
                                    if (profilePhotoBase64 != null)
                                      OutlinedButton.icon(
                                        onPressed: _removeProfilePhoto,
                                        icon: const Icon(
                                            Icons.delete_outline_rounded),
                                        label: const Text('Use default avatar'),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final compact = constraints.maxWidth < 760;
                              final panels = [
                                SoftPanel(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Placement snapshot',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      InfoRow(
                                        label: 'Learner code',
                                        value: draft.learnerCode,
                                      ),
                                      InfoRow(
                                        label: 'Language',
                                        value: preferredLanguage,
                                      ),
                                      InfoRow(
                                        label: 'Readiness',
                                        value: readinessLabel,
                                      ),
                                      InfoRow(
                                        label: 'Recommended start',
                                        value: recommendedModule.title,
                                      ),
                                    ],
                                  ),
                                ),
                                SoftPanel(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Backend readiness',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      InfoRow(
                                        label: 'Missing before save',
                                        value: draft.missingFields.isEmpty
                                            ? 'Nothing blocking this intake'
                                            : draft.missingFields.join(', '),
                                      ),
                                      InfoRow(
                                        label: 'Backend target',
                                        value: widget
                                            .state.registrationTargetSummary,
                                      ),
                                      if (registrationTarget != null)
                                        InfoRow(
                                          label: 'Assigned pod',
                                          value:
                                              registrationTarget.cohort.podId,
                                        ),
                                      if (registrationTarget != null)
                                        InfoRow(
                                          label: 'Assigned mallam',
                                          value: registrationTarget.mallam.name,
                                        ),
                                    ],
                                  ),
                                ),
                              ];

                              if (compact) {
                                return Column(
                                  children: [
                                    for (var i = 0; i < panels.length; i++) ...[
                                      SizedBox(
                                        width: double.infinity,
                                        child: panels[i],
                                      ),
                                      if (i < panels.length - 1)
                                        const SizedBox(height: 12),
                                    ],
                                  ],
                                );
                              }

                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  for (var i = 0; i < panels.length; i++) ...[
                                    Expanded(child: panels[i]),
                                    if (i < panels.length - 1)
                                      const SizedBox(width: 12),
                                  ],
                                ],
                              );
                            },
                          ),
                        ],
                      );

                      final registrationBlocker =
                          widget.state.registrationBlockerReason;
                      final saveButton = SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: draft.isValid &&
                                  widget.state.canRegisterLearner
                              ? () async {
                                  syncDraft();
                                  setState(() {});
                                  try {
                                    final learner =
                                        await widget.state.registerLearner();
                                    if (!context.mounted) return;
                                    widget.onChanged();
                                    Navigator.of(context).pushReplacement(
                                      MaterialPageRoute(
                                        builder: (_) => RegistrationSuccessPage(
                                          state: widget.state,
                                          learner: learner,
                                          onChanged: widget.onChanged,
                                        ),
                                      ),
                                    );
                                  } on StateError catch (error) {
                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(error.message),
                                        backgroundColor: LumoTheme.accentOrange,
                                      ),
                                    );
                                    setState(() {});
                                  }
                                }
                              : null,
                          child: Text(widget.state.isRegisteringLearner
                              ? 'Saving learner...'
                              : registrationBlocker == null
                                  ? 'Save learner'
                                  : 'Backend required to save learner'),
                        ),
                      );

                      if (compactCard) {
                        return SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                spacing: 12,
                                runSpacing: 12,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  OutlinedButton(
                                    onPressed: () =>
                                        Navigator.of(context).pop(),
                                    child: const Text('Cancel'),
                                  ),
                                  StatusPill(
                                    text: draft.isValid
                                        ? 'Ready to save'
                                        : 'Needs details',
                                    color: draft.isValid
                                        ? LumoTheme.accentGreen
                                        : LumoTheme.accentOrange,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),
                              const SectionTitle(
                                title: 'Register learner',
                                subtitle:
                                    'Capture a fast intake, then save the learner profile.',
                              ),
                              const SizedBox(height: 18),
                              _BackendStatusBanner(state: widget.state),
                              if (registrationBlocker != null) ...[
                                const SizedBox(height: 18),
                                _RegistrationBlockerBanner(
                                  message: registrationBlocker,
                                ),
                              ],
                              const SizedBox(height: 18),
                              _ProgressMeter(score: draft.completionScore),
                              const SizedBox(height: 18),
                              formBody,
                              const SizedBox(height: 18),
                              saveButton,
                            ],
                          ),
                        );
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              OutlinedButton(
                                onPressed: () => Navigator.of(context).pop(),
                                child: const Text('Cancel'),
                              ),
                              const Spacer(),
                              StatusPill(
                                text: draft.isValid
                                    ? 'Ready to save'
                                    : 'Needs details',
                                color: draft.isValid
                                    ? LumoTheme.accentGreen
                                    : LumoTheme.accentOrange,
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          const SectionTitle(
                            title: 'Register learner',
                            subtitle:
                                'Capture a fast intake, then save the learner profile.',
                          ),
                          const SizedBox(height: 18),
                          _BackendStatusBanner(state: widget.state),
                          if (registrationBlocker != null) ...[
                            const SizedBox(height: 18),
                            _RegistrationBlockerBanner(
                              message: registrationBlocker,
                            ),
                          ],
                          const SizedBox(height: 18),
                          _ProgressMeter(score: draft.completionScore),
                          const SizedBox(height: 18),
                          Expanded(
                            child: SingleChildScrollView(
                              child: formBody,
                            ),
                          ),
                          const SizedBox(height: 18),
                          saveButton,
                        ],
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RegistrationBlockerBanner extends StatelessWidget {
  final String message;

  const _RegistrationBlockerBanner({
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.sync_problem_rounded,
                color: Color(0xFF9A3412),
              ),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Registration blocked until live backend recovers',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF9A3412),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '$message Saving a learner locally here would create a sync contract the backend does not currently honor, which is how you end up with a poisoned queue and fake progress.',
            style: const TextStyle(
              color: Color(0xFF7C2D12),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class RegistrationSuccessPage extends StatelessWidget {
  final LumoAppState state;
  final LearnerProfile learner;
  final VoidCallback onChanged;

  const RegistrationSuccessPage({
    super.key,
    required this.state,
    required this.learner,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final recommendedModule = state.recommendedModuleForLearner(learner);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760),
              child: DetailCard(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircleAvatar(
                      radius: 40,
                      backgroundColor: Color(0xFFDCFCE7),
                      child: Icon(
                        Icons.person_add_alt_1_rounded,
                        color: Colors.green,
                        size: 42,
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      '${learner.name} is ready for Lumo.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Profile posted to the backend and added to the learner list.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    _BackendStatusBanner(state: state),
                    const SizedBox(height: 20),
                    LabelValueWrap(
                      items: [
                        ('Learner', learner.name),
                        ('Language', learner.preferredLanguage),
                        ('Readiness', learner.readinessLabel),
                        ('Learner code', learner.learnerCode),
                        ('Recommended start', recommendedModule.title),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _ResponsiveButtonRow(
                      primary: FilledButton(
                        onPressed: () {
                          final nextLesson =
                              state.nextAssignedLessonForLearner(learner);
                          state.selectLearner(learner);
                          state.selectModule(recommendedModule);
                          onChanged();
                          if (nextLesson != null) {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => LessonLaunchSetupPage(
                                  state: state,
                                  onChanged: onChanged,
                                  lesson: nextLesson,
                                  module: recommendedModule,
                                ),
                              ),
                            );
                            return;
                          }
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => SubjectModulesPage(
                                state: state,
                                onChanged: onChanged,
                                module: recommendedModule,
                              ),
                            ),
                          );
                        },
                        child: Text(
                          state.nextAssignedLessonForLearner(learner) == null
                              ? 'Open subject'
                              : 'Start assigned lesson',
                        ),
                      ),
                      secondary: OutlinedButton(
                        onPressed: () => Navigator.of(context)
                            .popUntil((route) => route.isFirst),
                        child: const Text('Back home'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LessonLaunchSetupPage extends StatefulWidget {
  final LumoAppState state;
  final VoidCallback onChanged;
  final LessonCardModel lesson;
  final LearningModule module;
  final BackendLessonSession? resumeFrom;

  const LessonLaunchSetupPage({
    super.key,
    required this.state,
    required this.onChanged,
    required this.lesson,
    required this.module,
    this.resumeFrom,
  });

  @override
  State<LessonLaunchSetupPage> createState() => _LessonLaunchSetupPageState();
}

class _LessonLaunchSetupPageState extends State<LessonLaunchSetupPage> {
  LearnerProfile? selectedLearner;

  LessonCardModel? _resolveSyncedLessonReplacement() {
    final normalizedTitle = widget.lesson.title.trim().toLowerCase();
    final normalizedModuleId = widget.module.id.trim().toLowerCase();

    final candidates = widget.state.assignedLessons
        .where((lesson) => !lesson.isAssignmentPlaceholder)
        .toList(growable: false);

    if (normalizedTitle.isNotEmpty) {
      final exactTitleMatch = candidates.where((lesson) {
        return lesson.title.trim().toLowerCase() == normalizedTitle;
      }).toList(growable: false);
      if (exactTitleMatch.length == 1) {
        return exactTitleMatch.first;
      }

      final titleWithinModule = exactTitleMatch.where((lesson) {
        return normalizedModuleId.isNotEmpty &&
            lesson.moduleId.trim().toLowerCase() == normalizedModuleId;
      }).toList(growable: false);
      if (titleWithinModule.length == 1) {
        return titleWithinModule.first;
      }
    }

    if (normalizedModuleId.isEmpty) return null;

    final moduleMatches = candidates.where((lesson) {
      return lesson.moduleId.trim().toLowerCase() == normalizedModuleId;
    }).toList(growable: false);

    return moduleMatches.length == 1 ? moduleMatches.first : null;
  }

  Future<void> _refreshSyncPendingLesson() async {
    await widget.state.bootstrap();
    widget.onChanged();
    if (!mounted) return;

    final replacementLesson = _resolveSyncedLessonReplacement();
    if (replacementLesson != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => LessonLaunchSetupPage(
            state: widget.state,
            onChanged: widget.onChanged,
            lesson: replacementLesson,
            module: widget.module,
            resumeFrom: widget.resumeFrom,
          ),
        ),
      );
      return;
    }

    setState(() {});
    final message = widget.state.backendError == null
        ? 'Sync refreshed, but the full lesson payload still has not arrived on this tablet yet.'
        : 'Sync failed: ${widget.state.backendError}';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  LearnerProfile? get _resumeLearner {
    final resumeFrom = widget.resumeFrom;
    if (resumeFrom == null) return null;

    for (final learner in widget.state.learners) {
      if (learner.id == resumeFrom.studentId) {
        return learner;
      }
    }

    return null;
  }

  bool get _resumeLocksLearner => widget.resumeFrom != null;

  LearnerProfile? _preferredLaunchLearner() {
    final resumeLearner = _resumeLearner;
    if (resumeLearner != null) return resumeLearner;

    return null;
  }

  @override
  void initState() {
    super.initState();
    selectedLearner = _preferredLaunchLearner();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final lesson = widget.lesson;
    final resumeLearner = _resumeLearner;
    final resumeMissingLearner =
        widget.resumeFrom != null && resumeLearner == null;
    final syncPendingLesson = lesson.isAssignmentPlaceholder;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1320),
              child: LayoutBuilder(
                builder: (context, viewportConstraints) {
                  final useCompactLayout = viewportConstraints.maxWidth < 760 ||
                      viewportConstraints.maxHeight < 900;

                  Widget buildLearnerGrid({required bool shrinkWrap}) {
                    final learnerChoices = state.learners.where((learner) {
                      return state.learnerMatchesTabletPod(learner) ||
                          (_resumeLocksLearner &&
                              resumeLearner != null &&
                              learner.id == resumeLearner.id);
                    }).toList(growable: false);
                    final launchableLearnerCount = learnerChoices
                        .where(
                          (learner) => learnerLessonAvailability(
                            state: state,
                            learner: learner,
                            lesson: lesson,
                          ).canLaunch,
                        )
                        .length;
                    if (launchableLearnerCount == 0) {
                      final registrationBlocker =
                          state.registrationBlockerReason;

                      return Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 560),
                          child: SoftPanel(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(
                                      Icons.person_off_rounded,
                                      color: LumoTheme.accentOrange,
                                    ),
                                    SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'No learners available for this lesson yet',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 20,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  registrationBlocker == null
                                      ? 'No learner on this tablet is currently available for ${lesson.title}. Check pod assignment, refresh sync, or register the learner that should take this lesson so the handoff stays clean.'
                                      : 'You cannot start ${lesson.title} because no eligible learner has landed on this tablet yet and registration is currently blocked. ${registrationBlocker.trim()} Refresh live sync first so the learner roster lands before launch.',
                                  style: const TextStyle(
                                    color: Color(0xFF475569),
                                    height: 1.45,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton.icon(
                                    onPressed: registrationBlocker == null
                                        ? () {
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => RegisterPage(
                                                  state: state,
                                                  onChanged: widget.onChanged,
                                                ),
                                              ),
                                            );
                                          }
                                        : state.isBootstrapping
                                            ? null
                                            : () async {
                                                await state.bootstrap();
                                                widget.onChanged();
                                                if (!mounted) return;
                                                setState(() {});
                                              },
                                    icon: Icon(
                                      registrationBlocker == null
                                          ? Icons.person_add_alt_1_rounded
                                          : Icons.sync_rounded,
                                    ),
                                    label: Text(
                                      registrationBlocker == null
                                          ? 'Register first learner'
                                          : state.isBootstrapping
                                              ? 'Refreshing live sync…'
                                              : 'Refresh live sync',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }

                    return LayoutBuilder(
                      builder: (context, constraints) {
                        final crossAxisCount = _adaptiveGridCount(
                          constraints.maxWidth,
                          minTileWidth: 280,
                          maxCount: 4,
                        );

                        final mainAxisExtent = constraints.maxWidth < 760
                            ? 310.0
                            : constraints.maxWidth < 1180
                                ? 326.0
                                : 340.0;

                        return GridView.builder(
                          padding: const EdgeInsets.only(bottom: 12),
                          itemCount: learnerChoices.length,
                          shrinkWrap: shrinkWrap,
                          physics: shrinkWrap
                              ? const NeverScrollableScrollPhysics()
                              : null,
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossAxisCount,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            mainAxisExtent: mainAxisExtent,
                          ),
                          itemBuilder: (context, index) {
                            final learner = learnerChoices[index];
                            final availability = learnerLessonAvailability(
                              state: state,
                              learner: learner,
                              lesson: lesson,
                            );
                            final isSelected =
                                selectedLearner?.id == learner.id;
                            final isLockedOut = (_resumeLocksLearner &&
                                    resumeLearner != null &&
                                    learner.id != resumeLearner.id) ||
                                !availability.canLaunch;
                            return Opacity(
                              opacity: isLockedOut ? 0.58 : 1,
                              child: GestureDetector(
                                onTap: isLockedOut
                                    ? null
                                    : () {
                                        setState(() {
                                          selectedLearner = learner;
                                        });
                                      },
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(28),
                                    border: Border.all(
                                      color: isSelected
                                          ? LumoTheme.primary
                                          : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: Stack(
                                    children: [
                                      Positioned.fill(
                                        child: _LearnerCard(
                                          learner: learner,
                                          state: state,
                                          dense: true,
                                          isActive: isSelected,
                                        ),
                                      ),
                                      Positioned(
                                        top: 12,
                                        right: 12,
                                        child: StatusPill(
                                          text: availability.label,
                                          color: _learnerAvailabilityColor(
                                            availability.kind,
                                          ),
                                        ),
                                      ),
                                      Positioned(
                                        left: 12,
                                        right: 12,
                                        bottom: 12,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 10,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(
                                              alpha: 0.95,
                                            ),
                                            borderRadius:
                                                BorderRadius.circular(16),
                                            border: Border.all(
                                              color: const Color(0xFFE2E8F0),
                                            ),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                learner.podLabel ??
                                                    learner.cohort,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: Color(0xFF1E3A8A),
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 12,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                availability.detail,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: Color(0xFF475569),
                                                  height: 1.3,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        );
                      },
                    );
                  }

                  final contentChildren = <Widget>[
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        OutlinedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Back'),
                        ),
                        StatusPill(
                          text: lesson.subject,
                          color: LumoTheme.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFEEF2FF), Color(0xFFFFFFFF)],
                        ),
                        borderRadius: BorderRadius.circular(26),
                        border: Border.all(color: const Color(0xFFC7D2FE)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _resumeLocksLearner
                                ? 'Resume learner'
                                : 'Select available learner',
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              height: 1.1,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            syncPendingLesson
                                ? '${lesson.title} is still waiting for the real lesson payload to sync to this tablet. Keep the assignment visible, but do not start runtime until the full lesson content lands.'
                                : _resumeLocksLearner
                                    ? 'Resume ${lesson.title} with the original learner from the backend session. Changing learners here would corrupt progress attribution, so this selection is locked.'
                                    : 'Pick which available learner is taking ${lesson.title}. Shared-tablet handoff happens here so the lesson starts under the right learner.',
                            style: const TextStyle(
                              color: Color(0xFF475569),
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              StatusPill(
                                text: '${lesson.steps.length} steps',
                                color: LumoTheme.primary,
                              ),
                              StatusPill(
                                text: '${lesson.durationMinutes} min',
                                color: LumoTheme.accentOrange,
                              ),
                              StatusPill(
                                text: lesson.readinessFocus,
                                color: LumoTheme.accentGreen,
                              ),
                              StatusPill(
                                text:
                                    '${state.availableLearnersForLesson(lesson).length} learners ready',
                                color: const Color(0xFF7C3AED),
                              ),
                              if (state.tabletPodLabel?.trim().isNotEmpty ==
                                  true)
                                StatusPill(
                                  text: state.tabletPodLabel!,
                                  color: const Color(0xFF0EA5E9),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (syncPendingLesson)
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF7ED),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: const Color(0xFFFED7AA),
                          ),
                        ),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Lesson content not available yet. Refresh the tablet sync or publish the linked lesson payload before a learner starts this assignment.',
                              style: TextStyle(
                                color: Color(0xFF9A3412),
                                fontWeight: FontWeight.w700,
                                height: 1.35,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Select learner to continue',
                              style: TextStyle(
                                color: Color(0xFF9A3412),
                                fontWeight: FontWeight.w600,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (widget.resumeFrom != null)
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: resumeMissingLearner
                              ? const Color(0xFFFEF2F2)
                              : const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: resumeMissingLearner
                                ? const Color(0xFFFECACA)
                                : const Color(0xFFC7D2FE),
                          ),
                        ),
                        child: Text(
                          resumeMissingLearner
                              ? 'Resume blocked: the original learner for this backend session is not available on this tablet yet. Sync that learner before reopening the session.'
                              : 'Resume ready from ${widget.resumeFrom!.progressLabel.toLowerCase()} for ${resumeLearner!.name}. This learner is locked so the session cannot be resumed under the wrong child.',
                          style: TextStyle(
                            color: resumeMissingLearner
                                ? const Color(0xFF991B1B)
                                : const Color(0xFF312E81),
                            fontWeight: FontWeight.w600,
                            height: 1.35,
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                    if (selectedLearner != null) ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              color: LumoTheme.primary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                (() {
                                  final availability =
                                      learnerLessonAvailability(
                                    state: state,
                                    learner: selectedLearner!,
                                    lesson: lesson,
                                  );
                                  if (_resumeLocksLearner) {
                                    return '${selectedLearner!.name} is locked for this resume session.';
                                  }
                                  return '${selectedLearner!.name} is selected for ${lesson.title}. ${availability.label}.';
                                })(),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                            ),
                            if (!_resumeLocksLearner)
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    selectedLearner = null;
                                  });
                                },
                                child: const Text('Clear'),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ];

                  final selectedAvailability = selectedLearner == null
                      ? null
                      : learnerLessonAvailability(
                          state: state,
                          learner: selectedLearner!,
                          lesson: lesson,
                        );

                  final ctaButton = FilledButton.icon(
                    onPressed: syncPendingLesson
                        ? () async {
                            await _refreshSyncPendingLesson();
                          }
                        : state.availableLearnersForLesson(lesson).isEmpty ||
                                resumeMissingLearner ||
                                selectedAvailability?.canLaunch != true
                            ? null
                            : () {
                                final learner = selectedLearner!;
                                state.selectLearner(learner);
                                state.selectModule(widget.module);
                                widget.onChanged();
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => LessonCountdownPage(
                                      state: state,
                                      onChanged: widget.onChanged,
                                      learner: learner,
                                      lesson: lesson,
                                      resumeFrom: selectedAvailability
                                              ?.resumableSession ??
                                          widget.resumeFrom,
                                    ),
                                  ),
                                );
                              },
                    icon: Icon(
                      _resumeLocksLearner
                          ? Icons.play_circle_fill_rounded
                          : Icons.play_arrow_rounded,
                    ),
                    label: Text(
                      syncPendingLesson
                          ? 'Refresh sync before starting'
                          : state.availableLearnersForLesson(lesson).isEmpty
                              ? 'No learner ready on this tablet'
                              : resumeMissingLearner
                                  ? 'Sync learner to resume'
                                  : selectedLearner == null
                                      ? 'Select learner to continue'
                                      : _resumeLocksLearner ||
                                              selectedAvailability?.kind ==
                                                  LearnerLessonAvailabilityKind
                                                      .resumeReady
                                          ? 'Resume with ${selectedLearner!.name}'
                                          : 'Start with ${selectedLearner!.name}',
                    ),
                  );

                  final absentButton = OutlinedButton.icon(
                    onPressed: selectedLearner == null || _resumeLocksLearner
                        ? null
                        : () async {
                            final learner = selectedLearner!;
                            await state.markLearnerAbsentForLesson(
                              learner,
                              lesson,
                            );
                            widget.onChanged();
                            if (!mounted) return;
                            setState(() {
                              selectedLearner = null;
                            });
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  '${learner.name} marked absent for ${lesson.title}.',
                                ),
                              ),
                            );
                          },
                    icon: const Icon(Icons.event_busy_rounded),
                    label: Text(
                      selectedLearner == null
                          ? 'Select learner for absent'
                          : 'Absent: ${selectedLearner!.name}',
                    ),
                  );

                  if (useCompactLayout) {
                    return SingleChildScrollView(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ...contentChildren,
                          buildLearnerGrid(shrinkWrap: true),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: [ctaButton, absentButton],
                          ),
                        ],
                      ),
                    );
                  }

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ...contentChildren,
                      Expanded(child: buildLearnerGrid(shrinkWrap: false)),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [ctaButton, absentButton],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LessonCountdownPage extends StatefulWidget {
  final LumoAppState state;
  final VoidCallback onChanged;
  final LearnerProfile learner;
  final LessonCardModel lesson;
  final BackendLessonSession? resumeFrom;

  const LessonCountdownPage({
    super.key,
    required this.state,
    required this.onChanged,
    required this.learner,
    required this.lesson,
    this.resumeFrom,
  });

  @override
  State<LessonCountdownPage> createState() => _LessonCountdownPageState();
}

class _LessonCountdownPageState extends State<LessonCountdownPage> {
  Timer? _timer;
  int _secondsRemaining = 3;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsRemaining <= 1) {
        timer.cancel();
        _openLesson();
        return;
      }
      setState(() {
        _secondsRemaining -= 1;
      });
    });
  }

  void _openLesson() {
    if (_navigated) return;
    _navigated = true;
    widget.state.selectLearner(widget.learner);

    try {
      widget.state.startLesson(widget.lesson, resumeFrom: widget.resumeFrom);
    } on StateError catch (error) {
      _navigated = false;
      final message = error.message.toString().trim();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            message.isNotEmpty
                ? message
                : 'This lesson is not ready to open yet. Refresh sync and try again.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.of(context).maybePop();
      return;
    }

    widget.onChanged();
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => LessonSessionPage(
          state: widget.state,
          lesson: widget.lesson,
          onChanged: widget.onChanged,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final actionLabel = widget.resumeFrom == null ? 'Starting' : 'Resuming';
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: DetailCard(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 124,
                      height: 124,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFEEF2FF), Color(0xFFEDE9FE)],
                        ),
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.hourglass_top_rounded,
                        size: 56,
                        color: LumoTheme.primary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      '$actionLabel ${widget.lesson.title}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${widget.learner.name} is confirmed. Mallam is getting the lesson ready.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      width: 110,
                      height: 110,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEEF2FF),
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$_secondsRemaining',
                        style: const TextStyle(
                          fontSize: 44,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF312E81),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Lesson begins in about 3 seconds',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _openLesson,
                        child: const Text('Start now'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LessonSessionPage extends StatefulWidget {
  final LumoAppState state;
  final LessonCardModel lesson;
  final VoidCallback onChanged;

  const LessonSessionPage({
    super.key,
    required this.state,
    required this.lesson,
    required this.onChanged,
  });

  @override
  State<LessonSessionPage> createState() => _LessonSessionPageState();
}

class _LessonSessionPageState extends State<LessonSessionPage>
    with WidgetsBindingObserver {
  late final TextEditingController responseController;
  late final AudioCaptureService audioCaptureService;
  late final LearnerAudioPlaybackService learnerAudioPlaybackService;
  late final SpeechTranscriptionService speechTranscriptionService;
  late final BrowserRuntimeObserver browserRuntimeObserver;
  StreamSubscription<BrowserRuntimeSignal>? _browserRuntimeSubscription;
  Timer? recordingTicker;
  Timer? _speechAutoStopDebounce;
  bool isRecording = false;
  bool isAutoMode = true;
  bool isSpeaking = false;
  bool isProcessingTranscript = false;
  Duration currentRecordingDuration = Duration.zero;
  String? microphoneStatus;
  String liveTranscript = '';
  bool speechRecognitionActive = false;
  bool transcriptCapturedThisTake = false;
  bool transcriptReviewPending = false;
  String? _transcriptAutoAdvanceSafetyReason;
  bool _promptedCurrentStep = false;
  bool _resumedSession = false;
  bool _resumePromptPendingFromLifecycle = false;
  String _latestFinalTranscript = '';
  String _lastPersistedResponseDraft = '';
  bool _capturedStableFinalTranscript = false;
  bool _latestTranscriptNeedsManualReview = false;
  String _recordingModeLabel = 'Standard recorder';
  int _consecutiveTranscriptMisses = 0;
  bool _autoPausedByTranscriptFailure = false;
  bool _transcriptStrategyExpanded = false;
  String? _savedAudioPlaybackError;
  AudioPermissionState _micPermissionState = AudioPermissionState.unknown;

  static const Duration _kMinimumUsefulRecording = Duration(milliseconds: 900);

  String _bestVisibleLearnerText(LessonSessionState? session) {
    if (session == null) return '';
    final explicit = session.latestLearnerResponse?.trim() ?? '';
    if (explicit.isNotEmpty) return explicit;

    final learnerNames = <String>{
      'learner',
      if (widget.state.currentLearner?.name.trim().isNotEmpty ?? false)
        widget.state.currentLearner!.name.trim().toLowerCase(),
      if (widget.state.currentLearner?.name.trim().isNotEmpty ?? false)
        widget.state.currentLearner!.name
            .trim()
            .toLowerCase()
            .split(RegExp(r'\s+'))
            .first,
    };

    for (final turn in session.transcript.reversed) {
      final text = turn.text.trim();
      if (text.isEmpty) continue;
      final normalizedText = text.toLowerCase();
      if (normalizedText.startsWith('voice captured locally')) {
        continue;
      }
      final speaker = turn.speaker.trim().toLowerCase();
      if (learnerNames.contains(speaker)) {
        return text;
      }
    }
    return '';
  }

  void _rebindVisibleLearnerEvidence({bool preserveManualEdits = true}) {
    final session = widget.state.activeSession;
    if (session == null) return;

    final visibleLearnerText = _bestVisibleLearnerText(session);
    final hasDraftResponse = visibleLearnerText.isNotEmpty;
    final hasSavedAudio =
        session.latestLearnerAudioPath?.trim().isNotEmpty ?? false;
    final currentDraft = responseController.text.trim();
    final canReplaceDraft = !preserveManualEdits ||
        currentDraft.isEmpty ||
        currentDraft == _latestFinalTranscript.trim() ||
        currentDraft == liveTranscript.trim();

    if (hasDraftResponse &&
        canReplaceDraft &&
        currentDraft != visibleLearnerText) {
      responseController.value = TextEditingValue(
        text: visibleLearnerText,
        selection: TextSelection.collapsed(offset: visibleLearnerText.length),
      );
    }

    _lastPersistedResponseDraft = responseController.text;
    _latestFinalTranscript = hasDraftResponse ? visibleLearnerText : '';
    liveTranscript = hasDraftResponse ? visibleLearnerText : '';
    _resumedSession = session.totalResponses > 0 || session.stepIndex > 0;
    transcriptReviewPending = hasDraftResponse || hasSavedAudio;
    if (hasSavedAudio) {
      isAutoMode = false;
      _latestTranscriptNeedsManualReview = hasDraftResponse;
    }
    microphoneStatus = hasSavedAudio
        ? 'We picked up ${widget.lesson.title} with the learner voice saved. Listen once, then keep going from here.'
        : hasDraftResponse
            ? 'We picked up ${widget.lesson.title} with a draft answer ready. Check it once, then keep going.'
            : _resumedSession
                ? 'Back in ${widget.lesson.title}, step ${session.stepIndex + 1}. ${session.automationStatus}'
                : session.automationStatus;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    responseController = TextEditingController()
      ..addListener(_persistActiveResponseDraft);
    audioCaptureService = AudioCaptureService();
    learnerAudioPlaybackService = LearnerAudioPlaybackService();
    speechTranscriptionService = SpeechTranscriptionService();
    browserRuntimeObserver = createBrowserRuntimeObserver();

    if (widget.state.activeSession != null) {
      _rebindVisibleLearnerEvidence(preserveManualEdits: false);
    }
    _transcriptStrategyExpanded = _shouldExpandTranscriptStrategyByDefault;

    _primeDiagnostics();
    _browserRuntimeSubscription =
        browserRuntimeObserver.signals.listen(_handleBrowserRuntimeSignal);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_hasRecoveredLearnerEvidence) return;
      _speakCurrentStepIfNeeded(force: true);
    });
  }

  @override
  void didUpdateWidget(covariant LessonSessionPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    final session = widget.state.activeSession;
    if (session == null) return;

    final visibleLearnerText = _bestVisibleLearnerText(session);
    final currentDraft = responseController.text.trim();
    final sessionIdChanged =
        oldWidget.state.activeSession?.sessionId != session.sessionId;
    final staleVisibleDraft = currentDraft.isEmpty ||
        currentDraft == _latestFinalTranscript.trim() ||
        currentDraft == liveTranscript.trim();
    if (sessionIdChanged ||
        (visibleLearnerText.isNotEmpty &&
            staleVisibleDraft &&
            currentDraft != visibleLearnerText)) {
      _rebindVisibleLearnerEvidence();
    }
  }

  void _persistActiveResponseDraft() {
    final draft = responseController.text;
    if (draft == _lastPersistedResponseDraft) return;
    _lastPersistedResponseDraft = draft;
    widget.state.updateCurrentStepLearnerDraft(draft);
  }

  Future<void> _primeDiagnostics() async {
    final permission = await audioCaptureService.inspectPermissionState();
    final transcriptReady = await speechTranscriptionService.initialize();
    if (!mounted) return;
    setState(() {
      _micPermissionState = permission;
      if (!transcriptReady && microphoneStatus == null) {
        microphoneStatus = speechTranscriptionService.availabilityLabel;
      }
    });
  }

  bool get _micPermissionGranted =>
      _micPermissionState == AudioPermissionState.granted;

  Future<void> _confirmTranscriptAndAdvance() async {
    final draft = responseController.text.trim();
    if (draft.isEmpty) return;

    final wasAutoMode = isAutoMode;
    if (!wasAutoMode) {
      setState(() {
        isAutoMode = true;
        _transcriptAutoAdvanceSafetyReason = null;
      });
    } else {
      setState(() {
        _transcriptAutoAdvanceSafetyReason = null;
      });
    }

    await _handleSubmittedResponse(draft);
    if (!mounted) return;

    if (!wasAutoMode && widget.state.activeSession != null) {
      setState(() {
        microphoneStatus = _autoPausedByTranscriptFailure
            ? 'Answer confirmed. Keep guiding for now, then resume hands-free when you want.'
            : 'Answer confirmed. Mallam moved on and is ready for the next step.';
      });
    }
  }

  Future<void> _acceptSavedAudioAndContinue(
      {bool resumeHandsFree = true}) async {
    final session = widget.state.activeSession;
    if (session == null) return;
    final hasSavedAudio = session.latestLearnerAudioPath != null &&
        session.latestLearnerAudioPath!.trim().isNotEmpty;
    if (!hasSavedAudio) return;

    widget.state.acceptLatestLearnerAudioManually(
      note:
          'Facilitator confirmed the learner answered correctly from the saved audio fallback.',
    );
    widget.onChanged();

    setState(() {
      transcriptReviewPending = false;
      _latestTranscriptNeedsManualReview = false;
      _transcriptAutoAdvanceSafetyReason = null;
      if (resumeHandsFree) {
        isAutoMode = true;
        _autoPausedByTranscriptFailure = false;
        microphoneStatus =
            'Saved learner audio accepted. Mallam can keep going from here.';
      } else {
        microphoneStatus =
            'Saved learner audio accepted. Continue now or resume hands-free when ready.';
      }
    });

    await _afterCorrectResponse();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    recordingTicker?.cancel();
    _speechAutoStopDebounce?.cancel();
    _browserRuntimeSubscription?.cancel();
    speechTranscriptionService.cancel();
    learnerAudioPlaybackService.dispose();
    audioCaptureService.dispose();
    browserRuntimeObserver.dispose();
    responseController.dispose();
    super.dispose();
  }

  bool get _hasPendingLessonEvidence {
    final session = widget.state.activeSession;
    if (session == null) return false;
    return responseController.text.trim().isNotEmpty ||
        transcriptReviewPending ||
        (session.latestLearnerAudioPath?.trim().isNotEmpty ?? false);
  }

  bool get _shouldConfirmLessonExit =>
      isRecording ||
      isSpeaking ||
      speechRecognitionActive ||
      _resumePromptPendingFromLifecycle ||
      _hasPendingLessonEvidence ||
      isAutoMode;

  Future<void> _leaveLessonSession() async {
    if (isRecording ||
        isSpeaking ||
        speechRecognitionActive ||
        _resumePromptPendingFromLifecycle ||
        _hasPendingLessonEvidence) {
      await _handleLifecycleInterruption(
        AppLifecycleState.inactive,
        reason: 'You left the lesson page',
        forceResumePrompt: true,
      );
      if (!mounted) return;
    }

    unawaited(learnerAudioPlaybackService.stop());
    unawaited(speechTranscriptionService.cancel());
    unawaited(widget.state.stopVoiceReplay());
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  Future<bool> _confirmLeaveLessonSession() async {
    if (!_shouldConfirmLessonExit) {
      await _leaveLessonSession();
      return false;
    }

    final shouldLeave = await showDialog<bool>(
          context: context,
          builder: (context) {
            return AlertDialog(
              title: const Text('Leave lesson safely?'),
              content: Text(
                _hasPendingLessonEvidence
                    ? 'Lumo will keep this learner step, saved voice, and draft answer so you can resume cleanly instead of losing the take.'
                    : isRecording || isSpeaking || speechRecognitionActive
                        ? 'Lumo is actively speaking or listening. Leaving now will pause the hands-free loop so the learner does not get interrupted mid-turn.'
                        : 'Lumo will pause the hands-free loop and keep this lesson ready to resume from the same step.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Stay here'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Leave lesson'),
                ),
              ],
            );
          },
        ) ??
        false;

    if (!shouldLeave || !mounted) {
      return false;
    }

    await _leaveLessonSession();
    return false;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        if (!mounted || !_resumePromptPendingFromLifecycle) return;
        setState(() {
          microphoneStatus = isAutoMode
              ? 'The app returned to the foreground. Tap Resume hands-free loop when the learner is ready so Mallam can replay this step and reopen the mic safely.'
              : 'The app returned to the foreground. Review the saved answer or tap Resume hands-free loop when the learner is ready.';
        });
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        unawaited(_handleLifecycleInterruption(state));
        break;
    }
  }

  Future<void> _handleLifecycleInterruption(
    AppLifecycleState state, {
    String? reason,
    bool forceResumePrompt = false,
  }) async {
    final session = widget.state.activeSession;
    final hadLiveCapture = isRecording || isSpeaking || speechRecognitionActive;
    final shouldProtectSession = hadLiveCapture ||
        (session != null &&
            (isAutoMode ||
                responseController.text.trim().isNotEmpty ||
                (session.latestLearnerAudioPath?.trim().isNotEmpty ?? false)));
    if (!shouldProtectSession && !_resumePromptPendingFromLifecycle) {
      return;
    }

    final interruptionReason = reason ?? 'The app left the foreground';
    final wasAutoMode = isAutoMode;
    _resumePromptPendingFromLifecycle = true;
    _speechAutoStopDebounce?.cancel();
    recordingTicker?.cancel();

    if (isRecording) {
      await stopRecording(markReadyForResume: false);
      if (!mounted) return;
    } else {
      await speechTranscriptionService.cancel();
    }

    await widget.state.stopVoiceReplay();
    if (!mounted) return;

    setState(() {
      isSpeaking = false;
      speechRecognitionActive = false;
      currentRecordingDuration = Duration.zero;
      transcriptReviewPending = transcriptReviewPending ||
          responseController.text.trim().isNotEmpty ||
          (widget.state.activeSession?.latestLearnerAudioPath
                  ?.trim()
                  .isNotEmpty ??
              false);
      microphoneStatus = wasAutoMode
          ? (transcriptReviewPending
              ? '$interruptionReason, so Lumo stopped live mic playback/capture to protect the learner session. The saved answer is still attached for review before Mallam continues.'
              : '$interruptionReason, so Lumo stopped live mic playback/capture to protect the learner session. When the tablet or browser is active again, tap Resume hands-free loop so Mallam can safely replay the step and reopen the mic.')
          : '$interruptionReason, so Lumo stopped live mic playback/capture. The saved audio and draft answer are still attached for manual review.';
      if (forceResumePrompt) {
        _resumePromptPendingFromLifecycle = true;
      }
    });
  }

  Future<void> _handleBrowserRuntimeSignal(BrowserRuntimeSignal signal) async {
    if (!mounted) return;
    switch (signal.kind) {
      case BrowserRuntimeSignalKind.hidden:
        await _handleLifecycleInterruption(
          AppLifecycleState.hidden,
          reason: 'The browser tab moved into the background',
          forceResumePrompt: true,
        );
        break;
      case BrowserRuntimeSignalKind.visible:
        if (!_resumePromptPendingFromLifecycle) return;
        setState(() {
          microphoneStatus = transcriptReviewPending
              ? 'The browser tab is active again. Review the saved learner evidence, then resume hands-free only when the mic route is stable.'
              : 'The browser tab is active again. Tap Resume hands-free loop so Mallam can replay the step and reopen the mic safely.';
        });
        break;
      case BrowserRuntimeSignalKind.offline:
        if (isRecording || isAutoMode || speechRecognitionActive) {
          setState(() {
            microphoneStatus =
                'The browser went offline. Lumo will keep saving learner audio locally and hold transcript help until the connection settles again.';
          });
        }
        break;
      case BrowserRuntimeSignalKind.online:
        if (isRecording || isSpeaking) return;
        final transcriptReady = await _retryTranscriptEngine(
          announceStatus: false,
        );
        if (!mounted) return;
        setState(() {
          microphoneStatus = transcriptReady
              ? 'Connection recovered. Transcript help looks ready again when you want to resume hands-free.'
              : 'Connection recovered, but transcript help is still settling. Lumo can keep running in audio-first mode.';
        });
        break;
      case BrowserRuntimeSignalKind.deviceChanged:
        if (isRecording) {
          await stopRecording(markReadyForResume: false);
          if (!mounted) return;
          setState(() {
            transcriptReviewPending = true;
            isAutoMode = false;
            microphoneStatus =
                'The microphone or speaker route changed mid-take. Lumo saved what it could, paused hands-free, and is waiting for a quick review before reopening the mic.';
          });
          return;
        }
        await speechTranscriptionService.cancel();
        if (!mounted) return;
        setState(() {
          _resumePromptPendingFromLifecycle = true;
          microphoneStatus =
              'Audio devices changed on this browser. Reopen the mic deliberately so the learner does not get trapped on the wrong headset or tablet microphone.';
        });
        break;
    }
  }

  void _handleSpeechStatus(String status) {
    if (!mounted) return;
    final normalized = status.toLowerCase();
    final listening = normalized.contains('listening');
    if (listening) {
      _speechAutoStopDebounce?.cancel();
    }

    if (!isRecording) return;
    if (!listening && transcriptCapturedThisTake) {
      _speechAutoStopDebounce?.cancel();
      _speechAutoStopDebounce =
          Timer(const Duration(milliseconds: 700), () async {
        if (!mounted || !isRecording || !transcriptCapturedThisTake) return;
        await stopRecording();
      });
    }
  }

  Future<void> _handleSpeechRuntimeError(String error) async {
    if (!mounted) return;
    final normalized = error.toLowerCase();
    final shouldForceAudioReview = normalized.contains('microphone') ||
        normalized.contains('blocked') ||
        normalized.contains('aborted') ||
        normalized.contains('permission') ||
        normalized.contains('unavailable');

    if (!isRecording) {
      setState(() {
        microphoneStatus = error;
        if (shouldForceAudioReview) {
          _resumePromptPendingFromLifecycle = true;
        }
      });
      return;
    }

    if (!shouldForceAudioReview) {
      setState(() {
        microphoneStatus = error;
      });
      return;
    }

    await stopRecording(markReadyForResume: false);
    if (!mounted) return;
    setState(() {
      isAutoMode = false;
      transcriptReviewPending = true;
      _autoPausedByTranscriptFailure = true;
      _resumePromptPendingFromLifecycle = true;
      microphoneStatus =
          '$error Lumo saved the learner audio it could recover, paused hands-free, and is waiting for a deliberate review before reopening the mic.';
    });
  }

  bool get _hasRecoveredLearnerEvidence {
    final session = widget.state.activeSession;
    if (session == null) return false;
    final hasDraft = responseController.text.trim().isNotEmpty;
    final hasSavedAudio =
        session.latestLearnerAudioPath?.trim().isNotEmpty ?? false;
    return hasDraft || hasSavedAudio;
  }

  bool get _avoidConcurrentSpeechCapture {
    if (kIsWeb) return true;
    return switch (defaultTargetPlatform) {
      TargetPlatform.macOS || TargetPlatform.iOS => true,
      _ => false,
    };
  }

  String get _concurrentSpeechCaptureFallbackReason {
    if (kIsWeb) {
      return 'Live transcript is paused during browser recording because web speech recognition and the recorder fight over the same microphone session. Lumo will keep the learner recording and let the facilitator confirm the answer manually.';
    }
    return 'Live transcript is paused on this device while local audio capture is running to avoid the mic handoff crash. Lumo will keep the learner recording and let the facilitator confirm the answer manually.';
  }

  String _buildFallbackCaptureStatus({
    required String audioMessage,
    required bool speechReady,
  }) {
    if (speechReady) {
      return audioMessage;
    }
    final fallbackReason = _avoidConcurrentSpeechCapture
        ? _concurrentSpeechCaptureFallbackReason
        : speechTranscriptionService.availabilityLabel;
    return '$audioMessage $fallbackReason';
  }

  int _meaningfulWordCount(String text) {
    return text
        .trim()
        .split(RegExp(r'\s+'))
        .where(
            (part) => part.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').length >= 2)
        .length;
  }

  bool _shouldForceTranscriptVoiceCheck(
      String transcript, String expectedResponse) {
    final normalizedTranscript = transcript.trim();
    final normalizedExpected = expectedResponse.trim();
    if (normalizedTranscript.isEmpty || normalizedExpected.isEmpty) {
      return false;
    }

    final transcriptWords = _meaningfulWordCount(normalizedTranscript);
    final expectedWords = _meaningfulWordCount(normalizedExpected);
    final compactTranscript =
        normalizedTranscript.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    final compactExpected =
        normalizedExpected.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');

    if (expectedWords >= 4 && transcriptWords > 0 && transcriptWords <= 1) {
      return true;
    }
    if (expectedWords >= 5 &&
        transcriptWords > 0 &&
        transcriptWords < (expectedWords / 2).ceil()) {
      return true;
    }
    if (compactExpected.length >= 12 &&
        compactTranscript.length >= 2 &&
        compactTranscript.length <= (compactExpected.length * 0.45).floor()) {
      return true;
    }
    return false;
  }

  String? _buildTranscriptSafetyReason(
      String transcript, String expectedResponse) {
    if (!_shouldForceTranscriptVoiceCheck(transcript, expectedResponse)) {
      return null;
    }
    final expectedWords = _meaningfulWordCount(expectedResponse);
    final transcriptWords = _meaningfulWordCount(transcript);
    if (expectedWords >= 4 && transcriptWords <= 1) {
      return 'The transcript finalized too short for this step, so Lumo blocked auto-advance until someone checks the saved voice.';
    }
    return 'This transcript looks shorter than the expected learner answer, so Lumo is holding the step for a quick voice check before continuing.';
  }

  bool get _hasTranscriptSafetyBlock =>
      (_transcriptAutoAdvanceSafetyReason?.trim().isNotEmpty ?? false);

  bool get _isAudioOnlyReviewState =>
      transcriptReviewPending &&
      responseController.text.trim().isEmpty &&
      (widget.state.activeSession?.latestLearnerAudioPath?.trim().isNotEmpty ??
          false) &&
      (!speechRecognitionActive || _avoidConcurrentSpeechCapture);

  bool get _hasSavedLearnerAudio =>
      widget.state.activeSession?.latestLearnerAudioPath?.trim().isNotEmpty ??
      false;

  bool get _draftTranscriptNeedsVoiceCheck =>
      transcriptReviewPending &&
      _latestTranscriptNeedsManualReview &&
      responseController.text.trim().isNotEmpty &&
      _hasSavedLearnerAudio;

  String get _learnerResponseHintText => _isAudioOnlyReviewState
      ? 'No transcript was captured. Listen to the saved voice note, then type the learner response here if needed.'
      : _avoidConcurrentSpeechCapture
          ? 'Browser recording saves the learner voice only. Type the learner response here after playback.'
          : _draftTranscriptNeedsVoiceCheck
              ? 'Saved audio and a draft transcript are attached. Listen once, then edit or confirm the text here.'
              : 'Transcript or typed response appears here';

  String get _reviewBannerTitle => _isAudioOnlyReviewState
      ? 'Review saved voice before advancing'
      : _hasTranscriptSafetyBlock
          ? 'Transcript blocked from auto-advance'
          : _draftTranscriptNeedsVoiceCheck
              ? 'Verify draft transcript with saved voice'
              : 'Review transcript before advancing';

  String get _reviewBannerBody => _isAudioOnlyReviewState
      ? 'Use the saved clip as the source of truth before Mallam continues.'
      : _hasTranscriptSafetyBlock
          ? _transcriptAutoAdvanceSafetyReason!
          : _draftTranscriptNeedsVoiceCheck
              ? 'Quick audio check first, then confirm the text.'
              : 'Check the draft transcript, edit it if needed, then confirm before moving on.';

  String get _transcriptSourceOfTruthLabel {
    if (_isAudioOnlyReviewState ||
        _draftTranscriptNeedsVoiceCheck ||
        _hasTranscriptSafetyBlock) {
      return 'Saved voice is source of truth';
    }
    if (speechRecognitionActive && !transcriptReviewPending) {
      return 'Transcript can drive next step';
    }
    if (_hasSavedLearnerAudio) {
      return 'Saved voice backup attached';
    }
    return 'Transcript assist only';
  }

  String get _automationSafetyLabel {
    if (_isAudioOnlyReviewState ||
        _draftTranscriptNeedsVoiceCheck ||
        _hasTranscriptSafetyBlock) {
      return 'Manual review gate active';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Repeat-mode safety active';
    }
    if (isAutoMode && speechRecognitionActive) {
      return 'Safe auto-advance armed';
    }
    if (isAutoMode) {
      return 'Audio-first auto flow';
    }
    return 'Manual step control';
  }

  String get _transcriptModeLabel => speechRecognitionActive
      ? speechTranscriptionService.activeModeLabel
      : _avoidConcurrentSpeechCapture
          ? 'Recorder owns microphone'
          : speechTranscriptionService.activeModeLabel;

  bool get _transcriptReadyToArm =>
      !_avoidConcurrentSpeechCapture && speechTranscriptionService.isAvailable;

  String get _listeningReadinessHeadline {
    if (isRecording && speechRecognitionActive) {
      return 'Live transcript is listening now';
    }
    if (isRecording) {
      return 'Audio-only capture is running now';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'Recovery mode is holding the step safely';
    }
    if (_transcriptReadyToArm) {
      return 'Live transcript is ready for the next take';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Transcript help is unstable right now';
    }
    return 'Audio-first fallback is ready';
  }

  String get _listeningReadinessBody {
    if (isRecording && speechRecognitionActive) {
      return 'Speak normally. Lumo is saving learner audio and drafting text at the same time.';
    }
    if (isRecording) {
      return 'Lumo is saving the learner voice now. Finish the take, then review the saved audio before advancing.';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'Nothing is lost. Review the saved learner evidence, then resume hands-free only when the mic route is stable again.';
    }
    if (_transcriptReadyToArm) {
      return 'Press start and Lumo will capture learner audio plus live transcript help on the same take.';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Keep teaching in audio-first mode for now. The saved voice note is the source of truth until transcript help settles.';
    }
    return speechTranscriptionService.strategySummary(
      preferAudioOnly: _avoidConcurrentSpeechCapture,
    );
  }

  String get _listeningStartButtonLabel {
    if (isRecording) {
      return 'Listening now';
    }
    return _transcriptReadyToArm
        ? 'Start listening + transcript'
        : 'Start listening (audio first)';
  }

  String get _recoveryPlanHeadline {
    if (_hasTranscriptSafetyBlock) {
      return 'Recovery plan: verify this transcript against audio';
    }
    if (_draftTranscriptNeedsVoiceCheck) {
      return 'Recovery plan: confirm the draft with saved voice';
    }
    if (_isAudioOnlyReviewState) {
      return 'Recovery plan: use the saved learner voice';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'Recovery plan: resume deliberately';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Recovery plan: slow the loop down';
    }
    return 'Recovery plan';
  }

  String get _recoveryPlanBody {
    if (_hasTranscriptSafetyBlock || _draftTranscriptNeedsVoiceCheck) {
      return 'Play the saved voice once, fix the text if needed, then confirm before Mallam continues.';
    }
    if (_isAudioOnlyReviewState) {
      return 'No transcript came through on this take. Use the saved voice note or type a short note, then continue.';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'Resume hands-free only after you are happy with the mic route. Manual mode is safer until then.';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Repeat mode and saved audio are now the safest path. Avoid forcing transcript retries on every take.';
    }
    return _automationSafetySummary;
  }

  String get _automationSafetySummary {
    if (_isAudioOnlyReviewState) {
      return 'Mallam will not auto-advance from this take until someone listens to the saved audio or types a confirmed note.';
    }
    if (_hasTranscriptSafetyBlock) {
      return 'Mallam is paused because the transcript looks incomplete for this step even though capture finished. Confirm it against the saved voice before resuming the loop.';
    }
    if (_draftTranscriptNeedsVoiceCheck) {
      return 'Mallam is paused because the transcript is only a draft. Confirm it against the saved voice before resuming the loop.';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Lumo already slowed the loop down after repeated misses so the learner is not trapped in a bad STT retry spiral.';
    }
    if (isAutoMode && speechRecognitionActive) {
      return 'Auto-advance is allowed only after a stable transcript final arrives or the facilitator confirms the response.';
    }
    return 'Hands-free support is available, but the facilitator stays in control of the next step.';
  }

  String get _reviewPrimaryCtaLabel => _isAudioOnlyReviewState
      ? (isAutoMode
          ? 'Save note and continue'
          : 'Save note + resume hands-free')
      : 'Confirm transcript';

  String get _reviewSecondaryCtaLabel => _isAudioOnlyReviewState
      ? 'Stay in audio-only review'
      : 'Use audio only for this take';

  bool _looksLikeRemoteMediaReference(String value) {
    final normalized = value.trim().toLowerCase();
    return normalized.startsWith('http://') ||
        normalized.startsWith('https://') ||
        normalized.startsWith('gs://');
  }

  String? _learnerFacingCueText(String? primary, String? fallback) {
    final primaryValue = primary?.trim();
    if (primaryValue != null &&
        primaryValue.isNotEmpty &&
        !_looksLikeRemoteMediaReference(primaryValue)) {
      return primaryValue;
    }

    final fallbackValue = fallback?.trim();
    if (fallbackValue != null &&
        fallbackValue.isNotEmpty &&
        !_looksLikeRemoteMediaReference(fallbackValue)) {
      return fallbackValue;
    }

    return null;
  }

  String? get _savedAudioEvidenceLabel {
    final session = widget.state.activeSession;
    final path = session?.latestLearnerAudioPath?.trim();
    if (path == null || path.isEmpty) return null;

    final duration = session?.latestLearnerAudioDuration;
    final durationLabel = duration == null
        ? 'Saved learner voice ready'
        : formatDuration(duration);
    return '$durationLabel clip saved for review';
  }

  bool get _spokenStepReadyToContinue {
    final session = widget.state.activeSession;
    if (session == null) return false;
    if (transcriptReviewPending || isRecording) return false;

    final candidate = responseController.text.trim().isNotEmpty
        ? responseController.text.trim()
        : session.latestLearnerResponse?.trim() ?? '';
    if (candidate.isEmpty) return false;

    final evaluation = widget.state.evaluateLearnerResponse(candidate);
    return evaluation.review == ResponseReview.onTrack;
  }

  String get _spokenStepBlockedFeedback {
    final expected = widget.state.personalizeExpectedResponse(
      widget.lesson.steps[widget.state.activeSession?.stepIndex ?? 0]
          .expectedResponse,
    );
    if ((widget.state.activeSession?.latestLearnerAudioPath
                ?.trim()
                .isNotEmpty ??
            false) &&
        responseController.text.trim().isEmpty) {
      return 'Mallam is waiting for a clear learner answer. Listen to the saved voice once, then type or confirm what the learner said before continuing.';
    }
    if (responseController.text.trim().isEmpty) {
      return 'Mallam needs to hear the learner answer before moving on.';
    }
    return expected.trim().isEmpty
        ? 'That answer still needs a quick check, so Mallam is keeping this step open for another try.'
        : 'Mallam is not ready to move on yet. Coach the learner toward "$expected" or record one clearer answer.';
  }

  bool get _shouldExpandTranscriptStrategyByDefault =>
      transcriptReviewPending ||
      _isAudioOnlyReviewState ||
      _draftTranscriptNeedsVoiceCheck ||
      _hasTranscriptSafetyBlock ||
      _consecutiveTranscriptMisses >= 2;

  String get _transcriptStrategyHeadline =>
      speechTranscriptionService.strategyHeadline(
        preferAudioOnly: _avoidConcurrentSpeechCapture,
      );

  String get _transcriptStrategySummary =>
      speechTranscriptionService.strategySummary(
        preferAudioOnly: _avoidConcurrentSpeechCapture,
      );

  String get _lessonModeLabel {
    if (_isAudioOnlyReviewState ||
        _draftTranscriptNeedsVoiceCheck ||
        _hasTranscriptSafetyBlock) {
      return 'Review first';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'Ready to resume';
    }
    return isAutoMode ? 'Hands-free' : 'Step by step';
  }

  String get _sessionStatusHeadline {
    if (_isAudioOnlyReviewState) {
      return 'Listen to the saved answer before moving on';
    }
    if (_hasTranscriptSafetyBlock) {
      return 'Transcript needs a quick safety check';
    }
    if (_draftTranscriptNeedsVoiceCheck) {
      return 'Draft transcript should be checked with audio';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'The lesson is paused safely';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Slow down and coach this step manually';
    }
    if (speechRecognitionActive && isAutoMode) {
      return 'Mallam can listen and move on when the answer is clear';
    }
    if (isAutoMode) {
      return 'Audio support is on';
    }
    return 'You are guiding this step';
  }

  String get _sessionStatusBody {
    if (_isAudioOnlyReviewState) {
      return 'Audio-only review is active, so Mallam will wait for a quick facilitator check before moving on.';
    }
    if (_hasTranscriptSafetyBlock) {
      return _transcriptAutoAdvanceSafetyReason!;
    }
    if (_draftTranscriptNeedsVoiceCheck) {
      return 'Lumo kept both the draft transcript and the learner audio. Listen once, fix the text if needed, then continue.';
    }
    if (_resumePromptPendingFromLifecycle || _autoPausedByTranscriptFailure) {
      return 'Nothing is lost. Review the latest learner evidence, then resume hands-free only when the mic route feels stable again.';
    }
    if (_consecutiveTranscriptMisses >= 2) {
      return 'Transcript help has struggled on this step, so it is better to coach, replay, or type the answer than keep forcing retries.';
    }
    if (speechRecognitionActive && isAutoMode) {
      return 'Keep the learner speaking. Lumo will only move on after a clear answer or your confirmation.';
    }
    if (isAutoMode) {
      return 'Lumo is still saving learner audio, so the lesson can keep moving even when transcript help is patchy.';
    }
    return 'Replay Mallam, capture the learner answer, then move on when it is clear.';
  }

  bool get _showDeviceDiagnosticsPanel {
    return !_micPermissionGranted ||
        _consecutiveTranscriptMisses > 0 ||
        _autoPausedByTranscriptFailure ||
        !speechTranscriptionService.isAvailable ||
        widget.state.pendingSyncEvents.isNotEmpty ||
        widget.state.lastSyncError != null ||
        widget.state.lastSyncWarnings.isNotEmpty ||
        !widget.state.hasLiveBackendConnection ||
        _recordingModeLabel.toLowerCase().contains('fallback');
  }

  List<String> get _transcriptStrategyActions =>
      speechTranscriptionService.strategyActionItems(
        preferAudioOnly: _avoidConcurrentSpeechCapture,
      );

  Future<void> _toggleSavedAudioPlayback() async {
    final audioPath =
        widget.state.activeSession?.latestLearnerAudioPath?.trim();
    if (audioPath == null || audioPath.isEmpty) return;

    try {
      final isSameSource =
          learnerAudioPlaybackService.currentSourcePath == audioPath;
      final wasPlaying = learnerAudioPlaybackService.isPlaying && isSameSource;
      await learnerAudioPlaybackService.play(audioPath);
      if (!mounted) return;
      setState(() {
        _savedAudioPlaybackError = null;
        microphoneStatus = wasPlaying
            ? 'Saved learner audio paused. You can type the answer or resume playback anytime.'
            : 'Playing the saved learner audio now so you can review the response before advancing.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _savedAudioPlaybackError = error.toString();
        microphoneStatus =
            'Saved learner audio could not play on this device. Retry playback, replay Mallam\'s prompt, or keep the step in manual review.';
      });
    }
  }

  Future<void> _stopSavedAudioPlayback() async {
    await learnerAudioPlaybackService.stop();
    if (!mounted) return;
    setState(() {
      _savedAudioPlaybackError = null;
      microphoneStatus =
          'Saved learner audio stopped. Review the answer, then continue when ready.';
    });
  }

  Future<void> _replayMallamPrompt() async {
    await _speakCurrentStepIfNeeded(force: true);
    if (!mounted) return;
    setState(() {
      _savedAudioPlaybackError = null;
      microphoneStatus =
          'Mallam repeated the step so the learner gets a clean second listen before you review the answer.';
    });
  }

  Future<void> _speakCurrentStepIfNeeded({bool force = false}) async {
    final session = widget.state.activeSession;
    if (session == null) return;
    if (_promptedCurrentStep && !force) return;
    _promptedCurrentStep = true;
    final prompt =
        widget.state.personalizePrompt(session.currentStep.coachPrompt);
    final readyMessage = LearnerDialogue.promptReady(resumed: _resumedSession);
    await _speakAndMaybeAutoRecord(
      prompt,
      mode: SpeakerMode.guiding,
      autoReadyMessage: readyMessage,
    );
    _resumedSession = false;
  }

  Future<void> _prepareForMallamSpeech() async {
    if (isRecording) {
      await stopRecording(markReadyForResume: false);
    }
    await speechTranscriptionService.cancel();
    await widget.state.stopVoiceReplay();
  }

  String? _buildAffirmationLine(LessonSessionState? session) {
    if (session == null) return null;
    final remainingSteps =
        session.lesson.steps.length - (session.stepIndex + 1);
    final seed = session.totalResponses + session.stepIndex;
    return LearnerDialogue.continuation(
      remainingSteps: remainingSteps,
      seed: seed,
    );
  }

  Future<void> _speakAffirmation(String text) async {
    await _prepareForMallamSpeech();
    if (!mounted) return;
    setState(() {
      isSpeaking = true;
      microphoneStatus = 'Mallam is encouraging the learner.';
    });
    await widget.state.replayVisiblePrompt(text, mode: SpeakerMode.affirming);
    if (!mounted) return;
    setState(() {
      isSpeaking = false;
      microphoneStatus = 'Mallam is getting the next step ready.';
    });
  }

  Future<void> _speakAndMaybeAutoRecord(
    String text, {
    SpeakerMode mode = SpeakerMode.guiding,
    String? autoReadyMessage,
  }) async {
    await _prepareForMallamSpeech();
    if (!mounted) return;
    setState(() {
      isSpeaking = true;
      microphoneStatus = 'Mallam is speaking.';
    });
    await widget.state.replayVisiblePrompt(text, mode: mode);
    if (!mounted) return;
    setState(() {
      isSpeaking = false;
      microphoneStatus = isAutoMode
          ? (autoReadyMessage ?? 'Mallam finished. The learner can answer now.')
          : 'Mallam finished. Listen for the learner answer.';
    });
    if (isAutoMode) {
      await _startRecordingIfPossible(
        fallbackMessage: autoReadyMessage,
      );
    }
  }

  Future<void> _startRecordingIfPossible({String? fallbackMessage}) async {
    if (!mounted || isRecording || isSpeaking) return;
    try {
      await startRecording();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        microphoneStatus = fallbackMessage ??
            microphoneStatus ??
            'Mallam finished. Start recording when the learner is ready.';
      });
    }
  }

  Future<void> _runCoachSupport(String supportType) async {
    final session = widget.state.activeSession;
    if (session == null) return;

    widget.state.useCoachSupport(supportType);
    widget.onChanged();
    setState(() {
      if (supportType == 'model') {
        responseController.text = widget.state.personalizeExpectedResponse(
          session.currentStep.expectedResponse,
        );
      }
    });

    final supportPrompt = widget.state.activeSession?.transcript.last.text ??
        widget.state.buildCoachSupportPrompt(
          supportType: supportType,
          step: session.currentStep,
        );
    final mode = supportType == 'model'
        ? SpeakerMode.affirming
        : supportType == 'wait'
            ? SpeakerMode.waiting
            : SpeakerMode.guiding;
    final status = LearnerDialogue.supportStatus(supportType);

    await _speakAndMaybeAutoRecord(
      supportPrompt,
      mode: mode,
      autoReadyMessage: status,
    );
  }

  Future<void> _afterCorrectResponse() async {
    final previousSession = widget.state.activeSession;
    final celebrationLine = _buildAffirmationLine(previousSession);
    if (celebrationLine != null) {
      await _speakAffirmation(celebrationLine);
      if (!mounted) return;
    }

    final finished = widget.state.advanceLessonStep();
    widget.onChanged();
    if (finished) {
      await widget.state.completeLesson(widget.lesson);
      if (!mounted) return;
      widget.onChanged();
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => LessonCompletePage(
            state: widget.state,
            lesson: widget.lesson,
            revealWithCountdown: true,
          ),
        ),
      );
      return;
    }

    responseController.clear();
    liveTranscript = '';
    transcriptReviewPending = false;
    _promptedCurrentStep = false;
    setState(() {
      microphoneStatus = LearnerDialogue.movingToNext();
    });
    await _speakCurrentStepIfNeeded(force: true);
  }

  bool _isChoiceActivityType(LessonActivityType? type) {
    return type == LessonActivityType.imageChoice ||
        type == LessonActivityType.tapChoice;
  }

  Future<void> _setResponseAndMaybeSubmit(String value,
      {bool submit = false}) async {
    responseController.text = value;
    setState(() {});
    if (submit) {
      await _handleSubmittedResponse(value);
    }
  }

  Future<void> _speakActivityText(String text,
      {SpeakerMode mode = SpeakerMode.guiding}) async {
    await _speakAndMaybeAutoRecord(
      text,
      mode: mode,
      autoReadyMessage: LearnerDialogue.replayedPrompt(),
    );
  }

  String _normalizeLearnerAssetKind(String? value) {
    return (value ?? '').trim().toLowerCase();
  }

  List<String> _expandLearnerAssetKinds(List<String> kinds) {
    final expanded = <String>{};
    for (final kind in kinds) {
      final normalized = _normalizeLearnerAssetKind(kind);
      if (normalized.isEmpty) continue;
      expanded.add(normalized);
      switch (normalized) {
        case 'illustration':
          expanded.add('image');
          break;
        case 'prompt-card':
        case 'story-card':
        case 'trace-card':
        case 'letter-card':
        case 'tile':
        case 'word-card':
        case 'hint':
        case 'transcript':
          expanded.add('text');
          break;
        default:
          break;
      }
    }
    return expanded.toList(growable: false);
  }

  LessonActivityMedia? _firstMediaOfKind(
    List<LessonActivityMedia> mediaItems,
    List<String> kinds,
  ) {
    final expandedKinds = _expandLearnerAssetKinds(kinds);
    for (final media in mediaItems) {
      if (expandedKinds.contains(_normalizeLearnerAssetKind(media.kind)) &&
          media.values.isNotEmpty) {
        return media;
      }
    }
    return null;
  }

  Future<void> _playChoiceMedia(LessonActivityChoice choice) async {
    final audioMedia = _firstMediaOfKind(choice.mediaItems, const ['audio']);
    final audioValue = audioMedia?.firstValue?.trim();

    try {
      if (audioValue != null && audioValue.isNotEmpty) {
        await learnerAudioPlaybackService.play(audioValue);
        if (!mounted) return;
        setState(() {
          microphoneStatus = 'Mallam replayed the choice audio cue.';
        });
        return;
      }

      await _speakActivityText(choice.label, mode: SpeakerMode.guiding);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        microphoneStatus = 'Could not open the choice media yet: $error';
      });
    }
  }

  bool _looksLikeBundledAssetPath(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty || trimmed.startsWith('/')) return false;
    final uri = Uri.tryParse(trimmed);
    return !(uri?.hasScheme ?? false);
  }

  Widget _buildMediaImage(
    String value, {
    required double width,
    required double height,
    required Widget Function() fallback,
  }) {
    final trimmed = value.trim();
    if (_looksLikeBundledAssetPath(trimmed)) {
      return Image.asset(
        trimmed,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallback(),
      );
    }

    return Image.network(
      trimmed,
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback(),
    );
  }

  int _normalizedChoiceCount(int choiceCount) {
    return choiceCount.clamp(2, 6);
  }

  int _imageChoiceColumnCount({
    required double maxWidth,
    required int choiceCount,
  }) {
    final normalizedChoiceCount = _normalizedChoiceCount(choiceCount);

    if (normalizedChoiceCount >= 6) {
      return maxWidth >= 3 * 180 + 2 * 16 ? 3 : 2;
    }
    if (normalizedChoiceCount >= 4) {
      return maxWidth >= 3 * 160 + 2 * 16 ? 3 : 2;
    }
    if (normalizedChoiceCount >= 3) {
      return maxWidth >= 3 * 150 + 2 * 16 ? 3 : 2;
    }
    return maxWidth >= 2 * 140 + 16 ? 2 : 1;
  }

  Widget _buildChoicePreview(
    LessonActivityChoice choice,
    String fallbackEmoji, {
    double imageHeight = 96,
    double borderRadius = 16,
  }) {
    final imageMedia =
        _firstMediaOfKind(choice.mediaItems, const ['image', 'photo']);
    final imageValue = imageMedia?.firstValue?.trim();
    final hasAudio =
        _firstMediaOfKind(choice.mediaItems, const ['audio']) != null;
    final textMedia = _firstMediaOfKind(
      choice.mediaItems,
      const [
        'letter-card',
        'trace-card',
        'tile',
        'word-card',
        'prompt-card',
        'story-card',
        'hint',
        'transcript'
      ],
    );
    final textValue = textMedia?.firstValue?.trim();
    final textKind = _normalizeLearnerAssetKind(textMedia?.kind);

    if (imageValue != null && imageValue.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: _buildMediaImage(
          imageValue,
          width: double.infinity,
          height: imageHeight,
          fallback: () => Container(
            height: imageHeight,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFFEEF2FF),
              borderRadius: BorderRadius.circular(borderRadius),
            ),
            child: Text(
              fallbackEmoji,
              style: const TextStyle(fontSize: 40),
            ),
          ),
        ),
      );
    }

    if (textValue != null && textValue.isNotEmpty) {
      final accentColor = switch (textKind) {
        'letter-card' || 'trace-card' => const Color(0xFF6D28D9),
        'tile' || 'word-card' => const Color(0xFF7C3AED),
        'hint' || 'transcript' => const Color(0xFF9A3412),
        _ => const Color(0xFF1D4ED8),
      };

      return Container(
        height: imageHeight,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(color: accentColor.withValues(alpha: 0.24)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              textValue,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: textKind == 'letter-card' ? 30 : 18,
                fontWeight: FontWeight.w800,
                color: accentColor,
              ),
            ),
            if (hasAudio) ...[
              const SizedBox(height: 6),
              const Icon(
                Icons.volume_up_rounded,
                color: Color(0xFF4338CA),
              ),
            ],
          ],
        ),
      );
    }

    return Container(
      height: imageHeight,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: const Color(0xFFBFDBFE), width: 1.5),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFF93C5FD)),
              ),
              child: Center(
                child: Text(
                  fallbackEmoji,
                  style: const TextStyle(fontSize: 30),
                ),
              ),
            ),
            if (hasAudio) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.86),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Icon(
                  Icons.volume_up_rounded,
                  color: Color(0xFF4338CA),
                  size: 18,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSharedMediaGallery(LessonActivity activity) {
    if (activity.mediaItems.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: activity.mediaItems.map((media) {
        final kind = _normalizeLearnerAssetKind(media.kind);
        final firstValue = media.firstValue?.trim();
        final hasValue = firstValue != null && firstValue.isNotEmpty;

        if ((kind == 'image' || kind == 'photo' || kind == 'illustration') &&
            hasValue) {
          return ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: _buildMediaImage(
              firstValue,
              width: 140,
              height: 110,
              fallback: () => Container(
                width: 140,
                height: 110,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Center(
                  child: Icon(Icons.image_not_supported_rounded),
                ),
              ),
            ),
          );
        }

        if (kind == 'audio' && hasValue) {
          return FilledButton.tonalIcon(
            onPressed: () => learnerAudioPlaybackService.play(firstValue),
            icon: const Icon(Icons.play_arrow_rounded),
            label:
                Text(media.values.length > 1 ? 'Play audio set' : 'Play audio'),
          );
        }

        final accentColor = switch (kind) {
          'letter-card' || 'trace-card' => const Color(0xFF6D28D9),
          'tile' || 'word-card' => const Color(0xFF7C3AED),
          'hint' || 'transcript' => const Color(0xFF9A3412),
          _ => const Color(0xFF1D4ED8),
        };
        final title = switch (kind) {
          'prompt-card' => 'Prompt card',
          'story-card' => 'Story card',
          'trace-card' => 'Trace card',
          'letter-card' => 'Letter card',
          'tile' => 'Tile',
          'word-card' => 'Word card',
          'hint' => 'Hint',
          'transcript' => 'Transcript',
          'illustration' => 'Illustration',
          _ => media.kind,
        };
        final readinessText = hasValue
            ? switch (kind) {
                'prompt-card' ||
                'story-card' =>
                  'Learner sees this card text in runtime.',
                'trace-card' => 'Learner sees a tracing support card.',
                'letter-card' => 'Learner sees the letter anchor immediately.',
                'tile' ||
                'word-card' =>
                  'Learner sees this as a build/read card.',
                'hint' => 'Learner sees extra support text.',
                'transcript' => 'Learner sees the script text clearly.',
                _ => 'Learner runtime keeps this asset visible.',
              }
            : 'Missing value — this asset will not render yet.';

        return Container(
          constraints: const BoxConstraints(minWidth: 140, maxWidth: 240),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: hasValue
                ? accentColor.withValues(alpha: 0.08)
                : const Color(0xFFFFF7ED),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: hasValue
                  ? accentColor.withValues(alpha: 0.22)
                  : const Color(0xFFFED7AA),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: hasValue ? accentColor : const Color(0xFF9A3412),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                hasValue ? firstValue : 'Value missing',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                readinessText,
                style: const TextStyle(
                  color: Color(0xFF475569),
                  fontSize: 12,
                  height: 1.35,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActivityPanel(LessonStep step) {
    final activity = step.activity;
    if (activity == null) return const SizedBox.shrink();

    final prompt = widget.state.personalizePrompt(activity.prompt);
    final focusText = activity.focusText == null
        ? null
        : widget.state.personalizeExpectedResponse(activity.focusText!);
    final supportText = activity.supportText == null
        ? null
        : widget.state.personalizeExpectedResponse(activity.supportText!);
    final targetResponse = activity.targetResponse == null
        ? null
        : widget.state.personalizeExpectedResponse(activity.targetResponse!);

    Widget body;
    switch (activity.type) {
      case LessonActivityType.letterIntro:
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 96,
                  height: 96,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Text(
                    focusText ?? activity.mediaValue ?? '-',
                    style: const TextStyle(
                      fontSize: 44,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF312E81),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(prompt),
                      if (supportText != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          supportText,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            if (activity.mediaItems.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildSharedMediaGallery(activity),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonalIcon(
                  onPressed: focusText == null && activity.mediaValue == null
                      ? null
                      : () => _speakActivityText(_learnerFacingCueText(
                              focusText, activity.mediaValue) ??
                          'Audio cue ready'),
                  icon: const Icon(Icons.volume_up_rounded),
                  label: const Text('Hear letter'),
                ),
                FilledButton.tonalIcon(
                  onPressed: supportText == null
                      ? null
                      : () => _speakActivityText(supportText),
                  icon: const Icon(Icons.record_voice_over_rounded),
                  label: const Text('Hear cue'),
                ),
                ActionChip(
                  label: Text(targetResponse ?? 'Use this answer'),
                  onPressed: targetResponse == null
                      ? null
                      : () => _setResponseAndMaybeSubmit(targetResponse),
                ),
              ],
            ),
          ],
        );
        break;
      case LessonActivityType.imageChoice:
      case LessonActivityType.tapChoice:
        final choiceItems = activity.choiceItems.isNotEmpty
            ? activity.choiceItems
            : List.generate(activity.choices.length, (index) {
                final choice = activity.choices[index];
                return LessonActivityChoice(
                  id: 'choice-$index',
                  label: choice,
                  isCorrect: choice == activity.targetResponse,
                );
              });
        final selectedChoiceLabel = responseController.text.trim();
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              prompt,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                height: 1.35,
              ),
            ),
            if (supportText != null) ...[
              const SizedBox(height: 8),
              Text(
                supportText,
                style: const TextStyle(color: Color(0xFF475569), height: 1.4),
              ),
            ],
            if (activity.mediaItems.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildSharedMediaGallery(activity),
            ],
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFF),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFD7E3FF)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Choose the matching object',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E3A8A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Tap one large card. The selected card glows blue so the learner can see what was picked.',
                    style: TextStyle(
                      color: Color(0xFF475569),
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 16),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      const spacing = 16.0;
                      final columnCount = _imageChoiceColumnCount(
                        maxWidth: constraints.maxWidth,
                        choiceCount: choiceItems.length,
                      );
                      final totalSpacing = spacing * (columnCount - 1);
                      final cardWidth =
                          (constraints.maxWidth - totalSpacing) / columnCount;
                      final previewHeight = cardWidth >= 240
                          ? 156.0
                          : cardWidth >= 180
                              ? 128.0
                              : 96.0;
                      return Wrap(
                        spacing: spacing,
                        runSpacing: spacing,
                        children: List.generate(choiceItems.length, (index) {
                          final choiceItem = choiceItems[index];
                          final emoji = index < activity.choiceEmoji.length
                              ? activity.choiceEmoji[index]
                              : '🖼️';
                          final isSelected =
                              selectedChoiceLabel.toLowerCase() ==
                                  choiceItem.label.trim().toLowerCase();
                          final hasAudio = _firstMediaOfKind(
                                choiceItem.mediaItems,
                                const ['audio'],
                              ) !=
                              null;
                          return InkWell(
                            key: ValueKey('choice-card-${choiceItem.id}'),
                            onTap: () => _setResponseAndMaybeSubmit(
                              choiceItem.label,
                            ),
                            borderRadius: BorderRadius.circular(28),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              width: cardWidth,
                              constraints: const BoxConstraints(minHeight: 260),
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFFEFF6FF)
                                    : Colors.white,
                                borderRadius: BorderRadius.circular(28),
                                border: Border.all(
                                  color: isSelected
                                      ? const Color(0xFF2563EB)
                                      : const Color(0xFFD7E3FF),
                                  width: isSelected ? 3 : 1.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: isSelected
                                        ? const Color(0x1A2563EB)
                                        : const Color(0x0D0F172A),
                                    blurRadius: isSelected ? 24 : 12,
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Expanded(
                                    child: Stack(
                                      children: [
                                        Positioned.fill(
                                          child: _buildChoicePreview(
                                            choiceItem,
                                            emoji,
                                            imageHeight: previewHeight,
                                            borderRadius: 22,
                                          ),
                                        ),
                                        if (isSelected)
                                          Positioned(
                                            top: 12,
                                            right: 12,
                                            child: Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 12,
                                                vertical: 8,
                                              ),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFF2563EB),
                                                borderRadius:
                                                    BorderRadius.circular(999),
                                              ),
                                              child: const Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(
                                                    Icons.check_rounded,
                                                    color: Colors.white,
                                                    size: 16,
                                                  ),
                                                  SizedBox(width: 6),
                                                  Text(
                                                    'Selected',
                                                    style: TextStyle(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    choiceItem.label,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 20,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    isSelected
                                        ? 'Good pick. This card is ready for the next step.'
                                        : 'Tap to choose this object.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: isSelected
                                          ? const Color(0xFF1D4ED8)
                                          : const Color(0xFF64748B),
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      height: 1.3,
                                    ),
                                  ),
                                  if (hasAudio) ...[
                                    const SizedBox(height: 14),
                                    FilledButton.tonalIcon(
                                      onPressed: () =>
                                          _playChoiceMedia(choiceItem),
                                      style: FilledButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 16,
                                          vertical: 14,
                                        ),
                                      ),
                                      icon:
                                          const Icon(Icons.play_arrow_rounded),
                                      label: const Text('Hear choice'),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        }),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        );
        break;
      case LessonActivityType.speakAnswer:
      case LessonActivityType.listenRepeat:
      case LessonActivityType.listenAnswer:
      case LessonActivityType.wordBuild:
      case LessonActivityType.oralQuiz:
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(prompt),
            if (focusText != null || activity.mediaValue != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  _learnerFacingCueText(focusText, activity.mediaValue) ??
                      'Audio cue ready',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF9A3412),
                  ),
                ),
              ),
            ],
            if (activity.mediaItems.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildSharedMediaGallery(activity),
            ],
            if (supportText != null) ...[
              const SizedBox(height: 8),
              Text(
                supportText,
                style: const TextStyle(color: Color(0xFF475569)),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonalIcon(
                  onPressed: targetResponse == null
                      ? null
                      : () => _speakActivityText(
                            targetResponse,
                            mode: SpeakerMode.affirming,
                          ),
                  icon: const Icon(Icons.volume_up_rounded),
                  label: const Text('Hear target answer'),
                ),
                ActionChip(
                  label: Text(targetResponse ?? 'Use target answer'),
                  onPressed: targetResponse == null
                      ? null
                      : () => _setResponseAndMaybeSubmit(targetResponse),
                ),
              ],
            ),
          ],
        );
        break;
    }

    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Play time',
                  style: TextStyle(
                    color: Color(0xFF4338CA),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const Text(
                'Tap, listen, and answer',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          body,
        ],
      ),
    );
  }

  Future<void> _handleSubmittedResponse(String text,
      {bool auto = false}) async {
    if (isRecording) {
      await stopRecording(markReadyForResume: false);
    }
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    final outcome = widget.state.submitLearnerResponse(trimmed);
    responseController.text = trimmed;
    transcriptReviewPending = false;
    _latestTranscriptNeedsManualReview = false;
    widget.onChanged();
    setState(() {});

    if (!isAutoMode) {
      setState(() {
        microphoneStatus = outcome.automationStatus;
      });
      return;
    }

    if (outcome.accepted) {
      await _afterCorrectResponse();
      return;
    }

    final practiceMode =
        widget.state.activeSession?.practiceMode ?? PracticeMode.standard;
    final supportType = practiceMode == PracticeMode.repeatAfterMe
        ? 'slow'
        : outcome.attemptNumber >= 2
            ? 'model'
            : 'hint';
    await _runCoachSupport(supportType);
  }

  Future<void> startRecording() async {
    try {
      if (isSpeaking) {
        setState(() {
          microphoneStatus =
              'Wait for Mallam to finish speaking before starting the mic.';
        });
        return;
      }

      final previousDraft = responseController.text.trim();
      final previousLearnerResponse =
          widget.state.activeSession?.latestLearnerResponse?.trim() ?? '';
      final shouldClearStaleDraft = previousDraft.isNotEmpty &&
          !transcriptReviewPending &&
          (previousDraft == previousLearnerResponse ||
              previousDraft == _latestFinalTranscript.trim() ||
              previousDraft == liveTranscript.trim());

      await widget.state.stopVoiceReplay();
      await speechTranscriptionService.cancel();
      _speechAutoStopDebounce?.cancel();
      final hadRecoveredEvidence = _hasRecoveredLearnerEvidence;
      if (hadRecoveredEvidence) {
        widget.state.clearCurrentStepLearnerEvidence(
          automationStatus:
              'Fresh learner take started. Earlier saved audio and draft text were cleared so this step does not stay stuck on stale evidence.',
        );
      }
      transcriptCapturedThisTake = false;
      liveTranscript = '';
      _latestFinalTranscript = '';
      _capturedStableFinalTranscript = false;
      _latestTranscriptNeedsManualReview = false;
      _transcriptAutoAdvanceSafetyReason = null;
      transcriptReviewPending = false;
      _resumePromptPendingFromLifecycle = false;
      if (shouldClearStaleDraft || hadRecoveredEvidence) {
        responseController.clear();
      }

      final audioStarted = await audioCaptureService.startSafely(
        fileStem: widget.state.currentLearner?.learnerCode ?? 'learner-voice',
      );
      if (!audioStarted.started) {
        throw AudioCaptureException(
            audioStarted.message ?? 'Unable to start microphone capture.');
      }
      _recordingModeLabel = audioStarted.recordingModeLabel;

      final speechReady = _avoidConcurrentSpeechCapture
          ? false
          : await speechTranscriptionService.start(
              onResult: (transcript, isFinal) {
                if (!mounted) return;
                final cleaned = transcript.trim();
                if (cleaned.isEmpty) return;
                final existingDraft = responseController.text.trim();
                final canMirrorIntoResponseBox = existingDraft.isEmpty ||
                    existingDraft == liveTranscript.trim() ||
                    existingDraft == _latestFinalTranscript.trim();
                setState(() {
                  liveTranscript = cleaned;
                  if (canMirrorIntoResponseBox) {
                    responseController.value = TextEditingValue(
                      text: cleaned,
                      selection:
                          TextSelection.collapsed(offset: cleaned.length),
                    );
                  }
                  _latestTranscriptNeedsManualReview = !isFinal;
                  if (isFinal) {
                    _latestFinalTranscript = cleaned;
                    _capturedStableFinalTranscript = true;
                    _latestTranscriptNeedsManualReview = false;
                  }
                  transcriptCapturedThisTake =
                      cleaned.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').length >=
                          2;
                });
              },
              onStatus: _handleSpeechStatus,
              onError: (error) {
                unawaited(_handleSpeechRuntimeError(error));
              },
            );

      recordingTicker?.cancel();
      currentRecordingDuration = Duration.zero;
      recordingTicker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() {
          currentRecordingDuration += const Duration(seconds: 1);
        });
      });

      widget.state.setAudioInputMode(speechReady
          ? 'Shared mic on tablet • live transcript active'
          : 'Shared mic on tablet • audio-only fallback');
      widget.onChanged();
      setState(() {
        isRecording = true;
        speechRecognitionActive = speechReady;
        _micPermissionState = AudioPermissionState.granted;
        microphoneStatus = _buildFallbackCaptureStatus(
          audioMessage:
              'Recording learner voice with $_recordingModeLabel${audioStarted.message == null ? '' : '. ${audioStarted.message}'}',
          speechReady: speechReady,
        );
      });
    } catch (error) {
      await speechTranscriptionService.cancel();
      await audioCaptureService.stop();
      setState(() {
        isRecording = false;
        speechRecognitionActive = false;
        liveTranscript = '';
        _latestFinalTranscript = '';
        if (error.toString().toLowerCase().contains('permission')) {
          _micPermissionState = AudioPermissionState.denied;
        }
        microphoneStatus = error.toString();
      });
    }
  }

  void _applyDegradedAudioRecovery() {
    final transcriptUnavailable = !speechRecognitionActive;
    final repeatedMisses = _consecutiveTranscriptMisses >= 2;
    if (!transcriptUnavailable && !repeatedMisses) return;

    final session = widget.state.activeSession;
    if (session != null && repeatedMisses) {
      widget.state.setPracticeMode(PracticeMode.repeatAfterMe);
    }

    if (_consecutiveTranscriptMisses >= 3 && isAutoMode) {
      isAutoMode = false;
      transcriptReviewPending = true;
      _autoPausedByTranscriptFailure = true;
    }
  }

  Future<void> _handleAutoRecoveryAfterMissedTranscript({
    required Duration savedDuration,
    required bool markReadyForResume,
  }) async {
    if (!mounted || !isAutoMode) return;

    if (savedDuration < _kMinimumUsefulRecording) {
      setState(() {
        microphoneStatus =
            'That take was very short (${formatDuration(savedDuration)}). Mallam will reopen the mic for a clearer answer.';
      });
      await _startRecordingIfPossible(
        fallbackMessage:
            'The last take was too short. The mic is reopening for a clearer answer.',
      );
      return;
    }

    final shouldPauseForManualAcceptance =
        _avoidConcurrentSpeechCapture || _consecutiveTranscriptMisses >= 2;
    if (shouldPauseForManualAcceptance) {
      setState(() {
        isAutoMode = false;
        transcriptReviewPending = true;
        _autoPausedByTranscriptFailure = _consecutiveTranscriptMisses >= 2;
        microphoneStatus = _avoidConcurrentSpeechCapture
            ? 'The learner audio is ready. Confirm it once, then keep the lesson moving.'
            : 'Transcript help missed that again. Check the saved audio once so the lesson does not get stuck in a retry loop.';
      });
      return;
    }

    if (_autoPausedByTranscriptFailure) {
      return;
    }

    final recoverySupport = _consecutiveTranscriptMisses >= 2 ? 'slow' : 'wait';
    final recoveryMessage = _consecutiveTranscriptMisses >= 2
        ? 'Transcript help missed that, so Mallam will say it slowly and reopen the mic.'
        : 'Transcript help missed that, so Mallam will pause briefly and reopen the mic.';

    if (markReadyForResume) {
      setState(() {
        microphoneStatus = recoveryMessage;
      });
    }
    await _runCoachSupport(recoverySupport);
  }

  void _resetTranscriptRecoveryState({bool clearReviewPending = false}) {
    _consecutiveTranscriptMisses = 0;
    _autoPausedByTranscriptFailure = false;
    if (clearReviewPending) {
      transcriptReviewPending = false;
    }
  }

  Future<bool> _retryTranscriptEngine({bool announceStatus = true}) async {
    final ready = await speechTranscriptionService.initialize(forceRetry: true);
    if (!mounted) return ready;
    setState(() {
      if (ready) {
        _resetTranscriptRecoveryState();
        microphoneStatus = announceStatus
            ? 'Transcript help is ready again. You can restart the hands-free loop.'
            : microphoneStatus;
      } else if (announceStatus) {
        microphoneStatus = speechTranscriptionService.availabilityLabel;
      }
    });
    return ready;
  }

  Future<void> _resumeHandsFreeLoop() async {
    if (isRecording || isSpeaking) return;
    final transcriptReady = await _retryTranscriptEngine(announceStatus: false);
    if (!mounted) return;
    setState(() {
      isAutoMode = true;
      _resumePromptPendingFromLifecycle = false;
      _resetTranscriptRecoveryState(clearReviewPending: true);
      microphoneStatus = transcriptReady
          ? 'Hands-free loop resumed. Mallam will replay this step and reopen the mic.'
          : 'Hands-free loop resumed in audio-first mode. Mallam will replay this step and keep saving learner audio until transcript help returns.';
    });
    _promptedCurrentStep = false;
    await _speakCurrentStepIfNeeded(force: true);
  }

  Future<void> stopRecording({bool markReadyForResume = true}) async {
    _speechAutoStopDebounce?.cancel();
    recordingTicker?.cancel();
    await speechTranscriptionService.stop();
    final transcript = (_latestFinalTranscript.isNotEmpty
            ? _latestFinalTranscript
            : liveTranscript)
        .trim();
    final expectedResponse = widget.state.personalizeExpectedResponse(
      widget.lesson.steps[widget.state.activeSession?.stepIndex ?? 0]
          .expectedResponse,
    );
    final transcriptSafetyReason = _buildTranscriptSafetyReason(
      transcript,
      expectedResponse,
    );
    final transcriptIsStable =
        transcript.isNotEmpty && _capturedStableFinalTranscript;
    final transcriptNeedsManualReview = transcript.isNotEmpty &&
        (!transcriptIsStable || transcriptSafetyReason != null);
    final wasSpeechRecognitionActive = speechRecognitionActive;
    final result = await audioCaptureService.stop();
    if (!mounted) return;

    setState(() {
      isRecording = false;
      speechRecognitionActive = false;
    });

    if (result == null) {
      setState(() {
        microphoneStatus = 'No learner audio was saved.';
      });
      return;
    }

    widget.state.attachLearnerAudioCapture(
      path: result.path,
      duration: result.duration,
      audioInputMode: wasSpeechRecognitionActive
          ? 'Shared mic on tablet • live transcript active'
          : 'Shared mic on tablet • audio-only fallback',
    );

    _latestTranscriptNeedsManualReview = transcriptNeedsManualReview;
    _transcriptAutoAdvanceSafetyReason = transcriptSafetyReason;

    if (transcript.isNotEmpty) {
      _resetTranscriptRecoveryState();
      responseController.text = transcript;
      transcriptReviewPending = !isAutoMode || transcriptNeedsManualReview;
      if (transcriptNeedsManualReview) {
        isAutoMode = false;
        _autoPausedByTranscriptFailure = true;
      }
    } else {
      _consecutiveTranscriptMisses += 1;
      final previousLearnerResponse =
          widget.state.activeSession?.latestLearnerResponse?.trim() ?? '';
      final draftMatchesOldTranscript =
          responseController.text.trim().isNotEmpty &&
              (responseController.text.trim() == previousLearnerResponse ||
                  responseController.text.trim() == liveTranscript.trim());
      if (draftMatchesOldTranscript) {
        responseController.clear();
      }
    }

    _applyDegradedAudioRecovery();

    widget.onChanged();
    setState(() {
      currentRecordingDuration = result.duration;
      final savedLabel = transcript.isNotEmpty
          ? (transcriptSafetyReason != null
              ? 'Learner voice saved (${formatDuration(result.duration)}). Transcript capture finished, but Lumo blocked auto-advance because the text looks incomplete for this step.'
              : transcriptNeedsManualReview
                  ? 'Learner voice saved (${formatDuration(result.duration)}). Lumo captured only a draft transcript, so it is waiting for a manual voice check before advancing.'
                  : 'Learner voice saved (${formatDuration(result.duration)}). Transcript captured and ready.')
          : 'Learner voice saved (${formatDuration(result.duration)}). No transcript was detected, so the app kept the audio and is ready for a manual check.';
      final recoveryLabel = transcriptNeedsManualReview
          ? ' Auto mode paused so the facilitator can verify the saved voice against the draft transcript.'
          : _consecutiveTranscriptMisses >= 3
              ? ' Auto mode paused after repeated transcript misses. Confirm the answer manually or keep teaching with audio-first support.'
              : _consecutiveTranscriptMisses >= 2
                  ? ' Transcript help is struggling, so Repeat mode is now active for a safer hands-free loop.'
                  : '';
      microphoneStatus = markReadyForResume && !transcriptReviewPending
          ? '$savedLabel Ready for Mallam or the next learner attempt.$recoveryLabel'
          : '$savedLabel$recoveryLabel';
    });

    if (transcript.isNotEmpty &&
        !transcriptNeedsManualReview &&
        isAutoMode &&
        !isProcessingTranscript) {
      isProcessingTranscript = true;
      try {
        await _handleSubmittedResponse(transcript, auto: true);
      } finally {
        isProcessingTranscript = false;
      }
      return;
    }

    if (transcript.isEmpty) {
      await _handleAutoRecoveryAfterMissedTranscript(
        savedDuration: result.duration,
        markReadyForResume: markReadyForResume,
      );
    }
  }

  String formatDuration(Duration duration) {
    final totalSeconds = duration.inSeconds <= 0 ? 1 : duration.inSeconds;
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    final paddedSeconds = seconds.toString().padLeft(2, '0');
    return minutes > 0 ? '$minutes:$paddedSeconds' : '0:$paddedSeconds';
  }

  String get _deviceLabel {
    if (kIsWeb) return 'Web browser';
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'Android device',
      TargetPlatform.iOS => 'iPhone or iPad',
      TargetPlatform.macOS => 'macOS desktop',
      TargetPlatform.windows => 'Windows desktop',
      TargetPlatform.linux => 'Linux desktop',
      TargetPlatform.fuchsia => 'Fuchsia device',
    };
  }

  Color _diagnosticToneColor(bool healthy, {bool warn = false}) {
    if (healthy) return LumoTheme.accentGreen;
    if (warn) return LumoTheme.accentOrange;
    return const Color(0xFFEF4444);
  }

  Widget _buildDiagnosticChip({
    required IconData icon,
    required String label,
    required bool healthy,
    bool warn = false,
  }) {
    final color = _diagnosticToneColor(healthy, warn: warn);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              label,
              style: TextStyle(color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceDiagnosticsPanel() {
    final session = widget.state.activeSession;
    final transcriptHealthy = speechTranscriptionService.isAvailable;
    final backendHealthy = widget.state.hasLiveBackendConnection;
    final syncWarn = widget.state.pendingSyncEvents.isNotEmpty ||
        widget.state.lastSyncError != null ||
        widget.state.lastSyncWarnings.isNotEmpty;
    final recordingHealthy =
        _recordingModeLabel.toLowerCase().contains('fallback') ? false : true;
    final micPermissionHealthy = _micPermissionGranted;
    final latestAudioPath = session?.latestLearnerAudioPath;
    final latestAudioDuration = session?.latestLearnerAudioDuration;
    final diagnosticCallouts = <String>[
      if (!micPermissionHealthy)
        _micPermissionState == AudioPermissionState.denied
            ? 'Mic access is blocked, so Mallam cannot capture a fresh learner take yet.'
            : 'Mic access has not been confirmed on this device yet.',
      if (!transcriptHealthy)
        'Transcript help is degraded, so saved learner audio is the source of truth for now.',
      if (_autoPausedByTranscriptFailure)
        'Hands-free paused itself safely after transcript trouble on this step.',
      if (!backendHealthy)
        widget.state.usingFallbackData
            ? 'Backend sync is offline, so this tablet is leaning on local fallback state.'
            : 'Backend sync is degraded, so roster freshness and lesson evidence may lag.',
      if (syncWarn)
        'Runtime sync still has warnings or queued events waiting to go upstream.',
      if (recordingHealthy &&
          micPermissionHealthy &&
          transcriptHealthy &&
          backendHealthy &&
          !syncWarn)
        'Recorder, transcript help, and backend sync all look steady right now.'
    ];
    final diagnosticsPayload = const JsonEncoder.withIndent('  ').convert({
      'device': _deviceLabel,
      'recordingMode': _recordingModeLabel,
      'micPermission': _micPermissionState.name,
      'speechAvailable': transcriptHealthy,
      'speechStatus': speechTranscriptionService.lastStatus,
      'speechAvailability': speechTranscriptionService.availabilityLabel,
      'backendConnected': backendHealthy,
      'backendStatus': widget.state.backendStatusLabel,
      'backendDetail': widget.state.backendStatusDetail,
      'runtimeSyncFeedback': widget.state.runtimeSyncFeedbackLabel,
      'pendingSyncEvents': widget.state.pendingSyncEvents.length,
      'syncReceipt': widget.state.syncReceiptLabel,
      'syncWarnings': widget.state.lastSyncWarnings,
      'lastSyncError': widget.state.lastSyncError,
      'transcriptMisses': _consecutiveTranscriptMisses,
      'autoMode': isAutoMode,
      'autoPausedByTranscriptFailure': _autoPausedByTranscriptFailure,
      'practiceMode': session?.practiceMode.name,
      'latestLearnerAudioPath': latestAudioPath,
      'latestLearnerAudioDurationSeconds': latestAudioDuration?.inSeconds,
    });

    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Browser + device diagnostics',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'Spot recorder, transcript, device, and backend trouble before the hands-free loop goes sideways.',
            style: const TextStyle(color: Color(0xFF475569), height: 1.4),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'What Lumo sees right now',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                ...diagnosticCallouts.take(3).map(
                      (callout) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 3),
                              child: Icon(
                                Icons.radio_button_checked_rounded,
                                size: 12,
                                color: Color(0xFF4338CA),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                callout,
                                style: const TextStyle(
                                  color: Color(0xFF334155),
                                  height: 1.35,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildDiagnosticChip(
                icon: Icons.devices_rounded,
                label: _deviceLabel,
                healthy: true,
              ),
              _buildDiagnosticChip(
                icon: Icons.mic_rounded,
                label: _recordingModeLabel,
                healthy: recordingHealthy,
                warn: !recordingHealthy,
              ),
              _buildDiagnosticChip(
                icon: Icons.perm_device_information_rounded,
                label: _micPermissionGranted
                    ? 'Mic permission granted'
                    : (_micPermissionState == AudioPermissionState.denied
                        ? 'Mic permission blocked'
                        : 'Mic permission unknown'),
                healthy: micPermissionHealthy,
                warn: !micPermissionHealthy,
              ),
              _buildDiagnosticChip(
                icon: Icons.subtitles_rounded,
                label: transcriptHealthy
                    ? 'Transcript help ready'
                    : 'Transcript fallback active',
                healthy: transcriptHealthy,
                warn: !transcriptHealthy,
              ),
              _buildDiagnosticChip(
                icon: Icons.smart_toy_rounded,
                label: _autoPausedByTranscriptFailure
                    ? 'Hands-free paused safely'
                    : (isAutoMode ? 'Hands-free active' : 'Manual review mode'),
                healthy: !_autoPausedByTranscriptFailure,
                warn: _autoPausedByTranscriptFailure || !isAutoMode,
              ),
              _buildDiagnosticChip(
                icon: Icons.cloud_done_rounded,
                label: backendHealthy
                    ? 'Backend sync live'
                    : (widget.state.usingFallbackData
                        ? 'Offline seed fallback'
                        : 'Backend sync degraded'),
                healthy: backendHealthy,
                warn: !backendHealthy,
              ),
              _buildDiagnosticChip(
                icon: Icons.receipt_long_rounded,
                label: widget.state.syncReceiptLabel,
                healthy: !syncWarn,
                warn: syncWarn,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Microphone: ${_micPermissionGranted ? 'Permission granted for learner capture.' : _micPermissionState == AudioPermissionState.denied ? 'Permission blocked. Open browser or device settings and allow the mic for this app.' : 'Permission state is still unknown until the recorder checks the device.'}',
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
          ),
          const SizedBox(height: 6),
          Text(
            'Transcript: ${speechTranscriptionService.availabilityLabel}',
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
          ),
          const SizedBox(height: 6),
          Text(
            'Backend: ${widget.state.backendStatusDetail}',
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
          ),
          const SizedBox(height: 6),
          Text(
            'Runtime sync: ${widget.state.runtimeSyncFeedbackLabel}',
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
          ),
          if (latestAudioPath != null || latestAudioDuration != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Latest learner capture',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (latestAudioDuration != null)
                    Text(
                      'Saved audio length: ${formatDuration(latestAudioDuration)}',
                      style: const TextStyle(
                        color: Color(0xFF475569),
                        height: 1.35,
                      ),
                    ),
                  if (latestAudioPath != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Saved securely for this step review.',
                        style: const TextStyle(
                          color: Color(0xFF475569),
                          height: 1.35,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFCD34D)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Recovery checklist',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF78350F),
                  ),
                ),
                const SizedBox(height: 8),
                ...widget.state.runtimeSyncActionItems().take(3).map(
                      (action) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 3),
                              child: Icon(
                                Icons.check_circle_outline_rounded,
                                size: 16,
                                color: Color(0xFFB45309),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                action,
                                style: const TextStyle(
                                  color: Color(0xFF92400E),
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                if (_consecutiveTranscriptMisses > 0)
                  Text(
                    'Transcript misses in this step: $_consecutiveTranscriptMisses',
                    style: const TextStyle(
                      color: Color(0xFF92400E),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
          ),
          if (widget.state.lastSyncError != null) ...[
            const SizedBox(height: 6),
            Text(
              'Latest sync error: ${widget.state.lastSyncError}',
              style: const TextStyle(color: Color(0xFFB45309), height: 1.35),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.tonalIcon(
                onPressed: isRecording ? null : () => _retryTranscriptEngine(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Refresh listening help'),
              ),
              if (widget.state.pendingSyncEvents.isNotEmpty)
                FilledButton.tonalIcon(
                  onPressed: widget.state.isSyncingEvents
                      ? null
                      : () async {
                          await widget.state.syncPendingEvents();
                          if (!mounted) return;
                          widget.onChanged();
                          setState(() {
                            microphoneStatus =
                                widget.state.runtimeSyncFeedbackLabel;
                          });
                        },
                  icon: const Icon(Icons.cloud_upload_rounded),
                  label: const Text('Sync runtime queue'),
                ),
              OutlinedButton.icon(
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  await ClipboardBridge.copy(diagnosticsPayload);
                  if (!mounted) return;
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Diagnostics copied for bug reporting.'),
                    ),
                  );
                },
                icon: const Icon(Icons.content_copy_rounded),
                label: const Text('Copy diagnostics'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String compactPath(String path) {
    final normalized = path.replaceAll('\\', '/');
    final segments =
        normalized.split('/').where((segment) => segment.isNotEmpty).toList();
    if (segments.length <= 2) return normalized;
    return '.../${segments[segments.length - 2]}/${segments.last}';
  }

  @override
  Widget build(BuildContext context) {
    final learner = widget.state.currentLearner!;
    final session = widget.state.activeSession!;
    final step = session.currentStep;
    final suggestions = widget.state.suggestedResponsesForCurrentStep();
    final expectedResponse =
        widget.state.personalizeExpectedResponse(step.expectedResponse);
    final stepLabel =
        'Step ${session.stepIndex + 1} of ${widget.lesson.steps.length}';
    final isStackedLayout = MediaQuery.sizeOf(context).width < 960;
    final sessionUsesCompactChrome =
        isStackedLayout || MediaQuery.sizeOf(context).height < 900;
    final currentActivity = step.activity;
    final isChoiceStep = _isChoiceActivityType(currentActivity?.type);
    final isListenRepeatStep =
        currentActivity?.type == LessonActivityType.listenRepeat;
    final isSimplifiedSpokenStep = isListenRepeatStep ||
        currentActivity?.type == LessonActivityType.listenAnswer ||
        currentActivity?.type == LessonActivityType.speakAnswer;
    final hasDraftResponse = responseController.text.trim().isNotEmpty;
    final canAdvanceChoiceStep =
        isChoiceStep && hasDraftResponse && !transcriptReviewPending;

    Widget buildChoiceSelectionPanel() {
      final activity = step.activity;
      if (activity == null) return const SizedBox.shrink();
      final rawChoiceItems = activity.choiceItems.isNotEmpty
          ? activity.choiceItems
          : List.generate(activity.choices.length, (index) {
              final choice = activity.choices[index];
              return LessonActivityChoice(
                id: 'choice-$index',
                label: choice,
                isCorrect: choice == activity.targetResponse,
              );
            });
      final choiceItems = rawChoiceItems.take(6).toList();
      final selectedChoiceLabel = responseController.text.trim();
      final choiceCount = _normalizedChoiceCount(choiceItems.length);

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFF),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFD7E3FF)),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final columns = _imageChoiceColumnCount(
              maxWidth: constraints.maxWidth,
              choiceCount: choiceItems.length,
            );
            final previewHeight = choiceCount <= 2
                ? 190.0
                : choiceCount >= 6
                    ? 132.0
                    : 148.0;
            final childAspectRatio = choiceCount <= 2
                ? (columns == 1 ? 1.55 : 1.18)
                : choiceCount >= 6
                    ? 0.86
                    : columns >= 3
                        ? 0.86
                        : 0.96;

            return GridView.builder(
              key: const ValueKey('choice-grid'),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: choiceItems.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: childAspectRatio,
              ),
              itemBuilder: (context, index) {
                final choiceItem = choiceItems[index];
                final emoji = index < activity.choiceEmoji.length
                    ? activity.choiceEmoji[index]
                    : '🖼️';
                final isSelected = selectedChoiceLabel.toLowerCase() ==
                    choiceItem.label.trim().toLowerCase();
                final hasAudio = _firstMediaOfKind(
                      choiceItem.mediaItems,
                      const ['audio'],
                    ) !=
                    null;
                return InkWell(
                  onTap: () => _setResponseAndMaybeSubmit(choiceItem.label),
                  borderRadius: BorderRadius.circular(28),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color:
                          isSelected ? const Color(0xFFEFF6FF) : Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: isSelected
                            ? const Color(0xFF2563EB)
                            : const Color(0xFFD7E3FF),
                        width: isSelected ? 3 : 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isSelected
                              ? const Color(0x1A2563EB)
                              : const Color(0x0D0F172A),
                          blurRadius: isSelected ? 24 : 12,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: Stack(
                            children: [
                              Positioned.fill(
                                child: _buildChoicePreview(
                                  choiceItem,
                                  emoji,
                                  imageHeight: previewHeight,
                                  borderRadius: 22,
                                ),
                              ),
                              if (isSelected)
                                Positioned(
                                  top: 12,
                                  right: 12,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF2563EB),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.check_rounded,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                        SizedBox(width: 6),
                                        Text(
                                          'Selected',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          choiceItem.label,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        if (hasAudio) ...[
                          const SizedBox(height: 12),
                          FilledButton.tonalIcon(
                            onPressed: () => _playChoiceMedia(choiceItem),
                            icon: const Icon(Icons.play_arrow_rounded),
                            label: const Text('Hear choice'),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      );
    }

    Widget buildListenRepeatPromptPanel() {
      final activity = step.activity;
      if (activity == null) return const SizedBox.shrink();
      final prompt = widget.state.personalizePrompt(activity.prompt);
      final focusText = activity.focusText == null
          ? null
          : widget.state.personalizeExpectedResponse(activity.focusText!);
      final supportText = activity.supportText == null
          ? null
          : widget.state.personalizeExpectedResponse(activity.supportText!);

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFF),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFD7E3FF)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              prompt,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                height: 1.35,
              ),
            ),
            if (focusText != null || activity.mediaValue != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: Text(
                  _learnerFacingCueText(focusText, activity.mediaValue) ??
                      'Audio cue ready',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF9A3412),
                  ),
                ),
              ),
            ],
            if (supportText != null && supportText.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                supportText,
                style: const TextStyle(
                  color: Color(0xFF475569),
                  height: 1.4,
                ),
              ),
            ],
            if (activity.mediaItems.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildSharedMediaGallery(activity),
            ],
          ],
        ),
      );
    }

    Widget buildLessonGuidePane() {
      final lessonStage = _MallamStageShell(
        eyebrow: 'Mallam',
        frameless: true,
        child: MallamPanel(
          instruction: lessonInstruction,
          onVoiceTap: () async {
            _promptedCurrentStep = false;
            await _speakCurrentStepIfNeeded(force: true);
            widget.onChanged();
            setState(() {});
          },
          prompt: widget.state.personalizePrompt(step.coachPrompt),
          speakerMode: session.speakerMode,
          statusLabel: _speakerModeLabel(session.speakerMode),
          secondaryStatus: stepLabel,
          voiceButtonLabel: 'Hear Mallam again',
          speakerOutputMode: session.speakerOutputMode,
          voiceHint: null,
          centerPortraitLayout: true,
          minimalStageLayout: true,
          framelessStage: true,
          framelessPortrait: true,
        ),
      );

      final hiddenLessonTools = isChoiceStep
          ? const SizedBox.shrink()
          : DetailCard(
              child: Theme(
                data: Theme.of(context)
                    .copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  childrenPadding: EdgeInsets.zero,
                  title: const Text(
                    'Show lesson map and exchange',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: const Text(
                    'Open only when you need step-by-step facilitator context.',
                    style: TextStyle(color: Color(0xFF64748B)),
                  ),
                  children: [
                    const SizedBox(height: 12),
                    _LessonStageStrip(
                      session: session,
                      lesson: widget.lesson,
                    ),
                    const SizedBox(height: 12),
                    _LessonTranscriptPanel(
                      session: session,
                      learnerName: learner.name,
                    ),
                  ],
                ),
              ),
            );

      final backButton = Align(
        alignment: Alignment.centerLeft,
        child: OutlinedButton.icon(
          onPressed: _confirmLeaveLessonSession,
          icon: const Icon(Icons.arrow_back_rounded),
          label: const Text('Back'),
        ),
      );

      if (isStackedLayout) {
        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              backButton,
              const SizedBox(height: 12),
              SizedBox(
                height: sessionUsesCompactChrome ? 500 : 560,
                child: lessonStage,
              ),
              if (!isChoiceStep) ...[
                const SizedBox(height: 12),
                hiddenLessonTools,
              ],
            ],
          ),
        );
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          backButton,
          const SizedBox(height: 12),
          Expanded(child: lessonStage),
          if (!isChoiceStep) ...[
            const SizedBox(height: 12),
            hiddenLessonTools,
          ],
        ],
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        unawaited(_confirmLeaveLessonSession());
      },
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(sessionUsesCompactChrome ? 16 : 20),
            child: _ResponsiveWorkspaceRow(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  flex: 1,
                  child: buildLessonGuidePane(),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 1,
                  child: DetailCard(
                    child: LayoutBuilder(
                      builder: (context, detailConstraints) {
                        final compactSessionHeader =
                            isStackedLayout || detailConstraints.maxWidth < 560;

                        final primaryAction = isChoiceStep
                            ? (canAdvanceChoiceStep
                                ? () async {
                                    final outcome =
                                        widget.state.submitLearnerResponse(
                                      responseController.text,
                                    );
                                    transcriptReviewPending = false;
                                    _latestTranscriptNeedsManualReview = false;
                                    widget.onChanged();
                                    if (!mounted) return;
                                    setState(() {
                                      microphoneStatus =
                                          outcome.automationStatus;
                                    });
                                    if (!outcome.accepted) {
                                      return;
                                    }
                                    await _afterCorrectResponse();
                                  }
                                : null)
                            : (transcriptReviewPending
                                ? (responseController.text.trim().isEmpty
                                    ? null
                                    : _confirmTranscriptAndAdvance)
                                : (isSimplifiedSpokenStep
                                    ? (_spokenStepReadyToContinue
                                        ? () async {
                                            final candidate = responseController
                                                    .text
                                                    .trim()
                                                    .isNotEmpty
                                                ? responseController.text.trim()
                                                : session.latestLearnerResponse
                                                        ?.trim() ??
                                                    '';
                                            final latestAccepted = session
                                                    .latestLearnerResponse
                                                    ?.trim() ??
                                                '';
                                            if (candidate.isNotEmpty &&
                                                candidate != latestAccepted) {
                                              await _handleSubmittedResponse(
                                                candidate,
                                              );
                                              if (!mounted ||
                                                  !_spokenStepReadyToContinue) {
                                                return;
                                              }
                                            }
                                            await _afterCorrectResponse();
                                          }
                                        : null)
                                    : (session.hasLearnerInput
                                        ? () async {
                                            await _afterCorrectResponse();
                                          }
                                        : null)));

                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: SingleChildScrollView(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!isChoiceStep &&
                                        !isSimplifiedSpokenStep) ...[
                                      Container(
                                        width: double.infinity,
                                        padding: EdgeInsets.all(
                                          compactSessionHeader ? 18 : 22,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF8FAFC),
                                          borderRadius:
                                              BorderRadius.circular(24),
                                          border: Border.all(
                                            color: const Color(0xFFE2E8F0),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              step.title,
                                              maxLines:
                                                  compactSessionHeader ? 2 : 3,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: compactSessionHeader
                                                    ? 24
                                                    : 28,
                                                fontWeight: FontWeight.w900,
                                                color: const Color(0xFF0F172A),
                                                height: 1.08,
                                              ),
                                            ),
                                            const SizedBox(height: 12),
                                            Text(
                                              step.instruction,
                                              style: const TextStyle(
                                                fontSize: 16,
                                                height: 1.45,
                                                color: Color(0xFF334155),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                    ],
                                    if (step.activity != null) ...[
                                      isChoiceStep
                                          ? buildChoiceSelectionPanel()
                                          : (isSimplifiedSpokenStep
                                              ? buildListenRepeatPromptPanel()
                                              : _buildActivityPanel(step)),
                                      const SizedBox(height: 16),
                                    ],
                                    if (!isChoiceStep)
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(20),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius:
                                              BorderRadius.circular(24),
                                          border: Border.all(
                                            color: const Color(0xFFE2E8F0),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            if (!isSimplifiedSpokenStep) ...[
                                              Text(
                                                _avoidConcurrentSpeechCapture
                                                    ? 'Learner response'
                                                    : 'Transcription',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 16,
                                                  color: Color(0xFF0F172A),
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(
                                                _avoidConcurrentSpeechCapture
                                                    ? (transcriptReviewPending
                                                        ? 'Listen to the saved learner voice, then type or confirm the answer here before Mallam continues.'
                                                        : (isRecording
                                                            ? 'Listening now and saving learner audio for manual review.'
                                                            : 'Start listening, capture the learner voice, then type or confirm the answer here.'))
                                                    : (transcriptReviewPending
                                                        ? 'Check the learner words here, then confirm before Mallam continues.'
                                                        : (isRecording
                                                            ? 'Listening to the learner now.'
                                                            : 'Start listening, capture the learner voice, then review the text here.')),
                                                style: const TextStyle(
                                                  color: Color(0xFF475569),
                                                  height: 1.35,
                                                ),
                                              ),
                                            ],
                                            if (!isSimplifiedSpokenStep) ...[
                                              const SizedBox(height: 14),
                                              Container(
                                                width: double.infinity,
                                                padding:
                                                    const EdgeInsets.all(16),
                                                decoration: BoxDecoration(
                                                  color: isRecording
                                                      ? const Color(0xFFFEF2F2)
                                                      : const Color(0xFFEFF6FF),
                                                  borderRadius:
                                                      BorderRadius.circular(20),
                                                  border: Border.all(
                                                    color: isRecording
                                                        ? const Color(
                                                            0xFFFCA5A5)
                                                        : const Color(
                                                            0xFF93C5FD),
                                                  ),
                                                ),
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Row(
                                                      children: [
                                                        Container(
                                                          padding:
                                                              const EdgeInsets
                                                                  .symmetric(
                                                            horizontal: 12,
                                                            vertical: 8,
                                                          ),
                                                          decoration:
                                                              BoxDecoration(
                                                            color: isRecording
                                                                ? const Color(
                                                                    0xFFDC2626,
                                                                  )
                                                                : const Color(
                                                                    0xFF2563EB,
                                                                  ),
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                                        999),
                                                          ),
                                                          child: Text(
                                                            isRecording
                                                                ? 'Stop listening'
                                                                : 'Start listening',
                                                            style:
                                                                const TextStyle(
                                                              color:
                                                                  Colors.white,
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800,
                                                            ),
                                                          ),
                                                        ),
                                                        const SizedBox(
                                                            width: 10),
                                                        Expanded(
                                                          child: Text(
                                                            _listeningReadinessHeadline,
                                                            style:
                                                                const TextStyle(
                                                              fontSize: 16,
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800,
                                                              color: Color(
                                                                0xFF0F172A,
                                                              ),
                                                            ),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 8),
                                                    Text(
                                                      _listeningReadinessBody,
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF475569),
                                                        height: 1.4,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 14),
                                                    Wrap(
                                                      spacing: 12,
                                                      runSpacing: 12,
                                                      children: [
                                                        FilledButton.icon(
                                                          onPressed: isRecording ||
                                                                  !_micPermissionGranted
                                                              ? null
                                                              : startRecording,
                                                          icon: const Icon(
                                                            Icons.mic_rounded,
                                                          ),
                                                          label: Text(
                                                            _listeningStartButtonLabel,
                                                          ),
                                                        ),
                                                        FilledButton.icon(
                                                          onPressed: isRecording
                                                              ? stopRecording
                                                              : null,
                                                          style: FilledButton
                                                              .styleFrom(
                                                            backgroundColor:
                                                                const Color(
                                                              0xFFDC2626,
                                                            ),
                                                            foregroundColor:
                                                                Colors.white,
                                                          ),
                                                          icon: const Icon(
                                                            Icons.stop_rounded,
                                                          ),
                                                          label: const Text(
                                                            'Stop listening',
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                            const SizedBox(height: 14),
                                            if (isSimplifiedSpokenStep) ...[
                                              Text(
                                                _avoidConcurrentSpeechCapture
                                                    ? 'Learner response'
                                                    : 'Learner transcript',
                                                style: const TextStyle(
                                                  color: Color(0xFF0F172A),
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 16,
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(
                                                _avoidConcurrentSpeechCapture
                                                    ? (transcriptReviewPending
                                                        ? 'Listen to the saved learner voice, then type or confirm the answer here before Mallam continues.'
                                                        : (isRecording
                                                            ? 'Listening now and saving learner audio for manual review.'
                                                            : 'Capture the learner answer, then type or confirm it here.'))
                                                    : (transcriptReviewPending
                                                        ? 'Check the learner words here, then confirm before Mallam continues.'
                                                        : (isRecording
                                                            ? 'Listening to the learner now.'
                                                            : 'Capture the learner answer, then confirm the transcript here.')),
                                                style: const TextStyle(
                                                  color: Color(0xFF475569),
                                                  height: 1.35,
                                                ),
                                              ),
                                            ] else
                                              Wrap(
                                                spacing: 10,
                                                runSpacing: 10,
                                                children: [
                                                  Container(
                                                    padding: const EdgeInsets
                                                        .symmetric(
                                                      horizontal: 12,
                                                      vertical: 8,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: const Color(
                                                        0xFFF1F5F9,
                                                      ),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                        999,
                                                      ),
                                                    ),
                                                    child: const Text(
                                                      'Learner transcript',
                                                      style: TextStyle(
                                                        color:
                                                            Color(0xFF334155),
                                                        fontWeight:
                                                            FontWeight.w800,
                                                      ),
                                                    ),
                                                  ),
                                                  Container(
                                                    padding: const EdgeInsets
                                                        .symmetric(
                                                      horizontal: 12,
                                                      vertical: 8,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: const Color(
                                                        0xFFEFF6FF,
                                                      ),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                        999,
                                                      ),
                                                    ),
                                                    child: const Text(
                                                      'Learner response',
                                                      style: TextStyle(
                                                        color:
                                                            Color(0xFF1D4ED8),
                                                        fontWeight:
                                                            FontWeight.w800,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            const SizedBox(height: 10),
                                            TextField(
                                              controller: responseController,
                                              onChanged: (_) => setState(() {}),
                                              maxLines: 4,
                                              decoration: InputDecoration(
                                                hintText:
                                                    _learnerResponseHintText,
                                                filled: true,
                                                fillColor:
                                                    const Color(0xFFF8FAFC),
                                                border: OutlineInputBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                ),
                                                enabledBorder:
                                                    OutlineInputBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                  borderSide: const BorderSide(
                                                    color: Color(0xFFE2E8F0),
                                                  ),
                                                ),
                                              ),
                                            ),
                                            if (isSimplifiedSpokenStep &&
                                                (liveTranscript.isNotEmpty ||
                                                    responseController.text
                                                        .trim()
                                                        .isNotEmpty ||
                                                    speechRecognitionActive ||
                                                    transcriptReviewPending)) ...[
                                              const SizedBox(height: 12),
                                              Container(
                                                width: double.infinity,
                                                padding:
                                                    const EdgeInsets.all(14),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFEEF2FF),
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                  border: Border.all(
                                                    color: const Color(
                                                      0xFFC7D2FE,
                                                    ),
                                                  ),
                                                ),
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      speechRecognitionActive
                                                          ? 'Live listen feed'
                                                          : 'Captured transcript',
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF1D4ED8),
                                                        fontWeight:
                                                            FontWeight.w800,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 6),
                                                    Text(
                                                      liveTranscript.isNotEmpty
                                                          ? liveTranscript
                                                          : responseController
                                                                  .text
                                                                  .trim()
                                                                  .isNotEmpty
                                                              ? responseController
                                                                  .text
                                                                  .trim()
                                                              : speechRecognitionActive
                                                                  ? 'Listening for the learner...'
                                                                  : 'Learner audio was captured. Confirm or edit the transcript here before Mallam continues.',
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF4338CA),
                                                        height: 1.4,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                            if (isSimplifiedSpokenStep &&
                                                !transcriptReviewPending &&
                                                !_spokenStepReadyToContinue) ...[
                                              const SizedBox(height: 12),
                                              Container(
                                                width: double.infinity,
                                                padding:
                                                    const EdgeInsets.all(14),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFFFF7ED),
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                  border: Border.all(
                                                    color: const Color(
                                                      0xFFFED7AA,
                                                    ),
                                                  ),
                                                ),
                                                child: Text(
                                                  _spokenStepBlockedFeedback,
                                                  style: const TextStyle(
                                                    color: Color(0xFF9A3412),
                                                    height: 1.4,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                              ),
                                            ],
                                            if (isSimplifiedSpokenStep) ...[
                                              const SizedBox(height: 12),
                                              Wrap(
                                                spacing: 12,
                                                runSpacing: 12,
                                                children: [
                                                  FilledButton.icon(
                                                    onPressed: isRecording ||
                                                            !_micPermissionGranted
                                                        ? null
                                                        : startRecording,
                                                    icon: const Icon(
                                                      Icons.mic_rounded,
                                                    ),
                                                    label: Text(
                                                      _listeningStartButtonLabel,
                                                    ),
                                                  ),
                                                  FilledButton.icon(
                                                    onPressed: isRecording
                                                        ? stopRecording
                                                        : null,
                                                    style:
                                                        FilledButton.styleFrom(
                                                      backgroundColor:
                                                          const Color(
                                                              0xFFDC2626),
                                                      foregroundColor:
                                                          Colors.white,
                                                    ),
                                                    icon: const Icon(
                                                      Icons.stop_rounded,
                                                    ),
                                                    label: const Text(
                                                      'Stop listening',
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                            const SizedBox(height: 12),
                                            if (!isSimplifiedSpokenStep)
                                              Container(
                                                width: double.infinity,
                                                padding:
                                                    const EdgeInsets.all(14),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFF8FAFC),
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                  border: Border.all(
                                                    color:
                                                        const Color(0xFFE2E8F0),
                                                  ),
                                                ),
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      'Session pulse • ${widget.state.currentLearner?.name.split(' ').first ?? 'Learner'}',
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF64748B),
                                                        fontWeight:
                                                            FontWeight.w700,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 10),
                                                    Container(
                                                      padding: const EdgeInsets
                                                          .symmetric(
                                                        horizontal: 10,
                                                        vertical: 6,
                                                      ),
                                                      decoration: BoxDecoration(
                                                        color: const Color(
                                                          0xFFEFF6FF,
                                                        ),
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(
                                                          999,
                                                        ),
                                                      ),
                                                      child: Text(
                                                        _lessonModeLabel,
                                                        style: const TextStyle(
                                                          color:
                                                              Color(0xFF1D4ED8),
                                                          fontWeight:
                                                              FontWeight.w800,
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(height: 10),
                                                    Text(
                                                      _sessionStatusHeadline,
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF0F172A),
                                                        fontWeight:
                                                            FontWeight.w800,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 6),
                                                    Text(
                                                      _sessionStatusBody,
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF475569),
                                                        height: 1.35,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 10),
                                                    Wrap(
                                                      spacing: 8,
                                                      runSpacing: 8,
                                                      children: [
                                                        Container(
                                                          padding:
                                                              const EdgeInsets
                                                                  .symmetric(
                                                            horizontal: 10,
                                                            vertical: 6,
                                                          ),
                                                          decoration:
                                                              BoxDecoration(
                                                            color: const Color(
                                                              0xFFEFF6FF,
                                                            ),
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                              999,
                                                            ),
                                                          ),
                                                          child: Text(
                                                            _transcriptSourceOfTruthLabel,
                                                            style:
                                                                const TextStyle(
                                                              color: Color(
                                                                0xFF1D4ED8,
                                                              ),
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800,
                                                            ),
                                                          ),
                                                        ),
                                                        Container(
                                                          padding:
                                                              const EdgeInsets
                                                                  .symmetric(
                                                            horizontal: 10,
                                                            vertical: 6,
                                                          ),
                                                          decoration:
                                                              BoxDecoration(
                                                            color: const Color(
                                                              0xFFF8FAFC,
                                                            ),
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                              999,
                                                            ),
                                                            border: Border.all(
                                                              color:
                                                                  const Color(
                                                                0xFFE2E8F0,
                                                              ),
                                                            ),
                                                          ),
                                                          child: Text(
                                                            _automationSafetyLabel,
                                                            style:
                                                                const TextStyle(
                                                              color: Color(
                                                                0xFF334155,
                                                              ),
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800,
                                                            ),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            if (!isSimplifiedSpokenStep &&
                                                (liveTranscript.isNotEmpty ||
                                                    speechRecognitionActive)) ...[
                                              const SizedBox(height: 12),
                                              Container(
                                                width: double.infinity,
                                                padding:
                                                    const EdgeInsets.all(14),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFEEF2FF),
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                  border: Border.all(
                                                    color: const Color(
                                                      0xFFC7D2FE,
                                                    ),
                                                  ),
                                                ),
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    const Text(
                                                      'Live listen feed',
                                                      style: TextStyle(
                                                        color:
                                                            Color(0xFF1D4ED8),
                                                        fontWeight:
                                                            FontWeight.w800,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 6),
                                                    Text(
                                                      liveTranscript.isEmpty
                                                          ? 'Listening for the learner...'
                                                          : liveTranscript,
                                                      style: const TextStyle(
                                                        color:
                                                            Color(0xFF4338CA),
                                                        height: 1.4,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                            if (transcriptReviewPending &&
                                                session.latestLearnerAudioPath !=
                                                    null) ...[
                                              const SizedBox(height: 12),
                                              FilledButton.tonalIcon(
                                                onPressed:
                                                    _toggleSavedAudioPlayback,
                                                icon: Icon(
                                                  learnerAudioPlaybackService
                                                          .isPlaying
                                                      ? Icons
                                                          .pause_circle_rounded
                                                      : Icons
                                                          .play_circle_fill_rounded,
                                                ),
                                                label: Text(
                                                  learnerAudioPlaybackService
                                                          .isPlaying
                                                      ? 'Pause saved voice'
                                                      : 'Play saved voice',
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(
                                                _isAudioOnlyReviewState
                                                    ? 'Use the saved clip as the source of truth before Mallam continues.'
                                                    : 'Quick audio check first, then confirm the text.',
                                                style: const TextStyle(
                                                  color: Color(0xFF475569),
                                                  fontWeight: FontWeight.w600,
                                                  height: 1.35,
                                                ),
                                              ),
                                              if (_savedAudioEvidenceLabel !=
                                                  null) ...[
                                                const SizedBox(height: 8),
                                                Text(
                                                  _savedAudioEvidenceLabel!,
                                                  style: const TextStyle(
                                                    color: Color(0xFF64748B),
                                                    fontWeight: FontWeight.w600,
                                                    height: 1.35,
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              key: isChoiceStep
                                  ? const ValueKey('choice-cta-row')
                                  : null,
                              children: [
                                if (isChoiceStep)
                                  Expanded(
                                    child: Text(
                                      hasDraftResponse
                                          ? responseController.text
                                          : 'Choose one object to continue',
                                      style: TextStyle(
                                        color: hasDraftResponse
                                            ? const Color(0xFF0F172A)
                                            : const Color(0xFF64748B),
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                if (isChoiceStep) const SizedBox(width: 12),
                                Expanded(
                                  child: FilledButton(
                                    onPressed: primaryAction,
                                    style: FilledButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 18,
                                        vertical: 18,
                                      ),
                                      textStyle: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    child: Text(
                                      transcriptReviewPending
                                          ? _reviewPrimaryCtaLabel
                                          : (session.isLastStep
                                              ? 'Finish lesson'
                                              : 'Continue'),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _speakerModeLabel(SpeakerMode mode) {
    switch (mode) {
      case SpeakerMode.guiding:
        return 'Mallam is guiding';
      case SpeakerMode.listening:
        return 'Mallam is listening';
      case SpeakerMode.affirming:
        return 'Mallam is affirming';
      case SpeakerMode.waiting:
        return 'Mallam is waiting';
      case SpeakerMode.idle:
        return 'Mallam is idle';
    }
  }
}

class ResponsivePane extends StatelessWidget {
  final int flex;
  final Widget child;

  const ResponsivePane({
    super.key,
    this.flex = 1,
    required this.child,
  });

  @override
  Widget build(BuildContext context) => child;
}

class _ResponsiveWorkspaceRow extends StatelessWidget {
  final List<Widget> children;
  final CrossAxisAlignment crossAxisAlignment;
  const _ResponsiveWorkspaceRow({
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
  });

  List<Widget> _layoutChildrenForRow() {
    return List.generate(children.length, (index) {
      final child = children[index];
      return child is ResponsivePane
          ? Expanded(flex: child.flex, child: child.child)
          : child;
    });
  }

  List<Widget> _layoutChildrenForColumn(double viewportHeight) {
    final resolvedViewportHeight =
        viewportHeight.isFinite && viewportHeight > 0 ? viewportHeight : 900.0;
    final paneHeight = resolvedViewportHeight.clamp(820.0, 1180.0).toDouble();

    return List.generate(children.length, (index) {
      final child = children[index];
      final isPane = switch (child) {
        ResponsivePane() => true,
        Expanded() => true,
        Flexible() => true,
        _ => false,
      };
      final columnChild = switch (child) {
        ResponsivePane() => child.child,
        Expanded() => child.child,
        Flexible() => child.child,
        _ => child,
      };
      return isPane
          ? SizedBox(
              height: paneHeight,
              child: columnChild,
            )
          : columnChild;
    });
  }

  @override
  Widget build(BuildContext context) {
    const breakpoint = 960.0;

    return LayoutBuilder(
      builder: (context, constraints) {
        final hasRoom = constraints.maxWidth >= breakpoint;

        if (hasRoom) {
          return Row(
            crossAxisAlignment: crossAxisAlignment,
            children: _layoutChildrenForRow(),
          );
        }

        final stackedChildren = _layoutChildrenForColumn(
          constraints.maxHeight,
        );
        return ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(
            scrollbars: false,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < stackedChildren.length; i++) ...[
                  stackedChildren[i],
                  if (i < stackedChildren.length - 1)
                    const SizedBox(height: 20),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

int _adaptiveGridCount(
  double maxWidth, {
  required double minTileWidth,
  int maxCount = 4,
}) {
  if (maxWidth <= 0) return 1;
  final rawCount = (maxWidth / minTileWidth).floor();
  return rawCount.clamp(1, maxCount);
}

class LessonCompletePage extends StatefulWidget {
  final LumoAppState state;
  final LessonCardModel lesson;
  final bool revealWithCountdown;

  const LessonCompletePage({
    super.key,
    required this.state,
    required this.lesson,
    this.revealWithCountdown = false,
  });

  @override
  State<LessonCompletePage> createState() => _LessonCompletePageState();
}

class _LessonCompletePageState extends State<LessonCompletePage>
    with SingleTickerProviderStateMixin {
  static const int _revealSeconds = 3;

  late final AnimationController _confettiController;
  late final AudioPlayer _celebrationPlayer;
  Timer? _revealTimer;
  int _secondsRemaining = _revealSeconds;
  bool _resultsVisible = false;

  @override
  void initState() {
    super.initState();
    _confettiController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    );
    _celebrationPlayer = AudioPlayer();
    if (widget.revealWithCountdown) {
      _startRevealCountdown();
    } else {
      _secondsRemaining = 0;
      _resultsVisible = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _confettiController.forward(from: 0);
        unawaited(_playCelebrationSound());
      });
    }
  }

  void _startRevealCountdown() {
    _revealTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (!mounted) return;
      if (_secondsRemaining <= 1) {
        timer.cancel();
        await _revealResults();
        return;
      }
      setState(() {
        _secondsRemaining -= 1;
      });
    });
  }

  Future<void> _revealResults() async {
    if (_resultsVisible) return;
    setState(() {
      _secondsRemaining = 0;
      _resultsVisible = true;
    });
    _confettiController.forward(from: 0);
    await _playCelebrationSound();
  }

  Future<void> _playCelebrationSound() async {
    try {
      await _celebrationPlayer.play(
        AssetSource('audio/lesson_complete_chime.wav'),
        mode: PlayerMode.lowLatency,
      );
    } catch (_) {
      await SystemSound.play(SystemSoundType.alert);
    }
  }

  @override
  void dispose() {
    _revealTimer?.cancel();
    _confettiController.dispose();
    unawaited(_celebrationPlayer.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final learner = widget.state.currentLearner!;
    final session = widget.state.activeSession!;
    final lesson = widget.lesson;
    final nextLesson = widget.state.nextLessonAfterCompletion(
      learner,
      completedLessonId: lesson.id,
    );
    final recommendedModule = widget.state.recommendedModuleForLearner(learner);
    final routeSummary = widget.state.nextLessonRouteSummaryForLearner(
      learner,
      completedLessonId: lesson.id,
    );
    final rewards = learner.rewards;
    final unlockedBadges =
        rewards?.badges.where((badge) => badge.earned).toList() ?? const [];

    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: AnimatedOpacity(
                  opacity: _resultsVisible ? 1 : 0,
                  duration: const Duration(milliseconds: 500),
                  child: _CelebrationConfettiOverlay(
                    controller: _confettiController,
                  ),
                ),
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 450),
              switchInCurve: Curves.easeOut,
              switchOutCurve: Curves.easeIn,
              child: _resultsVisible
                  ? SingleChildScrollView(
                      key: const ValueKey('lesson-complete-results'),
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 760),
                          child: DetailCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircleAvatar(
                                  radius: 40,
                                  backgroundColor: Color(0xFFDCFCE7),
                                  child: Icon(
                                    Icons.check_rounded,
                                    color: Colors.green,
                                    size: 46,
                                  ),
                                ),
                                const SizedBox(height: 20),
                                Text(
                                  widget.state
                                      .rewardCelebrationHeadlineForLearner(
                                          learner),
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 30,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'You completed ${lesson.title}. ${widget.state.rewardCelebrationDetailForLearner(learner)}',
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 16),
                                LayoutBuilder(
                                  builder: (context, constraints) {
                                    final compact = constraints.maxWidth < 720;
                                    final tiles = [
                                      MetricTile(
                                        label: 'Responses captured',
                                        value: '${session.totalResponses}',
                                        icon: Icons.hearing_rounded,
                                        color: LumoTheme.primary,
                                      ),
                                      MetricTile(
                                        label: 'Support actions',
                                        value: '${session.supportActionsUsed}',
                                        icon: Icons.volunteer_activism_rounded,
                                        color: LumoTheme.accentOrange,
                                      ),
                                      MetricTile(
                                        label: 'Queued sync',
                                        value:
                                            '${widget.state.pendingSyncEvents.length}',
                                        icon: Icons.cloud_upload_rounded,
                                        color: LumoTheme.accentGreen,
                                      ),
                                    ];

                                    if (compact) {
                                      return Column(
                                        children: [
                                          for (var i = 0;
                                              i < tiles.length;
                                              i++) ...[
                                            SizedBox(
                                              width: double.infinity,
                                              child: tiles[i],
                                            ),
                                            if (i < tiles.length - 1)
                                              const SizedBox(height: 12),
                                          ],
                                        ],
                                      );
                                    }

                                    return Row(
                                      children: [
                                        for (var i = 0;
                                            i < tiles.length;
                                            i++) ...[
                                          Expanded(child: tiles[i]),
                                          if (i < tiles.length - 1)
                                            const SizedBox(width: 12),
                                        ],
                                      ],
                                    );
                                  },
                                ),
                                const SizedBox(height: 20),
                                if (rewards != null) ...[
                                  SoftPanel(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Row(
                                          children: [
                                            Icon(Icons.auto_awesome_rounded,
                                                color: LumoTheme.accentOrange),
                                            SizedBox(width: 8),
                                            Text(
                                              'Reward boost',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 18,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        Wrap(
                                          spacing: 12,
                                          runSpacing: 12,
                                          children: [
                                            Chip(
                                              avatar: const Icon(
                                                  Icons.stars_rounded,
                                                  size: 18),
                                              label:
                                                  Text('${rewards.points} pts'),
                                            ),
                                            Chip(
                                              avatar: const Icon(
                                                  Icons.trending_up_rounded,
                                                  size: 18),
                                              label: Text(
                                                  '${rewards.levelLabel} • Level ${rewards.level}'),
                                            ),
                                            Chip(
                                              avatar: const Icon(
                                                  Icons
                                                      .workspace_premium_rounded,
                                                  size: 18),
                                              label: Text(
                                                unlockedBadges.isEmpty
                                                    ? 'First badge loading'
                                                    : '${unlockedBadges.length} badge(s) unlocked',
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        LinearProgressIndicator(
                                          value: rewards.progressToNextLevel,
                                          minHeight: 10,
                                          borderRadius: const BorderRadius.all(
                                            Radius.circular(999),
                                          ),
                                          backgroundColor:
                                              const Color(0xFFE2E8F0),
                                          valueColor:
                                              const AlwaysStoppedAnimation<
                                                  Color>(
                                            LumoTheme.accentOrange,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          rewards.nextLevelLabel == null
                                              ? 'Top celebration band reached. Keep the streak alive.'
                                              : '${rewards.xpForNextLevel} XP to ${rewards.nextLevelLabel}',
                                        ),
                                        if (unlockedBadges.isNotEmpty) ...[
                                          const SizedBox(height: 12),
                                          Wrap(
                                            spacing: 8,
                                            runSpacing: 8,
                                            children: unlockedBadges
                                                .take(3)
                                                .map(
                                                  (badge) => Chip(
                                                    avatar: const Icon(
                                                      Icons
                                                          .emoji_events_rounded,
                                                      size: 18,
                                                      color: LumoTheme
                                                          .accentOrange,
                                                    ),
                                                    label: Text(badge.title),
                                                  ),
                                                )
                                                .toList(),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                ],
                                SoftPanel(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.route_rounded,
                                              color: LumoTheme.primary),
                                          SizedBox(width: 8),
                                          Text(
                                            'Next lesson routing',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 18,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Text(routeSummary),
                                      const SizedBox(height: 12),
                                      LabelValueWrap(
                                        items: [
                                          (
                                            'Backend route',
                                            widget.state
                                                .backendRoutingSummaryForLearner(
                                                    learner),
                                          ),
                                          (
                                            'Recommended subject',
                                            recommendedModule.title,
                                          ),
                                          (
                                            'Next lesson',
                                            nextLesson?.title ??
                                                'Open subject to choose',
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 24),
                                _ResponsiveButtonRow(
                                  primary: FilledButton(
                                    onPressed: () {
                                      widget.state.selectLearner(learner);
                                      widget.state
                                          .selectModule(recommendedModule);
                                      if (nextLesson != null) {
                                        Navigator.of(context).pushReplacement(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                LessonLaunchSetupPage(
                                              state: widget.state,
                                              onChanged: () {},
                                              lesson: nextLesson,
                                              module: recommendedModule,
                                            ),
                                          ),
                                        );
                                        return;
                                      }
                                      Navigator.of(context).pushReplacement(
                                        MaterialPageRoute(
                                          builder: (_) => SubjectModulesPage(
                                            state: widget.state,
                                            onChanged: () {},
                                            module: recommendedModule,
                                          ),
                                        ),
                                      );
                                    },
                                    child: const Text(
                                      'Go to next learner',
                                    ),
                                  ),
                                  secondary: OutlinedButton(
                                    onPressed: () {
                                      Navigator.of(context)
                                          .popUntil((route) => route.isFirst);
                                    },
                                    child: const Text('Go home'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    )
                  : Center(
                      key: const ValueKey('lesson-complete-countdown'),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 620),
                          child: DetailCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 108,
                                  height: 108,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEEF2FF),
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    '$_secondsRemaining',
                                    style: const TextStyle(
                                      fontSize: 44,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF312E81),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 22),
                                Text(
                                  'Nice work, ${learner.name.split(' ').first}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Mallam is getting your celebration ready. Full results will appear in a moment.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 22),
                                const Text(
                                  'Results unlock in about 3 seconds',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 22),
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton.icon(
                                    onPressed: _revealResults,
                                    icon: const Icon(Icons.celebration_rounded),
                                    label: const Text('Show results now'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CelebrationConfettiOverlay extends StatelessWidget {
  final Animation<double> controller;

  const _CelebrationConfettiOverlay({required this.controller});

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          return CustomPaint(
            painter: _CelebrationConfettiPainter(progress: controller.value),
            child: const SizedBox.expand(),
          );
        },
      ),
    );
  }
}

class _CelebrationConfettiPainter extends CustomPainter {
  final double progress;

  const _CelebrationConfettiPainter({required this.progress});

  static const _colors = [
    Color(0xFF4338CA),
    Color(0xFFF97316),
    Color(0xFF22C55E),
    Color(0xFFEAB308),
    Color(0xFFEC4899),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    for (var index = 0; index < 42; index++) {
      final color = _colors[index % _colors.length];
      final lane = (index * 0.173) % 1;
      final swaySeed = (index % 7) + 1;
      final drop = ((progress + (index * 0.037)) % 1.0);
      final x = lane * size.width +
          math.sin((progress * math.pi * 2) + index) * (10 + swaySeed * 2);
      final y = -24 + drop * (size.height + 80);
      final width = 8 + (index % 4) * 2.0;
      final height = 12 + (index % 5) * 2.0;

      canvas.save();
      canvas.translate(x.clamp(-24, size.width + 24), y);
      canvas.rotate((progress * math.pi * 4) + (index * 0.31));
      paint.color = color.withValues(alpha: 0.9);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset.zero,
            width: width,
            height: height,
          ),
          const Radius.circular(3),
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _CelebrationConfettiPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

class _ResponsiveButtonRow extends StatelessWidget {
  final Widget primary;
  final Widget secondary;

  const _ResponsiveButtonRow({
    required this.primary,
    required this.secondary,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 560;
        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              secondary,
              const SizedBox(height: 12),
              primary,
            ],
          );
        }

        return Row(
          children: [
            Expanded(child: secondary),
            const SizedBox(width: 12),
            Expanded(child: primary),
          ],
        );
      },
    );
  }
}

class _LessonStageStrip extends StatelessWidget {
  final LessonSessionState session;
  final LessonCardModel lesson;

  const _LessonStageStrip({
    required this.session,
    required this.lesson,
  });

  @override
  Widget build(BuildContext context) {
    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Lesson map',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: List.generate(lesson.steps.length, (index) {
              final item = lesson.steps[index];
              final isActive = index == session.stepIndex;
              final isDone = index < session.stepIndex;
              final color = isActive
                  ? LumoTheme.primary
                  : (isDone ? LumoTheme.accentGreen : const Color(0xFF94A3B8));
              final icon = isDone
                  ? Icons.check_rounded
                  : (isActive
                      ? Icons.play_arrow_rounded
                      : Icons.radio_button_unchecked_rounded);

              return Container(
                constraints: const BoxConstraints(minWidth: 150, maxWidth: 220),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withValues(alpha: 0.18)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: color, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Step ${index + 1}',
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.title,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _LessonTranscriptPanel extends StatefulWidget {
  final LessonSessionState session;
  final String learnerName;

  const _LessonTranscriptPanel({
    required this.session,
    required this.learnerName,
  });

  @override
  State<_LessonTranscriptPanel> createState() => _LessonTranscriptPanelState();
}

class _LessonTranscriptPanelState extends State<_LessonTranscriptPanel> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final turns =
        widget.session.transcript.reversed.take(4).toList().reversed.toList();

    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        AnimatedRotation(
                          duration: const Duration(milliseconds: 180),
                          turns: _isExpanded ? 0.5 : 0,
                          child: Icon(
                            Icons.keyboard_arrow_down_rounded,
                            color: Colors.black.withValues(alpha: 0.7),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Live exchange',
                          style: TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                  StatusPill(
                    text: '${widget.session.transcript.length} turns',
                    color: LumoTheme.primary,
                  ),
                ],
              ),
            ),
          ),
          if (_isExpanded) ...[
            const SizedBox(height: 12),
            ...turns.map((turn) {
              final isMallam = turn.speaker == 'Mallam';
              final speaker = isMallam ? 'Mallam' : widget.learnerName;
              final color =
                  isMallam ? LumoTheme.primary : LumoTheme.accentGreen;
              return Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      speaker,
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(turn.text),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}

class _RosterFreshnessBanner extends StatelessWidget {
  final LumoAppState state;

  const _RosterFreshnessBanner({required this.state});

  @override
  Widget build(BuildContext context) {
    final isFallback = state.usingFallbackData;
    final color = isFallback ? LumoTheme.accentOrange : LumoTheme.accentGreen;
    final icon =
        isFallback ? Icons.warning_amber_rounded : Icons.update_rounded;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  state.rosterFreshnessLabel,
                  style: TextStyle(fontWeight: FontWeight.w800, color: color),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.72),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withValues(alpha: 0.16)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.schedule_rounded, size: 18, color: color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    state.trustedSyncHeadline,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: color,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            state.rosterFreshnessDetail,
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              StatusPill(
                text: state.rosterFreshnessLabel,
                color: color,
              ),
              StatusPill(
                text: state.syncQueueLabel,
                color: color,
              ),
              StatusPill(
                text: state.lastSyncSummaryLabel,
                color: color,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BackendStatusBanner extends StatelessWidget {
  final LumoAppState state;

  const _BackendStatusBanner({
    required this.state,
  });

  @override
  Widget build(BuildContext context) {
    final isLive = !state.usingFallbackData && state.lastSyncedAt != null;
    final hasCriticalSyncBlocker = state.hasCriticalSyncTrustBlocker;
    final blockerReason = state.criticalSyncTrustBlockerReason;
    final color = hasCriticalSyncBlocker
        ? const Color(0xFFB91C1C)
        : isLive
            ? LumoTheme.accentGreen
            : (state.isBootstrapping
                ? LumoTheme.primary
                : LumoTheme.accentOrange);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isLive ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
                color: color,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  state.backendStatusLabel,
                  style: TextStyle(fontWeight: FontWeight.w800, color: color),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            state.backendStatusDetail,
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              StatusPill(
                text: state.syncQueueLabel,
                color: color,
              ),
              StatusPill(
                text: state.backendSnapshotLabel,
                color: color,
              ),
              StatusPill(
                text: state.lastSyncSummaryLabel,
                color: color,
              ),
              StatusPill(
                text: state.syncReceiptLabel,
                color: color,
              ),
              StatusPill(
                text: state.syncWarningsLabel,
                color: state.lastSyncWarnings.isEmpty
                    ? color
                    : LumoTheme.accentOrange,
              ),
            ],
          ),
          if (blockerReason != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Pilot trust blocker',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF991B1B),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    blockerReason,
                    style: const TextStyle(
                      color: Color(0xFF7F1D1D),
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Runtime sync feedback',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  state.runtimeSyncFeedbackLabel,
                  style: const TextStyle(
                    color: Color(0xFF475569),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 10),
                ...state.runtimeSyncActionItems().take(2).map(
                      (action) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 3),
                              child: Icon(
                                Icons.arrow_right_alt_rounded,
                                size: 18,
                                color: Color(0xFF475569),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                action,
                                style: const TextStyle(
                                  color: Color(0xFF475569),
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
          ),
          if (state.lastSyncWarnings.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFCD34D)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sync receipts to review',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF78350F),
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...state.lastSyncWarnings.map(
                    (warning) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 3),
                            child: Icon(
                              Icons.warning_amber_rounded,
                              size: 16,
                              color: Color(0xFFB45309),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              warning,
                              style: const TextStyle(
                                color: Color(0xFF92400E),
                                height: 1.35,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HomeQuickAction extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _HomeQuickAction({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              IgnorePointer(
                child: SizedBox(
                  width: 68,
                  height: 68,
                  child: FilledButton(
                    onPressed: onTap,
                    style: FilledButton.styleFrom(
                      foregroundColor: color,
                      backgroundColor: color.withValues(alpha: 0.12),
                      padding: EdgeInsets.zero,
                      shape: const CircleBorder(),
                      side: BorderSide(color: color.withValues(alpha: 0.16)),
                    ),
                    child: Icon(icon, size: 28),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: Color(0xFF334155),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LearnerSourceStatusSignal {
  final String id;
  final String label;
  final String detail;
  final IconData icon;
  final Color color;
  final Color backgroundColor;
  final Color borderColor;

  const LearnerSourceStatusSignal({
    required this.id,
    required this.label,
    required this.detail,
    required this.icon,
    required this.color,
    required this.backgroundColor,
    required this.borderColor,
  });
}

LearnerSourceStatusSignal buildLearnerSourceStatusSignal(
  LumoAppState state, {
  bool? transcriptAvailable,
  bool browserOffline = false,
  bool runtimeDevicesChanged = false,
  bool autoPaused = false,
}) {
  if (runtimeDevicesChanged) {
    return const LearnerSourceStatusSignal(
      id: 'runtime-device-change',
      label: 'Audio route changed',
      detail: 'Reopen the mic deliberately so Mallam uses the right device.',
      icon: Icons.headset_mic_rounded,
      color: Color(0xFF9A3412),
      backgroundColor: Color(0xFFFFF7ED),
      borderColor: Color(0xFFFED7AA),
    );
  }
  if (browserOffline || state.lastSyncError != null) {
    return const LearnerSourceStatusSignal(
      id: 'runtime-local-save',
      label: 'Runtime saved locally',
      detail: 'Learner evidence stays on this tablet until sync settles.',
      icon: Icons.cloud_off_rounded,
      color: Color(0xFF9A3412),
      backgroundColor: Color(0xFFFFF7ED),
      borderColor: Color(0xFFFED7AA),
    );
  }
  if (autoPaused) {
    return const LearnerSourceStatusSignal(
      id: 'runtime-auto-paused',
      label: 'Hands-free paused safely',
      detail: 'Confirm this step, then resume when transcript help is steady.',
      icon: Icons.pause_circle_rounded,
      color: Color(0xFF1D4ED8),
      backgroundColor: Color(0xFFEFF6FF),
      borderColor: Color(0xFFBFDBFE),
    );
  }
  if (transcriptAvailable == false) {
    return const LearnerSourceStatusSignal(
      id: 'runtime-audio-first',
      label: 'Audio-first mode',
      detail:
          'Transcript help is soft right now, but voice capture is still safe.',
      icon: Icons.graphic_eq_rounded,
      color: Color(0xFF7C3AED),
      backgroundColor: Color(0xFFF5F3FF),
      borderColor: Color(0xFFDDD6FE),
    );
  }
  if (state.pendingSyncEvents.isNotEmpty) {
    return LearnerSourceStatusSignal(
      id: 'runtime-queue-${state.pendingSyncEvents.length}',
      label: state.pendingSyncEvents.length == 1
          ? '1 update queued'
          : '${state.pendingSyncEvents.length} updates queued',
      detail: 'The queue is protected locally and will flush on the next sync.',
      icon: Icons.schedule_send_rounded,
      color: const Color(0xFF92400E),
      backgroundColor: const Color(0xFFFFFBEB),
      borderColor: const Color(0xFFFDE68A),
    );
  }
  final curriculumTruthWarning = state.curriculumTruthWarning;
  if (curriculumTruthWarning != null) {
    return LearnerSourceStatusSignal(
      id: 'source-truth-warning-${state.curriculumSourceLabel}',
      label: state.curriculumSourceLabel,
      detail: curriculumTruthWarning,
      icon: state.hasAssignmentPayloadGaps
          ? Icons.rule_folder_rounded
          : Icons.fact_check_rounded,
      color: const Color(0xFF92400E),
      backgroundColor: const Color(0xFFFFFBEB),
      borderColor: const Color(0xFFFDE68A),
    );
  }
  if (state.usingFallbackData) {
    return LearnerSourceStatusSignal(
      id: 'source-offline-fallback',
      label: state.curriculumSourceLabel,
      detail:
          'Lessons are coming from local fallback state, not a fresh live backend fetch.',
      icon: Icons.inventory_2_rounded,
      color: const Color(0xFF0F766E),
      backgroundColor: const Color(0xFFF0FDFA),
      borderColor: const Color(0xFF99F6E4),
    );
  }
  if (state.hasLiveBackendConnection) {
    return const LearnerSourceStatusSignal(
      id: 'source-live-runtime-ready',
      label: 'Backend link live',
      detail:
          'Backend connectivity and runtime sync look healthy. Curriculum truth is shown separately so a live link does not overclaim the lesson source.',
      icon: Icons.cloud_done_rounded,
      color: Color(0xFF166534),
      backgroundColor: Color(0xFFF0FDF4),
      borderColor: Color(0xFFBBF7D0),
    );
  }
  return const LearnerSourceStatusSignal(
    id: 'source-waiting',
    label: 'Source check pending',
    detail: 'Lumo is still confirming roster and runtime readiness.',
    icon: Icons.hourglass_top_rounded,
    color: Color(0xFF475569),
    backgroundColor: Color(0xFFF8FAFC),
    borderColor: Color(0xFFE2E8F0),
  );
}

class LearnerSourceStatusNotice extends StatefulWidget {
  final LearnerSourceStatusSignal signal;
  final Duration visibleFor;

  const LearnerSourceStatusNotice({
    super.key,
    required this.signal,
    this.visibleFor = const Duration(seconds: 5),
  });

  @override
  State<LearnerSourceStatusNotice> createState() =>
      _LearnerSourceStatusNoticeState();
}

class _LearnerSourceStatusNoticeState extends State<LearnerSourceStatusNotice> {
  Timer? _dismissTimer;
  late String _visibleSignalId;
  bool _isVisible = true;

  @override
  void initState() {
    super.initState();
    _visibleSignalId = widget.signal.id;
    _armDismissTimer();
  }

  @override
  void didUpdateWidget(covariant LearnerSourceStatusNotice oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.signal.id == widget.signal.id) return;
    setState(() {
      _visibleSignalId = widget.signal.id;
      _isVisible = true;
    });
    _armDismissTimer();
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    super.dispose();
  }

  void _armDismissTimer() {
    _dismissTimer?.cancel();
    _dismissTimer = Timer(widget.visibleFor, () {
      if (!mounted) return;
      setState(() => _isVisible = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final signal = widget.signal;
    final show = _isVisible && _visibleSignalId == signal.id;
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: !show
          ? const SizedBox.shrink()
          : Container(
              key: ValueKey(signal.id),
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: signal.backgroundColor,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: signal.borderColor),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x120F172A),
                    blurRadius: 16,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Icon(signal.icon, size: 18, color: signal.color),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          signal.label,
                          style: TextStyle(
                            color: signal.color,
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          signal.detail,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF334155),
                            height: 1.25,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _MiniMetricChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MiniMetricChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF475569)),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }
}

class _CurrentLearnerBanner extends StatelessWidget {
  final String title;
  final LearnerProfile learner;
  final LessonCardModel? nextLesson;
  final VoidCallback onOpenProfile;

  const _CurrentLearnerBanner({
    required this.title,
    required this.learner,
    required this.nextLesson,
    required this.onOpenProfile,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF2FF),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFC7D2FE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF312E81),
                  ),
                ),
              ),
              StatusPill(
                text:
                    nextLesson == null ? 'Profile ready' : 'Ready to continue',
                color: nextLesson == null
                    ? LumoTheme.accentOrange
                    : LumoTheme.accentGreen,
              ),
            ],
          ),
          if (nextLesson != null) ...[
            const SizedBox(height: 10),
            Text(
              'Next lesson: ${nextLesson!.title}',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E1B4B),
              ),
            ),
          ],
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: onOpenProfile,
            icon: const Icon(Icons.badge_rounded),
            label: const Text('Open learner profile'),
          ),
        ],
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  final LearningModule module;
  final int lessonCount;
  final bool compact;
  final VoidCallback onTap;

  const _SubjectCard({
    required this.module,
    required this.lessonCount,
    required this.compact,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final palette = _modulePalette(module.id);
    return LayoutBuilder(
      builder: (context, constraints) {
        final dense = compact || constraints.maxHeight < 170;

        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(26),
            onTap: onTap,
            child: Ink(
              padding: EdgeInsets.all(dense ? 12 : 18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: palette,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(26),
                border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                boxShadow: [
                  BoxShadow(
                    color: palette.first.withValues(alpha: 0.14),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          module.badge,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: dense ? 10 : 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$lessonCount lesson${lessonCount == 1 ? '' : 's'}',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: dense ? 10 : 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    module.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: dense ? 18 : 22,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      height: 1.0,
                    ),
                  ),
                  SizedBox(height: dense ? 3 : 6),
                  Text(
                    module.description,
                    maxLines: dense ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.96),
                      height: 1.2,
                      fontSize: dense ? 11 : 13,
                    ),
                  ),
                  SizedBox(height: dense ? 6 : 12),
                  Row(
                    children: [
                      Text(
                        'Open',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: dense ? 13 : 14,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: dense ? 16 : 18,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  List<Color> _modulePalette(String id) {
    switch (id) {
      case 'math':
        return const [Color(0xFFFF9A62), Color(0xFFFFB347)];
      case 'life-skills':
        return const [Color(0xFF12B981), Color(0xFF34D399)];
      case 'english':
      default:
        return const [Color(0xFF6C63FF), Color(0xFF8B7FFF)];
    }
  }
}

_LearnerIdentityCue _learnerIdentityCue(LearnerProfile learner) {
  final normalizedSex = learner.sex.trim().toLowerCase();
  if (normalizedSex.contains('girl')) {
    return const _LearnerIdentityCue(
      shape: BoxShape.circle,
      color: Color(0xFFF472B6),
      icon: Icons.auto_awesome_rounded,
      label: 'Star learner cue',
    );
  }
  if (normalizedSex.contains('boy')) {
    return const _LearnerIdentityCue(
      shape: BoxShape.rectangle,
      color: Color(0xFF38BDF8),
      icon: Icons.pets_rounded,
      label: 'Lion learner cue',
    );
  }
  return const _LearnerIdentityCue(
    shape: BoxShape.circle,
    color: Color(0xFFA78BFA),
    icon: Icons.favorite_rounded,
    label: 'Heart learner cue',
  );
}

class _LearnerIdentityCue {
  final BoxShape shape;
  final Color color;
  final IconData icon;
  final String label;

  const _LearnerIdentityCue({
    required this.shape,
    required this.color,
    required this.icon,
    required this.label,
  });
}

class _LearnerCard extends StatelessWidget {
  final LearnerProfile learner;
  final LumoAppState? state;
  final LearnerLeaderboardEntry? leaderboardEntry;
  final bool isActive;
  final bool dense;
  final VoidCallback? onSetActive;
  final VoidCallback? onOpenProfile;
  final VoidCallback? onStartLesson;

  const _LearnerCard({
    required this.learner,
    this.state,
    this.leaderboardEntry,
    this.isActive = false,
    this.dense = false,
    this.onSetActive,
    this.onOpenProfile,
    this.onStartLesson,
  });

  @override
  Widget build(BuildContext context) {
    final nextPack = state?.nextAssignmentPackForLearner(learner);
    final points = learnerMotivationPoints(learner);
    final xp = learner.totalXp;
    final streak = learner.streakDays;
    final hasActions =
        onSetActive != null || onOpenProfile != null || onStartLesson != null;
    final needsBackendSync = _learnerNeedsBackendSync(learner);

    final identityCue = _learnerIdentityCue(learner);

    return LayoutBuilder(
      builder: (context, constraints) {
        final compactHeight = dense || constraints.maxHeight < 470;
        return Container(
          padding: EdgeInsets.all(compactHeight ? 16 : 18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color:
                  isActive ? const Color(0xFFC7D2FE) : const Color(0xFFEAEAF4),
              width: isActive ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: compactHeight ? 48 : 56,
                      height: compactHeight ? 48 : 56,
                      decoration: BoxDecoration(
                        color: identityCue.color.withValues(alpha: 0.18),
                        shape: identityCue.shape,
                        border: Border.all(
                          color: identityCue.color.withValues(alpha: 0.55),
                          width: 2,
                        ),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Text(
                            learner.name.characters.first,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Positioned(
                            right: 6,
                            bottom: 6,
                            child: Icon(
                              identityCue.icon,
                              size: 16,
                              color: identityCue.color,
                              semanticLabel: identityCue.label,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            learner.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: compactHeight ? 17 : 18,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Age ${learner.age} • ${learner.village}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xFF6B7280)),
                          ),
                        ],
                      ),
                    ),
                    if (isActive && compactHeight)
                      const Icon(
                        Icons.check_circle_rounded,
                        color: LumoTheme.primary,
                        size: 24,
                      )
                    else if (leaderboardEntry != null)
                      StatusPill(
                        text: '#${leaderboardEntry!.rank}',
                        color: leaderboardEntry!.rank == 1
                            ? LumoTheme.accentOrange
                            : LumoTheme.primary,
                      ),
                  ],
                ),
                SizedBox(height: compactHeight ? 10 : 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusPill(
                      text: isActive
                          ? (compactHeight
                              ? 'Selected learner'
                              : 'Active learner')
                          : (compactHeight
                              ? 'Ready now'
                              : learner.readinessLabel),
                      color:
                          isActive ? LumoTheme.primary : LumoTheme.accentGreen,
                    ),
                    StatusPill(
                      text: identityCue.label,
                      color: identityCue.color,
                    ),
                    StatusPill(
                      text: '$points pts',
                      color: LumoTheme.accentOrange,
                    ),
                    StatusPill(
                      text: '$streak day streak',
                      color: const Color(0xFFEF4444),
                    ),
                    if (needsBackendSync)
                      StatusPill(
                        text: 'Sync pending',
                        color: LumoTheme.accentOrange,
                      ),
                  ],
                ),
                SizedBox(height: compactHeight ? 10 : 12),
                Container(
                  padding: EdgeInsets.all(compactHeight ? 10 : 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _LearnerCardStat(
                          label: 'XP',
                          value: '$xp',
                          color: LumoTheme.primary,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _LearnerCardStat(
                          label: 'Minutes',
                          value: '${learner.estimatedTotalMinutes}',
                          color: const Color(0xFF0EA5E9),
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: compactHeight ? 10 : 12),
                Text(
                  learner.learnerCode,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  compactHeight
                      ? (nextPack == null
                          ? 'Ready for ${learner.readinessLabel.toLowerCase()} work'
                          : 'Assigned next: ${nextPack.lessonTitle}')
                      : (nextPack == null
                          ? learner.supportPlan
                          : nextPack.lessonTitle),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: const Color(0xFF475569),
                    height: 1.35,
                    fontWeight:
                        compactHeight ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Last attendance: ${learner.lastAttendance}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (needsBackendSync) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFED7AA)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.cloud_off_rounded,
                          color: LumoTheme.accentOrange,
                          size: 18,
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Profile is saved on this tablet and still waiting for backend sync. Refresh before trusting roster handoff or assignment freshness.',
                            style: TextStyle(
                              color: Color(0xFF9A3412),
                              height: 1.35,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                if (hasActions) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (onSetActive != null && !compactHeight)
                        OutlinedButton.icon(
                          onPressed: onSetActive,
                          icon: const Icon(Icons.person_pin_circle_rounded),
                          label: Text(isActive ? 'Active now' : 'Set active'),
                        ),
                      if (onOpenProfile != null)
                        OutlinedButton.icon(
                          onPressed: onOpenProfile,
                          icon: const Icon(Icons.badge_rounded),
                          label: const Text('Profile'),
                        ),
                      if (onStartLesson != null)
                        FilledButton.icon(
                          onPressed: onStartLesson,
                          icon: const Icon(Icons.play_arrow_rounded),
                          label: Text(
                            compactHeight
                                ? 'Start'
                                : (nextPack == null
                                    ? 'Start lesson'
                                    : 'Start assigned'),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class LearnerLeaderboardEntry {
  final LearnerProfile learner;
  final int rank;
  final int points;
  final int pointsGapFromLeader;

  const LearnerLeaderboardEntry({
    required this.learner,
    required this.rank,
    required this.points,
    required this.pointsGapFromLeader,
  });
}

int learnerMotivationPoints(LearnerProfile learner) =>
    learner.rewards?.points ?? learner.totalXp;

List<LearnerLeaderboardEntry> buildLearnerLeaderboard(
    List<LearnerProfile> learners) {
  final sorted = [...learners]..sort((a, b) {
      final pointCompare =
          learnerMotivationPoints(b).compareTo(learnerMotivationPoints(a));
      if (pointCompare != 0) return pointCompare;
      final streakCompare = b.streakDays.compareTo(a.streakDays);
      if (streakCompare != 0) return streakCompare;
      return a.name.compareTo(b.name);
    });
  final leaderPoints =
      sorted.isEmpty ? 0 : learnerMotivationPoints(sorted.first);
  return [
    for (var i = 0; i < sorted.length; i++)
      LearnerLeaderboardEntry(
        learner: sorted[i],
        rank: i + 1,
        points: learnerMotivationPoints(sorted[i]),
        pointsGapFromLeader: leaderPoints - learnerMotivationPoints(sorted[i]),
      ),
  ];
}

LearnerLeaderboardEntry? learnerLeaderboardEntryFor(
  List<LearnerLeaderboardEntry> leaderboard,
  String learnerId,
) {
  for (final entry in leaderboard) {
    if (entry.learner.id == learnerId) return entry;
  }
  return null;
}

class _RewardRedemptionPlannerPanel extends StatelessWidget {
  final LumoAppState state;
  final LearnerProfile learner;
  final String summary;
  final RewardRedemptionOption? featuredReward;
  final List<RewardRedemptionOption> options;
  final List<RewardRedemptionOption> nearlyUnlockedRewards;
  final List<RewardRedemptionRecord> history;
  final int spendablePoints;

  const _RewardRedemptionPlannerPanel({
    required this.state,
    required this.learner,
    required this.summary,
    required this.featuredReward,
    required this.options,
    required this.nearlyUnlockedRewards,
    required this.history,
    required this.spendablePoints,
  });

  String _formatRedeemedAt(DateTime value) {
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '${value.month}/${value.day} $hour:$minute';
  }

  Future<void> _showRewardRedeemDialog(
    BuildContext context,
    RewardRedemptionOption reward,
  ) async {
    final controller = TextEditingController();
    final record = await showDialog<RewardRedemptionRecord>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Redeem ${reward.title}?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${reward.icon} ${reward.description}'),
            const SizedBox(height: 12),
            Text('Best use: ${reward.celebrationCue}'),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Celebration note',
                hintText:
                    'What did the learner choose or how was it celebrated?',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final result = state.redeemRewardForLearner(
                learner: learner,
                option: reward,
                note: controller.text,
              );
              Navigator.of(dialogContext).pop(result);
            },
            child: const Text('Redeem reward'),
          ),
        ],
      ),
    );
    if (!context.mounted || record == null) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${learner.name} redeemed ${record.title}. ${record.pointsRemaining} point(s) remain.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final resolvedOptions = options
        .map((item) => state.rewardOptionStateForLearner(learner, item))
        .toList();
    final unlockedCount = resolvedOptions.where((item) => item.unlocked).length;
    final resolvedFeaturedReward = featuredReward == null
        ? null
        : state.rewardOptionStateForLearner(learner, featuredReward!);

    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.redeem_rounded, color: LumoTheme.accentGreen),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Reward planner',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
              ),
              StatusPill(
                text: '$unlockedCount ready now',
                color: unlockedCount > 0
                    ? LumoTheme.accentGreen
                    : LumoTheme.accentOrange,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            summary,
            style: const TextStyle(color: Color(0xFF475569), height: 1.4),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MiniMetricChip(
                icon: Icons.wallet_giftcard_rounded,
                label: '$spendablePoints pts available',
              ),
              _MiniMetricChip(
                icon: Icons.history_rounded,
                label: history.isEmpty
                    ? 'No redemptions yet'
                    : '${history.length} redemption(s)',
              ),
            ],
          ),
          if (resolvedFeaturedReward != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: resolvedFeaturedReward.unlocked
                    ? const Color(0xFFEEFBF3)
                    : const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: resolvedFeaturedReward.unlocked
                      ? const Color(0xFFA7F3D0)
                      : const Color(0xFFFCD34D),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        '${resolvedFeaturedReward.icon} ${resolvedFeaturedReward.title}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      StatusPill(
                        text: resolvedFeaturedReward.category,
                        color: resolvedFeaturedReward.unlocked
                            ? LumoTheme.accentGreen
                            : LumoTheme.accentOrange,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    resolvedFeaturedReward.description,
                    style: const TextStyle(
                      color: Color(0xFF334155),
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 12),
                  LabelValueWrap(
                    items: [
                      (
                        'Status',
                        resolvedFeaturedReward.unlocked
                            ? 'Ready to redeem'
                            : '${resolvedFeaturedReward.shortfall} pts to unlock',
                      ),
                      ('Cost', '${resolvedFeaturedReward.cost} pts'),
                      ('Best use', resolvedFeaturedReward.celebrationCue),
                    ],
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: resolvedFeaturedReward.unlocked
                        ? () => _showRewardRedeemDialog(
                              context,
                              resolvedFeaturedReward,
                            )
                        : null,
                    icon: const Icon(Icons.redeem_rounded),
                    label: Text(
                      resolvedFeaturedReward.unlocked
                          ? 'Redeem now'
                          : 'Keep earning',
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (nearlyUnlockedRewards.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              'Coming next',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            ...nearlyUnlockedRewards
                .map((reward) =>
                    state.rewardOptionStateForLearner(learner, reward))
                .map(
                  (reward) => Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(reward.icon, style: const TextStyle(fontSize: 22)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                reward.title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${reward.shortfall} pts away • ${reward.category}',
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${reward.cost} pts',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ),
          ],
          if (history.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              'Redemption history',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            ...history.take(3).map(
                  (entry) => Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${entry.icon} ${entry.title}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800),
                              ),
                            ),
                            Text(
                              '-${entry.cost} pts',
                              style:
                                  const TextStyle(fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Redeemed ${_formatRedeemedAt(entry.redeemedAt)} • ${entry.pointsRemaining} pts left',
                          style: const TextStyle(
                              color: Color(0xFF64748B), fontSize: 12),
                        ),
                        if ((entry.note ?? '').isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            entry.note!,
                            style: const TextStyle(
                                color: Color(0xFF334155), height: 1.35),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
          ],
          const SizedBox(height: 4),
          Text(
            'Keep ${learner.name}\'s reward choices visible and concrete. The point is instant motivation, not a spreadsheet with stickers.',
            style: const TextStyle(color: Color(0xFF64748B), height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _LearnerLeaderboardPanel extends StatelessWidget {
  final List<LearnerLeaderboardEntry> leaderboard;
  final String? currentLearnerId;
  final String title;
  final String subtitle;

  const _LearnerLeaderboardPanel({
    required this.leaderboard,
    required this.currentLearnerId,
    this.title = 'Leaderboard',
    this.subtitle =
        'Ranked by acquired points so progress is visible at a glance.',
  });

  @override
  Widget build(BuildContext context) {
    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: const TextStyle(color: Color(0xFF475569), height: 1.4),
          ),
          const SizedBox(height: 12),
          if (leaderboard.isEmpty)
            const Text('No learners available yet.')
          else
            ...leaderboard.take(5).map(
                  (entry) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: entry.learner.id == currentLearnerId
                          ? const Color(0xFFEEF2FF)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: entry.learner.id == currentLearnerId
                            ? const Color(0xFFC7D2FE)
                            : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: entry.rank == 1
                              ? const Color(0xFFFDE68A)
                              : const Color(0xFFE2E8F0),
                          child: Text(
                            '#${entry.rank}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.learner.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                entry.rank == 1
                                    ? 'Leader • ${entry.learner.streakDays} day streak'
                                    : '${entry.pointsGapFromLeader} pts behind • ${entry.learner.streakDays} day streak',
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${entry.points}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 18,
                              ),
                            ),
                            const Text(
                              'points',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class _LearnerCardStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _LearnerCardStat({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

class _RegistrationReadinessStrip extends StatelessWidget {
  final RegistrationDraft draft;

  const _RegistrationReadinessStrip({required this.draft});

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Identity', draft.name.trim().isNotEmpty),
      ('Age band', int.tryParse(draft.age.trim()) != null),
      ('Guardian', draft.guardianName.trim().isNotEmpty),
      ('Support plan', draft.supportPlan.trim().length >= 12),
      ('Consent', draft.consentCaptured),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: items
          .map(
            (item) => SizedBox(
              width: 132,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: item.$2
                      ? const Color(0xFFEEFBF3)
                      : const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      item.$2
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: item.$2
                          ? LumoTheme.accentGreen
                          : LumoTheme.accentOrange,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item.$1,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _CoachActionsRow extends StatelessWidget {
  final Future<void> Function() onReplay;
  final Future<void> Function() onHint;
  final Future<void> Function() onModel;
  final Future<void> Function() onSlow;
  final Future<void> Function() onWait;
  final Future<void> Function() onTranslate;

  const _CoachActionsRow({
    required this.onReplay,
    required this.onHint,
    required this.onModel,
    required this.onSlow,
    required this.onWait,
    required this.onTranslate,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        FilledButton.tonalIcon(
          onPressed: () => onReplay(),
          icon: const Icon(Icons.volume_up_rounded),
          label: const Text('Replay'),
        ),
        FilledButton.tonalIcon(
          onPressed: () => onSlow(),
          icon: const Icon(Icons.slow_motion_video_rounded),
          label: const Text('Slow repeat'),
        ),
        FilledButton.tonalIcon(
          onPressed: () => onHint(),
          icon: const Icon(Icons.lightbulb_rounded),
          label: const Text('Give hint'),
        ),
        FilledButton.tonalIcon(
          onPressed: () => onModel(),
          icon: const Icon(Icons.record_voice_over_rounded),
          label: const Text('Model answer'),
        ),
        FilledButton.tonalIcon(
          onPressed: () => onWait(),
          icon: const Icon(Icons.timelapse_rounded),
          label: const Text('Think time'),
        ),
        FilledButton.tonalIcon(
          onPressed: () => onTranslate(),
          icon: const Icon(Icons.translate_rounded),
          label: const Text('Translate cue'),
        ),
      ],
    );
  }
}

class _SpeakerStateBadge extends StatelessWidget {
  final SpeakerMode mode;

  const _SpeakerStateBadge({required this.mode});

  @override
  Widget build(BuildContext context) {
    late final String label;
    late final Color color;

    switch (mode) {
      case SpeakerMode.guiding:
        label = 'Guiding';
        color = LumoTheme.primary;
        break;
      case SpeakerMode.listening:
        label = 'Listening';
        color = LumoTheme.accentOrange;
        break;
      case SpeakerMode.affirming:
        label = 'Affirming';
        color = LumoTheme.accentGreen;
        break;
      case SpeakerMode.waiting:
        label = 'Waiting';
        color = const Color(0xFF0EA5E9);
        break;
      case SpeakerMode.idle:
        label = 'Idle';
        color = const Color(0xFF94A3B8);
        break;
    }

    return StatusPill(text: label, color: color);
  }
}

class _ProgressMeter extends StatelessWidget {
  final int score;

  const _ProgressMeter({required this.score});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Profile completeness: $score%'),
          const SizedBox(height: 10),
          LinearProgressIndicator(
            value: score / 100,
            minHeight: 10,
            borderRadius: const BorderRadius.all(Radius.circular(999)),
            color: score == 100 ? LumoTheme.accentGreen : LumoTheme.primary,
            backgroundColor: const Color(0xFFE9E7FF),
          ),
        ],
      ),
    );
  }
}

class _ResponseReviewBanner extends StatelessWidget {
  final ResponseReview review;

  const _ResponseReviewBanner({required this.review});

  @override
  Widget build(BuildContext context) {
    switch (review) {
      case ResponseReview.pending:
        return _banner(
          text: 'Waiting for a learner response before continuing.',
          color: const Color(0xFF64748B),
          background: const Color(0xFFF8FAFC),
        );
      case ResponseReview.onTrack:
        return _banner(
          text:
              'Response captured. Mallam can affirm and move to the next step.',
          color: LumoTheme.accentGreen,
          background: const Color(0xFFEEFBF3),
        );
      case ResponseReview.needsSupport:
        return _banner(
          text:
              'That response needs help. Mallam should repeat or coach before moving on.',
          color: LumoTheme.accentOrange,
          background: const Color(0xFFFFF7ED),
        );
    }
  }

  Widget _banner({
    required String text,
    required Color color,
    required Color background,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        text,
        style: TextStyle(fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}

class ClipboardBridge {
  static Future<void> copy(String text) async {
    await Future<void>.delayed(Duration.zero);
    // ignore: deprecated_member_use
    return Clipboard.setData(ClipboardData(text: text));
  }
}
