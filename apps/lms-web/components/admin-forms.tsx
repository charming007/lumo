import type { ReactNode } from 'react';
import { DeleteConfirmSubmit } from './delete-confirm-submit';
import { LifecycleStatusField } from './lifecycle-status-field';
import {
  createAssessmentAction,
  createLessonAction,
  createMallamAction,
  createModuleAction,
  createPodAction,
  createDeviceRegistrationAction,
  createStrandAction,
  createStudentAction,
  createSubjectAction,
  deleteAssessmentAction,
  deleteMallamAction,
  deleteModuleAction,
  deleteLessonAction,
  deletePodAction,
  deleteDeviceRegistrationAction,
  deleteStrandAction,
  deleteStudentAction,
  deleteSubjectAction,
  updateAssessmentAction,
  updateLessonAction,
  updateMallamAction,
  updateModuleAction,
  updatePodAction,
  updateStrandAction,
  updateStudentAction,
  updateSubjectAction,
} from '../app/actions';
import type { Assessment, Center, Cohort, CurriculumModule, Lesson, LocalGovernment, Mallam, Pod, State, Strand, Student, Subject } from '../lib/types';
import { ActionButton } from './action-button';
import { CreateAssessmentFormClient } from './create-assessment-form';
import { cohortGeographyLabel, mallamGeographyLabel, podGeographyLabel } from '../lib/geography';
import { MallamGeographySelectors, PodGeographySelectors, StudentGeographySelectors } from './geo-scoped-selects';

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

const responsiveGrid = (minWidth: number) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
  gap: 12,
}) as const;

const twoColumnGrid = responsiveGrid(220);
const threeColumnGrid = responsiveGrid(180);

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

function SectionHint({ children }: { children: ReactNode }) {
  return <div style={{ color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>{children}</div>;
}

const SUBJECT_STRAND_LIFECYCLE_OPTIONS = [
  { value: 'draft', label: 'Draft', hint: 'Still being shaped. Visible to ops, not ready to ship as the live curriculum lane.', tone: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
  { value: 'review', label: 'In review', hint: 'Structure is there, but it still needs editorial or ops sign-off before release.', tone: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  { value: 'published', label: 'Published', hint: 'This lane is considered release-visible and can anchor downstream content safely.', tone: '#ECFDF5', text: '#166534', border: '#86EFAC' },
] as const;

const MODULE_LESSON_LIFECYCLE_OPTIONS = [
  { value: 'draft', label: 'Draft', hint: 'Work-in-progress only. Safe for internal editing, not for learner-facing release.', tone: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
  { value: 'review', label: 'In review', hint: 'Structured enough for QA or editorial checks, but still blocked from release.', tone: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  { value: 'approved', label: 'Approved', hint: 'Content quality is accepted, but it is not live until you explicitly publish it.', tone: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
  { value: 'published', label: 'Published', hint: 'Live release state. This is the learner-ready lane.', tone: '#ECFDF5', text: '#166534', border: '#86EFAC' },
  { value: 'active', label: 'Active', hint: 'Legacy live state kept for compatibility with older module records.', tone: '#F5F3FF', text: '#6D28D9', border: '#C4B5FD' },
] as const;

function GeographyHint({ children }: { children: ReactNode }) {
  return <div style={{ padding: '12px 14px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', lineHeight: 1.6 }}>{children}</div>;
}

function PodSelector({ pods, selectedPodIds, centers, states, localGovernments }: { pods: Pod[]; selectedPodIds: string[]; centers: Center[]; states: State[]; localGovernments: LocalGovernment[] }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Pod coverage</div>
      <div style={{ ...responsiveGrid(180), gap: 10 }}>
        {pods.map((pod) => (
          <label key={pod.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155' }}>
            <input type="checkbox" name="podIds" value={pod.id} defaultChecked={selectedPodIds.includes(pod.id)} style={{ marginTop: 3 }} />
            <span>
              <strong style={{ display: 'block' }}>{pod.label}</strong>
              <span style={{ color: '#64748b', fontSize: 13 }}>ID: {pod.id} · {podGeographyLabel(pod, centers, states, localGovernments)}</span>
            </span>
          </label>
        ))}
      </div>
      <SectionHint>Pick the actual pod coverage here instead of typing raw IDs and hoping nobody fat-fingers them.</SectionHint>
    </div>
  );
}

function MallamAssignmentSelector({ mallams, selectedMallamId, centers, states, localGovernments }: { mallams: Mallam[]; selectedMallamId?: string | null; centers: Center[]; states: State[]; localGovernments: LocalGovernment[] }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Primary mallam</div>
      <div style={{ ...responsiveGrid(220), gap: 10 }}>
        {mallams.length ? (
          <>
            {mallams.map((mallam) => (
              <label key={mallam.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155' }}>
                <input type="radio" name="mallamId" value={mallam.id} defaultChecked={selectedMallamId === mallam.id} style={{ marginTop: 3 }} />
                <span>
                  <strong style={{ display: 'block' }}>{mallam.displayName || mallam.name}</strong>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{mallam.role || 'Mallam'} · {mallamGeographyLabel(mallam, centers, states, localGovernments)}</span>
                </span>
              </label>
            ))}
          </>
        ) : <div style={{ color: '#64748b', fontSize: 14 }}>No mallams loaded for assignment yet. Create the mallam profile first, then attach the pod.</div>}
      </div>
      <SectionHint>One pod, one primary mallam. Learners and tablets should inherit that ownership, not invent a second truth.</SectionHint>
    </div>
  );
}

export function CreateStudentForm({ cohorts, pods, mallams, centers, states, localGovernments }: { cohorts: Cohort[]; pods: Pod[]; mallams: Mallam[]; centers: Center[]; states: State[]; localGovernments: LocalGovernment[] }) {
  return (
    <form action={createStudentAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Add learner</h2>
      <FieldLabel>Name<input name="name" defaultValue="Safiya" style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Age<input name="age" type="number" min="5" max="18" defaultValue="10" style={inputStyle} /></FieldLabel>
        <FieldLabel>Gender<select name="gender" defaultValue="female" style={inputStyle}><option value="female">Female</option><option value="male">Male</option><option value="unspecified">Unspecified</option></select></FieldLabel>
      </div>
      <StudentGeographySelectors
        cohorts={cohorts}
        pods={pods}
        mallams={mallams}
        centers={centers}
        states={states}
        localGovernments={localGovernments}
      />
      <GeographyHint>
        Geography is explicit now: pick <strong>state → local government → pod</strong> in order. Pod is the operational anchor, and the learner’s mallam now derives from that pod automatically.
      </GeographyHint>
      <div style={twoColumnGrid}>
        <FieldLabel>Level<select name="level" defaultValue="beginner" style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
        <FieldLabel>Stage<input name="stage" defaultValue="foundation-a" style={inputStyle} /></FieldLabel>
      </div>
      <FieldLabel>Guardian<input name="guardianName" defaultValue="Parent contact pending" style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Attendance rate<input name="attendanceRate" type="number" step="0.01" min="0" max="1" defaultValue="0.85" style={inputStyle} /></FieldLabel>
        <FieldLabel>Device access<select name="deviceAccess" defaultValue="shared-tablet" style={inputStyle}><option value="shared-tablet">Shared tablet</option><option value="family-phone">Family phone</option><option value="center-device">Center device</option></select></FieldLabel>
      </div>
      <ActionButton label="Create learner" pendingLabel="Creating learner…" style={buttonStyle} />
    </form>
  );
}

export function UpdateStudentForm({ student, cohorts, pods, mallams, centers, states, localGovernments, title = 'Reassign learner', embedded = false }: { student: Student; cohorts: Cohort[]; pods: Pod[]; mallams: Mallam[]; centers: Center[]; states: State[]; localGovernments: LocalGovernment[]; title?: string; embedded?: boolean }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updateStudentAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="studentId" value={student.id} />
        <h2 style={{ margin: 0 }}>{title}</h2>
        <FieldLabel>Name<input name="name" defaultValue={student.name} style={inputStyle} /></FieldLabel>
        <StudentGeographySelectors
          cohorts={cohorts}
          pods={pods}
          mallams={mallams}
          centers={centers}
          states={states}
          localGovernments={localGovernments}
          initialStateId={student.stateId}
          initialLocalGovernmentId={student.localGovernmentId}
          initialPodId={student.podId}
          initialCohortId={student.cohortId}
          initialMallamId={student.mallamId}
        />
        <GeographyHint>
          State and local government stay visible during learner edits, but pod is still the authoritative assignment. Cohort narrows from that selected pod, and mallam ownership is derived from the pod’s primary mallam so operators do not cross-wire locations.
        </GeographyHint>
        <div style={twoColumnGrid}>
          <FieldLabel>Level<select name="level" defaultValue={student.level} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
          <FieldLabel>Stage<input name="stage" defaultValue={student.stage} style={inputStyle} /></FieldLabel>
        </div>
        <FieldLabel>Guardian<input name="guardianName" defaultValue={student.guardianName ?? ''} style={inputStyle} /></FieldLabel>
        <div style={twoColumnGrid}>
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
      <DeleteConfirmSubmit expectedText={student.name} entityLabel="learner" actionLabel="Delete learner" pendingLabel="Deleting learner…" impactNote="Guardian, attendance, and progress visibility for this learner disappear from the admin roster immediately." />
    </form>
  );
}

export function CreateMallamForm({ centers, pods, states, localGovernments }: { centers: Center[]; pods: Pod[]; states: State[]; localGovernments: LocalGovernment[] }) {
  return (
    <form action={createMallamAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Add mallam</h2>
      <FieldLabel>Name<input name="name" defaultValue="Fatima Ali" style={inputStyle} /></FieldLabel>
      <FieldLabel>Display name<input name="displayName" defaultValue="Mallama Fatima Ali" style={inputStyle} /></FieldLabel>
      <MallamGeographySelectors
        centers={centers}
        pods={pods}
        states={states}
        localGovernments={localGovernments}
        initialCenterId=""
        initialPodIds={[]}
      />
      <GeographyHint>
        Mallam profiles can exist independently, but pod assignment is the operational move. Choose geography first, then attach this mallam to the pod footprint they will actually own or support.
      </GeographyHint>
      <FieldLabel>Languages<input name="languages" defaultValue="Hausa, English" style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Role<select name="role" defaultValue="mallam-lead" style={inputStyle}><option value="mallam-lead">Mallam lead</option><option value="facilitator">Facilitator</option><option value="coach">Coach</option></select></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="active" style={inputStyle}><option value="active">Active</option><option value="training">Training</option><option value="leave">Leave</option></select></FieldLabel>
      </div>
      <div style={twoColumnGrid}>
        <FieldLabel>Learner load<input name="learnerCount" type="number" defaultValue="18" style={inputStyle} /></FieldLabel>
        <FieldLabel>Certification<input name="certificationLevel" defaultValue="Level 1" style={inputStyle} /></FieldLabel>
      </div>
      <ActionButton label="Create mallam" pendingLabel="Creating mallam…" style={buttonStyle} />
    </form>
  );
}

export function UpdateMallamForm({ mallam, centers, pods, states, localGovernments, embedded = false }: { mallam: Mallam; centers: Center[]; pods: Pod[]; states: State[]; localGovernments: LocalGovernment[]; embedded?: boolean }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updateMallamAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="mallamId" value={mallam.id} />
        <h2 style={{ margin: 0 }}>Update mallam</h2>
        <FieldLabel>Name<input name="name" defaultValue={mallam.name} style={inputStyle} /></FieldLabel>
        <FieldLabel>Display name<input name="displayName" defaultValue={mallam.displayName} style={inputStyle} /></FieldLabel>
        <MallamGeographySelectors
          centers={centers}
          pods={pods}
          states={states}
          localGovernments={localGovernments}
          initialCenterId={mallam.centerId}
          initialPodIds={mallam.podIds ?? []}
        />
        <GeographyHint>
          Keep the mallam anchored to a real state and local government first, then choose the pods within that geography. Pod ownership is the real operational truth; this profile should reflect it, not fight it.
        </GeographyHint>
        <FieldLabel>Languages<input name="languages" defaultValue={(mallam.languages ?? []).join(', ')} style={inputStyle} /></FieldLabel>
        <div style={twoColumnGrid}>
          <FieldLabel>Role<select name="role" defaultValue={mallam.role} style={inputStyle}><option value="mallam-lead">Mallam lead</option><option value="facilitator">Facilitator</option><option value="coach">Coach</option></select></FieldLabel>
          <FieldLabel>Status<select name="status" defaultValue={mallam.status} style={inputStyle}><option value="active">Active</option><option value="training">Training</option><option value="leave">Leave</option></select></FieldLabel>
        </div>
        <div style={twoColumnGrid}>
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

export function CreatePodForm({ centers, mallams, states, localGovernments }: { centers: Center[]; mallams: Mallam[]; states: State[]; localGovernments: LocalGovernment[] }) {
  return (
    <form action={createPodAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value="/pods" />
      <h2 style={{ margin: 0 }}>Add pod</h2>
      <SectionHint>
        Pods are the operational anchor now. Pick the geography first, assign the one required primary mallam, then enter the short pod name and we will generate the final label in the required <strong>state-LG-Pod_name</strong> format.
      </SectionHint>
      <PodGeographySelectors
        centers={centers}
        states={states}
        localGovernments={localGovernments}
        initialCenterId={centers[0]?.id}
        showCenter={false}
      />
      <GeographyHint>
        Center is now derived from the selected geography or assigned mallam coverage. Operators should not have to babysit a redundant center picker just to create a pod.
      </GeographyHint>
      <MallamAssignmentSelector mallams={mallams} selectedMallamId={null} centers={centers} states={states} localGovernments={localGovernments} />
      <SectionHint>Every pod must leave this form with one primary mallam. If the person does not exist yet, create the mallam profile first, then come back and open the pod.</SectionHint>
      <div style={twoColumnGrid}>
        <FieldLabel>Type<select name="type" defaultValue="community-pod" style={inputStyle}><option value="community-pod">Community pod</option><option value="solar-container">Solar container</option><option value="classroom-kit">Classroom kit</option></select></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="active" style={inputStyle}><option value="active">Active</option><option value="pilot">Pilot</option><option value="inactive">Inactive</option></select></FieldLabel>
      </div>
      <div style={threeColumnGrid}>
        <FieldLabel>Capacity<input name="capacity" type="number" min="1" defaultValue="30" style={inputStyle} /></FieldLabel>
        <FieldLabel>Current learners<input name="learnersActive" type="number" min="0" defaultValue="0" style={inputStyle} /></FieldLabel>
        <FieldLabel>Connectivity<select name="connectivity" defaultValue="offline-first" style={inputStyle}><option value="offline-first">Offline first</option><option value="sync-daily">Sync daily</option><option value="always-online">Always online</option></select></FieldLabel>
      </div>
      <ActionButton label="Create pod" pendingLabel="Creating pod…" style={buttonStyle} />
    </form>
  );
}

export function UpdatePodForm({ pod, centers, mallams, states, localGovernments, embedded = false, returnPath = '/pods' }: { pod: Pod; centers: Center[]; mallams: Mallam[]; states: State[]; localGovernments: LocalGovernment[]; embedded?: boolean; returnPath?: string }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updatePodAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="podId" value={pod.id} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <h2 style={{ margin: 0 }}>Update pod</h2>
        <SectionHint>Pods are operational records now. Edit the geography, label source, and required single primary mallam here instead of faking pod edits through device assignment.</SectionHint>
        <PodGeographySelectors centers={centers} states={states} localGovernments={localGovernments} initialCenterId={pod.centerId} initialStateId={pod.stateId} initialLocalGovernmentId={pod.localGovernmentId} initialLabel={pod.label} initialPodName={pod.label.split('-').slice(2).join('-') || pod.label} showCenter={false} />
        <MallamAssignmentSelector mallams={mallams} selectedMallamId={pod.mallamIds?.[0] ?? null} centers={centers} states={states} localGovernments={localGovernments} />
        <div style={twoColumnGrid}>
          <FieldLabel>Type<select name="type" defaultValue={pod.type} style={inputStyle}><option value="community-pod">Community pod</option><option value="solar-container">Solar container</option><option value="classroom-kit">Classroom kit</option></select></FieldLabel>
          <FieldLabel>Status<select name="status" defaultValue={pod.status} style={inputStyle}><option value="active">Active</option><option value="pilot">Pilot</option><option value="inactive">Inactive</option></select></FieldLabel>
        </div>
        <div style={threeColumnGrid}>
          <FieldLabel>Capacity<input name="capacity" type="number" min="1" defaultValue={String(pod.capacity ?? 0)} style={inputStyle} /></FieldLabel>
          <FieldLabel>Current learners<input name="learnersActive" type="number" min="0" defaultValue={String(pod.learnersActive ?? 0)} style={inputStyle} /></FieldLabel>
          <FieldLabel>Connectivity<select name="connectivity" defaultValue={pod.connectivity || 'offline-first'} style={inputStyle}><option value="offline-first">Offline first</option><option value="sync-daily">Sync daily</option><option value="always-online">Always online</option></select></FieldLabel>
        </div>
        <ActionButton label="Save pod changes" pendingLabel="Saving pod…" style={buttonStyle} />
      </form>
    </div>
  );
}

export function DeletePodForm({ pod, embedded = false, returnPath = '/pods' }: { pod: Pod; embedded?: boolean; returnPath?: string }) {
  return (
    <form action={deletePodAction} style={embedded ? embeddedCardStyle : cardStyle}>
      <input type="hidden" name="podId" value={pod.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Delete pod</h2>
        <div style={{ color: '#475569', lineHeight: 1.6 }}>
          Remove <strong>{pod.label}</strong> from the pod registry? This is guarded: if tablets, learners, mallams, or cohorts still point at the pod, the delete will fail loudly instead of wrecking the dataset.
        </div>
      </div>
      <DeleteConfirmSubmit expectedText={pod.label} entityLabel="pod" actionLabel="Delete pod" pendingLabel="Deleting pod…" impactNote="Only clean, detached pods can be deleted. Reassign dependencies first if the API blocks this." />
    </form>
  );
}

export function CreateDeviceRegistrationForm({ pods, returnPath = '/devices' }: { pods: Pod[]; returnPath?: string }) {
  return (
    <form action={createDeviceRegistrationAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath} />
      <h2 style={{ margin: 0 }}>Register tablet</h2>
      <SectionHint>Select the pod first, then give the tablet a device identifier. Geography and mallam context derive from the selected pod, so this form intentionally avoids duplicate location fields.</SectionHint>
      <div style={responsiveGrid(220)}>
        <FieldLabel>Pod<select name="podId" defaultValue="" style={inputStyle} required><option value="">Select pod</option>{pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}</select></FieldLabel>
        <FieldLabel>Device identifier<input name="deviceIdentifier" placeholder="tablet_01" style={inputStyle} required /></FieldLabel>
      </div>
      <div style={responsiveGrid(220)}>
        <FieldLabel>Serial number<input name="serialNumber" defaultValue="" style={inputStyle} /></FieldLabel>
        <FieldLabel>Platform<select name="platform" defaultValue="android" style={inputStyle}><option value="android">Android</option><option value="ios">iPadOS</option><option value="web">Web kiosk</option></select></FieldLabel>
        <FieldLabel>App version<input name="appVersion" defaultValue="0.1.0" style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="active" style={inputStyle}><option value="active">Active</option><option value="inactive">Inactive</option><option value="repair">Repair</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <button type="submit" style={buttonStyle}>Register tablet</button>
    </form>
  );
}

export function DeleteDeviceRegistrationForm({ registrationId, deviceIdentifier, embedded = false, returnPath = '/devices' }: { registrationId: string; deviceIdentifier: string; embedded?: boolean; returnPath?: string }) {
  return (
    <form action={deleteDeviceRegistrationAction} style={embedded ? embeddedCardStyle : cardStyle}>
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Remove tablet</h2>
        <div style={{ color: '#475569', lineHeight: 1.6 }}>Remove <strong>{deviceIdentifier}</strong> from the device registry? This clears the admin record so the tablet can be re-enrolled cleanly later if needed.</div>
      </div>
      <DeleteConfirmSubmit expectedText={deviceIdentifier} entityLabel="tablet registration" actionLabel="Remove tablet" pendingLabel="Removing tablet…" impactNote="This removes the current registration record from the admin surface." />
    </form>
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
      <DeleteConfirmSubmit expectedText={mallam.displayName} entityLabel="mallam profile" actionLabel="Delete mallam" pendingLabel="Deleting mallam…" impactNote="Roster ownership and deployment visibility for this mallam will drop out of admin immediately." />
    </form>
  );
}

export function CreateSubjectForm({ returnPath }: { returnPath?: string }) {
  return (
    <form action={createSubjectAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Create subject</h2>
      <SectionHint>Create the subject lane first, and optionally seed its first strand so the module flow is immediately usable.</SectionHint>
      <LifecycleStatusField name="status" value="draft" options={[...SUBJECT_STRAND_LIFECYCLE_OPTIONS]} entityLabel="subject lane" />
      <FieldLabel>Subject ID<input name="id" defaultValue="science" style={inputStyle} /></FieldLabel>
      <FieldLabel>Subject name<input name="name" defaultValue="Foundational Science" style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Icon<input name="icon" defaultValue="biotech" style={inputStyle} /></FieldLabel>
        <FieldLabel>Order<input name="order" type="number" min="1" defaultValue="4" style={inputStyle} /></FieldLabel>
      </div>
      <FieldLabel>Initial strand name<input name="initialStrandName" defaultValue="Observation & Discovery" style={inputStyle} /></FieldLabel>
      <ActionButton label="Create subject" pendingLabel="Creating subject…" style={buttonStyle} />
    </form>
  );
}

export function UpdateSubjectForm({ subject, embedded = false, returnPath }: { subject: Subject; embedded?: boolean; returnPath?: string }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updateSubjectAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="subjectId" value={subject.id} />
        <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
        <h2 style={{ margin: 0 }}>Update subject</h2>
        <SectionHint>Move the subject lane between draft and published here instead of pretending the release state only lives on modules.</SectionHint>
        <LifecycleStatusField name="status" value={subject.status ?? 'draft'} options={[...SUBJECT_STRAND_LIFECYCLE_OPTIONS]} entityLabel="subject lane" />
        <FieldLabel>Subject name<input name="name" defaultValue={subject.name} style={inputStyle} /></FieldLabel>
        <div style={twoColumnGrid}>
          <FieldLabel>Icon<input name="icon" defaultValue={subject.icon ?? ''} style={inputStyle} /></FieldLabel>
          <FieldLabel>Order<input name="order" type="number" min="1" defaultValue={String(subject.order ?? 1)} style={inputStyle} /></FieldLabel>
        </div>
        <ActionButton label="Save subject changes" pendingLabel="Saving subject…" style={buttonStyle} />
      </form>
    </div>
  );
}

export function DeleteSubjectForm({ subject, embedded = false, returnPath }: { subject: Subject; embedded?: boolean; returnPath?: string }) {
  return (
    <form action={deleteSubjectAction} style={embedded ? embeddedCardStyle : cardStyle}>
      <input type="hidden" name="subjectId" value={subject.id} />
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Delete subject</h2>
        <div style={{ color: '#475569', lineHeight: 1.6 }}>
          Remove <strong>{subject.name}</strong> from the content library? This also clears linked strands, modules, lessons, assessments, and related progress references.
        </div>
      </div>
      <DeleteConfirmSubmit expectedText={subject.name} entityLabel="subject" actionLabel="Delete subject" pendingLabel="Deleting subject…" impactNote="This is a cascading delete. If you blow away a subject, its whole lane goes with it." />
    </form>
  );
}

export function CreateStrandForm({ subjects, initialSubjectId, initialName, initialOrder, returnPath }: { subjects: Subject[]; initialSubjectId?: string; initialName?: string; initialOrder?: number; returnPath?: string }) {
  return (
    <form action={createStrandAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Create strand</h2>
      <SectionHint>Give each subject a real planning lane before you start dumping modules into it.</SectionHint>
      <FieldLabel>Subject<select name="subjectId" defaultValue={initialSubjectId ?? subjects[0]?.id} style={inputStyle}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></FieldLabel>
      <FieldLabel>Strand name<input name="name" defaultValue={initialName ?? 'Speaking & Listening'} style={inputStyle} /></FieldLabel>
      <input type="hidden" name="status" value="draft" />
      <FieldLabel>Order<input name="order" type="number" min="1" defaultValue={String(initialOrder ?? 2)} style={inputStyle} /></FieldLabel>
      <ActionButton label="Create strand" pendingLabel="Creating strand…" style={buttonStyle} />
    </form>
  );
}

export function UpdateStrandForm({ strand, subjects, embedded = false, returnPath }: { strand: Strand; subjects: Subject[]; embedded?: boolean; returnPath?: string }) {
  return (
    <div style={embedded ? embeddedCardStyle : cardStyle}>
      <form action={updateStrandAction} style={{ display: 'grid', gap: 12 }}>
        <input type="hidden" name="strandId" value={strand.id} />
        <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
        <h2 style={{ margin: 0 }}>Update strand</h2>
        <FieldLabel>Subject<select name="subjectId" defaultValue={strand.subjectId} style={inputStyle}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></FieldLabel>
        <input type="hidden" name="status" value={strand.status ?? 'draft'} />
        <SectionHint>Strands stay structural here: name and ordering are editable, but lifecycle state is intentionally not part of the operator-facing workflow.</SectionHint>
        <FieldLabel>Strand name<input name="name" defaultValue={strand.name} style={inputStyle} /></FieldLabel>
        <FieldLabel>Order<input name="order" type="number" min="1" defaultValue={String(strand.order ?? 1)} style={inputStyle} /></FieldLabel>
        <ActionButton label="Save strand changes" pendingLabel="Saving strand…" style={buttonStyle} />
      </form>
    </div>
  );
}

export function DeleteStrandForm({ strand, embedded = false, returnPath }: { strand: Strand; embedded?: boolean; returnPath?: string }) {
  return (
    <form action={deleteStrandAction} style={embedded ? embeddedCardStyle : cardStyle}>
      <input type="hidden" name="strandId" value={strand.id} />
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <div style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Delete strand</h2>
        <div style={{ color: '#475569', lineHeight: 1.6 }}>
          Remove <strong>{strand.name}</strong> from the content library? Its modules, lessons, assessment gates, and linked release wiring go with it.
        </div>
      </div>
      <DeleteConfirmSubmit expectedText={strand.name} entityLabel="strand" actionLabel="Delete strand" pendingLabel="Deleting strand…" impactNote="This is another cascade. Delete a strand and you delete its whole planning lane." />
    </form>
  );
}

export function CreateModuleForm({ strands, initialStrandId, initialTitle, initialLevel, initialLessonCount, initialOrder, initialStatus, returnPath }: { strands: Strand[]; initialStrandId?: string; initialTitle?: string; initialLevel?: string; initialLessonCount?: number; initialOrder?: number; initialStatus?: string; returnPath?: string }) {
  const defaultStrand = strands.find((strand) => strand.id === initialStrandId) ?? strands[0];

  return (
    <form action={createModuleAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Create module</h2>
      <SectionHint>Build a real content lane by selecting the exact strand first, not some hardcoded fake default.</SectionHint>
      <FieldLabel>Strand<select name="strandId" defaultValue={defaultStrand?.id} style={inputStyle}>{strands.map((strand) => <option key={strand.id} value={strand.id}>{strand.subjectName} • {strand.name}</option>)}</select></FieldLabel>
      <FieldLabel>Title<input name="title" defaultValue={initialTitle ?? 'Community Helpers'} style={inputStyle} /></FieldLabel>
      <div style={threeColumnGrid}>
        <FieldLabel>Level<select name="level" defaultValue={initialLevel ?? 'beginner'} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
        <FieldLabel>Lesson count<input name="lessonCount" type="number" min="1" defaultValue={String(initialLessonCount ?? 6)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Order<input name="order" type="number" min="1" defaultValue={String(initialOrder ?? 3)} style={inputStyle} /></FieldLabel>
      </div>
      <FieldLabel>Status<select name="status" defaultValue={initialStatus ?? 'draft'} style={inputStyle}><option value="draft">Draft</option><option value="review">In review</option><option value="approved">Approved</option><option value="published">Published</option><option value="active">Active</option></select></FieldLabel>
      <ActionButton label="Create module" pendingLabel="Creating module…" style={buttonStyle} />
    </form>
  );
}

export function UpdateModuleForm({ modules, returnPath }: { modules: CurriculumModule[]; returnPath?: string }) {
  const module = modules[0];

  return (
    <form action={updateModuleAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Update module</h2>
      <SectionHint>Pick the exact module to edit. No more “first row wins” nonsense.</SectionHint>
      <FieldLabel>Module<select name="moduleId" defaultValue={module?.id ?? ''} style={inputStyle}>{modules.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.strandName} • {item.title}</option>)}</select></FieldLabel>
      <FieldLabel>Title<input name="title" defaultValue={module?.title ?? ''} style={inputStyle} /></FieldLabel>
      <LifecycleStatusField name="status" value={module?.status ?? 'draft'} options={[...MODULE_LESSON_LIFECYCLE_OPTIONS]} entityLabel="module" />
      <div style={twoColumnGrid}>
        <FieldLabel>Lesson count<input name="lessonCount" type="number" min="1" defaultValue={String(module?.lessonCount ?? 1)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Level<select name="level" defaultValue={module?.level ?? 'beginner'} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
      </div>
      <ActionButton label="Save module changes" pendingLabel="Saving module…" style={buttonStyle} />
    </form>
  );
}

export function DeleteModuleForm({ modules, returnPath }: { modules: CurriculumModule[]; returnPath?: string }) {
  const module = modules[0];

  return (
    <form action={deleteModuleAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Delete module</h2>
      <SectionHint>This removes the module and its linked lessons, assessments, assignments, and progress references from the current curriculum dataset.</SectionHint>
      <FieldLabel>Module<select name="moduleId" defaultValue={module?.id ?? ''} style={inputStyle}>{modules.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.strandName} • {item.title}</option>)}</select></FieldLabel>
      <ActionButton label="Delete module" pendingLabel="Deleting module…" style={{ ...buttonStyle, background: '#dc2626' }} />
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
      <div style={threeColumnGrid}>
        <FieldLabel>Duration (min)<input name="durationMinutes" type="number" min="1" defaultValue="8" style={inputStyle} /></FieldLabel>
        <FieldLabel>Mode<select name="mode" defaultValue="guided" style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option><option value="practice">Practice</option></select></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="draft" style={inputStyle}><option value="draft">Draft</option><option value="review">In review</option><option value="approved">Approved</option><option value="published">Published</option></select></FieldLabel>
      </div>
      <ActionButton label="Create lesson" pendingLabel="Creating lesson…" style={buttonStyle} />
    </form>
  );
}

export function UpdateLessonForm({ lessons, returnPath }: { lessons: Lesson[]; returnPath?: string }) {
  const lesson = lessons[0];

  return (
    <form action={updateLessonAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Update lesson</h2>
      <SectionHint>Pick the exact lesson to move through draft, review, approved, or published states.</SectionHint>
      <FieldLabel>Lesson<select name="lessonId" defaultValue={lesson?.id ?? ''} style={inputStyle}>{lessons.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      <LifecycleStatusField name="status" value={lesson?.status ?? 'draft'} options={MODULE_LESSON_LIFECYCLE_OPTIONS.filter((option) => option.value !== 'active')} entityLabel="lesson" />
      <div style={twoColumnGrid}>
        <FieldLabel>Mode<select name="mode" defaultValue={lesson?.mode ?? 'guided'} style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option><option value="practice">Practice</option></select></FieldLabel>
        <FieldLabel>Duration (min)<input name="durationMinutes" type="number" min="1" defaultValue={String(lesson?.durationMinutes ?? 8)} style={inputStyle} /></FieldLabel>
      </div>
      <ActionButton label="Save lesson changes" pendingLabel="Saving lesson…" style={buttonStyle} />
    </form>
  );
}

export function DeleteLessonForm({ lessons, returnPath }: { lessons: Lesson[]; returnPath?: string }) {
  const lesson = lessons[0];

  return (
    <form action={deleteLessonAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Delete lesson</h2>
      <SectionHint>This removes the lesson and clears linked assignments so the content board stays honest.</SectionHint>
      <FieldLabel>Lesson<select name="lessonId" defaultValue={lesson?.id ?? ''} style={inputStyle}>{lessons.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      <ActionButton label="Delete lesson" pendingLabel="Deleting lesson…" style={{ ...buttonStyle, background: '#dc2626' }} />
    </form>
  );
}

export function CreateAssessmentForm({ modules, subjects, returnPath }: { modules: CurriculumModule[]; subjects: Subject[]; returnPath?: string }) {
  return <CreateAssessmentFormClient modules={modules} subjects={subjects} returnPath={returnPath} />;
}

export function UpdateAssessmentForm({ assessments, returnPath }: { assessments: Assessment[]; returnPath?: string }) {
  const assessment = assessments[0];

  return (
    <form action={updateAssessmentAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Update assessment gate</h2>
      <SectionHint>Target the exact assessment gate instead of silently editing the first one in the list.</SectionHint>
      <FieldLabel>Assessment<select name="assessmentId" defaultValue={assessment?.id ?? ''} style={inputStyle}>{assessments.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      <FieldLabel>Assessment title<input name="title" defaultValue={assessment?.title ?? ''} style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Kind<select name="kind" defaultValue={assessment?.kind ?? 'automatic'} style={inputStyle}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></FieldLabel>
        <FieldLabel>Trigger<select name="trigger" defaultValue={assessment?.trigger ?? 'module-complete'} style={inputStyle}><option value="module-complete">After module complete</option><option value="lesson-cluster">After lesson cluster</option><option value="mallam-review">Mallam review</option></select></FieldLabel>
      </div>
      <FieldLabel>Trigger label<input name="triggerLabel" defaultValue={assessment?.triggerLabel ?? ''} style={inputStyle} /></FieldLabel>
      <div style={threeColumnGrid}>
        <FieldLabel>Progression gate<input name="progressionGate" defaultValue={assessment?.progressionGate ?? ''} style={inputStyle} /></FieldLabel>
        <FieldLabel>Passing score<input name="passingScore" type="number" min="0" max="1" step="0.01" defaultValue={String(assessment?.passingScore ?? 0.7)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue={assessment?.status ?? 'draft'} style={inputStyle}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <ActionButton label="Save assessment changes" pendingLabel="Saving assessment…" style={buttonStyle} />
    </form>
  );
}

export function DeleteAssessmentForm({ assessments, returnPath }: { assessments: Assessment[]; returnPath?: string }) {
  const assessment = assessments[0];

  return (
    <form action={deleteAssessmentAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Delete assessment gate</h2>
      <SectionHint>This removes the assessment gate and detaches it from any scheduled assignments.</SectionHint>
      <FieldLabel>Assessment<select name="assessmentId" defaultValue={assessment?.id ?? ''} style={inputStyle}>{assessments.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      <ActionButton label="Delete assessment" pendingLabel="Deleting assessment…" style={{ ...buttonStyle, background: '#dc2626' }} />
    </form>
  );
}
