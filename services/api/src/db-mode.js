function getDbMode() {
  const raw = String(process.env.LUMO_DB_MODE || '').trim().toLowerCase();

  if (raw === 'postgres') return 'postgres';
  if (raw === 'file' || raw === 'json') return 'file';
  return 'file';
}

function isPersistentMode() {
  return ['file', 'postgres'].includes(getDbMode());
}

function getDbModeMeta() {
  const mode = getDbMode();
  const hasDatabaseUrl = Boolean(String(process.env.DATABASE_URL || '').trim());

  return {
    mode,
    persistent: isPersistentMode(),
    hasDatabaseUrl,
    driver: mode === 'postgres' ? 'pg-jsonb-snapshot' : 'json-file',
  };
}

module.exports = {
  getDbMode,
  isPersistentMode,
  getDbModeMeta,
};
