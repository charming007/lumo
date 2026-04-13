import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_state.dart';
import 'audio_capture_service.dart';
import 'design_shell.dart';
import 'instructions.dart';
import 'models.dart';
import 'speech_transcription_service.dart';
import 'theme.dart';
import 'voice_replay_service.dart';
import 'widgets.dart';

void main() {
  runApp(const LumoApp());
}

class LumoApp extends StatefulWidget {
  const LumoApp({super.key});

  @override
  State<LumoApp> createState() => _LumoAppState();
}

class _LumoAppState extends State<LumoApp> {
  final state = LumoAppState();
  final voiceReplayService = VoiceReplayService();
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
    state.dispose();
    voiceReplayService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lumo',
      debugShowCheckedModeBanner: false,
      theme: LumoTheme.light,
      home: showSplash
          ? SplashScreen(onFinish: handleSplashFinished)
          : HomePage(state: state, onChanged: () => setState(() {})),
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
                      color: LumoTheme.primary.withValues(alpha: 0.16),
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
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              const Text(
                'Preparing AI Mallam, learners, and voice-first lessons...',
                style: TextStyle(color: Color(0xFF6B7280), fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              const SizedBox(
                width: 220,
                child: LinearProgressIndicator(
                  minHeight: 8,
                  borderRadius: BorderRadius.all(Radius.circular(999)),
                  color: LumoTheme.primary,
                  backgroundColor: Color(0xFFE9E7FF),
                ),
              ),
            ],
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
        voicePrompt: 'Let’s continue ${lesson.subject} together.',
        readinessGoal: lesson.readinessFocus,
        badge: 'Lesson ready',
      );
}

void launchLessonFlow({
  required BuildContext context,
  required LumoAppState state,
  required VoidCallback onChanged,
  required LessonCardModel lesson,
  LearningModule? module,
  BackendLessonSession? resumeFrom,
}) {
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

class HomePage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;

  const HomePage({super.key, required this.state, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final learnerCount = state.learners.length;
    final currentLearner = state.currentLearner;
    final homeLearner = currentLearner ?? state.suggestedLearnerForHome;
    final nextAssignedLesson = state.nextAssignedLessonForLearner(homeLearner);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LumoTopBar(onLogoTap: () {}),
              const SizedBox(height: 20),
              Expanded(
                child: _ResponsiveWorkspaceRow(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ResponsivePane(
                      flex: 4,
                      child: MallamPanel(
                        instruction: homeInstruction,
                        onVoiceTap: () {
                          state.replayVisiblePrompt(
                            'Assalamu alaikum. You are on the home page. Tap Register to add a learner, Student List to see all learners, or choose a subject to open its modules.',
                          );
                        },
                        prompt:
                            'Assalamu alaikum. You are on the home page. Tap Register to add a learner, Student List to see all learners, or choose a subject to open its modules.',
                        speakerMode: SpeakerMode.guiding,
                        statusLabel: 'AI Mallam is ready',
                      ),
                    ),
                    ResponsivePane(
                      flex: 6,
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            DetailCard(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Home',
                                    style: TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'AI Mallam will guide the learner by voice. Pick what you want to do next.',
                                    style: TextStyle(
                                      color:
                                          Colors.black.withValues(alpha: 0.62),
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 20),
                                  LayoutBuilder(
                                    builder: (context, constraints) {
                                      final compact =
                                          constraints.maxWidth < 720;
                                      final cards = [
                                        _PrimaryActionCard(
                                          title: 'Register',
                                          subtitle:
                                              'Open learner registration flow',
                                          icon: Icons.person_add_alt_1_rounded,
                                          color: LumoTheme.primary,
                                          onTap: () {
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => RegisterPage(
                                                  state: state,
                                                  onChanged: onChanged,
                                                ),
                                              ),
                                            );
                                          },
                                        ),
                                        _PrimaryActionCard(
                                          title: 'Student List',
                                          subtitle:
                                              'See all registered learners',
                                          icon: Icons.groups_rounded,
                                          color: LumoTheme.accentGreen,
                                          onTap: () {
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => AllStudentsPage(
                                                  state: state,
                                                  onChanged: onChanged,
                                                ),
                                              ),
                                            );
                                          },
                                        ),
                                      ];

                                      if (compact) {
                                        return Column(
                                          children: [
                                            for (var i = 0;
                                                i < cards.length;
                                                i++) ...[
                                              SizedBox(
                                                width: double.infinity,
                                                child: cards[i],
                                              ),
                                              if (i < cards.length - 1)
                                                const SizedBox(height: 12),
                                            ],
                                          ],
                                        );
                                      }

                                      return Row(
                                        children: [
                                          for (var i = 0;
                                              i < cards.length;
                                              i++) ...[
                                            Expanded(child: cards[i]),
                                            if (i < cards.length - 1)
                                              const SizedBox(width: 12),
                                          ],
                                        ],
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 20),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: MetricTile(
                                          label: 'Learners',
                                          value: '$learnerCount',
                                          icon: Icons.people_alt_rounded,
                                          color: LumoTheme.primary,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: MetricTile(
                                          label: 'Subjects',
                                          value: '${state.modules.length}',
                                          icon: Icons.menu_book_rounded,
                                          color: LumoTheme.accentOrange,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (learnerCount == 0) ...[
                                    const SizedBox(height: 18),
                                    SoftPanel(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'No learners are loaded yet',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 18,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          const Text(
                                            'This tablet is ready, but there is nobody to teach yet. Register the first learner before opening subject lessons so the session flow does not dead-end at learner selection.',
                                            style: TextStyle(
                                              color: Color(0xFF475569),
                                              height: 1.4,
                                            ),
                                          ),
                                          const SizedBox(height: 14),
                                          SizedBox(
                                            width: double.infinity,
                                            child: FilledButton.icon(
                                              onPressed: () {
                                                Navigator.of(context).push(
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                        RegisterPage(
                                                      state: state,
                                                      onChanged: onChanged,
                                                    ),
                                                  ),
                                                );
                                              },
                                              icon: const Icon(
                                                Icons.person_add_alt_1_rounded,
                                              ),
                                              label: const Text(
                                                'Register first learner',
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                  if (homeLearner != null) ...[
                                    const SizedBox(height: 18),
                                    _CurrentLearnerBanner(
                                      title: currentLearner == null
                                          ? 'Ready now: ${homeLearner.name}'
                                          : 'Current learner: ${homeLearner.name}',
                                      learner: homeLearner,
                                      nextLesson: nextAssignedLesson,
                                      backendSummary:
                                          state.backendRoutingSummaryForLearner(
                                        homeLearner,
                                      ),
                                      onOpenProfile: () {
                                        state.selectLearner(homeLearner);
                                        onChanged();
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => LearnerProfilePage(
                                              state: state,
                                              learner: homeLearner,
                                            ),
                                          ),
                                        );
                                      },
                                      onContinue: nextAssignedLesson == null
                                          ? null
                                          : () => launchLessonFlow(
                                                context: context,
                                                state: state,
                                                onChanged: onChanged,
                                                lesson: nextAssignedLesson,
                                              ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            _BackendStatusBanner(
                              state: state,
                              onRefresh: () async {
                                await state.bootstrap();
                                onChanged();
                              },
                              onSyncQueue: () async {
                                await state.syncPendingEvents();
                                onChanged();
                              },
                            ),
                            const SizedBox(height: 16),
                            const SectionTitle(
                              title: 'Subjects',
                              subtitle:
                                  'Tap a subject to open its learning modules.',
                            ),
                            const SizedBox(height: 12),
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final crossAxisCount = _adaptiveGridCount(
                                  constraints.maxWidth,
                                  minTileWidth: 260,
                                  maxCount: 3,
                                );

                                return GridView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: state.modules.length,
                                  gridDelegate:
                                      SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: crossAxisCount,
                                    mainAxisSpacing: 12,
                                    crossAxisSpacing: 12,
                                    childAspectRatio: 1.08,
                                  ),
                                  itemBuilder: (context, index) {
                                    final module = state.modules[index];
                                    return _SubjectCard(
                                      module: module,
                                      lessonCount:
                                          state.assignedLessonCountForModule(
                                        module: module,
                                        learner: state.currentLearner,
                                      ),
                                      onTap: () {
                                        state.selectModule(module);
                                        onChanged();
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => SubjectModulesPage(
                                              state: state,
                                              onChanged: onChanged,
                                              module: module,
                                            ),
                                          ),
                                        );
                                      },
                                    );
                                  },
                                );
                              },
                            ),
                          ],
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
    final averagePoints = state.learners.isEmpty
        ? 0
        : state.learners
                .map(learnerMotivationPoints)
                .reduce((value, item) => value + item) ~/
            state.learners.length;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LumoTopBar(
                onLogoTap: () =>
                    Navigator.of(context).popUntil((route) => route.isFirst),
              ),
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const SizedBox(
                    width: 520,
                    child: SectionTitle(
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
                ],
              ),
              const SizedBox(height: 16),
              _BackendStatusBanner(state: state),
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
                          topLearner == null
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
                    children: [
                      Expanded(child: leaderboardPanel),
                      const SizedBox(width: 12),
                      Expanded(child: coachPanel),
                    ],
                  );
                },
              ),
              const SizedBox(height: 16),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount = _adaptiveGridCount(
                      constraints.maxWidth,
                      minTileWidth: 320,
                      maxCount: 3,
                    );
                    final childAspectRatio = constraints.maxWidth < 900
                        ? 0.78
                        : constraints.maxWidth < 1280
                            ? 0.92
                            : 1.02;

                    return GridView.builder(
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

class LearnerProfilePage extends StatelessWidget {
  final LumoAppState state;
  final LearnerProfile learner;

  const LearnerProfilePage({
    super.key,
    required this.state,
    required this.learner,
  });

  @override
  Widget build(BuildContext context) {
    final rewards = learner.rewards;
    final totalXp = learner.totalXp;
    final totalMinutes = learner.estimatedTotalMinutes;
    final totalPoints = learnerMotivationPoints(learner);
    final assignedLessons = state.lessonsForLearner(learner).take(3).toList();
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
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ResponsivePane(
                child: MallamPanel(
                  instruction:
                      'This learner data page now shows the child\'s rewards, leaderboard rank, streak, XP, time spent, and assigned lesson momentum.',
                  onVoiceTap: () {
                    state.replayVisiblePrompt(
                      'You are viewing ${learner.name}. This page shows points, streaks, badge rewards, leaderboard rank, and the fastest way to continue learning.',
                    );
                  },
                  prompt:
                      'You are viewing ${learner.name}. This page shows points, streaks, badge rewards, leaderboard rank, and the fastest way to continue learning.',
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'AI Mallam explains this learner page',
                ),
              ),
              ResponsivePane(
                child: DetailCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
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
                            color: LumoTheme.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _LearnerRewardHero(
                                learner: learner,
                                rewards: rewards,
                                totalXp: totalXp,
                                totalPoints: totalPoints,
                                totalMinutes: totalMinutes,
                                leaderboardEntry: leaderboardEntry,
                                unlockedBadgeCount: unlockedBadges.length,
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

                                  return Wrap(
                                    spacing: 12,
                                    runSpacing: 12,
                                    children: tiles
                                        .map(
                                          (tile) => SizedBox(
                                            width:
                                                (constraints.maxWidth - 12) / 2,
                                            child: tile,
                                          ),
                                        )
                                        .toList(),
                                  );
                                },
                              ),
                              const SizedBox(height: 18),
                              if (rewards != null) ...[
                                SoftPanel(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
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
                                              fontSize: 18,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      LabelValueWrap(
                                        items: [
                                          (
                                            'Level',
                                            '${rewards.levelLabel} • Lv ${rewards.level}',
                                          ),
                                          (
                                            'Points',
                                            '${rewards.points} points'
                                          ),
                                          (
                                            'Badges unlocked',
                                            '${unlockedBadges.length} of ${rewards.badges.length}',
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
                                        value: rewards.progressToNextLevel
                                            .clamp(0, 1),
                                        minHeight: 10,
                                        borderRadius: const BorderRadius.all(
                                          Radius.circular(999),
                                        ),
                                        color: LumoTheme.accentGreen,
                                        backgroundColor:
                                            const Color(0xFFD1FAE5),
                                      ),
                                      const SizedBox(height: 12),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: rewards.badges.isEmpty
                                            ? const [
                                                StatusPill(
                                                  text: 'No badges yet',
                                                  color: Color(0xFF94A3B8),
                                                ),
                                              ]
                                            : rewards.badges
                                                .take(6)
                                                .map(
                                                  (badge) => StatusPill(
                                                    text: badge.earned
                                                        ? '${badge.icon} ${badge.title}'
                                                        : '${badge.title} ${badge.progress}/${badge.target}',
                                                    color: badge.earned
                                                        ? LumoTheme.accentGreen
                                                        : LumoTheme
                                                            .accentOrange,
                                                  ),
                                                )
                                                .toList(),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 18),
                              ],
                              if (rewardOptions.isNotEmpty) ...[
                                _RewardRedemptionPlannerPanel(
                                  learner: learner,
                                  summary:
                                      state.rewardRedemptionSummaryForLearner(
                                    learner,
                                  ),
                                  featuredReward: featuredReward,
                                  options: rewardOptions,
                                  nearlyUnlockedRewards: nearlyUnlockedRewards,
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
                                    const Text(
                                      'Basic information',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    InfoRow(
                                      label: 'Guardian',
                                      value: learner.guardianName,
                                    ),
                                    InfoRow(
                                      label: 'Relationship',
                                      value: learner.caregiverRelationship,
                                    ),
                                    InfoRow(
                                      label: 'Language',
                                      value: learner.preferredLanguage,
                                    ),
                                    InfoRow(
                                      label: 'Readiness',
                                      value: learner.readinessLabel,
                                    ),
                                    InfoRow(
                                      label: 'Support plan',
                                      value: learner.supportPlan,
                                    ),
                                    InfoRow(
                                      label: 'Last lesson',
                                      value: learner.lastLessonSummary,
                                    ),
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
                                          child: Text(
                                            'Backend routing',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
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
                                      state.backendRoutingSummaryForLearner(
                                        learner,
                                      ),
                                      style: const TextStyle(
                                        color: Color(0xFF475569),
                                        height: 1.4,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    InfoRow(
                                      label: 'Recommended module',
                                      value: recommendedModule.title,
                                    ),
                                    if (nextAssignmentPack != null) ...[
                                      InfoRow(
                                        label: 'Assigned lesson',
                                        value: nextAssignmentPack.lessonTitle,
                                      ),
                                      InfoRow(
                                        label: 'Assessment',
                                        value: nextAssignmentPack
                                                .assessmentTitle ??
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
                                          child: Text(
                                            'Recent backend runtime',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
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
                                      state.runtimeSessionSummaryForLearner(
                                        learner,
                                      ),
                                      style: const TextStyle(
                                        color: Color(0xFF475569),
                                        height: 1.4,
                                      ),
                                    ),
                                    if (recentSessions.isNotEmpty) ...[
                                      const SizedBox(height: 12),
                                      ...recentSessions.take(3).map(
                                            (session) => Container(
                                              width: double.infinity,
                                              margin: const EdgeInsets.only(
                                                bottom: 10,
                                              ),
                                              padding: const EdgeInsets.all(14),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF8FAFC),
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
                                                  Row(
                                                    children: [
                                                      Expanded(
                                                        child: Text(
                                                          session.lessonTitle ??
                                                              'Live runtime session',
                                                          style:
                                                              const TextStyle(
                                                            fontWeight:
                                                                FontWeight.w800,
                                                            color: Color(
                                                              0xFF0F172A,
                                                            ),
                                                          ),
                                                        ),
                                                      ),
                                                      StatusPill(
                                                        text:
                                                            session.statusLabel,
                                                        color: session.status ==
                                                                'completed'
                                                            ? LumoTheme
                                                                .accentGreen
                                                            : LumoTheme
                                                                .accentOrange,
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Text(
                                                    session.automationStatus,
                                                    style: const TextStyle(
                                                      color: Color(0xFF475569),
                                                      height: 1.35,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 10),
                                                  Wrap(
                                                    spacing: 10,
                                                    runSpacing: 8,
                                                    children: [
                                                      _MiniMetricChip(
                                                        icon:
                                                            Icons.route_rounded,
                                                        label: session
                                                            .progressLabel,
                                                      ),
                                                      _MiniMetricChip(
                                                        icon: Icons
                                                            .record_voice_over_rounded,
                                                        label:
                                                            '${session.responsesCaptured} responses',
                                                      ),
                                                      _MiniMetricChip(
                                                        icon: Icons
                                                            .tips_and_updates_rounded,
                                                        label:
                                                            '${session.supportActionsUsed} supports',
                                                      ),
                                                    ],
                                                  ),
                                                  if (session.status ==
                                                      'in_progress') ...[
                                                    const SizedBox(height: 12),
                                                    Align(
                                                      alignment:
                                                          Alignment.centerLeft,
                                                      child: FilledButton
                                                          .tonalIcon(
                                                        onPressed: () {
                                                          final resumeLesson = state
                                                              .lessonForBackendSession(
                                                            session,
                                                          );
                                                          if (resumeLesson ==
                                                              null) {
                                                            ScaffoldMessenger
                                                                .of(
                                                              context,
                                                            ).showSnackBar(
                                                              const SnackBar(
                                                                content: Text(
                                                                  'Backend session found, but its lesson is not loaded on this tablet yet.',
                                                                ),
                                                              ),
                                                            );
                                                            return;
                                                          }

                                                          launchLessonFlow(
                                                            context: context,
                                                            state: state,
                                                            onChanged: () {},
                                                            lesson:
                                                                resumeLesson,
                                                            resumeFrom: session,
                                                          );
                                                        },
                                                        icon: const Icon(
                                                          Icons
                                                              .play_circle_fill_rounded,
                                                        ),
                                                        label: const Text(
                                                          'Resume from backend session',
                                                        ),
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
                                          child: Text(
                                            'Assigned lessons',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                        StatusPill(
                                          text:
                                              '${assignedLessons.length} shown',
                                          color: LumoTheme.accentOrange,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      state.assignedLessonSummaryForLearner(
                                        learner,
                                      ),
                                      style: const TextStyle(
                                        color: Color(0xFF475569),
                                        height: 1.4,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    if (nextLesson != null)
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEEF2FF),
                                          borderRadius:
                                              BorderRadius.circular(18),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Continue learning',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w800,
                                                color: Color(0xFF312E81),
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              '${nextLesson.title} • ${nextLesson.durationMinutes} min',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(nextLesson.readinessFocus),
                                            const SizedBox(height: 12),
                                            SizedBox(
                                              width: double.infinity,
                                              child: FilledButton.icon(
                                                onPressed: () {
                                                  launchLessonFlow(
                                                    context: context,
                                                    state: state,
                                                    onChanged: () {},
                                                    lesson: nextLesson,
                                                    resumeFrom:
                                                        resumableSession,
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
                                        (lesson) => Container(
                                          width: double.infinity,
                                          margin: const EdgeInsets.only(
                                            bottom: 10,
                                          ),
                                          padding: const EdgeInsets.all(14),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFF8FAFC),
                                            borderRadius:
                                                BorderRadius.circular(18),
                                            border: Border.all(
                                              color: const Color(0xFFE2E8F0),
                                            ),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                lesson.title,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                '${lesson.subject} • ${lesson.durationMinutes} min',
                                                style: const TextStyle(
                                                  color: Color(0xFF64748B),
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(
                                                lesson.scenario,
                                                style: const TextStyle(
                                                  height: 1.35,
                                                ),
                                              ),
                                            ],
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
                            final json =
                                const JsonEncoder.withIndent('  ').convert({
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
            ],
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

  const SubjectModulesPage({
    super.key,
    required this.state,
    required this.onChanged,
    required this.module,
  });

  @override
  Widget build(BuildContext context) {
    final selectedLearner = state.currentLearner;
    final lessons = selectedLearner == null
        ? state.assignedLessons
            .where((lesson) => lesson.moduleId == module.id)
            .toList()
        : state.lessonsForLearnerAndModule(selectedLearner, module.id);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction: modulesInstruction,
                  onVoiceTap: () {
                    state.replayVisiblePrompt(
                      'You opened ${module.title}. Tap a module lesson to choose a learner and begin.',
                    );
                  },
                  prompt:
                      'You opened ${module.title}. Tap a module lesson to choose a learner and begin.',
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'AI Mallam introduces the subject',
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: DetailCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Back'),
                          ),
                          const Spacer(),
                          StatusPill(
                              text: module.badge, color: LumoTheme.primary),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Text(
                        module.title,
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        module.description,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 16,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _BackendStatusBanner(state: state),
                      const SizedBox(height: 16),
                      if (selectedLearner != null) ...[
                        _CurrentLearnerBanner(
                          title: 'Current learner: ${selectedLearner.name}',
                          learner: selectedLearner,
                          nextLesson: state.nextAssignedLessonForLearner(
                            selectedLearner,
                          ),
                          backendSummary: state.backendRoutingSummaryForLearner(
                            selectedLearner,
                          ),
                          onOpenProfile: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => LearnerProfilePage(
                                  state: state,
                                  learner: selectedLearner,
                                ),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (lessons.isEmpty)
                        const SoftPanel(
                          child: Text(
                              'No lessons are mapped to this subject yet.'),
                        )
                      else
                        Expanded(
                          child: ListView.separated(
                            itemCount: lessons.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final lesson = lessons[index];
                              return GestureDetector(
                                onTap: () {
                                  state.selectModule(module);
                                  onChanged();
                                  launchLessonFlow(
                                    context: context,
                                    state: state,
                                    onChanged: onChanged,
                                    lesson: lesson,
                                    module: module,
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(18),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(22),
                                    border: Border.all(
                                      color: const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              lesson.title,
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          ),
                                          StatusPill(
                                            text:
                                                '${lesson.steps.length} steps',
                                            color: LumoTheme.accentOrange,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(lesson.readinessFocus),
                                      const SizedBox(height: 10),
                                      Text(
                                        lesson.scenario,
                                        style: const TextStyle(
                                          color: Color(0xFF64748B),
                                          height: 1.35,
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: InfoRow(
                                              label: 'Duration',
                                              value:
                                                  '${lesson.durationMinutes} min',
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          const Text(
                                            'Tap to choose learner',
                                            style: TextStyle(
                                              color: LumoTheme.primary,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
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

  @override
  void initState() {
    super.initState();
    var draft = widget.state.registrationDraft;
    final defaultTarget = widget.state.registrationContext.defaultTarget;
    if (defaultTarget != null) {
      draft = draft.copyWith(
        cohort: draft.cohort.trim().isEmpty
            ? defaultTarget.cohort.name
            : draft.cohort,
        mallamId: draft.mallamId.trim().isEmpty
            ? defaultTarget.mallam.id
            : draft.mallamId,
      );
      widget.state.updateDraft(draft);
    }
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
        mallamId: selectedMallamId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
      mallamId: selectedMallamId,
    );
    final recommendedModule = widget.state.recommendedModuleForDraft;
    final registrationTarget = widget.state.registrationTargetForDraft;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ResponsivePane(
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
                  statusLabel: 'AI Mallam is guiding registration',
                ),
              ),
              ResponsivePane(
                child: DetailCard(
                  child: Column(
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
                      const SizedBox(height: 18),
                      _ProgressMeter(score: draft.completionScore),
                      const SizedBox(height: 18),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
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
                                            onChanged: (_) =>
                                                setState(syncDraft),
                                            decoration: const InputDecoration(
                                              labelText: 'Cohort',
                                            ),
                                          )
                                        : DropdownButtonFormField<String>(
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
                                        for (var i = 0;
                                            i < fields.length;
                                            i++) ...[
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
                                      for (var i = 0;
                                          i < fields.length;
                                          i++) ...[
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
                                    initialValue: hasSelectedMallam
                                        ? selectedMallamId
                                        : null,
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
                                        for (var i = 0;
                                            i < fields.length;
                                            i++) ...[
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
                                      for (var i = 0;
                                          i < fields.length;
                                          i++) ...[
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
                                      initialValue: baselineLevel,
                                      items: const [
                                        DropdownMenuItem(
                                          value: 'No prior exposure',
                                          child: Text('No prior exposure'),
                                        ),
                                        DropdownMenuItem(
                                          value: 'Can repeat with support',
                                          child:
                                              Text('Can repeat with support'),
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
                                        for (var i = 0;
                                            i < fields.length;
                                            i++) ...[
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
                                      for (var i = 0;
                                          i < fields.length;
                                          i++) ...[
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
                                controlAffinity:
                                    ListTileControlAffinity.leading,
                              ),
                              const SizedBox(height: 8),
                              _RegistrationReadinessStrip(draft: draft),
                              const SizedBox(height: 18),
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
                                                : draft.missingFields
                                                    .join(', '),
                                          ),
                                          InfoRow(
                                            label: 'Backend target',
                                            value: widget.state
                                                .registrationTargetSummary,
                                          ),
                                          if (registrationTarget != null)
                                            InfoRow(
                                              label: 'Assigned pod',
                                              value: registrationTarget
                                                  .cohort.podId,
                                            ),
                                          if (registrationTarget != null)
                                            InfoRow(
                                              label: 'Assigned mallam',
                                              value: registrationTarget
                                                  .mallam.name,
                                            ),
                                        ],
                                      ),
                                    ),
                                  ];

                                  if (compact) {
                                    return Column(
                                      children: [
                                        for (var i = 0;
                                            i < panels.length;
                                            i++) ...[
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
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      for (var i = 0;
                                          i < panels.length;
                                          i++) ...[
                                        Expanded(child: panels[i]),
                                        if (i < panels.length - 1)
                                          const SizedBox(width: 12),
                                      ],
                                    ],
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: draft.isValid &&
                                  !widget.state.isRegisteringLearner
                              ? () async {
                                  syncDraft();
                                  setState(() {});
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
                                }
                              : null,
                          child: Text(widget.state.isRegisteringLearner
                              ? 'Saving learner...'
                              : 'Save learner'),
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
                    Text(
                      state.usingFallbackData
                          ? 'Profile saved locally because backend sync was unavailable.'
                          : 'Profile posted to the backend and added to the learner list.',
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

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final lesson = widget.lesson;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1320),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Back'),
                      ),
                      const Spacer(),
                      StatusPill(
                        text: lesson.subject,
                        color: LumoTheme.primary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SectionTitle(
                    title: 'Choose learner',
                    subtitle:
                        'Pick who is taking ${lesson.title}, then confirm to begin.',
                  ),
                  const SizedBox(height: 12),
                  if (widget.resumeFrom != null)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Text(
                        'Resume ready from ${widget.resumeFrom!.progressLabel.toLowerCase()}. Learner confirmation is still required before the lesson opens.',
                        style: const TextStyle(
                          color: Color(0xFF312E81),
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
                              '${selectedLearner!.name} is selected for ${lesson.title}.',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
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
                  Expanded(
                    child: state.learners.isEmpty
                        ? Center(
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
                                      'You cannot start ${lesson.title} until at least one learner is registered on this tablet or synced from the backend. Register the first learner now instead of leaving the facilitator on a blank chooser.',
                                      style: const TextStyle(
                                        color: Color(0xFF475569),
                                        height: 1.45,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    SizedBox(
                                      width: double.infinity,
                                      child: FilledButton.icon(
                                        onPressed: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) => RegisterPage(
                                                state: state,
                                                onChanged: widget.onChanged,
                                              ),
                                            ),
                                          );
                                        },
                                        icon: const Icon(
                                          Icons.person_add_alt_1_rounded,
                                        ),
                                        label: const Text(
                                          'Register first learner',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                        : LayoutBuilder(
                            builder: (context, constraints) {
                              final crossAxisCount = _adaptiveGridCount(
                                constraints.maxWidth,
                                minTileWidth: 280,
                                maxCount: 4,
                              );

                              final mainAxisExtent = constraints.maxWidth < 760
                                  ? 276.0
                                  : constraints.maxWidth < 1180
                                      ? 292.0
                                      : 308.0;

                              return GridView.builder(
                                padding: const EdgeInsets.only(bottom: 12),
                                itemCount: state.learners.length,
                                gridDelegate:
                                    SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  mainAxisSpacing: 12,
                                  crossAxisSpacing: 12,
                                  mainAxisExtent: mainAxisExtent,
                                ),
                                itemBuilder: (context, index) {
                                  final learner = state.learners[index];
                                  final isSelected =
                                      selectedLearner?.id == learner.id;
                                  return GestureDetector(
                                    onTap: () {
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
                                      child: _LearnerCard(
                                        learner: learner,
                                        state: state,
                                        dense: true,
                                        isActive: isSelected,
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: state.learners.isEmpty
                        ? null
                        : selectedLearner == null
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
                                      resumeFrom: widget.resumeFrom,
                                    ),
                                  ),
                                );
                              },
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: Text(
                      state.learners.isEmpty
                          ? 'Register learner to continue'
                          : selectedLearner == null
                              ? 'Select learner to continue'
                              : 'Start with ${selectedLearner!.name}',
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
    widget.state.startLesson(widget.lesson, resumeFrom: widget.resumeFrom);
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
                    const Icon(
                      Icons.hourglass_top_rounded,
                      size: 56,
                      color: LumoTheme.primary,
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

class _LessonSessionPageState extends State<LessonSessionPage> {
  late final TextEditingController responseController;
  late final AudioCaptureService audioCaptureService;
  late final SpeechTranscriptionService speechTranscriptionService;
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
  bool _promptedCurrentStep = false;
  bool _resumedSession = false;
  String _latestFinalTranscript = '';
  String _recordingModeLabel = 'Standard recorder';
  int _consecutiveTranscriptMisses = 0;
  bool _autoPausedByTranscriptFailure = false;

  static const Duration _kMinimumUsefulRecording = Duration(milliseconds: 900);

  @override
  void initState() {
    super.initState();
    responseController = TextEditingController();
    audioCaptureService = AudioCaptureService();
    speechTranscriptionService = SpeechTranscriptionService();

    final session = widget.state.activeSession;
    if (session != null) {
      responseController.text = session.latestLearnerResponse ?? '';
      _latestFinalTranscript = session.latestLearnerResponse ?? '';
      _resumedSession = session.totalResponses > 0 || session.stepIndex > 0;
      if (session.latestLearnerResponse != null &&
          session.latestLearnerResponse!.trim().isNotEmpty) {
        liveTranscript = session.latestLearnerResponse!.trim();
      }
      microphoneStatus = _resumedSession
          ? 'Resumed ${widget.lesson.title} at step ${session.stepIndex + 1}. ${session.automationStatus}'
          : session.automationStatus;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _speakCurrentStepIfNeeded(force: true);
    });
  }

  @override
  void dispose() {
    recordingTicker?.cancel();
    _speechAutoStopDebounce?.cancel();
    speechTranscriptionService.cancel();
    audioCaptureService.dispose();
    responseController.dispose();
    super.dispose();
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

  String _buildFallbackCaptureStatus({
    required String audioMessage,
    required bool speechReady,
  }) {
    if (speechReady) {
      return audioMessage;
    }
    return '$audioMessage ${speechTranscriptionService.availabilityLabel}';
  }

  Future<void> _speakCurrentStepIfNeeded({bool force = false}) async {
    final session = widget.state.activeSession;
    if (session == null) return;
    if (_promptedCurrentStep && !force) return;
    _promptedCurrentStep = true;
    final prompt =
        widget.state.personalizePrompt(session.currentStep.coachPrompt);
    final readyMessage = _resumedSession
        ? 'Mallam has resumed this step. The mic will reopen for the learner now.'
        : 'Mallam finished speaking. Start recording and let the learner answer now.';
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

  Future<void> _speakAndMaybeAutoRecord(
    String text, {
    SpeakerMode mode = SpeakerMode.guiding,
    String? autoReadyMessage,
  }) async {
    await _prepareForMallamSpeech();
    if (!mounted) return;
    setState(() {
      isSpeaking = true;
      microphoneStatus = 'Mallam is speaking now.';
    });
    await widget.state.replayVisiblePrompt(text, mode: mode);
    if (!mounted) return;
    setState(() {
      isSpeaking = false;
      microphoneStatus = isAutoMode
          ? (autoReadyMessage ??
              'Mallam finished speaking. The mic will start for the learner now.')
          : 'Mallam finished speaking. Listen for the learner response.';
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
            'Mallam finished speaking. Start recording when the learner is ready.';
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
    final status = switch (supportType) {
      'hint' => 'Hint given. The mic will start for the learner’s next try.',
      'model' =>
        'Model answer played. The mic will start for the learner to repeat it.',
      'slow' =>
        'Slow repeat played. The mic will start for the learner response.',
      'translate' =>
        'Translated support played. The mic will start for the learner response.',
      'wait' =>
        'Think time is over. The mic will start when the learner is ready.',
      _ => 'Support played. The mic will start for the learner response.',
    };

    await _speakAndMaybeAutoRecord(
      supportPrompt,
      mode: mode,
      autoReadyMessage: status,
    );
  }

  Future<void> _afterCorrectResponse() async {
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
      microphoneStatus =
          'Correct response captured. Mallam is moving to the next step.';
    });
    await _speakCurrentStepIfNeeded(force: true);
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
      autoReadyMessage: 'Mallam replayed the activity prompt.',
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
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonalIcon(
                  onPressed: focusText == null && activity.mediaValue == null
                      ? null
                      : () =>
                          _speakActivityText(focusText ?? activity.mediaValue!),
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
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(prompt),
            if (supportText != null) ...[
              const SizedBox(height: 8),
              Text(
                supportText,
                style: const TextStyle(color: Color(0xFF475569)),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: List.generate(activity.choices.length, (index) {
                final choice = activity.choices[index];
                final emoji = index < activity.choiceEmoji.length
                    ? activity.choiceEmoji[index]
                    : '🖼️';
                return InkWell(
                  onTap: () => _setResponseAndMaybeSubmit(choice, submit: true),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: 130,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFD6D3FF)),
                    ),
                    child: Column(
                      children: [
                        Text(emoji, style: const TextStyle(fontSize: 42)),
                        const SizedBox(height: 10),
                        Text(
                          choice,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                );
              }),
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
                  focusText ?? activity.mediaValue!,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF9A3412),
                  ),
                ),
              ),
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
          Row(
            children: [
              const Icon(Icons.extension_rounded, color: LumoTheme.primary),
              const SizedBox(width: 8),
              const Text(
                'Interactive activity',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
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
      transcriptCapturedThisTake = false;
      liveTranscript = '';
      _latestFinalTranscript = '';
      transcriptReviewPending = false;
      if (shouldClearStaleDraft) {
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

      final speechReady = await speechTranscriptionService.start(
        onResult: (transcript, isFinal) {
          if (!mounted) return;
          final cleaned = transcript.trim();
          if (cleaned.isEmpty) return;
          setState(() {
            liveTranscript = cleaned;
            if (isFinal) {
              _latestFinalTranscript = cleaned;
            }
            transcriptCapturedThisTake =
                cleaned.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').length >= 2;
          });
        },
        onStatus: _handleSpeechStatus,
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
            'That recording was extremely short (${formatDuration(savedDuration)}). Mallam will reopen the mic for a clearer learner answer.';
      });
      await _startRecordingIfPossible(
        fallbackMessage:
            'The last take was too short. The mic is reopening for a clearer learner answer.',
      );
      return;
    }

    if (_autoPausedByTranscriptFailure) {
      return;
    }

    final recoverySupport = _consecutiveTranscriptMisses >= 2 ? 'slow' : 'wait';
    final recoveryMessage = _consecutiveTranscriptMisses >= 2
        ? 'Transcript help missed that answer, so Mallam will slow-repeat and reopen the mic.'
        : 'Transcript help missed that answer, so Mallam will give a short pause and reopen the mic.';

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

    if (transcript.isNotEmpty) {
      _resetTranscriptRecoveryState();
      responseController.text = transcript;
      transcriptReviewPending = !isAutoMode;
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
          ? 'Learner voice saved (${formatDuration(result.duration)}). Transcript captured.'
          : 'Learner voice saved (${formatDuration(result.duration)}). No transcript was detected, so the app kept the audio and is ready for a manual check.';
      final recoveryLabel = _consecutiveTranscriptMisses >= 3
          ? ' Auto mode paused after repeated transcript misses. Confirm the answer manually or keep teaching with audio-first support.'
          : _consecutiveTranscriptMisses >= 2
              ? ' Transcript help is struggling, so Repeat mode is now active for a safer hands-free loop.'
              : '';
      microphoneStatus = markReadyForResume && !transcriptReviewPending
          ? '$savedLabel Ready for Mallam or the next learner attempt.$recoveryLabel'
          : '$savedLabel$recoveryLabel';
    });

    if (transcript.isNotEmpty && isAutoMode && !isProcessingTranscript) {
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

  String compactPath(String path) {
    final normalized = path.replaceAll('\\', '/');
    final segments =
        normalized.split('/').where((segment) => segment.isNotEmpty).toList();
    if (segments.length <= 2) return normalized;
    return '…/${segments[segments.length - 2]}/${segments.last}';
  }

  @override
  Widget build(BuildContext context) {
    final learner = widget.state.currentLearner!;
    final session = widget.state.activeSession!;
    final step = session.currentStep;
    final suggestions = widget.state.suggestedResponsesForCurrentStep();
    final expectedResponse =
        widget.state.personalizeExpectedResponse(step.expectedResponse);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  children: [
                    Expanded(
                      child: MallamPanel(
                        instruction: lessonInstruction,
                        onVoiceTap: () async {
                          _promptedCurrentStep = false;
                          await _speakCurrentStepIfNeeded(force: true);
                          widget.onChanged();
                          setState(() {});
                        },
                        prompt:
                            widget.state.personalizePrompt(step.coachPrompt),
                        speakerMode: session.speakerMode,
                        statusLabel: _speakerModeLabel(session.speakerMode),
                        secondaryStatus:
                            'Step ${session.stepIndex + 1} of ${widget.lesson.steps.length}',
                        voiceButtonLabel: 'Replay Mallam',
                        speakerOutputMode: session.speakerOutputMode,
                        voiceHint: isSpeaking
                            ? 'Mallam is active on the left while the learner task stays visible on the right.'
                            : 'Keep the learner looking right at the lesson workspace while Mallam guides from this side.',
                      ),
                    ),
                    const SizedBox(height: 16),
                    _LessonStageStrip(
                      session: session,
                      lesson: widget.lesson,
                    ),
                    const SizedBox(height: 16),
                    _LessonTranscriptPanel(
                      session: session,
                      learnerName: learner.name,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: DetailCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          OutlinedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Back'),
                          ),
                          const Spacer(),
                          StatusPill(
                            text: widget.lesson.subject,
                            color: LumoTheme.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Text(
                        widget.lesson.title,
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Learner: ${learner.name} • ${learner.readinessLabel}',
                      ),
                      const SizedBox(height: 16),
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final compact = constraints.maxWidth < 640;
                          final tiles = [
                            MetricTile(
                              label: 'Progress',
                              value:
                                  '${session.stepIndex + 1}/${widget.lesson.steps.length}',
                              icon: Icons.alt_route_rounded,
                              color: LumoTheme.primary,
                            ),
                            MetricTile(
                              label: 'Responses',
                              value: '${session.totalResponses}',
                              icon: Icons.chat_bubble_outline_rounded,
                              color: LumoTheme.accentGreen,
                            ),
                            MetricTile(
                              label: 'Auto mode',
                              value: isAutoMode ? 'On' : 'Off',
                              icon: Icons.smart_toy_rounded,
                              color: LumoTheme.accentOrange,
                            ),
                          ];

                          if (compact) {
                            return Column(
                              children: [
                                for (var i = 0; i < tiles.length; i++) ...[
                                  SizedBox(
                                      width: double.infinity, child: tiles[i]),
                                  if (i < tiles.length - 1)
                                    const SizedBox(height: 12),
                                ],
                              ],
                            );
                          }

                          return Row(
                            children: [
                              for (var i = 0; i < tiles.length; i++) ...[
                                Expanded(child: tiles[i]),
                                if (i < tiles.length - 1)
                                  const SizedBox(width: 12),
                              ],
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 16),
                      LinearProgressIndicator(
                        value: session.progress,
                        minHeight: 10,
                        borderRadius:
                            const BorderRadius.all(Radius.circular(999)),
                        color: LumoTheme.primary,
                        backgroundColor: const Color(0xFFE9E7FF),
                      ),
                      const SizedBox(height: 16),
                      SoftPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Practice mode',
                              style: TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              widget.state.degradedModeSummary,
                              style: const TextStyle(
                                color: Color(0xFF475569),
                                height: 1.35,
                              ),
                            ),
                            const SizedBox(height: 10),
                            ...widget.state
                                .degradedModeActions(
                                  speechAvailable: speechRecognitionActive,
                                  transcriptMisses:
                                      _consecutiveTranscriptMisses,
                                )
                                .take(3)
                                .map(
                                  (action) => Padding(
                                    padding: const EdgeInsets.only(bottom: 6),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Padding(
                                          padding: EdgeInsets.only(top: 2),
                                          child: Icon(
                                            Icons.check_circle_outline_rounded,
                                            size: 16,
                                            color: LumoTheme.accentGreen,
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
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: PracticeMode.values.map((mode) {
                                final selected = session.practiceMode == mode;
                                final label = switch (mode) {
                                  PracticeMode.standard => 'Standard',
                                  PracticeMode.repeatAfterMe => 'Repeat',
                                  PracticeMode.independentCheck =>
                                    'Independent',
                                };
                                return ChoiceChip(
                                  label: Text(label),
                                  selected: selected,
                                  onSelected: (_) {
                                    widget.state.setPracticeMode(mode);
                                    widget.onChanged();
                                    setState(() {
                                      microphoneStatus = widget
                                              .state
                                              .activeSession
                                              ?.automationStatus ??
                                          microphoneStatus;
                                    });
                                  },
                                );
                              }).toList(),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              session.practiceMode == PracticeMode.repeatAfterMe
                                  ? 'Best for explicit practice loops: Mallam expects a close echo and will slow-repeat when ASR or the learner misses it.'
                                  : session.practiceMode ==
                                          PracticeMode.independentCheck
                                      ? 'Best for freer answers: lighter matching, less hand-holding.'
                                      : 'Balanced guided practice with hints before stronger support.',
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            children: [
                              SoftPanel(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            step.title,
                                            style: const TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                        _SpeakerStateBadge(
                                          mode: session.speakerMode,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(step.instruction),
                                    const SizedBox(height: 12),
                                    LabelValueWrap(
                                      items: [
                                        ('Expected response', expectedResponse),
                                        (
                                          'Facilitator tip',
                                          step.facilitatorTip
                                        ),
                                        (
                                          'Real-world check',
                                          step.realWorldCheck
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              if (step.activity != null) ...[
                                _buildActivityPanel(step),
                                const SizedBox(height: 16),
                              ],
                              SoftPanel(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Automation',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    SwitchListTile(
                                      contentPadding: EdgeInsets.zero,
                                      value: isAutoMode,
                                      onChanged: (value) {
                                        setState(() {
                                          isAutoMode = value;
                                          if (value) {
                                            _autoPausedByTranscriptFailure =
                                                false;
                                          }
                                          transcriptReviewPending =
                                              !value && transcriptReviewPending;
                                        });
                                      },
                                      title: const Text('Auto lesson mode'),
                                      subtitle: Text(isAutoMode
                                          ? 'Mallam speaks the step, checks the captured answer, advances on correct responses, and repeats when the answer needs help.'
                                          : 'Facilitator confirms each response manually.'),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      isSpeaking
                                          ? 'Mallam is speaking now.'
                                          : (widget.state.activeSession
                                                  ?.automationStatus ??
                                              microphoneStatus ??
                                              'Tap AI Mallam to replay the current instruction.'),
                                      style: const TextStyle(
                                        color: Color(0xFF475569),
                                        height: 1.4,
                                      ),
                                    ),
                                    if (widget.state.shouldOfferHandsFreeResume(
                                      speechAvailable: speechRecognitionActive,
                                      transcriptMisses:
                                          _consecutiveTranscriptMisses,
                                      autoPaused:
                                          _autoPausedByTranscriptFailure,
                                      hasDraftResponse: responseController.text
                                          .trim()
                                          .isNotEmpty,
                                    )) ...[
                                      const SizedBox(height: 12),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFFBEB),
                                          borderRadius:
                                              BorderRadius.circular(16),
                                          border: Border.all(
                                            color: const Color(0xFFFCD34D),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Hands-free recovery',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w800,
                                                color: Color(0xFF78350F),
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              widget.state
                                                  .handsFreeRecoverySummary(
                                                speechAvailable:
                                                    speechRecognitionActive,
                                                transcriptMisses:
                                                    _consecutiveTranscriptMisses,
                                                autoPaused:
                                                    _autoPausedByTranscriptFailure,
                                                hasDraftResponse:
                                                    responseController.text
                                                        .trim()
                                                        .isNotEmpty,
                                              ),
                                              style: const TextStyle(
                                                color: Color(0xFF92400E),
                                                height: 1.4,
                                              ),
                                            ),
                                            const SizedBox(height: 10),
                                            Wrap(
                                              spacing: 8,
                                              runSpacing: 8,
                                              children: [
                                                FilledButton.tonalIcon(
                                                  onPressed: isRecording ||
                                                          isSpeaking
                                                      ? null
                                                      : _resumeHandsFreeLoop,
                                                  icon: const Icon(
                                                    Icons.smart_toy_rounded,
                                                  ),
                                                  label: const Text(
                                                    'Resume hands-free loop',
                                                  ),
                                                ),
                                                if (_autoPausedByTranscriptFailure)
                                                  OutlinedButton.icon(
                                                    onPressed: () {
                                                      setState(() {
                                                        _resetTranscriptRecoveryState(
                                                          clearReviewPending:
                                                              false,
                                                        );
                                                        microphoneStatus =
                                                            'Hands-free pause acknowledged. Keep coaching manually until you want to resume.';
                                                      });
                                                    },
                                                    icon: const Icon(
                                                      Icons
                                                          .pause_circle_rounded,
                                                    ),
                                                    label: const Text(
                                                      'Stay manual for now',
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              if (_resumedSession ||
                                  session.latestLearnerAudioPath != null ||
                                  session.latestLearnerResponse != null) ...[
                                SoftPanel(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Resume continuity',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        session.latestLearnerResponse != null &&
                                                session.latestLearnerResponse!
                                                    .trim()
                                                    .isNotEmpty
                                            ? 'Last captured learner answer: ${session.latestLearnerResponse}'
                                            : 'This lesson can continue from the saved step even when transcript help drops out.',
                                        style: const TextStyle(
                                          color: Color(0xFF475569),
                                          height: 1.4,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          if (session.latestLearnerResponse !=
                                                  null &&
                                              session.latestLearnerResponse!
                                                  .trim()
                                                  .isNotEmpty)
                                            FilledButton.tonalIcon(
                                              onPressed: () =>
                                                  _setResponseAndMaybeSubmit(
                                                session.latestLearnerResponse!,
                                              ),
                                              icon: const Icon(
                                                Icons.restore_rounded,
                                              ),
                                              label: const Text(
                                                'Reuse last answer',
                                              ),
                                            ),
                                          if (session.latestLearnerAudioPath !=
                                              null)
                                            OutlinedButton.icon(
                                              onPressed: () {
                                                setState(() {
                                                  microphoneStatus =
                                                      'Saved learner audio is still attached. You can record again, type the answer, or keep going manually.';
                                                });
                                              },
                                              icon: const Icon(
                                                Icons.library_music_rounded,
                                              ),
                                              label: const Text(
                                                'Keep saved audio',
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],
                              _CoachActionsRow(
                                onReplay: () async {
                                  _promptedCurrentStep = false;
                                  await widget.state.repeatCurrentStep();
                                  if (!mounted) return;
                                  setState(() {
                                    microphoneStatus =
                                        'Mallam replayed the current step and can reopen the mic.';
                                  });
                                  if (isAutoMode) {
                                    await _startRecordingIfPossible(
                                      fallbackMessage:
                                          'Mallam replayed the current step. The mic is reopening for the learner.',
                                    );
                                  }
                                  widget.onChanged();
                                },
                                onHint: () => _runCoachSupport('hint'),
                                onModel: () => _runCoachSupport('model'),
                                onSlow: () => _runCoachSupport('slow'),
                                onWait: () => _runCoachSupport('wait'),
                                onTranslate: () =>
                                    _runCoachSupport('translate'),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: responseController,
                                onChanged: (_) => setState(() {}),
                                decoration: const InputDecoration(
                                  labelText: 'Learner response',
                                  hintText:
                                      'Transcript or typed response appears here',
                                ),
                              ),
                              const SizedBox(height: 10),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: suggestions
                                    .map(
                                      (suggestion) => ActionChip(
                                        label: Text(suggestion),
                                        onPressed: () =>
                                            _handleSubmittedResponse(
                                                suggestion),
                                      ),
                                    )
                                    .toList(),
                              ),
                              const SizedBox(height: 12),
                              if (transcriptReviewPending) ...[
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFFBEB),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: const Color(0xFFFCD34D),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Review transcript before advancing',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF78350F),
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          FilledButton.tonalIcon(
                                            onPressed: () =>
                                                _handleSubmittedResponse(
                                              responseController.text,
                                            ),
                                            icon: const Icon(
                                              Icons.check_circle_rounded,
                                            ),
                                            label: const Text(
                                              'Confirm transcript',
                                            ),
                                          ),
                                          OutlinedButton.icon(
                                            onPressed: () {
                                              setState(() {
                                                transcriptReviewPending = false;
                                                if (responseController.text
                                                    .trim()
                                                    .isEmpty) {
                                                  microphoneStatus =
                                                      'Transcript review skipped. Keep teaching from the saved audio and type the answer only when you are ready.';
                                                } else {
                                                  microphoneStatus =
                                                      'Transcript review skipped. The draft answer stays editable while the saved audio remains attached.';
                                                }
                                              });
                                            },
                                            icon: const Icon(
                                              Icons.graphic_eq_rounded,
                                            ),
                                            label: const Text('Use audio only'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),
                              ],
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton.tonal(
                                      onPressed: () => _handleSubmittedResponse(
                                        responseController.text,
                                      ),
                                      child: const Text('Save typed response'),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: session.hasLearnerInput &&
                                              !transcriptReviewPending
                                          ? () async {
                                              await _afterCorrectResponse();
                                            }
                                          : null,
                                      child: Text(
                                        session.isLastStep
                                            ? 'Finish lesson'
                                            : 'Next step',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              SoftPanel(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Learner microphone capture',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      microphoneStatus ??
                                          'Press Start recording after Mallam speaks. The app will save audio and use live transcript when possible.',
                                      style: const TextStyle(
                                        color: Color(0xFF475569),
                                        height: 1.4,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Wrap(
                                      spacing: 12,
                                      runSpacing: 12,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        FilledButton.icon(
                                          onPressed: isRecording
                                              ? null
                                              : startRecording,
                                          icon: const Icon(Icons.mic_rounded),
                                          label: const Text('Start recording'),
                                        ),
                                        FilledButton.tonalIcon(
                                          onPressed: isRecording
                                              ? stopRecording
                                              : null,
                                          icon: const Icon(
                                            Icons.stop_circle_outlined,
                                          ),
                                          label: const Text('Stop and save'),
                                        ),
                                        OutlinedButton.icon(
                                          onPressed: isRecording
                                              ? null
                                              : () async {
                                                  await _retryTranscriptEngine();
                                                },
                                          icon: const Icon(
                                            Icons.refresh_rounded,
                                          ),
                                          label: const Text('Retry transcript'),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 10,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isRecording
                                                ? const Color(0xFFFFF1F2)
                                                : const Color(0xFFF8FAFC),
                                            borderRadius:
                                                BorderRadius.circular(999),
                                            border: Border.all(
                                              color: isRecording
                                                  ? const Color(0xFFFDA4AF)
                                                  : const Color(0xFFE2E8F0),
                                            ),
                                          ),
                                          child: Text(
                                            isRecording
                                                ? 'Recording ${formatDuration(currentRecordingDuration)}'
                                                : 'Ready for learner audio',
                                            style: TextStyle(
                                              color: isRecording
                                                  ? const Color(0xFFBE123C)
                                                  : const Color(0xFF475569),
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (!speechRecognitionActive &&
                                        !isRecording) ...[
                                      const SizedBox(height: 12),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFFBEB),
                                          borderRadius:
                                              BorderRadius.circular(16),
                                          border: Border.all(
                                            color: const Color(0xFFFCD34D),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Audio fallback recovery',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w800,
                                                color: Color(0xFF78350F),
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              _consecutiveTranscriptMisses >= 2
                                                  ? 'Transcript help missed $_consecutiveTranscriptMisses takes in a row. Stay in audio-first mode, use Repeat or Model answer, and sync later if the network is flaky. ${speechTranscriptionService.availabilityLabel}'
                                                  : speechTranscriptionService
                                                      .availabilityLabel,
                                              style: const TextStyle(
                                                color: Color(0xFF92400E),
                                                height: 1.4,
                                              ),
                                            ),
                                            const SizedBox(height: 10),
                                            Wrap(
                                              spacing: 8,
                                              runSpacing: 8,
                                              children: [
                                                FilledButton.tonalIcon(
                                                  onPressed: responseController
                                                          .text
                                                          .trim()
                                                          .isEmpty
                                                      ? null
                                                      : () =>
                                                          _handleSubmittedResponse(
                                                            responseController
                                                                .text,
                                                          ),
                                                  icon: const Icon(
                                                    Icons.check_circle_rounded,
                                                  ),
                                                  label: const Text(
                                                    'Submit typed answer',
                                                  ),
                                                ),
                                                FilledButton.tonalIcon(
                                                  onPressed: isRecording ||
                                                          isSpeaking
                                                      ? null
                                                      : _resumeHandsFreeLoop,
                                                  icon: const Icon(
                                                    Icons.smart_toy_rounded,
                                                  ),
                                                  label: const Text(
                                                    'Resume hands-free loop',
                                                  ),
                                                ),
                                                OutlinedButton.icon(
                                                  onPressed: () =>
                                                      _runCoachSupport('model'),
                                                  icon: const Icon(
                                                    Icons
                                                        .record_voice_over_rounded,
                                                  ),
                                                  label: const Text(
                                                    'Play model answer',
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                    if (liveTranscript.isNotEmpty ||
                                        speechRecognitionActive) ...[
                                      const SizedBox(height: 12),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFEEF2FF),
                                          borderRadius:
                                              BorderRadius.circular(16),
                                          border: Border.all(
                                            color: const Color(0xFFC7D2FE),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              speechRecognitionActive
                                                  ? 'Live transcript'
                                                  : 'Captured transcript',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                color: Color(0xFF312E81),
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              liveTranscript.isEmpty
                                                  ? 'Listening for learner speech...'
                                                  : liveTranscript,
                                              style: const TextStyle(
                                                color: Color(0xFF4338CA),
                                                height: 1.4,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                    if (session.latestLearnerAudioPath !=
                                        null) ...[
                                      const SizedBox(height: 12),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF8FAFC),
                                          borderRadius:
                                              BorderRadius.circular(16),
                                          border: Border.all(
                                            color: const Color(0xFFE2E8F0),
                                          ),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            InfoRow(
                                              label: 'Latest learner audio',
                                              value: formatDuration(
                                                session.latestLearnerAudioDuration ??
                                                    Duration.zero,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              compactPath(
                                                session.latestLearnerAudioPath!,
                                              ),
                                              style: const TextStyle(
                                                color: Color(0xFF64748B),
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              _ResponseReviewBanner(
                                  review: session.latestReview),
                            ],
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
    final stackedSource = children.reversed.toList(growable: false);

    return List.generate(stackedSource.length, (index) {
      final child = stackedSource[index];
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
              height: viewportHeight * 0.72,
              child: columnChild,
            )
          : columnChild;
    });
  }

  @override
  Widget build(BuildContext context) {
    const breakpoint = 1180.0;

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

class LessonCompletePage extends StatelessWidget {
  final LumoAppState state;
  final LessonCardModel lesson;

  const LessonCompletePage({
    super.key,
    required this.state,
    required this.lesson,
  });

  @override
  Widget build(BuildContext context) {
    final learner = state.currentLearner!;
    final session = state.activeSession!;
    final nextLesson = state.nextLessonAfterCompletion(
      learner,
      completedLessonId: lesson.id,
    );
    final recommendedModule = state.recommendedModuleForLearner(learner);
    final routeSummary = state.nextLessonRouteSummaryForLearner(
      learner,
      completedLessonId: lesson.id,
    );
    final rewards = learner.rewards;
    final unlockedBadges =
        rewards?.badges.where((badge) => badge.earned).toList() ?? const [];

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
                        Icons.check_rounded,
                        color: Colors.green,
                        size: 46,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      state.rewardCelebrationHeadlineForLearner(learner),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You completed ${lesson.title}. ${state.rewardCelebrationDetailForLearner(learner)}',
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
                            value: '${state.pendingSyncEvents.length}',
                            icon: Icons.cloud_upload_rounded,
                            color: LumoTheme.accentGreen,
                          ),
                        ];

                        if (compact) {
                          return Column(
                            children: [
                              for (var i = 0; i < tiles.length; i++) ...[
                                SizedBox(
                                    width: double.infinity, child: tiles[i]),
                                if (i < tiles.length - 1)
                                  const SizedBox(height: 12),
                              ],
                            ],
                          );
                        }

                        return Row(
                          children: [
                            for (var i = 0; i < tiles.length; i++) ...[
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
                          crossAxisAlignment: CrossAxisAlignment.start,
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
                                  avatar:
                                      const Icon(Icons.stars_rounded, size: 18),
                                  label: Text('${rewards.points} pts'),
                                ),
                                Chip(
                                  avatar: const Icon(Icons.trending_up_rounded,
                                      size: 18),
                                  label: Text(
                                      '${rewards.levelLabel} • Level ${rewards.level}'),
                                ),
                                Chip(
                                  avatar: const Icon(
                                      Icons.workspace_premium_rounded,
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
                              borderRadius:
                                  const BorderRadius.all(Radius.circular(999)),
                              backgroundColor: const Color(0xFFE2E8F0),
                              valueColor: const AlwaysStoppedAnimation<Color>(
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
                                          Icons.emoji_events_rounded,
                                          size: 18,
                                          color: LumoTheme.accentOrange,
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
                        crossAxisAlignment: CrossAxisAlignment.start,
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
                                state.backendRoutingSummaryForLearner(learner),
                              ),
                              ('Recommended module', recommendedModule.title),
                              (
                                'Next lesson',
                                nextLesson?.title ?? 'Open module to choose',
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
                          state.selectLearner(learner);
                          state.selectModule(recommendedModule);
                          if (nextLesson != null) {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => LessonLaunchSetupPage(
                                  state: state,
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
                                state: state,
                                onChanged: () {},
                                module: recommendedModule,
                              ),
                            ),
                          );
                        },
                        child: Text(nextLesson == null
                            ? 'Open recommended module'
                            : 'Start next routed lesson'),
                      ),
                      secondary: OutlinedButton(
                        onPressed: () {
                          Navigator.of(context)
                              .popUntil((route) => route.isFirst);
                        },
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

class _LessonTranscriptPanel extends StatelessWidget {
  final LessonSessionState session;
  final String learnerName;

  const _LessonTranscriptPanel({
    required this.session,
    required this.learnerName,
  });

  @override
  Widget build(BuildContext context) {
    final turns =
        session.transcript.reversed.take(4).toList().reversed.toList();
    return SoftPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Live exchange',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              StatusPill(
                text: '${session.transcript.length} turns',
                color: LumoTheme.primary,
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...turns.map((turn) {
            final isMallam = turn.speaker == 'Mallam';
            final speaker = isMallam ? 'Mallam' : learnerName;
            final color = isMallam ? LumoTheme.primary : LumoTheme.accentGreen;
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
      ),
    );
  }
}

class _BackendStatusBanner extends StatelessWidget {
  final LumoAppState state;
  final Future<void> Function()? onRefresh;
  final Future<void> Function()? onSyncQueue;

  const _BackendStatusBanner({
    required this.state,
    this.onRefresh,
    this.onSyncQueue,
  });

  @override
  Widget build(BuildContext context) {
    final isLive = !state.usingFallbackData && state.lastSyncedAt != null;
    final color = isLive
        ? LumoTheme.accentGreen
        : (state.isBootstrapping ? LumoTheme.primary : LumoTheme.accentOrange);

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
            ],
          ),
          if (onRefresh != null || onSyncQueue != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (onRefresh != null)
                  OutlinedButton.icon(
                    onPressed: state.isBootstrapping
                        ? null
                        : () async {
                            await onRefresh!.call();
                          },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Refresh backend'),
                  ),
                if (onRefresh != null && onSyncQueue != null)
                  const SizedBox(width: 12),
                if (onSyncQueue != null)
                  FilledButton.tonalIcon(
                    onPressed:
                        state.pendingSyncEvents.isEmpty || state.isSyncingEvents
                            ? null
                            : () async {
                                await onSyncQueue!.call();
                              },
                    icon: const Icon(Icons.cloud_upload_rounded),
                    label: const Text('Sync queue now'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PrimaryActionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _PrimaryActionCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: color.withValues(alpha: 0.18)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: color.withValues(alpha: 0.12),
              child: Icon(icon, color: color),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: const TextStyle(color: Color(0xFF64748B), height: 1.35),
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
  final String backendSummary;
  final VoidCallback onOpenProfile;
  final VoidCallback? onContinue;

  const _CurrentLearnerBanner({
    required this.title,
    required this.learner,
    required this.nextLesson,
    required this.backendSummary,
    required this.onOpenProfile,
    this.onContinue,
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
          const SizedBox(height: 8),
          Text(
            backendSummary,
            style: const TextStyle(color: Color(0xFF475569), height: 1.35),
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
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              OutlinedButton.icon(
                onPressed: onOpenProfile,
                icon: const Icon(Icons.badge_rounded),
                label: const Text('Open learner profile'),
              ),
              if (onContinue != null)
                FilledButton.icon(
                  onPressed: onContinue,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: Text(
                    nextLesson == null
                        ? 'Open learner flow'
                        : 'Continue lesson',
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  final LearningModule module;
  final int lessonCount;
  final VoidCallback onTap;

  const _SubjectCard({
    required this.module,
    required this.lessonCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final palette = _modulePalette(module.id);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: palette),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: palette.first.withValues(alpha: 0.20),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                StatusPill(text: module.badge, color: Colors.white),
                Text(
                  '$lessonCount modules',
                  style: const TextStyle(
                    color: Colors.white,
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
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              module.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, height: 1.3),
            ),
          ],
        ),
      ),
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
                    CircleAvatar(
                      radius: compactHeight ? 24 : 28,
                      backgroundColor: const Color(0xFFE9E7FF),
                      child: Text(
                        learner.name.characters.first,
                        style: const TextStyle(fontWeight: FontWeight.bold),
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
                      text: '$points pts',
                      color: LumoTheme.accentOrange,
                    ),
                    StatusPill(
                      text: '$streak day streak',
                      color: const Color(0xFFEF4444),
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

class _LearnerRewardHero extends StatelessWidget {
  final LearnerProfile learner;
  final RewardSnapshot? rewards;
  final int totalXp;
  final int totalPoints;
  final int totalMinutes;
  final LearnerLeaderboardEntry? leaderboardEntry;
  final int unlockedBadgeCount;

  const _LearnerRewardHero({
    required this.learner,
    required this.rewards,
    required this.totalXp,
    required this.totalPoints,
    required this.totalMinutes,
    required this.leaderboardEntry,
    required this.unlockedBadgeCount,
  });

  @override
  Widget build(BuildContext context) {
    final headline = leaderboardEntry?.rank == 1
        ? 'Top of the board'
        : leaderboardEntry == null
            ? 'Learning momentum'
            : 'Chasing the top spot';
    final subline = leaderboardEntry?.rank == 1
        ? '${learner.name} is leading with $totalPoints points. Keep the streak alive.'
        : leaderboardEntry == null
            ? '${learner.name} has $totalPoints points, $totalXp XP, and ${learner.streakDays} streak days.'
            : '${leaderboardEntry!.pointsGapFromLeader} more points to catch the leader.';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF312E81), Color(0xFF6D28D9), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF312E81).withValues(alpha: 0.18),
            blurRadius: 26,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  headline,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (rewards != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '${rewards!.levelLabel} • Level ${rewards!.level}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            learner.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subline,
            style: const TextStyle(
              color: Color(0xFFE0E7FF),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _RewardHeroChip(
                  icon: Icons.workspace_premium_rounded,
                  label: '$totalPoints pts'),
              _RewardHeroChip(icon: Icons.stars_rounded, label: '$totalXp XP'),
              _RewardHeroChip(
                  icon: Icons.local_fire_department_rounded,
                  label: '${learner.streakDays} day streak'),
              _RewardHeroChip(
                  icon: Icons.schedule_rounded, label: '$totalMinutes mins'),
              _RewardHeroChip(
                  icon: Icons.emoji_events_rounded,
                  label: '$unlockedBadgeCount badge(s)'),
            ],
          ),
        ],
      ),
    );
  }
}

class _RewardHeroChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _RewardHeroChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _RewardRedemptionPlannerPanel extends StatelessWidget {
  final LearnerProfile learner;
  final String summary;
  final RewardRedemptionOption? featuredReward;
  final List<RewardRedemptionOption> options;
  final List<RewardRedemptionOption> nearlyUnlockedRewards;

  const _RewardRedemptionPlannerPanel({
    required this.learner,
    required this.summary,
    required this.featuredReward,
    required this.options,
    required this.nearlyUnlockedRewards,
  });

  @override
  Widget build(BuildContext context) {
    final unlockedCount = options.where((item) => item.unlocked).length;

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
          if (featuredReward != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: featuredReward!.unlocked
                    ? const Color(0xFFEEFBF3)
                    : const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: featuredReward!.unlocked
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
                        '${featuredReward!.icon} ${featuredReward!.title}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      StatusPill(
                        text: featuredReward!.category,
                        color: featuredReward!.unlocked
                            ? LumoTheme.accentGreen
                            : LumoTheme.accentOrange,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    featuredReward!.description,
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
                        featuredReward!.unlocked
                            ? 'Ready to redeem'
                            : '${featuredReward!.shortfall} pts to unlock',
                      ),
                      ('Cost', '${featuredReward!.cost} pts'),
                      ('Best use', featuredReward!.celebrationCue),
                    ],
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
            ...nearlyUnlockedRewards.map(
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
                            style: const TextStyle(fontWeight: FontWeight.w800),
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
