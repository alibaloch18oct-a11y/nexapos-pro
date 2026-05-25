const { verifyToken } = require("./auth");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token missing."
    });
  }

  const token = header.replace("Bearer ", "");

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      message: "Super admin access required."
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireSuperAdmin
};