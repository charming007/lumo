import 'package:flutter/material.dart';

import 'app_state.dart';
import 'design_shell.dart';
import 'instructions.dart';
import 'models.dart';
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
    state.attachVoiceReplay(voiceReplayService.replay);
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
                'Preparing Mallam, learner profiles, and offline lesson prompts...',
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
    final featuredLearner = state.currentLearner ?? state.learners.first;
    final recommendedLesson = state.recommendedLesson;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              LumoTopBar(onLogoTap: () {}),
              const SizedBox(height: 20),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: MallamPanel(
                        instruction: homeInstruction,
                        onVoiceTap: () {
                          state.replayVisiblePrompt(
                            'Assalamu alaikum. Choose a learner path and I will guide each lesson by voice.',
                          );
                        },
                        prompt:
                            'Assalamu alaikum. Choose a learner path and I will guide each lesson by voice.',
                        speakerMode: SpeakerMode.guiding,
                        statusLabel: 'Mallam is ready',
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _HomeHero(
                              state: state,
                              featuredLearner: featuredLearner,
                              recommendedLesson: recommendedLesson,
                              onRefreshBackend: () async {
                                await state.bootstrap();
                                onChanged();
                              },
                              onSyncQueue: () async {
                                await state.syncPendingEvents();
                                onChanged();
                              },
                              onOpenLearners: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => AllStudentsPage(
                                      state: state,
                                      onChanged: onChanged,
                                    ),
                                  ),
                                );
                              },
                              onRegisterLearner: () {
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
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: DetailCard(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Profile snapshot',
                                          style: TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        LabelValueWrap(
                                          items: [
                                            ('Learner', featuredLearner.name),
                                            (
                                              'Learner code',
                                              featuredLearner.learnerCode
                                            ),
                                            (
                                              'Readiness',
                                              featuredLearner.readinessLabel
                                            ),
                                            (
                                              'Language',
                                              featuredLearner.preferredLanguage
                                            ),
                                            (
                                              'Attendance',
                                              featuredLearner.attendanceBand
                                            ),
                                            (
                                              'Status',
                                              featuredLearner.enrollmentStatus
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 14),
                                        SoftPanel(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const Text(
                                                'Support plan',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(featuredLearner.supportPlan),
                                              const SizedBox(height: 12),
                                              InfoRow(
                                                label: 'Caregiver',
                                                value:
                                                    '${featuredLearner.guardianName} • ${featuredLearner.caregiverRelationship}',
                                              ),
                                              InfoRow(
                                                label: 'Last attendance',
                                                value: featuredLearner
                                                    .lastAttendance,
                                              ),
                                              InfoRow(
                                                label: 'Last lesson note',
                                                value: featuredLearner
                                                    .lastLessonSummary,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: DetailCard(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Recommended next step',
                                          style: TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        const SizedBox(height: 14),
                                        if (recommendedLesson != null) ...[
                                          Wrap(
                                            spacing: 8,
                                            runSpacing: 8,
                                            children: [
                                              StatusPill(
                                                text: recommendedLesson.subject,
                                                color: LumoTheme.primary,
                                              ),
                                              StatusPill(
                                                text:
                                                    '${recommendedLesson.durationMinutes} min',
                                                color: LumoTheme.accentOrange,
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            recommendedLesson.title,
                                            style: const TextStyle(
                                              fontSize: 22,
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(recommendedLesson.scenario),
                                          const SizedBox(height: 12),
                                          SoftPanel(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                InfoRow(
                                                  label: 'Readiness focus',
                                                  value: recommendedLesson
                                                      .readinessFocus,
                                                ),
                                                InfoRow(
                                                  label: 'First step',
                                                  value: recommendedLesson
                                                      .steps.first.title,
                                                ),
                                                InfoRow(
                                                  label: 'Real world payoff',
                                                  value: recommendedLesson.steps
                                                      .first.realWorldCheck,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
                            const SectionTitle(
                              title: 'Learning modules',
                              subtitle:
                                  'Pick a voice-led module with clearer learner context, readiness goals, and next actions.',
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
                                childAspectRatio: 1.1,
                              ),
                              itemBuilder: (context, index) {
                                final module = state.modules[index];
                                return _ModuleCard(
                                  module: module,
                                  lessonCount: state.assignedLessons
                                      .where((lesson) =>
                                          lesson.moduleId == module.id)
                                      .length,
                                  onTap: () {
                                    state.selectModule(module);
                                    onChanged();
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => ModuleDetailPage(
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
                          'Tap a learner to continue with a profile-aware Mallam lesson flow.',
                    ),
                  ),
                  StatusPill(
                    text: '${state.learners.length} active',
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
                    childAspectRatio: 1.12,
                  ),
                  itemBuilder: (context, index) {
                    final learner = state.learners[index];
                    return GestureDetector(
                      onTap: () {
                        state.selectLearner(learner);
                        onChanged();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => SelectStudentPage(
                              state: state,
                              onChanged: onChanged,
                            ),
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 26,
                                  backgroundColor: const Color(0xFFE9E7FF),
                                  child: Text(
                                    learner.name.characters.first,
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const Spacer(),
                                StatusPill(
                                  text: learner.enrollmentStatus,
                                  color: LumoTheme.primary,
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Text(
                              learner.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${learner.cohort} • ${learner.village}',
                              style: const TextStyle(color: Color(0xFF6B7280)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Age ${learner.age} • ${learner.learnerCode}',
                              style: const TextStyle(color: Color(0xFF94A3B8)),
                            ),
                            const SizedBox(height: 12),
                            LabelValueWrap(
                              items: [
                                ('Readiness', learner.readinessLabel),
                                ('Attendance', learner.attendanceBand),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              learner.lastLessonSummary,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xFF6B7280),
                                height: 1.4,
                              ),
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
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction: registrationInstruction,
                  onVoiceTap: () {
                    syncDraft();
                    widget.state.replayVisiblePrompt(
                      'Let us register the learner carefully so the next lesson starts at the right level.',
                    );
                    setState(() {});
                  },
                  prompt:
                      'Let us register the learner carefully so the next lesson starts at the right level.',
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'Mallam is preparing onboarding',
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
                            'Capture a simple but backend-ready profile. The goal is fast intake without losing placement detail.',
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
                                      'Example: Use short prompts, pause for think time, and praise every clear answer.',
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
                                  'Required before local save and backend sync.',
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
                                            label: 'Baseline',
                                            value: baselineLevel,
                                          ),
                                          InfoRow(
                                            label: 'Recommended start',
                                            value: recommendedModule.title,
                                          ),
                                          InfoRow(
                                            label: 'Placement note',
                                            value: draft.placementSummary,
                                          ),
                                          InfoRow(
                                            label: 'Risk flag',
                                            value: draft.riskFlag,
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
                                          InfoRow(
                                            label: 'Queue after save',
                                            value:
                                                '${widget.state.pendingSyncEvents.length + 1} events',
                                          ),
                                          InfoRow(
                                            label: 'Guardian mapping',
                                            value:
                                                '$caregiverRelationship • ${guardianPhoneController.text.isEmpty ? 'Phone missing' : 'Phone ready'}',
                                          ),
                                          const SizedBox(height: 10),
                                          Container(
                                            width: double.infinity,
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius:
                                                  BorderRadius.circular(16),
                                              border: Border.all(
                                                color: const Color(0xFFE5E7EB),
                                              ),
                                            ),
                                            child: Text(
                                              draft.backendPayloadPreview
                                                  .toString(),
                                              style: const TextStyle(
                                                fontSize: 12,
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
                              ? 'Saving to backend...'
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
    final recommendedModule = state.recommendedModuleForDraft;

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
                          : 'Profile posted to the backend and is now live in the learner list.',
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
                        (
                          'Guardian',
                          '${learner.guardianName} • ${learner.caregiverRelationship}'
                        ),
                        ('Recommended start', recommendedModule.title),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SoftPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          InfoRow(label: 'Village', value: learner.village),
                          InfoRow(
                            label: 'Guardian phone',
                            value: learner.guardianPhone,
                          ),
                          InfoRow(
                            label: 'Support plan',
                            value: learner.supportPlan,
                          ),
                          InfoRow(
                            label: 'Sync queue',
                            value: '${state.pendingSyncEvents.length} events',
                          ),
                        ],
                      ),
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
                                  builder: (_) => ModuleDetailPage(
                                    state: state,
                                    onChanged: onChanged,
                                    module: recommendedModule,
                                  ),
                                ),
                              );
                            },
                            child: const Text('Start first lesson'),
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

class ModuleDetailPage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;
  final LearningModule module;

  const ModuleDetailPage({
    super.key,
    required this.state,
    required this.onChanged,
    required this.module,
  });

  @override
  Widget build(BuildContext context) {
    final lessons = state.lessonsForSelectedModule();

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction: modulesInstruction,
                  onVoiceTap: () {
                    state.replayVisiblePrompt(module.voicePrompt);
                  },
                  prompt: module.voicePrompt,
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'Mallam is introducing the module',
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
                            text: module.badge,
                            color: LumoTheme.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _BackendStatusBanner(state: state),
                      const SizedBox(height: 24),
                      Text(
                        module.title,
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        module.description,
                        style: const TextStyle(
                          fontSize: 18,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: MetricTile(
                              label: 'Readiness goal',
                              value: module.readinessGoal,
                              icon: Icons.flag_rounded,
                              color: LumoTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: MetricTile(
                              label: 'Lessons ready',
                              value: '${lessons.length} offline',
                              icon: Icons.download_done_rounded,
                              color: LumoTheme.accentGreen,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Lesson flow',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: ListView.separated(
                          itemCount: lessons.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final lesson = lessons[index];
                            return Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          lesson.title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 17,
                                          ),
                                        ),
                                      ),
                                      StatusPill(
                                        text: '${lesson.steps.length} steps',
                                        color: LumoTheme.accentOrange,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(lesson.readinessFocus),
                                  const SizedBox(height: 8),
                                  Text(
                                    lesson.scenario,
                                    style: const TextStyle(
                                      color: Color(0xFF475569),
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  InfoRow(
                                    label: 'Facilitator tip',
                                    value: lesson.steps.first.facilitatorTip,
                                  ),
                                  InfoRow(
                                    label: 'Real world check',
                                    value: lesson.steps.first.realWorldCheck,
                                  ),
                                  InfoRow(
                                    label: 'Estimated duration',
                                    value: '${lesson.durationMinutes} min',
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => SelectStudentPage(
                                  state: state,
                                  onChanged: onChanged,
                                ),
                              ),
                            );
                          },
                          child: const Text('Select learner'),
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

class SelectStudentPage extends StatelessWidget {
  final LumoAppState state;
  final VoidCallback onChanged;

  const SelectStudentPage({
    super.key,
    required this.state,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final lessons = state.lessonsForSelectedModule();
    final firstLesson =
        lessons.isNotEmpty ? lessons.first : state.assignedLessons.first;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction: selectStudentInstruction,
                  onVoiceTap: () {
                    state.replayVisiblePrompt(
                      'Choose the learner and I will start at the right speaking level.',
                    );
                  },
                  prompt:
                      'Choose the learner and I will start at the right speaking level.',
                  speakerMode: SpeakerMode.guiding,
                  statusLabel: 'Mallam is waiting for learner selection',
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
                          text: state.selectedModule?.title ?? 'Any module',
                          color: LumoTheme.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const SectionTitle(
                      title: 'Select learner',
                      subtitle:
                          'Tap the learner who is ready now. Mallam will carry their support context into the session.',
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
                              state.startLesson(firstLesson);
                              onChanged();
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => LessonSessionPage(
                                    state: state,
                                    lesson: firstLesson,
                                    onChanged: onChanged,
                                  ),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: const Color(0xFFEAEAF4),
                                ),
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
                                        backgroundColor:
                                            const Color(0xFFE9E7FF),
                                        child: Text(
                                          learner.name.characters.first,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const Spacer(),
                                      StatusPill(
                                        text: learner.attendanceBand,
                                        color: LumoTheme.accentOrange,
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
                                    style: const TextStyle(
                                      color: Color(0xFF6B7280),
                                    ),
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
                                    learner.supportPlan,
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Color(0xFF475569),
                                      height: 1.35,
                                    ),
                                  ),
                                  const Spacer(),
                                  InfoRow(
                                    label: 'Last attendance',
                                    value: learner.lastAttendance,
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

  @override
  void initState() {
    super.initState();
    responseController = TextEditingController();
  }

  @override
  void dispose() {
    responseController.dispose();
    super.dispose();
  }

  void submitResponse([String? value]) {
    final text = (value ?? responseController.text).trim();
    if (text.isEmpty) return;
    widget.state.submitLearnerResponse(text);
    responseController.text = text;
    widget.onChanged();
    setState(() {});
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
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: MallamPanel(
                  instruction: lessonInstruction,
                  onVoiceTap: () {
                    widget.state.replayCoachPrompt();
                    widget.onChanged();
                    setState(() {});
                  },
                  prompt: widget.state.personalizePrompt(step.coachPrompt),
                  speakerMode: session.speakerMode,
                  statusLabel: _speakerModeLabel(session.speakerMode),
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
                              label: 'Support used',
                              value: '${session.supportActionsUsed}',
                              icon: Icons.support_agent_rounded,
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
                                        ('Scenario', widget.lesson.scenario),
                                        ('Expected response', expectedResponse),
                                        (
                                          'Facilitator tip',
                                          step.facilitatorTip
                                        ),
                                        (
                                          'Real-world check',
                                          step.realWorldCheck,
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
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
                                            'Audio routing',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 10),
                                          DropdownButtonFormField<String>(
                                            initialValue:
                                                session.audioInputMode,
                                            items: const [
                                              DropdownMenuItem(
                                                value:
                                                    'Facilitator typed capture',
                                                child: Text(
                                                  'Facilitator typed capture',
                                                ),
                                              ),
                                              DropdownMenuItem(
                                                value: 'Mic handoff planned',
                                                child: Text(
                                                  'Mic handoff planned',
                                                ),
                                              ),
                                              DropdownMenuItem(
                                                value: 'Shared mic on tablet',
                                                child: Text(
                                                  'Shared mic on tablet',
                                                ),
                                              ),
                                            ],
                                            onChanged: (value) {
                                              if (value == null) return;
                                              widget.state
                                                  .setAudioInputMode(value);
                                              widget.onChanged();
                                              setState(() {});
                                            },
                                            decoration: const InputDecoration(
                                              labelText: 'Audio input mode',
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          DropdownButtonFormField<String>(
                                            initialValue:
                                                session.speakerOutputMode,
                                            items: const [
                                              DropdownMenuItem(
                                                value: 'Tablet speaker',
                                                child: Text('Tablet speaker'),
                                              ),
                                              DropdownMenuItem(
                                                value:
                                                    'External speaker paired',
                                                child: Text(
                                                  'External speaker paired',
                                                ),
                                              ),
                                              DropdownMenuItem(
                                                value:
                                                    'Low-volume close coaching',
                                                child: Text(
                                                  'Low-volume close coaching',
                                                ),
                                              ),
                                            ],
                                            onChanged: (value) {
                                              if (value == null) return;
                                              widget.state
                                                  .setSpeakerOutputMode(value);
                                              widget.onChanged();
                                              setState(() {});
                                            },
                                            decoration: const InputDecoration(
                                              labelText: 'Speaker output mode',
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          InfoRow(
                                            label: 'Last support action',
                                            value: session.lastSupportType,
                                          ),
                                          InfoRow(
                                            label: 'Elapsed',
                                            value:
                                                '${session.elapsedMinutes} min',
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
                                            'Facilitator observations',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                          const SizedBox(height: 10),
                                          Wrap(
                                            spacing: 8,
                                            runSpacing: 8,
                                            children: [
                                              'Needed translation',
                                              'Answered independently',
                                              'Shy at first',
                                              'Background noise',
                                              'Needed gesture cue',
                                            ]
                                                .map(
                                                  (item) => FilterChip(
                                                    label: Text(item),
                                                    selected: session
                                                        .facilitatorObservations
                                                        .contains(item),
                                                    onSelected: (_) {
                                                      widget.state
                                                          .addObservation(item);
                                                      widget.onChanged();
                                                      setState(() {});
                                                    },
                                                  ),
                                                )
                                                .toList(),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              _CoachActionsRow(
                                onReplay: () {
                                  widget.state.replayCoachPrompt();
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
                                  labelText: 'Capture learner response',
                                  hintText:
                                      'Type what the learner said or tap a quick response',
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
                                            submitResponse(suggestion),
                                      ),
                                    )
                                    .toList(),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton.tonal(
                                      onPressed: () => submitResponse(),
                                      child: const Text('Save response'),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: session.hasResponse
                                          ? () async {
                                              final finished = widget.state
                                                  .advanceLessonStep();
                                              if (finished) {
                                                await widget.state
                                                    .completeLesson(
                                                  widget.lesson,
                                                );
                                                if (!context.mounted) return;
                                                widget.onChanged();
                                                Navigator.of(context)
                                                    .pushReplacement(
                                                  MaterialPageRoute(
                                                    builder: (_) =>
                                                        LessonCompletePage(
                                                      state: widget.state,
                                                      lesson: widget.lesson,
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }
                                              widget.onChanged();
                                              responseController.clear();
                                              setState(() {});
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
                              _ResponseReviewBanner(
                                  review: session.latestReview),
                              const SizedBox(height: 16),
                              SoftPanel(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Sync payload preview',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      session
                                          .syncPayloadPreview(
                                            learnerCode: learner.learnerCode,
                                          )
                                          .toString(),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF475569),
                                        height: 1.4,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              Container(
                                width: double.infinity,
                                constraints:
                                    const BoxConstraints(minHeight: 240),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFCFCFF),
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(
                                    color: const Color(0xFFE5E7EB),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Session transcript',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    ...session.transcript.map((turn) {
                                      final isMallam = turn.speaker == 'Mallam';
                                      final isFacilitator =
                                          turn.speaker == 'Facilitator';
                                      return Padding(
                                        padding:
                                            const EdgeInsets.only(bottom: 10),
                                        child: Align(
                                          alignment: isMallam
                                              ? Alignment.centerLeft
                                              : Alignment.centerRight,
                                          child: Container(
                                            constraints: const BoxConstraints(
                                              maxWidth: 360,
                                            ),
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: isMallam
                                                  ? const Color(0xFFF3F0FF)
                                                  : isFacilitator
                                                      ? const Color(0xFFFFF7ED)
                                                      : const Color(0xFFEEFBF3),
                                              borderRadius:
                                                  BorderRadius.circular(16),
                                            ),
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    Text(
                                                      turn.speaker,
                                                      style: TextStyle(
                                                        fontWeight:
                                                            FontWeight.w800,
                                                        color: isMallam
                                                            ? LumoTheme.primary
                                                            : isFacilitator
                                                                ? LumoTheme
                                                                    .accentOrange
                                                                : LumoTheme
                                                                    .accentGreen,
                                                      ),
                                                    ),
                                                    const Spacer(),
                                                    Text(
                                                      _formatTime(
                                                          turn.timestamp),
                                                      style: const TextStyle(
                                                        fontSize: 12,
                                                        color:
                                                            Color(0xFF64748B),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                Text(turn.text),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    }),
                                  ],
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

  String _formatTime(DateTime timestamp) {
    final hour = timestamp.hour.toString().padLeft(2, '0');
    final minute = timestamp.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
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
                    const SizedBox(height: 16),
                    SoftPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          InfoRow(
                            label: 'Readiness focus',
                            value: lesson.readinessFocus,
                          ),
                          InfoRow(
                            label: 'Last support action',
                            value: session.lastSupportType,
                          ),
                          InfoRow(
                            label: 'Observation summary',
                            value: session.facilitatorObservations.isEmpty
                                ? 'No facilitator flags captured.'
                                : session.facilitatorObservations.join(', '),
                          ),
                          InfoRow(
                            label: 'Learner record updated',
                            value: learner.lastLessonSummary,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (state.latestSyncEvent != null) ...[
                      SoftPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Latest queued sync event',
                              style: TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 10),
                            InfoRow(
                              label: 'Event type',
                              value: state.latestSyncEvent!.type,
                            ),
                            InfoRow(
                              label: 'Payload preview',
                              value: state.latestSyncEvent!.payload.toString(),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
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
                                  builder: (_) => ModuleDetailPage(
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

class _HomeHero extends StatelessWidget {
  final LumoAppState state;
  final LearnerProfile featuredLearner;
  final LessonCardModel? recommendedLesson;
  final Future<void> Function() onRefreshBackend;
  final Future<void> Function() onSyncQueue;
  final VoidCallback onOpenLearners;
  final VoidCallback onRegisterLearner;

  const _HomeHero({
    required this.state,
    required this.featuredLearner,
    required this.recommendedLesson,
    required this.onRefreshBackend,
    required this.onSyncQueue,
    required this.onOpenLearners,
    required this.onRegisterLearner,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6C63FF), Color(0xFF8B7FFF)],
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Today’s learner session',
            style: TextStyle(
              color: Colors.white70,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            featuredLearner.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${featuredLearner.readinessLabel} • ${featuredLearner.preferredLanguage}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _HeroStat(
                  label: 'Learners',
                  value: '${state.learners.length}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _HeroStat(
                  label: 'Queue',
                  value: state.syncQueueLabel,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _HeroStat(
                  label: 'Assignments',
                  value: '${state.backendAssignmentCount}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _HeroStat(
                  label: 'Streak',
                  value: '${featuredLearner.streakDays} days',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Live recommendation',
                  style: TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  recommendedLesson?.title ?? 'No lesson ready yet',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  recommendedLesson?.scenario ??
                      'Select a learner path to continue.',
                  style: const TextStyle(color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              ActionChip(
                avatar: const Icon(Icons.wifi_tethering_rounded, size: 18),
                label: Text(state.backendStatusLabel),
                onPressed: null,
              ),
              ActionChip(
                avatar: const Icon(Icons.inventory_2_rounded, size: 18),
                label: Text(state.backendSnapshotLabel),
                onPressed: null,
              ),
              ActionChip(
                avatar: const Icon(Icons.sync_rounded, size: 18),
                label: Text(state.lastSyncSummaryLabel),
                onPressed: null,
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: FilledButton.tonal(
                  onPressed: onOpenLearners,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: LumoTheme.primary,
                  ),
                  child: const Text('Open learners'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: onRegisterLearner,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white70),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Register learner'),
                ),
              ),
            ],
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

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;

  const _HeroStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final LearningModule module;
  final int lessonCount;
  final VoidCallback onTap;

  const _ModuleCard({
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
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                StatusPill(text: module.badge, color: Colors.white),
                Text(
                  '$lessonCount lessons',
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
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              module.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, height: 1.3),
            ),
            const SizedBox(height: 10),
            Text(
              module.readinessGoal,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: Colors.white,
                height: 1.25,
              ),
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
              'Short or uncertain response. Replay the prompt or coach with a quick support action.',
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
