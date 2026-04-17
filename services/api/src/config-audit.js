const { getDbMode, getDbModeMeta } = require('./db-mode');
const { getAuthAudit } = require('./auth');

function buildAllowedOrigins() {
  const configured = (process.env.LUMO_CORS_ORIGINS || process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0
    ? configured
    : [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ];
}

function isLoopbackOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || '');
}

function isProductionLike() {
  return ['production', 'staging'].includes(String(process.env.NODE_ENV || '').toLowerCase());
}

function buildConfigAudit() {
  const mode = getDbMode();
  const dbMeta = getDbModeMeta();
  const allowedOrigins = buildAllowedOrigins();
  const allowAnyOrigin = (process.env.LUMO_CORS_ALLOW_ANY_ORIGIN || '').toLowerCase() === 'true';
  const apiBaseUrl = String(process.env.API_BASE_URL || process.env.LUMO_PUBLIC_API_URL || '').trim() || null;
  const authAudit = getAuthAudit();
  const warnings = [];
  const errors = [];

  if (mode === 'postgres' && !dbMeta.hasDatabaseUrl) {
    errors.push('LUMO_DB_MODE=postgres but DATABASE_URL is not set.');
  }

  if (isProductionLike() && allowAnyOrigin) {
    errors.push('LUMO_CORS_ALLOW_ANY_ORIGIN=true is unsafe in production-like environments.');
  }

  if (isProductionLike() && (!allowedOrigins.length || allowedOrigins.every((origin) => isLoopbackOrigin(origin)))) {
    warnings.push('CORS still only allows loopback origins. Add real admin frontend origins before production traffic.');
  }

  if (isProductionLike() && !apiBaseUrl) {
    warnings.push('API_BASE_URL/LUMO_PUBLIC_API_URL is not set, so operator docs and health surfaces cannot point at a canonical external API URL.');
  }

  if (mode === 'file' && isProductionLike()) {
    warnings.push('File-backed storage is running in a production-like environment. Use Postgres for durable multi-instance recovery.');
  }

  if (authAudit.productionLike && !authAudit.roles.admin) {
    errors.push('Protected endpoints are not production-safe without LUMO_ADMIN_API_KEY. Configure API-key auth before exposing admin/teacher/facilitator routes.');
  }

  if (!authAudit.productionLike && !authAudit.hasAnyConfiguredKey) {
    warnings.push('Protected endpoints still allow header-based demo auth because no LUMO_*_API_KEY values are configured. Safe for local demos only.');
  }

  return {
    checkedAt: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      productionLike: isProductionLike(),
    },
    storage: dbMeta,
    apiBaseUrl,
    cors: {
      allowAnyOrigin,
      allowedOrigins,
      loopbackOnly: allowedOrigins.length > 0 && allowedOrigins.every((origin) => isLoopbackOrigin(origin)),
    },
    auth: authAudit,
    runtime: {
      watchMode: process.execArgv.includes('--watch'),
      pid: process.pid,
    },
    summary: {
      ready: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
    errors,
    warnings,
  };
}

module.exports = {
  buildAllowedOrigins,
  isLoopbackOrigin,
  isProductionLike,
  buildConfigAudit,
};
