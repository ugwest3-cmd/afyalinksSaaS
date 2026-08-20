import { Router } from 'express';
import { paymentService } from '../services/pesapal/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { logger } from '../config/logger.js';

const router: Router = Router();

// Admin routes
router.get('/admin/payments', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const result = await paymentService.getPayments(req.query);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get payments error');
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Internal/Admin routes
router.post('/payments/create', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: { message: 'orderId is required' } });
    }
    const result = await paymentService.createPayment(orderId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Create payment error');
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/payments/:id', requireAuth, async (req, res) => {
  // Assume generic get or proxy to verifyPayment for now
  try {
    const payment = await paymentService.verifyPayment(req.params.id);
    res.json({ success: true, data: payment });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get payment details error');
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Public routes
router.get('/payments/pesapal/callback', async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.query;
    if (typeof OrderTrackingId === 'string' && typeof OrderMerchantReference === 'string') {
      await paymentService.handleCallback(OrderTrackingId, OrderMerchantReference);
    }
    res.json({ success: true, message: 'Callback processed' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Callback error');
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/payments/pesapal/ipn', async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body;
    // Alternatively PesaPal IPN passes them as query params sometimes, but based on docs it depends on RegisterIPN
    const trackingId = OrderTrackingId || req.query.OrderTrackingId;
    const merchantRef = OrderMerchantReference || req.query.OrderMerchantReference;
    const type = OrderNotificationType || req.query.OrderNotificationType;
    
    if (typeof trackingId === 'string' && typeof merchantRef === 'string') {
      await paymentService.handleIPN(type as string, trackingId, merchantRef);
    }
    res.status(200).send('IPN received');
  } catch (error: any) {
    logger.error({ error: error.message }, 'IPN error');
    res.status(500).send('IPN error');
  }
});

router.get('/payments/redirect/:orderNumber', async (req, res) => {
  try {
    const url = await paymentService.getPaymentRedirectUrl(req.params.orderNumber);
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get payment redirect URL error');
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
