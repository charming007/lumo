function getDbMode() {
  return process.env.LUMO_DB_MODE || 'memory';
}

function isPersistentMode() {
  return getDbMode() === 'postgres';
}

module.exports = {
  getDbMode,
  isPersistentMode,
};
