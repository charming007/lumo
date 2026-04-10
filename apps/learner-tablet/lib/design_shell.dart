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
        _TopChip(text: item['city']!),
        const SizedBox(width: 8),
        _TopChip(text: item['lga']!),
        const SizedBox(width: 8),
        _TopChip(text: formattedDate),
      ],
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
  });

  @override
  Widget build(BuildContext context) {
    final speakerColor = _speakerColor(speakerMode);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Row(
            children: [
              _ModeChip(label: statusLabel, color: speakerColor),
              if (secondaryStatus != null) ...[
                const SizedBox(width: 8),
                _ModeChip(
                    label: secondaryStatus!, color: const Color(0xFF0F172A)),
              ],
            ],
          ),
          const SizedBox(height: 18),
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  height: 280,
                  width: 280,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        speakerColor.withValues(alpha: 0.18),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(32),
                  child: Image.asset('assets/images/mallam_tutor.jpg',
                      height: 320, fit: BoxFit.contain),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _SpeakerSignalCard(
            speakerMode: speakerMode,
            speakerOutputMode: speakerOutputMode,
            voiceHint: voiceHint,
          ),
          const SizedBox(height: 16),
          Text(prompt,
              textAlign: TextAlign.center,
              style:
                  const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Text(instruction,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF6B7280))),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: onVoiceTap,
            icon: Icon(_speakerIcon(speakerMode), color: speakerColor),
            label: Text(
              voiceButtonLabel,
              style:
                  TextStyle(color: speakerColor, fontWeight: FontWeight.w800),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: speakerColor.withValues(alpha: 0.12),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
            ),
          ),
        ],
      ),
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
