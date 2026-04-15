'use client';

import { useMemo, useState } from 'react';

type ExportArtifact = {
  label: string;
  filename: string;
  mimeType: string;
  content: string;
  tone?: string;
  text?: string;
};

export function ExportShareCard({
  title,
  eyebrow,
  summary,
  shareTitle,
  shareText,
  artifacts,
}: {
  title: string;
  eyebrow?: string;
  summary?: string;
  shareTitle: string;
  shareText: string;
  artifacts: ExportArtifact[];
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const exportLinks = useMemo(() => artifacts.map((artifact) => ({
    ...artifact,
    href: `data:${artifact.mimeType};charset=utf-8,${encodeURIComponent(artifact.content)}`,
  })), [artifacts]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({ title: shareTitle, text: shareText });
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  }

  return (
    <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        {eyebrow ? <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>{eyebrow}</div> : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <strong style={{ color: '#0f172a', fontSize: 18 }}>{title}</strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{ borderRadius: 12, border: '1px solid #cbd5e1', background: copied ? '#DCFCE7' : 'white', color: copied ? '#166534' : '#334155', padding: '10px 12px', fontWeight: 800, cursor: 'pointer' }}
            >
              {copied ? 'Copied summary' : 'Copy summary'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              style={{ borderRadius: 12, border: '1px solid #c7d2fe', background: shared ? '#E0E7FF' : '#EEF2FF', color: '#3730A3', padding: '10px 12px', fontWeight: 800, cursor: 'pointer' }}
            >
              {shared ? 'Shared' : 'Share'}
            </button>
          </div>
        </div>
        {summary ? <div style={{ color: '#64748b', lineHeight: 1.7 }}>{summary}</div> : null}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {exportLinks.map((artifact) => (
          <a
            key={artifact.filename}
            href={artifact.href}
            download={artifact.filename}
            style={{
              textDecoration: 'none',
              borderRadius: 12,
              padding: '11px 13px',
              fontWeight: 800,
              background: artifact.tone ?? '#fff',
              color: artifact.text ?? '#0f172a',
              border: '1px solid #dbe4ee',
            }}
          >
            {artifact.label}
          </a>
        ))}
      </div>

      <textarea
        readOnly
        value={shareText}
        aria-label={title}
        style={{
          width: '100%',
          minHeight: 132,
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
