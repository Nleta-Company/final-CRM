export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const permissions = req.user.permissions || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
        requiredPermission: permission,
      });
    }

    next();
  };
}