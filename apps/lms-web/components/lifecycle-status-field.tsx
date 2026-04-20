'use client';

import { useEffect, useMemo, useState } from 'react';

type LifecycleOption = {
  value: string;
  label: string;
  hint: string;
  tone: string;
  text: string;
  border: string;
};

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

const responsiveGrid = (minWidth: number) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
  gap: 12,
}) as const;

function SectionHint({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

export function LifecycleStatusField({
  name,
  value,
  options,
  entityLabel,
}: {
  name: string;
  value: string;
  options: LifecycleOption[];
  entityLabel: string;
}) {
  const fallbackValue = options[0]?.value ?? 'draft';
  const [selectedValue, setSelectedValue] = useState(value || fallbackValue);

  useEffect(() => {
    setSelectedValue(value || fallbackValue);
  }, [fallbackValue, value]);

  const currentOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? options[0],
    [options, selectedValue],
  );

  return (
    <div style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 18, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
      <input type="hidden" name={name} value={selectedValue} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ color: '#0f172a', fontSize: 14, fontWeight: 800 }}>Lifecycle status</div>
          <SectionHint>Make the {entityLabel} state explicit here instead of burying release control in a tiny select box.</SectionHint>
        </div>
        {currentOption ? (
          <div style={{ padding: '8px 12px', borderRadius: 999, background: currentOption.tone, color: currentOption.text, fontSize: 12, fontWeight: 800, border: `1px solid ${currentOption.border}` }}>
            Current: {currentOption.label}
          </div>
        ) : null}
      </div>
      <div style={{ ...responsiveGrid(180), gap: 10 }}>
        {options.map((option) => {
          const checked = selectedValue === option.value;
          return (
            <label
              key={option.value}
              style={{
                display: 'grid',
                gap: 6,
                padding: '14px 16px',
                borderRadius: 16,
                border: `1px solid ${checked ? option.border : '#e2e8f0'}`,
                background: checked ? option.tone : 'white',
                color: '#0f172a',
                cursor: 'pointer',
                boxShadow: checked ? `0 0 0 2px ${option.border}22` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="radio"
                  name={`${name}__visual`}
                  value={option.value}
                  checked={checked}
                  onChange={() => setSelectedValue(option.value)}
                />
                <strong style={{ color: option.text }}>{option.label}</strong>
              </div>
              <span style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{option.hint}</span>
            </label>
          );
        })}
      </div>
      <FieldLabel>
        Status dropdown fallback
        <select value={selectedValue} onChange={(event) => setSelectedValue(event.target.value)} style={inputStyle}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </FieldLabel>
    </div>
  );
}
