import { supabaseAdmin } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import * as auditService from '../audit.service.js';
import * as encryptionService from '../encryption.service.js';
import { PesaPalClient } from './client.js';

export class PaymentService {
  public async createPayment(orderId: string): Promise<{ paymentLink: string; payment: any }> {
    try {
      // 1. Load order from DB
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'PRICE_RECEIVED') {
        throw new Error('Order status must be PRICE_RECEIVED to create payment');
      }

      // 3 & 4. Load pharmacy and payment account
      const { data: paymentAccount, error: accountError } = await supabaseAdmin
        .from('payment_accounts')
        .select('*, pharmacy:pharmacies(*)')
        .eq('pharmacy_id', order.pharmacy_id)
        .eq('provider', 'pesapal')
        .eq('status', 'ACTIVE')
        .single();

      if (accountError || !paymentAccount) {
        throw new Error('Pharmacy PesaPal credentials not found or inactive');
      }

      // 5. Decrypt credentials
      const consumerKey = await encryptionService.decrypt(paymentAccount.consumer_key_encrypted);
      const consumerSecret = await encryptionService.decrypt(paymentAccount.consumer_secret_encrypted);

      // 6. Create client
      const environment = paymentAccount.environment === 'LIVE' ? 'LIVE' : 'SANDBOX';
      const pesapalClient = new PesaPalClient(consumerKey, consumerSecret, environment);

      // 7. Authenticate
      await pesapalClient.authenticate();

      // 8. Register IPN
      let ipnId = paymentAccount.ipn_id;
      if (!ipnId) {
        const ipnResponse = await pesapalClient.registerIPN(`${env.BACKEND_URL}/api/payments/pesapal/ipn`);
        ipnId = ipnResponse.ipn_id;
        
        await supabaseAdmin
          .from('payment_accounts')
          .update({ ipn_id: ipnId })
          .eq('id', paymentAccount.id);
      }

      // 9. Submit order request
      const response = await pesapalClient.submitOrderRequest({
        merchantReference: order.order_number,
        amount: order.amount,
        currency: order.currency || 'UGX',
        description: `Afya Links Order ${order.order_number}`,
        callbackUrl: `${env.FRONTEND_URL}/pay/${order.order_number}/callback`,
        notificationId: ipnId,
        phoneNumber: order.customer_phone
      });

      if (response.error) {
        throw new Error(`PesaPal submit error: ${response.error.message}`);
      }

      // 10. Store in payments table
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          order_id: order.id,
          pharmacy_id: order.pharmacy_id,
          provider: 'pesapal',
          merchant_reference: order.order_number,
          provider_tracking_id: response.order_tracking_id,
          amount: order.amount,
          currency: order.currency || 'UGX',
          status: 'PENDING',
          payment_link: response.redirect_url
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Failed to save payment: ${paymentError.message}`);
      }

      // 11. Update order
      await supabaseAdmin
        .from('orders')
        .update({
          payment_id: payment.id,
          payment_status: 'PENDING',
          status: 'PAYMENT_PENDING'
        })
        .eq('id', order.id);

      // 12. Add timeline entry
      await supabaseAdmin
        .from('order_timelines')
        .insert({
          order_id: order.id,
          status: 'PAYMENT_PENDING',
          notes: 'Payment link generated'
        });

      // 13. Audit log
      await auditService.logAction('SYSTEM', 'PAYMENT_CREATED', 'ORDER', order.id, {
        orderId: order.id,
        paymentId: payment.id,
        amount: order.amount
      });

      return { paymentLink: response.redirect_url, payment };
    } catch (error: any) {
      logger.error({ orderId, error: error.message }, 'Failed to create payment');
      throw error;
    }
  }

  public async verifyPayment(orderTrackingId: string): Promise<any> {
    try {
      // 1. Find payment
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('*, order:orders(*)')
        .eq('provider_tracking_id', orderTrackingId)
        .single();

      if (paymentError || !payment) {
        throw new Error('Payment not found');
      }

      // 2. Load credentials
      const { data: paymentAccount, error: accountError } = await supabaseAdmin
        .from('payment_accounts')
        .select('*')
        .eq('pharmacy_id', payment.pharmacy_id)
        .eq('provider', 'pesapal')
        .single();

      if (accountError || !paymentAccount) {
        throw new Error('Pharmacy credentials not found');
      }

      const consumerKey = await encryptionService.decrypt(paymentAccount.consumer_key_encrypted);
      const consumerSecret = await encryptionService.decrypt(paymentAccount.consumer_secret_encrypted);

      // 3. Create client
      const environment = paymentAccount.environment === 'LIVE' ? 'LIVE' : 'SANDBOX';
      const pesapalClient = new PesaPalClient(consumerKey, consumerSecret, environment);

      // 4. Call status
      const statusResponse = await pesapalClient.getTransactionStatus(orderTrackingId);

      // 5. Map status
      let paymentStatus = 'UNKNOWN';
      if (statusResponse.status_code === 1) paymentStatus = 'COMPLETED';
      else if (statusResponse.status_code === 2) paymentStatus = 'FAILED';
      else if (statusResponse.status_code === 3) paymentStatus = 'CANCELLED';
      else if (statusResponse.status_code === 0) paymentStatus = 'PENDING';

      if (paymentStatus === payment.status) {
        return payment; // No change
      }

      // 6. Update payment
      const { data: updatedPayment, error: updateError } = await supabaseAdmin
        .from('payments')
        .update({ status: paymentStatus })
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 7. Update order status accordingly
      if (paymentStatus === 'COMPLETED') {
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'COMPLETED', status: 'PAYMENT_RECEIVED' })
          .eq('id', payment.order_id);
          
        await supabaseAdmin
          .from('order_timelines')
          .insert({
            order_id: payment.order_id,
            status: 'PAYMENT_RECEIVED',
            notes: 'Payment confirmed successfully'
          });
          
        await auditService.logAction('SYSTEM', 'PAYMENT_CONFIRMED', 'PAYMENT', payment.id, {
          orderId: payment.order_id,
          paymentId: payment.id,
          amount: payment.amount
        });
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
         await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'FAILED', status: 'PAYMENT_FAILED' })
          .eq('id', payment.order_id);
          
        await supabaseAdmin
          .from('order_timelines')
          .insert({
            order_id: payment.order_id,
            status: 'PAYMENT_FAILED',
            notes: `Payment ${paymentStatus.toLowerCase()}`
          });
          
        await auditService.logAction('SYSTEM', 'PAYMENT_FAILED', 'PAYMENT', payment.id, {
          orderId: payment.order_id,
          paymentId: payment.id
        });
      }

      return updatedPayment;
    } catch (error: any) {
      logger.error({ orderTrackingId, error: error.message }, 'Failed to verify payment');
      throw error;
    }
  }

  public async handleCallback(orderTrackingId: string, merchantReference: string): Promise<void> {
    await this.verifyPayment(orderTrackingId);
  }

  public async handleIPN(notificationType: string, orderTrackingId: string, merchantReference: string): Promise<void> {
    await this.verifyPayment(orderTrackingId);
  }

  public async getPaymentRedirectUrl(orderNumber: string): Promise<string> {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();
      
    if (orderError || !order) throw new Error('Order not found');
    
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', order.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (payment && payment.payment_link) {
      return payment.payment_link;
    }
    
    if (order.amount) {
      const result = await this.createPayment(order.id);
      return result.paymentLink;
    }
    
    throw new Error('Cannot create payment, order lacks amount');
  }

  public async getPayments(filters: any): Promise<any> {
    let query = supabaseAdmin
      .from('payments')
      .select('*, pharmacy:pharmacies(name)', { count: 'exact' });

    if (filters.pharmacyId) query = query.eq('pharmacy_id', filters.pharmacyId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

    const page = filters.page ? parseInt(filters.page) : 1;
    const limit = filters.limit ? parseInt(filters.limit) : 10;
    const from = (page - 1) * limit;
    
    query = query.range(from, from + limit - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;
    
    if (error) throw error;
    
    return {
      data,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    };
  }
}

export const paymentService = new PaymentService();
