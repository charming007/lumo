import type { ApiBaseSource } from '../lib/config';

type Props = {
  role: string;
  mode: string;
  apiSource?: ApiBaseSource;
};

function bannerTone(apiSource: ApiBaseSource) {
  if (apiSource === 'missing-production-env' || apiSource === 'invalid-production-env') {
    return {
      background: '#7c2d12',
      detail: '#fed7aa',
    };
  }

  return {
    background: '#111827',
    detail: '#cbd5e1',
  };
}

function describeApiSource(apiSource: ApiBaseSource) {
  if (apiSource === 'missing-production-env') {
    return 'Production deploy is missing NEXT_PUBLIC_API_BASE_URL. The LMS is still up so operators can see explicit blocker states, but live API-backed screens stay intentionally degraded until the env var is fixed.';
  }

  if (apiSource === 'invalid-production-env') {
    return 'Production deploy has an unsafe NEXT_PUBLIC_API_BASE_URL (placeholder, local-only, invalid, or non-HTTPS). The LMS now treats that as a hard blocker instead of pretending the backend wiring is fine.';
  }

  if (apiSource === 'local-fallback') {
    return 'Backend URL is using the local development fallback.';
  }

  return null;
}

export function DemoBanner({ role, mode, apiSource = 'env' }: Props) {
  const tone = bannerTone(apiSource);
  const detail = describeApiSource(apiSource);

  return (
    <div
      style={{
        margin: '16px clamp(16px, 4vw, 32px) 0',
        background: tone.background,
        color: 'white',
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <strong>Lumo pilot demo</strong> — running in {mode} mode
        {detail ? (
          <div style={{ marginTop: 4, fontSize: 13, color: tone.detail, lineHeight: 1.5 }}>
            {detail}
          </div>
        ) : null}
      </div>
      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Current role: {role}</div>
    </div>
  );
}
