'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  disabled = false,
  children,
}: {
  buttonLabel: ReactNode;
  title: string;
  description?: string;
  eyebrow?: string;
  triggerStyle?: CSSProperties;
  disabled?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const modalTitleId = useId();
  const routeSignature = useMemo(() => {
    const safePathname = pathname || '';
    const query = searchParams?.toString() ?? '';
    return query ? `${safePathname}?${query}` : safePathname;
  }, [pathname, searchParams]);
  const [open, setOpen] = useState(false);
  const previousRouteSignature = useRef(routeSignature);

  useEffect(() => {
    if (previousRouteSignature.current !== routeSignature) {
      setOpen(false);
      previousRouteSignature.current = routeSignature;
    }
  }, [routeSignature]);

  useEffect(() => {
    if (!open) return;

    const handleRouteChange = () => setOpen(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const modal = open ? (
    <div
      role="presentation"
      key={routeSignature}
      className="modal-launcher__overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.56)',
        backdropFilter: 'blur(10px)',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(16px, 4vw, 40px)',
        zIndex: 1200,
        boxSizing: 'border-box',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="modal-launcher__dialog"
        style={{
          width: 'min(920px, calc(100vw - 32px))',
          maxHeight: 'min(860px, calc(100dvh - 48px))',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%)',
          borderRadius: 30,
          padding: 'clamp(18px, 3vw, 28px)',
          boxShadow: '0 34px 90px rgba(15, 23, 42, 0.34)',
          border: '1px solid rgba(226, 232, 240, 0.96)',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
          <div style={{ minWidth: 0, display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', fontWeight: 850 }}>{eyebrow}</div>
            <h2 id={modalTitleId} style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0f172a', lineHeight: 1.05, fontWeight: 900 }}>{title}</h2>
            {description ? <p style={{ margin: 0, color: '#64748b', lineHeight: 1.65, maxWidth: 620 }}>{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close modal"
            style={{
              border: '1px solid #dbe4ee',
              background: 'white',
              color: '#334155',
              width: 42,
              height: 42,
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 22,
              fontWeight: 800,
              flex: '0 0 auto',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ minWidth: 0 }}>
          {children}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...defaultTriggerStyle, ...(disabled ? { opacity: 0.55, cursor: 'not-allowed', boxShadow: 'none' } : null), ...triggerStyle }}
        disabled={disabled}
      >
        {buttonLabel}
      </button>

      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
