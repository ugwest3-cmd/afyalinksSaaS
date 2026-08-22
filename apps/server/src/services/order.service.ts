import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import * as auditService from './audit.service.js';

export interface CreateOrderData {
  pharmacyId: string;
  clinicPhone: string;
  whatsappAccountId: string;
  originalMessage: string;
  attachments?: Array<{ fileUrl: string; fileType: string }>;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  pharmacyId?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  pharmacy_id: string;
  clinic_id: string;
  status: string;
  amount: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  pharmacy?: { name: string; phone: string };
  clinic?: { name: string; phone: string };
  timeline?: any[];
  attachments?: any[];
  payment?: any;
}

export class OrderService {
  async createOrder(data: CreateOrderData): Promise<any> {
    try {
      // Find or create clinic
      const clinic = await this.findOrCreateClinic(data.clinicPhone);

      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabaseAdmin
        .rpc('generate_order_number');
      
      if (orderNumberError) throw orderNumberError;
      
      const orderNumber = orderNumberData;

      // Get pharmacy details
      const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
        .from('pharmacies')
        .select('name')
        .eq('id', data.pharmacyId)
        .single();
        
      if (pharmacyError) throw pharmacyError;

      let waAccountId = data.whatsappAccountId;
      if (waAccountId && waAccountId.startsWith('wa_')) {
        const { data: waAcc } = await supabaseAdmin.from('whatsapp_accounts').select('id').eq('session_id', waAccountId).single();
        if (waAcc) waAccountId = waAcc.id;
      }

      // Insert order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          order_number: orderNumber,
          pharmacy_id: data.pharmacyId,
          clinic_id: clinic.id,
          whatsapp_account_id: waAccountId,
          customer_phone: data.clinicPhone,
          original_message: data.originalMessage,
          status: 'RECEIVED'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create timeline entries
      await supabaseAdmin.from('order_timeline').insert([
        { order_id: order.id, status: 'RECEIVED', description: 'Order received from clinic' },
        { order_id: order.id, status: 'RECEIVED', description: `Pharmacy identified: ${pharmacy.name}` }
      ]);

      // Create attachments
      if (data.attachments && data.attachments.length > 0) {
        const attachmentRecords = data.attachments.map(att => ({
          order_id: order.id,
          file_url: att.fileUrl,
          file_type: att.fileType
        }));
        await supabaseAdmin.from('order_attachments').insert(attachmentRecords);
      }

      // Audit log
      await auditService.logAction('SYSTEM', 'ORDER_RECEIVED', 'ORDER', order.id, { orderNumber });

      return order;
    } catch (error) {
      logger.error(error, 'Error creating order:');
      throw error;
    }
  }

  async getOrders(filters: OrderFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('orders')
      .select('*, pharmacy:pharmacies(name), clinic:clinics(name)', { count: 'exact' });

    if (filters.pharmacyId) query = query.eq('pharmacy_id', filters.pharmacyId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters.search) {
      query = query.ilike('order_number', `%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  async getOrderById(id: string): Promise<OrderDetail> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        pharmacy:pharmacies(name, phone),
        clinic:clinics(name, phone),
        timeline:order_timeline(*),
        attachments:order_attachments(*),
        payment:payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Sort timeline
    if (data.timeline) {
      data.timeline.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return data as OrderDetail;
  }

  async updateOrderStatus(id: string, status: string, details?: string): Promise<any> {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('order_timeline').insert({
      order_id: id,
      status,
      description: details || `Order status updated to ${status}`
    });

    await auditService.logAction(
      'SYSTEM',
      `ORDER_STATUS_${status}`,
      'ORDER',
      id,
      { newStatus: status, details }
    );

    return order;
  }

  async updateOrderAmount(id: string, amount: number): Promise<any> {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ amount, status: 'PRICE_RECEIVED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('order_timeline').insert({
      order_id: id,
      status: 'PRICE_RECEIVED',
      description: `Pharmacy submitted total: UGX ${amount}`
    });

    await auditService.logAction('SYSTEM', 'PRICE_SUBMITTED', 'ORDER', id, { amount });

    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, pharmacy:pharmacies(name)')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async findOrCreateClinic(phone: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;

    if (data) return data;

    const { data: newClinic, error: createError } = await supabaseAdmin
      .from('clinics')
      .insert({ phone })
      .select()
      .single();

    if (createError) throw createError;
    return newClinic;
  }
}

export const orderService = new OrderService();
