'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

const defaultTriggerStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #6C63FF 0%, #8B7FFF 100%)',
  color: 'white',
  border: 0,
  borderRadius: 16,
  padding: '14px 18px',
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: '0 16px 30px rgba(108, 99, 255, 0.25)',
};

export function ModalLauncher({
  buttonLabel,
  title,
  description,
  eyebrow = 'Create record',
  triggerStyle,
  children,
}: {
  buttonLabel: string;
  title: string;
  description?: string;
  eyebrow?: string;
  triggerStyle?: CSSProperties;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...defaultTriggerStyle, ...triggerStyle }}>
        {buttonLabel}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: 'min(1180px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              background: '#f8fafc',
              borderRadius: 28,
              padding: 24,
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', marginBottom: 8 }}>{eyebrow}</div>
                <h2 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>{title}</h2>
                {description ? <p style={{ margin: '8px 0 0', color: '#64748b', lineHeight: 1.6 }}>{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close modal"
                style={{
                  border: '1px solid #dbe4ee',
                  background: 'white',
                  color: '#334155',
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
