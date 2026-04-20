# Meet Mallam bundled lesson

This folder is the starter offline asset/content shell for the `lumo-fundamentals` pack.

What is here:
- `lesson.json` — lesson 1 (`Hello, Mallam`) runtime payload + offline media manifest
- `lesson_name_and_ready.json` — lesson 2 (`My name and I am ready`) runtime payload + offline media manifest
- `lesson_listen_and_answer.json` — lesson 3 (`I can listen and answer`) runtime payload + offline media manifest
- `lesson_first_learning_turn.json` — lesson 4 (`My first learning turn`) runtime payload + offline media manifest
- `media/` — bundled starter card art used by the offline pack today

What is intentionally *not* here:
- final production narration audio
- polished field photography pretending to be approved curriculum media
- any fake file masquerading as a backend sync artifact

Current offline goal:
- usable first-contact lesson sequence even with no network
- a full 4-lesson onboarding loop that goes from greeting Mallam to a complete first learning turn
- enough local card media for pointing, recognition, and short spoken responses
- manifests that can later swap in approved production assets without changing lesson ids

When real media is ready, place it under `media/` using the manifest paths already declared in the lesson manifests.
