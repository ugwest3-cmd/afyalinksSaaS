import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { logger } from '../config/logger.js';

const router: Router = Router();

router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pharmacies, whatsapp, ordersToday, pendingOrders, paymentsToday, successfulPayments] = await Promise.all([
      supabaseAdmin.from('pharmacies').select('id', { count: 'exact' }).neq('status', 'INACTIVE'),
      supabaseAdmin.from('whatsapp_accounts').select('id', { count: 'exact' }).eq('status', 'CONNECTED'),
      supabaseAdmin.from('orders').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
      supabaseAdmin.from('orders').select('id', { count: 'exact' }).in('status', ['RECEIVED', 'SENT_TO_PHARMACY', 'AWAITING_PRICE', 'PRICE_RECEIVED', 'PAYMENT_PENDING']),
      supabaseAdmin.from('payments').select('amount').eq('status', 'COMPLETED').gte('created_at', today.toISOString()),
      supabaseAdmin.from('payments').select('id', { count: 'exact' }).eq('status', 'COMPLETED').gte('created_at', today.toISOString())
    ]);

    const paymentsSum = paymentsToday.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        totalPharmacies: pharmacies.count || 0,
        activeWhatsappNumbers: whatsapp.count || 0,
        ordersToday: ordersToday.count || 0,
        pendingOrders: pendingOrders.count || 0,
        paymentsToday: paymentsSum,
        successfulPayments: successfulPayments.count || 0
      }
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Dashboard stats error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/charts/orders', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data } = await supabaseAdmin
      .from('orders')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const grouped: Record<string, number> = {};
    data?.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    const chartData = Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
      
    res.json({ success: true, data: chartData });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Dashboard orders chart error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/charts/payments', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data } = await supabaseAdmin
      .from('payments')
      .select('created_at, amount, status')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const grouped: Record<string, { date: string; total: number; count: number }> = {};
    data?.forEach((payment) => {
      const date = new Date(payment.created_at).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = { date, total: 0, count: 0 };
      if (payment.status === 'COMPLETED') {
        grouped[date].total += payment.amount || 0;
      }
      grouped[date].count += 1;
    });

    const chartData = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
      
    res.json({ success: true, data: chartData });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Dashboard payments chart error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/charts/orders-by-pharmacy', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('pharmacy_id, pharmacies(name)');

    // Group by pharmacy
    const grouped: Record<string, { pharmacy: string; count: number }> = {};
    data?.forEach((order: any) => {
      const name = order.pharmacies?.name || 'Unknown';
      if (!grouped[order.pharmacy_id]) {
        grouped[order.pharmacy_id] = { pharmacy: name, count: 0 };
      }
      grouped[order.pharmacy_id].count += 1;
    });

    const chartData = Object.values(grouped).sort((a, b) => b.count - a.count);
      
    res.json({ success: true, data: chartData });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Dashboard orders by pharmacy error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/charts/payment-success-rate', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('status');

    const counts: Record<string, number> = {};
    data?.forEach((payment) => {
      counts[payment.status] = (counts[payment.status] || 0) + 1;
    });

    const chartData = Object.entries(counts).map(([status, count]) => ({ status, count }));
      
    res.json({ success: true, data: chartData });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Dashboard payment success rate error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
