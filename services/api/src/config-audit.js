const fs = require('fs');
const path = require('path');
const { getDbMode, getDbModeMeta } = require('./db-mode');
const { getAuthAudit } = require('./auth');
const { getBuildInfo } = require('./build-info');

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

function readPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getCanonicalApiBaseAudit() {
  const raw = String(process.env.API_BASE_URL || process.env.LUMO_PUBLIC_API_URL || '').trim();
  if (!raw) {
    return {
      configured: null,
      valid: false,
      blocker: null,
      warning: null,
    };
  }

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const looksPlaceholder = hostname === 'example.com' || hostname.endsWith('.example.com');
    const looksLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local');

    if (!['http:', 'https:'].includes(protocol)) {
      return {
        configured: raw,
        valid: false,
        blocker: `API_BASE_URL/LUMO_PUBLIC_API_URL must use http or https. Current value: ${raw}`,
        warning: null,
      };
    }

    if (isProductionLike() && protocol !== 'https:') {
      return {
        configured: raw,
        valid: false,
        blocker: `API_BASE_URL/LUMO_PUBLIC_API_URL must use https in production-like environments. Current value: ${raw}`,
        warning: null,
      };
    }

    if (looksPlaceholder) {
      return {
        configured: raw,
        valid: false,
        blocker: `API_BASE_URL/LUMO_PUBLIC_API_URL still points at placeholder host ${hostname}. Replace it with the real public API URL.`,
        warning: null,
      };
    }

    if (looksLocal && isProductionLike()) {
      return {
        configured: raw,
        valid: false,
        blocker: `API_BASE_URL/LUMO_PUBLIC_API_URL points at ${hostname}, which is not a real external API origin for production traffic.`,
        warning: null,
      };
    }

    return {
      configured: parsed.toString(),
      valid: true,
      blocker: null,
      warning: null,
    };
  } catch {
    return {
      configured: raw,
      valid: false,
      blocker: `API_BASE_URL/LUMO_PUBLIC_API_URL is not a valid URL. Current value: ${raw}`,
      warning: null,
    };
  }
}

function getAssetUploadAudit() {
  const defaultRoot = path.resolve(path.join(__dirname, '..', 'data', 'uploads'));
  const configuredRaw = String(process.env.LUMO_ASSET_UPLOAD_DIR || '').trim();
  const root = path.resolve(configuredRaw || defaultRoot);
  const canonicalApiBase = getCanonicalApiBaseAudit();
  const insideWorkspace = !path.relative(process.cwd(), root).startsWith('..') && !path.isAbsolute(path.relative(process.cwd(), root));
  const usesDefaultPath = root === defaultRoot;
  const warnings = [];
  const recommendations = [];

  try {
    fs.mkdirSync(root, { recursive: true });
    fs.accessSync(root, fs.constants.R_OK | fs.constants.W_OK);

    if (usesDefaultPath) {
      warnings.push('Asset uploads are still using the default repo-local path. Good enough for local demos, but fragile for hosted production unless that directory is backed by persistent storage.');
      recommendations.push('Set LUMO_ASSET_UPLOAD_DIR to a writable persistent volume/disk mount for live uploads.');
    }

    if (insideWorkspace) {
      warnings.push('Asset upload root sits inside the app workspace. Redeploys, ephemeral containers, or repo cleanup can silently orphan uploaded media unless that path is mounted persistently.');
      recommendations.push('Keep uploaded media outside the deploy/repo directory, or mount the workspace path from persistent storage.');
    }

    if (!canonicalApiBase.valid) {
      recommendations.push('Fix API_BASE_URL/LUMO_PUBLIC_API_URL so managed asset URLs resolve to the public API origin instead of an internal hop guess.');
    }

    return {
      configured: configuredRaw || null,
      defaultRoot,
      root,
      ready: true,
      blocker: null,
      publicBaseValid: canonicalApiBase.valid,
      publicBase: canonicalApiBase.configured,
      usesDefaultPath,
      insideWorkspace,
      persistentRisk: usesDefaultPath || insideWorkspace,
      warnings,
      recommendations,
    };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : null;
    let blocker = `Asset upload storage is unavailable at ${root}.`;

    if (code === 'EROFS') {
      blocker = `Asset upload root (${root}) is read-only. Set LUMO_ASSET_UPLOAD_DIR to a writable persistent directory or move uploads to external storage.`;
    } else if (code === 'EACCES' || code === 'EPERM') {
      blocker = `Asset upload root (${root}) is not writable by the API process. Fix permissions or set LUMO_ASSET_UPLOAD_DIR to a writable path.`;
    } else if (code === 'ENOENT') {
      blocker = `Asset upload root (${root}) could not be created. Verify the parent path for LUMO_ASSET_UPLOAD_DIR exists and is writable.`;
    }

    return {
      configured: configuredRaw || null,
      defaultRoot,
      root,
      ready: false,
      blocker,
      publicBaseValid: canonicalApiBase.valid,
      publicBase: canonicalApiBase.configured,
      usesDefaultPath,
      insideWorkspace,
      persistentRisk: usesDefaultPath || insideWorkspace,
      warnings,
      recommendations: [
        'Fix the upload directory first; managed uploads cannot succeed until the API process can create and write files there.',
      ],
    };
  }
}

function buildConfigAudit() {
  const mode = getDbMode();
  const dbMeta = getDbModeMeta();
  const build = getBuildInfo();
  const allowedOrigins = buildAllowedOrigins();
  const allowAnyOrigin = (process.env.LUMO_CORS_ALLOW_ANY_ORIGIN || '').toLowerCase() === 'true';
  const canonicalApiBase = getCanonicalApiBaseAudit();
  const apiBaseUrl = canonicalApiBase.configured;
  const authAudit = getAuthAudit();
  const assetUploads = getAssetUploadAudit();
  const throttles = {
    jsonBodyLimit: String(process.env.LUMO_JSON_BODY_LIMIT || '1mb'),
    learnerSync: {
      windowMs: readPositiveIntEnv('LUMO_SYNC_THROTTLE_WINDOW_MS', 60_000),
      maxRequests: readPositiveIntEnv('LUMO_SYNC_THROTTLE_MAX_REQUESTS', 120),
    },
    learnerRewardRequests: {
      windowMs: readPositiveIntEnv('LUMO_REWARD_REQUEST_THROTTLE_WINDOW_MS', 60_000),
      maxRequests: readPositiveIntEnv('LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS', 12),
    },
    adminMutations: {
      windowMs: readPositiveIntEnv('LUMO_ADMIN_MUTATION_THROTTLE_WINDOW_MS', 60_000),
      maxRequests: readPositiveIntEnv('LUMO_ADMIN_MUTATION_THROTTLE_MAX_REQUESTS', 90),
    },
  };
  const dangerousAdminMutationGuard = {
    enforced: authAudit.productionLike || authAudit.hasAnyConfiguredKey,
    confirmationHeader: 'x-lumo-confirm-action',
    idempotencyHeader: 'idempotency-key',
    idempotencyTtlMs: readPositiveIntEnv('LUMO_DANGEROUS_ADMIN_IDEMPOTENCY_TTL_MS', 10 * 60_000),
    protectedActions: [
      'storage-import',
      'storage-reload',
      'storage-recover-primary-from-cache',
      'storage-restore-mutation',
      'storage-restore-backup',
      'storage-restore-smart',
      'storage-restore-latest',
    ],
  };
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

  if (canonicalApiBase.blocker) {
    if (isProductionLike()) {
      errors.push(canonicalApiBase.blocker);
    } else {
      warnings.push(canonicalApiBase.blocker);
    }
  }

  if (mode === 'file' && isProductionLike()) {
    warnings.push('File-backed storage is running in a production-like environment. Use Postgres for durable multi-instance recovery.');
  }

  if (!assetUploads.ready) {
    errors.push(assetUploads.blocker);
  } else {
    for (const warning of assetUploads.warnings) {
      if (!warnings.includes(warning)) warnings.push(warning);
    }

    if (isProductionLike() && assetUploads.persistentRisk) {
      warnings.push('Managed asset uploads look writable, but the current upload root still carries persistence risk for a production-like deployment. Mount durable storage or move uploads to object storage before relying on the asset registry live.');
    }
  }

  if (authAudit.productionLike && !authAudit.roles.admin) {
    errors.push('Protected endpoints are not production-safe without LUMO_ADMIN_API_KEY. Configure API-key auth before exposing admin/teacher/facilitator routes.');
  }

  if (!authAudit.productionLike && !authAudit.hasAnyConfiguredKey) {
    warnings.push('Protected endpoints still allow header-based demo auth because no LUMO_*_API_KEY values are configured. Safe for local demos only.');
  }

  if (isProductionLike() && throttles.learnerSync.maxRequests > 500) {
    warnings.push('Learner sync throttle is set unusually high for a production-like environment. Re-check LUMO_SYNC_THROTTLE_MAX_REQUESTS.');
  }

  if (isProductionLike() && throttles.learnerRewardRequests.maxRequests > 60) {
    warnings.push('Learner reward request throttle is set unusually high for a production-like environment. Re-check LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS.');
  }

  if (isProductionLike() && throttles.adminMutations.maxRequests > 240) {
    warnings.push('Admin destructive mutation throttle is set unusually high for a production-like environment. Re-check LUMO_ADMIN_MUTATION_THROTTLE_MAX_REQUESTS.');
  }

  return {
    checkedAt: new Date().toISOString(),
    build,
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      productionLike: isProductionLike(),
    },
    storage: dbMeta,
    assetUploads,
    apiBaseUrl,
    publicApiBase: canonicalApiBase,
    cors: {
      allowAnyOrigin,
      allowedOrigins,
      loopbackOnly: allowedOrigins.length > 0 && allowedOrigins.every((origin) => isLoopbackOrigin(origin)),
    },
    auth: authAudit,
    throttles,
    dangerousAdminMutationGuard,
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
