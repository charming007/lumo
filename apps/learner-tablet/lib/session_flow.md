# Learner lesson flow

## Shared-tablet flow
1. Facilitator opens tablet app
2. Select subject
3. Select available lesson
4. Select available learner
5. Confirm and start lesson
6. Audio prompt plays
7. Learner responds by speaking or tapping
8. Feedback is given immediately
9. Lesson completion summary appears
10. Progress saves locally for later sync

## Offline sync contract
- assigned lessons cached on device
- attempts logged locally
- sync queue batches progress events
- server resolves assignment state
- event stream merge is append-only where possible
