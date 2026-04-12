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

class HomePage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;

  const HomePage({super.key, required this.state, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final learnerCount = state.learners.length;

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
                    Expanded(
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
                    const SizedBox(width: 20),
                    Expanded(
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
                                  Row(
                                    children: [
                                      Expanded(
                                        child: _PrimaryActionCard(
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
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: _PrimaryActionCard(
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
                                      ),
                                    ],
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
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: state.modules.length,
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
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
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              LumoTopBar(
                onLogoTap: () =>
                    Navigator.of(context).popUntil((route) => route.isFirst),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  const Expanded(
                    child: SectionTitle(
                      title: 'All learners',
                      subtitle:
                          'Tap a learner to open their learner data page.',
                    ),
                  ),
                  StatusPill(
                    text: '${state.learners.length} learners',
                    color: LumoTheme.accentGreen,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _BackendStatusBanner(state: state),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.builder(
                  itemCount: state.learners.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.08,
                  ),
                  itemBuilder: (context, index) {
                    final learner = state.learners[index];
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
                      ),
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
    final assignedLessons = state.lessonsForLearner(learner).take(3).toList();
    final nextLesson = state.nextAssignedLessonForLearner(learner);
    final nextAssignmentPack = state.nextAssignmentPackForLearner(learner);
    final recommendedModule = state.recommendedModuleForLearner(learner);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction:
                      'This learner data page shows the child\'s basics, streak, XP, time spent, and a simple data export.',
                  onVoiceTap: () {
                    state.replayVisiblePrompt(
                      'You are viewing ${learner.name}. This page shows streaks, total XP, total learning time, and a button to download learner data.',
                    );
                  },
                  prompt:
                      'You are viewing ${learner.name}. This page shows streaks, total XP, total learning time, and a button to download learner data.',
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'AI Mallam explains this learner page',
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
                            text: learner.enrollmentStatus,
                            color: LumoTheme.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 34,
                            backgroundColor: const Color(0xFFE9E7FF),
                            child: Text(
                              learner.name.characters.first,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  learner.name,
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${learner.learnerCode} • Age ${learner.age} • ${learner.village}',
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: MetricTile(
                              label: 'Streaks',
                              value: '${learner.streakDays} days',
                              icon: Icons.local_fire_department_rounded,
                              color: LumoTheme.accentOrange,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: MetricTile(
                              label: 'Total XP',
                              value: '$totalXp XP',
                              icon: Icons.stars_rounded,
                              color: LumoTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: MetricTile(
                              label: rewards == null ? 'Total time' : 'Points',
                              value: rewards == null
                                  ? '$totalMinutes min'
                                  : '${rewards.points} pts',
                              icon: rewards == null
                                  ? Icons.schedule_rounded
                                  : Icons.workspace_premium_rounded,
                              color: LumoTheme.accentGreen,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      if (rewards != null) ...[
                        SoftPanel(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Live rewards snapshot',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 12),
                              InfoRow(
                                label: 'Level',
                                value:
                                    '${rewards.levelLabel} • Level ${rewards.level}',
                              ),
                              InfoRow(
                                label: 'Points',
                                value: '${rewards.points} points',
                              ),
                              InfoRow(
                                label: 'Next level',
                                value: rewards.nextLevelLabel == null
                                    ? 'Current top level'
                                    : '${rewards.nextLevelLabel} (${rewards.xpForNextLevel} XP to go)',
                              ),
                              const SizedBox(height: 12),
                              LinearProgressIndicator(
                                value: rewards.progressToNextLevel.clamp(0, 1),
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
                                          color: Color(0xFF94A3B8),
                                        ),
                                      ]
                                    : rewards.badges
                                        .take(4)
                                        .map(
                                          (badge) => StatusPill(
                                            text: badge.title,
                                            color: badge.earned
                                                ? LumoTheme.accentGreen
                                                : LumoTheme.accentOrange,
                                          ),
                                        )
                                        .toList(),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],
                      SoftPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Basic information',
                              style: TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 12),
                            InfoRow(
                                label: 'Guardian', value: learner.guardianName),
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
                                    style: TextStyle(fontWeight: FontWeight.w800),
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
                              state.backendRoutingSummaryForLearner(learner),
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
                                  child: Text(
                                    'Assigned lessons',
                                    style:
                                        TextStyle(fontWeight: FontWeight.w800),
                                  ),
                                ),
                                StatusPill(
                                  text: '${assignedLessons.length} shown',
                                  color: LumoTheme.accentOrange,
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              state.assignedLessonSummaryForLearner(learner),
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
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
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
                                          state.selectLearner(learner);
                                          state.selectModule(
                                            state.modules.firstWhere(
                                              (module) =>
                                                  module.id ==
                                                  nextLesson.moduleId,
                                              orElse: () => state.modules.first,
                                            ),
                                          );
                                          state.startLesson(nextLesson);
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (_) => LessonSessionPage(
                                                state: state,
                                                lesson: nextLesson,
                                                onChanged: () {},
                                              ),
                                            ),
                                          );
                                        },
                                        icon: const Icon(
                                            Icons.play_arrow_rounded),
                                        label:
                                            const Text('Start assigned lesson'),
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
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(18),
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
                                        style: const TextStyle(height: 1.35),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const Spacer(),
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
    final lessons = state.assignedLessons
        .where((lesson) => lesson.moduleId == module.id)
        .toList();

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
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => SelectStudentPage(
                                        state: state,
                                        onChanged: onChanged,
                                        lesson: lesson,
                                      ),
                                    ),
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

  @override
  void initState() {
    super.initState();
    final draft = widget.state.registrationDraft;
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
    );
    final recommendedModule = widget.state.recommendedModuleForDraft;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
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
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: ageController,
                                      keyboardType: TextInputType.number,
                                      onChanged: (_) => setState(syncDraft),
                                      decoration: const InputDecoration(
                                        labelText: 'Age',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextField(
                                      controller: cohortController,
                                      onChanged: (_) => setState(syncDraft),
                                      decoration: const InputDecoration(
                                        labelText: 'Cohort',
                                      ),
                                    ),
                                  ),
                                ],
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
                              Row(
                                children: [
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
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
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextField(
                                      controller: guardianPhoneController,
                                      keyboardType: TextInputType.phone,
                                      onChanged: (_) => setState(syncDraft),
                                      decoration: const InputDecoration(
                                        labelText: 'Guardian phone',
                                      ),
                                    ),
                                  ),
                                ],
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
                              Row(
                                children: [
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
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
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
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
                                  ),
                                ],
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
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: SoftPanel(
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
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: SoftPanel(
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
                                                .registrationContext.summary,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
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
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: DetailCard(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
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
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.of(context)
                                .popUntil((route) => route.isFirst),
                            child: const Text('Back home'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: () {
                              state.selectModule(recommendedModule);
                              onChanged();
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
                            child: const Text('Open subject'),
                          ),
                        ),
                      ],
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

class SelectStudentPage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;
  final LessonCardModel lesson;

  const SelectStudentPage({
    super.key,
    required this.state,
    required this.onChanged,
    required this.lesson,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ResponsiveWorkspaceRow(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction: selectStudentInstruction,
                  onVoiceTap: () {
                    state.replayVisiblePrompt(
                      'Choose the learner for ${lesson.title}. I will use the learner profile to guide the lesson.',
                    );
                  },
                  prompt:
                      'Choose the learner for ${lesson.title}. I will use the learner profile to guide the lesson.',
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'AI Mallam is waiting for learner selection',
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
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
                      subtitle: 'Tap a learner to start ${lesson.title}.',
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: GridView.builder(
                        itemCount: state.learners.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.12,
                        ),
                        itemBuilder: (context, index) {
                          final learner = state.learners[index];
                          return GestureDetector(
                            onTap: () {
                              state.selectLearner(learner);
                              state.startLesson(lesson);
                              onChanged();
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => LessonSessionPage(
                                    state: state,
                                    lesson: lesson,
                                    onChanged: onChanged,
                                  ),
                                ),
                              );
                            },
                            child: _LearnerCard(
                              learner: learner,
                              state: state,
                            ),
                          );
                        },
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

  @override
  void initState() {
    super.initState();
    responseController = TextEditingController();
    audioCaptureService = AudioCaptureService();
    speechTranscriptionService = SpeechTranscriptionService();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _speakCurrentStepIfNeeded(force: true);
    });
  }

  @override
  void dispose() {
    recordingTicker?.cancel();
    speechTranscriptionService.cancel();
    audioCaptureService.dispose();
    responseController.dispose();
    super.dispose();
  }

  Future<void> _speakCurrentStepIfNeeded({bool force = false}) async {
    final session = widget.state.activeSession;
    if (session == null) return;
    if (_promptedCurrentStep && !force) return;
    _promptedCurrentStep = true;
    final prompt =
        widget.state.personalizePrompt(session.currentStep.coachPrompt);
    await _prepareForMallamSpeech();
    if (!mounted) return;
    setState(() {
      isSpeaking = true;
    });
    await widget.state.replayVisiblePrompt(prompt, mode: SpeakerMode.guiding);
    if (!mounted) return;
    setState(() {
      isSpeaking = false;
      microphoneStatus = isAutoMode
          ? 'Mallam finished speaking. Start recording and let the learner answer now.'
          : 'Mallam finished speaking. Listen for the learner response.';
    });
  }

  Future<void> _prepareForMallamSpeech() async {
    if (isRecording) {
      await stopRecording(markReadyForResume: false);
    }
    await speechTranscriptionService.cancel();
    await widget.state.stopVoiceReplay();
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
    await _prepareForMallamSpeech();
    if (!mounted) return;
    setState(() {
      isSpeaking = true;
    });
    await widget.state.replayVisiblePrompt(text, mode: mode);
    if (!mounted) return;
    setState(() {
      isSpeaking = false;
      microphoneStatus = 'Mallam replayed the activity prompt.';
    });
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

    final supportType = outcome.attemptNumber >= 2 ? 'model' : 'hint';
    final supportPrompt = widget.state.buildCoachSupportPrompt(
      supportType: supportType,
      step: widget.state.activeSession!.currentStep,
    );
    widget.state.useCoachSupport(supportType);
    widget.onChanged();
    setState(() {
      isSpeaking = true;
      microphoneStatus = outcome.attemptNumber >= 2
          ? 'Mallam is modeling the answer and keeping the learner on this step.'
          : 'Mallam is replaying the prompt with a hint. Let the learner try again.';
    });
    await widget.state.replayVisiblePrompt(
      supportPrompt,
      mode:
          supportType == 'model' ? SpeakerMode.affirming : SpeakerMode.guiding,
    );
    if (!mounted) return;
    setState(() {
      isSpeaking = false;
      microphoneStatus = outcome.attemptNumber >= 2
          ? 'Model answer played. Start recording when the learner repeats it.'
          : 'Hint given. Start recording for the learner’s next try.';
    });
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

      await widget.state.stopVoiceReplay();
      await speechTranscriptionService.cancel();
      transcriptCapturedThisTake = false;
      liveTranscript = '';
      transcriptReviewPending = false;

      final audioStarted = await audioCaptureService.startSafely(
        fileStem: widget.state.currentLearner?.learnerCode ?? 'learner-voice',
      );
      if (!audioStarted.started) {
        throw AudioCaptureException(
            audioStarted.message ?? 'Unable to start microphone capture.');
      }

      final speechReady = await speechTranscriptionService.start(
        onResult: (transcript, isFinal) {
          if (!mounted) return;
          setState(() {
            liveTranscript = transcript;
            transcriptCapturedThisTake = transcript.trim().isNotEmpty;
          });
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

      widget.state.setAudioInputMode('Shared mic on tablet');
      widget.onChanged();
      setState(() {
        isRecording = true;
        speechRecognitionActive = speechReady;
        microphoneStatus = speechReady
            ? 'Recording learner voice and listening for transcript...'
            : (audioStarted.message ??
                speechTranscriptionService.lastError ??
                'Recording learner voice only. Speech recognition is unavailable right now.');
      });
    } catch (error) {
      await speechTranscriptionService.cancel();
      await audioCaptureService.stop();
      setState(() {
        isRecording = false;
        speechRecognitionActive = false;
        liveTranscript = '';
        microphoneStatus = error.toString();
      });
    }
  }

  Future<void> stopRecording({bool markReadyForResume = true}) async {
    recordingTicker?.cancel();
    await speechTranscriptionService.stop();
    final transcript = liveTranscript.trim();
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
    );

    if (transcript.isNotEmpty) {
      responseController.text = transcript;
      transcriptReviewPending = !isAutoMode;
    }

    widget.onChanged();
    setState(() {
      currentRecordingDuration = result.duration;
      final savedLabel = transcript.isNotEmpty
          ? 'Learner voice saved (${formatDuration(result.duration)}).'
          : 'Learner voice saved (${formatDuration(result.duration)}). No transcript was detected.';
      microphoneStatus = markReadyForResume && !transcriptReviewPending
          ? '$savedLabel Ready for Mallam or the next learner attempt.'
          : savedLabel;
    });

    if (transcript.isNotEmpty && isAutoMode && !isProcessingTranscript) {
      isProcessingTranscript = true;
      try {
        await _handleSubmittedResponse(transcript, auto: true);
      } finally {
        isProcessingTranscript = false;
      }
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
                      Row(
                        children: [
                          Expanded(
                            child: MetricTile(
                              label: 'Progress',
                              value:
                                  '${session.stepIndex + 1}/${widget.lesson.steps.length}',
                              icon: Icons.alt_route_rounded,
                              color: LumoTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: MetricTile(
                              label: 'Responses',
                              value: '${session.totalResponses}',
                              icon: Icons.chat_bubble_outline_rounded,
                              color: LumoTheme.accentGreen,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: MetricTile(
                              label: 'Auto mode',
                              value: isAutoMode ? 'On' : 'Off',
                              icon: Icons.smart_toy_rounded,
                              color: LumoTheme.accentOrange,
                            ),
                          ),
                        ],
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
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              _CoachActionsRow(
                                onReplay: () async {
                                  _promptedCurrentStep = false;
                                  await _speakCurrentStepIfNeeded(force: true);
                                  widget.onChanged();
                                  setState(() {});
                                },
                                onHint: () {
                                  widget.state.useCoachSupport('hint');
                                  widget.onChanged();
                                  setState(() {});
                                },
                                onModel: () {
                                  widget.state.useCoachSupport('model');
                                  responseController.text = expectedResponse;
                                  widget.onChanged();
                                  setState(() {});
                                },
                                onSlow: () {
                                  widget.state.useCoachSupport('slow');
                                  widget.onChanged();
                                  setState(() {});
                                },
                                onWait: () {
                                  widget.state.useCoachSupport('wait');
                                  widget.onChanged();
                                  setState(() {});
                                },
                                onTranslate: () {
                                  widget.state.useCoachSupport('translate');
                                  widget.onChanged();
                                  setState(() {});
                                },
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: responseController,
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

class _ResponsiveWorkspaceRow extends StatelessWidget {
  final List<Widget> children;
  final CrossAxisAlignment crossAxisAlignment;
  const _ResponsiveWorkspaceRow({
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.center,
  });

  @override
  Widget build(BuildContext context) {
    const breakpoint = 1180.0;

    return LayoutBuilder(
      builder: (context, constraints) {
        final hasRoom = constraints.maxWidth >= breakpoint;
        final minHeight = constraints.maxHeight.isFinite
            ? constraints.maxHeight
            : 0.0;

        if (hasRoom) {
          return Row(
            crossAxisAlignment: crossAxisAlignment,
            children: children,
          );
        }

        return ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(
            scrollbars: false,
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SizedBox(
              width: breakpoint,
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: minHeight),
                child: Row(
                  crossAxisAlignment: crossAxisAlignment,
                  children: children,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
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

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: DetailCard(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
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
                      'Well done, ${learner.name}!',
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'You completed ${lesson.title}.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: MetricTile(
                            label: 'Responses captured',
                            value: '${session.totalResponses}',
                            icon: Icons.hearing_rounded,
                            color: LumoTheme.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricTile(
                            label: 'Support actions',
                            value: '${session.supportActionsUsed}',
                            icon: Icons.volunteer_activism_rounded,
                            color: LumoTheme.accentOrange,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: MetricTile(
                            label: 'Queued sync',
                            value: '${state.pendingSyncEvents.length}',
                            icon: Icons.cloud_upload_rounded,
                            color: LumoTheme.accentGreen,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              Navigator.of(context)
                                  .popUntil((route) => route.isFirst);
                            },
                            child: const Text('Back home'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: () {
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute(
                                  builder: (_) => SubjectModulesPage(
                                    state: state,
                                    onChanged: () {},
                                    module: state.selectedModule ??
                                        state.modules.first,
                                  ),
                                ),
                              );
                            },
                            child: const Text('Next lesson path'),
                          ),
                        ),
                      ],
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
      case 'story':
        return const [Color(0xFF0EA5E9), Color(0xFF38BDF8)];
      case 'english':
      default:
        return const [Color(0xFF6C63FF), Color(0xFF8B7FFF)];
    }
  }
}

class _LearnerCard extends StatelessWidget {
  final LearnerProfile learner;
  final LumoAppState? state;

  const _LearnerCard({required this.learner, this.state});

  @override
  Widget build(BuildContext context) {
    final nextPack = state?.nextAssignmentPackForLearner(learner);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFEAEAF4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: const Color(0xFFE9E7FF),
                child: Text(
                  learner.name.characters.first,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const Spacer(),
              StatusPill(
                text: nextPack == null ? learner.attendanceBand : 'Backend assigned',
                color: nextPack == null
                    ? LumoTheme.accentOrange
                    : LumoTheme.accentGreen,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            learner.name,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Age ${learner.age} • ${learner.village}',
            style: const TextStyle(color: Color(0xFF6B7280)),
          ),
          const SizedBox(height: 6),
          Text(
            learner.learnerCode,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            learner.readinessLabel,
            style: const TextStyle(
              color: LumoTheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            nextPack == null ? learner.supportPlan : nextPack.lessonTitle,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF475569),
              height: 1.35,
            ),
          ),
          if (nextPack != null) ...[
            const SizedBox(height: 8),
            Text(
              state!.backendRoutingSummaryForLearner(learner),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ],
          const Spacer(),
          InfoRow(
            label: 'Last attendance',
            value: learner.lastAttendance,
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

    return Row(
      children: items
          .map(
            (item) => Expanded(
              child: Padding(
                padding: const EdgeInsets.only(right: 8),
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
            ),
          )
          .toList(),
    );
  }
}

class _CoachActionsRow extends StatelessWidget {
  final VoidCallback onReplay;
  final VoidCallback onHint;
  final VoidCallback onModel;
  final VoidCallback onSlow;
  final VoidCallback onWait;
  final VoidCallback onTranslate;

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
          onPressed: onReplay,
          icon: const Icon(Icons.volume_up_rounded),
          label: const Text('Replay'),
        ),
        FilledButton.tonalIcon(
          onPressed: onSlow,
          icon: const Icon(Icons.slow_motion_video_rounded),
          label: const Text('Slow repeat'),
        ),
        FilledButton.tonalIcon(
          onPressed: onHint,
          icon: const Icon(Icons.lightbulb_rounded),
          label: const Text('Give hint'),
        ),
        FilledButton.tonalIcon(
          onPressed: onModel,
          icon: const Icon(Icons.record_voice_over_rounded),
          label: const Text('Model answer'),
        ),
        FilledButton.tonalIcon(
          onPressed: onWait,
          icon: const Icon(Icons.timelapse_rounded),
          label: const Text('Think time'),
        ),
        FilledButton.tonalIcon(
          onPressed: onTranslate,
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
