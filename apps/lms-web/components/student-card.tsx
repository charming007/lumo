type Props = {
  name: string;
  age: number;
  level: string;
  attendanceRate: number;
};

export function StudentCard({ name, age, level, attendanceRate }: Props) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: 20 }}>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{name}</div>
      <div style={{ color: '#6b7280', marginBottom: 6 }}>Age {age}</div>
      <div style={{ color: '#6b7280', marginBottom: 6 }}>Level: {level}</div>
      <div style={{ color: '#6b7280' }}>Attendance: {Math.round(attendanceRate * 100)}%</div>
    </div>
  );
}
