import { supabaseAdmin } from '../config/supabase.js';
import { logAction } from './audit.service.js';
import { encrypt } from './encryption.service.js';

export const createPharmacy = async (data: any, adminId: string) => {
  const { pesapal_consumer_key, pesapal_consumer_secret, ...pharmacyData } = data;

  const { data: pharmacy, error } = await supabaseAdmin
    .from('pharmacies')
    .insert([pharmacyData])
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (pesapal_consumer_key && pesapal_consumer_secret) {
    const { error: paymentError } = await supabaseAdmin
      .from('payment_accounts')
      .insert([{
        pharmacy_id: pharmacy.id,
        pesapal_consumer_key: encrypt(pesapal_consumer_key),
        pesapal_consumer_secret: encrypt(pesapal_consumer_secret),
        status: 'ACTIVE'
      }]);
    if (paymentError) throw new Error(paymentError.message);
  }

  await logAction(adminId, 'CREATE', 'PHARMACY', pharmacy.id, { createdData: pharmacyData });

  return pharmacy;
};

export const getPharmacies = async ({ page = 1, limit = 10, status, search }: any) => {
  let query = supabaseAdmin
    .from('pharmacies')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return { data, count, page, limit };
};

export const getPharmacyById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .select(`
      *,
      whatsapp_accounts ( id, status, phone_number ),
      payment_accounts ( id, status ),
      orders:orders(count)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }

  return data;
};

export const updatePharmacy = async (id: string, data: any, adminId: string) => {
  const { data: pharmacy, error } = await supabaseAdmin
    .from('pharmacies')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAction(adminId, 'UPDATE', 'PHARMACY', id, { updatedData: data });

  return pharmacy;
};

export const deletePharmacy = async (id: string, adminId: string) => {
  const { error } = await supabaseAdmin
    .from('pharmacies')
    .update({ status: 'INACTIVE' })
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAction(adminId, 'DELETE', 'PHARMACY', id, { status: 'INACTIVE' });
};
