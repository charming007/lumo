# Lumo LMS Web

Sharpened admin surface for the Lumo LMS: dashboard, learner and mallam ops, curriculum/content authoring, English lesson planning, reporting, and settings.

## Run locally

```bash
npm install
npm run dev
```

The app runs with Next.js in `apps/lms-web`.

## Environment

Create `.env.local` with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

If the API is down, key pages now stay usable in degraded mode and call out which feeds failed instead of just silently collapsing.

## Main routes

- `/` — dashboard and top-level ops cockpit
- `/content` — curriculum spine, lesson inventory, and quick ops controls
- `/content/lessons/new` — Lesson Studio for full lesson payload authoring
- `/content/lessons/[id]` — full lesson editor and release checks
- `/english` — English Studio with blueprint/readiness workflow
- `/reports` — scoped reporting, NGO/donor narrative packs, compliance board, pod and mallam drilldowns
- `/guide` — live LMS/admin guide plus embedded printable handbook
- `/settings` — runtime, rewards, integrity, and guardrails

## UX guardrails worth preserving

- Keep route handoffs obvious. Operators should be able to jump from reports to mallam detail, assignments, guide, and back without guessing.
- Prefer honest degraded states over fake success. If feeds fail, name them.
- Keep quick edits quick, but push real curriculum work into English Studio and Lesson Studio.
- Typed confirmation stays on destructive actions. That friction is deliberate.
- Reporting copy should stay easy to reuse externally without drifting away from live LMS evidence.

## Deployment

Deploy to Vercel with root directory set to `apps/lms-web`.

`NEXT_PUBLIC_API_BASE_URL` is mandatory for a production deployment.

Production builds now fail fast if it is missing, because a dashboard/admin shell that boots without its live API is not a valid release. Set the env var in Vercel (or your build environment) before deploying.
