import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.user_metadata?.role;

    if (!userRole) {
      res.status(403).json({ error: 'Forbidden: No role assigned' });
      return;
    }

    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}` });
      return;
    }

    next();
  };
};
