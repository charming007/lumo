'use client';

import { useMemo, useState } from 'react';
import { ActionButton } from './action-button';

const helperStyle = {
  borderRadius: 16,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  padding: 14,
  color: '#991b1b',
  lineHeight: 1.6,
  fontSize: 14,
} as const;

const inputStyle = {
  border: '1px solid #fca5a5',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

const checkboxRowStyle = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.5,
} as const;

const dangerButtonStyle = {
  background: '#dc2626',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function DeleteConfirmSubmit({
  expectedText,
  entityLabel,
  actionLabel,
  pendingLabel,
  impactNote,
}: {
  expectedText: string;
  entityLabel: string;
  actionLabel: string;
  pendingLabel: string;
  impactNote?: string;
}) {
  const [typedValue, setTypedValue] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const matches = useMemo(() => normalize(typedValue) === normalize(expectedText), [typedValue, expectedText]);
  const ready = matches && acknowledged;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={helperStyle}>
        This is permanent from this admin surface. Type <strong>{expectedText}</strong> and confirm you really want to remove this {entityLabel}.
        {impactNote ? <div style={{ marginTop: 8 }}>{impactNote}</div> : null}
      </div>

      <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
        Type the exact {entityLabel} name to unlock delete
        <input
          name="deleteConfirmation"
          value={typedValue}
          onChange={(event) => setTypedValue(event.target.value)}
          placeholder={expectedText}
          autoComplete="off"
          style={inputStyle}
        />
      </label>

      <label style={checkboxRowStyle}>
        <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} style={{ marginTop: 4 }} />
        <span>I understand this removes the {entityLabel} from the live admin dataset and there is no undo button here.</span>
      </label>

      <ActionButton label={actionLabel} pendingLabel={pendingLabel} style={dangerButtonStyle} disabled={!ready} />
    </div>
  );
}
