import { supabaseAdmin } from '../config/supabase.js';
import { logAction } from './audit.service.js';
import { encrypt } from './encryption.service.js';

export const createPharmacy = async (data: any, adminId: string) => {
  const { pesapal_consumer_key, pesapal_consumer_secret, pesapal_environment, ...pharmacyData } = data;

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
        consumer_key_encrypted: encrypt(pesapal_consumer_key),
        consumer_secret_encrypted: encrypt(pesapal_consumer_secret),
        environment: pesapal_environment || 'SANDBOX',
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
    .select('*, whatsapp_accounts(status), payment_accounts(status)', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const formattedData = data.map(p => ({
    ...p,
    whatsappConnected: p.whatsapp_accounts?.some((wa: any) => wa.status === 'CONNECTED'),
    pesapalConnected: p.payment_accounts?.some((pa: any) => pa.status === 'ACTIVE')
  }));

  return { data: formattedData, count, page, limit };
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
  const { pesapal_consumer_key, pesapal_consumer_secret, pesapal_environment, ...pharmacyData } = data;

  const { data: pharmacy, error } = await supabaseAdmin
    .from('pharmacies')
    .update(pharmacyData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (pesapal_consumer_key || pesapal_consumer_secret || pesapal_environment) {
    // Check if account exists
    const { data: existingAccount } = await supabaseAdmin
      .from('payment_accounts')
      .select('id')
      .eq('pharmacy_id', id)
      .eq('provider', 'pesapal')
      .single();

    const accountData: any = {};
    if (pesapal_consumer_key) accountData.consumer_key_encrypted = encrypt(pesapal_consumer_key);
    if (pesapal_consumer_secret) accountData.consumer_secret_encrypted = encrypt(pesapal_consumer_secret);
    if (pesapal_environment) accountData.environment = pesapal_environment;

    if (existingAccount) {
      const { error: updateError } = await supabaseAdmin
        .from('payment_accounts')
        .update(accountData)
        .eq('id', existingAccount.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('payment_accounts')
        .insert([{
          pharmacy_id: id,
          provider: 'pesapal',
          ...accountData,
          status: 'ACTIVE'
        }]);
      if (insertError) throw new Error(insertError.message);
    }
  }

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
