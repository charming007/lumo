import React from 'react';

export function PageShell({ title, subtitle, children, aside }: { title: string; subtitle: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 24, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -1, color: '#0f172a' }}>{title}</h1>
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
    <div style={{ overflowX: 'auto', background: 'white', borderRadius: 24, padding: 12, border: '1px solid #eef2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <td key={cellIndex} style={{ padding: 14, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', color: '#0f172a' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
