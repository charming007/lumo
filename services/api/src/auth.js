function isProductionLike() {
  return ['production', 'staging'].includes(String(process.env.NODE_ENV || '').toLowerCase());
}

function getConfiguredRoleKeys() {
  return {
    admin: String(process.env.LUMO_ADMIN_API_KEY || '').trim(),
    teacher: String(process.env.LUMO_TEACHER_API_KEY || '').trim(),
    facilitator: String(process.env.LUMO_FACILITATOR_API_KEY || '').trim(),
  };
}

function extractApiKey(req) {
  const explicit = String(req.header('x-lumo-api-key') || '').trim();
  if (explicit) return explicit;

  const authorization = String(req.header('authorization') || '').trim();
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  return bearerMatch ? bearerMatch[1].trim() : '';
}

function resolveActorFromApiKey(apiKey) {
  if (!apiKey) return null;

  const roleKeys = getConfiguredRoleKeys();
  const matchedRole = Object.entries(roleKeys).find(([, configuredKey]) => configuredKey && configuredKey === apiKey)?.[0] || null;

  if (!matchedRole) {
    return null;
  }

  const headerName = String(process.env[`LUMO_${matchedRole.toUpperCase()}_ACTOR_NAME`] || '').trim();
  return {
    role: matchedRole,
    name: headerName || `${matchedRole[0].toUpperCase()}${matchedRole.slice(1)} API key`,
    authMode: 'api-key',
  };
}

function getActor(req) {
  const apiKeyActor = resolveActorFromApiKey(extractApiKey(req));
  if (apiKeyActor) {
    return apiKeyActor;
  }

  return {
    role: req.header('x-lumo-role') || 'anonymous',
    name: req.header('x-lumo-user') || req.header('x-lumo-actor') || 'Anonymous actor',
    authMode: 'header',
  };
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const actor = getActor(req);
    const roleKeys = getConfiguredRoleKeys();
    const hasAnyConfiguredKey = Object.values(roleKeys).some(Boolean);
    const needsStrictAuth = hasAnyConfiguredKey || isProductionLike();

    if (needsStrictAuth && actor.authMode !== 'api-key') {
      const missingConfig = !roleKeys.admin;
      return res.status(missingConfig ? 503 : 401).json({
        message: missingConfig
          ? 'Protected API auth is not configured. Set LUMO_ADMIN_API_KEY before exposing protected endpoints.'
          : 'Missing or invalid API key for protected endpoint.',
      });
    }

    const elevatedRoles = new Set(['admin']);
    const actorHasAllowedRole = allowedRoles.includes(actor.role) || (actor.role === 'admin' && !allowedRoles.includes('admin') && Array.from(elevatedRoles).includes('admin'));

    if (!actorHasAllowedRole) {
      return res.status(403).json({ message: 'Forbidden', actor: { role: actor.role, name: actor.name } });
    }

    req.actor = actor;
    next();
  };
}

function getAuthAudit() {
  const roleKeys = getConfiguredRoleKeys();
  return {
    productionLike: isProductionLike(),
    hasAnyConfiguredKey: Object.values(roleKeys).some(Boolean),
    roles: Object.fromEntries(
      Object.entries(roleKeys).map(([role, value]) => [role, Boolean(value)]),
    ),
  };
}

module.exports = {
  getActor,
  requireRole,
  getAuthAudit,
};
