const fs = require('fs');

// Fix pesapal client null token
const pClientPath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\pesapal\\client.ts';
let pcContent = fs.readFileSync(pClientPath, 'utf8');
pcContent = pcContent.replace(/return this\.token/g, 'return this.token || ""');
fs.writeFileSync(pClientPath, pcContent);

// Add getLogs to audit.service.ts
const auditServicePath = 'g:\\AFYA LINKS\\apps\\server\\src\\services\\audit.service.ts';
let auditContent = fs.readFileSync(auditServicePath, 'utf8');
if (!auditContent.includes('export const getLogs')) {
  auditContent += `
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
`;
  fs.writeFileSync(auditServicePath, auditContent);
}

// Rename auditService.log -> auditService.logAction
const files = [
  'g:\\AFYA LINKS\\apps\\server\\src\\services\\order.service.ts',
  'g:\\AFYA LINKS\\apps\\server\\src\\services\\pesapal\\payment.service.ts'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/auditService\.log\(/g, 'auditService.logAction(');
  fs.writeFileSync(file, content);
}
