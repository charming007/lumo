import React from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '../components/breadcrumbs';

export const responsiveGrid = (minWidth: number) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
  gap: 16,
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
    <main style={{ padding: 'clamp(18px, 4vw, 32px)', minWidth: 0 }}>
      <Breadcrumbs items={breadcrumbs} currentLabel={title} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 34px)', letterSpacing: -1, color: '#0f172a' }}>{title}</h1>
          <p style={{ margin: '10px 0 0', color: '#556070', maxWidth: 760, lineHeight: 1.6 }}>{subtitle}</p>
        </div>
        {aside}
      </div>
      {children}
    </main>
  );
}

export function Card({ title, children, eyebrow }: { title: string; children: React.ReactNode; eyebrow?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 24, padding: 24, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)', border: '1px solid #eef2f7' }}>
      {eyebrow ? <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', marginBottom: 8 }}>{eyebrow}</div> : null}
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20, color: '#0f172a' }}>{title}</h2>
      {children}
    </div>
  );
}

export function Pill({ label, tone = '#EEF2FF', text = '#3730A3' }: { label: string; tone?: string; text?: string }) {
  return <span style={{ display: 'inline-flex', padding: '7px 12px', borderRadius: 999, background: tone, color: text, fontSize: 12, fontWeight: 800 }}>{label}</span>;
}

export function MetricList({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 12, borderBottom: '1px solid #eef2f7' }}>
          <span style={{ color: '#64748b' }}>{item.label}</span>
          <strong style={{ color: '#0f172a' }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function SimpleTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="simple-table-shell" style={{ overflowX: 'auto', background: 'white', borderRadius: 24, padding: 12, border: '1px solid #eef2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
      <table className="simple-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={{ textAlign: 'left', padding: 14, borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} data-label={columns[cellIndex] ?? `Column ${cellIndex + 1}`} style={{ padding: 14, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', color: '#0f172a' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        @media (max-width: 720px) {
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
            grid-template-columns: minmax(0, 132px) minmax(0, 1fr);
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
      `}</style>
    </div>
  );
}
