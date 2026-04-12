'use client';

import { useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import type { Assessment, CurriculumModule, Subject } from '../lib/types';
import { buildEnglishActivities, buildEnglishObjective, buildReadinessChecks, inferVocabulary } from '../lib/english-curriculum';

const cardStyle = {
  background: 'white',
  borderRadius: 20,
  padding: 24,
  display: 'grid',
  gap: 14,
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
  background: '#4F46E5',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

export function EnglishStudioAuthoringForm({
  subjects,
  modules,
  assessments,
  action,
}: {
  subjects: Subject[];
  modules: CurriculumModule[];
  assessments: Assessment[];
  action: (formData: FormData) => void;
}) {
  const englishSubject = subjects.find((subject) => subject.name.toLowerCase().includes('english')) ?? subjects[0];
  const englishModules = modules.filter((module) => module.subjectId === englishSubject?.id || module.subjectName?.toLowerCase().includes('english'));
  const [moduleId, setModuleId] = useState(englishModules[0]?.id ?? '');
  const [title, setTitle] = useState('Talk about people who help us');
  const [durationMinutes, setDurationMinutes] = useState('12');
  const [mode, setMode] = useState('guided');
  const [status, setStatus] = useState('draft');

  const activeModule = englishModules.find((module) => module.id === moduleId) ?? englishModules[0];
  const activeAssessment = assessments.find((assessment) => assessment.moduleId === activeModule?.id || assessment.moduleTitle === activeModule?.title) ?? null;
  const objective = buildEnglishObjective(title);
  const vocabulary = inferVocabulary(title);
  const activities = buildEnglishActivities({
    title,
    durationMinutes: Number(durationMinutes) || 8,
    mode,
    assessmentTitle: activeAssessment?.title ?? null,
  });
  const readiness = buildReadinessChecks({
    status,
    moduleStatus: activeModule?.status,
    hasAssessment: Boolean(activeAssessment),
    lessonTitle: title,
    durationMinutes: Number(durationMinutes) || 0,
  });
  const recommendedStatus = readiness.readinessScore >= 5 ? 'published' : readiness.readinessScore >= 4 ? 'approved' : readiness.readinessScore >= 3 ? 'review' : 'draft';

  const readinessTone = useMemo(() => {
    if (readiness.readinessScore >= 5) return { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' };
    if (readiness.readinessScore >= 3) return { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' };
    return { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' };
  }, [readiness.readinessScore]);

  return (
    <form action={action} style={cardStyle}>
      <input type="hidden" name="subjectId" value={englishSubject?.id ?? ''} />
      <input type="hidden" name="returnPath" value="/english" />
      <h2 style={{ margin: 0 }}>Author English lesson</h2>
      <div style={{ color: '#64748b', lineHeight: 1.6 }}>This is the missing piece: author against a real activity spine, see the readiness signals before publish, then create the lesson without pretending a title-only form is curriculum design.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.8fr 0.8fr', gap: 12 }}>
        <FieldLabel>
          English module
          <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle}>
            {englishModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel>
          Lesson title
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Duration
          <input name="durationMinutes" type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Delivery mode
          <select name="mode" value={mode} onChange={(event) => setMode(event.target.value)} style={inputStyle}>
            <option value="guided">Guided</option>
            <option value="group">Group</option>
            <option value="independent">Independent</option>
            <option value="practice">Practice</option>
          </select>
        </FieldLabel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 16, padding: 14 }}><strong>{activeModule?.level ?? '—'}</strong><div style={{ color: '#475569', marginTop: 4 }}>Target level</div></div>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 14 }}><strong>{activeModule?.status ?? '—'}</strong><div style={{ color: '#475569', marginTop: 4 }}>Module readiness</div></div>
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 16, padding: 14 }}><strong>{activeAssessment?.title ?? 'No gate yet'}</strong><div style={{ color: '#475569', marginTop: 4 }}>Assessment link</div></div>
        <div style={{ background: readinessTone.bg, border: `1px solid ${readinessTone.border}`, borderRadius: 16, padding: 14, color: readinessTone.text }}><strong>{readiness.readinessScore}/5 checks passed</strong><div style={{ marginTop: 4 }}>Recommended status: {recommendedStatus}</div></div>
      </div>

      <FieldLabel>
        Publish state
        <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
          <option value="draft">Draft</option>
          <option value="review">In review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
      </FieldLabel>

      <div style={{ padding: 16, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', marginBottom: 8 }}>Generated learning objective</div>
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{objective}</div>
        <div style={{ color: '#64748b' }}>Vocabulary focus: {vocabulary.join(' • ')}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {activities.map((activity) => (
            <div key={activity.title} style={{ padding: 14, borderRadius: 16, border: '1px solid #E5E7EB', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <strong>{activity.title}</strong>
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>{activity.duration}</span>
              </div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>{activity.detail}</div>
              <div style={{ color: '#64748b', marginTop: 8 }}>Evidence: {activity.evidence}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 18, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9A3412', marginBottom: 8 }}>Readiness control</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {readiness.checks.map((check) => (
                <div key={check.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 800, color: check.passed ? '#166534' : '#b91c1c' }}>{check.passed ? '✓' : '!'}</span>
                  <span style={{ color: '#334155', lineHeight: 1.5 }}>{check.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 18, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#3730A3', marginBottom: 8 }}>Editor note</div>
            <div style={{ color: '#334155', lineHeight: 1.6 }}>
              {recommendedStatus === 'published'
                ? 'Nothing obvious blocks release. Publish if the wording actually matches the intended classroom task.'
                : recommendedStatus === 'approved'
                  ? 'Close, but keep it queued until pod ops confirm timing.'
                  : recommendedStatus === 'review'
                    ? 'This deserves review, not bravado. The structure exists, but the release controls are still mixed.'
                    : 'Keep this in draft. The lane is not ready and pretending otherwise is how bad content ships.'}
            </div>
          </div>
        </div>
      </div>

      <ActionButton label="Create English lesson" pendingLabel="Creating lesson…" style={buttonStyle} />
    </form>
  );
}
