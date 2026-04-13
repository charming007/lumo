'use client';

import { useState } from 'react';

export function CopyableTextCard({
  title,
  text,
  eyebrow,
  tone = '#f8fafc',
  border = '#e2e8f0',
}: {
  title: string;
  text: string;
  eyebrow?: string;
  tone?: string;
  border?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ padding: 16, borderRadius: 18, background: tone, border: `1px solid ${border}`, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          {eyebrow ? (
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', marginBottom: 4 }}>
              {eyebrow}
            </div>
          ) : null}
          <div style={{ fontWeight: 800, color: '#0f172a' }}>{title}</div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            borderRadius: 12,
            border: '1px solid #cbd5e1',
            background: copied ? '#DCFCE7' : 'white',
            color: copied ? '#166534' : '#334155',
            padding: '10px 12px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        aria-label={title}
        style={{
          width: '100%',
          minHeight: 116,
          resize: 'vertical',
          borderRadius: 14,
          border: '1px solid #cbd5e1',
          padding: 14,
          background: 'white',
          color: '#334155',
          lineHeight: 1.6,
          fontSize: 14,
        }}
      />
    </div>
  );
}
