# Learner lesson flow

## Shared-tablet flow
1. Facilitator opens tablet app
2. Select learner profile
3. App shows assigned lessons
4. Learner taps lesson
5. Audio prompt plays
6. Learner responds by speaking or tapping
7. Feedback is given immediately
8. Lesson completion summary appears
9. Progress saves locally for later sync

## Offline sync contract
- assigned lessons cached on device
- attempts logged locally
- sync queue batches progress events
- server resolves assignment state
- event stream merge is append-only where possible
