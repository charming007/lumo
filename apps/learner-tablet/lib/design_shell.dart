import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'location_data.dart';
import 'models.dart';
import 'theme.dart';

class LumoTopBar extends StatelessWidget {
  final VoidCallback onLogoTap;

  const LumoTopBar({super.key, required this.onLogoTap});

  @override
  Widget build(BuildContext context) {
    final item =
        northernLocations[DateTime.now().day % northernLocations.length];
    final date = DateTime.now();
    final formattedDate = '${date.day}/${date.month}/${date.year}';
    final chips = [
      _TopChip(text: item['city']!),
      _TopChip(text: item['lga']!),
      _TopChip(text: formattedDate),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 620;

        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: onLogoTap,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.asset('assets/images/lumo_logo.jpg',
                          height: 56, width: 56, fit: BoxFit.cover),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Lumo',
                      style:
                          TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: chips,
              ),
            ],
          );
        }

        return Row(
          children: [
            GestureDetector(
              onTap: onLogoTap,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset('assets/images/lumo_logo.jpg',
                    height: 56, width: 56, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Lumo',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const Spacer(),
            for (var i = 0; i < chips.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              chips[i],
            ],
          ],
        );
      },
    );
  }
}

class MallamPanel extends StatefulWidget {
  final String instruction;
  final VoidCallback onVoiceTap;
  final String prompt;
  final SpeakerMode speakerMode;
  final String statusLabel;
  final String? secondaryStatus;
  final String voiceButtonLabel;
  final String? speakerOutputMode;
  final String? voiceHint;
  final bool centerPortraitLayout;
  final bool minimalStageLayout;
  final bool framelessStage;
  final bool framelessPortrait;

  const MallamPanel({
    super.key,
    required this.instruction,
    required this.onVoiceTap,
    required this.prompt,
    required this.speakerMode,
    required this.statusLabel,
    this.secondaryStatus,
    this.voiceButtonLabel = 'Replay voice',
    this.speakerOutputMode,
    this.voiceHint,
    this.centerPortraitLayout = false,
    this.minimalStageLayout = false,
    this.framelessStage = false,
    this.framelessPortrait = false,
  });

  @override
  State<MallamPanel> createState() => _MallamPanelState();
}

const bool _kFlutterTest = bool.fromEnvironment('FLUTTER_TEST');

class _MallamPanelState extends State<MallamPanel>
    with SingleTickerProviderStateMixin {
  late final AnimationController _stagePulseController;
  Timer? _replayFeedbackTimer;
  bool _replayFeedbackActive = false;

  @override
  void initState() {
    super.initState();
    _stagePulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
    if (!_kFlutterTest) {
      _stagePulseController.repeat(reverse: true);
    } else {
      _stagePulseController.value = 1;
    }
  }

  @override
  void dispose() {
    _replayFeedbackTimer?.cancel();
    _stagePulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final speakerColor = _speakerColor(widget.speakerMode);

    return LayoutBuilder(
      builder: (context, constraints) {
        final compactLayout =
            constraints.maxWidth < 560 || constraints.maxHeight < 760;
        final centeredPortraitSize = widget.centerPortraitLayout
            ? math.min(
                compactLayout ? 360.0 : 460.0,
                math.max(
                  compactLayout ? 280.0 : 360.0,
                  constraints.maxHeight * (compactLayout ? 0.42 : 0.52),
                ),
              )
            : null;
        final imageFrameSize =
            centeredPortraitSize ?? (compactLayout ? 188.0 : 220.0);
        final imageSize = widget.centerPortraitLayout
            ? imageFrameSize
            : (compactLayout ? 160.0 : 188.0);
        final promptStyle = TextStyle(
          fontSize: compactLayout ? 18 : 22,
          fontWeight: FontWeight.w700,
          height: 1.35,
          color: const Color(0xFF0F172A),
        );

        final header = widget.minimalStageLayout
            ? const SizedBox.shrink()
            : Align(
                alignment: widget.centerPortraitLayout
                    ? Alignment.center
                    : Alignment.centerLeft,
                child: Wrap(
                  alignment: widget.centerPortraitLayout
                      ? WrapAlignment.center
                      : WrapAlignment.start,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _ModeChip(label: widget.statusLabel, color: speakerColor),
                    if (widget.secondaryStatus != null &&
                        !widget.centerPortraitLayout)
                      _ModeChip(
                        label: widget.secondaryStatus!,
                        color: const Color(0xFF0F172A),
                      ),
                  ],
                ),
              );

        final useFramelessPortrait =
            widget.framelessPortrait || widget.centerPortraitLayout;

        final portrait = Container(
          height: imageFrameSize,
          width: imageFrameSize,
          padding:
              useFramelessPortrait ? EdgeInsets.zero : const EdgeInsets.all(14),
          decoration: useFramelessPortrait
              ? const BoxDecoration(color: Colors.transparent)
              : BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFE0E7FF), Color(0xFFF8FAFC)],
                  ),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x14243361),
                      blurRadius: 28,
                      offset: Offset(0, 18),
                    ),
                  ],
                ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (!useFramelessPortrait)
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(28),
                      gradient: RadialGradient(
                        center: const Alignment(-0.15, -0.35),
                        radius: 0.95,
                        colors: [
                          speakerColor.withValues(alpha: 0.18),
                          Colors.white.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  ),
                ),
              ScaleTransition(
                scale: Tween(begin: 0.985, end: 1.015).animate(
                  CurvedAnimation(
                    parent: _stagePulseController,
                    curve: Curves.easeInOut,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(
                    useFramelessPortrait ? 0 : 24,
                  ),
                  child: Image.asset(
                    'assets/images/mallam_tutor_cutout.png',
                    height: imageSize,
                    width: imageSize,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ],
          ),
        );

        final primaryPromptCard = widget.minimalStageLayout
            ? const SizedBox.shrink()
            : Container(
                width: double.infinity,
                constraints: BoxConstraints(
                  maxWidth: widget.centerPortraitLayout ? 520 : double.infinity,
                ),
                padding: EdgeInsets.symmetric(
                  horizontal: widget.centerPortraitLayout ? 0 : 20,
                  vertical: widget.centerPortraitLayout ? 0 : 20,
                ),
                decoration: BoxDecoration(
                  color: widget.centerPortraitLayout
                      ? Colors.transparent
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(24),
                  border: widget.centerPortraitLayout
                      ? null
                      : Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: widget.centerPortraitLayout
                      ? CrossAxisAlignment.center
                      : CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.prompt,
                      textAlign: widget.centerPortraitLayout || compactLayout
                          ? TextAlign.center
                          : TextAlign.left,
                      style: promptStyle.copyWith(
                        fontSize: widget.centerPortraitLayout && !compactLayout
                            ? 24
                            : promptStyle.fontSize,
                        height: widget.centerPortraitLayout
                            ? 1.4
                            : promptStyle.height,
                      ),
                    ),
                    if (widget.voiceHint != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        widget.voiceHint!,
                        textAlign: widget.centerPortraitLayout || compactLayout
                            ? TextAlign.center
                            : TextAlign.left,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 14,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ],
                ),
              );

        Future<void> handleVoiceReplayTap() async {
          widget.onVoiceTap();
          if (!mounted) return;
          setState(() => _replayFeedbackActive = true);
          _replayFeedbackTimer?.cancel();
          _replayFeedbackTimer = Timer(const Duration(seconds: 3), () {
            if (!mounted) return;
            setState(() => _replayFeedbackActive = false);
          });
        }

        final replayHelperText = _replayFeedbackActive
            ? 'Mallam is speaking again. Let the learner hear it once, then continue.'
            : 'Tap any time to hear Mallam repeat the current cue.';

        final voiceAction = Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            FilledButton.tonalIcon(
              onPressed: handleVoiceReplayTap,
              icon: Icon(
                _replayFeedbackActive
                    ? Icons.graphic_eq_rounded
                    : _speakerIcon(widget.speakerMode),
                color: speakerColor,
                size: widget.centerPortraitLayout ? 18 : 20,
              ),
              label: Text(
                _replayFeedbackActive
                    ? 'Mallam is replaying'
                    : widget.voiceButtonLabel,
                style: TextStyle(
                  color: speakerColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: widget.centerPortraitLayout
                    ? speakerColor.withValues(alpha: 0.1)
                    : const Color(0xFFF1F5F9),
                foregroundColor: speakerColor,
                elevation: 0,
                padding: EdgeInsets.symmetric(
                  horizontal: widget.centerPortraitLayout ? 18 : 22,
                  vertical: widget.centerPortraitLayout ? 14 : 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(
                    color: widget.centerPortraitLayout
                        ? speakerColor.withValues(alpha: 0.18)
                        : const Color(0xFFE2E8F0),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: widget.centerPortraitLayout ? 320 : double.infinity,
              ),
              child: Text(
                replayHelperText,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _replayFeedbackActive
                      ? speakerColor.withValues(alpha: 0.88)
                      : const Color(0xFF64748B),
                  fontSize: 13,
                  height: 1.4,
                  fontWeight:
                      _replayFeedbackActive ? FontWeight.w700 : FontWeight.w600,
                ),
              ),
            ),
          ],
        );

        final guidancePanel = Container(
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
              Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      color: speakerColor, size: 18),
                  const SizedBox(width: 8),
                  const Text(
                    'What to do next',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                widget.instruction,
                style: const TextStyle(
                  color: Color(0xFF475569),
                  height: 1.45,
                ),
              ),
              if (!widget.centerPortraitLayout) ...[
                const SizedBox(height: 12),
                _SpeakerSignalCard(
                  speakerMode: widget.speakerMode,
                  speakerOutputMode: widget.speakerOutputMode,
                  voiceHint: widget.voiceHint,
                ),
              ],
            ],
          ),
        );

        final centeredSupportNote = widget.centerPortraitLayout &&
                !widget.minimalStageLayout
            ? Container(
                constraints: const BoxConstraints(maxWidth: 420),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Text(
                  'Mallam stays visible here, ready to repeat the cue whenever the learner needs a softer second pass.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    height: 1.45,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              )
            : null;

        final content = widget.centerPortraitLayout
            ? <Widget>[
                ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: math.max(
                      compactLayout ? 440.0 : 560.0,
                      constraints.maxHeight -
                          (widget.minimalStageLayout ? 24 : 48),
                    ),
                  ),
                  child: widget.minimalStageLayout
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Center(child: portrait),
                            const SizedBox(height: 22),
                            Center(child: voiceAction),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                header,
                                SizedBox(height: compactLayout ? 24 : 32),
                                Center(child: portrait),
                              ],
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                primaryPromptCard,
                                if (centeredSupportNote != null) ...[
                                  const SizedBox(height: 16),
                                  centeredSupportNote,
                                ],
                                const SizedBox(height: 18),
                                Center(child: voiceAction),
                              ],
                            ),
                          ],
                        ),
                ),
              ]
            : <Widget>[
                header,
                const SizedBox(height: 10),
                Center(child: portrait),
                const SizedBox(height: 16),
                primaryPromptCard,
                const SizedBox(height: 14),
                SizedBox(width: double.infinity, child: voiceAction),
                const SizedBox(height: 10),
                guidancePanel,
              ];

        return Container(
          decoration: widget.framelessStage
              ? const BoxDecoration(color: Colors.transparent)
              : BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A0F172A),
                      blurRadius: 20,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
          padding: widget.framelessStage
              ? EdgeInsets.zero
              : const EdgeInsets.all(24),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: content,
            ),
          ),
        );
      },
    );
  }

  Color _speakerColor(SpeakerMode mode) {
    switch (mode) {
      case SpeakerMode.guiding:
        return LumoTheme.primary;
      case SpeakerMode.listening:
        return LumoTheme.accentOrange;
      case SpeakerMode.affirming:
        return LumoTheme.accentGreen;
      case SpeakerMode.waiting:
        return const Color(0xFF0EA5E9);
      case SpeakerMode.idle:
        return const Color(0xFF94A3B8);
    }
  }

  IconData _speakerIcon(SpeakerMode mode) {
    switch (mode) {
      case SpeakerMode.guiding:
      case SpeakerMode.affirming:
        return Icons.volume_up_rounded;
      case SpeakerMode.listening:
        return Icons.graphic_eq_rounded;
      case SpeakerMode.waiting:
        return Icons.hearing_rounded;
      case SpeakerMode.idle:
        return Icons.pause_circle_outline_rounded;
    }
  }
}

class _SpeakerSignalCard extends StatelessWidget {
  final SpeakerMode speakerMode;
  final String? speakerOutputMode;
  final String? voiceHint;

  const _SpeakerSignalCard({
    required this.speakerMode,
    this.speakerOutputMode,
    this.voiceHint,
  });

  @override
  Widget build(BuildContext context) {
    final color = switch (speakerMode) {
      SpeakerMode.guiding => LumoTheme.primary,
      SpeakerMode.listening => LumoTheme.accentOrange,
      SpeakerMode.affirming => LumoTheme.accentGreen,
      SpeakerMode.waiting => const Color(0xFF0EA5E9),
      SpeakerMode.idle => const Color(0xFF94A3B8),
    };

    final label = switch (speakerMode) {
      SpeakerMode.guiding => 'Mallam is speaking now',
      SpeakerMode.listening => 'Pause and capture the learner voice',
      SpeakerMode.affirming => 'Praise and continue',
      SpeakerMode.waiting => 'Give the learner a moment',
      SpeakerMode.idle => 'Voice is standing by',
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 12,
                width: 12,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (speakerOutputMode != null)
                _ModeChip(
                  label: speakerOutputMode!,
                  color: const Color(0xFF334155),
                ),
              _ModeChip(
                label: speakerMode.name.toUpperCase(),
                color: color,
              ),
            ],
          ),
          if (voiceHint != null) ...[
            const SizedBox(height: 10),
            Text(
              voiceHint!,
              style: const TextStyle(color: Color(0xFF6B7280)),
            ),
          ],
        ],
      ),
    );
  }
}

class _TopChip extends StatelessWidget {
  final String text;

  const _TopChip({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600)),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label;
  final Color color;

  const _ModeChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}
