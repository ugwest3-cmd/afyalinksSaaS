import { Router } from 'express';
import pharmacyRoutes from './pharmacy.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import auditRoutes from './audit.routes.js';
import aiRoutes from './ai.routes.js';
import campaignRoutes from './campaign.routes.js';

const router: Router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin routes
router.use('/admin/pharmacies', pharmacyRoutes);
router.use('/admin/whatsapp', whatsappRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/audit', auditRoutes);
router.use('/admin/ai', aiRoutes);
router.use('/admin/campaigns', campaignRoutes);

// Order and payment routes include their own path prefixes
// (admin, public, and internal routes are all in one router)
router.use('/', orderRoutes);
router.use('/', paymentRoutes);

export { router as routes };
