type Props = {
  role: string;
  mode: string;
};

export function DemoBanner({ role, mode }: Props) {
  return (
    <div
      style={{
        margin: '0 32px',
        marginTop: 16,
        background: '#111827',
        color: 'white',
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <strong>Lumo pilot demo</strong> — running in {mode} mode
      </div>
      <div>Current role: {role}</div>
    </div>
  );
}
