'use client';

import { useMemo, useState } from 'react';

import { updateAssignmentAction } from '../app/actions';
import type { Assignment, Cohort, Mallam } from '../lib/types';
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

const twoColumnGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: 12,
} as const;

function fieldLabelStyle() {
  return { display: 'grid', gap: 6, color: '#475569', fontSize: 14 } as const;
}

export function ReassignAssignmentForm({ assignments, cohorts, mallams }: { assignments: Assignment[]; cohorts: Cohort[]; mallams: Mallam[] }) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments[0]?.id ?? '');

  const assignment = useMemo(
    () => assignments.find((item) => item.id === selectedAssignmentId) ?? assignments[0],
    [assignments, selectedAssignmentId],
  );

  if (!assignment) return null;

  const selectedCohortId = cohorts.find((item) => item.name === assignment.cohortName)?.id ?? cohorts[0]?.id ?? '';
  const selectedMallamId = mallams.find((item) => item.displayName === assignment.teacherName)?.id ?? mallams[0]?.id ?? '';

  return (
    <form action={updateAssignmentAction} style={cardStyle}>
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <h2 style={{ margin: 0 }}>Reassign live assignment</h2>
      <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
        Pick the exact delivery window you want to move. This fixes the old hard-coded-first-row trap and lets ops rebalance any live assignment from the current board.
      </div>
      <label style={fieldLabelStyle()}>
        Assignment to update
        <select
          value={assignment.id}
          onChange={(event) => setSelectedAssignmentId(event.target.value)}
          style={inputStyle}
        >
          {assignments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.lessonTitle} • {item.cohortName} • {item.teacherName} • {item.dueDate}
            </option>
          ))}
        </select>
      </label>
      <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
        <strong>{assignment.lessonTitle}</strong> is currently mapped to {assignment.cohortName} with {assignment.teacherName}.
      </div>
      <label style={fieldLabelStyle()}>
        Target cohort
        <select name="cohortId" key={`${assignment.id}-cohort`} defaultValue={selectedCohortId} style={inputStyle}>
          {cohorts.map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.name}
            </option>
          ))}
        </select>
      </label>
      <label style={fieldLabelStyle()}>
        Assign to mallam
        <select name="assignedBy" key={`${assignment.id}-mallam`} defaultValue={selectedMallamId} style={inputStyle}>
          {mallams.map((mallam) => (
            <option key={mallam.id} value={mallam.id}>
              {mallam.displayName}
            </option>
          ))}
        </select>
      </label>
      <div style={twoColumnGrid}>
        <label style={fieldLabelStyle()}>
          Due date
          <input name="dueDate" key={`${assignment.id}-due`} defaultValue={assignment.dueDate} style={inputStyle} />
        </label>
        <label style={fieldLabelStyle()}>
          Status
          <select name="status" key={`${assignment.id}-status`} defaultValue={assignment.status} style={inputStyle}>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>
      <ActionButton label="Update assignment" pendingLabel="Updating assignment…" style={buttonStyle} />
    </form>
  );
}
