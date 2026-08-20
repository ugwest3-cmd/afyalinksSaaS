import { Router, Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router: Router = Router();

// Wrap async handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Admin routes (SUPER_ADMIN)
router.get('/admin/orders', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { page, limit, pharmacyId, status, search, dateFrom, dateTo } = req.query;
  const result = await orderService.getOrders({
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    pharmacyId: pharmacyId as string,
    status: status as string,
    search: search as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string
  });
  res.json({ success: true, data: result });
}));

router.get('/admin/orders/:id', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
}));

// Internal routes (requires auth)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { pharmacyId, clinicPhone, whatsappAccountId, originalMessage, attachments } = req.body;
  if (!pharmacyId || !clinicPhone || !whatsappAccountId || !originalMessage) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const order = await orderService.createOrder({
    pharmacyId, clinicPhone, whatsappAccountId, originalMessage, attachments
  });
  res.status(201).json({ success: true, data: order });
}));

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { status, details } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }
  const order = await orderService.updateOrderStatus(req.params.id, status, details);
  res.json({ success: true, data: order });
}));

// Public routes (no auth)
router.get('/public/:orderNumber', asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByNumber(req.params.orderNumber);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  
  // Return limited info
  res.json({
    success: true,
    data: {
      orderNumber: order.order_number,
      pharmacyName: order.pharmacy?.name,
      amount: order.amount,
      currency: order.currency || 'UGX',
      status: order.status,
      paymentStatus: order.payment_status || 'PENDING',
      paymentLink: order.payment_link
    }
  });
}));

export default router;
