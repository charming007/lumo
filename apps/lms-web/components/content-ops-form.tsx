'use client';

import { useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import { filterModulesForSubject, findSubjectByContext } from '../lib/module-subject-match';
import type { CurriculumModule, Subject } from '../lib/types';

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
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

export function DynamicLessonCreateForm({
  modules,
  subjects,
  action,
  returnPath = '/content',
}: {
  modules: CurriculumModule[];
  subjects: Subject[];
  action: (formData: FormData) => void;
  returnPath?: string;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 'english');
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');

  const activeSubject = useMemo(() => findSubjectByContext(subjects, { subjectId }) ?? subjects[0] ?? null, [subjectId, subjects]);
  const filteredModules = useMemo(() => filterModulesForSubject(modules, activeSubject), [activeSubject, modules]);

  const activeModule = filteredModules.find((item) => item.id === moduleId) ?? filteredModules[0];
  const dependencyBlockers = [
    subjects.length > 0 ? null : 'Create or reload a subject before creating a lesson.',
    subjectId ? null : 'Pick a subject before creating a lesson.',
    filteredModules.length > 0 ? null : 'Create or reload a module in this subject before creating a lesson.',
    moduleId && activeModule ? null : 'Pick a valid module before creating a lesson.',
  ].filter(Boolean) as string[];

  return (
    <form action={action} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="openEditorAfterCreate" value="1" />
      <h2 style={{ margin: 0 }}>Create lesson shell</h2>
      <div style={{ color: '#64748b', lineHeight: 1.5 }}>Choose a subject first, then the form narrows modules and shows deployment metadata so content ops can sanity-check what they are publishing. This compact flow creates the lesson shell, then drops you straight into the full typed editor instead of leaving you in a dead-end stub.</div>
      <FieldLabel>
        Subject
        <select name="subjectId" value={subjectId} onChange={(event) => {
          const next = event.target.value;
          setSubjectId(next);
          const nextSubject = findSubjectByContext(subjects, { subjectId: next }) ?? null;
          const nextModules = filterModulesForSubject(modules, nextSubject);
          setModuleId(nextModules[0]?.id ?? '');
        }} style={inputStyle}>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </FieldLabel>
      <FieldLabel>
        Module
        <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle} disabled={!filteredModules.length}>
          {filteredModules.length ? filteredModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>) : <option value="">No modules available for this subject</option>}
        </select>
      </FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0' }}><strong>{activeSubject?.name ?? '—'}</strong><div style={{ color: '#64748b', marginTop: 4 }}>Learning lane</div></div>
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0' }}><strong>{activeModule?.level ?? '—'}</strong><div style={{ color: '#64748b', marginTop: 4 }}>Target level</div></div>
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0' }}><strong>{activeModule?.status ?? '—'}</strong><div style={{ color: '#64748b', marginTop: 4 }}>Module state</div></div>
      </div>
      {dependencyBlockers.length ? (
        <div style={{ padding: 14, borderRadius: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', lineHeight: 1.6, display: 'grid', gap: 8 }}>
          {dependencyBlockers.map((blocker) => <div key={blocker}>{blocker}</div>)}
        </div>
      ) : null}
      <FieldLabel>Title<input name="title" defaultValue="Who helps in our community?" style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Duration (min)<input name="durationMinutes" type="number" min="1" defaultValue="8" style={inputStyle} /></FieldLabel>
        <FieldLabel>Mode<select name="mode" defaultValue="guided" style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option></select></FieldLabel>
        <FieldLabel>Status<select name="status" defaultValue="draft" style={inputStyle}><option value="draft">Draft</option><option value="approved">Approved</option><option value="published">Published</option></select></FieldLabel>
      </div>
      <ActionButton label={dependencyBlockers.length ? 'Load subject and module data first' : 'Create lesson'} pendingLabel="Creating lesson…" style={buttonStyle} disabled={dependencyBlockers.length > 0} />
    </form>
  );
}
