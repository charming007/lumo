'use client';

import type { CSSProperties } from 'react';
import { useFormStatus } from 'react-dom';

export function ActionButton({ label, pendingLabel, style, disabled = false }: { label: string; pendingLabel?: string; style?: CSSProperties; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const blocked = pending || disabled;

  return (
    <button type="submit" disabled={blocked} style={{ opacity: blocked ? 0.7 : 1, cursor: pending ? 'progress' : blocked ? 'not-allowed' : 'pointer', ...style }}>
      {pending ? pendingLabel ?? 'Saving…' : label}
    </button>
  );
}
