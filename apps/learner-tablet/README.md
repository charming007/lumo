# Lumo Learner Tablet App

Flutter app for shared Android tablets used by learners in low-resource environments.

## Planned modules
- profile switching
- lesson player
- audio prompts
- microphone interaction
- offline lesson storage
- sync queue
- facilitator mode

## Current authoring/runtime support
- typed lesson activity steps from LMS/backend
- activity-level media arrays, including multiple shared assets per step
- choice-level image/audio assets for richer tap/select activities
- graceful fallback when authored assets are missing or unsupported

## Android release signing

Production Android builds must use a real release keystore. This app now refuses to build a `release` artifact if signing is missing instead of silently using the debug key.

Provide signing through either:

- `android/key.properties` with `storeFile`, `storePassword`, `keyAlias`, `keyPassword`
- or environment variables:
  - `LUMO_ANDROID_STORE_FILE`
  - `LUMO_ANDROID_STORE_PASSWORD`
  - `LUMO_ANDROID_KEY_ALIAS`
  - `LUMO_ANDROID_KEY_PASSWORD`

If those values are absent, release builds fail fast on purpose.
