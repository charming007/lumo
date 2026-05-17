'use client';

import { useEffect, useMemo, useState } from 'react';
import { createAssessmentAction } from '../app/actions';
import { filterModulesForSubject, findSubjectByContext } from '../lib/module-subject-match';
import type { CurriculumModule, Subject } from '../lib/types';
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

const threeColumnGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: 12,
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

export function CreateAssessmentFormClient({ modules, subjects, returnPath }: { modules: CurriculumModule[]; subjects: Subject[]; returnPath?: string }) {
  const defaultModule = modules[0] ?? null;
  const defaultSubject = findSubjectByContext(subjects, {
    subjectId: defaultModule?.subjectId,
    subjectName: defaultModule?.subjectName,
  }) ?? subjects[0] ?? null;
  const [subjectId, setSubjectId] = useState(defaultSubject?.id ?? '');
  const activeSubject = useMemo(
    () => findSubjectByContext(subjects, { subjectId }) ?? defaultSubject ?? null,
    [defaultSubject, subjectId, subjects],
  );

  const filteredModules = useMemo(
    () => filterModulesForSubject(modules, activeSubject),
    [activeSubject, modules],
  );

  const [moduleId, setModuleId] = useState(() => {
    if (defaultModule && filteredModules.some((module) => module.id === defaultModule.id)) {
      return defaultModule.id;
    }
    return filteredModules[0]?.id ?? '';
  });

  useEffect(() => {
    if (!filteredModules.length) {
      setModuleId('');
      return;
    }

    if (!filteredModules.some((module) => module.id === moduleId)) {
      setModuleId(filteredModules[0]?.id ?? '');
    }
  }, [filteredModules, moduleId]);

  const selectedModule = filteredModules.find((module) => module.id === moduleId) ?? filteredModules[0] ?? null;

  return (
    <form action={createAssessmentAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Create assessment gate</h2>
      <FieldLabel>
        Subject
        <select name="subjectId" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} style={inputStyle}>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </FieldLabel>
      <FieldLabel>
        Module
        <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle} disabled={!filteredModules.length}>
          {filteredModules.length
            ? filteredModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)
            : <option value="">No modules available for this subject</option>}
        </select>
      </FieldLabel>
      {selectedModule ? (
        <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', lineHeight: 1.6 }}>
          Gate will attach to <strong style={{ color: '#0f172a' }}>{selectedModule.title}</strong> in {selectedModule.subjectName ?? 'the selected subject'}.
        </div>
      ) : (
        <div style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6 }}>
          This subject has no modules yet, so there is nothing valid to gate. Create the module first instead of shipping a fake assessment row.
        </div>
      )}
      <FieldLabel>Assessment title<input name="title" defaultValue="Bridge readiness checkpoint" style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Kind<select name="kind" defaultValue="automatic" style={inputStyle}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></FieldLabel>
        <FieldLabel>Trigger<select name="trigger" defaultValue="module-complete" style={inputStyle}><option value="module-complete">After module complete</option><option value="lesson-cluster">After lesson cluster</option><option value="mallam-review">Mallam review</option></select></FieldLabel>
      </div>
      <FieldLabel>Trigger label<input name="triggerLabel" defaultValue={`After ${selectedModule?.title ?? 'selected module'}`} style={inputStyle} key={selectedModule?.id ?? 'no-module'} /></FieldLabel>
      <div style={threeColumnGrid}>
        <FieldLabel>Progression gate<input name="progressionGate" defaultValue="bridge" style={inputStyle} /></FieldLabel>
        <FieldLabel>Passing score<input name="passingScore" type="number" min="0" max="1" step="0.01" defaultValue="0.7" style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="draft" style={inputStyle}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <ActionButton label="Create assessment" pendingLabel="Creating assessment…" style={buttonStyle} disabled={!selectedModule} />
    </form>
  );
}
