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

class MallamPanel extends StatelessWidget {
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
  });

  @override
  Widget build(BuildContext context) {
    final speakerColor = _speakerColor(speakerMode);
    return LayoutBuilder(
      builder: (context, constraints) {
        final compactLayout =
            constraints.maxWidth < 420 || constraints.maxHeight < 760;
        final imageGlowSize = compactLayout ? 164.0 : 208.0;
        final imageSize = compactLayout ? 172.0 : 212.0;
        final promptStyle = TextStyle(
          fontSize: compactLayout ? 20 : 24,
          fontWeight: FontWeight.w800,
          height: 1.2,
        );

        final header = Align(
          alignment:
              centerPortraitLayout ? Alignment.center : Alignment.centerLeft,
          child: Wrap(
            alignment: centerPortraitLayout
                ? WrapAlignment.center
                : WrapAlignment.start,
            spacing: 8,
            runSpacing: 8,
            children: [
              _ModeChip(label: statusLabel, color: speakerColor),
              if (secondaryStatus != null)
                _ModeChip(
                  label: secondaryStatus!,
                  color: const Color(0xFF0F172A),
                ),
            ],
          ),
        );

        final portrait = Stack(
          alignment: Alignment.center,
          children: [
            Container(
              height: imageGlowSize,
              width: imageGlowSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    speakerColor.withValues(alpha: 0.16),
                    speakerColor.withValues(alpha: 0.03),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: speakerColor.withValues(alpha: 0.12),
                    blurRadius: 28,
                    offset: const Offset(0, 16),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.asset(
                  'assets/images/mallam_tutor.jpg',
                  height: imageSize,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ],
        );

        final primaryPromptCard = Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                speakerColor.withValues(alpha: 0.14),
                const Color(0xFFFFFFFF),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: speakerColor.withValues(alpha: 0.18)),
          ),
          child: Column(
            crossAxisAlignment: centerPortraitLayout
                ? CrossAxisAlignment.center
                : CrossAxisAlignment.start,
            children: [
              Text(
                'Mallam says',
                textAlign:
                    centerPortraitLayout ? TextAlign.center : TextAlign.left,
                style: TextStyle(
                  color: speakerColor,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                prompt,
                textAlign: centerPortraitLayout || compactLayout
                    ? TextAlign.center
                    : TextAlign.left,
                style: promptStyle,
              ),
            ],
          ),
        );

        final voiceAction = FilledButton.tonalIcon(
          onPressed: onVoiceTap,
          icon: Icon(_speakerIcon(speakerMode), color: speakerColor),
          label: Text(
            voiceButtonLabel,
            style: TextStyle(color: speakerColor, fontWeight: FontWeight.w800),
          ),
          style: FilledButton.styleFrom(
            backgroundColor: speakerColor.withValues(alpha: 0.12),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
          ),
        );

        final guidancePanel = Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            initiallyExpanded: compactLayout,
            leading: Icon(Icons.info_outline_rounded, color: speakerColor),
            title: const Text(
              'Facilitator guidance',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            subtitle: Text(
              voiceHint ?? instruction,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFF64748B), height: 1.35),
            ),
            children: [
              const SizedBox(height: 8),
              _SpeakerSignalCard(
                speakerMode: speakerMode,
                speakerOutputMode: speakerOutputMode,
                voiceHint: voiceHint,
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE7ECF3)),
                ),
                child: Text(
                  instruction,
                  style: const TextStyle(
                    color: Color(0xFF475569),
                    height: 1.45,
                  ),
                ),
              ),
            ],
          ),
        );

        final stackedContent = <Widget>[
          header,
          const SizedBox(height: 16),
          Center(child: portrait),
          const SizedBox(height: 18),
          if (centerPortraitLayout)
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: primaryPromptCard,
              ),
            )
          else
            primaryPromptCard,
          const SizedBox(height: 14),
          if (centerPortraitLayout)
            Center(child: voiceAction)
          else
            SizedBox(width: double.infinity, child: voiceAction),
          const SizedBox(height: 10),
          guidancePanel,
        ];

        final content = compactLayout || centerPortraitLayout
            ? stackedContent
            : <Widget>[
                header,
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: 220, child: Center(child: portrait)),
                    const SizedBox(width: 18),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          primaryPromptCard,
                          const SizedBox(height: 14),
                          SizedBox(width: double.infinity, child: voiceAction),
                          const SizedBox(height: 10),
                          guidancePanel,
                        ],
                      ),
                    ),
                  ],
                ),
              ];

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: const [
              BoxShadow(
                color: Color(0x120F172A),
                blurRadius: 24,
                offset: Offset(0, 14),
              ),
            ],
          ),
          padding: const EdgeInsets.all(24),
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
                    label: speakerOutputMode!, color: const Color(0xFF334155)),
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
