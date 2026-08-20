import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { orderService } from './order.service.js';
import * as auditService from './audit.service.js';

export class PricingService {
  parseTotalResponse(message: string): number | null {
    // Simple parser for TOTAL <amount>
    const match = message.trim().match(/^total\s+(\d+(?:\.\d+)?)$/i);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  }

  async handlePriceSubmission(pharmacyId: string, message: string, orderId?: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const amount = this.parseTotalResponse(message);
      
      if (amount === null || isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Invalid format. Reply with: TOTAL <amount>' };
      }

      let orderToUpdate: any = null;

      if (orderId) {
        const { data: order, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
          
        if (error || !order) return { success: false, error: 'Order not found' };
        orderToUpdate = order;
      } else {
        const { data: orders, error } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('pharmacy_id', pharmacyId)
          .in('status', ['AWAITING_PRICE', 'SENT_TO_PHARMACY'])
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error || !orders || orders.length === 0) {
          return { success: false, error: 'No active orders found awaiting pricing for this pharmacy' };
        }
        orderToUpdate = orders[0];
      }

      if (orderToUpdate.pharmacy_id !== pharmacyId) {
        return { success: false, error: 'Unauthorized to price this order' };
      }
      
      if (!['AWAITING_PRICE', 'SENT_TO_PHARMACY'].includes(orderToUpdate.status)) {
        return { success: false, error: 'Order is not in correct status for pricing' };
      }

      const updatedOrder = await orderService.updateOrderAmount(orderToUpdate.id, amount);

      return { success: true, order: updatedOrder };
    } catch (error: any) {
      logger.error(error, 'Error handling price submission:');
      return { success: false, error: error.message || 'Internal server error' };
    }
  }
}

export const pricingService = new PricingService();
