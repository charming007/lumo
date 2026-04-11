import type { ReactNode } from 'react';
import {
  createAssessmentAction,
  createLessonAction,
  createMallamAction,
  createModuleAction,
  createStudentAction,
  deleteMallamAction,
  deleteStudentAction,
  updateAssessmentAction,
  updateAssignmentAction,
  updateLessonAction,
  updateMallamAction,
  updateModuleAction,
  updateStudentAction,
} from '../app/actions';
import type { Assessment, Assignment, Center, Cohort, CurriculumModule, Lesson, Mallam, Pod, Student, Subject } from '../lib/types';
import { ActionButton } from './action-button';

const cardStyle = {
  background: 'white',
  borderRadius: 20,
  padding: 24,
  display: 'grid',
  gap: 12,
  border: '1px solid #eef2f7',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
} as const;

const embeddedCardStyle = {
  display: 'grid',
  gap: 12,
} as const;

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

const buttonStyle = {
  background: '#6C63FF',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

export function CreateStudentForm({ cohorts, pods, mallams }: { cohorts: Cohort[]; pods: Pod[]; mallams: Mallam[] }) {
  return (
    <form action={createStudentAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Add learner</h2>
      <FieldLabel>Name<input name="name" defaultValue="Safiya" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Age<input name="age" type="number" min="5" max="18" defaultValue="10" style={inputStyle} /></FieldLabel>
        <FieldLabel>Gender<select name="gender" defaultValue="female" style={inputStyle}><option value="female">Female</option><option value="male">Male</option><option value="unspecified">Unspecified</option></select></FieldLabel>
      </div>
      <FieldLabel>Cohort<select name="cohortId" defaultValue={cohorts[0]?.id} style={inputStyle}>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></FieldLabel>
      <FieldLabel>Pod<select name="podId" defaultValue={pods[0]?.id} style={inputStyle}>{pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}</select></FieldLabel>
      <FieldLabel>Mallam<select name="mallamId" defaultValue={mallams[0]?.id} style={inputStyle}>{mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}</select></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Level<select name="level" defaultValue="beginner" style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
        <FieldLabel>Stage<input name="stage" defaultValue="foundation-a" style={inputStyle} /></FieldLabel>
      </div>
      <FieldLabel>Guardian<input name="guardianName" defaultValue="Parent contact pending" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Attendance rate<input name="attendanceRate" type="number" step="0.01" min="0" max="1" defaultValue="0.85" style={inputStyle} /></FieldLabel>
        <FieldLabel>Device access<select name="deviceAccess" defaultValue="shared-tablet" style={inputStyle}><option value="shared-tablet">Shared tablet</option><option value="family-phone">Family phone</option><option value="center-device">Center device</option></select></FieldLabel>
      </div>
      <ActionButton label="Create learner" pendingLabel="Creating learner…" style={buttonStyle} />
    </form>
  );
}

export function UpdateStudentForm({ student, cohorts, pods, mallams, title = 'Reassign learner', embedded = false }: { student: Student; cohorts: Cohort[]; pods: Pod[]; mallams: Mallam[]; title?: string; embedded?: boolean }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updateStudentAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="studentId" value={student.id} />
        <h2 style={{ margin: 0 }}>{title}</h2>
        <FieldLabel>Name<input name="name" defaultValue={student.name} style={inputStyle} /></FieldLabel>
        <FieldLabel>Cohort<select name="cohortId" defaultValue={student.cohortId} style={inputStyle}>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></FieldLabel>
        <FieldLabel>Pod<select name="podId" defaultValue={student.podId} style={inputStyle}>{pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}</select></FieldLabel>
        <FieldLabel>Mallam<select name="mallamId" defaultValue={student.mallamId} style={inputStyle}>{mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}</select></FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <FieldLabel>Level<select name="level" defaultValue={student.level} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
          <FieldLabel>Stage<input name="stage" defaultValue={student.stage} style={inputStyle} /></FieldLabel>
        </div>
        <FieldLabel>Guardian<input name="guardianName" defaultValue={student.guardianName ?? ''} style={inputStyle} /></FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <FieldLabel>Attendance rate<input name="attendanceRate" type="number" step="0.01" min="0" max="1" defaultValue={String(student.attendanceRate)} style={inputStyle} /></FieldLabel>
          <FieldLabel>Device access<select name="deviceAccess" defaultValue={student.deviceAccess} style={inputStyle}><option value="shared-tablet">Shared tablet</option><option value="family-phone">Family phone</option><option value="center-device">Center device</option></select></FieldLabel>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ActionButton label="Save learner changes" pendingLabel="Saving learner…" style={buttonStyle} />
        </div>
      </form>
    </div>
  );
}

export function DeleteStudentForm({ student, embedded = false }: { student: Student; embedded?: boolean }) {
  return (
    <form action={deleteStudentAction} style={embedded ? embeddedCardStyle : cardStyle}>
      <input type="hidden" name="studentId" value={student.id} />
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Delete learner</h2>
        <div style={{ color: '#475569', lineHeight: 1.6 }}>
          Remove <strong>{student.name}</strong> from the roster? This updates the live admin data and cannot be undone from this screen.
        </div>
      </div>
      <ActionButton label="Delete learner" pendingLabel="Deleting learner…" style={{ ...buttonStyle, background: '#dc2626' }} />
    </form>
  );
}

export function CreateMallamForm({ centers, pods }: { centers: Center[]; pods: Pod[] }) {
  return (
    <form action={createMallamAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Add mallam</h2>
      <FieldLabel>Name<input name="name" defaultValue="Fatima Ali" style={inputStyle} /></FieldLabel>
      <FieldLabel>Display name<input name="displayName" defaultValue="Mallama Fatima Ali" style={inputStyle} /></FieldLabel>
      <FieldLabel>Center<select name="centerId" defaultValue={centers[0]?.id} style={inputStyle}>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></FieldLabel>
      <FieldLabel>Pod IDs (comma separated)<input name="podIds" defaultValue={pods[0]?.id ?? ''} style={inputStyle} /></FieldLabel>
      <FieldLabel>Languages<input name="languages" defaultValue="Hausa, English" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Role<select name="role" defaultValue="mallam-lead" style={inputStyle}><option value="mallam-lead">Mallam lead</option><option value="facilitator">Facilitator</option><option value="coach">Coach</option></select></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="active" style={inputStyle}><option value="active">Active</option><option value="training">Training</option><option value="leave">Leave</option></select></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Learner load<input name="learnerCount" type="number" defaultValue="18" style={inputStyle} /></FieldLabel>
        <FieldLabel>Certification<input name="certificationLevel" defaultValue="Level 1" style={inputStyle} /></FieldLabel>
      </div>
      <ActionButton label="Create mallam" pendingLabel="Creating mallam…" style={buttonStyle} />
    </form>
  );
}

export function UpdateMallamForm({ mallam, centers, embedded = false }: { mallam: Mallam; centers: Center[]; embedded?: boolean }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updateMallamAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="mallamId" value={mallam.id} />
        <h2 style={{ margin: 0 }}>Update mallam</h2>
        <FieldLabel>Name<input name="name" defaultValue={mallam.name} style={inputStyle} /></FieldLabel>
        <FieldLabel>Display name<input name="displayName" defaultValue={mallam.displayName} style={inputStyle} /></FieldLabel>
        <FieldLabel>Center<select name="centerId" defaultValue={mallam.centerId} style={inputStyle}>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></FieldLabel>
        <FieldLabel>Pod IDs (comma separated)<input name="podIds" defaultValue={(mallam.podIds ?? []).join(', ')} style={inputStyle} /></FieldLabel>
        <FieldLabel>Languages<input name="languages" defaultValue={(mallam.languages ?? []).join(', ')} style={inputStyle} /></FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <FieldLabel>Role<select name="role" defaultValue={mallam.role} style={inputStyle}><option value="mallam-lead">Mallam lead</option><option value="facilitator">Facilitator</option><option value="coach">Coach</option></select></FieldLabel>
          <FieldLabel>Status<select name="status" defaultValue={mallam.status} style={inputStyle}><option value="active">Active</option><option value="training">Training</option><option value="leave">Leave</option></select></FieldLabel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <FieldLabel>Learner load<input name="learnerCount" type="number" defaultValue={String(mallam.learnerCount)} style={inputStyle} /></FieldLabel>
          <FieldLabel>Certification<input name="certificationLevel" defaultValue={mallam.certificationLevel} style={inputStyle} /></FieldLabel>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ActionButton label="Save mallam changes" pendingLabel="Saving mallam…" style={buttonStyle} />
        </div>
      </form>
    </div>
  );
}

export function DeleteMallamForm({ mallam, embedded = false }: { mallam: Mallam; embedded?: boolean }) {
  return (
    <form action={deleteMallamAction} style={embedded ? embeddedCardStyle : cardStyle}>
      <input type="hidden" name="mallamId" value={mallam.id} />
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Delete mallam</h2>
        <div style={{ color: '#475569', lineHeight: 1.6 }}>
          Remove <strong>{mallam.displayName}</strong> from deployment? This will clear the profile from the live admin roster.
        </div>
      </div>
      <ActionButton label="Delete mallam" pendingLabel="Deleting mallam…" style={{ ...buttonStyle, background: '#dc2626' }} />
    </form>
  );
}

export function ReassignAssignmentForm({ assignment, cohorts, mallams }: { assignment: Assignment; cohorts: Cohort[]; mallams: Mallam[] }) {
  return (
    <form action={updateAssignmentAction} style={cardStyle}>
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <h2 style={{ margin: 0 }}>Reassign live assignment</h2>
      <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
        <strong>{assignment.lessonTitle}</strong> is currently mapped to {assignment.cohortName} with {assignment.teacherName}.
      </div>
      <FieldLabel>Target cohort<select name="cohortId" defaultValue={cohorts.find((item) => item.name === assignment.cohortName)?.id} style={inputStyle}>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></FieldLabel>
      <FieldLabel>Assign to mallam<select name="assignedBy" defaultValue={mallams.find((item) => item.displayName === assignment.teacherName)?.id} style={inputStyle}>{mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}</select></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Due date<input name="dueDate" defaultValue={assignment.dueDate} style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue={assignment.status} style={inputStyle}><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option></select></FieldLabel>
      </div>
      <ActionButton label="Update assignment" pendingLabel="Updating assignment…" style={buttonStyle} />
    </form>
  );
}

export function CreateModuleForm() {
  return (
    <form action={createModuleAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Create module</h2>
      <FieldLabel>Strand<select name="strandId" defaultValue="strand-1" style={inputStyle}><option value="strand-1">Listening &amp; Speaking</option><option value="strand-2">Number Sense</option><option value="strand-3">Health &amp; Hygiene</option></select></FieldLabel>
      <FieldLabel>Title<input name="title" defaultValue="Community Helpers" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Level<select name="level" defaultValue="beginner" style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
        <FieldLabel>Lesson count<input name="lessonCount" type="number" min="1" defaultValue="6" style={inputStyle} /></FieldLabel>
        <FieldLabel>Order<input name="order" type="number" min="1" defaultValue="3" style={inputStyle} /></FieldLabel>
      </div>
      <FieldLabel>Status<select name="status" defaultValue="draft" style={inputStyle}><option value="draft">Draft</option><option value="review">In review</option><option value="published">Published</option></select></FieldLabel>
      <ActionButton label="Create module" pendingLabel="Creating module…" style={buttonStyle} />
    </form>
  );
}

export function UpdateModuleForm({ modules }: { modules: CurriculumModule[] }) {
  const module = modules[0];

  return (
    <form action={updateModuleAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Update module</h2>
      <FieldLabel>Module<select name="moduleId" defaultValue={module?.id ?? ''} style={inputStyle}>{modules.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} • {entry.subjectName ?? 'General'} • {entry.status}</option>)}</select></FieldLabel>
      <FieldLabel>Status<select name="status" defaultValue={module?.status ?? 'draft'} style={inputStyle}><option value="draft">Draft</option><option value="review">In review</option><option value="published">Published</option></select></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Lesson count<input name="lessonCount" type="number" min="1" defaultValue={String(module?.lessonCount ?? 1)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Level<select name="level" defaultValue={module?.level ?? 'beginner'} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
      </div>
      <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>Pick the module you want to update, then save the status, lesson count, and level for that exact record.</div>
      <ActionButton label="Save module changes" pendingLabel="Saving module…" style={buttonStyle} />
    </form>
  );
}

export function CreateLessonForm({ modules }: { modules: CurriculumModule[] }) {
  return (
    <form action={createLessonAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Create lesson</h2>
      <FieldLabel>Subject<select name="subjectId" defaultValue="english" style={inputStyle}><option value="english">Foundational English</option><option value="math">Basic Numeracy</option><option value="life-skills">Life Skills</option></select></FieldLabel>
      <FieldLabel>Module<select name="moduleId" defaultValue={modules[0]?.id} style={inputStyle}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></FieldLabel>
      <FieldLabel>Title<input name="title" defaultValue="Who helps in our community?" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Duration (min)<input name="durationMinutes" type="number" min="1" defaultValue="8" style={inputStyle} /></FieldLabel>
        <FieldLabel>Mode<select name="mode" defaultValue="guided" style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option></select></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="draft" style={inputStyle}><option value="draft">Draft</option><option value="approved">Approved</option><option value="published">Published</option></select></FieldLabel>
      </div>
      <ActionButton label="Create lesson" pendingLabel="Creating lesson…" style={buttonStyle} />
    </form>
  );
}

export function UpdateLessonForm({ lessons }: { lessons: Lesson[] }) {
  const lesson = lessons[0];

  return (
    <form action={updateLessonAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Update lesson</h2>
      <FieldLabel>Lesson<select name="lessonId" defaultValue={lesson?.id ?? ''} style={inputStyle}>{lessons.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} • {entry.moduleTitle ?? 'No module'} • {entry.status}</option>)}</select></FieldLabel>
      <FieldLabel>Status<select name="status" defaultValue={lesson?.status ?? 'draft'} style={inputStyle}><option value="draft">Draft</option><option value="approved">Approved</option><option value="published">Published</option></select></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Mode<select name="mode" defaultValue={lesson?.mode ?? 'guided'} style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option></select></FieldLabel>
        <FieldLabel>Duration (min)<input name="durationMinutes" type="number" min="1" defaultValue={String(lesson?.durationMinutes ?? 8)} style={inputStyle} /></FieldLabel>
      </div>
      <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>Target the exact lesson you want instead of blindly updating whatever happens to be first in the dataset.</div>
      <ActionButton label="Save lesson changes" pendingLabel="Saving lesson…" style={buttonStyle} />
    </form>
  );
}

export function CreateAssessmentForm({ modules, subjects }: { modules: CurriculumModule[]; subjects: Subject[] }) {
  const defaultModule = modules[0];

  return (
    <form action={createAssessmentAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Create assessment gate</h2>
      <FieldLabel>Subject<select name="subjectId" defaultValue={defaultModule?.subjectId ?? subjects[0]?.id ?? 'english'} style={inputStyle}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></FieldLabel>
      <FieldLabel>Module<select name="moduleId" defaultValue={defaultModule?.id} style={inputStyle}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></FieldLabel>
      <FieldLabel>Assessment title<input name="title" defaultValue="Bridge readiness checkpoint" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Kind<select name="kind" defaultValue="automatic" style={inputStyle}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></FieldLabel>
        <FieldLabel>Trigger<select name="trigger" defaultValue="module-complete" style={inputStyle}><option value="module-complete">After module complete</option><option value="lesson-cluster">After lesson cluster</option><option value="mallam-review">Mallam review</option></select></FieldLabel>
      </div>
      <FieldLabel>Trigger label<input name="triggerLabel" defaultValue={`After ${defaultModule?.title ?? 'selected module'}`} style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Progression gate<input name="progressionGate" defaultValue="bridge" style={inputStyle} /></FieldLabel>
        <FieldLabel>Passing score<input name="passingScore" type="number" min="0" max="1" step="0.01" defaultValue="0.7" style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="draft" style={inputStyle}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <ActionButton label="Create assessment" pendingLabel="Creating assessment…" style={buttonStyle} />
    </form>
  );
}

export function UpdateAssessmentForm({ assessments }: { assessments: Assessment[] }) {
  const assessment = assessments[0];

  return (
    <form action={updateAssessmentAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Update assessment gate</h2>
      <FieldLabel>Assessment<select name="assessmentId" defaultValue={assessment?.id ?? ''} style={inputStyle}>{assessments.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} • {entry.moduleTitle ?? 'No module'} • {entry.status}</option>)}</select></FieldLabel>
      <FieldLabel>Assessment title<input name="title" defaultValue={assessment?.title ?? ''} style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Kind<select name="kind" defaultValue={assessment?.kind ?? 'automatic'} style={inputStyle}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></FieldLabel>
        <FieldLabel>Trigger<select name="trigger" defaultValue={assessment?.trigger ?? 'module-complete'} style={inputStyle}><option value="module-complete">After module complete</option><option value="lesson-cluster">After lesson cluster</option><option value="mallam-review">Mallam review</option></select></FieldLabel>
      </div>
      <FieldLabel>Trigger label<input name="triggerLabel" defaultValue={assessment?.triggerLabel ?? ''} style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Progression gate<input name="progressionGate" defaultValue={assessment?.progressionGate ?? ''} style={inputStyle} /></FieldLabel>
        <FieldLabel>Passing score<input name="passingScore" type="number" min="0" max="1" step="0.01" defaultValue={String(assessment?.passingScore ?? 0.7)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue={assessment?.status ?? 'draft'} style={inputStyle}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>Same deal here: choose the assessment gate first so admins don’t accidentally overwrite the wrong progression check.</div>
      <ActionButton label="Save assessment changes" pendingLabel="Saving assessment…" style={buttonStyle} />
    </form>
  );
}
