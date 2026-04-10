type ModuleCard = {
  title: string;
  subtitle: string;
  href: string;
  color: string;
};

export function ModuleGrid({ items }: { items: ModuleCard[] }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          style={{
            textDecoration: 'none',
            color: '#111827',
            background: 'white',
            borderRadius: 24,
            padding: 22,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: item.color,
              marginBottom: 18,
            }}
          />
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{item.title}</div>
          <div style={{ color: '#6b7280', lineHeight: 1.5 }}>{item.subtitle}</div>
        </a>
      ))}
    </section>
  );
}
