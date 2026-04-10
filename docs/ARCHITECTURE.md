# Lumo MVP Architecture

## 1. System overview

Lumo MVP consists of three main systems:

1. Learner tablet app (Flutter)
2. LMS/admin portal (Next.js)
3. Backend platform (NestJS + PostgreSQL + object storage)

The platform must support offline lesson execution on shared Android tablets and delayed synchronization when connectivity is restored.

## 2. High-level architecture

### Client apps
- Flutter Android tablet app
- Next.js LMS/admin web portal

### Platform services
- API service
- Auth and RBAC service
- Curriculum/content service
- Lesson assignment service
- Progress and mastery service
- Attendance and observation service
- Sync service
- Reporting service
- AI orchestration service

### Data/storage
- PostgreSQL for core relational data
- SQLite on device for local offline data
- S3-compatible storage for audio/assets/exports
- Redis for background jobs and caches

## 3. Learner app modules

- Profile Switcher
- Subject Home
- Lesson Player
- Audio Playback Manager
- Microphone / recording handler
- Local progress tracker
- Reward/progress UI
- Offline pack manager
- Sync queue manager
- Settings / facilitator mode

## 4. LMS modules

- Authentication
- Centers / cohort management
- Student roster
- Attendance
- Lesson assignments
- Progress dashboard
- Observations
- Reports and exports
- AI lesson suggestion review

## 5. API modules

- auth
- organizations
- centers
- cohorts
- teachers
- students
- attendance
- curriculum
- lessons
- assignments
- progress
- sync
- reports
- ai
- assets

## 6. Offline strategy

### Stored locally on tablet
- assigned lesson packs
- profile metadata for local learners
- activity definitions needed for offline playback
- progress events
- attempts and scores
- sync queue metadata
- cached audio

### Sync behavior
- device queues writes locally first
- sync worker retries automatically on connectivity restoration
- conflict resolution is server-authoritative for assignment state and merge-safe for event streams
- sync batching minimizes network overhead

## 7. AI architecture

AI is constrained to supervised roles:

- lesson adaptation recommendations
- teacher-facing lesson draft suggestions
- content quality evaluation
- trend analysis and reporting support

The child learning flow should not depend on unconstrained live generation to remain safe and reliable offline.

## 8. Security and privacy

- role-based access controls
- encrypted transport
- opt-in voice storage only
- audit logs for content approvals and major admin actions
- child-safe prompt and output constraints
- data minimization for minors

## 9. Deployment recommendation

### MVP deployment
- LMS frontend on Vercel or equivalent
- API service on container platform
- PostgreSQL managed instance
- S3-compatible object store
- Redis managed instance

### Pilot operations
- staged content publishing
- environment separation (dev/staging/prod)
- structured telemetry and error monitoring

## 10. Future-ready extensions

- multilingual content variants
- richer local speech support
- government reporting integrations
- center-level analytics benchmarking
- advanced personalization engine
