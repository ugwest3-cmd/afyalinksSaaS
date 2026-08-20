import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as auditService from '../services/audit.service.js';

const router: Router = Router();

// Wrap async handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.get('/admin/audit', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { page, limit, action, entityType, actorId, dateFrom, dateTo } = req.query;
  
  const result = await auditService.getLogs({
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    action: action as string,
    entityType: entityType as string,
    actorId: actorId as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string
  });
  
  res.json({ success: true, data: result });
}));

export default router;
