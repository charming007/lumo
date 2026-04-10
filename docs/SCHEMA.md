# Lumo MVP Data Model Outline

## Core entities

### Organizations
- Organization
- Region
- LearningCenter
- Cohort
- Teacher
- Facilitator
- Device

### Students
- Student
- StudentProfile
- Enrollment
- AttendanceRecord
- ObservationNote

### Curriculum
- CurriculumFramework
- Subject
- Competency
- Unit
- Lesson
- Activity
- Prompt
- ResponseRule
- Assessment
- LessonPack
- VoicePersona
- LocalizationVariant

### Delivery / Learning
- Assignment
- LessonAttempt
- ActivityAttempt
- SkillProgress
- MasteryRecord
- LearningEvent
- SyncBatch
- SyncFailure

### Governance
- ContentDraft
- ReviewDecision
- ApprovedVersion
- AuditLog

### Reporting
- OutcomeSnapshot
- CohortReport
- UsageMetric

## Suggested relationships

- Organization has many LearningCenters
- LearningCenter has many Cohorts, Teachers, Devices, Students
- Student belongs to many Cohorts through Enrollment
- Subject has many Units
- Unit has many Lessons
- Lesson has many Activities
- LessonPack groups Lessons
- Assignment maps LessonPacks or Lessons to Student/Cohort
- LessonAttempt belongs to Student and Lesson
- ActivityAttempt belongs to LessonAttempt and Activity
- SkillProgress belongs to Student and Competency
- ContentDraft versions Lesson or Activity content before approval
- ApprovedVersion is deployable to learner devices
