import type { CSSProperties } from 'react';
import type { LessonAsset } from '../lib/types';

const previewShellStyle: CSSProperties = {
  borderRadius: 14,
  border: '1px solid #E2E8F0',
  background: '#fff',
  overflow: 'hidden',
};

function previewLabel(asset: LessonAsset) {
  return asset.originalFileName ?? asset.fileName ?? asset.title;
}

function fallbackPreview(asset: LessonAsset, compact?: boolean) {
  return (
    <div style={{
      ...previewShellStyle,
      minHeight: compact ? 92 : 140,
      display: 'grid',
      placeItems: 'center',
      padding: 16,
      background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
      color: '#475569',
      textAlign: 'center',
    }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 }}>{asset.kind}</div>
        <div style={{ fontSize: 13 }}>{previewLabel(asset)}</div>
      </div>
    </div>
  );
}

export function AssetPreview({ asset, compact = false }: { asset: LessonAsset; compact?: boolean }) {
  const src = asset.fileUrl ?? undefined;
  const mimeType = (asset.mimeType ?? '').toLowerCase();
  const kind = asset.kind.toLowerCase();
  const isImage = Boolean(src) && (kind === 'image' || kind === 'illustration' || mimeType.startsWith('image/'));
  const isAudio = Boolean(src) && (kind === 'audio' || mimeType.startsWith('audio/'));

  if (isImage && src) {
    return (
      <div style={previewShellStyle}>
        <img
          src={src}
          alt={asset.title}
          style={{
            display: 'block',
            width: '100%',
            height: compact ? 92 : 160,
            objectFit: 'cover',
            background: '#F8FAFC',
          }}
        />
      </div>
    );
  }

  if (isAudio && src) {
    return (
      <div style={{ ...previewShellStyle, padding: 12, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.9 }}>Audio preview</div>
        <audio controls preload="none" style={{ width: '100%' }} src={src}>
          <track kind="captions" />
        </audio>
      </div>
    );
  }

  return fallbackPreview(asset, compact);
}

export function AssetRuntimeLink({ asset, label = 'Open file' }: { asset: LessonAsset; label?: string }) {
  if (!asset.fileUrl) {
    return <span style={{ color: '#94A3B8', fontSize: 13 }}>No runtime URL</span>;
  }

  return (
    <a
      href={asset.fileUrl}
      target="_blank"
      rel="noreferrer"
      style={{ color: '#0F766E', fontWeight: 700, textDecoration: 'none' }}
    >
      {label}
    </a>
  );
}
