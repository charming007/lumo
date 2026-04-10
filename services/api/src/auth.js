function getActor(req) {
  return {
    role: req.header('x-lumo-role') || 'admin',
    name: req.header('x-lumo-user') || 'Demo User',
  };
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const actor = getActor(req);

    if (!allowedRoles.includes(actor.role)) {
      return res.status(403).json({ message: 'Forbidden', actor });
    }

    req.actor = actor;
    next();
  };
}

module.exports = {
  getActor,
  requireRole,
};
