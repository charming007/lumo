type Item = { label: string; value: string; tone?: string };

export function KpiStrip({ items }: { items: Item[] }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
            borderRadius: 22,
            padding: 22,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ color: '#6b7280', marginBottom: 8 }}>{item.label}</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: item.tone || '#111827' }}>{item.value}</div>
        </div>
      ))}
    </section>
  );
}
