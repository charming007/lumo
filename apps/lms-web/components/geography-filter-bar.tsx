import type { ReactNode } from 'react';

type Option = { value: string; label: string };

type FilterField = {
  name: string;
  label: string;
  value?: string;
  options: Option[];
};

export function GeographyFilterBar({
  fields,
  actionLabel = 'Apply filters',
  resetHref,
  helper,
}: {
  fields: FilterField[];
  actionLabel?: string;
  resetHref: string;
  helper?: ReactNode;
}) {
  return (
    <form method="get" style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Geography filters</div>
          <div style={{ color: '#475569', lineHeight: 1.6, marginTop: 4 }}>Filter by state and local government first, then use pod, cohort, or mallam to narrow the operational view.</div>
        </div>
        <a href={resetHref} style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>Reset</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 12 }}>
        {fields.map((field) => (
          <label key={field.name} style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{field.label}</span>
            <select name={field.name} defaultValue={field.value || ''} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
              <option value="">All</option>
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      {helper ? <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{helper}</div> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>{actionLabel}</button>
      </div>
    </form>
  );
}
