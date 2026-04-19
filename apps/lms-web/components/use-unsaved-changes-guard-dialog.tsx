'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseUnsavedChangesGuardOptions = {
  isDirty?: boolean;
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.52)',
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  zIndex: 1200,
} as const;

const dialogStyle = {
  width: 'min(100%, 560px)',
  background: 'white',
  borderRadius: 24,
  border: '1px solid #CBD5E1',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)',
  padding: 24,
  display: 'grid',
  gap: 16,
} as const;

const leaveButtonStyle = {
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 800,
  border: '1px solid #FCA5A5',
  background: '#FFF1F2',
  color: '#B91C1C',
  cursor: 'pointer',
} as const;

const stayButtonStyle = {
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 800,
  border: '1px solid #4338CA',
  background: '#4F46E5',
  color: 'white',
  cursor: 'pointer',
} as const;

function normalizeHref(href: string) {
  try {
    return new URL(href, window.location.href).toString();
  } catch {
    return href;
  }
}

export function useUnsavedChangesGuard(options: UseUnsavedChangesGuardOptions = {}) {
  const { isDirty } = options;
  const [localDirty, setLocalDirty] = useState(false);
  const trackedDirty = typeof isDirty === 'boolean' ? isDirty : localDirty;
  const isDirtyRef = useRef(trackedDirty);
  const bypassRef = useRef(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    isDirtyRef.current = trackedDirty;
    if (!trackedDirty) {
      bypassRef.current = false;
      setPendingHref(null);
    }
  }, [trackedDirty]);

  const openConfirmation = useCallback((href: string) => {
    setPendingHref(normalizeHref(href));
  }, []);

  const handleLeave = useCallback(() => {
    if (!pendingHref) return;
    bypassRef.current = true;
    window.location.assign(pendingHref);
  }, [pendingHref]);

  const handleStay = useCallback(() => {
    setPendingHref(null);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current || bypassRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirtyRef.current || bypassRef.current || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const normalizedHref = normalizeHref(anchor.href);
      if (!normalizedHref.startsWith(window.location.origin) || normalizedHref === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();
      openConfirmation(normalizedHref);
    };

    const handlePopState = () => {
      if (!isDirtyRef.current || bypassRef.current) return;
      openConfirmation(window.location.href);
      window.history.go(1);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [openConfirmation]);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
    setLocalDirty(false);
  }, []);

  const markDirty = useCallback(() => {
    if (typeof isDirty === 'boolean') return;
    setLocalDirty(true);
  }, [isDirty]);

  const clearDirty = useCallback(() => {
    bypassRef.current = true;
    if (typeof isDirty === 'boolean') return;
    setLocalDirty(false);
  }, [isDirty]);

  const confirmationDialog = useMemo(() => pendingHref ? (
    <div style={overlayStyle} role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="unsaved-guard-title" aria-describedby="unsaved-guard-description" style={dialogStyle}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, color: '#B91C1C' }}>Unsaved changes</div>
          <h2 id="unsaved-guard-title" style={{ margin: 0, fontSize: 24, color: '#0F172A' }}>Leave this page without saving?</h2>
          <div id="unsaved-guard-description" style={{ color: '#475569', lineHeight: 1.6 }}>
            Your latest authoring edits have not been saved yet. If you leave now, they will be discarded.
          </div>
        </div>
        <div style={{ padding: 14, borderRadius: 16, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', lineHeight: 1.6 }}>
          Save first if you want to keep this work. Otherwise leave and discard the draft changes.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleLeave} style={leaveButtonStyle}>Leave without saving</button>
          <button type="button" onClick={handleStay} autoFocus style={stayButtonStyle}>Stay and keep editing</button>
        </div>
      </div>
    </div>
  ) : null, [handleLeave, handleStay, pendingHref]);

  return { allowNextNavigation, markDirty, clearDirty, confirmationDialog, isDirty: trackedDirty };
}
