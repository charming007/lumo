import React from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '../components/breadcrumbs';

export const responsiveGrid = (minWidth: number) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
  gap: 18,
}) as const;

export function PageShell({
  title,
  subtitle,
  children,
  aside,
  breadcrumbs,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <main style={{ boxSizing: 'border-box', padding: 'clamp(18px, 3vw, 32px)', minWidth: 0, maxWidth: '100%', overflowX: 'clip' }}>
      <Breadcrumbs items={breadcrumbs} currentLabel={title} />
      <div className="page-shell__header" style={{ display: 'grid', gridTemplateColumns: aside ? 'minmax(0, 1fr) minmax(260px, 0.46fr)' : 'minmax(0, 1fr)', gap: 22, marginBottom: 28, alignItems: 'stretch' }}>
        <div className="page-shell__copy" style={{ minWidth: 0, position: 'relative', overflow: 'hidden', borderRadius: 32, padding: 'clamp(22px, 4vw, 36px)', background: 'linear-gradient(135deg, #ffffff 0%, #f4f1ff 58%, #ecfbff 100%)', border: '1px solid rgba(213, 217, 255, 0.9)', boxShadow: '0 28px 80px rgba(82, 74, 145, 0.12)' }}>
          <div aria-hidden="true" style={{ position: 'absolute', right: 26, top: 22, width: 128, height: 112, opacity: 0.92 }}>
            <div style={{ position: 'absolute', right: 0, bottom: 0, width: 94, height: 64, borderRadius: 24, background: '#151827', transform: 'rotate(-3deg)', boxShadow: '0 18px 32px rgba(21, 24, 39, 0.16)' }} />
            <div style={{ position: 'absolute', right: 18, bottom: 18, width: 76, height: 50, borderRadius: 20, background: '#9EE7F2', transform: 'rotate(5deg)', border: '4px solid #ffffff' }} />
            <div style={{ position: 'absolute', right: 54, top: 0, width: 44, height: 44, borderRadius: 16, background: '#FF79C8', border: '4px solid #ffffff', boxShadow: '0 12px 24px rgba(255, 121, 200, 0.22)' }} />
            <div style={{ position: 'absolute', right: 8, top: 20, width: 34, height: 34, borderRadius: 14, background: '#FFE680', border: '4px solid #ffffff' }} />
            <div style={{ position: 'absolute', right: 38, bottom: 32, color: '#151827', fontWeight: 950, fontSize: 18 }}>Lu</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.74)', border: '1px solid rgba(201, 197, 255, 0.78)', color: '#6D5DF7', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: '#6D5DF7', display: 'inline-block' }} />
            Operations workspace
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(34px, 4.7vw, 56px)', letterSpacing: 0, color: '#121527', fontWeight: 900, maxWidth: aside ? 720 : 960, lineHeight: 0.98 }}>{title}</h1>
          <p style={{ margin: '14px 0 0', color: '#687086', maxWidth: aside ? 720 : 980, lineHeight: 1.65, fontSize: 16 }}>{subtitle}</p>
        </div>
        {aside ? <div className="page-shell__aside" style={{ minWidth: 0, borderRadius: 30, padding: 16, background: 'rgba(255, 255, 255, 0.72)', border: '1px solid rgba(226, 230, 240, 0.94)', boxShadow: '0 22px 60px rgba(82, 74, 145, 0.09)', backdropFilter: 'blur(18px)' }}>{aside}</div> : null}
      </div>
      {children}
      <style>{`
        .page-shell__header::selection,
        .page-shell__copy::selection {
          background: #d9d4ff;
        }

        .page-shell__header,
        .page-shell__copy,
        .page-shell__aside {
          box-sizing: border-box;
          max-width: 100%;
        }

        .page-shell__copy input,
        .page-shell__copy select,
        .page-shell__copy textarea,
        .page-shell__copy pre,
        .page-shell__copy code,
        main input,
        main select,
        main textarea {
          box-sizing: border-box;
          max-width: 100%;
        }

        main select,
        .modal-launcher__dialog select {
          padding-right: 42px !important;
        }

        .modal-launcher__dialog form,
        .modal-launcher__dialog form > div {
          min-width: 0;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .modal-launcher__dialog label,
        .modal-launcher__dialog input,
        .modal-launcher__dialog select,
        .modal-launcher__dialog textarea {
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }

        .modal-launcher__dialog label {
          display: grid;
          gap: 10px;
          width: 100%;
        }

        .modal-launcher__dialog input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
        .modal-launcher__dialog select,
        .modal-launcher__dialog textarea {
          display: block;
          width: 100% !important;
        }

        .modal-launcher__dialog form > div[style*="grid-template-columns"] {
          column-gap: 20px !important;
          row-gap: 18px !important;
        }

        main textarea,
        main pre,
        main code {
          overflow-wrap: anywhere;
        }

        @media (max-width: 720px) {
          .page-shell__header {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 16px;
            margin-bottom: 20px;
          }

          .page-shell__aside {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

export function Card({ title, children, eyebrow }: { title: string; children: React.ReactNode; eyebrow?: string }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.86)', borderRadius: 26, padding: 'clamp(18px, 4vw, 26px)', boxShadow: '0 20px 58px rgba(82, 74, 145, 0.09)', border: '1px solid rgba(224, 228, 238, 0.98)', minWidth: 0 }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 5, background: 'linear-gradient(90deg, #6D5DF7, #FF79C8, #9EE7F2)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.35, color: '#8b93a8', marginBottom: 8, fontWeight: 850 }}>{eyebrow}</div> : null}
          <h2 style={{ margin: 0, fontSize: 20, color: '#151827', overflowWrap: 'anywhere', fontWeight: 880, lineHeight: 1.14 }}>{title}</h2>
        </div>
        <div aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 16, background: 'linear-gradient(135deg, #f2efff, #e9fbff)', border: '1px solid #e2e7ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#6D5DF7', fontWeight: 950, flex: '0 0 auto' }}>
          {title.trim()[0] ?? 'L'}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Pill({ label, tone = '#EEF2FF', text = '#3730A3' }: { label: string; tone?: string; text?: string }) {
  return <span style={{ display: 'inline-flex', padding: '7px 11px', borderRadius: 999, background: tone, color: text, fontSize: 11, fontWeight: 850, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.66)' }}>{label}</span>;
}

export function MetricList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 12px', borderRadius: 16, background: '#f7f8ff', border: '1px solid #edeffc' }}>
          <span style={{ color: '#64748b', fontSize: 14 }}>{item.label}</span>
          <strong style={{ color: '#151827', fontSize: 15 }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function SimpleTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="simple-table-shell" style={{ overflowX: 'auto', background: 'white', borderRadius: 20, padding: 12, border: '1px solid #e8ecf4', boxShadow: '0 12px 34px rgba(76, 83, 112, 0.05)' }}>
      <table className="simple-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #edf0f6', color: '#8b93a8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, overflowWrap: 'anywhere' }}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} data-label={columns[cellIndex] ?? `Column ${cellIndex + 1}`} style={{ padding: 12, borderBottom: '1px solid #f2f4f8', verticalAlign: 'top', color: '#202436', overflowWrap: 'anywhere', wordBreak: 'break-word', fontSize: 14 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        @media (max-width: 1440px) {
          .simple-table-shell {
            overflow: visible;
            padding: 0;
            background: transparent;
            border: 0;
            box-shadow: none;
          }

          .simple-table,
          .simple-table thead,
          .simple-table tbody,
          .simple-table tr,
          .simple-table th,
          .simple-table td {
            display: block;
            width: 100%;
          }

          .simple-table thead {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }

          .simple-table tbody {
            display: grid;
            gap: 12px;
          }

          .simple-table tr {
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            background: white;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
            overflow: hidden;
          }

          .simple-table td {
            display: grid;
            grid-template-columns: minmax(0, 96px) minmax(0, 1fr);
            gap: 10px;
            align-items: start;
            padding: 12px 14px;
            border-bottom: 1px solid #f1f5f9;
          }

          .simple-table td:last-child {
            border-bottom: 0;
          }

          .simple-table td::before {
            content: attr(data-label);
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
        }

        @media (max-width: 520px) {
          .simple-table td {
            grid-template-columns: minmax(0, 1fr);
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
