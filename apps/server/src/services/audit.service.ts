import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export const logAction = async (
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any,
  ipAddress?: string
) => {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert([{
        actor: actorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {},
        ip_address: ipAddress
      }]);

    if (error) {
      logger.error(error, 'Failed to insert audit log:');
    } else {
      logger.info({ actorId, action, entityType, entityId }, 'Audit log recorded');
    }
  } catch (error) {
    logger.error(error, 'Exception in logAction:');
  }
};

export const getLogs = async (query: any) => {
  let q = supabaseAdmin.from('audit_logs').select('*', { count: 'exact' });
  if (query.actor) q = q.eq('actor', query.actor);
  if (query.action) q = q.eq('action', query.action);
  if (query.entityType) q = q.eq('entity_type', query.entityType);
  if (query.entityId) q = q.eq('entity_id', query.entityId);
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '50');
  const offset = (page - 1) * limit;
  q = q.order('timestamp', { ascending: false }).range(offset, offset + limit - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return {
    items: data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
};
