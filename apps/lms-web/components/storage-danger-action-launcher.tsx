'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ActionButton } from './action-button';
import { ModalLauncher } from './modal-launcher';

const panelStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: 20,
  borderRadius: 24,
  background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
  border: '1px solid #fdba74',
};

const impactCardStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: 16,
  borderRadius: 18,
  background: '#fff',
  border: '1px solid #fed7aa',
};

const inputStyle: CSSProperties = {
  border: '1px solid #fca5a5',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.6,
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function StorageDangerActionLauncher({
  action,
  actionLabel,
  pendingLabel,
  triggerLabel,
  triggerStyle,
  title,
  description,
  expectedText,
  acknowledgementLabel,
  impactSummary,
  impactNote,
  dangerBadge,
  disabled = false,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  actionLabel: string;
  pendingLabel: string;
  triggerLabel: string;
  triggerStyle: CSSProperties;
  title: string;
  description: string;
  expectedText: string;
  acknowledgementLabel: string;
  impactSummary: string;
  impactNote: string;
  dangerBadge: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const [typedValue, setTypedValue] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const matches = useMemo(() => normalize(typedValue) === normalize(expectedText), [typedValue, expectedText]);
  const ready = matches && acknowledged;

  return (
    <ModalLauncher
      buttonLabel={triggerLabel}
      title={title}
      description={description}
      eyebrow={dangerBadge}
      triggerStyle={triggerStyle}
      disabled={disabled}
    >
      <form action={action} style={panelStyle}>
        {children}
        <div style={impactCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ color: '#7c2d12', fontSize: 16 }}>Impact summary</strong>
            <span style={{ borderRadius: 999, padding: '6px 10px', background: '#7f1d1d', color: 'white', fontSize: 12, fontWeight: 800, letterSpacing: 0.4 }}>
              {dangerBadge}
            </span>
          </div>
          <div style={{ color: '#9a3412', lineHeight: 1.7 }}>{impactSummary}</div>
          <div style={{ color: '#64748b', lineHeight: 1.7 }}>{impactNote}</div>
        </div>

        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          Type <strong style={{ color: '#0f172a' }}>{expectedText}</strong> exactly to unlock this action
          <input
            name="dangerConfirmation"
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            placeholder={expectedText}
            autoComplete="off"
            style={inputStyle}
          />
        </label>

        <label style={checkboxRowStyle}>
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} style={{ marginTop: 4 }} />
          <span>{acknowledgementLabel}</span>
        </label>

        <ActionButton
          label={actionLabel}
          pendingLabel={pendingLabel}
          disabled={!ready}
          style={{
            background: '#b91c1c',
            color: 'white',
            border: 0,
            borderRadius: 14,
            padding: '12px 16px',
            fontWeight: 800,
          }}
        />
      </form>
    </ModalLauncher>
  );
}
