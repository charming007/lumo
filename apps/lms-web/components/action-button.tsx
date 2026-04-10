'use client';

import type { CSSProperties } from 'react';
import { useFormStatus } from 'react-dom';

export function ActionButton({ label, pendingLabel, style }: { label: string; pendingLabel?: string; style?: CSSProperties }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} style={{ opacity: pending ? 0.7 : 1, cursor: pending ? 'progress' : 'pointer', ...style }}>
      {pending ? pendingLabel ?? 'Saving…' : label}
    </button>
  );
}
